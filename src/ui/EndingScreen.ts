/**
 * Shown once per session after the player extracts from Tier 12 for the first time.
 * Auto-dismisses on click or after 12 sec.
 */
export class EndingScreen {
  private root: HTMLDivElement;
  private visible = false;
  private onDismissCb: (() => void) | undefined;

  constructor(container: HTMLElement) {
    this.root = document.createElement("div");
    Object.assign(this.root.style, {
      position: "absolute",
      inset: "0",
      display: "none",
      background: "linear-gradient(180deg, #000004 0%, #100020 50%, #000004 100%)",
      color: "#dceaff",
      fontFamily: "monospace",
      zIndex: "300",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      cursor: "pointer",
      padding: "2rem",
    } as CSSStyleDeclaration);

    this.root.innerHTML = `
      <div style="font-size:0.9rem; letter-spacing:0.4em; color:#cc44ff; opacity:0.7;">— EXTRACTION COMPLETE —</div>
      <div style="font-size:3rem; letter-spacing:0.18em; margin-top:1.2rem; color:#ffffff; text-shadow:0 0 24px #cc44ff;">
        STARFALL SALVAGE
      </div>
      <div style="font-size:1.05rem; margin-top:0.4rem; letter-spacing:0.16em; color:#a070ff;">
        T A C T I C A L &nbsp; D E S C E N T
      </div>
      <div style="font-size:0.85rem; max-width:540px; margin-top:2.4rem; color:#aac4dc; line-height:1.7;">
        You crossed the singularity and lived. The drones never found you.<br/>
        Twelve worlds. Twelve graves you could have filled. You filled none of them.
      </div>
      <div style="font-size:0.85rem; max-width:520px; margin-top:1.4rem; color:#88ccff; line-height:1.7;">
        Endless mode unlocked.<br/>
        How far can you go before the storm catches up?
      </div>
      <div style="font-size:0.75rem; margin-top:3rem; color:#5a72a0; letter-spacing:0.2em;">
        click anywhere to continue
      </div>
    `;

    this.root.onclick = () => this.hide();

    container.appendChild(this.root);
  }

  show(onDismiss?: () => void): void {
    this.visible = true;
    this.onDismissCb = onDismiss;
    this.root.style.display = "flex";
    // Auto-dismiss after 12s
    window.setTimeout(() => { if (this.visible) this.hide(); }, 12000);
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.root.style.display = "none";
    this.onDismissCb?.();
    this.onDismissCb = undefined;
  }

  isVisible(): boolean { return this.visible; }
}
