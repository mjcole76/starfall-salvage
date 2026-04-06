/**
 * First-run tutorial hint overlay.
 * Shows control hints in semi-transparent cards near the bottom of screen.
 * Auto-dismisses after 8 s or on first keypress.
 * Uses localStorage so it only appears once.
 */

const STORAGE_KEY = "starfall_tutorial_seen";

export class TutorialOverlay {
  private root: HTMLDivElement;
  private visible = false;
  private style: HTMLStyleElement;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private boundKey: (e: KeyboardEvent) => void;

  constructor(container: HTMLElement) {
    // --- keyframe styles ---
    this.style = document.createElement("style");
    this.style.textContent = `
      @keyframes tut-slideup {
        from { opacity: 0; transform: translateY(24px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(this.style);

    // --- root ---
    this.root = document.createElement("div");
    Object.assign(this.root.style, {
      position: "fixed",
      left: "0",
      right: "0",
      bottom: "6vh",
      zIndex: "900",
      display: "flex",
      justifyContent: "center",
      gap: "1rem",
      flexWrap: "wrap",
      padding: "0 1rem",
      pointerEvents: "none",
      opacity: "0",
      transition: "opacity 0.5s ease",
      fontFamily: "system-ui, sans-serif",
      userSelect: "none",
    } as CSSStyleDeclaration);

    const hints: [string, string][] = [
      ["WASD / Arrows", "Movement"],
      ["SPACE", "Jetpack"],
      ["SHIFT", "Boost"],
      ["Q / Double-Tap", "Dash"],
    ];

    for (const [key, label] of hints) {
      const card = document.createElement("div");
      Object.assign(card.style, {
        background: "rgba(8,6,5,0.72)",
        border: "1px solid rgba(74,216,160,0.25)",
        borderRadius: "8px",
        padding: "0.65rem 1.1rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.25rem",
        animation: "tut-slideup 0.5s ease both",
      } as CSSStyleDeclaration);

      const keyEl = document.createElement("span");
      keyEl.textContent = key;
      Object.assign(keyEl.style, {
        fontFamily: 'ui-monospace, "Cascadia Mono", monospace',
        fontSize: "0.95rem",
        fontWeight: "700",
        color: "#4ad8a0",
        letterSpacing: "0.06em",
      } as CSSStyleDeclaration);

      const labelEl = document.createElement("span");
      labelEl.textContent = label;
      Object.assign(labelEl.style, {
        fontSize: "0.75rem",
        fontWeight: "400",
        color: "#9a9288",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
      } as CSSStyleDeclaration);

      card.appendChild(keyEl);
      card.appendChild(labelEl);
      this.root.appendChild(card);
    }

    container.appendChild(this.root);

    // --- keypress listener ---
    this.boundKey = () => this.dismiss();
  }

  /* ---- public API ---- */

  show(): void {
    // skip if already seen
    if (localStorage.getItem(STORAGE_KEY) === "1") return;

    this.visible = true;
    void this.root.offsetHeight;
    this.root.style.opacity = "1";

    // stagger card animations
    const cards = this.root.children;
    for (let i = 0; i < cards.length; i++) {
      (cards[i] as HTMLElement).style.animationDelay = `${i * 0.12}s`;
    }

    // auto-dismiss after 8 s
    this.timer = setTimeout(() => this.dismiss(), 8000);

    // dismiss on first keypress
    window.addEventListener("keydown", this.boundKey, { once: true });
  }

  dismiss(): void {
    if (!this.visible) return;
    this.visible = false;
    this.root.style.opacity = "0";

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    window.removeEventListener("keydown", this.boundKey);

    localStorage.setItem(STORAGE_KEY, "1");
  }

  isVisible(): boolean {
    return this.visible;
  }
}
