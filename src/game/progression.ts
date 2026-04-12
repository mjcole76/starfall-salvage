/**
 * Lifetime progression: tracks campaign completion, endless tier reached,
 * total extractions, and unlocks (achievements, perk points).
 */

const STORAGE_KEY = "starfall_progression_v1";

export type ProgressionState = {
  /** Highest tier (1-12) ever extracted from. */
  highestTierBeaten: number;
  /** True after the player extracts from T12 at least once. */
  campaignComplete: boolean;
  /** Highest endless tier reached (13+). 0 if never played. */
  highestEndlessTier: number;
  /** Total successful extractions. */
  totalExtractions: number;
  /** Total core pickups across all runs. */
  totalCoresCollected: number;
  /** Total unstable detonations (intentional or not). */
  totalUnstableDetonations: number;
  /** Total dashes through hazards. */
  totalDashesUsed: number;
  /** Achievement IDs unlocked. */
  unlockedAchievements: string[];
  /** Perk IDs unlocked (available to slot). */
  unlockedPerks: string[];
};

function defaultState(): ProgressionState {
  return {
    highestTierBeaten: 0,
    campaignComplete: false,
    highestEndlessTier: 0,
    totalExtractions: 0,
    totalCoresCollected: 0,
    totalUnstableDetonations: 0,
    totalDashesUsed: 0,
    unlockedAchievements: [],
    unlockedPerks: ["combo_extender"], // start with one
  };
}

let cache: ProgressionState | null = null;

export function loadProgression(): ProgressionState {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ProgressionState>;
      cache = { ...defaultState(), ...parsed };
      return cache;
    }
  } catch { /* ignore */ }
  cache = defaultState();
  return cache;
}

export function saveProgression(s: ProgressionState): void {
  cache = s;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export function isEndlessUnlocked(): boolean {
  return loadProgression().campaignComplete;
}
