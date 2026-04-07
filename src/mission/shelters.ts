/**
 * Shelters — ruined bunker structures that protect the player from dust storms.
 *
 * Each shelter is a small roofed structure with a protection radius.
 * When the player is inside a shelter's radius, dust storm damage is negated.
 */

import * as THREE from "three";
import { sampleTerrainY } from "./terrainSample";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Protection radius around each shelter center (world units). */
export const SHELTER_RADIUS = 5;

/** Fixed shelter positions spread across the playable area. */
const SHELTER_POSITIONS: { x: number; z: number }[] = [
  { x: -45, z: -30 },
  { x:  35, z:  42 },
  { x: -20, z:  55 },
  { x:  50, z: -18 },
  { x:   5, z: -50 },
  { x: -55, z:  15 },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Shelter {
  readonly center: THREE.Vector3;
  readonly radius: number;
  readonly group: THREE.Group;
}

// ---------------------------------------------------------------------------
// Visual
// ---------------------------------------------------------------------------

function buildShelterMesh(): THREE.Group {
  const g = new THREE.Group();

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x3a3230,
    roughness: 0.92,
    metalness: 0.35,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x2e2825,
    roughness: 0.88,
    metalness: 0.42,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x554838,
    emissive: 0xcc8830,
    emissiveIntensity: 0.25,
    roughness: 0.75,
    metalness: 0.3,
  });

  // Four corner pillars
  const pillarGeo = new THREE.CylinderGeometry(0.35, 0.4, 3.2, 6);
  const positions = [
    [-2.2, 0, -2.2],
    [ 2.2, 0, -2.2],
    [-2.2, 0,  2.2],
    [ 2.2, 0,  2.2],
  ];
  for (const [px, , pz] of positions) {
    const pillar = new THREE.Mesh(pillarGeo, wallMat);
    pillar.position.set(px, 1.6, pz);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    g.add(pillar);
  }

  // Roof slab
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(5.4, 0.35, 5.4),
    roofMat
  );
  roof.position.y = 3.3;
  roof.castShadow = true;
  roof.receiveShadow = true;
  g.add(roof);

  // Partial walls (two sides open for entry, two sides closed)
  const wallGeo = new THREE.BoxGeometry(5.0, 1.8, 0.25);

  const backWall = new THREE.Mesh(wallGeo, wallMat);
  backWall.position.set(0, 0.9, -2.2);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  g.add(backWall);

  const sideWall = new THREE.Mesh(wallGeo, wallMat);
  sideWall.position.set(-2.2, 0.9, 0);
  sideWall.rotation.y = Math.PI / 2;
  sideWall.castShadow = true;
  sideWall.receiveShadow = true;
  g.add(sideWall);

  // Half-wall on another side (ruined look)
  const halfWallGeo = new THREE.BoxGeometry(2.2, 1.2, 0.25);
  const halfWall = new THREE.Mesh(halfWallGeo, wallMat);
  halfWall.position.set(1.3, 0.6, 2.2);
  halfWall.castShadow = true;
  g.add(halfWall);

  // Accent stripe on the roof edge (orange marking — visible from distance)
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(5.6, 0.12, 0.3),
    accentMat
  );
  stripe.position.set(0, 3.5, 2.7);
  g.add(stripe);

  const stripe2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.12, 5.6),
    accentMat
  );
  stripe2.position.set(2.7, 3.5, 0);
  g.add(stripe2);

  // Floor pad (slightly raised)
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(4.8, 0.1, 4.8),
    new THREE.MeshStandardMaterial({
      color: 0x44403a,
      roughness: 0.95,
      metalness: 0.15,
    })
  );
  floor.position.y = 0.06;
  floor.receiveShadow = true;
  g.add(floor);

  // Debris around the base
  const debrisGeo = new THREE.BoxGeometry(0.6, 0.2, 0.4);
  const debrisMat = new THREE.MeshStandardMaterial({
    color: 0x3a3330,
    roughness: 0.9,
    metalness: 0.25,
  });
  for (let i = 0; i < 4; i++) {
    const angle = i * 1.8 + 0.3;
    const dx = Math.cos(angle) * 3.2;
    const dz = Math.sin(angle) * 3.2;
    const debris = new THREE.Mesh(debrisGeo, debrisMat);
    debris.position.set(dx, 0.1, dz);
    debris.rotation.y = angle * 1.3;
    debris.castShadow = true;
    g.add(debris);
  }

  return g;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function createShelters(
  terrain: THREE.Mesh,
  scene: THREE.Object3D,
): Shelter[] {
  const shelters: Shelter[] = [];

  for (const pos of SHELTER_POSITIONS) {
    const y = sampleTerrainY(terrain, pos.x, pos.z);
    const group = buildShelterMesh();
    group.position.set(pos.x, y, pos.z);
    // Random rotation for variety
    group.rotation.y = (pos.x * 0.1 + pos.z * 0.07) % (Math.PI * 2);
    scene.add(group);

    shelters.push({
      center: new THREE.Vector3(pos.x, y, pos.z),
      radius: SHELTER_RADIUS,
      group,
    });
  }

  return shelters;
}

export function disposeShelters(shelters: Shelter[]): void {
  for (const s of shelters) s.group.removeFromParent();
}

/**
 * Check if a position is inside any shelter's protection zone (XZ only).
 */
export function isInShelter(
  pos: THREE.Vector3,
  shelters: readonly Shelter[],
): boolean {
  for (const s of shelters) {
    const dx = pos.x - s.center.x;
    const dz = pos.z - s.center.z;
    if (dx * dx + dz * dz <= s.radius * s.radius) {
      return true;
    }
  }
  return false;
}
