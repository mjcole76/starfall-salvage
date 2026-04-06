import * as THREE from "three";

const DOWN = new THREE.Vector3(0, -1, 0);
const ORIGIN = new THREE.Vector3();

/** Sample terrain surface Y at (x, z) by raycasting down. */
export function sampleTerrainY(
  terrain: THREE.Mesh,
  x: number,
  z: number,
  fromHeight = 240
): number {
  ORIGIN.set(x, fromHeight, z);
  const raycaster = new THREE.Raycaster(ORIGIN, DOWN);
  const hits = raycaster.intersectObject(terrain, false);
  if (hits.length === 0) return 0;
  return hits[0].point.y;
}
