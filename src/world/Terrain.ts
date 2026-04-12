import * as THREE from "three";
import type { BiomeTheme } from "./biomeThemes";

/**
 * Procedural terrain with wind dunes, carved slots, ridgelines, and rim falloff.
 * Single mesh — same collision as visuals.
 *
 * Accepts an optional `BiomeTheme` to tint vertex colours per-biome.
 */
export function createTerrain(biome?: BiomeTheme): THREE.Mesh {
  const size = 220;
  const seg = 80;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const c = new Float32Array(pos.count * 3);

  // Vertex-colour ramp — defaults match original red desert
  const lowR = biome?.terrainLowR ?? 0.38;
  const lowG = biome?.terrainLowG ?? 0.20;
  const lowB = biome?.terrainLowB ?? 0.14;
  const highR = biome?.terrainHighR ?? 0.70;
  const highG = biome?.terrainHighG ?? 0.42;
  const highB = biome?.terrainHighB ?? 0.34;

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);

    const d = Math.sqrt(v.x * v.x + v.z * v.z);
    const falloff = Math.max(0, 1 - d / (size * 0.5));
    const edgeBreak = Math.max(0, 1 - d / (size * 0.58));

    // Prevailing wind axis (subtle shear in XZ)
    const wind = v.z * 0.019 + v.x * 0.007;

    // Asymmetric dunes: sharp crests, gentle lee (pow bias)
    const duneWave = Math.sin(wind * 2.65) * 0.5 + 0.5;
    const dunes = (Math.pow(duneWave, 1.65) * 2.4 - 0.35) * 1.15;

    const cross = Math.sin(v.x * 0.042 - v.z * 0.028) * 0.95;

    // Broad ridgelines + interference (canyon "spines")
    const wx = v.x * 0.0165;
    const wz = v.z * 0.0165;
    const ridgeA =
      Math.sin(wx * 2.05) * Math.cos(wz * 1.45) * 5.8 +
      Math.sin((v.x + v.z * 0.55) * 0.022) * 2.8;
    const ridgeB = Math.sin(v.x * 0.028 + v.z * 0.019) * 2.1;

    // Slot / wash: carve lows where phase aligns (deeper negative pockets)
    const slotPhase = Math.sin(v.x * 0.018 + 1.1) * Math.cos(v.z * 0.015 + 0.4);
    const slotCarve = -Math.pow(Math.max(0, Math.abs(slotPhase) - 0.35), 1.4) * 4.2;

    // Mesa / tableland bias (flat-topped bumps)
    const mesa =
      Math.max(0, Math.sin(v.x * 0.013 + 0.2)) *
      Math.max(0, Math.cos(v.z * 0.012 - 0.15)) *
      2.6;

    // Micro-ripples (surface breakup, small amplitude)
    const rip =
      Math.sin(v.x * 0.09 + v.z * 0.07) * 0.35 +
      Math.sin(v.x * 0.055 - v.z * 0.048) * 0.28;

    // Far ring: extra silhouette jitter at horizon without raising center
    const horizon = edgeBreak * Math.sin(v.x * 0.045 + v.z * 0.038) * 1.1;

    const roll =
      ridgeA * 0.44 +
      ridgeB +
      dunes +
      cross * 0.55 +
      slotCarve * 0.72 +
      mesa * 0.42 +
      rip +
      horizon;

    v.y = roll * falloff * 0.92;
    pos.setXYZ(i, v.x, v.y, v.z);

    // Tint: deeper lows in carved areas, bleached highs on crests
    const hNorm = THREE.MathUtils.clamp(v.y * 0.11 + 0.46, 0, 1);
    const slotDark = THREE.MathUtils.clamp(0.55 - Math.abs(slotPhase) * 0.35, 0, 1);
    const dust = hNorm * 0.78 + slotDark * 0.22;
    c[i * 3] = THREE.MathUtils.lerp(lowR, highR, dust);
    c[i * 3 + 1] = THREE.MathUtils.lerp(lowG, highG, dust);
    c[i * 3 + 2] = THREE.MathUtils.lerp(lowB, highB, dust);
  }

  geo.setAttribute("color", new THREE.BufferAttribute(c, 3));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();

  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.93,
    metalness: 0.05,
    flatShading: false,
    emissive: biome?.terrainEmissive ?? 0x1a1512,
    emissiveIntensity: biome?.terrainEmissiveIntensity ?? 0.14,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = "Terrain";
  return mesh;
}
