/**
 * DamageVignette - Screen-edge red pulse when integrity is low.
 *
 * Uses a CSS overlay with inset box-shadow to create a red vignette
 * that pulses when player integrity drops below 30%. Completely hidden
 * (display:none) when integrity is healthy for zero performance cost.
 */

const LOW_THRESHOLD = 30; // Start pulsing below this %
const CRITICAL_THRESHOLD = 15; // Add red tint below this %

const MIN_PULSE_OPACITY = 0.1;
const MAX_PULSE_OPACITY = 0.4;

// Pulse speed: cycles per second at threshold vs at 0%
const MIN_PULSE_SPEED = 1.0; // at 30% integrity
const MAX_PULSE_SPEED = 3.0; // at 0% integrity

export class DamageVignette {
  private overlay: HTMLDivElement;
  private integrity = 100;
  private pulsePhase = 0;
  private active = false;

  constructor(container: HTMLElement) {
    this.overlay = document.createElement("div");
    this.overlay.style.position = "absolute";
    this.overlay.style.top = "0";
    this.overlay.style.left = "0";
    this.overlay.style.width = "100%";
    this.overlay.style.height = "100%";
    this.overlay.style.pointerEvents = "none";
    this.overlay.style.zIndex = "11";
    this.overlay.style.display = "none";
    this.overlay.style.transition = "opacity 0.3s ease";
    container.appendChild(this.overlay);
  }

  /** Set current integrity as a percentage (0-100). */
  setIntegrity(percent: number): void {
    this.integrity = Math.max(0, Math.min(100, percent));

    if (this.integrity >= LOW_THRESHOLD) {
      if (this.active) {
        this.active = false;
        this.overlay.style.display = "none";
      }
    } else if (!this.active) {
      this.active = true;
      this.overlay.style.display = "block";
    }
  }

  /** Call every frame with delta time in seconds. */
  update(dt: number): void {
    if (!this.active) return;

    // How deep into the danger zone (0 = at threshold, 1 = at 0%)
    const danger = 1 - this.integrity / LOW_THRESHOLD;

    // Pulse speed ramps up as integrity drops
    const pulseSpeed =
      MIN_PULSE_SPEED + danger * (MAX_PULSE_SPEED - MIN_PULSE_SPEED);
    this.pulsePhase += dt * pulseSpeed * Math.PI * 2;

    // Sine wave oscillation mapped to [MIN_PULSE_OPACITY, MAX_PULSE_OPACITY]
    const sin01 = (Math.sin(this.pulsePhase) + 1) / 2; // 0..1
    const pulseOpacity =
      MIN_PULSE_OPACITY + sin01 * (MAX_PULSE_OPACITY - MIN_PULSE_OPACITY);

    // Scale effect by danger level for smooth transition in/out
    const effectOpacity = pulseOpacity * danger;

    // Inset box-shadow for screen-edge red glow
    const spread = 80 + danger * 120; // 80px at threshold, up to 200px at 0%
    const blur = 60 + danger * 80;
    this.overlay.style.boxShadow = `inset 0 0 ${blur}px ${spread}px rgba(180, 20, 20, ${effectOpacity})`;

    // Critical: add overall red tint
    if (this.integrity < CRITICAL_THRESHOLD) {
      const criticalDepth = 1 - this.integrity / CRITICAL_THRESHOLD; // 0..1
      const tintAlpha = criticalDepth * 0.08 * (0.7 + sin01 * 0.3);
      this.overlay.style.backgroundColor = `rgba(120, 0, 0, ${tintAlpha})`;
    } else {
      this.overlay.style.backgroundColor = "transparent";
    }
  }

  /** Remove the overlay from the DOM. */
  dispose(): void {
    this.overlay.parentElement?.removeChild(this.overlay);
  }
}
