import * as THREE from "three";
import { sampleTerrainY } from "./terrainSample";
import type { HazardLayout } from "./missionVariants";
import type { HazardTuning } from "./hazardConfig";

/** Radiation Field (persistent) · Thermal Vent (pulsing). */
export type HazardKind = "radiation" | "heat";

export type HazardZone = {
  readonly kind: HazardKind;
  readonly center: THREE.Vector3;
  readonly radius: number;
  readonly group: THREE.Group;
};

function addRadiationField(
  parent: THREE.Object3D,
  terrain: THREE.Mesh,
  x: number,
  z: number,
  radius: number
): THREE.Group {
  const y = sampleTerrainY(terrain, x, z);
  const g = new THREE.Group();
  g.position.set(x, y + 0.08, z);
  parent.add(g);

  const outerHex = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.96, radius * 1.02, 6),
    new THREE.MeshStandardMaterial({
      color: 0x2a5040,
      emissive: 0x228844,
      emissiveIntensity: 0.38,
      metalness: 0.25,
      roughness: 0.75,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    })
  );
  outerHex.rotation.x = -Math.PI / 2;
  outerHex.position.y = 0.03;
  g.add(outerHex);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.82, radius, 48),
    new THREE.MeshStandardMaterial({
      color: 0x1a4830,
      emissive: 0x18aa44,
      emissiveIntensity: 0.68,
      metalness: 0.22,
      roughness: 0.78,
      transparent: true,
      opacity: 0.62,
      side: THREE.DoubleSide,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.receiveShadow = true;
  g.add(ring);

  const inner = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.8, 36),
    new THREE.MeshStandardMaterial({
      color: 0x123820,
      emissive: 0x0c7030,
      emissiveIntensity: 0.55,
      metalness: 0.12,
      roughness: 0.9,
      transparent: true,
      opacity: 0.26,
      side: THREE.DoubleSide,
    })
  );
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = -0.02;
  g.add(inner);

  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x1a2820,
    emissive: 0x44ee77,
    emissiveIntensity: 0.88,
    metalness: 0.45,
    roughness: 0.4,
  });
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + 0.2;
    const px = Math.cos(ang) * radius * 0.86;
    const pz = Math.sin(ang) * radius * 0.86;
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.14, 0.78, 6),
      poleMat
    );
    pole.position.set(px, 0.4, pz);
    pole.castShadow = true;
    g.add(pole);
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 6),
      new THREE.MeshStandardMaterial({
        color: 0x224422,
        emissive: 0x77ffaa,
        emissiveIntensity: 1.2,
        metalness: 0.3,
        roughness: 0.35,
      })
    );
    cap.position.set(px, 0.82, pz);
    g.add(cap);
  }

  const debrisMat = new THREE.MeshStandardMaterial({
    color: 0x2a3530,
    emissive: 0x228844,
    emissiveIntensity: 0.42,
    metalness: 0.5,
    roughness: 0.55,
  });
  for (let k = 0; k < 3; k++) {
    const a = k * 2.1 + 0.5;
    const bx = Math.cos(a) * radius * 0.45;
    const bz = Math.sin(a) * radius * 0.5;
    const junk = new THREE.Mesh(
      new THREE.BoxGeometry(0.35 + k * 0.08, 0.12, 0.28),
      debrisMat
    );
    junk.position.set(bx, 0.08, bz);
    junk.rotation.y = a * 0.7;
    junk.castShadow = true;
    g.add(junk);
  }

  return g;
}

function addThermalVentField(
  parent: THREE.Object3D,
  terrain: THREE.Mesh,
  x: number,
  z: number,
  radius: number
): THREE.Group {
  const y = sampleTerrainY(terrain, x, z);
  const g = new THREE.Group();
  g.position.set(x, y + 0.08, z);
  parent.add(g);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.82, radius, 48),
    new THREE.MeshStandardMaterial({
      color: 0x5a2410,
      emissive: 0xcc3310,
      emissiveIntensity: 0.62,
      metalness: 0.28,
      roughness: 0.72,
      transparent: true,
      opacity: 0.58,
      side: THREE.DoubleSide,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.receiveShadow = true;
  g.add(ring);

  const inner = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.8, 36),
    new THREE.MeshStandardMaterial({
      color: 0x4a1206,
      emissive: 0x882200,
      emissiveIntensity: 0.45,
      metalness: 0.15,
      roughness: 0.88,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
    })
  );
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = -0.02;
  g.add(inner);

  const fissure = new THREE.Mesh(
    new THREE.BoxGeometry(radius * 1.15, 0.08, 0.48),
    new THREE.MeshStandardMaterial({
      color: 0x1a0804,
      emissive: 0xff6620,
      emissiveIntensity: 0.72,
      metalness: 0.35,
      roughness: 0.42,
    })
  );
  fissure.rotation.y = 0.35;
  fissure.position.set(0, 0.05, 0);
  g.add(fissure);

  for (let v = 0; v < 3; v++) {
    const va = (v / 3) * Math.PI * 2;
    const vx = Math.cos(va) * radius * 0.35;
    const vz = Math.sin(va) * radius * 0.35;
    const stack = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.22, 0.55, 6),
      new THREE.MeshStandardMaterial({
        color: 0x3a2820,
        emissive: 0x553322,
        emissiveIntensity: 0.35,
        metalness: 0.4,
        roughness: 0.55,
      })
    );
    stack.position.set(vx, 0.32, vz);
    stack.castShadow = true;
    g.add(stack);
  }

  return g;
}

/**
 * Static hazards from layout (any number of radiation / thermal sites).
 */
export function createHazardZones(
  terrain: THREE.Mesh,
  scene: THREE.Object3D,
  layout: HazardLayout
): HazardZone[] {
  const zones: HazardZone[] = [];

  for (const s of layout.radiation) {
    const g = addRadiationField(scene, terrain, s.x, s.z, s.radius);
    zones.push({
      kind: "radiation",
      center: new THREE.Vector3(s.x, g.position.y, s.z),
      radius: s.radius,
      group: g,
    });
  }

  for (const s of layout.heat) {
    const g = addThermalVentField(scene, terrain, s.x, s.z, s.radius);
    zones.push({
      kind: "heat",
      center: new THREE.Vector3(s.x, g.position.y, s.z),
      radius: s.radius,
      group: g,
    });
  }

  return zones;
}

export function disposeHazardZones(zones: HazardZone[]): void {
  for (const z of zones) z.group.removeFromParent();
}

export type HazardSample = {
  integrityLoss: number;
  inRadiation: boolean;
  heatPulse: boolean;
  /** Inside thermal vent during pre-pulse window (readable warning phase). */
  thermalVentWarning: boolean;
};

/**
 * Drift hazard zones slowly over time for dynamic positioning.
 * Radiation zones orbit in a small circle; thermal vents stay put.
 */
export function driftHazardZones(
  zones: HazardZone[],
  elapsed: number,
): void {
  for (const z of zones) {
    if (z.kind !== "radiation") continue;
    // Slow orbit: 0.3 units/sec radius drift
    const baseX = z.center.x;
    const baseZ = z.center.z;
    const driftR = 3;
    const speed = 0.15;
    const ox = Math.sin(elapsed * speed + baseX * 0.1) * driftR;
    const oz = Math.cos(elapsed * speed + baseZ * 0.1) * driftR;
    z.group.position.x = baseX + ox;
    z.group.position.z = baseZ + oz;
  }
}

export function sampleHazardEffects(
  playerPos: THREE.Vector3,
  zones: readonly HazardZone[],
  missionElapsed: number,
  dt: number,
  tuning: HazardTuning
): HazardSample {
  let integrityLoss = 0;
  let inRadiation = false;
  let heatPulse = false;
  let thermalVentWarning = false;

  const e = missionElapsed;
  const prevE = Math.max(0, e - dt);
  const period = Math.max(0.4, tuning.thermalPulsePeriodSec);
  const heatPulseTick =
    Math.floor(e / period) > Math.floor(prevE / period);

  for (const z of zones) {
    // Use group position (accounts for drift) instead of fixed center
    const cx = z.group.position.x;
    const cz = z.group.position.z;
    const dx = playerPos.x - cx;
    const dz = playerPos.z - cz;
    if (dx * dx + dz * dz > z.radius * z.radius) continue;
    const lo = z.center.y - 5;
    const hi = z.center.y + 80;
    if (playerPos.y < lo || playerPos.y > hi) continue;

    if (z.kind === "radiation") {
      inRadiation = true;
      integrityLoss += tuning.radiationDps * dt;
    } else {
      const phase = e % period;
      const warn = Math.min(period * 0.45, tuning.thermalWarnBeforePulseSec);
      if (phase >= period - warn) {
        thermalVentWarning = true;
      }
      if (heatPulseTick) {
        heatPulse = true;
        integrityLoss += tuning.thermalPulseDamage;
      }
    }
  }

  return { integrityLoss, inRadiation, heatPulse, thermalVentWarning };
}
