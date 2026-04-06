/**
 * Local high-score leaderboard backed by localStorage.
 * Stores top 10 scores per mission variant.
 */

const STORAGE_KEY = "starfall_scores";

export type ScoreEntry = {
  score: number;
  grade: string;
  timeSec: number;
  variant: string;
  date: string;
};

/* ---- persistence helpers ---- */

function loadAll(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ScoreEntry[]) : [];
  } catch {
    return [];
  }
}

function saveAll(entries: ScoreEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function gradeColor(g: string): string {
  switch (g) {
    case "S": return "#4ad8a0";
    case "A": return "#4ad8a0";
    case "B": return "#e8e0d8";
    case "C": return "#9a9288";
    case "D": return "#c45a2e";
    default:  return "#a84830";
  }
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */

export class Leaderboard {
  private root: HTMLDivElement;
  private visible = false;
  private style: HTMLStyleElement;

  constructor(container: HTMLElement) {
    this.style = document.createElement("style");
    this.style.textContent = `
      @keyframes lb-fadein { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    `;
    document.head.appendChild(this.style);

    this.root = document.createElement("div");
    Object.assign(this.root.style, {
      position: "fixed",
      inset: "0",
      zIndex: "960",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(8,6,5,0.88)",
      fontFamily: "system-ui, sans-serif",
      userSelect: "none",
      opacity: "0",
      transition: "opacity 0.35s ease",
      pointerEvents: "none",
    } as CSSStyleDeclaration);

    container.appendChild(this.root);
  }

  /* ---- public ---- */

  addScore(entry: ScoreEntry): number {
    const all = loadAll();
    // get scores for this variant
    const variantScores = all.filter((e) => e.variant === entry.variant);
    // determine rank
    let rank = variantScores.findIndex((e) => entry.score > e.score);
    if (rank === -1) rank = variantScores.length;

    if (rank >= 10) return -1;

    // insert globally, maintaining per-variant ordering
    all.push(entry);
    // re-sort: group by variant, sort by score desc
    all.sort((a, b) => {
      if (a.variant !== b.variant) return a.variant.localeCompare(b.variant);
      return b.score - a.score;
    });

    // trim to 10 per variant
    const trimmed: ScoreEntry[] = [];
    const counts: Record<string, number> = {};
    for (const e of all) {
      counts[e.variant] = (counts[e.variant] || 0) + 1;
      if (counts[e.variant] <= 10) trimmed.push(e);
    }

    saveAll(trimmed);
    return rank + 1; // 1-based
  }

  show(variant?: string): void {
    this.root.innerHTML = "";
    this.visible = true;

    const monoFont = 'ui-monospace, "Cascadia Mono", monospace';

    const panel = document.createElement("div");
    Object.assign(panel.style, {
      background: "rgba(8,6,5,0.94)",
      border: "1px solid rgba(74,216,160,0.2)",
      borderRadius: "12px",
      padding: "1.6rem 2rem",
      minWidth: "320px",
      maxWidth: "440px",
      width: "90vw",
      animation: "lb-fadein 0.4s ease both",
    } as CSSStyleDeclaration);

    // header
    const header = document.createElement("div");
    header.textContent = "HIGH SCORES";
    Object.assign(header.style, {
      fontSize: "1rem",
      fontWeight: "700",
      letterSpacing: "0.16em",
      textAlign: "center",
      color: "#4ad8a0",
      marginBottom: "1rem",
    } as CSSStyleDeclaration);
    panel.appendChild(header);

    if (variant) {
      const vLabel = document.createElement("div");
      vLabel.textContent = variant;
      Object.assign(vLabel.style, {
        fontSize: "0.75rem",
        letterSpacing: "0.1em",
        textAlign: "center",
        color: "#9a9288",
        marginBottom: "0.8rem",
        textTransform: "uppercase",
      } as CSSStyleDeclaration);
      panel.appendChild(vLabel);
    }

    const scores = this.getTopScores(variant, 10);

    if (scores.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "No scores yet";
      Object.assign(empty.style, {
        textAlign: "center",
        color: "#9a9288",
        fontSize: "0.85rem",
        padding: "1.5rem 0",
      } as CSSStyleDeclaration);
      panel.appendChild(empty);
    } else {
      // column headers
      const colHead = document.createElement("div");
      Object.assign(colHead.style, {
        display: "grid",
        gridTemplateColumns: "2rem 1fr 2.5rem 3.5rem",
        gap: "0.5rem",
        padding: "0.3rem 0",
        borderBottom: "1px solid rgba(154,146,136,0.2)",
        marginBottom: "0.3rem",
      } as CSSStyleDeclaration);

      for (const t of ["#", "Score", "Grd", "Time"]) {
        const h = document.createElement("span");
        h.textContent = t;
        Object.assign(h.style, {
          fontSize: "0.7rem",
          fontWeight: "600",
          color: "#9a9288",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        } as CSSStyleDeclaration);
        colHead.appendChild(h);
      }
      panel.appendChild(colHead);

      scores.forEach((entry, i) => {
        const row = document.createElement("div");
        Object.assign(row.style, {
          display: "grid",
          gridTemplateColumns: "2rem 1fr 2.5rem 3.5rem",
          gap: "0.5rem",
          padding: "0.3rem 0",
          borderBottom: "1px solid rgba(154,146,136,0.08)",
          animation: "lb-fadein 0.3s ease both",
          animationDelay: `${i * 0.05}s`,
        } as CSSStyleDeclaration);

        const rank = document.createElement("span");
        rank.textContent = `${i + 1}`;
        Object.assign(rank.style, { fontFamily: monoFont, fontSize: "0.85rem", color: "#9a9288" } as CSSStyleDeclaration);

        const score = document.createElement("span");
        score.textContent = entry.score.toLocaleString();
        Object.assign(score.style, { fontFamily: monoFont, fontSize: "0.85rem", fontWeight: "600", color: "#e8e0d8" } as CSSStyleDeclaration);

        const grade = document.createElement("span");
        grade.textContent = entry.grade;
        Object.assign(grade.style, { fontFamily: monoFont, fontSize: "0.85rem", fontWeight: "700", color: gradeColor(entry.grade) } as CSSStyleDeclaration);

        const time = document.createElement("span");
        time.textContent = fmtTime(entry.timeSec);
        Object.assign(time.style, { fontFamily: monoFont, fontSize: "0.85rem", color: "#9a9288" } as CSSStyleDeclaration);

        row.append(rank, score, grade, time);
        panel.appendChild(row);
      });
    }

    // close hint
    const hint = document.createElement("div");
    hint.textContent = "ESC to close";
    Object.assign(hint.style, {
      textAlign: "center",
      fontSize: "0.72rem",
      fontFamily: monoFont,
      color: "#9a9288",
      marginTop: "1rem",
      opacity: "0.6",
    } as CSSStyleDeclaration);
    panel.appendChild(hint);

    this.root.appendChild(panel);

    this.root.style.pointerEvents = "auto";
    void this.root.offsetHeight;
    this.root.style.opacity = "1";

    // ESC listener
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        window.removeEventListener("keydown", onKey);
        this.hide();
      }
    };
    window.addEventListener("keydown", onKey);
  }

  hide(): void {
    this.visible = false;
    this.root.style.opacity = "0";
    this.root.style.pointerEvents = "none";
  }

  getTopScores(variant?: string, limit = 10): ScoreEntry[] {
    let entries = loadAll();
    if (variant) entries = entries.filter((e) => e.variant === variant);
    // sort desc
    entries.sort((a, b) => b.score - a.score);
    return entries.slice(0, limit);
  }

  isVisible(): boolean {
    return this.visible;
  }
}
