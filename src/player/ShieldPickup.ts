/**
 * Shield / Barrier Pickup — a collectible that grants a one-time dust storm shield.
 * When active, the next dust storm hit is absorbed instead of dealing damage.
 */

import * as THREE from "three";
import { sampleTerrainY } from "../mission/terrainSample";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const COLLECT_RADIUS = 2.2;
const HOVER_AMPLITUDE = 0.35;
const HOVER_SPEED = 2.4;
const SPIN_SPEED = 1.8;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShieldPickupItem {
  center: THREE.Vector3;
  group: THREE.Group;
  collected: boolean;
}

// ---------------------------------------------------------------------------
// Visual
// ---------------------------------------------------------------------------

function buildShieldVisual(): THREE.Group {
  const g = new THREE.Group();

  // Central sphere (energy core)
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 12, 12),
    new THREE.MeshStandardMaterial({
      color: 0x2244cc,
      emissive: 0x4488ff,
      emissiveIntensity: 1.2,
      metalness: 0.3,
      roughness: 0.2,
      transparent: true,
      opacity: 0.85,
    })
  );
  g.add(core);

  // Outer shield ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.7, 0.08, 8, 24),
    new THREE.MeshStandardMaterial({
      color: 0x3366ee,
      emissive: 0x66aaff,
      emissiveIntensity: 0.9,
      metalness: 0.5,
      roughness: 0.3,
      transparent: true,
      opacity: 0.7,
    })
  );
  ring.rotation.x = Math.PI / 2;
  g.add(ring);

  // Second ring (perpendicular)
  const ring2 = ring.clone();
  ring2.rotation.x = 0;
  ring2.rotation.y = Math.PI / 2;
  g.add(ring2);

  return g;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Fixed positions for shield pickups (spread across the map). */
const SHIELD_POSITIONS: { x: number; z: number }[] = [
  { x: -30, z: 20 },
  { x:  40, z: -10 },
  { x:   0, z:  45 },
];

export function createShieldPickups(
  terrain: THREE.Mesh,
  scene: THREE.Object3D,
): ShieldPickupItem[] {
  const items: ShieldPickupItem[] = [];
  for (const pos of SHIELD_POSITIONS) {
    const y = sampleTerrainY(terrain, pos.x, pos.z);
    const group = buildShieldVisual();
    group.position.set(pos.x, y + 1.5, pos.z);
    scene.add(group);
    items.push({
      center: new THREE.Vector3(pos.x, y, pos.z),
      group,
      collected: false,
    });
  }
  return items;
}

export function tickShieldIdle(items: ShieldPickupItem[], elapsed: number): void {
  for (const item of items) {
    if (item.collected) continue;
    item.group.position.y = item.center.y + 1.5 + Math.sin(elapsed * HOVER_SPEED) * HOVER_AMPLITUDE;
    item.group.rotation.y = elapsed * SPIN_SPEED;
  }
}

export function tryCollectShield(
  items: ShieldPickupItem[],
  playerPos: THREE.Vector3,
): boolean {
  for (const item of items) {
    if (item.collected) continue;
    const dx = playerPos.x - item.center.x;
    const dz = playerPos.z - item.center.z;
    if (dx * dx + dz * dz <= COLLECT_RADIUS * COLLECT_RADIUS) {
      item.collected = true;
      item.group.visible = false;
      return true;
    }
  }
  return false;
}

export function disposeShieldPickups(items: ShieldPickupItem[]): void {
  for (const item of items) item.group.removeFromParent();
}
