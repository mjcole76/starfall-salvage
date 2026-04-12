import { generateProceduralMission } from "./proceduralMission";
import type { MissionConfig } from "./missionVariants";

/**
 * Endless missions are tier-12 procedural missions with stacking modifiers.
 * `endlessLevel` starts at 1 (= tier 13 effectively) and increments per extract.
 */
export function generateEndlessMission(
  endlessLevel: number,
  seed?: number,
): MissionConfig {
  const base = generateProceduralMission(12, seed);
  const lvl = Math.max(1, endlessLevel);

  // Stacking modifiers — each level past 12 makes things harder
  const stormFasterFactor = Math.max(0.45, 1 - lvl * 0.04);
  const fuelDrainFactor = 1 + lvl * 0.04;
  const startFuelFactor = Math.max(0.45, 1 - lvl * 0.025);
  const droneSpeedBonus = 1 + lvl * 0.025;

  // Mutate (cheap shallow copy + override numbers)
  return {
    ...base,
    id: `endless-${lvl}`,
    title: `ENDLESS +${lvl}`,
    stormTimeLimitSec: Math.max(60, base.stormTimeLimitSec * stormFasterFactor),
    stormPressureExtra: base.stormPressureExtra + lvl * 0.04,
    jetFuelDrainMult: base.jetFuelDrainMult * fuelDrainFactor,
    startingFuelPercent: Math.round(base.startingFuelPercent * startFuelFactor),
    droneSpeed: base.droneSpeed * droneSpeedBonus,
    extractionHoldSec: base.extractionHoldSec + Math.min(2.5, lvl * 0.15),
  };
}
