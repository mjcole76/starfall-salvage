/**
 * DeathReplay — 2-second slow-motion zoom when the player dies.
 * Temporarily slows the game clock and zooms the camera in on the player,
 * then resumes normal speed for the stats screen.
 */

export class DeathReplay {
  private _active = false;
  private timer = 0;
  private _timeScale = 1;
  private _zoomFactor = 1;
  private onComplete: (() => void) | null = null;

  get active(): boolean { return this._active; }
  get timeScale(): number { return this._timeScale; }
  get zoomFactor(): number { return this._zoomFactor; }

  /** Trigger the death replay effect. */
  trigger(onComplete: () => void): void {
    if (this._active) return;
    this._active = true;
    this.timer = 0;
    this.onComplete = onComplete;
  }

  /** Call with REAL dt (not scaled). Returns the scaled dt for game logic. */
  update(realDt: number): number {
    if (!this._active) {
      this._timeScale = 1;
      this._zoomFactor = 1;
      return realDt;
    }

    this.timer += realDt;
    const duration = 2.0;
    const t = Math.min(this.timer / duration, 1);

    // Slow motion: starts at 0.15x, eases back to 1x
    if (t < 0.7) {
      // Slow phase
      const slowT = t / 0.7;
      this._timeScale = 0.15 + slowT * 0.15; // 0.15 -> 0.30
    } else {
      // Speed back up
      const speedT = (t - 0.7) / 0.3;
      this._timeScale = 0.3 + speedT * 0.7; // 0.30 -> 1.0
    }

    // Zoom: push in then pull back
    if (t < 0.5) {
      const zoomT = t / 0.5;
      this._zoomFactor = 1 - zoomT * 0.3; // 1.0 -> 0.7 (closer)
    } else {
      const zoomT = (t - 0.5) / 0.5;
      this._zoomFactor = 0.7 + zoomT * 0.3; // 0.7 -> 1.0
    }

    if (t >= 1) {
      this._active = false;
      this._timeScale = 1;
      this._zoomFactor = 1;
      this.onComplete?.();
      this.onComplete = null;
    }

    return realDt * this._timeScale;
  }

  reset(): void {
    this._active = false;
    this.timer = 0;
    this._timeScale = 1;
    this._zoomFactor = 1;
    this.onComplete = null;
  }
}
