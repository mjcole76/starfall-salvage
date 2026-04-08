/**
 * ShelterIndicator — HUD arrow pointing to the nearest shelter
 * when a dust storm warning is active.
 */

import type { Shelter } from "../mission/shelters";
import type { DustStormPhase } from "../mission/dustStorm";

export class ShelterIndicator {
  private el: HTMLDivElement;
  private arrowEl: HTMLDivElement;
  private distEl: HTMLSpanElement;
  private visible = false;

  constructor(container: HTMLElement) {
    this.el = document.createElement("div");
    Object.assign(this.el.style, {
      position: "fixed",
      bottom: "200px",
      left: "50%",
      transform: "translateX(-50%)",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "6px 14px",
      background: "rgba(200,160,50,0.25)",
      border: "1px solid rgba(200,160,50,0.5)",
      borderRadius: "6px",
      fontFamily: 'ui-monospace, "Cascadia Mono", monospace',
      fontSize: "12px",
      color: "#ffcc44",
      textShadow: "0 0 6px rgba(200,160,50,0.4)",
      pointerEvents: "none",
      zIndex: "30",
      opacity: "0",
      transition: "opacity 0.3s ease",
    });

    this.arrowEl = document.createElement("div");
    Object.assign(this.arrowEl.style, {
      fontSize: "18px",
      lineHeight: "1",
      transition: "transform 0.1s ease",
    });
    this.arrowEl.textContent = "\u25B2"; // up arrow
    this.el.appendChild(this.arrowEl);

    this.distEl = document.createElement("span");
    this.distEl.textContent = "SHELTER 0m";
    this.el.appendChild(this.distEl);

    container.appendChild(this.el);
  }

  update(
    playerX: number,
    playerZ: number,
    playerFacing: number,
    shelters: readonly Shelter[],
    dustStormPhase: DustStormPhase,
  ): void {
    const shouldShow = dustStormPhase === "warning" || dustStormPhase === "active";

    if (!shouldShow) {
      if (this.visible) {
        this.visible = false;
        this.el.style.opacity = "0";
      }
      return;
    }

    // Find nearest shelter
    let nearest: Shelter | null = null;
    let nearestDist = Infinity;
    for (const s of shelters) {
      const dx = playerX - s.center.x;
      const dz = playerZ - s.center.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = s;
      }
    }

    if (!nearest) {
      this.el.style.opacity = "0";
      this.visible = false;
      return;
    }

    if (!this.visible) {
      this.visible = true;
      this.el.style.opacity = "1";
    }

    // Calculate angle from player to shelter relative to player facing
    const dx = nearest.center.x - playerX;
    const dz = nearest.center.z - playerZ;
    const angleToShelter = Math.atan2(dx, dz);
    const relAngle = angleToShelter - playerFacing;

    // Rotate the arrow
    // Convert to degrees, CSS rotation: 0 = up
    const deg = (relAngle * 180) / Math.PI;
    this.arrowEl.style.transform = `rotate(${deg}deg)`;

    // Distance text
    const dist = Math.round(nearestDist);
    this.distEl.textContent = `SHELTER ${dist}m`;

    // Pulse urgency color based on phase
    if (dustStormPhase === "active") {
      this.el.style.borderColor = "rgba(255,80,30,0.7)";
      this.el.style.background = "rgba(255,80,30,0.3)";
      this.el.style.color = "#ff6633";
    } else {
      this.el.style.borderColor = "rgba(200,160,50,0.5)";
      this.el.style.background = "rgba(200,160,50,0.25)";
      this.el.style.color = "#ffcc44";
    }
  }

  dispose(): void {
    this.el.remove();
  }
}
