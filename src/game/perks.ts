import { getEarnedPerkPoints } from "./achievements";

const STORAGE_KEY = "starfall_perks_v1";

export type Perk = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
};

export const PERKS: readonly Perk[] = [
  { id: "combo_extender", name: "Combo Extender", description: "+1 sec combo window." },
  { id: "core_value", name: "Core Value", description: "Cores worth +25%." },
  { id: "dash_recharge", name: "Dash Recharge", description: "Dash recharges 50% faster." },
  { id: "shield_regen", name: "Aegis", description: "Shield auto-regenerates after 20s of no damage." },
  { id: "fuel_overflow", name: "Fuel Overflow", description: "Fuel pickups grant +50% fuel." },
  { id: "salvage_radar", name: "Salvage Radar", description: "All pickups visible on minimap from start." },
  { id: "armor_plate", name: "Armor Plate", description: "+25 max integrity." },
  { id: "swift_boots", name: "Swift Boots", description: "+10% movement speed." },
  { id: "scanner_extend", name: "Scanner Extend", description: "Scanner pulse range +50%." },
  { id: "magnet_aura", name: "Magnet Aura", description: "All pickups slowly drift toward you (8m radius)." },
];

const MAX_ACTIVE_PERKS = 3;

/** Active perk IDs (slotted for current/next run). */
export function loadActivePerks(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch { /* ignore */ }
  return ["combo_extender"];
}

export function saveActivePerks(ids: string[]): void {
  const trimmed = ids.slice(0, MAX_ACTIVE_PERKS);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed)); } catch { /* ignore */ }
}

export function maxActivePerks(): number {
  // 1 free, +1 per 5 achievements, capped at 3
  return Math.min(MAX_ACTIVE_PERKS, 1 + Math.floor(getEarnedPerkPoints() / 5));
}

export function isPerkActive(id: string): boolean {
  return loadActivePerks().includes(id);
}
