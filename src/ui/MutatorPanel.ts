/**
 * MutatorPanel — UI for selecting mission mutators.
 * Shown from the stats screen with the 'X' key.
 */

import {
  MUTATOR_DEFS,
  type ActiveMutators,
  loadMutators,
  saveMutators,
  getMutatorScoreMultiplier,
} from "../mission/mutators";

export class MutatorPanel {
  private root: HTMLDivElement;
  private visible = false;
  private active: ActiveMutators;
  private onClose: () => void;

  constructor(container: HTMLElement, onClose: () => void) {
    this.onClose = onClose;
    this.active = loadMutators();

    this.root = document.createElement("div");
    Object.assign(this.root.style, {
      position: "fixed",
      inset: "0",
      zIndex: "960",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(8,6,5,0.9)",
      fontFamily: 'ui-monospace, "Cascadia Mono", monospace',
      userSelect: "none",
      opacity: "0",
      transition: "opacity 0.3s ease",
      pointerEvents: "none",
    });
    container.appendChild(this.root);

    // Key handling done by Game.ts to avoid double-listener conflicts
  }

  show(): void {
    this.active = loadMutators();
    this.buildUI();
    this.visible = true;
    this.root.style.pointerEvents = "auto";
    void this.root.offsetHeight;
    this.root.style.opacity = "1";
  }

  hide(): void {
    saveMutators(this.active);
    this.visible = false;
    this.root.style.opacity = "0";
    this.root.style.pointerEvents = "none";
    this.onClose();
  }

  isVisible(): boolean { return this.visible; }
  getActive(): ActiveMutators { return this.active; }

  private buildUI(): void {
    this.root.innerHTML = "";

    const panel = document.createElement("div");
    Object.assign(panel.style, {
      background: "rgba(8,6,5,0.94)",
      border: "1px solid rgba(255,160,30,0.3)",
      borderRadius: "10px",
      padding: "24px 28px",
      width: "400px",
      maxHeight: "80vh",
      overflowY: "auto",
    });

    const title = document.createElement("div");
    Object.assign(title.style, {
      fontSize: "16px",
      fontWeight: "700",
      color: "#ffaa33",
      textAlign: "center",
      marginBottom: "8px",
      letterSpacing: "1.5px",
      textTransform: "uppercase",
    });
    title.textContent = "Mission Mutators";
    panel.appendChild(title);

    const multiplierEl = document.createElement("div");
    Object.assign(multiplierEl.style, {
      fontSize: "11px",
      color: "#998866",
      textAlign: "center",
      marginBottom: "16px",
    });
    const updateMultiplier = () => {
      const mult = getMutatorScoreMultiplier(this.active);
      multiplierEl.textContent = `Score multiplier: x${mult.toFixed(2)}`;
    };
    updateMultiplier();
    panel.appendChild(multiplierEl);

    for (const def of MUTATOR_DEFS) {
      const row = document.createElement("div");
      Object.assign(row.style, {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 6px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        cursor: "pointer",
        borderRadius: "4px",
      });
      row.addEventListener("mouseenter", () => {
        row.style.background = "rgba(255,160,30,0.06)";
      });
      row.addEventListener("mouseleave", () => {
        row.style.background = "transparent";
      });

      const left = document.createElement("div");
      const nameEl = document.createElement("div");
      Object.assign(nameEl.style, { fontSize: "12px", color: "#e8e0d8", fontWeight: "600" });
      nameEl.textContent = def.name;
      const descEl = document.createElement("div");
      Object.assign(descEl.style, { fontSize: "10px", color: "#888", marginTop: "2px" });
      descEl.textContent = `${def.desc} (x${def.scoreMultiplier})`;
      left.appendChild(nameEl);
      left.appendChild(descEl);

      const toggle = document.createElement("div");
      const isOn = this.active.has(def.id);
      Object.assign(toggle.style, {
        width: "36px",
        height: "20px",
        borderRadius: "10px",
        border: `1px solid ${isOn ? "rgba(255,160,30,0.6)" : "rgba(255,255,255,0.15)"}`,
        background: isOn ? "rgba(255,160,30,0.3)" : "rgba(255,255,255,0.06)",
        position: "relative",
        flexShrink: "0",
        transition: "background 0.2s, border-color 0.2s",
      });
      const dot = document.createElement("div");
      Object.assign(dot.style, {
        width: "14px",
        height: "14px",
        borderRadius: "50%",
        background: isOn ? "#ffaa33" : "#666",
        position: "absolute",
        top: "2px",
        left: isOn ? "18px" : "2px",
        transition: "left 0.2s, background 0.2s",
      });
      toggle.appendChild(dot);

      row.addEventListener("click", () => {
        if (this.active.has(def.id)) {
          this.active.delete(def.id);
        } else {
          this.active.add(def.id);
        }
        const on = this.active.has(def.id);
        toggle.style.border = `1px solid ${on ? "rgba(255,160,30,0.6)" : "rgba(255,255,255,0.15)"}`;
        toggle.style.background = on ? "rgba(255,160,30,0.3)" : "rgba(255,255,255,0.06)";
        dot.style.left = on ? "18px" : "2px";
        dot.style.background = on ? "#ffaa33" : "#666";
        updateMultiplier();
      });

      row.appendChild(left);
      row.appendChild(toggle);
      panel.appendChild(row);
    }

    const hint = document.createElement("div");
    Object.assign(hint.style, {
      textAlign: "center",
      fontSize: "10px",
      color: "#665544",
      marginTop: "14px",
    });
    hint.textContent = "Press X or ESC to close";
    panel.appendChild(hint);

    this.root.appendChild(panel);
  }
}
