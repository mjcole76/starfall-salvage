/**
 * Shared online leaderboard API — Vercel serverless function.
 *
 * GET  /api/scores          → top 50 scores
 * POST /api/scores          → submit a new score
 * GET  /api/scores?daily=1  → today's daily challenge scores only
 *
 * Scores persist in-memory while the function instance is warm.
 * No external database needed — good enough for a contest demo.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

interface OnlineScore {
  name: string;
  score: number;
  grade: string;
  timeSec: number;
  variant: string;
  date: string;
  daily: boolean;
}

// In-memory store — persists between warm invocations
const scores: OnlineScore[] = [];
const MAX_SCORES = 200;

export default function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    const daily = req.query.daily === "1";
    const today = new Date().toISOString().slice(0, 10);

    let filtered = daily
      ? scores.filter((s) => s.daily && s.date === today)
      : scores;

    // Sort by score descending, return top 50
    filtered = [...filtered].sort((a, b) => b.score - a.score).slice(0, 50);

    return res.status(200).json({ scores: filtered });
  }

  if (req.method === "POST") {
    try {
      const { name, score, grade, timeSec, variant, daily } = req.body;

      if (!name || typeof score !== "number" || score < 0) {
        return res.status(400).json({ error: "Invalid score data" });
      }

      // Sanitize name
      const safeName = String(name).slice(0, 20).replace(/[<>&"']/g, "");

      const entry: OnlineScore = {
        name: safeName,
        score: Math.round(score),
        grade: String(grade || "F").slice(0, 2),
        timeSec: Math.round(timeSec || 0),
        variant: String(variant || "unknown").slice(0, 60),
        date: new Date().toISOString().slice(0, 10),
        daily: !!daily,
      };

      scores.push(entry);

      // Trim to max size (keep highest scores)
      if (scores.length > MAX_SCORES) {
        scores.sort((a, b) => b.score - a.score);
        scores.length = MAX_SCORES;
      }

      return res.status(201).json({ ok: true, entry });
    } catch {
      return res.status(400).json({ error: "Invalid request body" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
