import * as THREE from "three";
import { sampleTerrainY } from "./terrainSample";

export type PowerupKind =
  | "time_dilation"
  | "overcharge"
  | "phantom_cloak"
  | "speed_boots"
  | "mega_magnet";

export type PowerupPickup = {
  readonly group: THREE.Group;
  readonly center: THREE.Vector3;
  readonly kind: PowerupKind;
  collected: boolean;
};

const PICKUP_RADIUS = 2.2;

/** Active effect state (one per kind) on the player. */
export type ActivePowerups = {
  timeDilationLeft: number; // sec
  overchargeLeft: number;
  phantomCloakLeft: number;
  speedBootsLeft: number;
  megaMagnetLeft: number;
};

export function createActivePowerups(): ActivePowerups {
  return {
    timeDilationLeft: 0,
    overchargeLeft: 0,
    phantomCloakLeft: 0,
    speedBootsLeft: 0,
    megaMagnetLeft: 0,
  };
}

export const TIME_DILATION_DURATION = 4.0;
export const TIME_DILATION_FACTOR = 0.45;
export const OVERCHARGE_DURATION = 6.0;
export const PHANTOM_CLOAK_DURATION = 8.0;
export const SPEED_BOOTS_DURATION = 10.0;
export const SPEED_BOOTS_MULT = 1.5;
export const MEGA_MAGNET_DURATION = 6.0;

/* ================================================================== */
/*  Mesh builders                                                      */
/* ================================================================== */

function buildTimeDilationMesh(): THREE.Group {
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.45, 0),
    new THREE.MeshStandardMaterial({
      color: 0x402060,
      emissive: 0xc060ff,
      emissiveIntensity: 1.4,
      metalness: 0.5,
      roughness: 0.18,
    }),
  );
  g.add(core);
  // Outer hourglass shape
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(
      new THREE.TorusGeometry(0.55 - i * 0.12, 0.04, 6, 22),
      new THREE.MeshStandardMaterial({
        color: 0x1a0830,
        emissive: 0xa040ff,
        emissiveIntensity: 1.0,
        metalness: 0.6,
        roughness: 0.22,
      }),
    );
    r.rotation.x = Math.PI / 2;
    g.add(r);
  }
  return g;
}

function buildOverchargeMesh(): THREE.Group {
  const g = new THREE.Group();
  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.7, 16),
    new THREE.MeshStandardMaterial({
      color: 0x103040,
      emissive: 0x40ddff,
      emissiveIntensity: 1.6,
      metalness: 0.4,
      roughness: 0.18,
    }),
  );
  g.add(inner);
  // Vertical electrodes
  for (let s = -1; s <= 1; s += 2) {
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 0.08, 12),
      new THREE.MeshStandardMaterial({
        color: 0x223040,
        emissive: 0x88eeff,
        emissiveIntensity: 1.2,
        metalness: 0.7,
        roughness: 0.2,
      }),
    );
    cap.position.y = 0.4 * s;
    g.add(cap);
  }
  return g;
}

function buildCloakMesh(): THREE.Group {
  const g = new THREE.Group();
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 16, 12),
    new THREE.MeshStandardMaterial({
      color: 0x101020,
      emissive: 0x6060a0,
      emissiveIntensity: 0.9,
      metalness: 0.6,
      roughness: 0.3,
      transparent: true,
      opacity: 0.55,
    }),
  );
  g.add(sphere);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.04, 6, 24),
    new THREE.MeshStandardMaterial({
      color: 0x202040,
      emissive: 0x8080ff,
      emissiveIntensity: 1.2,
      metalness: 0.6,
      roughness: 0.25,
    }),
  );
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}

function buildSpeedBootsMesh(): THREE.Group {
  const g = new THREE.Group();
  const wing = new THREE.Mesh(
    new THREE.ConeGeometry(0.32, 0.9, 5),
    new THREE.MeshStandardMaterial({
      color: 0x102018,
      emissive: 0x40ff80,
      emissiveIntensity: 1.4,
      metalness: 0.5,
      roughness: 0.2,
    }),
  );
  wing.rotation.z = Math.PI;
  g.add(wing);
  // Side fins
  for (let s = -1; s <= 1; s += 2) {
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.55, 0.04),
      new THREE.MeshStandardMaterial({
        color: 0x081810,
        emissive: 0x60ffaa,
        emissiveIntensity: 1.2,
        metalness: 0.5,
        roughness: 0.22,
      }),
    );
    fin.position.set(s * 0.35, 0, 0);
    fin.rotation.z = s * 0.35;
    g.add(fin);
  }
  return g;
}

function buildMegaMagnetMesh(): THREE.Group {
  const g = new THREE.Group();
  // U-shape magnet (two cylinders + base)
  for (let s = -1; s <= 1; s += 2) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.7, 12),
      new THREE.MeshStandardMaterial({
        color: 0x402020,
        emissive: 0xff4444,
        emissiveIntensity: 1.5,
        metalness: 0.7,
        roughness: 0.2,
      }),
    );
    post.position.set(s * 0.22, 0.05, 0);
    g.add(post);
    const tip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.12, 12),
      new THREE.MeshStandardMaterial({
        color: 0xeeeeee,
        emissive: 0xffffff,
        emissiveIntensity: 1.6,
        metalness: 0.8,
        roughness: 0.1,
      }),
    );
    tip.position.set(s * 0.22, 0.45, 0);
    g.add(tip);
  }
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.16, 0.3),
    new THREE.MeshStandardMaterial({
      color: 0x301010,
      emissive: 0xff2222,
      emissiveIntensity: 1.2,
      metalness: 0.7,
      roughness: 0.22,
    }),
  );
  base.position.y = -0.32;
  g.add(base);
  return g;
}

function meshForKind(k: PowerupKind): THREE.Group {
  switch (k) {
    case "time_dilation": return buildTimeDilationMesh();
    case "overcharge": return buildOverchargeMesh();
    case "phantom_cloak": return buildCloakMesh();
    case "speed_boots": return buildSpeedBootsMesh();
    case "mega_magnet": return buildMegaMagnetMesh();
  }
}

export function createPowerupPickups(
  terrain: THREE.Mesh,
  scene: THREE.Object3D,
  spawns: { x: number; z: number; kind: PowerupKind }[],
): PowerupPickup[] {
  const out: PowerupPickup[] = [];
  for (const s of spawns) {
    const y = sampleTerrainY(terrain, s.x, s.z) + 0.9;
    const group = new THREE.Group();
    group.name = `Powerup_${s.kind}`;
    group.add(meshForKind(s.kind));
    group.position.set(s.x, y, s.z);
    group.userData.baseY = y;
    group.scale.setScalar(1.1);
    scene.add(group);
    out.push({
      group,
      center: new THREE.Vector3(s.x, y, s.z),
      kind: s.kind,
      collected: false,
    });
  }
  return out;
}

export function tickPowerupIdle(
  pickups: PowerupPickup[],
  t: number,
): void {
  for (const p of pickups) {
    if (p.collected) continue;
    const baseY = p.group.userData.baseY as number;
    p.group.position.y = baseY + Math.sin(t * 1.8 + p.center.x * 0.1) * 0.12;
    p.group.rotation.y = t * 0.85;
  }
}

export function tryCollectPowerups(
  pickups: PowerupPickup[],
  playerPos: THREE.Vector3,
  active: ActivePowerups,
): PowerupKind | null {
  for (const p of pickups) {
    if (p.collected) continue;
    if (p.center.distanceToSquared(playerPos) <= PICKUP_RADIUS * PICKUP_RADIUS) {
      p.collected = true;
      p.group.visible = false;
      switch (p.kind) {
        case "time_dilation": active.timeDilationLeft = TIME_DILATION_DURATION; break;
        case "overcharge": active.overchargeLeft = OVERCHARGE_DURATION; break;
        case "phantom_cloak": active.phantomCloakLeft = PHANTOM_CLOAK_DURATION; break;
        case "speed_boots": active.speedBootsLeft = SPEED_BOOTS_DURATION; break;
        case "mega_magnet": active.megaMagnetLeft = MEGA_MAGNET_DURATION; break;
      }
      return p.kind;
    }
  }
  return null;
}

export function tickActivePowerups(active: ActivePowerups, dt: number): void {
  if (active.timeDilationLeft > 0) active.timeDilationLeft = Math.max(0, active.timeDilationLeft - dt);
  if (active.overchargeLeft > 0) active.overchargeLeft = Math.max(0, active.overchargeLeft - dt);
  if (active.phantomCloakLeft > 0) active.phantomCloakLeft = Math.max(0, active.phantomCloakLeft - dt);
  if (active.speedBootsLeft > 0) active.speedBootsLeft = Math.max(0, active.speedBootsLeft - dt);
  if (active.megaMagnetLeft > 0) active.megaMagnetLeft = Math.max(0, active.megaMagnetLeft - dt);
}

export function powerupLabel(k: PowerupKind): string {
  switch (k) {
    case "time_dilation": return "TIME DILATION";
    case "overcharge": return "OVERCHARGE";
    case "phantom_cloak": return "PHANTOM CLOAK";
    case "speed_boots": return "SPEED BOOTS";
    case "mega_magnet": return "MEGA MAGNET";
  }
}

export function powerupColor(k: PowerupKind): string {
  switch (k) {
    case "time_dilation": return "#c060ff";
    case "overcharge": return "#40ddff";
    case "phantom_cloak": return "#8080ff";
    case "speed_boots": return "#40ff80";
    case "mega_magnet": return "#ff4444";
  }
}
