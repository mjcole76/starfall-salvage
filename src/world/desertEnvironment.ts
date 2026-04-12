import * as THREE from "three";
import { sampleTerrainY } from "../mission/terrainSample";
import { addSalvageLandmarks } from "./salvageLandmarks";
import type { BiomeTheme } from "./biomeThemes";

/**
 * Lightweight silhouettes + distant landmarks for horizon breakup and route read.
 * Visual only — terrain mesh remains sole ground collider.
 */
export function createDesertEnvironment(
  parent: THREE.Object3D,
  terrain: THREE.Mesh,
  biome?: BiomeTheme,
): THREE.Group {
  const root = new THREE.Group();
  root.name = "DesertEnvironment";
  parent.add(root);

  const rock = new THREE.MeshStandardMaterial({
    color: biome?.rockColor ?? 0x52322c,
    roughness: 0.94,
    metalness: 0.05,
  });
  const rockLight = new THREE.MeshStandardMaterial({
    color: biome?.rockLightColor ?? 0x6b4438,
    roughness: 0.92,
    metalness: 0.06,
  });
  const rockDark = new THREE.MeshStandardMaterial({
    color: biome?.rockDarkColor ?? 0x3e2824,
    roughness: 0.95,
    metalness: 0.04,
  });
  const hull = new THREE.MeshStandardMaterial({
    color: biome?.hullColor ?? 0x252226,
    roughness: 0.82,
    metalness: 0.48,
  });
  const hullRust = new THREE.MeshStandardMaterial({
    color: biome?.hullRustColor ?? 0x4a3228,
    roughness: 0.9,
    metalness: 0.22,
  });
  const debrisMat = new THREE.MeshStandardMaterial({
    color: biome?.debrisColor ?? 0x3a3532,
    roughness: 0.88,
    metalness: 0.35,
  });

  const boulderGeo = new THREE.DodecahedronGeometry(1, 0);
  const slabGeo = new THREE.BoxGeometry(1, 0.45, 1.6);
  const monolithGeo = new THREE.BoxGeometry(1, 1, 1);

  const boulderCount = 68;
  const boulders = new THREE.InstancedMesh(boulderGeo, rock, boulderCount);
  const slabs = new THREE.InstancedMesh(slabGeo, rockLight, 36);
  const monolithCount = 18;
  const monoliths = new THREE.InstancedMesh(monolithGeo, rockDark, monolithCount);

  const m4 = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const euler = new THREE.Euler();

  const boulderSeeds: [number, number, number][] = [
    [-48, 0.55, 38],
    [-62, 0.4, 12],
    [55, 0.65, 45],
    [42, 0.5, -55],
    [-25, 0.45, -58],
    [18, 0.35, 62],
    [-8, 0.5, -12],
    [28, 0.4, 22],
    [-38, 0.55, -35],
    [65, 0.45, -8],
    [-55, 0.5, -48],
    [12, 0.4, -42],
    [48, 0.55, 18],
    [-18, 0.45, 48],
    [32, 0.5, -28],
    [-42, 0.55, 8],
    [8, 0.4, 35],
    [-65, 0.45, -22],
    [58, 0.5, 28],
    [-28, 0.55, -52],
    [22, 0.4, -18],
    [38, 0.5, 52],
    [-12, 0.45, -65],
    [52, 0.55, -38],
    [-35, 0.4, 25],
    [25, 0.5, -48],
    [15, 0.45, -8],
    [-50, 0.55, -15],
    [45, 0.4, 8],
    [-22, 0.5, -28],
    [35, 0.45, 42],
    [-45, 0.55, 32],
    [60, 0.4, -45],
    [-15, 0.5, 18],
    [5, 0.45, -55],
    [-58, 0.55, 48],
    [40, 0.4, -12],
    [-32, 0.5, -42],
    [28, 0.45, 58],
    [-48, 0.55, -32],
    [18, 0.4, 48],
    [55, 0.5, -25],
    [-8, 0.45, -38],
    [62, 0.55, 15],
    [-38, 0.4, -8],
    [8, 0.5, -22],
    [-52, 0.45, 22],
    [48, 0.55, -52],
    [-25, 0.4, 8],
    [32, 0.5, -62],
    [-18, 0.45, -48],
    [22, 0.55, 12],
    [88, 0.5, 35],
    [-88, 0.48, -40],
    [72, 0.52, 68],
    [-70, 0.5, 72],
    [78, 0.45, -78],
    [-82, 0.55, 55],
    [35, 0.6, 88],
    [-40, 0.55, -88],
    [92, 0.42, -15],
    [-92, 0.48, 20],
    [15, 0.5, 92],
    [-25, 0.52, -92],
    [68, 0.58, -62],
    [-55, 0.5, -82],
    [50, 0.55, 82],
    [-75, 0.48, -70],
    [0, 0.45, 88],
    [88, 0.5, 0],
    [-88, 0.52, -8],
  ];

  let bi = 0;
  for (const [bx, sy, bz] of boulderSeeds) {
    if (bi >= boulderCount) break;
    const y = sampleTerrainY(terrain, bx, bz);
    const edge = Math.max(Math.abs(bx), Math.abs(bz)) > 62 ? 1.12 : 1;
    const s = sy * edge * (0.85 + (bi % 7) * 0.04);
    pos.set(bx, y + s * 0.42, bz);
    euler.set(
      (bi * 0.37) % 0.5,
      (bi * 1.17) % (Math.PI * 2),
      (bi * 0.23) % 0.4
    );
    quat.setFromEuler(euler);
    sc.set(s * (1 + (bi % 3) * 0.08), s * 0.92, s * (1.05 + (bi % 2) * 0.1));
    m4.compose(pos, quat, sc);
    boulders.setMatrixAt(bi++, m4);
  }
  boulders.instanceMatrix.needsUpdate = true;
  boulders.castShadow = true;
  boulders.receiveShadow = true;
  root.add(boulders);

  const slabSeeds: [number, number, number, number][] = [
    [-44, 0.9, 30, 0.4],
    [50, 1.1, -40, -0.6],
    [-20, 0.85, -50, 1.1],
    [35, 0.95, 35, -0.3],
    [-60, 1, -35, 0.8],
    [15, 0.8, 55, 0.2],
    [-30, 1.05, 15, -1.0],
    [58, 0.9, 20, 0.5],
    [-10, 0.85, -45, 0.7],
    [40, 1, -20, -0.4],
    [-52, 0.95, -18, 0.9],
    [25, 0.88, -58, -0.2],
    [-36, 1.02, 48, 0.35],
    [12, 0.92, -32, -0.85],
    [48, 0.98, 8, 0.55],
    [-24, 0.87, -12, -0.45],
    [30, 1.05, -48, 0.65],
    [-50, 0.9, 5, -0.75],
    [8, 0.95, 42, 0.25],
    [-42, 1, -42, 0.95],
    [55, 0.88, -12, -0.55],
    [-16, 0.92, 28, 0.15],
    [38, 1.08, -55, -0.25],
    [-58, 0.86, 40, 0.45],
    [20, 0.94, -8, -0.95],
    [44, 1, 50, 0.3],
    [-8, 0.89, -62, 0.6],
    [62, 0.93, -38, -0.35],
    [-68, 1.05, 25, 0.55],
    [70, 1, 45, -0.85],
    [-30, 1.12, -72, 0.3],
    [28, 1.08, 75, -0.4],
    [80, 0.95, -55, 1.0],
    [-78, 1.02, -58, -0.2],
    [10, 1.15, 80, 0.6],
    [-5, 1.05, -82, -0.9],
    [85, 1.08, 10, 0.15],
    [-88, 0.98, -25, -0.5],
  ];

  let si = 0;
  for (const [sx, scale, sz, ry] of slabSeeds) {
    if (si >= 36) break;
    const y = sampleTerrainY(terrain, sx, sz);
    const far = Math.hypot(sx, sz) > 75 ? 1.18 : 1;
    const w = scale * far * (2.4 + (si % 4) * 0.45);
    const h = scale * 0.58 * far;
    const dep = scale * (1.5 + (si % 3) * 0.25);
    pos.set(sx, y + h * 0.5, sz);
    euler.set(0.08 + (si % 5) * 0.04, ry, 0.12);
    quat.setFromEuler(euler);
    sc.set(w, h, dep);
    m4.compose(pos, quat, sc);
    slabs.setMatrixAt(si++, m4);
  }
  slabs.instanceMatrix.needsUpdate = true;
  slabs.castShadow = true;
  slabs.receiveShadow = true;
  root.add(slabs);

  const monoSeeds: [number, number, number, number, number][] = [
    [82, 14, 48, 0.15, 0.4],
    [-86, 16, -35, -0.2, -0.5],
    [75, 18, -78, 0.1, 0.85],
    [-78, 15, 70, -0.25, 0.2],
    [92, 12, -8, 0.2, 0.1],
    [-92, 17, 15, -0.15, -0.3],
    [55, 20, 88, 0.12, 1.1],
    [-48, 19, -90, -0.18, -0.9],
    [8, 22, 94, 0.08, 0.05],
    [-12, 18, -94, -0.1, 0.15],
    [68, 15, 82, 0.22, 0.65],
    [-65, 16, -82, -0.12, -0.55],
    [95, 13, 38, 0.18, 0.25],
    [-88, 14, -52, -0.2, -0.15],
    [40, 21, -88, 0.05, -0.7],
    [-35, 20, 86, -0.08, 0.72],
    [88, 11, -68, 0.25, -0.4],
    [-72, 19, 58, -0.14, 0.45],
  ];

  let mi = 0;
  for (const [mx, mh, mz, tiltX, tiltZ] of monoSeeds) {
    if (mi >= monolithCount) break;
    const y = sampleTerrainY(terrain, mx, mz);
    const baseW = 2.8 + (mi % 4) * 0.6;
    const baseD = 2.2 + (mi % 3) * 0.5;
    pos.set(mx, y + mh * 0.5, mz);
    euler.set(tiltX + (mi % 3) * 0.04, (mi * 0.7) % (Math.PI * 2), tiltZ);
    quat.setFromEuler(euler);
    sc.set(baseW, mh, baseD);
    m4.compose(pos, quat, sc);
    monoliths.setMatrixAt(mi++, m4);
  }
  monoliths.instanceMatrix.needsUpdate = true;
  monoliths.castShadow = true;
  monoliths.receiveShadow = true;
  root.add(monoliths);

  addCrashedWreck(root, terrain, hull, hullRust, debrisMat, -58, -8, 1);
  addCrashedWreck(root, terrain, hull, hullRust, debrisMat, -82, -58, 1.5);
  addCrashedWreck(root, terrain, hull, hullRust, debrisMat, 72, 62, 1.28);

  addDebrisField(root, terrain, debrisMat);

  addSalvageLandmarks(root, terrain);

  return root;
}

function addCrashedWreck(
  root: THREE.Group,
  terrain: THREE.Mesh,
  hull: THREE.MeshStandardMaterial,
  rust: THREE.MeshStandardMaterial,
  scrap: THREE.MeshStandardMaterial,
  cx: number,
  cz: number,
  sizeScale: number
): void {
  const wreck = new THREE.Group();
  wreck.name = `Wreck_${cx}_${cz}`;
  const baseY = sampleTerrainY(terrain, cx, cz);
  const S = sizeScale;

  const addBox = (
    w: number,
    h: number,
    d: number,
    mat: THREE.MeshStandardMaterial,
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    rz: number
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w * S, h * S, d * S),
      mat
    );
    mesh.position.set(cx + x * S, baseY + y * S, cz + z * S);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    wreck.add(mesh);
  };

  addBox(14, 1.8, 3.2, hull, 0, 2.2, 0, 0, -0.35, 0.22);
  addBox(8, 2.2, 3, rust, -6, 2.4, 1.5, 0.25, 0.5, -0.15);
  addBox(5, 1.4, 4, hull, 5, 1.8, -1.2, -0.4, -0.2, 0.3);
  addBox(3, 0.8, 6, rust, -9, 1.2, 0, 0.6, 0.15, 0.1);
  addBox(2.2, 3.5, 2.2, hull, 2, 4.2, -2.5, 0.2, 0.1, -0.25);
  addBox(6, 0.6, 2, rust, -3, 0.9, 2.8, 0.85, 0, 0);
  addBox(4, 1.2, 1.5, scrap, 7, 1.5, 1, -0.2, -0.6, 0.4);

  if (sizeScale > 1.15) {
    addBox(5, 0.5, 8, rust, -12, 1.4, -4, 0.15, 0.35, 0.08);
    addBox(3, 4.5, 2.5, hull, 10, 3.2, -6, 0.12, -0.4, 0.1);
  }

  root.add(wreck);
}

function addDebrisField(
  root: THREE.Group,
  terrain: THREE.Mesh,
  mat: THREE.MeshStandardMaterial
): void {
  const geo = new THREE.BoxGeometry(0.35, 0.12, 0.5);
  const n = 56;
  const inst = new THREE.InstancedMesh(geo, mat, n);
  const m4 = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const euler = new THREE.Euler();

  const spots: [number, number][] = [
    [-40, 20],
    [-35, 12],
    [-50, -25],
    [45, -30],
    [30, 40],
    [20, -45],
    [-15, -35],
    [10, 25],
    [-25, -20],
    [50, 15],
    [-55, 35],
    [35, -15],
    [-10, 50],
    [25, -35],
    [40, 30],
    [-30, -45],
    [15, -15],
    [-45, -40],
    [55, -20],
    [5, 35],
    [-20, 8],
    [48, -48],
    [-38, -12],
    [22, 12],
    [-12, -55],
    [32, 8],
    [-48, -30],
    [18, -28],
    [8, -40],
    [-28, 38],
    [42, -8],
    [-5, -25],
    [28, -52],
    [-52, -5],
    [12, 48],
    [38, 22],
    [75, -35],
    [-68, 48],
    [60, 70],
    [-55, -75],
    [80, 25],
    [-78, -30],
    [30, 78],
    [-22, -82],
    [88, -55],
    [-85, 10],
    [15, 88],
    [-8, -88],
    [65, -68],
    [-40, 82],
    [52, -78],
    [-72, -55],
    [90, 40],
    [-35, -70],
    [70, -15],
    [-90, -48],
  ];

  for (let i = 0; i < n; i++) {
    const [dx, dz] = spots[i]!;
    const y = sampleTerrainY(terrain, dx, dz);
    pos.set(dx, y + 0.08, dz);
    euler.set(
      (i * 0.31) % 0.4,
      (i * 0.87) % (Math.PI * 2),
      (i * 0.19) % 0.35
    );
    quat.setFromEuler(euler);
    const f = 0.85 + (i % 5) * 0.12;
    sc.set(f, 1, f * 1.1);
    m4.compose(pos, quat, sc);
    inst.setMatrixAt(i, m4);
  }
  inst.instanceMatrix.needsUpdate = true;
  inst.castShadow = true;
  inst.receiveShadow = true;
  inst.name = "DebrisField";
  root.add(inst);
}
