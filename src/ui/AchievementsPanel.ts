import { ACHIEVEMENTS, getEarnedPerkPoints, unlockedCount } from "../game/achievements";
import { loadProgression } from "../game/progression";
import { PERKS, loadActivePerks, saveActivePerks, maxActivePerks } from "../game/perks";

/**
 * Two-column overlay: achievements list (left), perk loadout (right).
 * Open with K. Esc to close.
 */
export class AchievementsPanel {
  private root: HTMLDivElement;
  private visible = false;

  constructor(container: HTMLElement) {
    this.root = document.createElement("div");
    Object.assign(this.root.style, {
      position: "absolute",
      inset: "0",
      display: "none",
      background: "rgba(4, 6, 12, 0.92)",
      color: "#dceaff",
      fontFamily: "monospace",
      zIndex: "200",
      padding: "2.5rem",
      overflow: "auto",
    } as CSSStyleDeclaration);
    container.appendChild(this.root);
  }

  show(): void {
    this.visible = true;
    this.root.style.display = "block";
    this.render();
  }

  hide(): void {
    this.visible = false;
    this.root.style.display = "none";
  }

  isVisible(): boolean { return this.visible; }

  toggle(): void { if (this.visible) this.hide(); else this.show(); }

  private render(): void {
    const state = loadProgression();
    const earned = getEarnedPerkPoints();
    const active = loadActivePerks();
    const maxSlots = maxActivePerks();
    this.root.innerHTML = "";

    const header = document.createElement("div");
    header.innerHTML = `
      <div style="font-size:1.6rem; letter-spacing:0.18em; color:#88ccff; margin-bottom:0.4rem;">PROGRESSION</div>
      <div style="font-size:0.85rem; color:#aac4dc; margin-bottom:1.6rem;">
        ${unlockedCount()}/${ACHIEVEMENTS.length} achievements · ${earned} perk points · ${maxSlots} active slots
        ${state.campaignComplete ? '· <span style="color:#88ff88;">CAMPAIGN COMPLETE</span>' : ''}
        ${state.highestEndlessTier > 0 ? `· endless tier ${state.highestEndlessTier}` : ''}
      </div>
    `;
    this.root.appendChild(header);

    const cols = document.createElement("div");
    Object.assign(cols.style, {
      display: "grid",
      gridTemplateColumns: "1.4fr 1fr",
      gap: "1.6rem",
    });
    this.root.appendChild(cols);

    /* --- Achievements --- */
    const achCol = document.createElement("div");
    const achTitle = document.createElement("div");
    achTitle.textContent = "ACHIEVEMENTS";
    Object.assign(achTitle.style, { fontSize: "1.05rem", color: "#88ccff", letterSpacing: "0.16em", marginBottom: "0.8rem" });
    achCol.appendChild(achTitle);
    for (const a of ACHIEVEMENTS) {
      const got = state.unlockedAchievements.includes(a.id);
      const row = document.createElement("div");
      Object.assign(row.style, {
        padding: "0.5rem 0.8rem",
        marginBottom: "0.35rem",
        background: got ? "rgba(40, 80, 50, 0.6)" : "rgba(20, 28, 40, 0.7)",
        border: `1px solid ${got ? "#66cc88" : "#2a3a4a"}`,
        opacity: got ? "1" : "0.62",
        borderRadius: "3px",
      } as CSSStyleDeclaration);
      row.innerHTML = `
        <div style="font-size:0.95rem; color:${got ? "#ddffdd" : "#dceaff"}; letter-spacing:0.06em;">
          ${got ? "✓ " : ""}${a.name}
        </div>
        <div style="font-size:0.75rem; color:#aac4dc; margin-top:0.2rem;">${a.description}</div>
      `;
      achCol.appendChild(row);
    }
    cols.appendChild(achCol);

    /* --- Perks --- */
    const perkCol = document.createElement("div");
    const pTitle = document.createElement("div");
    pTitle.textContent = `PERKS (${active.length}/${maxSlots})`;
    Object.assign(pTitle.style, { fontSize: "1.05rem", color: "#88ccff", letterSpacing: "0.16em", marginBottom: "0.8rem" });
    perkCol.appendChild(pTitle);
    for (const p of PERKS) {
      const isActive = active.includes(p.id);
      const row = document.createElement("button");
      row.dataset.perkId = p.id;
      Object.assign(row.style, {
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "0.55rem 0.8rem",
        marginBottom: "0.35rem",
        background: isActive ? "rgba(50, 100, 160, 0.85)" : "rgba(20, 28, 40, 0.7)",
        border: `1px solid ${isActive ? "#88ccff" : "#2a3a4a"}`,
        color: "#dceaff",
        cursor: "pointer",
        borderRadius: "3px",
        fontFamily: "inherit",
      } as CSSStyleDeclaration);
      row.innerHTML = `
        <div style="font-size:0.95rem; letter-spacing:0.05em;">${isActive ? "● " : "○ "}${p.name}</div>
        <div style="font-size:0.75rem; color:#aac4dc; margin-top:0.2rem;">${p.description}</div>
      `;
      row.onclick = () => {
        const cur = loadActivePerks();
        if (cur.includes(p.id)) {
          saveActivePerks(cur.filter((x) => x !== p.id));
        } else if (cur.length < maxActivePerks()) {
          saveActivePerks([...cur, p.id]);
        } else {
          // Replace last
          saveActivePerks([...cur.slice(0, -1), p.id]);
        }
        this.render();
      };
      perkCol.appendChild(row);
    }
    cols.appendChild(perkCol);

    const hint = document.createElement("div");
    hint.textContent = "ESC or K to close — perks apply on next mission";
    Object.assign(hint.style, { marginTop: "1.2rem", fontSize: "0.75rem", color: "#7a92b0" });
    this.root.appendChild(hint);
  }
}
