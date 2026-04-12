/**
 * Per-tier biome visual themes.
 * Each tier gets a distinct colour palette applied to terrain, sky, fog,
 * lighting, environment props, and post-processing bloom.
 */

/* ================================================================== */
/*  Public types                                                       */
/* ================================================================== */

export interface BiomeTheme {
  readonly name: string;

  /* --- Sky / Fog --- */
  readonly skyColor: number;
  readonly fogColor: number;
  readonly stressColor: number;

  /* --- Lighting --- */
  readonly ambientColor: number;
  readonly ambientIntensity: number;
  readonly hemiSkyColor: number;
  readonly hemiGroundColor: number;
  readonly hemiIntensity: number;
  readonly sunColor: number;
  readonly sunIntensity: number;

  /* --- Terrain vertex-colour ramp (low → high) --- */
  readonly terrainLowR: number;
  readonly terrainLowG: number;
  readonly terrainLowB: number;
  readonly terrainHighR: number;
  readonly terrainHighG: number;
  readonly terrainHighB: number;
  /** Emissive tint baked into terrain material. */
  readonly terrainEmissive: number;
  readonly terrainEmissiveIntensity: number;

  /* --- Environment props --- */
  readonly rockColor: number;
  readonly rockLightColor: number;
  readonly rockDarkColor: number;
  readonly hullColor: number;
  readonly hullRustColor: number;
  readonly debrisColor: number;

  /* --- Bloom tuning --- */
  readonly bloomStrength: number;
  readonly bloomRadius: number;
  readonly bloomThreshold: number;

  /* --- Particle / atmosphere hint --- */
  readonly particleTint: number;
}

/* ================================================================== */
/*  Theme definitions (one per tier)                                   */
/* ================================================================== */

const RED_DESERT: BiomeTheme = {
  name: "Red Desert",
  skyColor: 0x4a4a5c,
  fogColor: 0x4a4a5c,
  stressColor: 0x353045,
  ambientColor: 0xffffff,
  ambientIntensity: 0.58,
  hemiSkyColor: 0xc8d4e0,
  hemiGroundColor: 0x5c4034,
  hemiIntensity: 0.92,
  sunColor: 0xffe8c8,
  sunIntensity: 2.15,
  terrainLowR: 0.38, terrainLowG: 0.20, terrainLowB: 0.14,
  terrainHighR: 0.70, terrainHighG: 0.42, terrainHighB: 0.34,
  terrainEmissive: 0x1a1512,
  terrainEmissiveIntensity: 0.14,
  rockColor: 0x52322c,
  rockLightColor: 0x6b4438,
  rockDarkColor: 0x3e2824,
  hullColor: 0x252226,
  hullRustColor: 0x4a3228,
  debrisColor: 0x3a3532,
  bloomStrength: 0.45,
  bloomRadius: 0.4,
  bloomThreshold: 0.72,
  particleTint: 0xd4a882,
};

const FROZEN_WASTES: BiomeTheme = {
  name: "Frozen Wastes",
  skyColor: 0x3a4a5e,
  fogColor: 0x4a5a6e,
  stressColor: 0x283848,
  ambientColor: 0xd0e0ff,
  ambientIntensity: 0.65,
  hemiSkyColor: 0xc0d8f0,
  hemiGroundColor: 0x405868,
  hemiIntensity: 0.88,
  sunColor: 0xd8e8ff,
  sunIntensity: 1.95,
  terrainLowR: 0.42, terrainLowG: 0.48, terrainLowB: 0.55,
  terrainHighR: 0.68, terrainHighG: 0.74, terrainHighB: 0.82,
  terrainEmissive: 0x101822,
  terrainEmissiveIntensity: 0.10,
  rockColor: 0x4a5a68,
  rockLightColor: 0x6a7a88,
  rockDarkColor: 0x344452,
  hullColor: 0x202830,
  hullRustColor: 0x3a4a58,
  debrisColor: 0x384858,
  bloomStrength: 0.50,
  bloomRadius: 0.45,
  bloomThreshold: 0.68,
  particleTint: 0xc0d8f0,
};

const TOXIC_SWAMP: BiomeTheme = {
  name: "Toxic Swamp",
  skyColor: 0x2a3028,
  fogColor: 0x2e382a,
  stressColor: 0x1a2218,
  ambientColor: 0xb0d0a0,
  ambientIntensity: 0.52,
  hemiSkyColor: 0x80a868,
  hemiGroundColor: 0x3a4830,
  hemiIntensity: 0.85,
  sunColor: 0xc8d8a8,
  sunIntensity: 1.65,
  terrainLowR: 0.18, terrainLowG: 0.28, terrainLowB: 0.14,
  terrainHighR: 0.42, terrainHighG: 0.55, terrainHighB: 0.30,
  terrainEmissive: 0x0a1808,
  terrainEmissiveIntensity: 0.18,
  rockColor: 0x2e3a28,
  rockLightColor: 0x485a3a,
  rockDarkColor: 0x1e2a1a,
  hullColor: 0x1a2018,
  hullRustColor: 0x3a4a2a,
  debrisColor: 0x2a3828,
  bloomStrength: 0.55,
  bloomRadius: 0.5,
  bloomThreshold: 0.62,
  particleTint: 0x88cc44,
};

const VOLCANIC_ASHLANDS: BiomeTheme = {
  name: "Volcanic Ashlands",
  skyColor: 0x3a2020,
  fogColor: 0x4a2828,
  stressColor: 0x2a1515,
  ambientColor: 0xffa880,
  ambientIntensity: 0.48,
  hemiSkyColor: 0x8a4830,
  hemiGroundColor: 0x4a2018,
  hemiIntensity: 0.80,
  sunColor: 0xffc090,
  sunIntensity: 2.35,
  terrainLowR: 0.18, terrainLowG: 0.12, terrainLowB: 0.10,
  terrainHighR: 0.48, terrainHighG: 0.28, terrainHighB: 0.18,
  terrainEmissive: 0x1a0a05,
  terrainEmissiveIntensity: 0.22,
  rockColor: 0x382018,
  rockLightColor: 0x583020,
  rockDarkColor: 0x281410,
  hullColor: 0x1a1210,
  hullRustColor: 0x482818,
  debrisColor: 0x302018,
  bloomStrength: 0.60,
  bloomRadius: 0.5,
  bloomThreshold: 0.58,
  particleTint: 0xff6622,
};

const CRYSTAL_CAVERNS: BiomeTheme = {
  name: "Crystal Caverns",
  skyColor: 0x2a1a3a,
  fogColor: 0x321e48,
  stressColor: 0x1a0e28,
  ambientColor: 0xd0a8ff,
  ambientIntensity: 0.55,
  hemiSkyColor: 0xa878d8,
  hemiGroundColor: 0x3a2850,
  hemiIntensity: 0.82,
  sunColor: 0xe0c0ff,
  sunIntensity: 1.80,
  terrainLowR: 0.22, terrainLowG: 0.14, terrainLowB: 0.32,
  terrainHighR: 0.52, terrainHighG: 0.38, terrainHighB: 0.68,
  terrainEmissive: 0x120a1e,
  terrainEmissiveIntensity: 0.20,
  rockColor: 0x3a2848,
  rockLightColor: 0x5a3c68,
  rockDarkColor: 0x281a38,
  hullColor: 0x1a1428,
  hullRustColor: 0x3a2848,
  debrisColor: 0x2e2040,
  bloomStrength: 0.65,
  bloomRadius: 0.55,
  bloomThreshold: 0.55,
  particleTint: 0xcc66ff,
};

const VOID_RIFT: BiomeTheme = {
  name: "Void Rift",
  skyColor: 0x0a0810,
  fogColor: 0x120e1a,
  stressColor: 0x08050e,
  ambientColor: 0xff80c0,
  ambientIntensity: 0.42,
  hemiSkyColor: 0x6a2858,
  hemiGroundColor: 0x180a18,
  hemiIntensity: 0.72,
  sunColor: 0xff88cc,
  sunIntensity: 2.50,
  terrainLowR: 0.08, terrainLowG: 0.05, terrainLowB: 0.10,
  terrainHighR: 0.28, terrainHighG: 0.12, terrainHighB: 0.30,
  terrainEmissive: 0x0a0510,
  terrainEmissiveIntensity: 0.28,
  rockColor: 0x1a0e20,
  rockLightColor: 0x2a1838,
  rockDarkColor: 0x100818,
  hullColor: 0x0e0810,
  hullRustColor: 0x220e28,
  debrisColor: 0x180e22,
  bloomStrength: 0.75,
  bloomRadius: 0.6,
  bloomThreshold: 0.48,
  particleTint: 0xff44aa,
};

const GLASS_SEA: BiomeTheme = {
  name: "Glass Sea",
  skyColor: 0x4a5868,
  fogColor: 0x586878,
  stressColor: 0x303a48,
  ambientColor: 0xc0d0e0,
  ambientIntensity: 0.55,
  hemiSkyColor: 0xa0b0c8,
  hemiGroundColor: 0x506070,
  hemiIntensity: 0.85,
  sunColor: 0xd0d8e8,
  sunIntensity: 1.85,
  terrainLowR: 0.32, terrainLowG: 0.38, terrainLowB: 0.46,
  terrainHighR: 0.55, terrainHighG: 0.62, terrainHighB: 0.72,
  terrainEmissive: 0x182028,
  terrainEmissiveIntensity: 0.14,
  rockColor: 0x4a5868,
  rockLightColor: 0x6a7888,
  rockDarkColor: 0x303a48,
  hullColor: 0x202830,
  hullRustColor: 0x4a5868,
  debrisColor: 0x4a5868,
  bloomStrength: 0.55,
  bloomRadius: 0.45,
  bloomThreshold: 0.62,
  particleTint: 0xa0b8d0,
};

const BIOLUMINESCENT_JUNGLE: BiomeTheme = {
  name: "Bioluminescent Jungle",
  skyColor: 0x05121a,
  fogColor: 0x081820,
  stressColor: 0x020a10,
  ambientColor: 0x40d0c8,
  ambientIntensity: 0.32,
  hemiSkyColor: 0x208888,
  hemiGroundColor: 0x081818,
  hemiIntensity: 0.52,
  sunColor: 0x60ffd8,
  sunIntensity: 0.85,
  terrainLowR: 0.04, terrainLowG: 0.12, terrainLowB: 0.14,
  terrainHighR: 0.10, terrainHighG: 0.38, terrainHighB: 0.32,
  terrainEmissive: 0x062018,
  terrainEmissiveIntensity: 0.45,
  rockColor: 0x102822,
  rockLightColor: 0x205040,
  rockDarkColor: 0x081814,
  hullColor: 0x0a1818,
  hullRustColor: 0x186050,
  debrisColor: 0x103028,
  bloomStrength: 0.95,
  bloomRadius: 0.65,
  bloomThreshold: 0.35,
  particleTint: 0x44ffcc,
};

const MAGNETIC_STORM: BiomeTheme = {
  name: "Magnetic Storm",
  skyColor: 0x1a1e2a,
  fogColor: 0x222838,
  stressColor: 0x0a0e18,
  ambientColor: 0x88a0ff,
  ambientIntensity: 0.50,
  hemiSkyColor: 0x4060a0,
  hemiGroundColor: 0x1a2030,
  hemiIntensity: 0.78,
  sunColor: 0xa0c0ff,
  sunIntensity: 1.50,
  terrainLowR: 0.18, terrainLowG: 0.20, terrainLowB: 0.28,
  terrainHighR: 0.42, terrainHighG: 0.46, terrainHighB: 0.58,
  terrainEmissive: 0x0a1020,
  terrainEmissiveIntensity: 0.20,
  rockColor: 0x2a3040,
  rockLightColor: 0x404858,
  rockDarkColor: 0x1a1f28,
  hullColor: 0x181c24,
  hullRustColor: 0x303848,
  debrisColor: 0x202838,
  bloomStrength: 0.80,
  bloomRadius: 0.55,
  bloomThreshold: 0.45,
  particleTint: 0x4488ff,
};

const BLOOD_MOON: BiomeTheme = {
  name: "Blood Moon",
  skyColor: 0x180408,
  fogColor: 0x200810,
  stressColor: 0x0c0204,
  ambientColor: 0xff4060,
  ambientIntensity: 0.42,
  hemiSkyColor: 0xa01828,
  hemiGroundColor: 0x180408,
  hemiIntensity: 0.65,
  sunColor: 0xff5070,
  sunIntensity: 1.85,
  terrainLowR: 0.08, terrainLowG: 0.04, terrainLowB: 0.06,
  terrainHighR: 0.32, terrainHighG: 0.10, terrainHighB: 0.14,
  terrainEmissive: 0x180404,
  terrainEmissiveIntensity: 0.28,
  rockColor: 0x200810,
  rockLightColor: 0x381018,
  rockDarkColor: 0x100408,
  hullColor: 0x100408,
  hullRustColor: 0x381820,
  debrisColor: 0x200a10,
  bloomStrength: 0.82,
  bloomRadius: 0.6,
  bloomThreshold: 0.42,
  particleTint: 0xff2244,
};

const FROZEN_HELLSCAPE: BiomeTheme = {
  name: "Frozen Hellscape",
  skyColor: 0x2a2030,
  fogColor: 0x382838,
  stressColor: 0x180a18,
  ambientColor: 0xffaaaa,
  ambientIntensity: 0.55,
  hemiSkyColor: 0x88a0c0,
  hemiGroundColor: 0x603020,
  hemiIntensity: 0.85,
  sunColor: 0xffd0a0,
  sunIntensity: 2.10,
  terrainLowR: 0.28, terrainLowG: 0.20, terrainLowB: 0.18,
  terrainHighR: 0.62, terrainHighG: 0.68, terrainHighB: 0.78,
  terrainEmissive: 0x180808,
  terrainEmissiveIntensity: 0.32,
  rockColor: 0x484048,
  rockLightColor: 0x8090a0,
  rockDarkColor: 0x281818,
  hullColor: 0x202028,
  hullRustColor: 0x603830,
  debrisColor: 0x383038,
  bloomStrength: 0.85,
  bloomRadius: 0.6,
  bloomThreshold: 0.40,
  particleTint: 0xff8866,
};

const SINGULARITY: BiomeTheme = {
  name: "Singularity",
  skyColor: 0x000004,
  fogColor: 0x040010,
  stressColor: 0x000000,
  ambientColor: 0xff80ff,
  ambientIntensity: 0.38,
  hemiSkyColor: 0x6020a0,
  hemiGroundColor: 0x080010,
  hemiIntensity: 0.62,
  sunColor: 0xc060ff,
  sunIntensity: 2.80,
  terrainLowR: 0.02, terrainLowG: 0.00, terrainLowB: 0.06,
  terrainHighR: 0.20, terrainHighG: 0.04, terrainHighB: 0.30,
  terrainEmissive: 0x100020,
  terrainEmissiveIntensity: 0.35,
  rockColor: 0x100020,
  rockLightColor: 0x301050,
  rockDarkColor: 0x080010,
  hullColor: 0x040008,
  hullRustColor: 0x200840,
  debrisColor: 0x100018,
  bloomStrength: 1.00,
  bloomRadius: 0.7,
  bloomThreshold: 0.30,
  particleTint: 0xcc44ff,
};

/* ================================================================== */
/*  Tier → theme mapping                                               */
/* ================================================================== */

const BIOME_THEMES: readonly BiomeTheme[] = [
  RED_DESERT,             // Tier 1
  FROZEN_WASTES,          // Tier 2
  TOXIC_SWAMP,            // Tier 3
  VOLCANIC_ASHLANDS,      // Tier 4
  CRYSTAL_CAVERNS,        // Tier 5
  VOID_RIFT,              // Tier 6
  GLASS_SEA,              // Tier 7
  BIOLUMINESCENT_JUNGLE,  // Tier 8
  MAGNETIC_STORM,         // Tier 9
  BLOOD_MOON,             // Tier 10
  FROZEN_HELLSCAPE,       // Tier 11
  SINGULARITY,            // Tier 12
];

/** Return the biome theme for a given tier index (0-based, wraps). */
export function getBiomeTheme(tierIndex: number): BiomeTheme {
  const n = BIOME_THEMES.length;
  return BIOME_THEMES[((tierIndex % n) + n) % n]!;
}

export { BIOME_THEMES };
