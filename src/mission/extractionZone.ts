import * as THREE from "three";
import { sampleTerrainY } from "./terrainSample";

/**
 * Evac platform read: landing ring, struts, central beacon — stronger when armed.
 */
export class ExtractionZone {
  readonly group: THREE.Group;
  readonly center: THREE.Vector3;
  private readonly radius: number;
  private ring: THREE.Mesh;
  private pad: THREE.Mesh;
  private beacon: THREE.Mesh;
  private beaconMat: THREE.MeshStandardMaterial;
  private active = false;

  constructor(
    terrain: THREE.Mesh,
    x: number,
    z: number,
    radius = 6,
    parent: THREE.Object3D
  ) {
    this.radius = radius;
    const y = sampleTerrainY(terrain, x, z);
    this.center = new THREE.Vector3(x, y, z);

    this.group = new THREE.Group();
    this.group.name = "ExtractionZone";
    this.group.position.set(x, y + 0.05, z);
    parent.add(this.group);

    const strutMat = new THREE.MeshStandardMaterial({
      color: 0x353842,
      roughness: 0.65,
      metalness: 0.55,
    });

    const nStruts = 6;
    for (let i = 0; i < nStruts; i++) {
      const ang = (i / nStruts) * Math.PI * 2;
      const px = Math.cos(ang) * radius * 0.78;
      const pz = Math.sin(ang) * radius * 0.78;
      const strut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.2, 1.25, 6),
        strutMat
      );
      strut.position.set(px, 0.55, pz);
      strut.castShadow = true;
      this.group.add(strut);
    }

    const ringGeo = new THREE.TorusGeometry(radius * 0.92, 0.26, 10, 52);
    const ringMatInactive = new THREE.MeshStandardMaterial({
      color: 0x252830,
      emissive: 0x060810,
      emissiveIntensity: 0.12,
      metalness: 0.5,
      roughness: 0.68,
      transparent: true,
      opacity: 0.9,
    });
    this.ring = new THREE.Mesh(ringGeo, ringMatInactive);
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.y = 0.08;
    this.ring.receiveShadow = true;
    this.ring.castShadow = true;
    this.group.add(this.ring);

    const padGeo = new THREE.CircleGeometry(radius * 0.82, 52);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x151820,
      emissive: 0x050810,
      emissiveIntensity: 0.06,
      metalness: 0.35,
      roughness: 0.88,
      transparent: true,
      opacity: 0.62,
      side: THREE.DoubleSide,
    });
    this.pad = new THREE.Mesh(padGeo, padMat);
    this.pad.rotation.x = -Math.PI / 2;
    this.pad.position.y = 0.02;
    this.pad.receiveShadow = true;
    this.group.add(this.pad);

    const hatch = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.22, radius * 0.32, 6),
      new THREE.MeshStandardMaterial({
        color: 0x2a3540,
        emissive: 0x112030,
        emissiveIntensity: 0.2,
        metalness: 0.6,
        roughness: 0.45,
        side: THREE.DoubleSide,
      })
    );
    hatch.rotation.x = -Math.PI / 2;
    hatch.position.y = 0.04;
    this.group.add(hatch);

    this.beaconMat = new THREE.MeshStandardMaterial({
      color: 0x446688,
      emissive: 0x224466,
      emissiveIntensity: 0.25,
      roughness: 0.35,
      metalness: 0.4,
    });
    this.beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.35, 1.4, 8),
      this.beaconMat
    );
    this.beacon.position.set(0, 0.95, 0);
    this.beacon.castShadow = true;
    this.group.add(this.beacon);

    const lens = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 10, 10),
      new THREE.MeshStandardMaterial({
        color: 0xaaddff,
        emissive: 0x66aacc,
        emissiveIntensity: 0.4,
        roughness: 0.18,
        metalness: 0.15,
      })
    );
    lens.position.set(0, 1.65, 0);
    lens.name = "ExtractionBeaconLens";
    this.group.add(lens);

    const cornerMat = new THREE.MeshStandardMaterial({
      color: 0x334455,
      emissive: 0x112233,
      emissiveIntensity: 0.15,
      metalness: 0.5,
      roughness: 0.5,
    });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const cx = Math.cos(a) * radius * 0.55;
      const cz = Math.sin(a) * radius * 0.55;
      const peg = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.22, 0.35),
        cornerMat
      );
      peg.position.set(cx, 0.14, cz);
      peg.castShadow = true;
      this.group.add(peg);
    }

    this.setActive(false);
  }

  setActive(on: boolean): void {
    this.active = on;
    const m = this.ring.material as THREE.MeshStandardMaterial;
    const pm = this.pad.material as THREE.MeshStandardMaterial;
    const lens = this.group.getObjectByName("ExtractionBeaconLens") as
      | THREE.Mesh
      | undefined;
    const lensM = lens?.material as THREE.MeshStandardMaterial | undefined;

    if (on) {
      m.color.setHex(0x2a5a48);
      m.emissive.setHex(0x118855);
      m.emissiveIntensity = 0.75;
      pm.emissive.setHex(0x0a4028);
      pm.emissiveIntensity = 0.28;
      this.beaconMat.emissive.setHex(0x22cc88);
      this.beaconMat.emissiveIntensity = 0.85;
      if (lensM) {
        lensM.emissive.setHex(0x88ffcc);
        lensM.emissiveIntensity = 1.15;
      }
    } else {
      m.color.setHex(0x252830);
      m.emissive.setHex(0x060810);
      m.emissiveIntensity = 0.12;
      pm.emissive.setHex(0x050810);
      pm.emissiveIntensity = 0.06;
      this.beaconMat.emissive.setHex(0x224466);
      this.beaconMat.emissiveIntensity = 0.25;
      if (lensM) {
        lensM.emissive.setHex(0x66aacc);
        lensM.emissiveIntensity = 0.4;
      }
    }
  }

  isActive(): boolean {
    return this.active;
  }

  containsPlayer(playerPos: THREE.Vector3): boolean {
    const dx = playerPos.x - this.center.x;
    const dz = playerPos.z - this.center.z;
    if (dx * dx + dz * dz > this.radius * this.radius) return false;
    const lo = this.center.y - 4;
    const hi = this.center.y + 90;
    return playerPos.y >= lo && playerPos.y <= hi;
  }

  dispose(): void {
    this.group.removeFromParent();
  }
}
