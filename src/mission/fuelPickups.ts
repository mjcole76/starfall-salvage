import * as THREE from "three";
import { sampleTerrainY } from "./terrainSample";

export type FuelCanPickup = {
  readonly group: THREE.Group;
  readonly center: THREE.Vector3;
  readonly amount: number;
  collected: boolean;
};

const PICKUP_RADIUS = 2.2;

function createFuelCanMesh(): THREE.Group {
  const g = new THREE.Group();
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.38, 0.78, 12),
    new THREE.MeshStandardMaterial({
      color: 0x4a3a18,
      emissive: 0xcc8822,
      emissiveIntensity: 0.45,
      metalness: 0.5,
      roughness: 0.4,
    })
  );
  tank.castShadow = true;
  g.add(tank);
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.36, 0.035, 6, 18),
    new THREE.MeshStandardMaterial({
      color: 0x2a2010,
      emissive: 0xffaa22,
      emissiveIntensity: 0.65,
      metalness: 0.45,
      roughness: 0.42,
    })
  );
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.12;
  g.add(band);
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.12, 0.14, 8),
    new THREE.MeshStandardMaterial({
      color: 0x3a3a38,
      emissive: 0x665544,
      emissiveIntensity: 0.25,
      metalness: 0.6,
      roughness: 0.35,
    })
  );
  cap.position.y = 0.46;
  g.add(cap);
  return g;
}

export function createFuelPickups(
  terrain: THREE.Mesh,
  scene: THREE.Object3D,
  items: readonly { x: number; z: number; amount: number }[]
): FuelCanPickup[] {
  const out: FuelCanPickup[] = [];

  for (const it of items) {
    const y = sampleTerrainY(terrain, it.x, it.z) + 0.52;
    const group = new THREE.Group();
    group.name = "FuelCanister";
    group.add(createFuelCanMesh());
    group.position.set(it.x, y, it.z);
    group.userData.baseY = y;
    group.userData.phase = (it.x * 0.13 - it.z * 0.07) % 6.28;
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

export function tryCollectFuel(
  items: FuelCanPickup[],
  playerPos: THREE.Vector3
): number {
  let add = 0;
  for (const f of items) {
    if (f.collected) continue;
    if (f.center.distanceToSquared(playerPos) <= PICKUP_RADIUS * PICKUP_RADIUS) {
      f.collected = true;
      f.group.visible = false;
      add += f.amount;
    }
  }
  return add;
}

export function resetFuelPickups(items: FuelCanPickup[]): void {
  for (const f of items) {
    f.collected = false;
    f.group.visible = true;
  }
}

export function tickFuelIdle(
  items: FuelCanPickup[],
  missionElapsed: number
): void {
  const t = missionElapsed;
  for (const f of items) {
    if (f.collected) continue;
    const g = f.group;
    const baseY = g.userData.baseY as number;
    const ph = (g.userData.phase as number) ?? 0;
    g.position.y = baseY + Math.sin(t * 1.48 + ph) * 0.09;
    g.rotation.y = t * 0.38 + ph;
  }
}
