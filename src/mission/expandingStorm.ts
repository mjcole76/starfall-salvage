import * as THREE from "three";
import type { HazardTuning } from "./hazardConfig";
import type { MissionVariant } from "./missionVariants";

/** Safe radius shrinks over mission time (quadratic = late pressure). */
export function safeZoneRadius(
  variant: MissionVariant,
  elapsed: number
): number {
  const T = Math.max(1, variant.stormTimeLimitSec);
  const t = THREE.MathUtils.clamp(elapsed / T, 0, 1);
  const k = t * t;
  return (
    variant.stormStartRadius +
    (variant.stormEndRadius - variant.stormStartRadius) * k
  );
}

/** Storm Front — integrity loss / sec outside the safe cylinder. */
export function stormWallDamagePerSec(
  playerPos: THREE.Vector3,
  centerX: number,
  centerZ: number,
  safeRadius: number,
  pressureMult: number,
  tuning: Pick<HazardTuning, "stormWallDpsBase" | "stormWallDpsPerOverUnit">
): number {
  const dx = playerPos.x - centerX;
  const dz = playerPos.z - centerZ;
  const d = Math.hypot(dx, dz);
  if (d <= safeRadius) return 0;
  const over = d - safeRadius;
  return (
    (tuning.stormWallDpsBase + over * tuning.stormWallDpsPerOverUnit) *
    pressureMult
  );
}

/** 0 = deep inside safe zone, 1 = at or past wall (for fog). */
export function stormEdgeVisibilityStress(
  playerPos: THREE.Vector3,
  centerX: number,
  centerZ: number,
  safeRadius: number
): number {
  const dx = playerPos.x - centerX;
  const dz = playerPos.z - centerZ;
  const d = Math.hypot(dx, dz);
  const inner = Math.max(safeRadius - 22, safeRadius * 0.35);
  if (d <= inner) return 0;
  return THREE.MathUtils.clamp((d - inner) / Math.max(8, safeRadius - inner), 0, 1);
}

export type StormWallVisual = {
  readonly group: THREE.Group;
  update: (safeRadius: number, centerX: number, centerZ: number, centerY: number) => void;
};

/** Dust wall ring on the ground at the current safe boundary (Storm Front). */
export function createStormWallVisual(scene: THREE.Object3D): StormWallVisual {
  const group = new THREE.Group();
  group.name = "StormWall";
  scene.add(group);

  const refOuter = 100;
  const refInner = refOuter - 3.2;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(refInner, refOuter, 96),
    new THREE.MeshBasicMaterial({
      color: 0x6a4838,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  group.add(ring);

  const ring2 = new THREE.Mesh(
    new THREE.RingGeometry(refInner + 0.4, refOuter - 0.4, 96),
    new THREE.MeshBasicMaterial({
      color: 0xa87858,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  ring2.rotation.x = -Math.PI / 2;
  ring2.position.y = 0.02;
  group.add(ring2);

  const dustOuter = refOuter + 4.5;
  const dustInner = refOuter + 0.2;
  const dustHaze = new THREE.Mesh(
    new THREE.RingGeometry(dustInner, dustOuter, 64),
    new THREE.MeshBasicMaterial({
      color: 0x4a3828,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  dustHaze.rotation.x = -Math.PI / 2;
  dustHaze.position.y = 0.04;
  group.add(dustHaze);

  return {
    group,
    update(
      safeRadius: number,
      centerX: number,
      centerZ: number,
      centerY: number
    ) {
      const s = safeRadius / refOuter;
      group.scale.set(s, 1, s);
      group.position.set(centerX, centerY + 0.12, centerZ);
    },
  };
}
