import * as THREE from "three";
import { sampleTerrainY } from "./terrainSample";

/* ================================================================== */
/*  Sentry Turret — stationary, telegraphed laser shots                */
/* ================================================================== */

export type SentryTurret = {
  group: THREE.Group;
  base: THREE.Mesh;
  head: THREE.Mesh;
  laser: THREE.Mesh;
  warningLine: THREE.Mesh;
  pos: THREE.Vector3;
  range: number;
  /** State machine. */
  state: "idle" | "tracking" | "warning" | "firing" | "cooldown";
  stateLeft: number;
  damage: number;
};

export function createSentryTurrets(
  terrain: THREE.Mesh,
  scene: THREE.Object3D,
  count: number,
): SentryTurret[] {
  const out: SentryTurret[] = [];
  const root = new THREE.Group();
  root.name = "SentryTurrets";
  scene.add(root);

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 110;
    const z = (Math.random() - 0.5) * 110;
    const y = sampleTerrainY(terrain, x, z);

    const g = new THREE.Group();

    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x202028,
      emissive: 0x402030,
      emissiveIntensity: 0.4,
      metalness: 0.7,
      roughness: 0.3,
    });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.6, 12), baseMat);
    base.position.y = 0.3;
    base.castShadow = true;
    g.add(base);

    const headMat = new THREE.MeshStandardMaterial({
      color: 0x101018,
      emissive: 0xff3030,
      emissiveIntensity: 0.7,
      metalness: 0.7,
      roughness: 0.25,
    });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.55, 1.0), headMat);
    head.position.y = 0.85;
    head.castShadow = true;
    g.add(head);

    // Eye glow
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 12, 8),
      new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff4444,
        emissiveIntensity: 2.0,
      }),
    );
    eye.position.set(0, 0.85, 0.45);
    g.add(eye);

    // Warning line (red telegraph)
    const wLineGeo = new THREE.BoxGeometry(0.05, 0.05, 1);
    const wLineMat = new THREE.MeshBasicMaterial({
      color: 0xff2222,
      transparent: true,
      opacity: 0.0,
    });
    const warningLine = new THREE.Mesh(wLineGeo, wLineMat);
    warningLine.position.y = 0.85;
    g.add(warningLine);

    // Actual laser bolt
    const laserGeo = new THREE.BoxGeometry(0.18, 0.18, 1);
    const laserMat = new THREE.MeshBasicMaterial({
      color: 0xff8080,
      transparent: true,
      opacity: 0.0,
    });
    const laser = new THREE.Mesh(laserGeo, laserMat);
    laser.position.y = 0.85;
    g.add(laser);

    g.position.set(x, y, z);
    root.add(g);

    out.push({
      group: g,
      base, head, laser, warningLine,
      pos: new THREE.Vector3(x, y, z),
      range: 28,
      state: "idle",
      stateLeft: 0,
      damage: 18,
    });
  }
  return out;
}

const TURRET_WARN_SEC = 1.2;
const TURRET_FIRE_SEC = 0.25;
const TURRET_COOLDOWN_SEC = 1.8;

export function tickSentryTurrets(
  turrets: SentryTurret[],
  playerPos: THREE.Vector3,
  dt: number,
  cloaked: boolean,
): { damage: number; firedNearPlayer: boolean } {
  let damage = 0;
  let fired = false;

  for (const t of turrets) {
    const dx = playerPos.x - t.pos.x;
    const dz = playerPos.z - t.pos.z;
    const dist = Math.hypot(dx, dz);
    const inRange = !cloaked && dist <= t.range;

    // Aim head toward player when in range or tracking
    if (inRange || t.state === "tracking" || t.state === "warning") {
      const angle = Math.atan2(dx, dz);
      t.head.rotation.y = -angle;
      t.warningLine.rotation.y = -angle;
      t.laser.rotation.y = -angle;

      // Position telegraph/laser pointing at player
      const halfDist = Math.min(dist, t.range) / 2;
      const offset = new THREE.Vector3(dx, 0, dz).normalize().multiplyScalar(halfDist);
      t.warningLine.position.set(offset.x, 0.85, offset.z);
      t.warningLine.scale.set(1, 1, halfDist * 2);
      t.laser.position.set(offset.x, 0.85, offset.z);
      t.laser.scale.set(1, 1, halfDist * 2);
    }

    switch (t.state) {
      case "idle":
        if (inRange) {
          t.state = "tracking";
          t.stateLeft = 0.4;
        }
        break;

      case "tracking":
        t.stateLeft -= dt;
        if (!inRange) {
          t.state = "idle";
        } else if (t.stateLeft <= 0) {
          t.state = "warning";
          t.stateLeft = TURRET_WARN_SEC;
        }
        break;

      case "warning": {
        t.stateLeft -= dt;
        const wMat = t.warningLine.material as THREE.MeshBasicMaterial;
        const tt = 1 - t.stateLeft / TURRET_WARN_SEC;
        wMat.opacity = 0.4 + 0.5 * Math.sin(tt * 18);
        if (t.stateLeft <= 0) {
          t.state = "firing";
          t.stateLeft = TURRET_FIRE_SEC;
          // Damage if player still in line of fire
          if (inRange) {
            damage += t.damage;
            fired = true;
          }
          (t.laser.material as THREE.MeshBasicMaterial).opacity = 1.0;
        }
        break;
      }

      case "firing": {
        t.stateLeft -= dt;
        const lMat = t.laser.material as THREE.MeshBasicMaterial;
        lMat.opacity = Math.max(0, t.stateLeft / TURRET_FIRE_SEC);
        const wMat = t.warningLine.material as THREE.MeshBasicMaterial;
        wMat.opacity *= 0.85;
        if (t.stateLeft <= 0) {
          t.state = "cooldown";
          t.stateLeft = TURRET_COOLDOWN_SEC;
        }
        break;
      }

      case "cooldown":
        t.stateLeft -= dt;
        (t.warningLine.material as THREE.MeshBasicMaterial).opacity = 0;
        (t.laser.material as THREE.MeshBasicMaterial).opacity = 0;
        if (t.stateLeft <= 0) {
          t.state = inRange ? "tracking" : "idle";
          t.stateLeft = 0.4;
        }
        break;
    }
  }

  return { damage, firedNearPlayer: fired };
}

/* ================================================================== */
/*  Burrowers — pop out of ground when player approaches               */
/* ================================================================== */

export type Burrower = {
  group: THREE.Group;
  body: THREE.Mesh;
  pos: THREE.Vector3;
  state: "buried" | "rising" | "out" | "diving";
  stateLeft: number;
  damage: number;
};

export function createBurrowers(
  terrain: THREE.Mesh,
  scene: THREE.Object3D,
  count: number,
): Burrower[] {
  const out: Burrower[] = [];
  const root = new THREE.Group();
  root.name = "Burrowers";
  scene.add(root);

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 100;
    const z = (Math.random() - 0.5) * 100;
    const y = sampleTerrainY(terrain, x, z);

    const g = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x281a14,
      emissive: 0xff6020,
      emissiveIntensity: 0.5,
      metalness: 0.5,
      roughness: 0.4,
    });
    const body = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 1.4, 8),
      bodyMat,
    );
    body.position.y = -1.2; // start buried
    body.castShadow = true;
    g.add(body);

    // Spikes
    for (let k = 0; k < 6; k++) {
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.4, 4),
        new THREE.MeshStandardMaterial({
          color: 0x101010,
          emissive: 0xff4422,
          emissiveIntensity: 0.6,
          metalness: 0.7,
          roughness: 0.3,
        }),
      );
      const a = (k / 6) * Math.PI * 2;
      spike.position.set(Math.cos(a) * 0.4, -1.2, Math.sin(a) * 0.4);
      spike.rotation.z = Math.cos(a) * 0.8;
      spike.rotation.x = Math.sin(a) * 0.8;
      g.add(spike);
    }

    g.position.set(x, y, z);
    root.add(g);

    out.push({
      group: g,
      body,
      pos: new THREE.Vector3(x, y, z),
      state: "buried",
      stateLeft: 0,
      damage: 22,
    });
  }
  return out;
}

const BURROW_TRIGGER_RADIUS = 7;
const BURROW_DAMAGE_RADIUS = 2.5;
const BURROW_RISE_SEC = 0.6;
const BURROW_OUT_SEC = 2.5;
const BURROW_DIVE_SEC = 0.6;
const BURROW_COOLDOWN_SEC = 4.5;

export function tickBurrowers(
  burrowers: Burrower[],
  playerPos: THREE.Vector3,
  dt: number,
  cloaked: boolean,
): { damage: number; popOut: boolean } {
  let damage = 0;
  let popOut = false;
  for (const b of burrowers) {
    const d = Math.hypot(playerPos.x - b.pos.x, playerPos.z - b.pos.z);

    switch (b.state) {
      case "buried": {
        // Cooldown ticking down (stored as negative stateLeft)
        if (b.stateLeft < 0) b.stateLeft += dt;
        if (b.stateLeft >= 0 && d < BURROW_TRIGGER_RADIUS && !cloaked) {
          b.state = "rising";
          b.stateLeft = BURROW_RISE_SEC;
          popOut = true;
        }
        // Body stays at -1.2
        for (const child of b.group.children) {
          (child as THREE.Mesh).position.y = -1.2;
        }
        break;
      }
      case "rising": {
        b.stateLeft -= dt;
        const t = 1 - b.stateLeft / BURROW_RISE_SEC;
        const y = THREE.MathUtils.lerp(-1.2, 0.6, t);
        for (const child of b.group.children) {
          (child as THREE.Mesh).position.y = y;
        }
        // Damage on emergence
        if (b.stateLeft <= 0) {
          if (d < BURROW_DAMAGE_RADIUS) damage += b.damage;
          b.state = "out";
          b.stateLeft = BURROW_OUT_SEC;
        }
        break;
      }
      case "out": {
        b.stateLeft -= dt;
        // Continuous damage if player is on top
        if (d < BURROW_DAMAGE_RADIUS && !cloaked) {
          damage += 8 * dt;
        }
        if (b.stateLeft <= 0) {
          b.state = "diving";
          b.stateLeft = BURROW_DIVE_SEC;
        }
        break;
      }
      case "diving": {
        b.stateLeft -= dt;
        const t = 1 - b.stateLeft / BURROW_DIVE_SEC;
        const y = THREE.MathUtils.lerp(0.6, -1.2, t);
        for (const child of b.group.children) {
          (child as THREE.Mesh).position.y = y;
        }
        if (b.stateLeft <= 0) {
          b.state = "buried";
          b.stateLeft = -BURROW_COOLDOWN_SEC;
        }
        break;
      }
    }
  }
  return { damage, popOut };
}
