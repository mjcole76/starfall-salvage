import * as THREE from "three";
import { sampleTerrainY } from "./terrainSample";
import type { HazardTuning } from "./hazardConfig";
import type { DronePath } from "./missionVariants";

const PATH_SPEED = 0.045;

export type PatrolDroneTick = {
  /** While mission time is below this, jetpack burst/hover is jammed. */
  jetJamUntilElapsed: number;
  /** True if a new jam was applied this frame (for SFX). */
  jamStarted: boolean;
  /** Player inside any active drone scan this frame. */
  inDroneScan: boolean;
  /** Integrity lost this frame while inside scan. */
  integrityLoss: number;
};

function pathPoint(path: DronePath, u: number): { x: number; z: number } {
  if (path.length === 0) return { x: 0, z: 0 };
  const n = path.length;
  const t = (((u % 1) + 1) % 1);
  const f = t * n;
  const i = Math.floor(f) % n;
  const j = (i + 1) % n;
  const a = path[i]!;
  const b = path[j]!;
  const k = f - Math.floor(f);
  return {
    x: a.x + (b.x - a.x) * k,
    z: a.z + (b.z - a.z) * k,
  };
}

export class PatrolDroneSystem {
  readonly root: THREE.Group;
  private readonly meshes: THREE.Group[] = [];
  private readonly scanRings: THREE.Mesh[] = [];
  private readonly lenses: THREE.Mesh[] = [];
  private phase0 = 0;
  private phase1 = 0.37;
  private activeCount: 0 | 1 | 2 = 2;
  private speed0 = PATH_SPEED;
  private speed1 = PATH_SPEED * 0.92;
  private scanRadius = 13.5;
  private scanRadiusSq = 13.5 * 13.5;
  private jamSec = 2.35;
  private integrityDpsWhileSpotted = 4.2;

  constructor(terrain: THREE.Mesh, scene: THREE.Object3D) {
    void terrain;
    this.root = new THREE.Group();
    this.root.name = "PatrolDrones";
    scene.add(this.root);

    for (let i = 0; i < 2; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.35, 0.65),
        new THREE.MeshStandardMaterial({
          color: 0x3a4048,
          emissive: 0x224466,
          emissiveIntensity: 0.35,
          metalness: 0.6,
          roughness: 0.45,
        })
      );
      body.castShadow = true;
      g.add(body);
      const lens = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 8, 8),
        new THREE.MeshStandardMaterial({
          color: 0xff6644,
          emissive: 0xcc2200,
          emissiveIntensity: 0.55,
          metalness: 0.2,
          roughness: 0.28,
        })
      );
      lens.position.set(0, 0.1, 0.38);
      g.add(lens);
      this.lenses.push(lens);

      const scanRing = new THREE.Mesh(
        new THREE.RingGeometry(0.88, 1, 40),
        new THREE.MeshBasicMaterial({
          color: 0xff5533,
          transparent: true,
          opacity: 0.2,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      scanRing.rotation.x = -Math.PI / 2;
      scanRing.position.y = -5.05;
      scanRing.renderOrder = 1;
      g.add(scanRing);
      this.scanRings.push(scanRing);

      const spot = new THREE.Mesh(
        new THREE.CircleGeometry(0.35, 16),
        new THREE.MeshBasicMaterial({
          color: 0xffaa66,
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      spot.rotation.x = -Math.PI / 2;
      spot.position.y = -5.02;
      g.add(spot);

      this.meshes.push(g);
      this.root.add(g);
    }
  }

  dispose(): void {
    this.root.removeFromParent();
  }

  /** Visible drones, patrol speed, and detection tuning. */
  setParams(
    count: 0 | 1 | 2,
    speedMult: number,
    tuning: Pick<
      HazardTuning,
      | "droneScanRadius"
      | "droneJetJamSec"
      | "droneIntegrityDpsWhileSpotted"
    >
  ): void {
    this.activeCount = count;
    this.speed0 = PATH_SPEED * speedMult;
    this.speed1 = PATH_SPEED * 0.92 * speedMult;
    this.scanRadius = Math.max(2, tuning.droneScanRadius);
    this.scanRadiusSq = this.scanRadius * this.scanRadius;
    this.jamSec = Math.max(0.1, tuning.droneJetJamSec);
    this.integrityDpsWhileSpotted = Math.max(
      0,
      tuning.droneIntegrityDpsWhileSpotted
    );
    const s = this.scanRadius;
    for (const ring of this.scanRings) {
      ring.scale.set(s, s, s);
    }
    for (let i = 0; i < this.meshes.length; i++) {
      this.meshes[i]!.visible = i < count;
    }
  }

  update(
    terrain: THREE.Mesh,
    missionElapsed: number,
    playerPos: THREE.Vector3,
    paths: [DronePath, DronePath],
    currentJamUntil: number,
    dt: number
  ): PatrolDroneTick {
    if (this.activeCount === 0) {
      return {
        jetJamUntilElapsed: currentJamUntil,
        jamStarted: false,
        inDroneScan: false,
        integrityLoss: 0,
      };
    }

    const dtf = Math.max(0, dt);

    let jetJamUntilElapsed = currentJamUntil;
    let spottedThisFrame = false;
    const wasFree = missionElapsed >= currentJamUntil;
    let inDroneScan = false;

    this.phase0 = (this.phase0 + this.speed0) % 1;
    this.phase1 = (this.phase1 + this.speed1) % 1;

    for (let i = 0; i < this.activeCount; i++) {
      const mesh = this.meshes[i]!;
      const path = paths[i] ?? paths[0]!;
      const u = i === 0 ? this.phase0 : this.phase1;
      const p = pathPoint(path, u);
      const y = sampleTerrainY(terrain, p.x, p.z) + 5.2;
      mesh.position.set(p.x, y, p.z);
      mesh.rotation.y = missionElapsed * 0.65 + i * 1.7;

      const lens = this.lenses[i];
      if (lens?.material instanceof THREE.MeshStandardMaterial) {
        const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(missionElapsed * 5.5 + i));
        lens.material.emissiveIntensity = pulse * 0.95;
      }

      const dx = playerPos.x - p.x;
      const dz = playerPos.z - p.z;
      const dy = playerPos.y - y;
      if (dx * dx + dz * dz + dy * dy * 0.08 < this.scanRadiusSq) {
        spottedThisFrame = true;
        inDroneScan = true;
        jetJamUntilElapsed = Math.max(
          jetJamUntilElapsed,
          missionElapsed + this.jamSec
        );
      }
    }

    const jamStarted = spottedThisFrame && wasFree;
    const integrityLoss = inDroneScan
      ? this.integrityDpsWhileSpotted * dtf
      : 0;

    return {
      jetJamUntilElapsed,
      jamStarted,
      inDroneScan,
      integrityLoss,
    };
  }
}
