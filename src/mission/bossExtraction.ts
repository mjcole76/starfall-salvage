import * as THREE from "three";
import { sampleTerrainY } from "./terrainSample";

/**
 * Boss enemy that spawns near the extraction zone on tier 4, 8, and 12.
 * A large hovering mech-drone with charging laser sweeps. Player must dodge
 * its laser sweeps until extracted (cannot be killed in this build —
 * it's a survival challenge).
 *
 * For T12 final boss: the boss is more aggressive and triggers ending screen
 * on extract.
 */

export type Boss = {
  group: THREE.Group;
  body: THREE.Mesh;
  ring: THREE.Mesh;
  beam: THREE.Mesh;
  pos: THREE.Vector3;
  state: "circling" | "charging" | "sweeping" | "cooldown";
  stateLeft: number;
  /** Current sweep angle (radians). */
  sweepAngle: number;
  /** Direction the sweep is moving (+1 / -1). */
  sweepDir: 1 | -1;
  /** HP bar 0..1 (cosmetic — boss can't die, but hits visually deplete + regen). */
  hp: number;
  damage: number;
  range: number;
  isFinal: boolean;
};

export function createBoss(
  terrain: THREE.Mesh,
  scene: THREE.Object3D,
  centerX: number,
  centerZ: number,
  isFinal: boolean,
): Boss {
  const root = new THREE.Group();
  root.name = "Boss";
  scene.add(root);

  const baseY = sampleTerrainY(terrain, centerX, centerZ) + 6;
  root.position.set(centerX, baseY, centerZ);

  // Body — flying chassis
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x101018,
    emissive: isFinal ? 0xff2266 : 0xff4422,
    emissiveIntensity: 1.4,
    metalness: 0.7,
    roughness: 0.25,
  });
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 1), bodyMat);
  body.castShadow = true;
  root.add(body);

  // Outer ring (rotates)
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.4, 0.18, 8, 32),
    new THREE.MeshStandardMaterial({
      color: 0x202028,
      emissive: isFinal ? 0xff44aa : 0xff8844,
      emissiveIntensity: 1.6,
      metalness: 0.7,
      roughness: 0.25,
    }),
  );
  ring.rotation.x = Math.PI / 2;
  root.add(ring);

  // Beam (hidden until sweeping)
  const beamGeo = new THREE.BoxGeometry(0.4, 0.4, 60);
  const beamMat = new THREE.MeshBasicMaterial({
    color: isFinal ? 0xff44aa : 0xff6622,
    transparent: true,
    opacity: 0.0,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.set(0, 0, 0);
  root.add(beam);

  return {
    group: root,
    body,
    ring,
    beam,
    pos: new THREE.Vector3(centerX, baseY, centerZ),
    state: "circling",
    stateLeft: 3,
    sweepAngle: 0,
    sweepDir: 1,
    hp: 1.0,
    damage: isFinal ? 18 : 14,
    range: 32,
    isFinal,
  };
}

const CHARGE_SEC = 1.4;
const SWEEP_SEC = 2.2;
const COOLDOWN_SEC = 2.5;
const CIRCLE_RADIUS = 18;

export function tickBoss(
  boss: Boss,
  playerPos: THREE.Vector3,
  dt: number,
  cloaked: boolean,
): { damage: number; phaseChanged: boolean } {
  let damage = 0;
  let phaseChanged = false;

  // Idle bob
  boss.group.position.y = boss.pos.y + Math.sin(performance.now() * 0.0015) * 0.6;
  boss.body.rotation.y += dt * 0.35;
  boss.ring.rotation.z += dt * 0.65;

  switch (boss.state) {
    case "circling": {
      // Orbit around its anchor; track player
      const t = performance.now() * 0.0006;
      boss.group.position.x = boss.pos.x + Math.cos(t) * CIRCLE_RADIUS * 0.4;
      boss.group.position.z = boss.pos.z + Math.sin(t) * CIRCLE_RADIUS * 0.4;
      boss.stateLeft -= dt;
      if (boss.stateLeft <= 0) {
        boss.state = "charging";
        boss.stateLeft = CHARGE_SEC;
        // Aim at player
        const dx = playerPos.x - boss.group.position.x;
        const dz = playerPos.z - boss.group.position.z;
        boss.sweepAngle = Math.atan2(dx, dz);
        boss.sweepDir = Math.random() < 0.5 ? -1 : 1;
        phaseChanged = true;
      }
      break;
    }
    case "charging": {
      boss.stateLeft -= dt;
      // Pulsing warning glow on body
      const tt = 1 - boss.stateLeft / CHARGE_SEC;
      const mat = boss.body.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.4 + Math.sin(tt * 24) * 1.2;

      // Pre-aim beam toward player position (locked in)
      boss.beam.rotation.y = -boss.sweepAngle;
      const beamMat = boss.beam.material as THREE.MeshBasicMaterial;
      beamMat.opacity = 0.15 + tt * 0.4;

      if (boss.stateLeft <= 0) {
        boss.state = "sweeping";
        boss.stateLeft = SWEEP_SEC;
        beamMat.opacity = 1.0;
      }
      break;
    }
    case "sweeping": {
      boss.stateLeft -= dt;
      // Sweep beam through arc
      const sweepRate = (Math.PI * 0.65) / SWEEP_SEC; // total arc ~115°
      boss.sweepAngle += boss.sweepDir * sweepRate * dt;
      boss.beam.rotation.y = -boss.sweepAngle;

      // Damage if player is in beam line
      if (!cloaked) {
        const dx = playerPos.x - boss.group.position.x;
        const dz = playerPos.z - boss.group.position.z;
        const distToBoss = Math.hypot(dx, dz);
        if (distToBoss < boss.range) {
          const angleToPlayer = Math.atan2(dx, dz);
          let diff = angleToPlayer - boss.sweepAngle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          // Tight beam: ~5° tolerance
          if (Math.abs(diff) < 0.09) {
            damage += boss.damage * dt * 4; // burst dps
          }
        }
      }

      if (boss.stateLeft <= 0) {
        boss.state = "cooldown";
        boss.stateLeft = COOLDOWN_SEC;
        (boss.beam.material as THREE.MeshBasicMaterial).opacity = 0;
        const mat = boss.body.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 1.4;
      }
      break;
    }
    case "cooldown":
      boss.stateLeft -= dt;
      if (boss.stateLeft <= 0) {
        boss.state = "circling";
        boss.stateLeft = boss.isFinal ? 1.5 : 2.5;
      }
      break;
  }

  return { damage, phaseChanged };
}

export function disposeBoss(boss: Boss, scene: THREE.Object3D): void {
  scene.remove(boss.group);
  boss.group.traverse((c) => {
    if (c instanceof THREE.Mesh) {
      c.geometry?.dispose();
      if (c.material instanceof THREE.Material) c.material.dispose();
    }
  });
}

/** Tier indices that get a boss (1-indexed). */
export function tierHasBoss(tier: number): boolean {
  return tier === 4 || tier === 8 || tier === 12;
}
