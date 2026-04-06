import * as THREE from "three";
import { sampleTerrainY } from "../mission/terrainSample";
import { createPilotVisual } from "./createPilotVisual";

/**
 * Tactical Descent — fixed world locomotion basis (XZ). Never use camera yaw,
 * orbit, or view matrices to build these vectors.
 *
 * - W / S: ∓WORLD_FORWARD (W = screen-down / −Z, S = screen-up / +Z)
 * - A / D: ±WORLD_RIGHT (D = left, A = right)
 *
 * Diagonal input = sum of axes → single `.normalize()` (constant speed on diagonals).
 */
const WORLD_FORWARD_XZ = new THREE.Vector3(0, 0, -1);
const WORLD_RIGHT_XZ = new THREE.Vector3(1, 0, 0);

/** Capsule used only for collision / ground checks (invisible). */
export const CAPSULE_RADIUS = 0.35;
/** Cylinder length (not including end caps). */
export const CAPSULE_LENGTH = 0.9;

export function capsuleHalfHeight(): number {
  return CAPSULE_LENGTH / 2 + CAPSULE_RADIUS;
}

export type PlayerFrameSignals = {
  /** Jet thrust active (air) or burst fired (ground) — throttle SFX in game. */
  jetThrusting: boolean;
  /** True once when fuel crosses into critical band. */
  lowFuelWarn: boolean;
};

/**
 * Top-down salvage mover: world-fixed WASD only (see WORLD_* constants).
 * Y from terrain raycast snap; no slope-tangent velocity (no shake / drift).
 */
export class PlayerController {
  readonly root: THREE.Group;
  readonly collisionCapsule: THREE.Mesh;
  readonly pilot: THREE.Group;
  private velocity = new THREE.Vector3();
  private onGround = false;
  fuel = 100;
  private maxFuel = 100;
  private facing = 0;
  private speedMult = 1;

  private keys = new Set<string>();
  private lowFuelLatch = false;

  private readonly gravity = -32;
  private readonly moveAccel = 52;
  private readonly maxGroundSpeed = 12;
  private readonly groundFriction = 22;
  private readonly airAccel = 26;
  private readonly maxAirSpeed = 16;
  private readonly airBoostAccelMult = 1.45;
  private readonly airBoostMaxMult = 1.2;
  /** Initial pop when leaving ground with Space. */
  private readonly burstLiftSpeed = 7.2;
  /** Sustained thrust while Space + fuel (air). */
  private readonly jetThrust = 34;
  private readonly fuelDrainBurst = 11;
  private readonly fuelDrainBoost = 8;
  private jetFuelDrainMult = 1;

  private raycaster = new THREE.Raycaster();
  private readonly _rayOrigin = new THREE.Vector3();
  private readonly _rayDirDown = new THREE.Vector3(0, -1, 0);
  private readonly _wish = new THREE.Vector3();

  constructor() {
    this.root = new THREE.Group();
    this.root.name = "Player";

    const capGeo = new THREE.CapsuleGeometry(
      CAPSULE_RADIUS,
      CAPSULE_LENGTH,
      6,
      12
    );
    const hiddenMat = new THREE.MeshBasicMaterial({
      color: 0xff00ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    hiddenMat.visible = false;

    this.collisionCapsule = new THREE.Mesh(capGeo, hiddenMat);
    this.collisionCapsule.name = "CollisionCapsule";
    this.collisionCapsule.visible = false;
    this.root.add(this.collisionCapsule);

    this.pilot = createPilotVisual();
    this.pilot.position.y = -capsuleHalfHeight();
    this.root.add(this.pilot);

    const syncLetterKey = (e: KeyboardEvent, down: boolean) => {
      if (e.key.length !== 1) return;
      const ch = e.key.toLowerCase();
      if (ch === "w" || ch === "a" || ch === "s" || ch === "d") {
        const id = `Letter:${ch}`;
        if (down) this.keys.add(id);
        else this.keys.delete(id);
      }
    };

    window.addEventListener("keydown", (e) => {
      this.keys.add(e.code);
      syncLetterKey(e, true);
    });
    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.code);
      syncLetterKey(e, false);
    });
    window.addEventListener("blur", () => this.keys.clear());
  }

  getFacing(): number {
    return this.facing;
  }

  getFuelRatio(): number {
    return this.fuel / this.maxFuel;
  }

  getVelocity(): THREE.Vector3 {
    return this.velocity;
  }

  getKeys(): Set<string> {
    return this.keys;
  }

  getWishDir(): THREE.Vector3 {
    const out = new THREE.Vector3();
    this.readWishWorldXZ(out);
    return out;
  }

  addFuel(percent: number): void {
    this.fuel = THREE.MathUtils.clamp(
      this.fuel + percent,
      0,
      this.maxFuel
    );
  }

  isGrounded(): boolean {
    return this.onGround;
  }

  resetMission(
    position: THREE.Vector3,
    facingY = 0,
    opts?: { fuelPercent?: number; jetFuelDrainMult?: number; fuelCapMult?: number; speedMult?: number }
  ): void {
    this.root.position.copy(position);
    this.velocity.set(0, 0, 0);
    this.facing = facingY;
    this.root.rotation.y = facingY;
    const capMult = opts?.fuelCapMult ?? 1;
    this.maxFuel = 100 * capMult;
    const fp = THREE.MathUtils.clamp(opts?.fuelPercent ?? 100, 0, 100);
    this.fuel = (fp / 100) * this.maxFuel;
    this.lowFuelLatch = false;
    this.jetFuelDrainMult = opts?.jetFuelDrainMult ?? 1;
    this.speedMult = opts?.speedMult ?? 1;
  }

  private keyDown(...codes: string[]): boolean {
    return codes.some((c) => this.keys.has(c));
  }

  /**
   * Intended horizontal direction: f·WORLD_FORWARD + r·WORLD_RIGHT, normalized.
   * f ∈ {-1,0,1} from W/S; r ∈ {-1,0,1} from D/A (D = +right, A = −right = left).
   */
  private readWishWorldXZ(out: THREE.Vector3): boolean {
    let f = 0;
    if (this.keyDown("KeyW", "ArrowUp") || this.keys.has("Letter:w")) f -= 1;
    if (this.keyDown("KeyS", "ArrowDown") || this.keys.has("Letter:s")) f += 1;

    let r = 0;
    if (this.keyDown("KeyD", "ArrowRight") || this.keys.has("Letter:d")) r -= 1;
    if (this.keyDown("KeyA", "ArrowLeft") || this.keys.has("Letter:a")) r += 1;

    out
      .copy(WORLD_FORWARD_XZ)
      .multiplyScalar(f)
      .addScaledVector(WORLD_RIGHT_XZ, r);

    if (out.lengthSq() < 1e-10) {
      out.set(0, 0, 0);
      return false;
    }
    out.normalize();
    return true;
  }

  private applyHorizontalFriction(dt: number): void {
    let h = Math.hypot(this.velocity.x, this.velocity.z);
    if (h < 1e-8) return;
    const nh = Math.max(0, h - this.groundFriction * dt);
    const s = nh / h;
    this.velocity.x *= s;
    this.velocity.z *= s;
  }

  private clampHorizontalSpeed(maxSpeed: number): void {
    const vx = this.velocity.x;
    const vz = this.velocity.z;
    const sq = vx * vx + vz * vz;
    if (sq <= maxSpeed * maxSpeed) return;
    const len = Math.sqrt(sq);
    const s = maxSpeed / len;
    this.velocity.x = vx * s;
    this.velocity.z = vz * s;
  }

  /** Y rotation so local −Z aligns with horizontal travel (same XZ frame as WORLD_*). */
  private updateFacing(): void {
    const vx = this.velocity.x;
    const vz = this.velocity.z;
    const hs = Math.hypot(vx, vz);
    if (hs > 0.08) {
      this.facing = Math.atan2(vx, vz);
      return;
    }
    if (this.readWishWorldXZ(this._wish)) {
      this.facing = Math.atan2(this._wish.x, this._wish.z);
    }
  }

  update(
    dt: number,
    terrain: THREE.Object3D,
    inputLocked = false,
    jetJammed = false,
    dashVel?: THREE.Vector3 | null
  ): PlayerFrameSignals {
    if (inputLocked) {
      this.velocity.set(0, 0, 0);
      return { jetThrusting: false, lowFuelWarn: false };
    }

    // If dashing, override velocity
    if (dashVel) {
      this.velocity.set(dashVel.x, this.velocity.y, dashVel.z);
    }

    let jetThrusting = false;
    const jetOk = !jetJammed && this.fuel > 0;

    const halfH = capsuleHalfHeight();
    const pos = this.root.position;

    this._rayOrigin.copy(pos);
    this._rayOrigin.y = pos.y - halfH + 0.06;
    this.raycaster.set(this._rayOrigin, this._rayDirDown);
    const hits = this.raycaster.intersectObject(terrain, false);
    const probeDist = 0.62;
    this.onGround =
      hits.length > 0 && hits[0].distance != null && hits[0].distance < probeDist;

    const space = this.keyDown("Space");
    const shift = this.keyDown("ShiftLeft", "ShiftRight");
    const hasWish = this.readWishWorldXZ(this._wish);

    if (this.onGround) {
      if (hasWish) {
        this.velocity.x += this._wish.x * this.moveAccel * dt;
        this.velocity.z += this._wish.z * this.moveAccel * dt;
      }
      this.applyHorizontalFriction(dt);
      this.clampHorizontalSpeed(this.maxGroundSpeed * this.speedMult);

      if (space && jetOk) {
        jetThrusting = true;
        this.velocity.y = this.burstLiftSpeed;
        this.fuel -= this.fuelDrainBurst * this.jetFuelDrainMult * dt;
        this.onGround = false;
      } else if (hits.length > 0) {
        const hit = hits[0];
        const targetY = hit.point.y + halfH + 0.01;
        if (pos.y < targetY + 0.14) {
          pos.y = targetY;
          if (this.velocity.y < 0) this.velocity.y = 0;
        }
      }

      this.updateFacing();
    } else {
      const boosting = shift && jetOk;
      const aMult = boosting ? this.airBoostAccelMult : 1;
      const maxH =
        this.maxAirSpeed * (boosting ? this.airBoostMaxMult : 1);

      if (hasWish) {
        this.velocity.x += this._wish.x * this.airAccel * aMult * dt;
        this.velocity.z += this._wish.z * this.airAccel * aMult * dt;
      }
      this.clampHorizontalSpeed(maxH);

      let ay = this.gravity;
      if (space && jetOk) {
        jetThrusting = true;
        ay += this.jetThrust;
        this.fuel -= this.fuelDrainBurst * this.jetFuelDrainMult * dt;
      }
      if (boosting && hasWish) {
        this.fuel -= this.fuelDrainBoost * this.jetFuelDrainMult * dt;
      }
      this.velocity.y += ay * dt;

      this.updateFacing();
    }

    this.fuel = THREE.MathUtils.clamp(this.fuel, 0, this.maxFuel);

    const ratio = this.fuel / this.maxFuel;
    let lowFuelWarn = false;
    if (ratio <= 0.22 && !this.lowFuelLatch) {
      lowFuelWarn = true;
      this.lowFuelLatch = true;
    }
    if (ratio > 0.32) this.lowFuelLatch = false;

    pos.addScaledVector(this.velocity, dt);

    if (pos.y < -5) {
      const mesh = terrain as THREE.Mesh;
      const ty = sampleTerrainY(mesh, pos.x, pos.z);
      pos.y = ty + halfH + 0.08;
      this.velocity.set(0, 0, 0);
    }

    this.root.rotation.y = this.facing;
    return { jetThrusting, lowFuelWarn };
  }
}
