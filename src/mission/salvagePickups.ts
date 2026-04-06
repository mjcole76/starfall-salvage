import * as THREE from "three";
import { sampleTerrainY } from "./terrainSample";

/** Optional salvage — score from table only (no loot RNG). */
export type SalvageKind =
  | "salvage_crate"
  | "drone_cache"
  | "crystal_sample"
  | "prototype_battery"
  | "navigation_core";

export const SALVAGE_SCORES: Readonly<Record<SalvageKind, number>> = {
  salvage_crate: 100,
  drone_cache: 150,
  crystal_sample: 200,
  prototype_battery: 250,
  navigation_core: 300,
};

export type SalvagePickup = {
  readonly group: THREE.Group;
  readonly center: THREE.Vector3;
  readonly score: number;
  readonly kind: SalvageKind;
  collected: boolean;
};

const PICKUP_RADIUS = 2.1;

function buildSalvageMesh(kind: SalvageKind): THREE.Group {
  const g = new THREE.Group();
  switch (kind) {
    case "salvage_crate": {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.78, 0.62, 0.78),
        new THREE.MeshStandardMaterial({
          color: 0x3a3428,
          emissive: 0x886644,
          emissiveIntensity: 0.55,
          metalness: 0.55,
          roughness: 0.42,
        })
      );
      box.castShadow = true;
      g.add(box);
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.82, 0.12, 0.82),
        new THREE.MeshStandardMaterial({
          color: 0x2a2418,
          emissive: 0xaa7744,
          emissiveIntensity: 0.7,
          metalness: 0.4,
          roughness: 0.5,
        })
      );
      stripe.position.y = 0.08;
      g.add(stripe);
      break;
    }
    case "drone_cache": {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.28, 0.5),
        new THREE.MeshStandardMaterial({
          color: 0x2a3038,
          emissive: 0x334466,
          emissiveIntensity: 0.35,
          metalness: 0.65,
          roughness: 0.38,
        })
      );
      body.castShadow = true;
      g.add(body);
      const lens = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 8, 8),
        new THREE.MeshStandardMaterial({
          color: 0x6688aa,
          emissive: 0x88aacc,
          emissiveIntensity: 0.95,
          metalness: 0.2,
          roughness: 0.25,
        })
      );
      lens.position.set(0, 0.06, 0.26);
      g.add(lens);
      const wing = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.08, 0.55),
        new THREE.MeshStandardMaterial({
          color: 0x353540,
          emissive: 0x445566,
          emissiveIntensity: 0.25,
          metalness: 0.6,
          roughness: 0.45,
        })
      );
      wing.position.set(-0.52, 0, 0);
      g.add(wing);
      const wing2 = wing.clone();
      wing2.position.x = 0.52;
      g.add(wing2);
      break;
    }
    case "crystal_sample": {
      const cry = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.38, 0),
        new THREE.MeshStandardMaterial({
          color: 0x4a3860,
          emissive: 0x8866cc,
          emissiveIntensity: 0.75,
          metalness: 0.15,
          roughness: 0.28,
        })
      );
      cry.castShadow = true;
      g.add(cry);
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.28, 0.15, 8),
        new THREE.MeshStandardMaterial({
          color: 0x2a2830,
          emissive: 0x443355,
          emissiveIntensity: 0.2,
          metalness: 0.5,
          roughness: 0.5,
        })
      );
      base.position.y = -0.32;
      g.add(base);
      break;
    }
    case "prototype_battery": {
      const cell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.72, 10),
        new THREE.MeshStandardMaterial({
          color: 0x3a3020,
          emissive: 0xcc8844,
          emissiveIntensity: 0.65,
          metalness: 0.45,
          roughness: 0.35,
        })
      );
      cell.rotation.z = Math.PI / 2;
      cell.castShadow = true;
      g.add(cell);
      g.userData.batteryMat = cell.material;
      break;
    }
    case "navigation_core": {
      const core = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.5, 0.36),
        new THREE.MeshStandardMaterial({
          color: 0x283038,
          emissive: 0x44aacc,
          emissiveIntensity: 0.5,
          metalness: 0.7,
          roughness: 0.32,
        })
      );
      core.castShadow = true;
      g.add(core);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.32, 0.04, 6, 16),
        new THREE.MeshStandardMaterial({
          color: 0x1a2830,
          emissive: 0x66ddcc,
          emissiveIntensity: 0.85,
          metalness: 0.5,
          roughness: 0.35,
        })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.02;
      g.add(ring);
      break;
    }
  }
  return g;
}

export function createSalvagePickups(
  terrain: THREE.Mesh,
  scene: THREE.Object3D,
  items: readonly { x: number; z: number; kind: SalvageKind }[]
): SalvagePickup[] {
  const out: SalvagePickup[] = [];

  for (const it of items) {
    const y = sampleTerrainY(terrain, it.x, it.z) + 0.55;
    const group = new THREE.Group();
    group.name = `Salvage_${it.kind}`;
    const mesh = buildSalvageMesh(it.kind);
    group.add(mesh);
    group.scale.setScalar(1.08);
    if (it.kind === "prototype_battery" && mesh.userData.batteryMat) {
      group.userData.batteryMat = mesh.userData.batteryMat;
    }
    group.position.set(it.x, y, it.z);
    group.userData.baseY = y;
    group.userData.phase = (it.x + it.z * 0.17) % 6.28;
    scene.add(group);
    const score = SALVAGE_SCORES[it.kind];
    out.push({
      group,
      center: new THREE.Vector3(it.x, y, it.z),
      score,
      kind: it.kind,
      collected: false,
    });
  }
  return out;
}

export function tryCollectSalvage(
  items: SalvagePickup[],
  playerPos: THREE.Vector3
): number {
  let gained = 0;
  for (const s of items) {
    if (s.collected) continue;
    if (s.center.distanceToSquared(playerPos) <= PICKUP_RADIUS * PICKUP_RADIUS) {
      s.collected = true;
      s.group.visible = false;
      gained += s.score;
    }
  }
  return gained;
}

export function resetSalvage(items: SalvagePickup[]): void {
  for (const s of items) {
    s.collected = false;
    s.group.visible = true;
  }
}

export function salvageCollectedCount(items: SalvagePickup[]): number {
  return items.filter((s) => s.collected).length;
}

export function salvageTotalCount(items: SalvagePickup[]): number {
  return items.length;
}

/** Subtle hover + spin for top-down readability. */
export function tickSalvageIdle(items: SalvagePickup[], missionElapsed: number): void {
  const t = missionElapsed;
  for (const s of items) {
    if (s.collected) continue;
    const g = s.group;
    const baseY = g.userData.baseY as number;
    const ph = (g.userData.phase as number) ?? 0;
    g.position.y = baseY + Math.sin(t * 1.55 + ph) * 0.11;
    g.rotation.y = t * 0.42 + ph;

    if (s.kind === "prototype_battery") {
      const mat = g.userData.batteryMat as
        | THREE.MeshStandardMaterial
        | undefined;
      if (mat) {
        mat.emissiveIntensity =
          0.45 + 0.35 * (0.5 + 0.5 * Math.sin(t * 11.2 + ph));
      }
    }
  }
}
