/**
 * End-of-mission stats screen with animated counters and letter grade.
 */

export type DeathCause =
  | "radiation"
  | "thermal_vent"
  | "storm_wall"
  | "dust_storm"
  | "patrol_drone"
  | "unstable_core"
  | "lightning"
  | "sentry_turret"
  | "burrower"
  | "boss"
  | "time_expired"
  | "unknown";

export type MissionStats = {
  outcome: "success" | "failed";
  timeSec: number;
  coresCollected: number;
  coresRequired: number;
  salvageCollected: number;
  salvageTotal: number;
  integrityRemaining: number;
  objectiveScore: number;
  salvageScore: number;
  bonusTimeScore: number;
  deathCause?: DeathCause;
};

/* ---- helpers ---- */

function totalScore(s: MissionStats): number {
  return s.objectiveScore + s.salvageScore + s.bonusTimeScore;
}

function letterGrade(score: number): string {
  if (score >= 9000) return "S";
  if (score >= 7500) return "A";
  if (score >= 5500) return "B";
  if (score >= 3500) return "C";
  if (score >= 1500) return "D";
  return "F";
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

export class StatsScreen {
  private root: HTMLDivElement;
  private visible = false;
  private style: HTMLStyleElement;
  private animFrames: number[] = [];

  constructor(container: HTMLElement) {
    this.style = document.createElement("style");
    this.style.textContent = `
      @keyframes ss-fadein  { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
      @keyframes ss-grade   { 0% { transform:scale(0); opacity:0; } 60% { transform:scale(1.3); } 100% { transform:scale(1); opacity:1; } }
      @keyframes ss-prompt  { 0%,100% { opacity:0.5; } 50% { opacity:1; } }
    `;
    document.head.appendChild(this.style);

    this.root = document.createElement("div");
    Object.assign(this.root.style, {
      position: "fixed",
      inset: "0",
      zIndex: "950",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(8,6,5,0.85)",
      fontFamily: "system-ui, sans-serif",
      userSelect: "none",
      opacity: "0",
      transition: "opacity 0.4s ease",
      pointerEvents: "none",
    } as CSSStyleDeclaration);

    container.appendChild(this.root);
  }

  /* ---- public ---- */

  show(stats: MissionStats): void {
    // cancel any prior animations
    for (const id of this.animFrames) cancelAnimationFrame(id);
    this.animFrames = [];

    this.root.innerHTML = "";
    this.visible = true;

    const isSuccess = stats.outcome === "success";
    const total = totalScore(stats);
    const grade = letterGrade(total);

    // --- panel ---
    const panel = document.createElement("div");
    Object.assign(panel.style, {
      background: "rgba(8,6,5,0.92)",
      border: `1px solid ${isSuccess ? "rgba(74,216,160,0.3)" : "rgba(168,72,48,0.4)"}`,
      borderRadius: "12px",
      padding: "2rem 2.5rem",
      minWidth: "340px",
      maxWidth: "460px",
      width: "90vw",
      animation: "ss-fadein 0.5s ease both",
    } as CSSStyleDeclaration);

    // --- header ---
    const header = document.createElement("div");
    header.textContent = isSuccess ? "MISSION COMPLETE" : "MISSION FAILED";
    Object.assign(header.style, {
      fontSize: "1.1rem",
      fontWeight: "700",
      letterSpacing: "0.18em",
      textAlign: "center",
      marginBottom: isSuccess ? "1.4rem" : "0.4rem",
      color: isSuccess ? "#4ad8a0" : "#a84830",
      textShadow: isSuccess ? "0 0 12px rgba(74,216,160,0.3)" : "0 0 12px rgba(168,72,48,0.25)",
    } as CSSStyleDeclaration);
    panel.appendChild(header);

    // --- cause of death ---
    if (!isSuccess && stats.deathCause && stats.deathCause !== "unknown") {
      const causeLabels: Record<string, string> = {
        radiation: "RADIATION EXPOSURE",
        thermal_vent: "THERMAL VENT BURST",
        storm_wall: "STORM WALL",
        dust_storm: "DUST STORM",
        patrol_drone: "PATROL DRONE",
        unstable_core: "UNSTABLE CORE DETONATION",
        lightning: "LIGHTNING STRIKE",
        sentry_turret: "SENTRY TURRET",
        burrower: "BURROWER AMBUSH",
        boss: "TIER BOSS",
        time_expired: "TIME EXPIRED",
      };
      const causeEl = document.createElement("div");
      causeEl.textContent = `KILLED BY: ${causeLabels[stats.deathCause] ?? stats.deathCause.toUpperCase()}`;
      Object.assign(causeEl.style, {
        fontSize: "0.8rem",
        fontWeight: "600",
        letterSpacing: "0.12em",
        textAlign: "center",
        marginBottom: "1.2rem",
        color: "#c86040",
        textShadow: "0 0 8px rgba(200,96,64,0.3)",
      } as CSSStyleDeclaration);
      panel.appendChild(causeEl);
    }

    // --- stat rows ---
    const monoFont = 'ui-monospace, "Cascadia Mono", monospace';

    const addRow = (label: string, targetValue: number, format: (v: number) => string, delay: number) => {
      const row = document.createElement("div");
      Object.assign(row.style, {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "0.35rem 0",
        borderBottom: "1px solid rgba(154,146,136,0.12)",
      } as CSSStyleDeclaration);

      const lbl = document.createElement("span");
      lbl.textContent = label;
      Object.assign(lbl.style, { color: "#9a9288", fontSize: "0.85rem" } as CSSStyleDeclaration);

      const val = document.createElement("span");
      val.textContent = format(0);
      Object.assign(val.style, {
        fontFamily: monoFont,
        fontSize: "1rem",
        fontWeight: "600",
        color: "#e8e0d8",
      } as CSSStyleDeclaration);

      row.appendChild(lbl);
      row.appendChild(val);
      panel.appendChild(row);

      // animate counter
      this.animateCounter(val, targetValue, format, delay);
    };

    addRow("Time", stats.timeSec, fmtTime, 200);
    addRow("Cores", stats.coresCollected, (v) => `${Math.round(v)} / ${stats.coresRequired}`, 350);
    addRow("Salvage", stats.salvageCollected, (v) => `${Math.round(v)} / ${stats.salvageTotal}`, 500);
    addRow("Integrity", stats.integrityRemaining, (v) => `${Math.round(v)}%`, 650);

    // spacer
    const spacer = document.createElement("div");
    spacer.style.height = "0.6rem";
    panel.appendChild(spacer);

    addRow("Objective", stats.objectiveScore, (v) => Math.round(v).toLocaleString(), 850);
    addRow("Salvage Bonus", stats.salvageScore, (v) => Math.round(v).toLocaleString(), 1000);
    addRow("Time Bonus", stats.bonusTimeScore, (v) => Math.round(v).toLocaleString(), 1150);

    // --- total + grade row ---
    const totalRow = document.createElement("div");
    Object.assign(totalRow.style, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: "0.8rem",
      paddingTop: "0.6rem",
      borderTop: "1px solid rgba(154,146,136,0.25)",
    } as CSSStyleDeclaration);

    const totalLabel = document.createElement("span");
    totalLabel.textContent = "TOTAL SCORE";
    Object.assign(totalLabel.style, {
      fontSize: "0.9rem",
      fontWeight: "700",
      letterSpacing: "0.1em",
      color: "#e8e0d8",
    } as CSSStyleDeclaration);

    const totalVal = document.createElement("span");
    totalVal.textContent = "0";
    Object.assign(totalVal.style, {
      fontFamily: monoFont,
      fontSize: "1.35rem",
      fontWeight: "700",
      color: "#4ad8a0",
    } as CSSStyleDeclaration);

    totalRow.appendChild(totalLabel);
    totalRow.appendChild(totalVal);
    panel.appendChild(totalRow);

    this.animateCounter(totalVal, total, (v) => Math.round(v).toLocaleString(), 1350);

    // --- grade ---
    const gradeEl = document.createElement("div");
    gradeEl.textContent = grade;
    Object.assign(gradeEl.style, {
      textAlign: "center",
      fontSize: "3.2rem",
      fontWeight: "800",
      marginTop: "1rem",
      color: gradeColor(grade),
      opacity: "0",
      animation: "ss-grade 0.5s ease both",
      animationDelay: "1.8s",
      textShadow: `0 0 20px ${gradeColor(grade)}66`,
    } as CSSStyleDeclaration);
    panel.appendChild(gradeEl);

    // --- prompts ---
    const prompts = document.createElement("div");
    prompts.textContent = "R - Retry  |  N - Next  |  P - Procedural  |  D - Daily  |  X - Mutators  |  U - Upgrades  |  L - Scores";
    Object.assign(prompts.style, {
      textAlign: "center",
      fontSize: "0.78rem",
      fontFamily: monoFont,
      color: "#9a9288",
      marginTop: "1.2rem",
      animation: "ss-prompt 2.5s ease-in-out infinite",
      animationDelay: "2.2s",
      opacity: "0",
    } as CSSStyleDeclaration);
    panel.appendChild(prompts);

    this.root.appendChild(panel);

    // show
    this.root.style.pointerEvents = "auto";
    void this.root.offsetHeight;
    this.root.style.opacity = "1";
  }

  hide(): void {
    this.visible = false;
    this.root.style.opacity = "0";
    this.root.style.pointerEvents = "none";
    for (const id of this.animFrames) cancelAnimationFrame(id);
    this.animFrames = [];
  }

  isVisible(): boolean {
    return this.visible;
  }

  /* ---- internal ---- */

  private animateCounter(
    el: HTMLElement,
    target: number,
    format: (v: number) => string,
    delayMs: number,
  ): void {
    const duration = 800; // ms
    let started = false;
    let startTime = 0;

    const tick = (now: number) => {
      if (!started) {
        startTime = now;
        started = true;
      }
      const elapsed = now - startTime;
      if (elapsed < delayMs) {
        this.animFrames.push(requestAnimationFrame(tick));
        return;
      }
      const t = Math.min((elapsed - delayMs) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = format(target * eased);
      if (t < 1) {
        this.animFrames.push(requestAnimationFrame(tick));
      }
    };

    this.animFrames.push(requestAnimationFrame(tick));
  }
}
