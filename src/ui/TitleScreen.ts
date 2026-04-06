/**
 * Fullscreen title screen overlay.
 * Dark semi-transparent backdrop with game title, subtitle, and pulsing prompt.
 */
export class TitleScreen {
  private root: HTMLDivElement;
  private visible = false;
  private onStart: () => void;
  private style: HTMLStyleElement;

  constructor(container: HTMLElement, onStart: () => void) {
    this.onStart = onStart;

    // --- inject keyframe styles ---
    this.style = document.createElement("style");
    this.style.textContent = `
      @keyframes ts-pulse {
        0%, 100% { opacity: 0.45; }
        50%      { opacity: 1; }
      }
      @keyframes ts-glow {
        0%, 100% { text-shadow: 0 0 12px rgba(74,216,160,0.35), 0 0 40px rgba(74,216,160,0.12); }
        50%      { text-shadow: 0 0 20px rgba(74,216,160,0.55), 0 0 60px rgba(74,216,160,0.2); }
      }
      @keyframes ts-fadein {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
    `;
    document.head.appendChild(this.style);

    // --- root container ---
    this.root = document.createElement("div");
    Object.assign(this.root.style, {
      position: "fixed",
      inset: "0",
      zIndex: "1000",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(8,6,5,0.82)",
      fontFamily: "system-ui, sans-serif",
      userSelect: "none",
      cursor: "pointer",
      opacity: "0",
      transition: "opacity 0.5s ease",
      pointerEvents: "none",
    } as CSSStyleDeclaration);

    // --- title ---
    const title = document.createElement("h1");
    title.textContent = "STARFALL SALVAGE";
    Object.assign(title.style, {
      margin: "0",
      fontSize: "clamp(2.4rem, 6vw, 5rem)",
      fontWeight: "800",
      letterSpacing: "0.12em",
      color: "#e8e0d8",
      textShadow: "0 0 16px rgba(74,216,160,0.4), 0 0 48px rgba(74,216,160,0.15)",
      animation: "ts-glow 3s ease-in-out infinite",
    } as CSSStyleDeclaration);
    this.root.appendChild(title);

    // --- subtitle ---
    const sub = document.createElement("p");
    sub.textContent = "Tactical Extraction Runner";
    Object.assign(sub.style, {
      margin: "0.6rem 0 0",
      fontSize: "clamp(0.85rem, 2vw, 1.25rem)",
      fontWeight: "400",
      letterSpacing: "0.25em",
      textTransform: "uppercase",
      color: "#9a9288",
    } as CSSStyleDeclaration);
    this.root.appendChild(sub);

    // --- prompt ---
    const prompt = document.createElement("p");
    prompt.textContent = "Click to begin";
    Object.assign(prompt.style, {
      marginTop: "3rem",
      fontSize: "clamp(0.9rem, 1.8vw, 1.1rem)",
      fontWeight: "500",
      color: "#4ad8a0",
      animation: "ts-pulse 2.2s ease-in-out infinite",
    } as CSSStyleDeclaration);
    this.root.appendChild(prompt);

    container.appendChild(this.root);

    // --- click handler ---
    this.root.addEventListener("click", this.handleClick);
  }

  /* ---- public API ---- */

  show(): void {
    this.visible = true;
    this.root.style.pointerEvents = "auto";
    // force reflow then fade in
    void this.root.offsetHeight;
    this.root.style.opacity = "1";
  }

  hide(): void {
    this.visible = false;
    this.root.style.opacity = "0";
    this.root.style.pointerEvents = "none";
  }

  isVisible(): boolean {
    return this.visible;
  }

  /* ---- internal ---- */

  private handleClick = (): void => {
    if (!this.visible) return;
    this.hide();
    this.onStart();
  };
}
