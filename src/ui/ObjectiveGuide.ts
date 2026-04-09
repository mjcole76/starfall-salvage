/**
 * ObjectiveGuide — step-by-step mission guidance for first-time players.
 * Shows a directional arrow + text prompt pointing to the current objective.
 * Progresses through: find cores → get to extraction → hold position.
 * Dismisses permanently after first successful extraction.
 */

const STORAGE_KEY = "starfall_guide_done";

type GuidePhase =
  | "find_core"
  | "more_cores"
  | "go_extract"
  | "hold_extract"
  | "done";

const PHASE_TEXT: Record<GuidePhase, string> = {
  find_core: "FIND AN ENERGY CORE",
  more_cores: "COLLECT MORE CORES",
  go_extract: "GET TO THE EXTRACTION ZONE",
  hold_extract: "HOLD POSITION TO EXTRACT",
  done: "",
};

const PHASE_HINT: Record<GuidePhase, string> = {
  find_core: "Look for the cyan markers on your minimap",
  more_cores: "cores remaining",
  go_extract: "The green zone on your minimap",
  hold_extract: "Stay inside the green circle",
  done: "",
};

export class ObjectiveGuide {
  private el: HTMLDivElement;
  private textEl: HTMLDivElement;
  private hintEl: HTMLDivElement;
  private arrowEl: HTMLDivElement;
  private phase: GuidePhase = "find_core";
  private visible = false;
  private completed = false;

  constructor(container: HTMLElement) {
    // Check if player already completed a mission
    if (localStorage.getItem(STORAGE_KEY) === "1") {
      this.completed = true;
    }

    this.el = document.createElement("div");
    Object.assign(this.el.style, {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%) translateY(-80px)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "4px",
      padding: "10px 20px",
      background: "rgba(8,12,6,0.6)",
      border: "1px solid rgba(74,216,160,0.25)",
      borderRadius: "8px",
      fontFamily: 'ui-monospace, "Cascadia Mono", monospace',
      pointerEvents: "none",
      zIndex: "26",
      opacity: "0",
      transition: "opacity 0.5s ease",
    });

    this.arrowEl = document.createElement("div");
    Object.assign(this.arrowEl.style, {
      fontSize: "24px",
      color: "#4ad8a0",
      lineHeight: "1",
      transition: "transform 0.15s ease",
      textShadow: "0 0 10px rgba(74,216,160,0.5)",
    });
    this.arrowEl.textContent = "\u25B2";
    this.el.appendChild(this.arrowEl);

    this.textEl = document.createElement("div");
    Object.assign(this.textEl.style, {
      fontSize: "13px",
      fontWeight: "700",
      color: "#4ad8a0",
      letterSpacing: "0.08em",
      textAlign: "center",
      textShadow: "0 0 8px rgba(74,216,160,0.3)",
    });
    this.el.appendChild(this.textEl);

    this.hintEl = document.createElement("div");
    Object.assign(this.hintEl.style, {
      fontSize: "10px",
      color: "#8a9a88",
      textAlign: "center",
      letterSpacing: "0.04em",
    });
    this.el.appendChild(this.hintEl);

    container.appendChild(this.el);
  }

  update(
    playerX: number,
    playerZ: number,
    playerFacing: number,
    coresCollected: number,
    coresRequired: number,
    extractionOn: boolean,
    extractionArmed: boolean,
    inExtractZone: boolean,
    targetX: number,
    targetZ: number,
  ): void {
    if (this.completed) return;

    // Determine phase
    if (extractionArmed && inExtractZone) {
      this.phase = "hold_extract";
    } else if (extractionOn) {
      this.phase = "go_extract";
    } else if (coresCollected > 0 && coresCollected < coresRequired) {
      this.phase = "more_cores";
    } else if (coresCollected === 0) {
      this.phase = "find_core";
    } else {
      this.phase = "go_extract";
    }

    if (!this.visible) {
      this.visible = true;
      this.el.style.opacity = "1";
    }

    this.textEl.textContent = PHASE_TEXT[this.phase];
    if (this.phase === "more_cores") {
      this.hintEl.textContent = `${coresRequired - coresCollected} ${PHASE_HINT[this.phase]}`;
    } else {
      this.hintEl.textContent = PHASE_HINT[this.phase];
    }

    // Color-code by phase
    const PHASE_COLOR: Record<GuidePhase, string> = {
      find_core: "#00f0ff",
      more_cores: "#00f0ff",
      go_extract: "#4ad8a0",
      hold_extract: "#ffaa33",
      done: "#4ad8a0",
    };
    const color = PHASE_COLOR[this.phase];
    this.arrowEl.style.color = color;
    this.arrowEl.style.textShadow = `0 0 10px ${color}88`;
    this.textEl.style.color = color;
    this.textEl.style.textShadow = `0 0 8px ${color}44`;
    this.el.style.borderColor = `${color}40`;

    // Point arrow toward target
    const dx = targetX - playerX;
    const dz = targetZ - playerZ;
    const angleToTarget = Math.atan2(dx, dz);
    const relAngle = angleToTarget - playerFacing;
    const deg = (relAngle * 180) / Math.PI;
    this.arrowEl.style.transform = `rotate(${deg}deg)`;

    // Pulse when close
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 8) {
      this.arrowEl.style.opacity = "0.4";
    } else {
      this.arrowEl.style.opacity = "1";
    }
  }

  /** Call on successful extraction to permanently dismiss. */
  markComplete(): void {
    this.completed = true;
    this.visible = false;
    this.el.style.opacity = "0";
    localStorage.setItem(STORAGE_KEY, "1");
  }

  hide(): void {
    this.visible = false;
    this.el.style.opacity = "0";
  }

  show(): void {
    if (this.completed) return;
    this.visible = true;
    this.el.style.opacity = "1";
  }

  reset(): void {
    this.phase = "find_core";
    if (!this.completed) {
      this.visible = true;
      this.el.style.opacity = "1";
    }
  }

  dispose(): void {
    this.el.remove();
  }
}
