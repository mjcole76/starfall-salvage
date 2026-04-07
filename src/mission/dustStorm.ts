/**
 * DustStorm — periodic lethal dust storm that sweeps across the map.
 *
 * Lifecycle:
 *  1. IDLE      — cooldown between storms (25-40 s)
 *  2. WARNING   — 3 s warning phase: siren, bark, visual telegraph on ground
 *  3. ACTIVE    — storm wall sweeps across in a random direction (~3 s crossing)
 *  4. Back to IDLE
 *
 * The storm is a wide band (depth ~14 units) moving at ~28 units/s.
 * If the player is inside the band they take massive damage (instant-kill level).
 * The storm shows on the minimap as a moving line.
 */

import * as THREE from "three";

// ---------------------------------------------------------------------------
// Tuning
// ---------------------------------------------------------------------------

/** Seconds between storms (randomised within range). */
const COOLDOWN_MIN = 25;
const COOLDOWN_MAX = 40;

/** How long the warning phase lasts before the storm hits. */
const WARNING_SEC = 3;

/** Storm band thickness (world units). */
const STORM_DEPTH = 14;

/** Speed the storm wall moves (world units / s). */
const STORM_SPEED = 28;

/** How far the storm travels from spawn edge to far edge. */
const STORM_TRAVEL = 220;

/** DPS while player is inside the storm band. */
const STORM_DPS = 200;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DustStormPhase = "idle" | "warning" | "active";

export interface DustStormState {
  phase: DustStormPhase;
  /** Timer for current phase. */
  timer: number;
  /** Seconds until next storm (during idle). */
  cooldown: number;
  /** Direction the storm moves (normalized XZ). */
  direction: THREE.Vector2;
  /** Origin line center — storm starts at this signed-distance offset. */
  originOffset: number;
  /** Current signed-distance of storm front from world origin along direction. */
  frontOffset: number;

  /** Whether the warning SFX/bark has been fired this cycle. */
  warnFired: boolean;
}

// ---------------------------------------------------------------------------
// Visual
// ---------------------------------------------------------------------------

export class DustStormVisual {
  readonly group = new THREE.Group();
  private wall: THREE.Mesh;
  private warningPlane: THREE.Mesh;

  constructor(scene: THREE.Object3D) {
    // Storm wall — tall translucent sand-coloured plane
    const wallGeo = new THREE.PlaneGeometry(240, 30);
    const wallMat = new THREE.MeshBasicMaterial({
      color: 0xc8a050,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.wall = new THREE.Mesh(wallGeo, wallMat);
    this.wall.position.y = 12;
    this.group.add(this.wall);

    // Ground warning stripe (flat ring that appears during warning phase)
    const warnGeo = new THREE.PlaneGeometry(240, STORM_DEPTH);
    const warnMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.warningPlane = new THREE.Mesh(warnGeo, warnMat);
    this.warningPlane.rotation.x = -Math.PI / 2;
    this.warningPlane.position.y = 0.15;
    this.group.add(this.warningPlane);

    this.group.visible = false;
    scene.add(this.group);
  }

  update(state: DustStormState, _dt: number, elapsed: number): void {
    if (state.phase === "idle") {
      this.group.visible = false;
      return;
    }

    this.group.visible = true;

    // Orient the group so it faces perpendicular to the storm direction
    const angle = Math.atan2(state.direction.x, state.direction.y);
    this.group.rotation.y = angle;

    // Position along the storm direction
    const offset = state.phase === "warning" ? state.originOffset : state.frontOffset;
    this.group.position.x = state.direction.x * offset;
    this.group.position.z = state.direction.y * offset;

    const wallMat = this.wall.material as THREE.MeshBasicMaterial;
    const warnMat = this.warningPlane.material as THREE.MeshBasicMaterial;

    if (state.phase === "warning") {
      // Pulsing warning stripe on the ground
      wallMat.opacity = 0;
      const pulse = 0.15 + 0.15 * Math.sin(elapsed * 8);
      warnMat.opacity = pulse;
      warnMat.color.setHex(0xff4400);
    } else {
      // Active storm wall
      wallMat.opacity = 0.55 + 0.1 * Math.sin(elapsed * 12);
      wallMat.color.setHex(0xc89848);
      warnMat.opacity = 0;
    }
  }

  dispose(): void {
    this.group.removeFromParent();
  }
}

// ---------------------------------------------------------------------------
// Logic
// ---------------------------------------------------------------------------

export function createDustStormState(): DustStormState {
  return {
    phase: "idle",
    timer: 0,
    cooldown: randomCooldown() * 0.5, // first storm comes a bit sooner
    direction: new THREE.Vector2(1, 0),
    originOffset: -STORM_TRAVEL / 2,
    frontOffset: -STORM_TRAVEL / 2,
    warnFired: false,
  };
}

function randomCooldown(): number {
  return COOLDOWN_MIN + Math.random() * (COOLDOWN_MAX - COOLDOWN_MIN);
}

function randomDirection(): THREE.Vector2 {
  const angle = Math.random() * Math.PI * 2;
  return new THREE.Vector2(Math.cos(angle), Math.sin(angle));
}

export interface DustStormTick {
  /** Integrity loss this frame. */
  integrityLoss: number;
  /** True on the frame the warning fires (so Game can trigger SFX/bark). */
  warnTriggered: boolean;
  /** True while the storm band is active (for screen effects). */
  stormActive: boolean;
  /** Player is currently inside the storm band. */
  playerInStorm: boolean;
}

/**
 * Advance the dust storm simulation one frame.
 * Pass `playerSheltered` = true if the player is inside a shelter.
 */
export function tickDustStorm(
  state: DustStormState,
  playerPos: THREE.Vector3,
  dt: number,
  dashInvulnerable: boolean,
  playerSheltered: boolean = false,
): DustStormTick {
  const result: DustStormTick = {
    integrityLoss: 0,
    warnTriggered: false,
    stormActive: false,
    playerInStorm: false,
  };

  switch (state.phase) {
    case "idle": {
      state.cooldown -= dt;
      if (state.cooldown <= 0) {
        // Transition to warning
        state.phase = "warning";
        state.timer = 0;
        state.warnFired = false;
        state.direction = randomDirection();
        state.originOffset = -STORM_TRAVEL / 2;
        state.frontOffset = state.originOffset;
      }
      break;
    }

    case "warning": {
      state.timer += dt;
      if (!state.warnFired) {
        state.warnFired = true;
        result.warnTriggered = true;
      }
      if (state.timer >= WARNING_SEC) {
        state.phase = "active";
        state.timer = 0;
        state.frontOffset = state.originOffset;
      }
      break;
    }

    case "active": {
      state.timer += dt;
      state.frontOffset += STORM_SPEED * dt;
      result.stormActive = true;

      // Check if player is inside the storm band
      // Project player position onto storm direction
      const playerDot = playerPos.x * state.direction.x + playerPos.z * state.direction.y;
      const front = state.frontOffset;
      const back = front - STORM_DEPTH;

      if (playerDot >= back && playerDot <= front) {
        result.playerInStorm = true;
        if (!dashInvulnerable && !playerSheltered) {
          result.integrityLoss = STORM_DPS * dt;
        }
      }

      // Storm has crossed the entire map
      if (state.frontOffset > STORM_TRAVEL / 2 + STORM_DEPTH) {
        state.phase = "idle";
        state.cooldown = randomCooldown();
        state.timer = 0;
      }
      break;
    }
  }

  return result;
}

/**
 * Get the storm band's current line segment for minimap rendering.
 * Returns null if not visible.
 */
export function getDustStormLine(
  state: DustStormState,
): { cx: number; cz: number; angle: number; depth: number } | null {
  if (state.phase === "idle") return null;

  const offset = state.phase === "warning" ? state.originOffset : state.frontOffset;
  const cx = state.direction.x * offset;
  const cz = state.direction.y * offset;
  const angle = Math.atan2(state.direction.x, state.direction.y);

  return { cx, cz, angle, depth: STORM_DEPTH };
}
