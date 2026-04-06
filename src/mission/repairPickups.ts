import * as THREE from "three";
import { sampleTerrainY } from "./terrainSample";

export type RepairKitPickup = {
  readonly group: THREE.Group;
  readonly center: THREE.Vector3;
  /** Integrity restored (clamped to max in game). */
  readonly amount: number;
  collected: boolean;
};

const PICKUP_RADIUS = 2.15;

function createRepairKitMesh(): THREE.Group {
  const g = new THREE.Group();
  const caseBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.38, 0.48),
    new THREE.MeshStandardMaterial({
      color: 0xd8e0e8,
      emissive: 0x223328,
      emissiveIntensity: 0.15,
      metalness: 0.35,
      roughness: 0.45,
    })
  );
  caseBox.castShadow = true;
  g.add(caseBox);
  const accent = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.22, 0.52),
    new THREE.MeshStandardMaterial({
      color: 0x1a3020,
      emissive: 0x44cc66,
      emissiveIntensity: 0.55,
      metalness: 0.4,
      roughness: 0.38,
    })
  );
  accent.position.set(0.22, 0.02, 0);
  g.add(accent);
  const latch = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.08, 0.06),
    new THREE.MeshStandardMaterial({
      color: 0x2a3540,
      emissive: 0x334455,
      emissiveIntensity: 0.2,
      metalness: 0.55,
      roughness: 0.4,
    })
  );
  latch.position.set(-0.18, 0.18, 0.24);
  g.add(latch);
  return g;
}

export function createRepairPickups(
  terrain: THREE.Mesh,
  scene: THREE.Object3D,
  items: readonly { x: number; z: number; amount: number }[]
): RepairKitPickup[] {
  const out: RepairKitPickup[] = [];
  for (const it of items) {
    const y = sampleTerrainY(terrain, it.x, it.z) + 0.48;
    const group = new THREE.Group();
    group.name = "RepairKit";
    group.add(createRepairKitMesh());
    group.position.set(it.x, y, it.z);
    group.userData.baseY = y;
    group.userData.phase = (it.z * 0.19 - it.x * 0.08) % 6.28;
    scene.add(group);
    out.push({
      group,
      center: new THREE.Vector3(it.x, y, it.z),
      amount: it.amount,
      collected: false,
    });
  }
  return out;
}

/** Returns total integrity restored this frame. */
export function tryCollectRepair(
  items: RepairKitPickup[],
  playerPos: THREE.Vector3
): number {
  let add = 0;
  for (const r of items) {
    if (r.collected) continue;
    if (r.center.distanceToSquared(playerPos) <= PICKUP_RADIUS * PICKUP_RADIUS) {
      r.collected = true;
      r.group.visible = false;
      add += r.amount;
    }
  }
  return add;
}

export function tickRepairIdle(
  items: RepairKitPickup[],
  missionElapsed: number
): void {
  const t = missionElapsed;
  for (const r of items) {
    if (r.collected) continue;
    const g = r.group;
    const baseY = g.userData.baseY as number;
    const ph = (g.userData.phase as number) ?? 0;
    g.position.y = baseY + Math.sin(t * 1.42 + ph) * 0.085;
    g.rotation.y = t * 0.28 + ph;
  }
}
