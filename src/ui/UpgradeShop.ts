/**
 * Between-run upgrade shop.
 * Spend salvage on permanent upgrades (3 tiers each).
 * Persisted to localStorage.
 */

const STORAGE_KEY = "starfall_upgrades";

export type UpgradeId = "fuel_cap" | "jet_eff" | "armor" | "speed" | "scanner";

export type UpgradeState = Record<UpgradeId, number>; // tier 0-3

/* ---- upgrade definitions ---- */

type UpgradeDef = {
  id: UpgradeId;
  name: string;
  desc: string;
  tierCosts: [number, number, number]; // cost for tier 1, 2, 3
  tierLabels: [string, string, string];
};

const UPGRADES: UpgradeDef[] = [
  {
    id: "fuel_cap",
    name: "Fuel Capacity",
    desc: "+15% per tier",
    tierCosts: [200, 500, 1200],
    tierLabels: ["+15%", "+30%", "+45%"],
  },
  {
    id: "jet_eff",
    name: "Jet Efficiency",
    desc: "-12% fuel drain per tier",
    tierCosts: [250, 600, 1400],
    tierLabels: ["-12%", "-24%", "-36%"],
  },
  {
    id: "armor",
    name: "Armor Plating",
    desc: "+20 integrity per tier",
    tierCosts: [180, 450, 1000],
    tierLabels: ["+20", "+40", "+60"],
  },
  {
    id: "speed",
    name: "Speed Boost",
    desc: "+10% move speed per tier",
    tierCosts: [220, 550, 1300],
    tierLabels: ["+10%", "+20%", "+30%"],
  },
  {
    id: "scanner",
    name: "Scanner Range",
    desc: "+25% minimap range per tier",
    tierCosts: [150, 400, 900],
    tierLabels: ["+25%", "+50%", "+75%"],
  },
];

const DEFAULT_STATE: UpgradeState = {
  fuel_cap: 0,
  jet_eff: 0,
  armor: 0,
  speed: 0,
  scanner: 0,
};

/* ---- multiplier table ---- */

const MULTIPLIERS: Record<UpgradeId, number[]> = {
  fuel_cap: [1, 1.15, 1.30, 1.45],
  jet_eff:  [1, 0.88, 0.76, 0.64],
  armor:    [1, 1.20, 1.40, 1.60], // treated as additive +20/+40/+60 but expressed as multiplier on base 100
  speed:    [1, 1.10, 1.20, 1.30],
  scanner:  [1, 1.25, 1.50, 1.75],
};

/* ------------------------------------------------------------------ */

export class UpgradeShop {
  private root: HTMLDivElement;
  private visible = false;
  private style: HTMLStyleElement;
  private onClose: () => void;
  private currency = 0;
  private upgrades: UpgradeState = { ...DEFAULT_STATE };
  private currencyEl!: HTMLSpanElement;
  private cardEls: Map<UpgradeId, HTMLDivElement> = new Map();

  constructor(container: HTMLElement, onClose: () => void) {
    this.onClose = onClose;

    this.style = document.createElement("style");
    this.style.textContent = `
      @keyframes us-fadein { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
      .us-card:hover { border-color: rgba(74,216,160,0.5) !important; }
      .us-buy-btn { cursor: pointer; transition: background 0.2s, color 0.2s; }
      .us-buy-btn:hover:not([disabled]) { background: #4ad8a0 !important; color: #080605 !important; }
      .us-buy-btn[disabled] { opacity: 0.35; cursor: default; }
    `;
    document.head.appendChild(this.style);

    this.root = document.createElement("div");
    Object.assign(this.root.style, {
      position: "fixed",
      inset: "0",
      zIndex: "970",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(8,6,5,0.9)",
      fontFamily: "system-ui, sans-serif",
      userSelect: "none",
      opacity: "0",
      transition: "opacity 0.35s ease",
      pointerEvents: "none",
    } as CSSStyleDeclaration);

    container.appendChild(this.root);

    // ESC handler
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.visible) {
        this.hide();
      }
    });
  }

  /* ---- public ---- */

  show(currency: number): void {
    const saved = UpgradeShop.loadState();
    this.currency = currency;
    this.upgrades = { ...saved.upgrades };
    this.buildUI();
    this.visible = true;
    this.root.style.pointerEvents = "auto";
    void this.root.offsetHeight;
    this.root.style.opacity = "1";
  }

  hide(): void {
    UpgradeShop.saveState(this.currency, this.upgrades);
    this.visible = false;
    this.root.style.opacity = "0";
    this.root.style.pointerEvents = "none";
    this.onClose();
  }

  isVisible(): boolean {
    return this.visible;
  }

  getCurrency(): number {
    return this.currency;
  }

  getUpgrades(): UpgradeState {
    return { ...this.upgrades };
  }

  /* ---- static helpers ---- */

  static loadState(): { currency: number; upgrades: UpgradeState } {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        return {
          currency: data.currency ?? 0,
          upgrades: { ...DEFAULT_STATE, ...data.upgrades },
        };
      }
    } catch { /* empty */ }
    return { currency: 0, upgrades: { ...DEFAULT_STATE } };
  }

  static saveState(currency: number, upgrades: UpgradeState): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ currency, upgrades }));
  }

  static getMultiplier(id: UpgradeId, tier: number): number {
    const t = Math.max(0, Math.min(3, tier));
    return MULTIPLIERS[id][t];
  }

  /* ---- internal ---- */

  private buildUI(): void {
    this.root.innerHTML = "";
    this.cardEls.clear();

    const monoFont = 'ui-monospace, "Cascadia Mono", monospace';

    const panel = document.createElement("div");
    Object.assign(panel.style, {
      background: "rgba(8,6,5,0.94)",
      border: "1px solid rgba(74,216,160,0.2)",
      borderRadius: "12px",
      padding: "1.6rem 2rem",
      maxWidth: "560px",
      width: "94vw",
      maxHeight: "88vh",
      overflowY: "auto",
      animation: "us-fadein 0.4s ease both",
    } as CSSStyleDeclaration);

    // header row
    const headerRow = document.createElement("div");
    Object.assign(headerRow.style, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "1.2rem",
    } as CSSStyleDeclaration);

    const title = document.createElement("span");
    title.textContent = "UPGRADES";
    Object.assign(title.style, {
      fontSize: "1rem",
      fontWeight: "700",
      letterSpacing: "0.16em",
      color: "#4ad8a0",
    } as CSSStyleDeclaration);

    const currRow = document.createElement("span");
    this.currencyEl = document.createElement("span");
    this.currencyEl.textContent = this.currency.toLocaleString();
    Object.assign(this.currencyEl.style, {
      fontFamily: monoFont,
      fontSize: "1rem",
      fontWeight: "700",
      color: "#c45a2e",
    } as CSSStyleDeclaration);

    const currLabel = document.createElement("span");
    currLabel.textContent = " salvage";
    Object.assign(currLabel.style, {
      fontSize: "0.8rem",
      color: "#9a9288",
    } as CSSStyleDeclaration);

    currRow.appendChild(this.currencyEl);
    currRow.appendChild(currLabel);

    headerRow.appendChild(title);
    headerRow.appendChild(currRow);
    panel.appendChild(headerRow);

    // upgrade cards
    for (let i = 0; i < UPGRADES.length; i++) {
      const def = UPGRADES[i];
      const card = this.createCard(def, i);
      this.cardEls.set(def.id, card);
      panel.appendChild(card);
    }

    // close hint
    const hint = document.createElement("div");
    hint.textContent = "ESC to close";
    Object.assign(hint.style, {
      textAlign: "center",
      fontSize: "0.72rem",
      fontFamily: monoFont,
      color: "#9a9288",
      marginTop: "1rem",
      opacity: "0.6",
    } as CSSStyleDeclaration);
    panel.appendChild(hint);

    this.root.appendChild(panel);
  }

  private createCard(def: UpgradeDef, index: number): HTMLDivElement {
    const monoFont = 'ui-monospace, "Cascadia Mono", monospace';
    const tier = this.upgrades[def.id];

    const card = document.createElement("div");
    card.className = "us-card";
    Object.assign(card.style, {
      background: "rgba(154,146,136,0.06)",
      border: "1px solid rgba(154,146,136,0.15)",
      borderRadius: "8px",
      padding: "0.8rem 1rem",
      marginBottom: "0.6rem",
      display: "grid",
      gridTemplateColumns: "1fr auto",
      gap: "0.5rem",
      alignItems: "center",
      animation: "us-fadein 0.35s ease both",
      animationDelay: `${index * 0.06}s`,
      transition: "border-color 0.2s",
    } as CSSStyleDeclaration);

    // left side: name, desc, tier pips
    const left = document.createElement("div");

    const nameEl = document.createElement("div");
    nameEl.textContent = def.name;
    Object.assign(nameEl.style, {
      fontSize: "0.9rem",
      fontWeight: "600",
      color: "#e8e0d8",
      marginBottom: "0.15rem",
    } as CSSStyleDeclaration);

    const descEl = document.createElement("div");
    descEl.textContent = def.desc;
    Object.assign(descEl.style, {
      fontSize: "0.72rem",
      color: "#9a9288",
      marginBottom: "0.4rem",
    } as CSSStyleDeclaration);

    // tier pips
    const pips = document.createElement("div");
    Object.assign(pips.style, { display: "flex", gap: "0.3rem", alignItems: "center" } as CSSStyleDeclaration);

    for (let t = 0; t < 3; t++) {
      const pip = document.createElement("div");
      const filled = t < tier;
      Object.assign(pip.style, {
        width: "28px",
        height: "6px",
        borderRadius: "3px",
        background: filled ? "#4ad8a0" : "rgba(154,146,136,0.2)",
        transition: "background 0.3s",
      } as CSSStyleDeclaration);

      if (filled) {
        const label = document.createElement("span");
        label.style.display = "none"; // pips are visual only
      }

      pips.appendChild(pip);
    }

    // current bonus label
    if (tier > 0) {
      const bonusLabel = document.createElement("span");
      bonusLabel.textContent = def.tierLabels[tier - 1];
      Object.assign(bonusLabel.style, {
        fontFamily: monoFont,
        fontSize: "0.7rem",
        fontWeight: "600",
        color: "#4ad8a0",
        marginLeft: "0.5rem",
      } as CSSStyleDeclaration);
      pips.appendChild(bonusLabel);
    }

    left.append(nameEl, descEl, pips);

    // right side: buy button
    const right = document.createElement("div");
    Object.assign(right.style, { textAlign: "right" } as CSSStyleDeclaration);

    if (tier >= 3) {
      const maxed = document.createElement("span");
      maxed.textContent = "MAX";
      Object.assign(maxed.style, {
        fontFamily: monoFont,
        fontSize: "0.8rem",
        fontWeight: "700",
        color: "#4ad8a0",
        opacity: "0.7",
      } as CSSStyleDeclaration);
      right.appendChild(maxed);
    } else {
      const cost = def.tierCosts[tier];
      const canAfford = this.currency >= cost;

      const btn = document.createElement("button");
      btn.className = "us-buy-btn";
      btn.disabled = !canAfford;
      btn.textContent = `${cost}`;
      Object.assign(btn.style, {
        fontFamily: monoFont,
        fontSize: "0.82rem",
        fontWeight: "600",
        padding: "0.35rem 0.8rem",
        border: "1px solid rgba(74,216,160,0.35)",
        borderRadius: "6px",
        background: "transparent",
        color: canAfford ? "#4ad8a0" : "#9a9288",
      } as CSSStyleDeclaration);

      btn.addEventListener("click", () => {
        if (this.currency < cost) return;
        this.currency -= cost;
        this.upgrades[def.id] = tier + 1;
        UpgradeShop.saveState(this.currency, this.upgrades);
        this.buildUI(); // rebuild
      });

      right.appendChild(btn);
    }

    card.append(left, right);
    return card;
  }
}
