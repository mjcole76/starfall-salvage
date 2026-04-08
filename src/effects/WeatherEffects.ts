/**
 * WeatherEffects — lightning flashes, heat shimmer near vents, tumbleweeds.
 * All screen-space except tumbleweeds which are 3D objects.
 */

import * as THREE from "three";
import { sampleTerrainY } from "../mission/terrainSample";

// ---------------------------------------------------------------------------
// Lightning Flash (screen overlay)
// ---------------------------------------------------------------------------

export class LightningFlash {
  private el: HTMLDivElement;
  private flashTimer = 0;
  private nextFlash = 0;
  private active = false;

  constructor(container: HTMLElement) {
    this.el = document.createElement("div");
    Object.assign(this.el.style, {
      position: "absolute",
      inset: "0",
      background: "rgba(200,220,255,0)",
      pointerEvents: "none",
      zIndex: "11",
      transition: "none",
    });
    container.appendChild(this.el);
    this.nextFlash = 8 + Math.random() * 15;
  }

  /** Enable lightning only during endgame urgency. */
  update(dt: number, urgent: boolean): void {
    if (!urgent) {
      this.el.style.background = "rgba(200,220,255,0)";
      this.nextFlash = 3 + Math.random() * 8;
      return;
    }

    this.nextFlash -= dt;
    if (this.nextFlash <= 0 && !this.active) {
      this.active = true;
      this.flashTimer = 0;
      this.nextFlash = 4 + Math.random() * 10;
    }

    if (this.active) {
      this.flashTimer += dt;
      if (this.flashTimer < 0.06) {
        this.el.style.background = `rgba(200,220,255,${0.25 + Math.random() * 0.15})`;
      } else if (this.flashTimer < 0.12) {
        this.el.style.background = "rgba(200,220,255,0)";
      } else if (this.flashTimer < 0.18) {
        this.el.style.background = `rgba(200,220,255,${0.1 + Math.random() * 0.1})`;
      } else {
        this.el.style.background = "rgba(200,220,255,0)";
        this.active = false;
      }
    }
  }

  dispose(): void {
    this.el.remove();
  }
}

// ---------------------------------------------------------------------------
// Heat Shimmer (screen-space distortion overlay near thermal vents)
// ---------------------------------------------------------------------------

export class HeatShimmer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private intensity = 0;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement("canvas");
    Object.assign(this.canvas.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: "9",
      opacity: "0",
      transition: "opacity 0.5s ease",
    });
    container.appendChild(this.canvas);
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("HeatShimmer: no 2d context");
    this.ctx = ctx;
  }

  setIntensity(t: number): void {
    this.intensity = Math.max(0, Math.min(1, t));
    this.canvas.style.opacity = String(this.intensity * 0.3);
  }

  update(dt: number, elapsed: number): void {
    if (this.intensity < 0.01) return;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }

    this.ctx.clearRect(0, 0, w, h);
    // Draw wavy heat lines
    this.ctx.strokeStyle = `rgba(255,200,100,${0.08 * this.intensity})`;
    this.ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      this.ctx.beginPath();
      const baseY = (h * (i + 1)) / 9;
      for (let x = 0; x < w; x += 4) {
        const y = baseY + Math.sin((x * 0.02 + elapsed * 3 + i * 1.5)) * 3 * this.intensity;
        if (x === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }
      this.ctx.stroke();
    }
  }

  dispose(): void {
    this.canvas.remove();
  }
}

// ---------------------------------------------------------------------------
// Tumbleweeds (3D objects blown across the terrain)
// ---------------------------------------------------------------------------

interface Tumbleweed {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  spin: number;
  lifetime: number;
}

export class TumbleweedSystem {
  private scene: THREE.Object3D;
  private terrain: THREE.Mesh;
  private weeds: Tumbleweed[] = [];
  private spawnTimer = 0;
  private geo: THREE.DodecahedronGeometry;
  private mat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Object3D, terrain: THREE.Mesh) {
    this.scene = scene;
    this.terrain = terrain;
    this.geo = new THREE.DodecahedronGeometry(0.4, 0);
    this.mat = new THREE.MeshStandardMaterial({
      color: 0x6b5a3a,
      roughness: 0.95,
      metalness: 0.05,
    });
  }

  update(dt: number): void {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 3 + Math.random() * 5;
      this.spawnTumbleweed();
    }

    for (let i = this.weeds.length - 1; i >= 0; i--) {
      const tw = this.weeds[i];
      tw.lifetime -= dt;
      if (tw.lifetime <= 0) {
        tw.mesh.removeFromParent();
        this.weeds.splice(i, 1);
        continue;
      }

      // Move
      tw.mesh.position.addScaledVector(tw.velocity, dt);

      // Snap to terrain
      const y = sampleTerrainY(this.terrain, tw.mesh.position.x, tw.mesh.position.z);
      tw.mesh.position.y = y + 0.4;

      // Spin
      tw.mesh.rotation.x += tw.spin * dt * 2;
      tw.mesh.rotation.z += tw.spin * dt * 1.3;

      // Fade out near end of life
      if (tw.lifetime < 1) {
        (tw.mesh.material as THREE.MeshStandardMaterial).opacity = tw.lifetime;
      }
    }
  }

  private spawnTumbleweed(): void {
    if (this.weeds.length >= 6) return;

    const mat = this.mat.clone();
    mat.transparent = true;
    mat.opacity = 1;
    const mesh = new THREE.Mesh(this.geo, mat);

    // Spawn at edge of playable area
    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * 65;
    const z = Math.sin(angle) * 65;
    const y = sampleTerrainY(this.terrain, x, z);
    mesh.position.set(x, y + 0.4, z);
    mesh.scale.setScalar(0.5 + Math.random() * 0.8);
    mesh.castShadow = true;

    // Blow roughly toward center with some randomness
    const windX = -Math.cos(angle) * (4 + Math.random() * 4);
    const windZ = -Math.sin(angle) * (4 + Math.random() * 4);

    this.scene.add(mesh);
    this.weeds.push({
      mesh,
      velocity: new THREE.Vector3(windX, 0, windZ),
      spin: 1 + Math.random() * 3,
      lifetime: 10 + Math.random() * 8,
    });
  }

  dispose(): void {
    for (const tw of this.weeds) tw.mesh.removeFromParent();
    this.weeds = [];
  }
}
