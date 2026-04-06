import * as THREE from "three";

/**
 * Dash / dodge ability for the player mech.
 *
 * Activation:
 *  - Double-tap a movement key (W/A/S/D) within 250 ms, OR
 *  - Press Q.
 *
 * While dashing the player gets a short burst of speed and brief
 * invulnerability.  The module exposes `isDashing` and `dashDirection`
 * so the particle system can react.
 */

/* ------------------------------------------------------------------ */
/*  Tuning constants                                                  */
/* ------------------------------------------------------------------ */

const DOUBLE_TAP_WINDOW = 0.25; // seconds
const DASH_DURATION = 0.15; // seconds
const DASH_SPEED_MULT = 3; // multiplier on max ground speed
const DASH_COOLDOWN = 1.5; // seconds
const MAX_GROUND_SPEED = 12; // must match PlayerController

const MOVE_KEYS = ["w", "a", "s", "d"] as const;

/** Unit direction each movement key implies (XZ plane, Z-forward). */
const KEY_DIR: Record<string, THREE.Vector3> = {
  w: new THREE.Vector3(0, 0, -1),
  s: new THREE.Vector3(0, 0, 1),
  a: new THREE.Vector3(-1, 0, 0),
  d: new THREE.Vector3(1, 0, 0),
};

export class DashAbility {
  /* ---- public read-only state ------------------------------------ */
  private _isDashing = false;
  private _isInvulnerable = false;
  private _dashDirection = new THREE.Vector3();
  private _cooldownRemaining = 0;

  get isDashing(): boolean {
    return this._isDashing;
  }
  get isInvulnerable(): boolean {
    return this._isInvulnerable;
  }
  get dashDirection(): THREE.Vector3 {
    return this._dashDirection;
  }
  get cooldownRemaining(): number {
    return this._cooldownRemaining;
  }

  /* ---- internal state -------------------------------------------- */

  /** Timestamp (seconds since page load) of the last key-down per movement key. */
  private lastTapTime: Record<string, number> = {};
  /** Keys that were held on the *previous* frame (used to detect fresh presses). */
  private prevKeys = new Set<string>();

  private dashTimer = 0;
  private invulnTimer = 0;
  /** Running wall-clock accumulated from dt, used for double-tap detection. */
  private clock = 0;

  /* ================================================================ */

  constructor() {
    this.reset();
  }

  /**
   * Call every frame.
   *
   * @param dt        Frame delta in seconds.
   * @param wishDir   Current movement wish direction (may be zero-length).
   * @param facing    Player yaw in radians (used when no movement input).
   * @param keys      Set of currently-held key names (lowercase).
   * @returns         A velocity vector to apply while dashing, or `null`
   *                  when the dash is inactive and normal movement should
   *                  take over.
   */
  update(
    dt: number,
    wishDir: THREE.Vector3,
    facing: number,
    keys: Set<string>,
  ): THREE.Vector3 | null {
    this.clock += dt;

    /* ---------- detect activation --------------------------------- */
    if (!this._isDashing && this._cooldownRemaining <= 0) {
      let triggered = false;
      let triggerDir: THREE.Vector3 | null = null;

      // Q key instant trigger
      if (keys.has("q") && !this.prevKeys.has("q")) {
        triggered = true;
      }

      // Double-tap detection on movement keys
      if (!triggered) {
        for (const k of MOVE_KEYS) {
          const justPressed = keys.has(k) && !this.prevKeys.has(k);
          if (justPressed) {
            const prev = this.lastTapTime[k] ?? -Infinity;
            if (this.clock - prev <= DOUBLE_TAP_WINDOW) {
              triggered = true;
              triggerDir = KEY_DIR[k]!.clone();
              // Reset so triple-tap doesn't fire again immediately
              this.lastTapTime[k] = -Infinity;
              break;
            }
            this.lastTapTime[k] = this.clock;
          }
        }
      }

      if (triggered) {
        this.startDash(triggerDir, wishDir, facing);
      }
    }

    // Snapshot held keys for next-frame edge detection
    this.prevKeys = new Set(keys);

    /* ---------- tick active dash ---------------------------------- */
    if (this._isDashing) {
      this.dashTimer -= dt;
      this.invulnTimer -= dt;

      if (this.invulnTimer <= 0) {
        this._isInvulnerable = false;
      }

      if (this.dashTimer <= 0) {
        this._isDashing = false;
        this._isInvulnerable = false;
      }
    }

    /* ---------- tick cooldown ------------------------------------- */
    if (this._cooldownRemaining > 0) {
      this._cooldownRemaining = Math.max(0, this._cooldownRemaining - dt);
    }

    /* ---------- return velocity override or null ------------------ */
    if (this._isDashing) {
      const speed = MAX_GROUND_SPEED * DASH_SPEED_MULT;
      return this._dashDirection.clone().multiplyScalar(speed);
    }
    return null;
  }

  /** Reset all state (e.g. on mission restart). */
  reset(): void {
    this._isDashing = false;
    this._isInvulnerable = false;
    this._dashDirection.set(0, 0, 0);
    this._cooldownRemaining = 0;
    this.dashTimer = 0;
    this.invulnTimer = 0;
    this.lastTapTime = {};
    this.prevKeys.clear();
    this.clock = 0;
  }

  /* ---------------------------------------------------------------- */
  /*  Private helpers                                                  */
  /* ---------------------------------------------------------------- */

  private startDash(
    triggerDir: THREE.Vector3 | null,
    wishDir: THREE.Vector3,
    facing: number,
  ): void {
    // Determine direction: explicit trigger key > current wish > facing
    const dir = new THREE.Vector3();

    if (triggerDir && triggerDir.lengthSq() > 0.001) {
      dir.copy(triggerDir);
    } else if (wishDir.lengthSq() > 0.001) {
      dir.copy(wishDir);
    } else {
      // Use facing direction (yaw -> forward on XZ)
      dir.set(-Math.sin(facing), 0, -Math.cos(facing));
    }

    dir.y = 0;
    dir.normalize();

    this._dashDirection.copy(dir);
    this._isDashing = true;
    this._isInvulnerable = true;
    this.dashTimer = DASH_DURATION;
    this.invulnTimer = DASH_DURATION;
    this._cooldownRemaining = DASH_COOLDOWN;
  }
}
