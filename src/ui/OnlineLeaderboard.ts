/**
 * OnlineLeaderboard — fetches and displays shared scores from the API.
 * Shown alongside the existing local leaderboard.
 */

const API_URL = "/api/scores";
const LS_NAME_KEY = "starfall_player_name";

interface OnlineScore {
  name: string;
  score: number;
  grade: string;
  timeSec: number;
  variant: string;
  date: string;
  daily: boolean;
}

export class OnlineLeaderboard {
  private root: HTMLDivElement;
  private listEl: HTMLDivElement;
  private visible = false;
  private tab: "global" | "daily" = "global";

  constructor(container: HTMLElement) {
    this.root = document.createElement("div");
    Object.assign(this.root.style, {
      position: "fixed",
      inset: "0",
      zIndex: "955",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(8,6,5,0.9)",
      fontFamily: 'ui-monospace, "Cascadia Mono", monospace',
      userSelect: "none",
      opacity: "0",
      transition: "opacity 0.3s ease",
      pointerEvents: "none",
    });
    container.appendChild(this.root);

    this.listEl = document.createElement("div");

    window.addEventListener("keydown", (e) => {
      if (!this.visible) return;
      if (e.code === "Escape" || e.code === "KeyL") {
        this.hide();
        e.stopPropagation();
      }
    });
  }

  async show(daily = false): Promise<void> {
    this.tab = daily ? "daily" : "global";
    this.visible = true;
    this.root.style.pointerEvents = "auto";
    this.buildUI([]);
    void this.root.offsetHeight;
    this.root.style.opacity = "1";

    // Fetch scores
    try {
      const url = daily ? `${API_URL}?daily=1` : API_URL;
      const res = await fetch(url);
      const data = await res.json();
      this.buildUI(data.scores || []);
    } catch {
      this.buildUI([], "Could not load scores");
    }
  }

  hide(): void {
    this.visible = false;
    this.root.style.opacity = "0";
    this.root.style.pointerEvents = "none";
  }

  isVisible(): boolean { return this.visible; }

  /** Submit a score to the online leaderboard. */
  static async submitScore(
    score: number,
    grade: string,
    timeSec: number,
    variant: string,
    daily: boolean,
  ): Promise<void> {
    const name = OnlineLeaderboard.getPlayerName();
    if (!name) return;

    try {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, score, grade, timeSec, variant, daily }),
      });
    } catch {
      // Silently fail — local leaderboard still works
    }
  }

  static getPlayerName(): string {
    return localStorage.getItem(LS_NAME_KEY) || "";
  }

  static setPlayerName(name: string): void {
    localStorage.setItem(LS_NAME_KEY, name.slice(0, 20));
  }

  static hasPlayerName(): boolean {
    return !!localStorage.getItem(LS_NAME_KEY);
  }

  private buildUI(scores: OnlineScore[], error?: string): void {
    this.root.innerHTML = "";

    const panel = document.createElement("div");
    Object.assign(panel.style, {
      background: "rgba(8,6,5,0.94)",
      border: "1px solid rgba(74,216,160,0.25)",
      borderRadius: "10px",
      padding: "20px 24px",
      width: "420px",
      maxHeight: "80vh",
      overflowY: "auto",
    });

    // Title
    const title = document.createElement("div");
    Object.assign(title.style, {
      fontSize: "15px",
      fontWeight: "700",
      color: "#4ad8a0",
      textAlign: "center",
      marginBottom: "4px",
      letterSpacing: "1.5px",
    });
    title.textContent = this.tab === "daily" ? "DAILY LEADERBOARD" : "GLOBAL LEADERBOARD";
    panel.appendChild(title);

    const subtitle = document.createElement("div");
    Object.assign(subtitle.style, {
      fontSize: "10px",
      color: "#6a6460",
      textAlign: "center",
      marginBottom: "14px",
    });
    subtitle.textContent = "Shared scores from all players";
    panel.appendChild(subtitle);

    // Tab buttons
    const tabs = document.createElement("div");
    Object.assign(tabs.style, {
      display: "flex",
      gap: "6px",
      justifyContent: "center",
      marginBottom: "12px",
    });
    for (const t of ["global", "daily"] as const) {
      const btn = document.createElement("button");
      btn.textContent = t === "global" ? "All Time" : "Today";
      Object.assign(btn.style, {
        padding: "4px 14px",
        border: `1px solid ${this.tab === t ? "rgba(74,216,160,0.5)" : "rgba(255,255,255,0.1)"}`,
        borderRadius: "4px",
        background: this.tab === t ? "rgba(74,216,160,0.15)" : "transparent",
        color: this.tab === t ? "#4ad8a0" : "#888",
        cursor: "pointer",
        fontSize: "11px",
        fontFamily: "inherit",
      });
      btn.addEventListener("click", () => this.show(t === "daily"));
      tabs.appendChild(btn);
    }
    panel.appendChild(tabs);

    if (error) {
      const errEl = document.createElement("div");
      Object.assign(errEl.style, {
        textAlign: "center",
        color: "#a84830",
        fontSize: "11px",
        padding: "20px 0",
      });
      errEl.textContent = error;
      panel.appendChild(errEl);
    } else if (scores.length === 0) {
      const empty = document.createElement("div");
      Object.assign(empty.style, {
        textAlign: "center",
        color: "#6a6460",
        fontSize: "11px",
        padding: "20px 0",
      });
      empty.textContent = "No scores yet — be the first!";
      panel.appendChild(empty);
    } else {
      // Header row
      const header = document.createElement("div");
      Object.assign(header.style, {
        display: "grid",
        gridTemplateColumns: "28px 1fr 60px 40px",
        gap: "6px",
        padding: "4px 6px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        fontSize: "9px",
        color: "#6a6460",
        letterSpacing: "0.08em",
      });
      header.innerHTML = "<span>#</span><span>PILOT</span><span>SCORE</span><span>GRADE</span>";
      panel.appendChild(header);

      const myName = OnlineLeaderboard.getPlayerName();

      for (let i = 0; i < scores.length; i++) {
        const s = scores[i];
        const isMe = s.name === myName;
        const row = document.createElement("div");
        Object.assign(row.style, {
          display: "grid",
          gridTemplateColumns: "28px 1fr 60px 40px",
          gap: "6px",
          padding: "5px 6px",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          fontSize: "11px",
          color: isMe ? "#4ad8a0" : "#c8c0b8",
          background: isMe ? "rgba(74,216,160,0.06)" : "transparent",
          borderRadius: "3px",
        });

        const rank = document.createElement("span");
        rank.textContent = `${i + 1}`;
        rank.style.color = i < 3 ? "#ffaa33" : "#6a6460";

        const name = document.createElement("span");
        name.textContent = s.name + (isMe ? " (you)" : "");
        name.style.overflow = "hidden";
        name.style.textOverflow = "ellipsis";

        const score = document.createElement("span");
        score.textContent = s.score.toLocaleString();
        score.style.textAlign = "right";
        score.style.fontWeight = "600";

        const grade = document.createElement("span");
        grade.textContent = s.grade;
        grade.style.textAlign = "center";
        grade.style.fontWeight = "700";
        grade.style.color = s.grade === "S" || s.grade === "A" ? "#4ad8a0" : "#9a9288";

        row.appendChild(rank);
        row.appendChild(name);
        row.appendChild(score);
        row.appendChild(grade);
        panel.appendChild(row);
      }
    }

    // Close hint
    const hint = document.createElement("div");
    Object.assign(hint.style, {
      textAlign: "center",
      fontSize: "10px",
      color: "#6a6460",
      marginTop: "12px",
    });
    hint.textContent = "Press L or ESC to close";
    panel.appendChild(hint);

    this.root.appendChild(panel);
  }
}
