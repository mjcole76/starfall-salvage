/**
 * SandstormOverlay - Screen-space sandstorm weather effect.
 *
 * Renders animated diagonal sand/dust streaks on a 2D canvas overlay
 * positioned on top of the game canvas. Intensity is driven by proximity
 * to the storm wall.
 */

interface Streak {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
  thickness: number;
}

const BASE_STREAK_COUNT = 50;
const MIN_SPEED = 200;
const MAX_SPEED = 500;
const MIN_OPACITY = 0.03;
const MAX_OPACITY = 0.08;
const WIND_ANGLE = Math.PI / 12; // ~15 degrees downward from horizontal
const COS_ANGLE = Math.cos(WIND_ANGLE);
const SIN_ANGLE = Math.sin(WIND_ANGLE);
const SAND_R = 180;
const SAND_G = 140;
const SAND_B = 80;

export class SandstormOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private streaks: Streak[] = [];
  private intensity = 0;
  private width = 0;
  private height = 0;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.pointerEvents = "none";
    this.canvas.style.zIndex = "10";
    container.appendChild(this.canvas);

    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("SandstormOverlay: failed to get 2d context");
    this.ctx = ctx;

    // Initial sizing
    const rect = container.getBoundingClientRect();
    this.resize(rect.width, rect.height);

    this.initStreaks();
  }

  /** Set storm intensity. 0 = barely visible ambient dust, 1 = heavy sandstorm. */
  setIntensity(t: number): void {
    this.intensity = Math.max(0, Math.min(1, t));
  }

  /** Advance the simulation and redraw. Call once per frame with delta in seconds. */
  update(dt: number): void {
    // Clamp dt to avoid huge jumps when tab is backgrounded
    const clampedDt = Math.min(dt, 0.1);

    const activeCount = this.activeStreakCount();
    const speedMult = 1 + this.intensity * 1.5; // up to 2.5x at full intensity
    const opacityMult = 0.3 + this.intensity * 0.7; // 0.3 at calm, 1.0 at full storm

    this.ctx.clearRect(0, 0, this.width, this.height);

    for (let i = 0; i < activeCount; i++) {
      const s = this.streaks[i];

      // Move along wind direction
      const dx = COS_ANGLE * s.speed * speedMult * clampedDt;
      const dy = SIN_ANGLE * s.speed * speedMult * clampedDt;
      s.x += dx;
      s.y += dy;

      // Wrap around when off-screen
      if (s.x > this.width + s.length || s.y > this.height + s.length) {
        this.resetStreak(s);
      }

      // Draw streak
      const alpha = s.opacity * opacityMult;
      if (alpha < 0.005) continue; // skip nearly invisible streaks

      const endX = s.x + COS_ANGLE * s.length;
      const endY = s.y + SIN_ANGLE * s.length;

      this.ctx.beginPath();
      this.ctx.moveTo(s.x, s.y);
      this.ctx.lineTo(endX, endY);
      this.ctx.strokeStyle = `rgba(${SAND_R}, ${SAND_G}, ${SAND_B}, ${alpha})`;
      this.ctx.lineWidth = s.thickness;
      this.ctx.stroke();
    }
  }

  /** Resize the overlay canvas to match the container. */
  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
  }

  /** Remove the overlay from the DOM and release resources. */
  dispose(): void {
    this.canvas.parentElement?.removeChild(this.canvas);
    this.streaks.length = 0;
  }

  // -- private helpers --

  private activeStreakCount(): number {
    // 40 at intensity 0, up to 60 at intensity 1
    const count = Math.floor(40 + this.intensity * 20);
    return Math.min(count, this.streaks.length);
  }

  private initStreaks(): void {
    this.streaks = [];
    for (let i = 0; i < BASE_STREAK_COUNT + 10; i++) {
      const s = this.createStreak(true);
      this.streaks.push(s);
    }
  }

  private createStreak(randomizeX: boolean): Streak {
    return {
      x: randomizeX ? Math.random() * this.width : -Math.random() * 200,
      y: Math.random() * this.height,
      length: 30 + Math.random() * 60,
      speed: MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED),
      opacity: MIN_OPACITY + Math.random() * (MAX_OPACITY - MIN_OPACITY),
      thickness: 0.5 + Math.random() * 1.5,
    };
  }

  private resetStreak(s: Streak): void {
    // Re-enter from the left or top edge
    s.x = -Math.random() * 200;
    s.y = Math.random() * this.height;
    s.length = 30 + Math.random() * 60;
    s.speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
    s.opacity = MIN_OPACITY + Math.random() * (MAX_OPACITY - MIN_OPACITY);
    s.thickness = 0.5 + Math.random() * 1.5;
  }
}
