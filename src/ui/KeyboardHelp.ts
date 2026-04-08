/**
 * In-game keyboard reference panel, toggled with H key.
 * Shows all controls in a two-column grid layout.
 */

const CONTROLS: [string, string][] = [
  ["W A S D / Arrows", "Movement"],
  ["Space", "Jetpack"],
  ["Shift (hold in air)", "Boost"],
  ["Q / Double-tap move", "Dash"],
  ["E", "Scanner Pulse"],
  ["F", "Decoy Beacon"],
  ["M", "Music Toggle"],
  ["ESC", "Settings"],
  ["R", "Restart Mission *"],
  ["N", "Next Mission *"],
  ["P", "Procedural Mission *"],
  ["D (end screen)", "Daily Challenge *"],
  ["X", "Mutators *"],
  ["U", "Upgrades *"],
  ["L", "Leaderboard *"],
  ["H", "Help"],
];

export class KeyboardHelp {
  private root: HTMLDivElement;
  private visible = false;
  private style: HTMLStyleElement;
  private onKey: (e: KeyboardEvent) => void;

  constructor(container: HTMLElement) {
    this.style = document.createElement("style");
    this.style.textContent = `
      @keyframes kbhelp-fadein {
        from { opacity:0; transform:translateY(8px); }
        to   { opacity:1; transform:translateY(0); }
      }
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
      background: "rgba(8,6,5,0.92)",
      fontFamily: "system-ui, sans-serif",
      userSelect: "none",
      opacity: "0",
      transition: "opacity 0.3s ease",
      pointerEvents: "none",
    } as CSSStyleDeclaration);

    container.appendChild(this.root);

    this.onKey = (e: KeyboardEvent) => {
      if (!this.visible) return;
      if (e.key === "h" || e.key === "H" || e.key === "Escape") {
        this.hide();
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("keydown", this.onKey);
  }

  /* ---- public ---- */

  show(): void {
    this.root.innerHTML = "";
    this.visible = true;

    const monoFont = 'ui-monospace, "Cascadia Mono", monospace';

    const panel = document.createElement("div");
    Object.assign(panel.style, {
      background: "rgba(8,6,5,0.94)",
      border: "1px solid rgba(74,216,160,0.2)",
      borderRadius: "12px",
      padding: "1.6rem 2rem",
      minWidth: "300px",
      maxWidth: "440px",
      width: "90vw",
      animation: "kbhelp-fadein 0.4s ease both",
    } as CSSStyleDeclaration);

    /* title */
    const title = document.createElement("div");
    title.textContent = "CONTROLS";
    Object.assign(title.style, {
      fontSize: "1rem",
      fontWeight: "700",
      letterSpacing: "0.16em",
      textAlign: "center",
      color: "#4ad8a0",
      marginBottom: "1.2rem",
    } as CSSStyleDeclaration);
    panel.appendChild(title);

    /* grid */
    const grid = document.createElement("div");
    Object.assign(grid.style, {
      display: "grid",
      gridTemplateColumns: "auto 1fr",
      gap: "0.45rem 1.2rem",
      alignItems: "center",
    } as CSSStyleDeclaration);

    for (const [key, action] of CONTROLS) {
      const keyEl = document.createElement("span");
      keyEl.textContent = key;
      Object.assign(keyEl.style, {
        fontFamily: monoFont,
        fontSize: "0.82rem",
        color: "#4ad8a0",
        textAlign: "right",
        whiteSpace: "nowrap",
      } as CSSStyleDeclaration);

      const labelEl = document.createElement("span");
      labelEl.textContent = action;
      Object.assign(labelEl.style, {
        fontSize: "0.82rem",
        color: "#e8e0d8",
      } as CSSStyleDeclaration);

      grid.appendChild(keyEl);
      grid.appendChild(labelEl);
    }

    panel.appendChild(grid);

    /* footnote */
    const note = document.createElement("div");
    note.textContent = "* after game over";
    Object.assign(note.style, {
      fontSize: "0.7rem",
      color: "#6a6460",
      textAlign: "center",
      marginTop: "0.8rem",
    } as CSSStyleDeclaration);
    panel.appendChild(note);

    /* close hint */
    const hint = document.createElement("div");
    hint.textContent = "H to close";
    Object.assign(hint.style, {
      fontSize: "0.72rem",
      color: "#6a6460",
      textAlign: "center",
      marginTop: "0.6rem",
      letterSpacing: "0.06em",
    } as CSSStyleDeclaration);
    panel.appendChild(hint);

    this.root.appendChild(panel);

    /* fade in */
    requestAnimationFrame(() => {
      this.root.style.opacity = "1";
      this.root.style.pointerEvents = "auto";
    });
  }

  hide(): void {
    this.visible = false;
    this.root.style.opacity = "0";
    this.root.style.pointerEvents = "none";
  }

  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  isVisible(): boolean {
    return this.visible;
  }
}
