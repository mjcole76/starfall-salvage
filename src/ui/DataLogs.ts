/**
 * DataLogs — environmental storytelling pickups at landmarks.
 * Walk near a landmark to trigger a data log that types out
 * lore text in a HUD panel.
 */

const LOGS: { x: number; z: number; radius: number; title: string; text: string }[] = [
  {
    x: -32, z: 18, radius: 12,
    title: "CRASHED HULL — FLIGHT RECORDER",
    text: "...engine two flameout at 12,000m. Thermal cascade from core containment breach. Cargo manifest: 3x energy cores, Class-IV extraction grade. All hands lost. The cores scattered on impact — recovery teams never made it through the storm season.",
  },
  {
    x: 40, z: -32, radius: 10,
    title: "RELAY TOWER — LAST TRANSMISSION",
    text: "Orbital relay KX-7, final log: dust storm frequency increasing 340% above baseline. Radiation pockets expanding. Recommending immediate planetary quarantine. The cores are destabilizing the local magnetosphere — whoever left them here knew what they were doing.",
  },
  {
    x: -50, z: -38, radius: 10,
    title: "DRILL RIG — FOREMAN'S NOTE",
    text: "Day 47: Hit something at depth. Not ore — crystalline, pulsing. The geiger counter went crazy. Corporate says keep drilling. Three crew down with suit integrity failures. I'm pulling my team out. Whatever's under this sand, it doesn't want to be found.",
  },
  {
    x: 26, z: 8, radius: 10,
    title: "HAZARD CRATER — SURVEY MARKER",
    text: "GEOLOGICAL SURVEY #2291: Impact crater, est. 200 years old. Residual energy signature matches Class-IV cores. Theory: orbital drop, not natural. Someone seeded this planet. The radiation and thermal vents are side effects — the cores are the real payload.",
  },
];

export class DataLogs {
  private el: HTMLDivElement;
  private titleEl: HTMLDivElement;
  private textEl: HTMLDivElement;
  private triggered = new Set<number>();
  private currentLog = -1;
  private charIndex = 0;
  private charTimer = 0;
  private holdTimer = 0;
  private fadeTimer = 0;
  private phase: "idle" | "typing" | "hold" | "fade" = "idle";
  private fullText = "";

  constructor(container: HTMLElement) {
    this.el = document.createElement("div");
    Object.assign(this.el.style, {
      position: "fixed",
      bottom: "100px",
      left: "50%",
      transform: "translateX(-50%)",
      maxWidth: "500px",
      width: "90vw",
      padding: "12px 16px",
      background: "rgba(8,12,20,0.85)",
      border: "1px solid rgba(80,160,200,0.3)",
      borderRadius: "6px",
      fontFamily: 'ui-monospace, "Cascadia Mono", monospace',
      fontSize: "11px",
      lineHeight: "1.5",
      color: "#88bbcc",
      textShadow: "0 0 4px rgba(80,160,200,0.3)",
      pointerEvents: "none",
      zIndex: "28",
      opacity: "0",
      transition: "opacity 0.4s ease",
    });

    this.titleEl = document.createElement("div");
    Object.assign(this.titleEl.style, {
      fontSize: "10px",
      fontWeight: "700",
      letterSpacing: "0.12em",
      color: "#55aacc",
      marginBottom: "6px",
    });
    this.el.appendChild(this.titleEl);

    this.textEl = document.createElement("div");
    this.el.appendChild(this.textEl);

    container.appendChild(this.el);
  }

  update(dt: number, playerX: number, playerZ: number): void {
    // Check proximity to logs
    if (this.phase === "idle") {
      for (let i = 0; i < LOGS.length; i++) {
        if (this.triggered.has(i)) continue;
        const log = LOGS[i];
        const dx = playerX - log.x;
        const dz = playerZ - log.z;
        if (dx * dx + dz * dz <= log.radius * log.radius) {
          this.triggerLog(i);
          break;
        }
      }
    }

    switch (this.phase) {
      case "typing": {
        this.charTimer += dt;
        const speed = 0.025;
        while (this.charTimer >= speed && this.charIndex < this.fullText.length) {
          this.charTimer -= speed;
          this.charIndex++;
          this.textEl.textContent = this.fullText.slice(0, this.charIndex);
        }
        if (this.charIndex >= this.fullText.length) {
          this.phase = "hold";
          this.holdTimer = 0;
        }
        break;
      }
      case "hold": {
        this.holdTimer += dt;
        if (this.holdTimer >= 6) {
          this.phase = "fade";
          this.fadeTimer = 0;
        }
        break;
      }
      case "fade": {
        this.fadeTimer += dt;
        const t = Math.min(this.fadeTimer / 0.6, 1);
        this.el.style.opacity = String(1 - t);
        if (t >= 1) {
          this.phase = "idle";
          this.el.style.opacity = "0";
        }
        break;
      }
    }
  }

  private triggerLog(index: number): void {
    this.triggered.add(index);
    this.currentLog = index;
    const log = LOGS[index];
    this.titleEl.textContent = log.title;
    this.fullText = log.text;
    this.textEl.textContent = "";
    this.charIndex = 0;
    this.charTimer = 0;
    this.phase = "typing";
    this.el.style.opacity = "1";
  }

  reset(): void {
    this.triggered.clear();
    this.phase = "idle";
    this.el.style.opacity = "0";
    this.currentLog = -1;
  }

  dispose(): void {
    this.el.remove();
  }
}
