/**
 * Decoy Beacon — activated with F key.
 * Drops a beacon at the player's position that distracts patrol drones
 * for a few seconds, drawing them away from the player.
 */

import * as THREE from "three";
import { sampleTerrainY } from "../mission/terrainSample";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DECOY_DURATION = 6;    // seconds the decoy stays active
const DECOY_COOLDOWN = 18;   // seconds between uses
const DECOY_RADIUS = 20;     // range at which drones are attracted
const PULSE_SPEED = 4;       // visual pulse speed

// ---------------------------------------------------------------------------
// Decoy Beacon
// ---------------------------------------------------------------------------

export class DecoyBeacon {
  private beacon: THREE.Group;
  private coreMesh: THREE.Mesh;
  private ringMesh: THREE.Mesh;

  // State
  private _active = false;
  private activeTimer = 0;
  private cooldownTimer = 0;
  private position = new THREE.Vector3();

  get active(): boolean { return this._active; }
  get decoyPosition(): THREE.Vector3 { return this.position; }
  get decoyRadius(): number { return DECOY_RADIUS; }
  get cooldownRemaining(): number { return this.cooldownTimer; }
  get cooldownMax(): number { return DECOY_COOLDOWN; }

  constructor(scene: THREE.Object3D) {
    this.beacon = new THREE.Group();
    this.beacon.visible = false;

    // Pulsing core
    this.coreMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0xff4400,
        emissive: 0xff6622,
        emissiveIntensity: 1.5,
        metalness: 0.2,
        roughness: 0.3,
      })
    );
    this.coreMesh.position.y = 0.6;
    this.beacon.add(this.coreMesh);

    // Ground ring
    this.ringMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1.0, 16),
      new THREE.MeshBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    this.ringMesh.rotation.x = -Math.PI / 2;
    this.ringMesh.position.y = 0.05;
    this.beacon.add(this.ringMesh);

    // Antenna
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.08, 0.8, 6),
      new THREE.MeshStandardMaterial({
        color: 0x444444,
        metalness: 0.6,
        roughness: 0.4,
      })
    );
    antenna.position.y = 0.4;
    this.beacon.add(antenna);

    scene.add(this.beacon);
  }

  /** Try to deploy. Returns true if placed. */
  deploy(playerPos: THREE.Vector3, terrain: THREE.Mesh): boolean {
    if (this.cooldownTimer > 0 || this._active) return false;
    this._active = true;
    this.activeTimer = DECOY_DURATION;
    this.cooldownTimer = DECOY_COOLDOWN;

    const y = sampleTerrainY(terrain, playerPos.x, playerPos.z);
    this.position.set(playerPos.x, y, playerPos.z);
    this.beacon.position.copy(this.position);
    this.beacon.visible = true;
    return true;
  }

  update(dt: number, elapsed: number): void {
    if (this.cooldownTimer > 0) {
      this.cooldownTimer = Math.max(0, this.cooldownTimer - dt);
    }

    if (this._active) {
      this.activeTimer -= dt;
      // Pulsing effect
      const pulse = 0.8 + 0.4 * Math.sin(elapsed * PULSE_SPEED);
      (this.coreMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse * 1.5;
      this.ringMesh.scale.set(pulse, pulse, 1);
      (this.ringMesh.material as THREE.MeshBasicMaterial).opacity = (1 - pulse * 0.3) * 0.5;

      if (this.activeTimer <= 0) {
        this._active = false;
        this.beacon.visible = false;
      }
    }
  }

  reset(): void {
    this._active = false;
    this.activeTimer = 0;
    this.cooldownTimer = 0;
    this.beacon.visible = false;
  }

  dispose(): void {
    this.beacon.removeFromParent();
  }
}
