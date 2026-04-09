/**
 * FloatingText — "+500" style popups that float up and fade out
 * when the player picks up items.
 */

interface FloatingEntry {
  el: HTMLDivElement;
  timer: number;
  duration: number;
}

const FLOAT_DURATION = 1.2;
const FLOAT_DISTANCE = 60; // pixels to travel upward

export class FloatingText {
  private container: HTMLElement;
  private entries: FloatingEntry[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /** Spawn a floating text at a screen position. */
  spawn(text: string, color = "#4ad8a0", screenX?: number, screenY?: number): void {
    const el = document.createElement("div");
    Object.assign(el.style, {
      position: "fixed",
      left: `${screenX ?? window.innerWidth / 2}px`,
      top: `${screenY ?? window.innerHeight / 2 - 40}px`,
      transform: "translateX(-50%)",
      fontFamily: 'ui-monospace, "Cascadia Mono", monospace',
      fontSize: "16px",
      fontWeight: "800",
      color,
      textShadow: `0 0 8px ${color}66, 0 2px 4px rgba(0,0,0,0.8)`,
      pointerEvents: "none",
      zIndex: "35",
      opacity: "1",
      transition: "none",
      whiteSpace: "nowrap",
      letterSpacing: "0.04em",
    });
    el.textContent = text;
    this.container.appendChild(el);

    this.entries.push({ el, timer: 0, duration: FLOAT_DURATION });
  }

  /** Spawn centered (no screen position needed). */
  spawnCenter(text: string, color = "#4ad8a0"): void {
    const x = window.innerWidth / 2 + (Math.random() - 0.5) * 80;
    const y = window.innerHeight / 2 - 30 + (Math.random() - 0.5) * 40;
    this.spawn(text, color, x, y);
  }

  update(dt: number): void {
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const entry = this.entries[i];
      entry.timer += dt;
      const t = entry.timer / entry.duration;

      if (t >= 1) {
        entry.el.remove();
        this.entries.splice(i, 1);
        continue;
      }

      // Float up
      const baseTop = parseFloat(entry.el.style.top);
      entry.el.style.top = `${baseTop - FLOAT_DISTANCE * dt / entry.duration}px`;

      // Fade out in second half
      if (t > 0.5) {
        entry.el.style.opacity = String(1 - (t - 0.5) * 2);
      }

      // Scale up slightly at start
      const scale = t < 0.1 ? 0.8 + t * 2 : 1;
      entry.el.style.transform = `translateX(-50%) scale(${scale})`;
    }
  }

  dispose(): void {
    for (const e of this.entries) e.el.remove();
    this.entries = [];
  }
}
