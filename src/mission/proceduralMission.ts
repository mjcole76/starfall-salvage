import * as THREE from "three";
import type {
  MissionConfig,
  DronePath,
  HazardSite,
  HazardLayout,
} from "./missionVariants";
import { MISSION_TIER_SPECS } from "./missionVariants";
import type { CoreSpawn } from "./energyCores";
import type { SalvageKind } from "./salvagePickups";

/* ================================================================== */
/*  Seeded PRNG  (simple LCG — good enough for layout variation)      */
/* ================================================================== */

class SeededRandom {
  private state: number;

  constructor(seed: number) {
    // Ensure non-zero positive integer state
    this.state = (Math.abs(Math.round(seed)) || 1) & 0x7fffffff;
  }

  /** Returns a float in [0, 1). */
  next(): number {
    // LCG parameters from Numerical Recipes
    this.state = (this.state * 1664525 + 1013904223) & 0x7fffffff;
    return this.state / 0x80000000;
  }

  /** Float in [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** Pick one element from an array. */
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)]!;
  }

  /** Shuffle an array in-place (Fisher-Yates). */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr;
  }
}

/* ================================================================== */
/*  Terrain / layout constants                                        */
/* ================================================================== */

/** Playable terrain bounds (positions clamped to this range). */
const BOUND = 72; // slightly inside the -80..80 falloff zone
const MIN_CORE_DIST = 15;
const MIN_EXTRACTION_DIST = 30;
const MIN_ITEM_DIST = 8;

/* ================================================================== */
/*  Position generation helpers                                       */
/* ================================================================== */

function randomXZ(rng: SeededRandom): [number, number] {
  return [rng.range(-BOUND, BOUND), rng.range(-BOUND, BOUND)];
}

function dist2D(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

/** Try to place a point that is at least `minDist` away from all existing points. */
function placeAway(
  rng: SeededRandom,
  existing: { x: number; z: number }[],
  minDist: number,
  maxAttempts = 80,
): { x: number; z: number } {
  for (let i = 0; i < maxAttempts; i++) {
    const [x, z] = randomXZ(rng);
    if (existing.every((p) => dist2D(x, z, p.x, p.z) >= minDist)) {
      return { x, z };
    }
  }
  // Fallback: return last attempt regardless of distance
  const [x, z] = randomXZ(rng);
  return { x, z };
}

/* ================================================================== */
/*  Core placement                                                    */
/* ================================================================== */

function generateCores(
  rng: SeededRandom,
  count: number,
  hasHighValue: boolean,
): CoreSpawn[] {
  const placed: { x: number; z: number }[] = [];
  const cores: CoreSpawn[] = [];

  for (let i = 0; i < count; i++) {
    const pos = placeAway(rng, placed, MIN_CORE_DIST);
    placed.push(pos);
    const isHigh = hasHighValue && i === count - 1 && count >= 3;
    cores.push({
      x: Math.round(pos.x),
      z: Math.round(pos.z),
      variant: isHigh ? "high_value" : "standard",
    });
  }
  return cores;
}

/* ================================================================== */
/*  Salvage                                                           */
/* ================================================================== */

const SALVAGE_KINDS: SalvageKind[] = [
  "salvage_crate",
  "drone_cache",
  "crystal_sample",
  "prototype_battery",
  "navigation_core",
];

function generateSalvage(
  rng: SeededRandom,
  count: number,
  occupied: { x: number; z: number }[],
  greedRare: boolean,
): { x: number; z: number; kind: SalvageKind }[] {
  const out: { x: number; z: number; kind: SalvageKind }[] = [];
  const all = [...occupied];

  for (let i = 0; i < count; i++) {
    const pos = placeAway(rng, all, MIN_ITEM_DIST);
    all.push(pos);

    let kind: SalvageKind;
    if (greedRare && i === count - 1) {
      kind = "navigation_core";
    } else {
      kind = rng.pick(SALVAGE_KINDS);
    }
    out.push({ x: Math.round(pos.x), z: Math.round(pos.z), kind });
  }
  return out;
}

/* ================================================================== */
/*  Fuel / Repair pickups                                             */
/* ================================================================== */

function generatePickups(
  rng: SeededRandom,
  count: number,
  baseAmount: number,
  occupied: { x: number; z: number }[],
): { x: number; z: number; amount: number }[] {
  const out: { x: number; z: number; amount: number }[] = [];
  const all = [...occupied];

  for (let i = 0; i < count; i++) {
    const pos = placeAway(rng, all, MIN_ITEM_DIST);
    all.push(pos);
    const amount = Math.round(baseAmount + rng.range(-4, 4));
    out.push({ x: Math.round(pos.x), z: Math.round(pos.z), amount });
  }
  return out;
}

/* ================================================================== */
/*  Hazard zones                                                      */
/* ================================================================== */

function generateHazards(
  rng: SeededRandom,
  radCount: number,
  heatCount: number,
  occupied: { x: number; z: number }[],
): HazardLayout {
  const all = [...occupied];
  const radiation: HazardSite[] = [];
  const heat: HazardSite[] = [];

  for (let i = 0; i < radCount; i++) {
    const pos = placeAway(rng, all, 12);
    all.push(pos);
    radiation.push({
      x: Math.round(pos.x),
      z: Math.round(pos.z),
      radius: Math.round(rng.range(8, 12)),
    });
  }

  for (let i = 0; i < heatCount; i++) {
    const pos = placeAway(rng, all, 12);
    all.push(pos);
    heat.push({
      x: Math.round(pos.x),
      z: Math.round(pos.z),
      radius: Math.round(rng.range(7, 10)),
    });
  }

  return { radiation, heat };
}

/* ================================================================== */
/*  Drone patrol paths                                                */
/* ================================================================== */

/** Generate a loop of 4 waypoints around the play area. */
function generatePatrolPath(rng: SeededRandom): DronePath {
  // Four quadrants, one waypoint each, then connect as loop
  const quadrants: [number, number, number, number][] = [
    [-BOUND, 0, 0, BOUND], // top-left
    [0, BOUND, 0, BOUND], // top-right
    [0, BOUND, -BOUND, 0], // bottom-right
    [-BOUND, 0, -BOUND, 0], // bottom-left
  ];
  return quadrants.map(([xMin, xMax, zMin, zMax]) => ({
    x: Math.round(rng.range(xMin * 0.5, xMax * 0.5)),
    z: Math.round(rng.range(zMin * 0.5, zMax * 0.5)),
  }));
}

/** Generate alert paths that converge near the extraction point. */
function generateAlertPaths(
  rng: SeededRandom,
  ex: number,
  ez: number,
): [DronePath, DronePath] {
  const makeOne = (): DronePath => [
    {
      x: Math.round(ex + rng.range(-10, -4)),
      z: Math.round(ez + rng.range(-8, -2)),
    },
    {
      x: Math.round(ex + rng.range(4, 10)),
      z: Math.round(ez + rng.range(2, 8)),
    },
    { x: Math.round(ex), z: Math.round(ez) },
  ];
  return [makeOne(), makeOne()];
}

/* ================================================================== */
/*  Extraction placement                                              */
/* ================================================================== */

function generateExtraction(
  rng: SeededRandom,
  playerX: number,
  playerZ: number,
): [number, number] {
  for (let i = 0; i < 100; i++) {
    const [x, z] = randomXZ(rng);
    if (dist2D(x, z, playerX, playerZ) >= MIN_EXTRACTION_DIST) {
      return [Math.round(x), Math.round(z)];
    }
  }
  // Fallback: far corner
  const fx = playerX > 0 ? -BOUND + 8 : BOUND - 8;
  const fz = playerZ > 0 ? -BOUND + 8 : BOUND - 8;
  return [Math.round(fx), Math.round(fz)];
}

/* ================================================================== */
/*  Player start                                                      */
/* ================================================================== */

function generatePlayerStart(rng: SeededRandom): THREE.Vector3 {
  const x = rng.range(-40, 40);
  const z = rng.range(-20, 40);
  return new THREE.Vector3(Math.round(x), 18, Math.round(z));
}

/* ================================================================== */
/*  Main entry point                                                  */
/* ================================================================== */

/**
 * Generate a randomised mission config based on a difficulty tier (1-6)
 * and an optional seed for reproducibility.
 */
export function generateProceduralMission(
  tier: number,
  seed?: number,
): MissionConfig {
  const clampedTier = Math.max(1, Math.min(6, Math.round(tier)));
  const spec = MISSION_TIER_SPECS[clampedTier - 1]!;

  const actualSeed = seed ?? Math.floor(Math.random() * 0x7fffffff);
  const rng = new SeededRandom(actualSeed);

  // -- Player start
  const playerStart = generatePlayerStart(rng);

  // -- Extraction (must be far from player)
  const extraction = generateExtraction(
    rng,
    playerStart.x,
    playerStart.z,
  );

  // -- Cores
  const cores = generateCores(rng, spec.coresOnMap, spec.highValueCore);

  // Collect occupied positions for spacing subsequent items
  const occupied: { x: number; z: number }[] = [
    { x: playerStart.x, z: playerStart.z },
    { x: extraction[0], z: extraction[1] },
    ...cores,
  ];

  // -- Salvage
  const salvage = generateSalvage(
    rng,
    spec.optionalSalvageCount,
    occupied,
    spec.greedRareSalvage,
  );
  occupied.push(...salvage);

  // -- Fuel
  const fuelPickups = generatePickups(
    rng,
    spec.fuelPickupCount,
    32,
    occupied,
  );
  occupied.push(...fuelPickups);

  // -- Repair
  const repairPickups = generatePickups(
    rng,
    spec.repairKitCount,
    38,
    occupied,
  );
  occupied.push(...repairPickups);

  // -- Hazard zones
  const hazardLayout = generateHazards(
    rng,
    spec.radiationZoneCount,
    spec.heatVentZoneCount,
    occupied,
  );

  // -- Storm center (slight random offset from origin)
  const stormCenter: [number, number] = [
    Math.round(spec.stormCenter[0] + rng.range(-4, 4)),
    Math.round(spec.stormCenter[1] + rng.range(-4, 4)),
  ];

  // -- Drone paths
  const dronePathsPatrol: [DronePath, DronePath] = [
    generatePatrolPath(rng),
    generatePatrolPath(rng),
  ];
  const dronePathsAlert = generateAlertPaths(
    rng,
    extraction[0],
    extraction[1],
  );

  const requiredCoreCount = Math.min(spec.requiredCoreCount, cores.length);

  return {
    id: `proc-t${clampedTier}-${actualSeed}`,
    title: `${spec.title} (Procedural)`,
    playerStart,
    cores,
    requiredCoreCount,
    extraction,
    salvage,
    fuelPickups,
    repairPickups,
    stormCenter,
    stormStartRadius: spec.stormStartRadius,
    stormEndRadius: spec.stormEndRadius,
    stormTimeLimitSec: spec.stormTimeLimitSec,
    stormPressureExtra: spec.stormPressureExtra,
    startingFuelPercent: spec.startingFuelPercent,
    jetFuelDrainMult: spec.jetFuelDrainMult,
    extractionArmSec: spec.extractionArmSec,
    extractionHoldSec: spec.extractionHoldSec,
    droneCount: spec.droneCount,
    droneSpeed: spec.droneSpeed,
    hazardLayout,
    hazardTuning: spec.hazardTuning,
    dronePathsPatrol,
    dronePathsAlert,
  };
}
