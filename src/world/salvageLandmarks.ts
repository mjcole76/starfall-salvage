import * as THREE from "three";
import { sampleTerrainY } from "../mission/terrainSample";

/**
 * Hero-readable salvage zone props — strong silhouettes, low poly count.
 * Visual only; terrain mesh stays the collider.
 */

const metalDark = (): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({
    color: 0x2a3038,
    roughness: 0.72,
    metalness: 0.55,
  });

const metalRust = (): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({
    color: 0x4a3830,
    roughness: 0.82,
    metalness: 0.38,
  });

const accentTeal = (): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({
    color: 0x1a4048,
    emissive: 0x2266aa,
    emissiveIntensity: 0.35,
    roughness: 0.45,
    metalness: 0.5,
  });

const accentOrange = (): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({
    color: 0x4a3018,
    emissive: 0xaa5520,
    emissiveIntensity: 0.4,
    roughness: 0.55,
    metalness: 0.4,
  });

/** Large central hull read — wedge fuselage + broken wing + fin. */
function addHeroCrashedHull(
  parent: THREE.Object3D,
  terrain: THREE.Mesh,
  x: number,
  z: number
): void {
  const g = new THREE.Group();
  g.name = "Landmark_CrashedHull";
  const baseY = sampleTerrainY(terrain, x, z);
  g.position.set(x, baseY, z);
  g.rotation.y = 0.55;

  const hull = metalDark();
  const rust = metalRust();
  const teal = accentTeal();

  const fus = new THREE.Mesh(new THREE.BoxGeometry(22, 3.2, 5.5), hull);
  fus.position.set(0, 2.1, 0);
  fus.rotation.z = 0.12;
  fus.castShadow = true;
  fus.receiveShadow = true;
  g.add(fus);

  const wing = new THREE.Mesh(new THREE.BoxGeometry(8, 0.9, 14), rust);
  wing.position.set(-2, 2.4, 0);
  wing.rotation.x = 0.18;
  wing.rotation.y = -0.08;
  wing.castShadow = true;
  g.add(wing);

  const fin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 7, 4.5), hull);
  fin.position.set(-9, 4.2, -1);
  fin.rotation.y = 0.25;
  fin.castShadow = true;
  g.add(fin);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(6, 2.2, 4), rust);
  nose.position.set(12, 1.9, 0);
  nose.rotation.z = -0.2;
  nose.castShadow = true;
  g.add(nose);

  const breach = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2, 2.5), teal);
  breach.position.set(4, 2.8, 2.2);
  breach.castShadow = true;
  g.add(breach);

  parent.add(g);
}

/** Tall relay — lattice legs + dish + slow beacon pulse (material only; tick optional). */
function addRelayTower(
  parent: THREE.Object3D,
  terrain: THREE.Mesh,
  x: number,
  z: number
): void {
  const g = new THREE.Group();
  g.name = "Landmark_RelayTower";
  const baseY = sampleTerrainY(terrain, x, z);
  g.position.set(x, baseY, z);

  const legMat = metalDark();
  const dishMat = accentTeal();
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0x88ccff,
    emissive: 0x66aadd,
    emissiveIntensity: 1.1,
    roughness: 0.25,
    metalness: 0.2,
  });

  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const lx = Math.cos(ang) * 2.8;
    const lz = Math.sin(ang) * 2.8;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 16, 6), legMat);
    leg.position.set(lx, 8, lz);
    leg.castShadow = true;
    g.add(leg);
  }

  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 18, 8), legMat);
  spine.position.set(0, 9, 0);
  spine.castShadow = true;
  g.add(spine);

  const dish = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 3.2, 0.4, 16),
    dishMat
  );
  dish.position.set(0, 17.2, 0);
  dish.rotation.x = Math.PI / 2;
  dish.castShadow = true;
  g.add(dish);

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 10), beaconMat);
  beacon.position.set(0, 18.5, 0);
  beacon.castShadow = true;
  g.add(beacon);

  parent.add(g);
}

/** Broken rig — tilted mast, deck, snapped derrick. */
function addBrokenDrillRig(
  parent: THREE.Object3D,
  terrain: THREE.Mesh,
  x: number,
  z: number
): void {
  const g = new THREE.Group();
  g.name = "Landmark_DrillRig";
  const baseY = sampleTerrainY(terrain, x, z);
  g.position.set(x, baseY, z);
  g.rotation.y = -0.85;

  const steel = metalDark();
  const orange = accentOrange();

  const deck = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 8), steel);
  deck.position.set(0, 0.35, 0);
  deck.receiveShadow = true;
  deck.castShadow = true;
  g.add(deck);

  const mast = new THREE.Mesh(new THREE.BoxGeometry(1.4, 14, 1.4), steel);
  mast.position.set(-1.5, 7.5, -1);
  mast.rotation.z = 0.22;
  mast.castShadow = true;
  g.add(mast);

  const boom = new THREE.Mesh(new THREE.BoxGeometry(8, 0.65, 0.65), orange);
  boom.position.set(2.5, 11, 0);
  boom.rotation.z = -0.35;
  boom.castShadow = true;
  g.add(boom);

  const counter = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 2), metalRust());
  counter.position.set(3, 1.2, 2);
  counter.castShadow = true;
  g.add(counter);

  parent.add(g);
}

/** Rim + dark bowl read near hazard science sites (not a collider). */
function addHazardCraterRim(
  parent: THREE.Object3D,
  terrain: THREE.Mesh,
  x: number,
  z: number
): void {
  const g = new THREE.Group();
  g.name = "Landmark_HazardCrater";
  const y = sampleTerrainY(terrain, x, z);
  g.position.set(x, y + 0.04, z);

  const rim = new THREE.Mesh(
    new THREE.RingGeometry(10, 13, 40),
    new THREE.MeshStandardMaterial({
      color: 0x3a3530,
      emissive: 0x1a2218,
      emissiveIntensity: 0.15,
      roughness: 0.88,
      metalness: 0.2,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    })
  );
  rim.rotation.x = -Math.PI / 2;
  rim.receiveShadow = true;
  g.add(rim);

  const pit = new THREE.Mesh(
    new THREE.CircleGeometry(9.5, 32),
    new THREE.MeshStandardMaterial({
      color: 0x1a1816,
      emissive: 0x0a1510,
      emissiveIntensity: 0.12,
      roughness: 0.92,
      metalness: 0.1,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    })
  );
  pit.rotation.x = -Math.PI / 2;
  pit.position.y = -0.03;
  pit.receiveShadow = true;
  g.add(pit);

  parent.add(g);
}

/**
 * Placed for top-down route reading: hull mid-northwest, tower southeast,
 * rig southwest, crater beside radiation field.
 */
export function addSalvageLandmarks(
  parent: THREE.Object3D,
  terrain: THREE.Mesh
): void {
  addHeroCrashedHull(parent, terrain, -32, 18);
  addRelayTower(parent, terrain, 40, -32);
  addBrokenDrillRig(parent, terrain, -50, -38);
  addHazardCraterRim(parent, terrain, 26, 8);
}
