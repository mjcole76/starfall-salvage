import * as THREE from "three";

/**
 * Stylized low-poly salvage pilot — hard-surface silhouette, no external assets.
 * Swap this module later for a loaded GLTF while keeping PlayerController unchanged.
 *
 * Local origin: midpoint between feet on the ground (Y=0). +Z is forward (chest/visor).
 */
export function createPilotVisual(): THREE.Group {
  const root = new THREE.Group();
  root.name = "PilotVisual";

  const m = createPilotMaterials();

  type PartOpts = {
    rx?: number;
    ry?: number;
    rz?: number;
    sx?: number;
    sy?: number;
    sz?: number;
    castShadow?: boolean;
  };

  const part = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    o: PartOpts = {}
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
    mesh.scale.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1);
    mesh.castShadow = o.castShadow !== false;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };

  // --- Shared geometries (reuse for mirrored limbs) ---
  const bootSole = new THREE.BoxGeometry(0.13, 0.055, 0.29);
  const bootUpper = new THREE.BoxGeometry(0.15, 0.1, 0.26);
  const shinCore = new THREE.BoxGeometry(0.13, 0.2, 0.12);
  const shinPlate = new THREE.BoxGeometry(0.08, 0.16, 0.05);
  const kneePad = new THREE.BoxGeometry(0.16, 0.1, 0.14);
  const thighCore = new THREE.BoxGeometry(0.17, 0.28, 0.16);
  const thighPlate = new THREE.BoxGeometry(0.12, 0.2, 0.04);

  const pelvis = new THREE.BoxGeometry(0.42, 0.12, 0.24);
  const abdomen = new THREE.BoxGeometry(0.36, 0.16, 0.22);
  const abdomenPanel = new THREE.BoxGeometry(0.28, 0.12, 0.04);
  const chestBase = new THREE.BoxGeometry(0.4, 0.2, 0.26);
  const chestPlate = new THREE.BoxGeometry(0.36, 0.18, 0.06);
  const chestRib = new THREE.BoxGeometry(0.32, 0.03, 0.08);
  const collar = new THREE.BoxGeometry(0.34, 0.07, 0.22);

  const pauldron = new THREE.BoxGeometry(0.18, 0.13, 0.24);
  const upperArm = new THREE.BoxGeometry(0.11, 0.24, 0.11);
  const elbowBlock = new THREE.BoxGeometry(0.1, 0.08, 0.1);
  const foreArm = new THREE.BoxGeometry(0.095, 0.2, 0.095);
  const gauntlet = new THREE.BoxGeometry(0.11, 0.1, 0.11);
  const glove = new THREE.BoxGeometry(0.1, 0.09, 0.1);

  const helmetLower = new THREE.CylinderGeometry(0.14, 0.16, 0.11, 10, 1);
  const helmetDome = new THREE.IcosahedronGeometry(0.15, 1);
  const visorGeo = new THREE.BoxGeometry(0.2, 0.075, 0.045);
  const visorRimGeo = new THREE.BoxGeometry(0.22, 0.09, 0.055);
  const helmetVent = new THREE.BoxGeometry(0.05, 0.06, 0.08);

  const packBody = new THREE.BoxGeometry(0.38, 0.42, 0.2);
  const packTop = new THREE.BoxGeometry(0.32, 0.11, 0.17);
  const packStrut = new THREE.BoxGeometry(0.06, 0.24, 0.05);
  const packWing = new THREE.BoxGeometry(0.04, 0.26, 0.14);
  const helmetFin = new THREE.BoxGeometry(0.06, 0.14, 0.12);
  const tank = new THREE.CylinderGeometry(0.055, 0.055, 0.2, 8, 1);
  const nozzle = new THREE.CylinderGeometry(0.055, 0.09, 0.1, 8, 1);
  const warnStripe = new THREE.BoxGeometry(0.14, 0.03, 0.12);

  const lx = 0.12;

  // --- Boots & legs ---
  for (const side of [-1, 1] as const) {
    const x = side * lx;
    part(bootSole, m.graphite, x, 0.028, 0.04, { rz: side * 0.04 });
    part(bootUpper, m.suitDark, x, 0.095, 0.06, { rz: side * 0.03 });
    part(shinCore, m.graphite, x, 0.24, 0.05);
    part(shinPlate, m.offWhite, x, 0.24, 0.12, { rx: -0.06 });
    part(kneePad, m.steel, x, 0.36, 0.04, { rx: 0.14, rz: side * 0.1 });
    part(thighCore, m.suitDark, x, 0.54, 0.03);
    part(thighPlate, m.steel, x, 0.54, 0.08, {
      rx: 0.14,
      rz: side * 0.08,
    });
  }

  // --- Torso armor stack ---
  part(pelvis, m.joint, 0, 0.78, 0);
  part(abdomen, m.graphite, 0, 0.9, 0);
  part(abdomenPanel, m.offWhite, 0, 0.9, 0.13);
  part(chestBase, m.suitDark, 0, 1.08, -0.02);
  part(chestPlate, m.steel, 0, 1.08, 0.15);
  part(chestRib, m.accent, 0, 1.02, 0.15, { rx: 0.1 });
  part(collar, m.graphite, 0, 1.24, -0.02);

  // --- Shoulders (angled plates, wider read) ---
  part(pauldron, m.steel, -0.32, 1.2, -0.02, { rz: 0.46 });
  part(pauldron, m.steel, 0.32, 1.2, -0.02, { rz: -0.46 });

  // --- Arms ---
  part(upperArm, m.graphite, -0.34, 1.05, -0.04, { rz: 0.2 });
  part(upperArm, m.graphite, 0.34, 1.05, -0.04, { rz: -0.2 });
  part(elbowBlock, m.joint, -0.35, 0.88, -0.06, { rz: 0.12 });
  part(elbowBlock, m.joint, 0.35, 0.88, -0.06, { rz: -0.12 });
  part(foreArm, m.suitDark, -0.36, 0.76, -0.06, { rz: 0.1 });
  part(foreArm, m.suitDark, 0.36, 0.76, -0.06, { rz: -0.1 });
  part(gauntlet, m.offWhite, -0.37, 0.66, -0.07, { rz: 0.08 });
  part(gauntlet, m.offWhite, 0.37, 0.66, -0.07, { rz: -0.08 });
  part(glove, m.graphite, -0.38, 0.56, -0.08, { rz: 0.06 });
  part(glove, m.graphite, 0.38, 0.56, -0.08, { rz: -0.06 });

  // --- Helmet ---
  part(helmetLower, m.graphite, 0, 1.34, 0);
  part(helmetDome, m.suitDark, 0, 1.49, -0.02, {
    sx: 1.1,
    sy: 1.18,
    sz: 1.02,
  });
  part(helmetFin, m.steel, 0, 1.62, -0.06, { rx: -0.35 });
  part(visorRimGeo, m.steel, 0, 1.48, 0.16, { rx: -0.06 });
  part(visorGeo, m.visor, 0, 1.48, 0.17, {
    rx: -0.07,
    castShadow: false,
  });
  part(helmetVent, m.graphite, -0.16, 1.44, 0.02, { ry: -0.4 });
  part(helmetVent, m.graphite, 0.16, 1.44, 0.02, { ry: 0.4 });

  // --- Jetpack (silhouette + side wings) ---
  part(packBody, m.graphite, 0, 1.05, -0.23);
  part(packWing, m.suitDark, -0.22, 1.08, -0.24, { ry: 0.25 });
  part(packWing, m.suitDark, 0.22, 1.08, -0.24, { ry: -0.25 });
  part(packTop, m.offWhite, 0, 1.3, -0.23);
  part(packStrut, m.steel, -0.15, 1.04, -0.3, { rx: 0.22 });
  part(packStrut, m.steel, 0.15, 1.04, -0.3, { rx: -0.22 });
  part(tank, m.suitDark, -0.21, 1.09, -0.28, { rz: Math.PI / 2 });
  part(tank, m.suitDark, 0.21, 1.09, -0.28, { rz: Math.PI / 2 });
  part(nozzle, m.joint, -0.13, 0.8, -0.3, { rx: 0.28 });
  part(nozzle, m.joint, 0.13, 0.8, -0.3, { rx: -0.28 });
  part(warnStripe, m.accent, 0, 1.19, -0.33, { rx: 0.38 });

  return root;
}

function createPilotMaterials() {
  return {
    /** Cool-neutral suit mass — separates from warm desert ground. */
    graphite: new THREE.MeshStandardMaterial({
      color: 0x283038,
      metalness: 0.62,
      roughness: 0.44,
    }),
    /** Sun-facing panel read. */
    offWhite: new THREE.MeshStandardMaterial({
      color: 0xe8e6e2,
      metalness: 0.26,
      roughness: 0.55,
    }),
    /** Hard spec for rim light. */
    steel: new THREE.MeshStandardMaterial({
      color: 0x74808c,
      metalness: 0.76,
      roughness: 0.34,
    }),
    suitDark: new THREE.MeshStandardMaterial({
      color: 0x181c22,
      metalness: 0.48,
      roughness: 0.56,
    }),
    joint: new THREE.MeshStandardMaterial({
      color: 0x222830,
      metalness: 0.42,
      roughness: 0.66,
    }),
    visor: new THREE.MeshStandardMaterial({
      color: 0x03060a,
      metalness: 0.88,
      roughness: 0.1,
      emissive: 0x1e5568,
      emissiveIntensity: 0.32,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: 0xc45a2e,
      metalness: 0.38,
      roughness: 0.48,
      emissive: 0x4a2210,
      emissiveIntensity: 0.055,
    }),
  };
}
