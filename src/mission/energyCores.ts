import * as THREE from "three";
import { sampleTerrainY } from "./terrainSample";

/* ================================================================== */
/*  Variant types                                                      */
/* ================================================================== */

/** Core pickup variants — each has distinct visuals, score, and behaviour. */
export type CorePickupVariant =
  | "standard"
  | "high_value"
  | "unstable"
  | "phasing"
  | "magnetic";

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
  /** Unstable cores: seconds remaining before detonation (-1 = inactive). */
  unstableTimer: number;
  /** Phasing cores: whether the core is currently tangible. */
  phasingTangible: boolean;
  /** Magnetic cores: remaining seconds of magnet pull after collection. */
  magnetTimer: number;
};

/* ================================================================== */
/*  Score table                                                        */
/* ================================================================== */

export const STANDARD_CORE_SCORE = 500;
export const HIGH_VALUE_CORE_SCORE = 750;
export const UNSTABLE_CORE_SCORE = 1000;
export const PHASING_CORE_SCORE = 650;
export const MAGNETIC_CORE_SCORE = 600;

function scoreForVariant(v: CorePickupVariant): number {
  switch (v) {
    case "standard": return STANDARD_CORE_SCORE;
    case "high_value": return HIGH_VALUE_CORE_SCORE;
    case "unstable": return UNSTABLE_CORE_SCORE;
    case "phasing": return PHASING_CORE_SCORE;
    case "magnetic": return MAGNETIC_CORE_SCORE;
  }
}

/* ================================================================== */
/*  Tuning constants                                                   */
/* ================================================================== */

const COLLECT_RADIUS = 2.4;

/** Unstable core detonation timer in seconds. */
export const UNSTABLE_FUSE_SEC = 18;
/** Damage dealt to player integrity on unstable detonation (at ground zero). */
export const UNSTABLE_BLAST_DAMAGE = 35;
/** Blast radius for unstable core explosion. */
export const UNSTABLE_BLAST_RADIUS = 12;

/** Phasing core: seconds visible, seconds invisible. */
const PHASE_ON_SEC = 2.8;
const PHASE_OFF_SEC = 1.8;

/** Magnetic core: seconds of pull effect after collection. */
export const MAGNETIC_PULL_SEC = 5.0;
/** Magnetic pull radius (world units). */
export const MAGNETIC_PULL_RADIUS = 18;

/* ================================================================== */
/*  Mesh builders                                                      */
/* ================================================================== */

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

/** Pulsing red — unstable core, worth 1000 pts but detonates if not extracted quickly. */
function createUnstableCoreMesh(): THREE.Group {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.46, 1.05, 14),
    new THREE.MeshStandardMaterial({
      color: 0x301010,
      emissive: 0xff2222,
      emissiveIntensity: 1.0,
      metalness: 0.55,
      roughness: 0.22,
    })
  );
  shell.castShadow = true;
  g.add(shell);
  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.26, 0.65, 12),
    new THREE.MeshStandardMaterial({
      color: 0xffaaaa,
      emissive: 0xff4444,
      emissiveIntensity: 1.6,
      metalness: 0.2,
      roughness: 0.15,
    })
  );
  inner.position.y = 0.04;
  g.add(inner);
  // Warning rings
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.52, 0.035, 6, 24),
    new THREE.MeshStandardMaterial({
      color: 0x4a1010,
      emissive: 0xff0000,
      emissiveIntensity: 1.3,
      metalness: 0.6,
      roughness: 0.2,
    })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.0;
  g.add(ring);
  return g;
}

/** Flickering / semi-transparent — phasing core, phases in and out. */
function createPhasingCoreMesh(): THREE.Group {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.40, 0.90, 14),
    new THREE.MeshStandardMaterial({
      color: 0x102030,
      emissive: 0x44ddff,
      emissiveIntensity: 0.75,
      metalness: 0.35,
      roughness: 0.30,
      transparent: true,
      opacity: 0.85,
    })
  );
  shell.castShadow = true;
  g.add(shell);
  const inner = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.28, 1),
    new THREE.MeshStandardMaterial({
      color: 0xccffff,
      emissive: 0x88ffff,
      emissiveIntensity: 1.5,
      metalness: 0.1,
      roughness: 0.15,
      transparent: true,
      opacity: 0.9,
    })
  );
  inner.position.y = 0.0;
  g.add(inner);
  // Phase ring — pulsing torus
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.44, 0.03, 6, 22),
    new THREE.MeshStandardMaterial({
      color: 0x204060,
      emissive: 0x66ccff,
      emissiveIntensity: 1.0,
      metalness: 0.45,
      roughness: 0.25,
      transparent: true,
      opacity: 0.7,
    })
  );
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}

/** White/silver glow — magnetic core, pulls nearby salvage toward player. */
function createMagneticCoreMesh(): THREE.Group {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.42, 0.95, 14),
    new THREE.MeshStandardMaterial({
      color: 0x282830,
      emissive: 0xeeeeff,
      emissiveIntensity: 0.85,
      metalness: 0.65,
      roughness: 0.18,
    })
  );
  shell.castShadow = true;
  g.add(shell);
  const inner = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 10),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xddddff,
      emissiveIntensity: 1.4,
      metalness: 0.3,
      roughness: 0.12,
    })
  );
  g.add(inner);
  // Orbit rings (two perpendicular)
  const orbitMat = new THREE.MeshStandardMaterial({
    color: 0x606080,
    emissive: 0xaaaadd,
    emissiveIntensity: 0.9,
    metalness: 0.5,
    roughness: 0.25,
  });
  const orbit1 = new THREE.Mesh(
    new THREE.TorusGeometry(0.48, 0.025, 6, 28),
    orbitMat
  );
  orbit1.rotation.x = Math.PI / 2;
  g.add(orbit1);
  const orbit2 = new THREE.Mesh(
    new THREE.TorusGeometry(0.48, 0.025, 6, 28),
    orbitMat.clone()
  );
  orbit2.rotation.z = Math.PI / 2;
  g.add(orbit2);
  return g;
}

function meshForVariant(v: CorePickupVariant): THREE.Group {
  switch (v) {
    case "standard": return createStandardCoreMesh();
    case "high_value": return createHighValueCoreMesh();
    case "unstable": return createUnstableCoreMesh();
    case "phasing": return createPhasingCoreMesh();
    case "magnetic": return createMagneticCoreMesh();
  }
}

function nameForVariant(v: CorePickupVariant): string {
  switch (v) {
    case "standard": return "EnergyCore";
    case "high_value": return "UnstableCore";
    case "unstable": return "UnstableFuseCore";
    case "phasing": return "PhasingCore";
    case "magnetic": return "MagneticCore";
  }
}

/* ================================================================== */
/*  Create / collect / tick API                                        */
/* ================================================================== */

export function createEnergyCores(
  terrain: THREE.Mesh,
  scene: THREE.Object3D,
  spawns: readonly CoreSpawn[]
): EnergyCorePickup[] {
  const cores: EnergyCorePickup[] = [];

  for (const s of spawns) {
    const variant: CorePickupVariant = s.variant ?? "standard";
    const pointValue = scoreForVariant(variant);
    const y = sampleTerrainY(terrain, s.x, s.z) + 0.95;
    const group = new THREE.Group();
    group.name = nameForVariant(variant);
    group.add(meshForVariant(variant));
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
      unstableTimer: -1,
      phasingTangible: true,
      magnetTimer: 0,
    });
  }
  return cores;
}

export type CoreCollectResult = {
  readonly picked: number;
  readonly scoreGain: number;
  /** Any unstable cores that just detonated this frame? */
  readonly detonations: THREE.Vector3[];
  /** Is a magnetic pull active from any just-collected magnetic core? */
  readonly magnetActivated: boolean;
};

export function tryCollectEnergyCores(
  cores: EnergyCorePickup[],
  playerPos: THREE.Vector3
): CoreCollectResult {
  let picked = 0;
  let scoreGain = 0;
  const detonations: THREE.Vector3[] = [];
  let magnetActivated = false;

  for (const c of cores) {
    if (c.collected) continue;

    // Phasing cores can only be collected when tangible
    if (c.variant === "phasing" && !c.phasingTangible) continue;

    if (c.center.distanceToSquared(playerPos) <= COLLECT_RADIUS * COLLECT_RADIUS) {
      c.collected = true;
      c.group.visible = false;
      picked += 1;
      scoreGain += c.pointValue;

      if (c.variant === "unstable") {
        // Collecting an unstable core starts the fuse
        c.unstableTimer = UNSTABLE_FUSE_SEC;
      }
      if (c.variant === "magnetic") {
        c.magnetTimer = MAGNETIC_PULL_SEC;
        magnetActivated = true;
      }
    }
  }
  return { picked, scoreGain, detonations, magnetActivated };
}

/**
 * Tick unstable core fuse timers. Returns detonation positions for any that blew up.
 */
export function tickUnstableCores(
  cores: EnergyCorePickup[],
  dt: number,
): THREE.Vector3[] {
  const detonations: THREE.Vector3[] = [];
  for (const c of cores) {
    if (c.variant !== "unstable" || c.unstableTimer <= 0) continue;
    c.unstableTimer -= dt;
    if (c.unstableTimer <= 0) {
      c.unstableTimer = 0;
      detonations.push(c.center.clone());
    }
  }
  return detonations;
}

/**
 * Tick magnetic pull timers. Returns true while any magnet is active.
 */
export function tickMagneticCores(
  cores: EnergyCorePickup[],
  dt: number,
): boolean {
  let anyActive = false;
  for (const c of cores) {
    if (c.variant !== "magnetic" || c.magnetTimer <= 0) continue;
    c.magnetTimer -= dt;
    if (c.magnetTimer < 0) c.magnetTimer = 0;
    if (c.magnetTimer > 0) anyActive = true;
  }
  return anyActive;
}

/**
 * Check if any unstable core is ticking and return worst remaining time.
 * Returns -1 if no fuse is active.
 */
export function getUnstableWarning(cores: EnergyCorePickup[]): number {
  let worst = -1;
  for (const c of cores) {
    if (c.variant === "unstable" && c.unstableTimer > 0) {
      if (worst < 0 || c.unstableTimer < worst) worst = c.unstableTimer;
    }
  }
  return worst;
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
    c.unstableTimer = -1;
    c.phasingTangible = true;
    c.magnetTimer = 0;
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

    // --- Bob + spin per variant ---
    let bob: number;
    let spin: number;

    switch (c.variant) {
      case "high_value":
        bob = Math.sin(t * 1.55 + ph) * 0.12;
        spin = t * 0.72 + ph;
        break;

      case "unstable": {
        // Fast pulsing bob
        const urgency = c.unstableTimer > 0
          ? 1 + (1 - c.unstableTimer / UNSTABLE_FUSE_SEC) * 2
          : 1;
        bob = Math.sin(t * 2.2 * urgency + ph) * 0.15;
        spin = t * 1.1 + ph;
        // Pulsing emissive when fuse is active
        if (c.unstableTimer > 0) {
          const pulse = 0.6 + 0.4 * Math.sin(t * 8 * urgency);
          g.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              const mat = child.material as THREE.MeshStandardMaterial;
              if (mat.emissive) mat.emissiveIntensity = pulse * 1.8;
            }
          });
        }
        break;
      }

      case "phasing": {
        // Phase cycle: visible for PHASE_ON_SEC, invisible for PHASE_OFF_SEC
        const cycle = PHASE_ON_SEC + PHASE_OFF_SEC;
        const phase = (t + ph * 0.5) % cycle;
        const wasVisible = c.phasingTangible;
        c.phasingTangible = phase < PHASE_ON_SEC;

        // Smooth opacity transition
        let opacity: number;
        if (c.phasingTangible) {
          // Fade in during first 0.3s
          opacity = Math.min(1, phase / 0.3);
        } else {
          // Fade out during first 0.3s of off phase
          const offPhase = phase - PHASE_ON_SEC;
          opacity = Math.max(0.08, 1 - offPhase / 0.3);
        }

        g.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const mat = child.material as THREE.MeshStandardMaterial;
            if (mat.transparent) mat.opacity = opacity;
          }
        });

        // Scale pop on re-appearance
        if (c.phasingTangible && !wasVisible) {
          g.scale.setScalar(1.35);
        } else {
          g.scale.lerp(new THREE.Vector3(1.12, 1.12, 1.12), 0.08);
        }

        bob = Math.sin(t * 1.8 + ph) * 0.08;
        spin = t * 0.65 + ph;
        break;
      }

      case "magnetic": {
        bob = Math.sin(t * 1.4 + ph) * 0.10;
        spin = t * 0.55 + ph;
        // Counter-rotate the orbit rings
        const orbit1 = g.children[0]?.children[2];
        const orbit2 = g.children[0]?.children[3];
        if (orbit1) orbit1.rotation.y = t * 1.8;
        if (orbit2) orbit2.rotation.x = t * 1.4 + Math.PI / 4;
        break;
      }

      default: // standard
        bob = Math.sin(t * 1.35 + ph) * 0.1;
        spin = t * 0.55 + ph;
        break;
    }

    g.position.y = baseY + bob;
    g.rotation.y = spin;
  }
}

/** @deprecated use mission `requiredCoreCount` */
export const ENERGY_CORE_TARGET = 3;
