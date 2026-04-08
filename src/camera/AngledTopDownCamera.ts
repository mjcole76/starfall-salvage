import * as THREE from "three";

/**
 * Fixed world-space offset from the player: angled top-down, no orbit,
 * no character-relative yaw. Smooth follow only (stable exponential lerp).
 */
export class AngledTopDownCamera {
  readonly camera: THREE.PerspectiveCamera;
  private target: THREE.Object3D;
  /** Camera = player position + this offset (world axes). */
  private readonly offset = new THREE.Vector3(-22, 36, -22);
  private readonly lookAtY = 1.05;
  private readonly smooth = 7.5;
  private readonly _desired = new THREE.Vector3();
  private readonly _look = new THREE.Vector3();
  private zoomFactor = 1;

  constructor(aspect: number, target: THREE.Object3D) {
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.1, 420);
    this.target = target;
    const t = target.position;
    this.camera.position.copy(t).add(this.offset);
    this._look.set(t.x, t.y + this.lookAtY, t.z);
    this.camera.lookAt(this._look);
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Zoom factor: 1 = normal, <1 = closer, >1 = farther. */
  setZoomFactor(f: number): void {
    this.zoomFactor = f;
  }

  update(dt: number): void {
    const t = this.target.position;
    this._desired.copy(t).addScaledVector(this.offset, this.zoomFactor);
    const k = 1 - Math.exp(-this.smooth * dt);
    this.camera.position.lerp(this._desired, k);
    this._look.set(t.x, t.y + this.lookAtY, t.z);
    this.camera.lookAt(this._look);
  }
}
