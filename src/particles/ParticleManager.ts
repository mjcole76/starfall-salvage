import * as THREE from "three";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const _v3 = new THREE.Vector3();

/** Return a random float in [lo, hi). */
function rand(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo);
}

/** Shared small circle texture used by all point-based systems. */
function createCircleTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.4, "rgba(255,255,255,0.8)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------------------
// Per-particle state kept in plain arrays for fast iteration.
// ---------------------------------------------------------------------------

interface PooledSystem {
  maxCount: number;
  positions: Float32Array; // xyz interleaved
  opacities: Float32Array;
  velocities: Float32Array; // xyz interleaved
  lifetimes: Float32Array; // remaining life
  maxLifetimes: Float32Array; // original life (for fade calc)
  alive: Uint8Array; // 0 or 1
  geometry: THREE.BufferGeometry;
  points: THREE.Points;
  posAttr: THREE.BufferAttribute;
  opaAttr: THREE.BufferAttribute;
}

function createPooledSystem(
  scene: THREE.Scene,
  maxCount: number,
  pointSize: number,
  color: THREE.Color,
  blending: THREE.Blending,
  texture: THREE.Texture,
  depthWrite: boolean = false,
): PooledSystem {
  const positions = new Float32Array(maxCount * 3);
  const opacities = new Float32Array(maxCount);

  const geometry = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", posAttr);

  const opaAttr = new THREE.BufferAttribute(opacities, 1);
  opaAttr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("opacity", opaAttr);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: color },
      uPointSize: { value: pointSize },
      uMap: { value: texture },
    },
    vertexShader: /* glsl */ `
      attribute float opacity;
      varying float vOpacity;
      uniform float uPointSize;
      void main() {
        vOpacity = opacity;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPos;
        // Scale point size with distance so nearby particles look larger.
        gl_PointSize = uPointSize * (300.0 / -mvPos.z);
        gl_PointSize = clamp(gl_PointSize, 1.0, 64.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform sampler2D uMap;
      varying float vOpacity;
      void main() {
        vec4 texel = texture2D(uMap, gl_PointCoord);
        if (vOpacity <= 0.0) discard;
        gl_FragColor = vec4(uColor, texel.a * vOpacity);
      }
    `,
    transparent: true,
    blending,
    depthWrite,
    depthTest: true,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  return {
    maxCount,
    positions,
    opacities,
    velocities: new Float32Array(maxCount * 3),
    lifetimes: new Float32Array(maxCount),
    maxLifetimes: new Float32Array(maxCount),
    alive: new Uint8Array(maxCount),
    geometry,
    points,
    posAttr,
    opaAttr,
  };
}

/** Find first dead particle index, or -1. */
function findDead(sys: PooledSystem): number {
  for (let i = 0; i < sys.maxCount; i++) {
    if (!sys.alive[i]) return i;
  }
  return -1;
}

/** Emit a single particle into the pool. Returns false if pool is full. */
function emit(
  sys: PooledSystem,
  px: number,
  py: number,
  pz: number,
  vx: number,
  vy: number,
  vz: number,
  life: number,
  startOpacity: number = 1,
): boolean {
  const i = findDead(sys);
  if (i === -1) return false;
  const i3 = i * 3;
  sys.positions[i3] = px;
  sys.positions[i3 + 1] = py;
  sys.positions[i3 + 2] = pz;
  sys.velocities[i3] = vx;
  sys.velocities[i3 + 1] = vy;
  sys.velocities[i3 + 2] = vz;
  sys.lifetimes[i] = life;
  sys.maxLifetimes[i] = life;
  sys.opacities[i] = startOpacity;
  sys.alive[i] = 1;
  return true;
}

/** Tick all alive particles: move, age, fade, kill. */
function tickSystem(sys: PooledSystem, dt: number): void {
  for (let i = 0; i < sys.maxCount; i++) {
    if (!sys.alive[i]) {
      // Keep dead particles invisible and far away so they don't render.
      sys.opacities[i] = 0;
      continue;
    }
    sys.lifetimes[i] -= dt;
    if (sys.lifetimes[i] <= 0) {
      sys.alive[i] = 0;
      sys.opacities[i] = 0;
      continue;
    }
    const i3 = i * 3;
    sys.positions[i3] += sys.velocities[i3] * dt;
    sys.positions[i3 + 1] += sys.velocities[i3 + 1] * dt;
    sys.positions[i3 + 2] += sys.velocities[i3 + 2] * dt;

    // Linear fade out over lifetime.
    const t = sys.lifetimes[i] / sys.maxLifetimes[i];
    sys.opacities[i] = t;
  }
  sys.posAttr.needsUpdate = true;
  sys.opaAttr.needsUpdate = true;
}

// ---------------------------------------------------------------------------
// ParticleManager
// ---------------------------------------------------------------------------

export class ParticleManager {
  private scene: THREE.Scene;
  private circleTexture: THREE.Texture;

  // Systems
  private dustTrail: PooledSystem;
  private jetExhaust: PooledSystem;
  private burstCoreSystem: PooledSystem;
  private burstSalvageSystem: PooledSystem;
  private burstRepairSystem: PooledSystem;
  private burstFuelSystem: PooledSystem;
  private stormDust: PooledSystem;
  private ambientDust: PooledSystem;

  // Emission timers
  private dustTimer = 0;
  private jetTimer = 0;
  private ambientInitialised = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.circleTexture = createCircleTexture();

    // 1. Dust trail  --  warm brown, normal blend
    this.dustTrail = createPooledSystem(
      scene,
      30,
      3.0,
      new THREE.Color(0.65, 0.5, 0.3),
      THREE.NormalBlending,
      this.circleTexture,
    );

    // 2. Jet exhaust  --  orange-yellow, additive
    this.jetExhaust = createPooledSystem(
      scene,
      20,
      4.0,
      new THREE.Color(1.0, 0.7, 0.2),
      THREE.AdditiveBlending,
      this.circleTexture,
    );

    // 3a. Burst core  --  cyan/teal, additive
    this.burstCoreSystem = createPooledSystem(
      scene,
      30,
      5.0,
      new THREE.Color(0.2, 0.9, 1.0),
      THREE.AdditiveBlending,
      this.circleTexture,
    );

    // 3b. Burst salvage  --  golden/amber, additive
    this.burstSalvageSystem = createPooledSystem(
      scene,
      30,
      5.0,
      new THREE.Color(1.0, 0.8, 0.2),
      THREE.AdditiveBlending,
      this.circleTexture,
    );

    // 3c. Burst repair  --  green, additive
    this.burstRepairSystem = createPooledSystem(
      scene,
      30,
      5.0,
      new THREE.Color(0.2, 1.0, 0.4),
      THREE.AdditiveBlending,
      this.circleTexture,
    );

    // 3d. Burst fuel  --  red-orange, additive
    this.burstFuelSystem = createPooledSystem(
      scene,
      30,
      5.0,
      new THREE.Color(1.0, 0.4, 0.15),
      THREE.AdditiveBlending,
      this.circleTexture,
    );

    // 4. Storm dust  --  sandy brown, normal blend, low opacity
    this.stormDust = createPooledSystem(
      scene,
      80,
      2.5,
      new THREE.Color(0.7, 0.6, 0.4),
      THREE.NormalBlending,
      this.circleTexture,
    );

    // 5. Ambient dust  --  subtle, normal blend
    this.ambientDust = createPooledSystem(
      scene,
      40,
      2.0,
      new THREE.Color(0.6, 0.55, 0.45),
      THREE.NormalBlending,
      this.circleTexture,
    );
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  update(
    dt: number,
    playerPos: THREE.Vector3,
    playerVel: THREE.Vector3,
    isGrounded: boolean,
    isJetting: boolean,
    stormRadius: number,
    stormCenterX: number,
    stormCenterZ: number,
  ): void {
    // Clamp dt to avoid huge bursts after tab-away.
    const cdt = Math.min(dt, 0.1);

    // --- Dust trail ---
    this.updateDustTrail(cdt, playerPos, playerVel, isGrounded);

    // --- Jet exhaust ---
    this.updateJetExhaust(cdt, playerPos, isJetting);

    // --- Storm dust ---
    this.updateStormDust(cdt, playerPos, stormRadius, stormCenterX, stormCenterZ);

    // --- Ambient dust ---
    this.updateAmbientDust(cdt, playerPos);

    // Tick all systems
    tickSystem(this.dustTrail, cdt);
    tickSystem(this.jetExhaust, cdt);
    tickSystem(this.burstCoreSystem, cdt);
    tickSystem(this.burstSalvageSystem, cdt);
    tickSystem(this.burstRepairSystem, cdt);
    tickSystem(this.burstFuelSystem, cdt);
    tickSystem(this.stormDust, cdt);
    tickSystem(this.ambientDust, cdt);
  }

  /** Bright cyan/teal burst expanding outward in a sphere. */
  burstCore(pos: THREE.Vector3): void {
    this.emitBurst(this.burstCoreSystem, pos, 25);
  }

  /** Golden/amber burst expanding outward. */
  burstSalvage(pos: THREE.Vector3): void {
    this.emitBurst(this.burstSalvageSystem, pos, 25);
  }

  /** Green repair burst. */
  burstRepair(pos: THREE.Vector3): void {
    this.emitBurst(this.burstRepairSystem, pos, 25);
  }

  /** Red-orange fuel burst. */
  burstFuel(pos: THREE.Vector3): void {
    this.emitBurst(this.burstFuelSystem, pos, 25);
  }

  /** Remove all GPU resources. */
  dispose(): void {
    const systems = [
      this.dustTrail,
      this.jetExhaust,
      this.burstCoreSystem,
      this.burstSalvageSystem,
      this.burstRepairSystem,
      this.burstFuelSystem,
      this.stormDust,
      this.ambientDust,
    ];
    for (const sys of systems) {
      this.scene.remove(sys.points);
      sys.geometry.dispose();
      (sys.points.material as THREE.Material).dispose();
    }
    this.circleTexture.dispose();
  }

  // -----------------------------------------------------------------------
  // Internal emitters
  // -----------------------------------------------------------------------

  private updateDustTrail(
    dt: number,
    playerPos: THREE.Vector3,
    playerVel: THREE.Vector3,
    isGrounded: boolean,
  ): void {
    if (!isGrounded) return;
    // Only emit if the player is moving at a reasonable speed.
    const speed = Math.sqrt(playerVel.x * playerVel.x + playerVel.z * playerVel.z);
    if (speed < 1.0) return;

    // Emit a few particles per frame, throttled by timer.
    this.dustTimer += dt;
    const interval = 0.02; // ~50 per second max
    while (this.dustTimer >= interval) {
      this.dustTimer -= interval;
      const life = rand(0.3, 0.6);
      emit(
        this.dustTrail,
        playerPos.x + rand(-0.3, 0.3),
        playerPos.y + rand(0.0, 0.15),
        playerPos.z + rand(-0.3, 0.3),
        rand(-0.3, 0.3),
        rand(0.3, 0.8), // drift upward
        rand(-0.3, 0.3),
        life,
      );
    }
  }

  private updateJetExhaust(
    dt: number,
    playerPos: THREE.Vector3,
    isJetting: boolean,
  ): void {
    if (!isJetting) return;

    this.jetTimer += dt;
    const interval = 0.015;
    while (this.jetTimer >= interval) {
      this.jetTimer -= interval;
      const life = rand(0.2, 0.4);
      emit(
        this.jetExhaust,
        playerPos.x + rand(-0.15, 0.15),
        playerPos.y - 0.3, // below player
        playerPos.z + rand(-0.15, 0.15),
        rand(-0.5, 0.5), // slight spread
        rand(-3.0, -1.5), // downward
        rand(-0.5, 0.5),
        life,
      );
    }
  }

  private emitBurst(sys: PooledSystem, pos: THREE.Vector3, count: number): void {
    for (let i = 0; i < count; i++) {
      // Random direction on a unit sphere.
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = rand(2.0, 5.0);
      const vx = Math.sin(phi) * Math.cos(theta) * speed;
      const vy = Math.sin(phi) * Math.sin(theta) * speed;
      const vz = Math.cos(phi) * speed;
      const life = rand(0.4, 0.8);
      emit(sys, pos.x, pos.y, pos.z, vx, vy, vz, life);
    }
  }

  private updateStormDust(
    dt: number,
    playerPos: THREE.Vector3,
    stormRadius: number,
    stormCenterX: number,
    stormCenterZ: number,
  ): void {
    if (stormRadius <= 0) return;

    // Keep a ring of particles near the storm wall.
    // Count alive particles and respawn dead ones at the storm edge near the player.
    for (let i = 0; i < this.stormDust.maxCount; i++) {
      if (this.stormDust.alive[i]) continue;

      // Spawn near the storm edge, biased toward player view.
      const angle = Math.random() * Math.PI * 2;
      const edgeR = stormRadius + rand(-3, 3);
      const px = stormCenterX + Math.cos(angle) * edgeR;
      const pz = stormCenterZ + Math.sin(angle) * edgeR;

      // Only spawn particles near the player (within ~40 units) to save effort.
      const dxP = px - playerPos.x;
      const dzP = pz - playerPos.z;
      if (dxP * dxP + dzP * dzP > 40 * 40) continue;

      const py = playerPos.y + rand(-2, 4);

      // Wind direction: inward toward storm center.
      const toCenter = _v3.set(stormCenterX - px, 0, stormCenterZ - pz).normalize();
      const windSpeed = rand(1.5, 4.0);

      const life = rand(1.5, 3.0);
      emit(
        this.stormDust,
        px,
        py,
        pz,
        toCenter.x * windSpeed + rand(-0.5, 0.5),
        rand(-0.2, 0.3),
        toCenter.z * windSpeed + rand(-0.5, 0.5),
        life,
        0.35, // low starting opacity
      );
    }
  }

  private updateAmbientDust(dt: number, playerPos: THREE.Vector3): void {
    // Respawn dead ambient particles around the player.
    for (let i = 0; i < this.ambientDust.maxCount; i++) {
      if (this.ambientDust.alive[i]) continue;

      const life = rand(3.0, 6.0);
      emit(
        this.ambientDust,
        playerPos.x + rand(-15, 15),
        playerPos.y + rand(-2, 6),
        playerPos.z + rand(-15, 15),
        rand(-0.15, 0.15),
        rand(0.05, 0.2), // very slow upward drift
        rand(-0.15, 0.15),
        life,
        0.2, // low opacity
      );
    }
  }
}
