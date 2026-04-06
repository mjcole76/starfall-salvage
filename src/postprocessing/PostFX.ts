import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

/* ------------------------------------------------------------------ */
/*  Chromatic Aberration Shader                                       */
/* ------------------------------------------------------------------ */

const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uIntensity: { value: 0.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uIntensity;
    varying vec2 vUv;

    void main() {
      // Offset increases toward edges for a lens-like look
      vec2 dir = vUv - 0.5;
      float d = length(dir);
      float offset = uIntensity * 0.01 * d;

      float r = texture2D(tDiffuse, vUv + dir * offset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - dir * offset).b;
      float a = texture2D(tDiffuse, vUv).a;

      gl_FragColor = vec4(r, g, b, a);
    }
  `,
};

/* ------------------------------------------------------------------ */
/*  Vignette Shader                                                   */
/* ------------------------------------------------------------------ */

const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uDarkness: { value: 0.35 },
    uOffset: { value: 0.65 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uDarkness;
    uniform float uOffset;
    varying vec2 vUv;

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);

      // Distance from centre, normalised so corners are ~1
      float d = distance(vUv, vec2(0.5));
      float vignette = smoothstep(uOffset, uOffset - 0.45, d);

      texel.rgb *= mix(1.0 - uDarkness, 1.0, vignette);
      gl_FragColor = texel;
    }
  `,
};

/* ------------------------------------------------------------------ */
/*  PostFX Class                                                      */
/* ------------------------------------------------------------------ */

export class PostFX {
  /** Game reads this each frame to offset the camera for screen-shake. */
  readonly shakeOffset = new THREE.Vector2(0, 0);

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private composer: EffectComposer;

  // Passes
  private bloomPass: UnrealBloomPass;
  private chromaticPass: ShaderPass;
  private vignettePass: ShaderPass;

  // Shake state
  private shakeIntensity = 0;
  private shakeDuration = 0;
  private shakeTimer = 0;

  // Cached damage value for uniform updates
  private damageIntensity = 0;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    const size = renderer.getSize(new THREE.Vector2());

    // --- Composer -----------------------------------------------------------
    this.composer = new EffectComposer(renderer);

    // 1. Render pass
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    // 2. Bloom – glowing emissives (ship cores, extraction beacon, visor)
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.x, size.y),
      0.45, // strength
      0.4, // radius
      0.72, // threshold
    );
    this.composer.addPass(this.bloomPass);

    // 3. Chromatic aberration – driven by damage
    this.chromaticPass = new ShaderPass(ChromaticAberrationShader);
    this.composer.addPass(this.chromaticPass);

    // 4. Vignette – subtle by default, intensifies with damage
    this.vignettePass = new ShaderPass(VignetteShader);
    this.composer.addPass(this.vignettePass);
  }

  /* ---------------------------------------------------------------- */
  /*  Public API                                                      */
  /* ---------------------------------------------------------------- */

  /** Call when the canvas / window is resized. */
  setSize(w: number, h: number): void {
    this.composer.setSize(w, h);
    this.bloomPass.resolution.set(w, h);
  }

  /**
   * Drive damage-related effects.
   * @param t 0 = full health, 1 = near death.
   */
  setDamageIntensity(t: number): void {
    this.damageIntensity = THREE.MathUtils.clamp(t, 0, 1);
  }

  /**
   * Trigger a screen-shake.
   * @param intensity  Amplitude in world-ish units (e.g. 0.05 – 0.3).
   * @param durationSec  How long the shake lasts in seconds.
   */
  shake(intensity: number, durationSec: number): void {
    // Allow stacking: keep the stronger of current vs new
    if (intensity > this.shakeIntensity) {
      this.shakeIntensity = intensity;
    }
    if (durationSec > this.shakeTimer) {
      this.shakeDuration = durationSec;
      this.shakeTimer = durationSec;
    }
  }

  /**
   * Call once per frame. Decays screen-shake, updates shader uniforms.
   * @param dt  Frame delta-time in seconds.
   */
  update(dt: number): void {
    // --- Shake decay -------------------------------------------------------
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const progress = Math.max(this.shakeTimer / this.shakeDuration, 0);
      const amp = this.shakeIntensity * progress;

      this.shakeOffset.set(
        (Math.random() * 2 - 1) * amp,
        (Math.random() * 2 - 1) * amp,
      );

      if (this.shakeTimer <= 0) {
        this.shakeIntensity = 0;
        this.shakeOffset.set(0, 0);
      }
    }

    // --- Chromatic aberration intensity ------------------------------------
    // Ramp from 0 at no damage to strong split near death
    const chromaStrength = this.damageIntensity * this.damageIntensity; // ease-in
    this.chromaticPass.uniforms["uIntensity"].value = chromaStrength;

    // --- Vignette intensity ------------------------------------------------
    // Base values at full health, heavier when damaged
    const baseDarkness = 0.35;
    const baseOffset = 0.65;
    this.vignettePass.uniforms["uDarkness"].value =
      baseDarkness + this.damageIntensity * 0.55; // up to 0.9
    this.vignettePass.uniforms["uOffset"].value =
      baseOffset + this.damageIntensity * 0.2; // up to 0.85 (wider dark ring)
  }

  /**
   * Render the scene through the post-processing pipeline.
   * Call this **instead of** `renderer.render(scene, camera)`.
   */
  render(): void {
    this.composer.render();
  }
}
