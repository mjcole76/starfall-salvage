import * as THREE from "three";
import { sampleTerrainY } from "./terrainSample";

/** Standard cyan core vs unstable high-value (risk route). */
export type CorePickupVariant = "standard" | "high_value";

export type CoreSpawn = {
  readonly x: number;
  readonly z: number;
  readonly variant?: CorePickupVariant;
};

export type EnergyCorePickup = {
  readonly group: THREE.Group;
  readonly center: THREE.Vector3;
  readonly pointValue: number;
  readonly variant: CorePickupVariant;
  collected: boolean;
};

export const STANDARD_CORE_SCORE = 500;
export const HIGH_VALUE_CORE_SCORE = 750;

const COLLECT_RADIUS = 2.4;

function createStandardCoreMesh(): THREE.Group {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.42, 0.95, 14),
    new THREE.MeshStandardMaterial({
      color: 0x0c2030,
      emissive: 0x77d8ff,
      emissiveIntensity: 0.95,
      metalness: 0.42,
      roughness: 0.28,
    })
  );
  shell.castShadow = true;
  g.add(shell);
  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.24, 0.65, 12),
    new THREE.MeshStandardMaterial({
      color: 0xa8e8ff,
      emissive: 0xd8ffff,
      emissiveIntensity: 1.38,
      metalness: 0.15,
      roughness: 0.18,
    })
  );
  inner.position.y = 0.04;
  g.add(inner);
  const cap = new THREE.Mesh(
    new THREE.TorusGeometry(0.36, 0.045, 6, 20),
    new THREE.MeshStandardMaterial({
      color: 0x1a4058,
      emissive: 0x88ddff,
      emissiveIntensity: 1.05,
      metalness: 0.5,
      roughness: 0.25,
    })
  );
  cap.rotation.x = Math.PI / 2;
  cap.position.y = 0.48;
  g.add(cap);
  const cap2 = cap.clone();
  cap2.position.y = -0.48;
  g.add(cap2);
  return g;
}

/** Amber / hot seam — reads distinct from standard cores. */
function createHighValueCoreMesh(): THREE.Group {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.44, 1.0, 14),
    new THREE.MeshStandardMaterial({
      color: 0x302010,
      emissive: 0xffbb55,
      emissiveIntensity: 0.82,
      metalness: 0.5,
      roughness: 0.26,
    })
  );
  shell.castShadow = true;
  g.add(shell);
  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.22, 0.55, 12),
    new THREE.MeshStandardMaterial({
      color: 0xffeed0,
      emissive: 0xffcc66,
      emissiveIntensity: 1.15,
      metalness: 0.2,
      roughness: 0.22,
    })
  );
  inner.position.y = 0.05;
  g.add(inner);
  const seam = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.04, 6, 20),
    new THREE.MeshStandardMaterial({
      color: 0x4a3010,
      emissive: 0xff7722,
      emissiveIntensity: 1.1,
      metalness: 0.55,
      roughness: 0.3,
    })
  );
  seam.rotation.x = Math.PI / 2;
  seam.position.y = 0.52;
  g.add(seam);
  const seam2 = seam.clone();
  seam2.position.y = -0.52;
  g.add(seam2);
  return g;
}

export function createEnergyCores(
  terrain: THREE.Mesh,
  scene: THREE.Object3D,
  spawns: readonly CoreSpawn[]
): EnergyCorePickup[] {
  const cores: EnergyCorePickup[] = [];

  for (const s of spawns) {
    const variant: CorePickupVariant = s.variant ?? "standard";
    const pointValue =
      variant === "high_value" ? HIGH_VALUE_CORE_SCORE : STANDARD_CORE_SCORE;
    const y = sampleTerrainY(terrain, s.x, s.z) + 0.95;
    const group = new THREE.Group();
    group.name =
      variant === "high_value" ? "UnstableCore" : "EnergyCore";
    group.add(
      variant === "high_value"
        ? createHighValueCoreMesh()
        : createStandardCoreMesh()
    );
    group.scale.setScalar(1.12);
    group.position.set(s.x, y, s.z);
    group.userData.baseY = y;
    group.userData.phase = (s.x * 0.09 + s.z * 0.11) % 6.28;
    scene.add(group);

    cores.push({
      group,
      center: new THREE.Vector3(s.x, y, s.z),
      pointValue,
      variant,
      collected: false,
    });
  }
  return cores;
}

export type CoreCollectResult = {
  readonly picked: number;
  readonly scoreGain: number;
};

export function tryCollectEnergyCores(
  cores: EnergyCorePickup[],
  playerPos: THREE.Vector3
): CoreCollectResult {
  let picked = 0;
  let scoreGain = 0;
  for (const c of cores) {
    if (c.collected) continue;
    if (c.center.distanceToSquared(playerPos) <= COLLECT_RADIUS * COLLECT_RADIUS) {
      c.collected = true;
      c.group.visible = false;
      picked += 1;
      scoreGain += c.pointValue;
    }
  }
  return { picked, scoreGain };
}

export function collectedCoreCount(cores: EnergyCorePickup[]): number {
  return cores.filter((c) => c.collected).length;
}

export function totalCoreCount(cores: EnergyCorePickup[]): number {
  return cores.length;
}

export function resetEnergyCores(cores: EnergyCorePickup[]): void {
  for (const c of cores) {
    c.collected = false;
    c.group.visible = true;
  }
}

export function tickEnergyCoreIdle(
  cores: EnergyCorePickup[],
  missionElapsed: number
): void {
  const t = missionElapsed;
  for (const c of cores) {
    if (c.collected) continue;
    const g = c.group;
    const baseY = g.userData.baseY as number;
    const ph = (g.userData.phase as number) ?? 0;
    const bob =
      c.variant === "high_value"
        ? Math.sin(t * 1.55 + ph) * 0.12
        : Math.sin(t * 1.35 + ph) * 0.1;
    g.position.y = baseY + bob;
    g.rotation.y = t * (c.variant === "high_value" ? 0.72 : 0.55) + ph;
  }
}

/** @deprecated use mission `requiredCoreCount` */
export const ENERGY_CORE_TARGET = 3;
