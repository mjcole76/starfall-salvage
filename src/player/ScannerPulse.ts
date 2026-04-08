/**
 * Scanner Pulse — activated with E key.
 * Briefly reveals all pickups/hazards within a radius on the minimap
 * with a visual expanding ring effect in the 3D world.
 */

import * as THREE from "three";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PULSE_RADIUS = 35;
const PULSE_DURATION = 0.8; // seconds for ring to expand
const REVEAL_DURATION = 4;   // seconds items stay highlighted
const COOLDOWN = 12;         // seconds between uses

// ---------------------------------------------------------------------------
// Scanner Pulse
// ---------------------------------------------------------------------------

export class ScannerPulse {
  private ring: THREE.Mesh;
  private ringMat: THREE.MeshBasicMaterial;

  // State
  private active = false;
  private pulseTimer = 0;
  private revealTimer = 0;
  private cooldownTimer = 0;
  private pulseCenter = new THREE.Vector3();

  /** True while items should be highlighted on minimap. */
  get isRevealing(): boolean {
    return this.revealTimer > 0;
  }

  get revealCenter(): THREE.Vector3 {
    return this.pulseCenter;
  }

  get revealRadius(): number {
    return PULSE_RADIUS;
  }

  get cooldownRemaining(): number {
    return this.cooldownTimer;
  }

  get cooldownMax(): number {
    return COOLDOWN;
  }

  constructor(scene: THREE.Object3D) {
    this.ringMat = new THREE.MeshBasicMaterial({
      color: 0x44ddff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 1.0, 48),
      this.ringMat
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.visible = false;
    scene.add(this.ring);
  }

  /** Try to activate. Returns true if fired. */
  activate(playerPos: THREE.Vector3): boolean {
    if (this.cooldownTimer > 0 || this.active) return false;
    this.active = true;
    this.pulseTimer = 0;
    this.revealTimer = REVEAL_DURATION;
    this.cooldownTimer = COOLDOWN;
    this.pulseCenter.copy(playerPos);
    this.ring.position.set(playerPos.x, playerPos.y + 0.2, playerPos.z);
    this.ring.visible = true;
    return true;
  }

  update(dt: number): void {
    if (this.cooldownTimer > 0) {
      this.cooldownTimer = Math.max(0, this.cooldownTimer - dt);
    }

    if (this.revealTimer > 0) {
      this.revealTimer = Math.max(0, this.revealTimer - dt);
    }

    if (this.active) {
      this.pulseTimer += dt;
      const t = Math.min(this.pulseTimer / PULSE_DURATION, 1);
      const currentRadius = t * PULSE_RADIUS;
      const thickness = 0.8 + (1 - t) * 1.5;

      // Update ring geometry by scaling
      this.ring.scale.set(currentRadius, currentRadius, 1);
      this.ringMat.opacity = (1 - t) * 0.4;

      if (t >= 1) {
        this.active = false;
        this.ring.visible = false;
        this.ringMat.opacity = 0;
      }
    }
  }

  reset(): void {
    this.active = false;
    this.pulseTimer = 0;
    this.revealTimer = 0;
    this.cooldownTimer = 0;
    this.ring.visible = false;
    this.ringMat.opacity = 0;
  }

  dispose(): void {
    this.ring.removeFromParent();
  }
}
