import * as THREE from "three";
import type { CoreSpawn } from "./energyCores";
import type { HazardTuning } from "./hazardConfig";
import type { SalvageKind } from "./salvagePickups";

/** Waypoints on XZ for one patrol drone (looped). */
export type DronePath = { x: number; z: number }[];

/** One radiation field or thermal vent footprint. */
export type HazardSite = {
  readonly x: number;
  readonly z: number;
  readonly radius: number;
};

/** Full static hazard layout for a mission (same map, different sites). */
export type HazardLayout = {
  readonly radiation: readonly HazardSite[];
  readonly heat: readonly HazardSite[];
};

/**
 * Lightweight mission config — same terrain, swapped spawns and rules.
 * Built from resistance tiers (no separate campaign layer).
 */
export type MissionConfig = {
  readonly id: string;
  readonly title: string;
  readonly playerStart: THREE.Vector3;
  /** All cores placed on the map (standard + optional high-value). */
  readonly cores: readonly CoreSpawn[];
  /** Extraction arms when this many cores are collected (may be < cores.length). */
  readonly requiredCoreCount: number;
  readonly extraction: [number, number];
  readonly salvage: { x: number; z: number; kind: SalvageKind }[];
  readonly fuelPickups: { x: number; z: number; amount: number }[];
  readonly repairPickups: { x: number; z: number; amount: number }[];
  readonly stormCenter: [number, number];
  readonly stormStartRadius: number;
  readonly stormEndRadius: number;
  readonly stormTimeLimitSec: number;
  readonly stormPressureExtra: number;
  readonly startingFuelPercent: number;
  readonly jetFuelDrainMult: number;
  readonly extractionArmSec: number;
  readonly extractionHoldSec: number;
  readonly droneCount: 0 | 1 | 2;
  readonly droneSpeed: number;
  readonly hazardLayout: HazardLayout;
  readonly hazardTuning?: Partial<HazardTuning>;
  readonly dronePathsPatrol: [DronePath, DronePath];
  readonly dronePathsAlert: [DronePath, DronePath];
};

/**
 * Documented escalation knobs — each tier changes only a few axes.
 * Expanded into full `MissionConfig` by `buildResistanceTierMissions()`.
 */
export type MissionTierSpec = {
  readonly tier: 1 | 2 | 3 | 4 | 5 | 6;
  readonly title: string;
  /** Lower = faster collapse (storm “speed”). */
  readonly stormTimeLimitSec: number;
  readonly stormStartRadius: number;
  readonly stormEndRadius: number;
  /** Extra wall pressure after all cores collected. */
  readonly stormPressureExtra: number;
  readonly radiationZoneCount: 0 | 1 | 2;
  readonly heatVentZoneCount: 0 | 1;
  readonly droneCount: 0 | 1 | 2;
  readonly droneSpeed: number;
  readonly extractionHoldSec: number;
  readonly extractionArmSec: number;
  readonly optionalSalvageCount: number;
  readonly fuelPickupCount: number;
  readonly repairKitCount: number;
  /** Place high-value salvage near thermal / risk line. */
  readonly greedRareSalvage: boolean;
  readonly startingFuelPercent: number;
  readonly jetFuelDrainMult: number;
  readonly stormCenter: [number, number];
  readonly coreSetIndex: number;
  /** How many core sites spawn (max 6 per layout). */
  readonly coresOnMap: number;
  /** Cores needed to activate extraction. */
  readonly requiredCoreCount: number;
  /** Last placed core in the set becomes unstable high-value (near vent in layouts). */
  readonly highValueCore: boolean;
  readonly extractionKey: "close" | "mid" | "north" | "far";
  readonly hazardTuning?: Partial<HazardTuning>;
};

const P_SLOW: DronePath = [
  { x: -28, z: 6 },
  { x: 4, z: 22 },
  { x: 26, z: -4 },
  { x: -6, z: -22 },
];

const P_A: DronePath = [
  { x: -30, z: 4 },
  { x: 10, z: 26 },
  { x: 34, z: 0 },
  { x: 2, z: -26 },
];

const P_B: DronePath = [
  { x: 22, z: -30 },
  { x: -10, z: -6 },
  { x: -26, z: 16 },
  { x: 14, z: 20 },
];

function alertNearEx(ex: number, ez: number): [DronePath, DronePath] {
  return [
    [
      { x: ex - 8, z: ez - 6 },
      { x: ex + 6, z: ez + 4 },
      { x: ex, z: ez },
    ],
    [
      { x: ex + 6, z: ez - 8 },
      { x: ex - 6, z: ez + 6 },
      { x: ex, z: ez },
    ],
  ];
}

const RAD_A: HazardSite = { x: 18, z: 6, radius: 11 };
const RAD_B: HazardSite = { x: -12, z: -28, radius: 9 };
const HEAT_A: HazardSite = { x: -22, z: -8, radius: 8 };

/** Six sites per row; indices 4–5 sit near thermal vent for high-value placement. */
const CORE_LAYOUTS: readonly { readonly x: number; readonly z: number }[][] = [
  [
    { x: -28, z: 20 },
    { x: 34, z: -14 },
    { x: -10, z: -36 },
    { x: 16, z: -26 },
    { x: -24, z: -11 },
    { x: -19, z: -9 },
  ],
  [
    { x: -22, z: 18 },
    { x: 30, z: -12 },
    { x: -6, z: -38 },
    { x: 20, z: -20 },
    { x: -24, z: -11 },
    { x: -17, z: -8 },
  ],
  [
    { x: -26, z: 16 },
    { x: 28, z: -16 },
    { x: 8, z: -34 },
    { x: 12, z: -18 },
    { x: -24, z: -11 },
    { x: -21, z: -7 },
  ],
  [
    { x: -20, z: 24 },
    { x: 32, z: -22 },
    { x: -8, z: -32 },
    { x: 24, z: 8 },
    { x: -24, z: -11 },
    { x: -18, z: -10 },
  ],
  [
    { x: -30, z: 12 },
    { x: 26, z: -18 },
    { x: -4, z: -40 },
    { x: 18, z: 4 },
    { x: -24, z: -11 },
    { x: -20, z: -8 },
  ],
  [
    { x: -24, z: 22 },
    { x: 30, z: -26 },
    { x: -12, z: -38 },
    { x: 14, z: -22 },
    { x: -24, z: -11 },
    { x: -16, z: -9 },
  ],
];

function coresForSpec(spec: MissionTierSpec): CoreSpawn[] {
  const layout = CORE_LAYOUTS[spec.coreSetIndex % CORE_LAYOUTS.length]!;
  const n = Math.min(spec.coresOnMap, layout.length);
  const out: CoreSpawn[] = [];
  for (let i = 0; i < n; i++) {
    const p = layout[i]!;
    const isHigh =
      spec.highValueCore && i === n - 1 && n >= 3;
    out.push({
      x: p.x,
      z: p.z,
      variant: isHigh ? "high_value" : "standard",
    });
  }
  return out;
}

const EXTRACTIONS: Record<
  MissionTierSpec["extractionKey"],
  [number, number]
> = {
  close: [-36, -32],
  mid: [38, -26],
  north: [-38, 34],
  far: [-44, 40],
};

const PLAYER_FOR_EXTRACTION: Record<
  MissionTierSpec["extractionKey"],
  THREE.Vector3
> = {
  close: new THREE.Vector3(0, 18, 8),
  mid: new THREE.Vector3(-8, 18, 12),
  north: new THREE.Vector3(-6, 18, 10),
  far: new THREE.Vector3(42, 18, 10),
};

const SALVAGE_POOL: { x: number; z: number; kind: SalvageKind }[] = [
  { x: -8, z: 26, kind: "salvage_crate" },
  { x: 20, z: 6, kind: "salvage_crate" },
  { x: -14, z: 14, kind: "drone_cache" },
  { x: 22, z: 12, kind: "crystal_sample" },
  { x: 8, z: -16, kind: "prototype_battery" },
  { x: -30, z: -14, kind: "navigation_core" },
  { x: 26, z: -4, kind: "drone_cache" },
  { x: -4, z: -20, kind: "crystal_sample" },
  { x: 16, z: 24, kind: "salvage_crate" },
];

/** Near thermal vent — “dangerous route” for greed tier. */
const GREED_RARE_SALVAGE = {
  x: -24,
  z: -11,
  kind: "navigation_core" as const,
};

const FUEL_POOL = [
  { x: 14, z: 22, amount: 34 },
  { x: 32, z: 8, amount: 32 },
  { x: -6, z: 26, amount: 30 },
];

const REPAIR_POOL = [
  { x: -20, z: -6, amount: 40 },
  { x: 10, z: 4, amount: 38 },
  { x: -18, z: -24, amount: 36 },
];

function hazardLayoutFromSpec(spec: MissionTierSpec): HazardLayout {
  const radiation: HazardSite[] = [];
  if (spec.radiationZoneCount >= 1) radiation.push(RAD_A);
  if (spec.radiationZoneCount >= 2) radiation.push(RAD_B);
  const heat: HazardSite[] = [];
  if (spec.heatVentZoneCount >= 1) heat.push(HEAT_A);
  return { radiation, heat };
}

function pickSalvage(spec: MissionTierSpec): { x: number; z: number; kind: SalvageKind }[] {
  const n = spec.optionalSalvageCount;
  if (n <= 0) return [];
  const out = SALVAGE_POOL.slice(0, n).map((p) => ({ ...p }));
  if (spec.greedRareSalvage && n > 0) {
    out[n - 1] = { ...GREED_RARE_SALVAGE };
  }
  return out;
}

function pickFuel(count: number) {
  return FUEL_POOL.slice(0, Math.max(0, count));
}

function pickRepair(count: number) {
  return REPAIR_POOL.slice(0, Math.max(0, count));
}

function missionFromTierSpec(spec: MissionTierSpec): MissionConfig {
  const ex = EXTRACTIONS[spec.extractionKey];
  const cores = coresForSpec(spec);
  const requiredCoreCount = Math.min(
    spec.requiredCoreCount,
    cores.length
  );

  const dronePathsPatrol: [DronePath, DronePath] =
    spec.droneCount === 1 ? [P_SLOW, P_B] : [P_A, P_B];

  return {
    id: String(spec.tier),
    title: spec.title,
    playerStart: PLAYER_FOR_EXTRACTION[spec.extractionKey].clone(),
    cores,
    requiredCoreCount,
    extraction: ex,
    salvage: pickSalvage(spec),
    fuelPickups: pickFuel(spec.fuelPickupCount),
    repairPickups: pickRepair(spec.repairKitCount),
    stormCenter: spec.stormCenter,
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
    hazardLayout: hazardLayoutFromSpec(spec),
    hazardTuning: spec.hazardTuning,
    dronePathsPatrol,
    dronePathsAlert: alertNearEx(ex[0], ex[1]),
  };
}

/** Six resistance tiers — increase one or two axes per step. */
const RESISTANCE_TIER_SPECS: readonly MissionTierSpec[] = [
  {
    tier: 1,
    title: "Learn the Zone",
    stormTimeLimitSec: 300,
    stormStartRadius: 108,
    stormEndRadius: 22,
    stormPressureExtra: 0,
    radiationZoneCount: 1,
    heatVentZoneCount: 0,
    droneCount: 0,
    droneSpeed: 0.85,
    extractionHoldSec: 4,
    extractionArmSec: 4,
    optionalSalvageCount: 2,
    fuelPickupCount: 1,
    repairKitCount: 1,
    greedRareSalvage: false,
    startingFuelPercent: 100,
    jetFuelDrainMult: 1,
    stormCenter: [0, 0],
    coreSetIndex: 0,
    coresOnMap: 3,
    requiredCoreCount: 3,
    highValueCore: false,
    extractionKey: "close",
  },
  {
    tier: 2,
    title: "Early Pressure",
    stormTimeLimitSec: 240,
    stormStartRadius: 102,
    stormEndRadius: 16,
    stormPressureExtra: 0,
    radiationZoneCount: 1,
    heatVentZoneCount: 1,
    droneCount: 0,
    droneSpeed: 1,
    extractionHoldSec: 4,
    extractionArmSec: 4,
    optionalSalvageCount: 3,
    fuelPickupCount: 1,
    repairKitCount: 0,
    greedRareSalvage: false,
    startingFuelPercent: 100,
    jetFuelDrainMult: 1,
    stormCenter: [0, 0],
    coreSetIndex: 1,
    coresOnMap: 4,
    requiredCoreCount: 3,
    highValueCore: false,
    extractionKey: "close",
  },
  {
    tier: 3,
    title: "Route Tension",
    stormTimeLimitSec: 240,
    stormStartRadius: 102,
    stormEndRadius: 16,
    stormPressureExtra: 0,
    radiationZoneCount: 1,
    heatVentZoneCount: 1,
    droneCount: 1,
    droneSpeed: 0.82,
    extractionHoldSec: 4,
    extractionArmSec: 4,
    optionalSalvageCount: 4,
    fuelPickupCount: 0,
    repairKitCount: 1,
    greedRareSalvage: false,
    startingFuelPercent: 100,
    jetFuelDrainMult: 1,
    stormCenter: [-2, -2],
    coreSetIndex: 2,
    coresOnMap: 5,
    requiredCoreCount: 3,
    highValueCore: true,
    extractionKey: "mid",
  },
  {
    tier: 4,
    title: "Greed Punishment",
    stormTimeLimitSec: 210,
    stormStartRadius: 100,
    stormEndRadius: 13,
    stormPressureExtra: 0.08,
    radiationZoneCount: 1,
    heatVentZoneCount: 1,
    droneCount: 1,
    droneSpeed: 0.95,
    extractionHoldSec: 4,
    extractionArmSec: 4,
    optionalSalvageCount: 5,
    fuelPickupCount: 1,
    repairKitCount: 0,
    greedRareSalvage: true,
    startingFuelPercent: 100,
    jetFuelDrainMult: 1,
    stormCenter: [0, 0],
    coreSetIndex: 0,
    coresOnMap: 5,
    requiredCoreCount: 4,
    highValueCore: true,
    extractionKey: "close",
  },
  {
    tier: 5,
    title: "Extraction Panic",
    stormTimeLimitSec: 185,
    stormStartRadius: 98,
    stormEndRadius: 10,
    stormPressureExtra: 0.22,
    radiationZoneCount: 1,
    heatVentZoneCount: 1,
    droneCount: 1,
    droneSpeed: 1.02,
    extractionHoldSec: 4.6,
    extractionArmSec: 4,
    optionalSalvageCount: 4,
    fuelPickupCount: 0,
    repairKitCount: 1,
    greedRareSalvage: false,
    startingFuelPercent: 100,
    jetFuelDrainMult: 1,
    stormCenter: [0, 0],
    coreSetIndex: 1,
    coresOnMap: 5,
    requiredCoreCount: 4,
    highValueCore: true,
    extractionKey: "north",
    hazardTuning: {
      stormWallDpsBase: 9.5,
      thermalPulsePeriodSec: 2.5,
      droneIntegrityDpsWhileSpotted: 4.8,
    },
  },
  {
    tier: 6,
    title: "Hard Run",
    stormTimeLimitSec: 155,
    stormStartRadius: 94,
    stormEndRadius: 8,
    stormPressureExtra: 0.26,
    radiationZoneCount: 2,
    heatVentZoneCount: 1,
    droneCount: 2,
    droneSpeed: 1.05,
    extractionHoldSec: 4.2,
    extractionArmSec: 4,
    optionalSalvageCount: 5,
    fuelPickupCount: 1,
    repairKitCount: 0,
    greedRareSalvage: false,
    startingFuelPercent: 88,
    jetFuelDrainMult: 1.08,
    stormCenter: [0, 2],
    coreSetIndex: 2,
    coresOnMap: 6,
    requiredCoreCount: 5,
    highValueCore: true,
    extractionKey: "far",
    hazardTuning: {
      stormWallDpsBase: 10.5,
      thermalPulsePeriodSec: 2.35,
      droneIntegrityDpsWhileSpotted: 5.5,
    },
  },
];

export function buildResistanceTierMissions(): MissionConfig[] {
  return RESISTANCE_TIER_SPECS.map(missionFromTierSpec);
}

/** Published tier table (read-only) for tooling / UI. */
export const MISSION_TIER_SPECS: readonly MissionTierSpec[] =
  RESISTANCE_TIER_SPECS;

export const MISSION_CONFIGS: readonly MissionConfig[] =
  buildResistanceTierMissions();

export function getMissionConfig(index: number): MissionConfig {
  const n = MISSION_CONFIGS.length;
  return MISSION_CONFIGS[((index % n) + n) % n]!;
}

/** @deprecated use MissionConfig */
export type MissionVariant = MissionConfig;

/** @deprecated use getMissionConfig */
export function getVariant(index: number): MissionConfig {
  return getMissionConfig(index);
}
