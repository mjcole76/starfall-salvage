/**
 * Single tuning blob for the four MVP hazards:
 * Radiation Field, Thermal Vent, Storm Front (edge), Patrol Drone.
 * Missions may override fields via `MissionConfig.hazardTuning`.
 */
export type HazardTuning = {
  /** Radiation Field — integrity / sec while inside. */
  radiationDps: number;
  /** Thermal Vent — seconds between heat bursts. */
  thermalPulsePeriodSec: number;
  /** Thermal Vent — integrity spike if inside when pulse fires. */
  thermalPulseDamage: number;
  /** Seconds before pulse where vent “charges” (visual + warn SFX). */
  thermalWarnBeforePulseSec: number;
  /** Storm Front — base DPS when outside safe radius. */
  stormWallDpsBase: number;
  /** Storm Front — extra DPS per world unit beyond the wall. */
  stormWallDpsPerOverUnit: number;
  /** Patrol Drone — horizontal scan radius (XZ). */
  droneScanRadius: number;
  /** Patrol Drone — jet jam duration after a fresh spot. */
  droneJetJamSec: number;
  /** Patrol Drone — integrity / sec while inside any scan (positional pressure). */
  droneIntegrityDpsWhileSpotted: number;
};

export const DEFAULT_HAZARD_TUNING: HazardTuning = {
  radiationDps: 9,
  thermalPulsePeriodSec: 2.75,
  thermalPulseDamage: 13,
  thermalWarnBeforePulseSec: 0.55,
  stormWallDpsBase: 9,
  stormWallDpsPerOverUnit: 0.42,
  droneScanRadius: 13.5,
  droneJetJamSec: 2.35,
  droneIntegrityDpsWhileSpotted: 4.2,
};

export function mergeHazardTuning(
  partial?: Partial<HazardTuning>
): HazardTuning {
  if (!partial) return { ...DEFAULT_HAZARD_TUNING };
  return { ...DEFAULT_HAZARD_TUNING, ...partial };
}
