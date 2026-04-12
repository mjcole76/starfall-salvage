/**
 * Pilot class — choose one before mission start.
 * Modifies starting stats and a small bonus to one ability.
 */

export type PilotClassId = "scout" | "tank" | "hacker" | "engineer";

export type PilotClass = {
  readonly id: PilotClassId;
  readonly name: string;
  readonly description: string;
  /** Movement speed multiplier. */
  readonly speedMult: number;
  /** Max integrity bonus (added to base 100). */
  readonly armorBonus: number;
  /** Jet fuel efficiency multiplier (lower = more efficient). */
  readonly jetEffMult: number;
  /** Scanner radius bonus (multiplier). */
  readonly scannerMult: number;
  /** Starting fuel percent override. */
  readonly startingFuelMult: number;
};

export const PILOT_CLASSES: readonly PilotClass[] = [
  {
    id: "scout",
    name: "Scout",
    description: "+25% speed, lighter armor",
    speedMult: 1.25,
    armorBonus: -10,
    jetEffMult: 0.95,
    scannerMult: 1.1,
    startingFuelMult: 1.0,
  },
  {
    id: "tank",
    name: "Tank",
    description: "+50 armor, slower",
    speedMult: 0.92,
    armorBonus: 50,
    jetEffMult: 1.0,
    scannerMult: 0.9,
    startingFuelMult: 1.0,
  },
  {
    id: "hacker",
    name: "Hacker",
    description: "+50% scanner range, fragile",
    speedMult: 1.0,
    armorBonus: -5,
    jetEffMult: 1.0,
    scannerMult: 1.5,
    startingFuelMult: 1.0,
  },
  {
    id: "engineer",
    name: "Engineer",
    description: "+25% fuel cap, efficient jet",
    speedMult: 1.0,
    armorBonus: 0,
    jetEffMult: 0.80,
    scannerMult: 1.0,
    startingFuelMult: 1.25,
  },
];

const STORAGE_KEY = "starfall_pilot_class";

export function loadPilotClass(): PilotClassId {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && PILOT_CLASSES.some((c) => c.id === v)) return v as PilotClassId;
  } catch { /* ignore */ }
  return "scout";
}

export function savePilotClass(id: PilotClassId): void {
  try { localStorage.setItem(STORAGE_KEY, id); } catch { /* ignore */ }
}

export function getPilotClass(id: PilotClassId): PilotClass {
  return PILOT_CLASSES.find((c) => c.id === id) ?? PILOT_CLASSES[0]!;
}
