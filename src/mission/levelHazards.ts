import * as THREE from "three";
import { sampleTerrainY } from "./terrainSample";

/* ================================================================== */
/*  Per-frame effect applied to the player by hazards                 */
/* ================================================================== */

export type HazardPlayerEffect = {
  /** Multiplier on player movement speed (1 = normal). */
  speedMult: number;
  /** Direction the player should slide / be pushed (XZ). Magnitude = pull strength. */
  pushVec: THREE.Vector3;
  /** Damage applied this frame. */
  damage: number;
  /** True if jet should be jammed this frame. */
  jamJet: boolean;
  /** True if player is currently in slip / quicksand / gravity well — for HUD cue. */
  trapped: boolean;
};

function emptyEffect(): HazardPlayerEffect {
  return {
    speedMult: 1,
    pushVec: new THREE.Vector3(),
    damage: 0,
    jamJet: false,
    trapped: false,
  };
}

/* ================================================================== */
/*  Lightning strikes                                                  */
/* ================================================================== */

export type LightningSystem = {
  group: THREE.Group;
  strikes: LightningStrike[];
  warningSec: number;
  damageRadius: number;
  damage: number;
  /** Seconds until next telegraphed strike. */
  nextStrikeIn: number;
  /** Average period between strikes (sec). */
  period: number;
};

type LightningStrike = {
  pos: THREE.Vector3;
  warning: THREE.Mesh;
  bolt: THREE.Mesh | null;
  /** Time remaining in warning phase (sec). */
  warnLeft: number;
  /** Time remaining in flash phase (sec). */
  flashLeft: number;
};

export function createLightningSystem(scene: THREE.Object3D): LightningSystem {
  const group = new THREE.Group();
  group.name = "LightningSystem";
  scene.add(group);
  return {
    group,
    strikes: [],
    warningSec: 1.6,
    damageRadius: 6.5,
    damage: 28,
    nextStrikeIn: 8,
    period: 6.5,
  };
}

export function tickLightning(
  sys: LightningSystem,
  terrain: THREE.Mesh,
  playerPos: THREE.Vector3,
  dt: number,
): { damage: number; struckNearPlayer: boolean } {
  let damage = 0;
  let struck = false;

  // Spawn a new telegraph
  sys.nextStrikeIn -= dt;
  if (sys.nextStrikeIn <= 0) {
    sys.nextStrikeIn = sys.period * (0.7 + Math.random() * 0.7);

    // Bias 60% toward near-player, 40% random map
    const nearPlayer = Math.random() < 0.6;
    let x: number, z: number;
    if (nearPlayer) {
      const a = Math.random() * Math.PI * 2;
      const r = 8 + Math.random() * 18;
      x = playerPos.x + Math.cos(a) * r;
      z = playerPos.z + Math.sin(a) * r;
    } else {
      x = (Math.random() - 0.5) * 120;
      z = (Math.random() - 0.5) * 120;
    }
    const y = sampleTerrainY(terrain, x, z);

    const warningGeo = new THREE.RingGeometry(
      sys.damageRadius * 0.85, sys.damageRadius, 28
    );
    const warningMat = new THREE.MeshBasicMaterial({
      color: 0xffee44,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const warning = new THREE.Mesh(warningGeo, warningMat);
    warning.rotation.x = -Math.PI / 2;
    warning.position.set(x, y + 0.05, z);
    sys.group.add(warning);

    sys.strikes.push({
      pos: new THREE.Vector3(x, y, z),
      warning,
      bolt: null,
      warnLeft: sys.warningSec,
      flashLeft: 0,
    });
  }

  // Tick strikes
  for (let i = sys.strikes.length - 1; i >= 0; i--) {
    const s = sys.strikes[i]!;

    if (s.warnLeft > 0) {
      s.warnLeft -= dt;
      // Pulse warning ring
      const t = 1 - s.warnLeft / sys.warningSec;
      const mat = s.warning.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.6 + 0.35 * Math.sin(t * 24);

      if (s.warnLeft <= 0) {
        // Strike! Spawn bolt
        const boltGeo = new THREE.CylinderGeometry(0.18, 0.05, 60, 8);
        const boltMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 1.0,
        });
        const bolt = new THREE.Mesh(boltGeo, boltMat);
        bolt.position.set(s.pos.x, s.pos.y + 30, s.pos.z);
        sys.group.add(bolt);
        s.bolt = bolt;
        s.flashLeft = 0.35;

        // Damage if player in radius
        const d = Math.hypot(playerPos.x - s.pos.x, playerPos.z - s.pos.z);
        if (d <= sys.damageRadius) {
          const falloff = 1 - d / sys.damageRadius;
          damage += sys.damage * falloff;
          struck = true;
        }
      }
    } else {
      s.flashLeft -= dt;
      if (s.bolt) {
        const mat = s.bolt.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, s.flashLeft / 0.35);
      }
      // Fade ring out
      const mat = s.warning.material as THREE.MeshBasicMaterial;
      mat.opacity *= 0.85;

      if (s.flashLeft <= 0) {
        sys.group.remove(s.warning);
        s.warning.geometry.dispose();
        (s.warning.material as THREE.Material).dispose();
        if (s.bolt) {
          sys.group.remove(s.bolt);
          s.bolt.geometry.dispose();
          (s.bolt.material as THREE.Material).dispose();
        }
        sys.strikes.splice(i, 1);
      }
    }
  }

  return { damage, struckNearPlayer: struck };
}

/* ================================================================== */
/*  Quicksand pits — slow + drag down, no dash escape                 */
/* ================================================================== */

export type QuicksandPit = {
  group: THREE.Group;
  x: number;
  z: number;
  radius: number;
};

export function createQuicksandPits(
  terrain: THREE.Mesh,
  scene: THREE.Object3D,
  count: number,
): QuicksandPit[] {
  const pits: QuicksandPit[] = [];
  const root = new THREE.Group();
  root.name = "QuicksandPits";
  scene.add(root);

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 120;
    const z = (Math.random() - 0.5) * 120;
    const r = 4 + Math.random() * 3;
    const y = sampleTerrainY(terrain, x, z);

    const g = new THREE.Group();
    const geo = new THREE.CircleGeometry(r, 32);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x6a5028,
      roughness: 0.95,
      metalness: 0.0,
      emissive: 0x382818,
      emissiveIntensity: 0.3,
    });
    const disc = new THREE.Mesh(geo, mat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(0, 0.04, 0);
    g.add(disc);

    // Inner ring darker
    const innerGeo = new THREE.CircleGeometry(r * 0.55, 24);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x3a2810,
      roughness: 1.0,
      emissive: 0x1a1208,
      emissiveIntensity: 0.4,
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.rotation.x = -Math.PI / 2;
    inner.position.set(0, 0.06, 0);
    g.add(inner);

    g.position.set(x, y, z);
    root.add(g);

    pits.push({ group: g, x, z, radius: r });
  }
  return pits;
}

export function applyQuicksand(
  pits: QuicksandPit[],
  playerPos: THREE.Vector3,
): { speedMult: number; trapped: boolean } {
  for (const p of pits) {
    const d = Math.hypot(playerPos.x - p.x, playerPos.z - p.z);
    if (d <= p.radius) {
      const f = 1 - d / p.radius;
      return { speedMult: 0.30 + (1 - f) * 0.4, trapped: true };
    }
  }
  return { speedMult: 1, trapped: false };
}

/* ================================================================== */
/*  Gravity wells — pull player toward center                          */
/* ================================================================== */

export type GravityWell = {
  group: THREE.Group;
  x: number;
  z: number;
  radius: number;
  strength: number;
};

export function createGravityWells(
  terrain: THREE.Mesh,
  scene: THREE.Object3D,
  count: number,
): GravityWell[] {
  const wells: GravityWell[] = [];
  const root = new THREE.Group();
  root.name = "GravityWells";
  scene.add(root);

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 110;
    const z = (Math.random() - 0.5) * 110;
    const r = 10 + Math.random() * 4;
    const y = sampleTerrainY(terrain, x, z);

    const g = new THREE.Group();

    // Vortex rings
    for (let k = 0; k < 4; k++) {
      const ringGeo = new THREE.TorusGeometry(r * (0.3 + k * 0.22), 0.18, 6, 36);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x300a40,
        emissive: 0x9020c0,
        emissiveIntensity: 1.4 - k * 0.2,
        metalness: 0.5,
        roughness: 0.3,
        transparent: true,
        opacity: 0.85,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.2 + k * 0.05;
      ring.userData.k = k;
      g.add(ring);
    }

    g.position.set(x, y, z);
    root.add(g);

    wells.push({ group: g, x, z, radius: r, strength: 8 });
  }
  return wells;
}

export function tickGravityWells(
  wells: GravityWell[],
  t: number,
): void {
  for (const w of wells) {
    for (const child of w.group.children) {
      const k = child.userData.k as number;
      child.rotation.z = t * (0.6 + k * 0.4) * (k % 2 ? 1 : -1);
    }
  }
}

export function applyGravityWells(
  wells: GravityWell[],
  playerPos: THREE.Vector3,
): { pushVec: THREE.Vector3; trapped: boolean } {
  const push = new THREE.Vector3();
  let trapped = false;
  for (const w of wells) {
    const dx = w.x - playerPos.x;
    const dz = w.z - playerPos.z;
    const d = Math.hypot(dx, dz);
    if (d > 0 && d <= w.radius) {
      const f = 1 - d / w.radius;
      const pull = w.strength * f * f;
      push.x += (dx / d) * pull;
      push.z += (dz / d) * pull;
      if (f > 0.3) trapped = true;
    }
  }
  return { pushVec: push, trapped };
}

/* ================================================================== */
/*  Ice slip zones — momentum carries, low friction                    */
/* ================================================================== */

export type IceSlipZone = {
  group: THREE.Group;
  x: number;
  z: number;
  radius: number;
};

export function createIceSlipZones(
  terrain: THREE.Mesh,
  scene: THREE.Object3D,
  count: number,
): IceSlipZone[] {
  const zones: IceSlipZone[] = [];
  const root = new THREE.Group();
  root.name = "IceSlipZones";
  scene.add(root);

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 120;
    const z = (Math.random() - 0.5) * 120;
    const r = 8 + Math.random() * 5;
    const y = sampleTerrainY(terrain, x, z);

    const geo = new THREE.CircleGeometry(r, 36);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xc8e8ff,
      roughness: 0.12,
      metalness: 0.5,
      emissive: 0x4080a0,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.85,
    });
    const disc = new THREE.Mesh(geo, mat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(x, y + 0.05, z);
    root.add(disc);

    const g = new THREE.Group();
    g.add(disc);
    zones.push({ group: g, x, z, radius: r });
  }
  return zones;
}

export function isOnIce(
  zones: IceSlipZone[],
  playerPos: THREE.Vector3,
): boolean {
  for (const z of zones) {
    if (Math.hypot(playerPos.x - z.x, playerPos.z - z.z) <= z.radius) return true;
  }
  return false;
}

/* ================================================================== */
/*  Wind gusts — periodic pushes from edge of map                      */
/* ================================================================== */

export type WindSystem = {
  /** Current gust direction (unit vec on XZ). */
  dir: THREE.Vector3;
  /** Strength multiplier 0-1 ramping up/down. */
  intensity: number;
  /** Seconds left in current gust. */
  gustLeft: number;
  /** Seconds until next gust. */
  nextGustIn: number;
  /** How long each gust lasts. */
  gustSec: number;
  /** Period between gusts. */
  period: number;
};

export function createWindSystem(): WindSystem {
  return {
    dir: new THREE.Vector3(1, 0, 0),
    intensity: 0,
    gustLeft: 0,
    nextGustIn: 12,
    gustSec: 4.5,
    period: 14,
  };
}

export function tickWind(sys: WindSystem, dt: number): { warn: boolean } {
  let warn = false;
  if (sys.gustLeft > 0) {
    sys.gustLeft -= dt;
    // Triangle ramp: intensity peaks mid-gust
    const t = 1 - Math.abs((sys.gustLeft / sys.gustSec) - 0.5) * 2;
    sys.intensity = Math.max(0, t);
    if (sys.gustLeft <= 0) {
      sys.intensity = 0;
      sys.nextGustIn = sys.period * (0.8 + Math.random() * 0.6);
    }
  } else {
    sys.nextGustIn -= dt;
    if (sys.nextGustIn <= 1.5 && sys.nextGustIn > 1.0) warn = true;
    if (sys.nextGustIn <= 0) {
      const a = Math.random() * Math.PI * 2;
      sys.dir.set(Math.cos(a), 0, Math.sin(a));
      sys.gustLeft = sys.gustSec;
    }
  }
  return { warn };
}

export function applyWind(sys: WindSystem): THREE.Vector3 {
  if (sys.intensity <= 0) return new THREE.Vector3();
  return sys.dir.clone().multiplyScalar(sys.intensity * 4.5);
}

/* ================================================================== */
/*  Mirage cores — fake cores that vanish when approached              */
/* ================================================================== */

export type MirageCore = {
  group: THREE.Group;
  x: number;
  z: number;
  vanished: boolean;
};

export function createMirageCores(
  terrain: THREE.Mesh,
  scene: THREE.Object3D,
  count: number,
): MirageCore[] {
  const out: MirageCore[] = [];
  const root = new THREE.Group();
  root.name = "MirageCores";
  scene.add(root);

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 110;
    const z = (Math.random() - 0.5) * 110;
    const y = sampleTerrainY(terrain, x, z) + 0.95;

    const g = new THREE.Group();
    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.42, 0.95, 14),
      new THREE.MeshStandardMaterial({
        color: 0x0c2030,
        emissive: 0x77d8ff,
        emissiveIntensity: 0.85,
        metalness: 0.42,
        roughness: 0.28,
        transparent: true,
        opacity: 0.7,
      }),
    );
    g.add(shell);
    g.position.set(x, y, z);
    g.scale.setScalar(1.12);
    root.add(g);

    out.push({ group: g, x, z, vanished: false });
  }
  return out;
}

export function tickMirage(
  mirages: MirageCore[],
  playerPos: THREE.Vector3,
  t: number,
): void {
  for (const m of mirages) {
    if (m.vanished) continue;
    // Shimmer
    m.group.position.y += Math.sin(t * 1.8 + m.x * 0.1) * 0.001;
    m.group.rotation.y = t * 0.5;
    const d = Math.hypot(playerPos.x - m.x, playerPos.z - m.z);
    if (d < 5.5) {
      // Vanish
      m.vanished = true;
      m.group.visible = false;
    }
  }
}
