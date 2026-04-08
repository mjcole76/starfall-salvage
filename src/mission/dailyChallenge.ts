/**
 * Daily Challenge — one procedural mission per day with a shared seed.
 * Everyone gets the same layout for the day, enabling fair leaderboard comparison.
 */

/**
 * Get a deterministic seed for today's date.
 * Same seed worldwide (uses UTC date).
 */
export function getDailySeed(): number {
  const now = new Date();
  const dateStr = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Get a human-readable label for today's daily challenge.
 */
export function getDailyLabel(): string {
  const now = new Date();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `Daily ${months[now.getUTCMonth()]} ${now.getUTCDate()}`;
}

/**
 * Check if a leaderboard entry's date matches today.
 */
export function isToday(dateStr: string): boolean {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  return dateStr === today;
}
