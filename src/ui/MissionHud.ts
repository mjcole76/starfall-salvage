import type { MissionOutcome } from "../mission/missionTypes";

/**
 * Simple DOM HUD: fuel, objectives, timer placeholders, end-state overlay.
 */
export class MissionHud {
  private root: HTMLElement;
  private fuelBar: HTMLDivElement;
  private fuelText: HTMLSpanElement;
  private integrityBar: HTMLDivElement;
  private integrityText: HTMLSpanElement;
  private coresText: HTMLSpanElement;
  private missionTimeText: HTMLSpanElement;
  private stormText: HTMLSpanElement;
  private stormRow: HTMLDivElement;
  private extractRow: HTMLDivElement;
  private extractBar: HTMLDivElement;
  private extractText: HTMLSpanElement;
  private salvageText: HTMLSpanElement;
  private variantText: HTMLSpanElement;
  private wallWarn: HTMLDivElement;
  private overlay: HTMLDivElement;
  private overlayTitle: HTMLDivElement;
  private overlayHint: HTMLDivElement;

  constructor(container: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "mission-hud";
    container.appendChild(this.root);

    const top = document.createElement("div");
    top.className = "mission-hud__top";
    this.root.appendChild(top);

    const fuelRow = document.createElement("div");
    fuelRow.className = "mission-hud__row mission-hud__fuel-row";
    this.fuelText = document.createElement("span");
    this.fuelText.className = "mission-hud__label";
    const barWrap = document.createElement("div");
    barWrap.className = "mission-hud__bar-wrap";
    this.fuelBar = document.createElement("div");
    this.fuelBar.className = "mission-hud__bar-fill";
    barWrap.appendChild(this.fuelBar);
    fuelRow.appendChild(this.fuelText);
    fuelRow.appendChild(barWrap);
    top.appendChild(fuelRow);

    const intRow = document.createElement("div");
    intRow.className = "mission-hud__row mission-hud__fuel-row";
    this.integrityText = document.createElement("span");
    this.integrityText.className = "mission-hud__label";
    const intWrap = document.createElement("div");
    intWrap.className = "mission-hud__bar-wrap mission-hud__bar-wrap--integrity";
    this.integrityBar = document.createElement("div");
    this.integrityBar.className = "mission-hud__bar-fill mission-hud__bar-fill--integrity";
    intWrap.appendChild(this.integrityBar);
    intRow.appendChild(this.integrityText);
    intRow.appendChild(intWrap);
    top.appendChild(intRow);

    const objRow = document.createElement("div");
    objRow.className = "mission-hud__row";
    objRow.innerHTML =
      '<span class="mission-hud__label">Cores</span> ';
    this.coresText = document.createElement("span");
    this.coresText.className = "mission-hud__value";
    objRow.appendChild(this.coresText);
    top.appendChild(objRow);

    const salRow = document.createElement("div");
    salRow.className = "mission-hud__row mission-hud__muted";
    salRow.innerHTML = '<span class="mission-hud__label">Salvage</span> ';
    this.salvageText = document.createElement("span");
    this.salvageText.className = "mission-hud__value";
    salRow.appendChild(this.salvageText);
    top.appendChild(salRow);

    this.variantText = document.createElement("div");
    this.variantText.className = "mission-hud__row mission-hud__variant";
    top.appendChild(this.variantText);

    this.wallWarn = document.createElement("div");
    this.wallWarn.className =
      "mission-hud__wall-warn mission-hud__wall-warn--hidden";
    this.wallWarn.textContent = "OUTSIDE SAFE ZONE — STORM DAMAGE";
    top.appendChild(this.wallWarn);

    const timeRow = document.createElement("div");
    timeRow.className = "mission-hud__row";
    timeRow.innerHTML =
      '<span class="mission-hud__label">Mission</span> ';
    this.missionTimeText = document.createElement("span");
    this.missionTimeText.className = "mission-hud__value";
    timeRow.appendChild(this.missionTimeText);
    top.appendChild(timeRow);

    this.stormRow = document.createElement("div");
    this.stormRow.className = "mission-hud__row mission-hud__muted";
    this.stormRow.innerHTML =
      '<span class="mission-hud__label">Storm</span> ';
    this.stormText = document.createElement("span");
    this.stormText.className = "mission-hud__value";
    this.stormRow.appendChild(this.stormText);
    top.appendChild(this.stormRow);

    this.extractRow = document.createElement("div");
    this.extractRow.className =
      "mission-hud__row mission-hud__extract mission-hud__extract--hidden";
    this.extractText = document.createElement("span");
    this.extractText.className = "mission-hud__label";
    const exWrap = document.createElement("div");
    exWrap.className = "mission-hud__bar-wrap mission-hud__bar-wrap--extract";
    this.extractBar = document.createElement("div");
    this.extractBar.className = "mission-hud__bar-fill mission-hud__bar-fill--extract";
    exWrap.appendChild(this.extractBar);
    this.extractRow.appendChild(this.extractText);
    this.extractRow.appendChild(exWrap);
    top.appendChild(this.extractRow);

    this.overlay = document.createElement("div");
    this.overlay.className = "mission-hud__overlay mission-hud__overlay--hidden";
    this.overlayTitle = document.createElement("div");
    this.overlayTitle.className = "mission-hud__overlay-title";
    this.overlayHint = document.createElement("div");
    this.overlayHint.className = "mission-hud__overlay-hint";
    this.overlay.appendChild(this.overlayTitle);
    this.overlay.appendChild(this.overlayHint);
    document.body.appendChild(this.overlay);

    this.setCores(0, 3, 3, 0);
    this.missionTimeText.textContent = "00:00";
    this.stormText.textContent = "—:—";
    this.setFuel(100);
    this.setIntegrity(100);
    this.setExtractionHold(0, 4, false, false, 0);
    this.setSalvage(0, 0, 0);
    this.setVariantTitle("");
    this.setOutsideStormWall(false);
  }

  setFuel(percent: number): void {
    const p = Math.max(0, Math.min(100, percent));
    this.fuelBar.style.width = `${p}%`;
    this.fuelText.textContent = `Fuel ${p.toFixed(0)}%`;
  }

  /**
   * Cores: collected / required to extract; total on map; objective score.
   * Example: `2 / 4 required · 5 on map · +1250 pts`
   */
  setCores(
    collected: number,
    required: number,
    totalOnMap: number,
    objectivePts: number
  ): void {
    this.coresText.textContent = `${collected} / ${required} required · ${totalOnMap} on map · +${objectivePts} pts`;
  }

  setMissionElapsed(seconds: number): void {
    const s = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    this.missionTimeText.textContent = `${m}:${s}`;
  }

  /** Storm countdown (seconds remaining until zone lost). */
  setStormRemaining(seconds: number): void {
    const t = Math.max(0, Math.ceil(seconds));
    const s = (t % 60).toString().padStart(2, "0");
    const m = Math.floor(t / 60)
      .toString()
      .padStart(2, "0");
    this.stormText.textContent = `${m}:${s}`;
    this.stormRow.classList.toggle("mission-hud__storm--urgent", t <= 60 && t > 0);
  }

  setIntegrity(percent: number): void {
    const p = Math.max(0, Math.min(100, percent));
    this.integrityBar.style.width = `${p}%`;
    this.integrityText.textContent = `Suit ${p.toFixed(0)}%`;
    this.integrityBar.classList.toggle("mission-hud__bar-fill--low", p <= 30);
  }

  /**
   * Extraction: optional charging phase, then hold inside zone.
   * @param charging — beam still locking in; bar shows charge01
   */
  setExtractionHold(
    held: number,
    required: number,
    visible: boolean,
    charging: boolean,
    charge01: number
  ): void {
    this.extractRow.classList.toggle("mission-hud__extract--hidden", !visible);
    if (!visible) return;
    if (charging) {
      const f = Math.max(0, Math.min(1, charge01));
      this.extractBar.style.width = `${f * 100}%`;
      this.extractText.textContent = `Extraction charging… ${Math.round(f * 100)}%`;
      return;
    }
    const f = Math.max(0, Math.min(1, held / Math.max(0.001, required)));
    this.extractBar.style.width = `${f * 100}%`;
    this.extractText.textContent = `Hold ${held.toFixed(1)}s / ${required}s — drones active`;
  }

  setSalvage(collected: number, total: number, score: number): void {
    this.salvageText.textContent = `${collected} / ${total} · +${score} pts`;
  }

  setVariantTitle(title: string): void {
    this.variantText.textContent = title ? `Mission · ${title}` : "";
    this.variantText.style.display = title ? "block" : "none";
  }

  setOutsideStormWall(outside: boolean): void {
    this.wallWarn.classList.toggle("mission-hud__wall-warn--hidden", !outside);
  }

  setOutcome(
    outcome: MissionOutcome,
    opts?: { salvageScore?: number; objectiveScore?: number }
  ): void {
    if (outcome === "playing") {
      this.overlay.classList.add("mission-hud__overlay--hidden");
      return;
    }
    this.overlay.classList.remove("mission-hud__overlay--hidden");
    const hint = "R — retry  ·  N — next  ·  P — procedural  ·  D — daily  ·  X — mutators  ·  U — upgrades  ·  L — scores";
    if (outcome === "success") {
      this.overlayTitle.textContent = "Extraction complete";
      const obj = opts?.objectiveScore ?? 0;
      const sal = opts?.salvageScore ?? 0;
      const total = obj + sal;
      const lines = [
        `Objectives +${obj} · Salvage +${sal} · Total ${total}`,
        hint,
      ];
      this.overlayHint.textContent = lines.join("\n");
    } else {
      this.overlayTitle.textContent = "Mission failed";
      this.overlayHint.textContent = `${hint}`;
    }
  }

  dispose(): void {
    this.root.remove();
    this.overlay.remove();
  }
}
