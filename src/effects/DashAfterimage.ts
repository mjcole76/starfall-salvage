/**
 * DashAfterimage - Ghost/afterimage trail during a player dash.
 *
 * Spawns translucent capsule-shaped ghosts along the dash path that
 * fade out over 0.3 seconds. Uses simple geometry rather than cloning
 * the full player mesh hierarchy.
 */

import * as THREE from "three";

const GHOST_FADE_TIME = 0.3;
const GHOST_INITIAL_OPACITY = 0.3;
const GHOST_SPAWN_INTERVAL = 0.04; // seconds between ghost spawns
const GHOST_WIDTH = 0.4;
const GHOST_HEIGHT = 1.7;
const GHOST_COLOR = new THREE.Color(0x00cccc); // teal/cyan tint

interface Ghost {
  mesh: THREE.Mesh;
  age: number;
}

// Shared geometry and material template (created lazily)
let sharedGeometry: THREE.CapsuleGeometry | null = null;

function getSharedGeometry(): THREE.CapsuleGeometry {
  if (!sharedGeometry) {
    // CapsuleGeometry(radius, length, capSegments, radialSegments)
    // Total height = length + 2*radius
    const radius = GHOST_WIDTH / 2;
    const length = GHOST_HEIGHT - GHOST_WIDTH; // body length excluding caps
    sharedGeometry = new THREE.CapsuleGeometry(radius, length, 4, 8);
  }
  return sharedGeometry;
}

export class DashAfterimage {
  private scene: THREE.Scene;
  private ghosts: Ghost[] = [];
  private timeSinceLastSpawn = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** Call once when the dash starts. Spawns the first ghost immediately. */
  onDashStart(position: THREE.Vector3, rotation: number): void {
    this.timeSinceLastSpawn = 0;
    this.spawnGhost(position, rotation);
  }

  /**
   * Call every frame during the active dash to spawn trail ghosts.
   * Ghosts are placed at the player's current position at regular intervals.
   */
  onDashFrame(position: THREE.Vector3, rotation: number, dt: number): void {
    this.timeSinceLastSpawn += dt;
    while (this.timeSinceLastSpawn >= GHOST_SPAWN_INTERVAL) {
      this.timeSinceLastSpawn -= GHOST_SPAWN_INTERVAL;
      this.spawnGhost(position, rotation);
    }
  }

  /** Call every frame to fade and clean up existing ghosts. */
  update(dt: number): void {
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const g = this.ghosts[i];
      g.age += dt;

      if (g.age >= GHOST_FADE_TIME) {
        // Remove expired ghost
        this.scene.remove(g.mesh);
        (g.mesh.material as THREE.MeshBasicMaterial).dispose();
        this.ghosts.splice(i, 1);
        continue;
      }

      // Fade opacity linearly
      const t = g.age / GHOST_FADE_TIME;
      const mat = g.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = GHOST_INITIAL_OPACITY * (1 - t);
    }
  }

  /** Clean up all ghosts and release shared resources. */
  dispose(): void {
    for (const g of this.ghosts) {
      this.scene.remove(g.mesh);
      (g.mesh.material as THREE.MeshBasicMaterial).dispose();
    }
    this.ghosts.length = 0;
  }

  // -- private helpers --

  private spawnGhost(position: THREE.Vector3, rotation: number): void {
    const material = new THREE.MeshBasicMaterial({
      color: GHOST_COLOR,
      transparent: true,
      opacity: GHOST_INITIAL_OPACITY,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(getSharedGeometry(), material);
    mesh.position.copy(position);
    // Offset upward so the capsule base aligns roughly with the ground
    mesh.position.y += GHOST_HEIGHT / 2;
    mesh.rotation.y = rotation;

    // Don't cast or receive shadows — purely visual
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    this.scene.add(mesh);
    this.ghosts.push({ mesh, age: 0 });
  }
}
