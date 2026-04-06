/**
 * Pickup combo/chain system.
 * Collecting pickups in quick succession builds a score multiplier (up to x4).
 * Includes a HUD element showing the current combo state.
 */

const COMBO_WINDOW = 3.5; // seconds before combo expires
const MAX_MULTIPLIER = 4;

const COLORS: Record<number, string> = {
  1: "transparent",
  2: "#ffffff",
  3: "#4ad8a0",
  4: "#ffd700",
};

export type ComboEvent = {
  multiplier: number;     // current multiplier (1-4)
  chain: number;          // number of pickups in current chain
  timerRemaining: number; // seconds left in combo window
  justIncreased: boolean; // true on the frame the chain grew
  justExpired: boolean;   // true on the frame the combo ended
};

export class ComboSystem {
  private chain = 0;
  private multiplier = 1;
  private timer = 0;
  private _justIncreased = false;
  private _justExpired = false;

  // HUD elements
  private hudRoot: HTMLDivElement;
  private hudMultiplier: HTMLDivElement;
  private hudBar: HTMLDivElement;
  private hudBarFill: HTMLDivElement;
  private style: HTMLStyleElement;

  constructor(container: HTMLElement) {
    // Inject CSS animations
    this.style = document.createElement("style");
    this.style.textContent = `
      @keyframes combo-bounce {
        0%   { transform: scale(1); }
        20%  { transform: scale(1.5); }
        40%  { transform: scale(0.9); }
        60%  { transform: scale(1.15); }
        80%  { transform: scale(0.97); }
        100% { transform: scale(1); }
      }
      @keyframes combo-flash-out {
        0%   { opacity: 1; transform: scale(1); }
        30%  { opacity: 1; transform: scale(1.3); }
        100% { opacity: 0; transform: scale(0.6); }
      }
      @keyframes combo-bar-pulse {
        0%, 100% { opacity: 1; }
        50%      { opacity: 0.5; }
      }
    `;
    document.head.appendChild(this.style);

    // HUD container
    this.hudRoot = document.createElement("div");
    Object.assign(this.hudRoot.style, {
      position: "fixed",
      top: "16px",
      right: "16px",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: "4px",
      pointerEvents: "none",
      zIndex: "950",
      fontFamily: 'ui-monospace, "Cascadia Mono", monospace',
      opacity: "0",
      transition: "opacity 0.25s ease",
    });
    container.appendChild(this.hudRoot);

    // Multiplier text
    this.hudMultiplier = document.createElement("div");
    Object.assign(this.hudMultiplier.style, {
      fontSize: "36px",
      fontWeight: "900",
      lineHeight: "1",
      textShadow: "0 0 12px currentColor, 0 2px 6px rgba(0,0,0,0.8)",
      letterSpacing: "-1px",
    });
    this.hudMultiplier.textContent = "x1";
    this.hudRoot.appendChild(this.hudMultiplier);

    // Timer bar wrapper
    const barWrap = document.createElement("div");
    Object.assign(barWrap.style, {
      width: "72px",
      height: "4px",
      borderRadius: "2px",
      background: "rgba(255,255,255,0.08)",
      overflow: "hidden",
    });
    this.hudRoot.appendChild(barWrap);

    // Timer bar fill
    this.hudBarFill = document.createElement("div");
    Object.assign(this.hudBarFill.style, {
      height: "100%",
      width: "100%",
      borderRadius: "2px",
      transition: "background 0.3s",
    });
    barWrap.appendChild(this.hudBarFill);

    this.hudBar = barWrap;
  }

  /** Call when any pickup is collected. Returns the multiplier to apply to this pickup's score. */
  pickup(): number {
    this.chain++;
    this.timer = COMBO_WINDOW;

    // Multiplier thresholds: 1st pickup = x1, 2nd = x2, 3rd = x3, 4th+ = x4
    const prev = this.multiplier;
    this.multiplier = Math.min(this.chain, MAX_MULTIPLIER);
    this._justIncreased = this.multiplier > prev;

    // Update HUD immediately
    this.updateHud();

    // Trigger bounce animation on increase
    if (this._justIncreased) {
      this.hudMultiplier.style.animation = "none";
      void this.hudMultiplier.offsetHeight; // force reflow
      this.hudMultiplier.style.animation = "combo-bounce 0.4s ease-out";
    }

    return this.multiplier;
  }

  /** Call every frame with delta time in seconds */
  update(dt: number): ComboEvent {
    this._justIncreased = false;
    this._justExpired = false;

    if (this.timer > 0) {
      this.timer -= dt;

      // Pulse the bar when running low
      if (this.timer <= 1.0 && this.timer > 0) {
        this.hudBar.style.animation = "combo-bar-pulse 0.4s ease-in-out infinite";
      } else {
        this.hudBar.style.animation = "none";
      }

      if (this.timer <= 0) {
        this.timer = 0;
        this._justExpired = true;
        this.expireCombo();
      }
    }

    this.updateHud();

    return {
      multiplier: this.multiplier,
      chain: this.chain,
      timerRemaining: this.timer,
      justIncreased: this._justIncreased,
      justExpired: this._justExpired,
    };
  }

  /** Reset on mission restart */
  reset(): void {
    this.chain = 0;
    this.multiplier = 1;
    this.timer = 0;
    this._justIncreased = false;
    this._justExpired = false;
    this.updateHud();
  }

  /** Current multiplier (1-4) */
  getMultiplier(): number {
    return this.multiplier;
  }

  /* ---- internal ---- */

  private expireCombo(): void {
    // Flash-out animation
    if (this.multiplier > 1) {
      this.hudMultiplier.style.animation = "none";
      void this.hudMultiplier.offsetHeight;
      this.hudMultiplier.style.animation = "combo-flash-out 0.35s ease-out forwards";
    }

    this.chain = 0;
    this.multiplier = 1;
  }

  private updateHud(): void {
    const active = this.multiplier > 1 || this.timer > 0;
    this.hudRoot.style.opacity = active ? "1" : "0";

    const color = COLORS[this.multiplier] ?? COLORS[1];
    this.hudMultiplier.style.color = color;
    this.hudMultiplier.textContent = `x${this.multiplier}`;

    // Bar fill
    const pct = this.timer > 0 ? (this.timer / COMBO_WINDOW) * 100 : 0;
    this.hudBarFill.style.width = `${pct}%`;
    this.hudBarFill.style.background = color === "transparent" ? "rgba(255,255,255,0.3)" : color;
  }
}
