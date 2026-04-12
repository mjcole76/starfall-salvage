import { loadProgression, saveProgression } from "./progression";

export type Achievement = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Awards N perk points when unlocked. Default 1. */
  readonly perkPoints?: number;
};

export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: "first_extract", name: "First Light", description: "Complete your first extraction." },
  { id: "tier_3_done", name: "Veteran", description: "Beat Tier 3." },
  { id: "tier_6_done", name: "Voidwalker", description: "Beat Tier 6." },
  { id: "tier_9_done", name: "Stormrider", description: "Beat Tier 9." },
  { id: "tier_12_done", name: "Singularity Survivor", description: "Beat Tier 12 and complete the campaign.", perkPoints: 3 },
  { id: "endless_5", name: "Endless: +5", description: "Reach endless tier 17.", perkPoints: 2 },
  { id: "endless_10", name: "Endless: +10", description: "Reach endless tier 22.", perkPoints: 3 },
  { id: "no_damage_run", name: "Untouched", description: "Extract without taking damage." },
  { id: "speedrun_sub_60", name: "Quickdraw", description: "Extract in under 60 seconds." },
  { id: "all_core_types", name: "Collector", description: "Collect all 5 core types in one run." },
  { id: "max_combo", name: "Chain Reaction", description: "Reach a 4x combo multiplier." },
  { id: "ten_extracts", name: "Repeat Customer", description: "Complete 10 extractions." },
  { id: "fifty_cores", name: "Core Hoarder", description: "Collect 50 cores total." },
  { id: "boss_killed", name: "Big Game Hunter", description: "Defeat a tier boss." },
  { id: "all_pilots", name: "Crew Roster", description: "Extract with each of the 4 pilot classes." },
];

/** Try to unlock an achievement by id. Returns true if newly unlocked. */
export function unlockAchievement(id: string): boolean {
  const ach = ACHIEVEMENTS.find((a) => a.id === id);
  if (!ach) return false;
  const state = loadProgression();
  if (state.unlockedAchievements.includes(id)) return false;
  state.unlockedAchievements.push(id);
  // Award a perk slot (use achievement count as the unlock token if perkPoints unset)
  const points = ach.perkPoints ?? 1;
  for (let i = 0; i < points; i++) {
    // No-op here — perk slots are checked dynamically against achievement count
  }
  saveProgression(state);
  return true;
}

export function achievementName(id: string): string {
  return ACHIEVEMENTS.find((a) => a.id === id)?.name ?? id;
}

/** Total earned perk points (1 per achievement, +bonus for big ones). */
export function getEarnedPerkPoints(): number {
  const state = loadProgression();
  let total = 0;
  for (const id of state.unlockedAchievements) {
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    total += a?.perkPoints ?? 1;
  }
  return total;
}

/** Count of unlocked achievements. */
export function unlockedCount(): number {
  return loadProgression().unlockedAchievements.length;
}
