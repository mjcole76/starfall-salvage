/**
 * Mission Mutators — optional challenge toggles that modify gameplay
 * and multiply the final score.
 *
 * Mutators are selected on the title/stats screen and persist in localStorage.
 */

const STORAGE_KEY = "starfall_mutators";

export interface Mutator {
  readonly id: string;
  readonly name: string;
  readonly desc: string;
  readonly scoreMultiplier: number;
}

export const MUTATOR_DEFS: Mutator[] = [
  {
    id: "double_storms",
    name: "Double Storms",
    desc: "Dust storms come twice as often",
    scoreMultiplier: 1.3,
  },
  {
    id: "no_minimap",
    name: "No Minimap",
    desc: "Minimap is hidden",
    scoreMultiplier: 1.25,
  },
  {
    id: "low_gravity",
    name: "Low Gravity",
    desc: "Reduced gravity — float higher, fall slower",
    scoreMultiplier: 1.15,
  },
  {
    id: "glass_cannon",
    name: "Glass Cannon",
    desc: "Start with 50% integrity, but move 20% faster",
    scoreMultiplier: 1.4,
  },
  {
    id: "fog_of_war",
    name: "Fog of War",
    desc: "Dense fog reduces visibility",
    scoreMultiplier: 1.2,
  },
  {
    id: "speed_demon",
    name: "Speed Demon",
    desc: "Storm closes 40% faster",
    scoreMultiplier: 1.35,
  },
];

export type ActiveMutators = Set<string>;

export function loadMutators(): ActiveMutators {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Set();
}

export function saveMutators(active: ActiveMutators): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...active]));
}

export function getMutatorScoreMultiplier(active: ActiveMutators): number {
  let mult = 1;
  for (const def of MUTATOR_DEFS) {
    if (active.has(def.id)) mult *= def.scoreMultiplier;
  }
  return mult;
}

export function isMutatorActive(active: ActiveMutators, id: string): boolean {
  return active.has(id);
}
