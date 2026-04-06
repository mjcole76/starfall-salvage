/**
 * Personal best time display shown during gameplay.
 * Tracks best completion time per mission variant in localStorage.
 */

const STORAGE_KEY = "starfall_pb_times";

function loadTimes(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function saveTimes(times: Record<string, number>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(times));
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export class SpeedRunTimer {
  private root: HTMLDivElement;
  private pbLabel: HTMLSpanElement;
  private flashEl: HTMLDivElement;
  private style: HTMLStyleElement;
  private variantId: string = "";

  constructor(container: HTMLElement) {
    const monoFont = 'ui-monospace, "Cascadia Mono", monospace';

    this.style = document.createElement("style");
    this.style.textContent = `
      @keyframes srt-flash {
        0%   { opacity:0; transform:translateY(4px) scale(0.95); }
        15%  { opacity:1; transform:translateY(0) scale(1.05); }
        25%  { transform:scale(1); }
        80%  { opacity:1; }
        100% { opacity:0; }
      }
    `;
    document.head.appendChild(this.style);

    this.root = document.createElement("div");
    Object.assign(this.root.style, {
      position: "fixed",
      top: "10px",
      right: "10px",
      zIndex: "900",
      fontFamily: monoFont,
      fontSize: "11px",
      color: "#9a9288",
      background: "rgba(8,6,5,0.5)",
      padding: "3px 8px",
      borderRadius: "4px",
      pointerEvents: "none",
      userSelect: "none",
      display: "none",
    } as CSSStyleDeclaration);

    this.pbLabel = document.createElement("span");
    this.pbLabel.textContent = "PB --:--";
    this.root.appendChild(this.pbLabel);

    container.appendChild(this.root);

    /* flash element for NEW PB */
    this.flashEl = document.createElement("div");
    Object.assign(this.flashEl.style, {
      position: "fixed",
      top: "40px",
      right: "10px",
      zIndex: "901",
      fontFamily: monoFont,
      fontSize: "13px",
      fontWeight: "700",
      color: "#4ad8a0",
      background: "rgba(8,6,5,0.7)",
      padding: "6px 14px",
      borderRadius: "6px",
      border: "1px solid rgba(74,216,160,0.3)",
      pointerEvents: "none",
      userSelect: "none",
      opacity: "0",
    } as CSSStyleDeclaration);
    this.flashEl.textContent = "NEW PERSONAL BEST!";
    container.appendChild(this.flashEl);
  }

  /* ---- public ---- */

  setVariant(variantId: string): void {
    this.variantId = variantId;
    const pb = this.getPersonalBest();
    this.pbLabel.textContent = pb !== null ? `PB ${fmtTime(pb)}` : "PB --:--";
  }

  setCurrentTime(seconds: number): void {
    const pb = this.getPersonalBest();
    if (pb !== null) {
      this.pbLabel.textContent = `PB ${fmtTime(pb)}`;
    } else {
      this.pbLabel.textContent = "PB --:--";
    }
  }

  recordCompletion(seconds: number): boolean {
    const times = loadTimes();
    const prev = times[this.variantId];
    const isNewPB = prev === undefined || seconds < prev;

    if (isNewPB) {
      times[this.variantId] = seconds;
      saveTimes(times);
      this.pbLabel.textContent = `PB ${fmtTime(seconds)}`;
      this.showFlash();
    }

    return isNewPB;
  }

  show(): void {
    this.root.style.display = "block";
  }

  hide(): void {
    this.root.style.display = "none";
  }

  getPersonalBest(): number | null {
    const times = loadTimes();
    const t = times[this.variantId];
    return t !== undefined ? t : null;
  }

  dispose(): void {
    this.root.remove();
    this.flashEl.remove();
    this.style.remove();
  }

  /* ---- private ---- */

  private showFlash(): void {
    this.flashEl.style.animation = "none";
    // force reflow
    void this.flashEl.offsetWidth;
    this.flashEl.style.animation = "srt-flash 2.5s ease-out both";
  }
}
