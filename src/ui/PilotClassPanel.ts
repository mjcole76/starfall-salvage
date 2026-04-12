import {
  PILOT_CLASSES,
  loadPilotClass,
  savePilotClass,
  type PilotClassId,
} from "../game/pilotClass";

/**
 * Press P to open. Click a class to select. Esc closes.
 */
export class PilotClassPanel {
  private root: HTMLDivElement;
  private visible = false;
  private currentId: PilotClassId;
  private onChange: ((id: PilotClassId) => void) | undefined;

  constructor(container: HTMLElement, onChange?: (id: PilotClassId) => void) {
    this.currentId = loadPilotClass();
    this.onChange = onChange;
    this.root = document.createElement("div");
    Object.assign(this.root.style, {
      position: "absolute",
      inset: "0",
      display: "none",
      background: "rgba(4, 6, 12, 0.85)",
      color: "#dceaff",
      fontFamily: "monospace",
      zIndex: "200",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
    } as CSSStyleDeclaration);

    const title = document.createElement("div");
    title.textContent = "SELECT PILOT CLASS";
    Object.assign(title.style, {
      fontSize: "1.6rem",
      letterSpacing: "0.18em",
      marginBottom: "1.2rem",
      color: "#88ccff",
    });
    this.root.appendChild(title);

    const grid = document.createElement("div");
    Object.assign(grid.style, {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(220px, 1fr))",
      gap: "0.8rem",
      maxWidth: "560px",
    });
    this.root.appendChild(grid);

    for (const c of PILOT_CLASSES) {
      const card = document.createElement("button");
      card.dataset.classId = c.id;
      card.innerHTML = `
        <div style="font-size:1.1rem; color:#ffffff; letter-spacing:0.08em;">${c.name.toUpperCase()}</div>
        <div style="font-size:0.85rem; color:#aac4dc; margin-top:0.3rem;">${c.description}</div>
      `;
      Object.assign(card.style, {
        padding: "0.9rem 1rem",
        background: "rgba(20, 30, 50, 0.85)",
        border: "1px solid #2a4060",
        color: "#dceaff",
        cursor: "pointer",
        textAlign: "left",
        borderRadius: "4px",
      } as CSSStyleDeclaration);
      card.onmouseenter = () => { card.style.background = "rgba(40, 70, 110, 0.9)"; };
      card.onmouseleave = () => { this.refreshSelection(); };
      card.onclick = () => {
        this.currentId = c.id;
        savePilotClass(c.id);
        this.refreshSelection();
        this.onChange?.(c.id);
      };
      grid.appendChild(card);
    }

    const hint = document.createElement("div");
    hint.textContent = "Press ESC or P to close — change applies on next mission";
    Object.assign(hint.style, {
      marginTop: "1.2rem",
      fontSize: "0.75rem",
      color: "#7a92b0",
    });
    this.root.appendChild(hint);

    container.appendChild(this.root);
    this.refreshSelection();
  }

  private refreshSelection(): void {
    const cards = this.root.querySelectorAll<HTMLButtonElement>("button[data-class-id]");
    cards.forEach((c) => {
      if (c.dataset.classId === this.currentId) {
        c.style.borderColor = "#88ccff";
        c.style.background = "rgba(40, 80, 120, 0.95)";
      } else {
        c.style.borderColor = "#2a4060";
        c.style.background = "rgba(20, 30, 50, 0.85)";
      }
    });
  }

  show(): void {
    this.visible = true;
    this.root.style.display = "flex";
    this.refreshSelection();
  }

  hide(): void {
    this.visible = false;
    this.root.style.display = "none";
  }

  isVisible(): boolean {
    return this.visible;
  }

  toggle(): void {
    if (this.visible) this.hide(); else this.show();
  }
}
