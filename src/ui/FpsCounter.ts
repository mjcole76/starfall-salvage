/**
 * Simple FPS counter, toggleable from settings.
 * Updates once per second with the average frame rate.
 */

export class FpsCounter {
  private root: HTMLDivElement;
  private frames = 0;
  private elapsed = 0;

  constructor(container: HTMLElement) {
    const monoFont = 'ui-monospace, "Cascadia Mono", monospace';

    this.root = document.createElement("div");
    Object.assign(this.root.style, {
      position: "fixed",
      top: "4px",
      right: "4px",
      zIndex: "950",
      fontFamily: monoFont,
      fontSize: "10px",
      color: "rgba(255,255,255,0.4)",
      background: "rgba(0,0,0,0.15)",
      padding: "2px 6px",
      borderRadius: "3px",
      pointerEvents: "none",
      userSelect: "none",
      lineHeight: "1.2",
      display: "none",
    } as CSSStyleDeclaration);
    this.root.textContent = "-- FPS";

    container.appendChild(this.root);
  }

  /* ---- public ---- */

  update(dt: number): void {
    this.frames++;
    this.elapsed += dt;

    if (this.elapsed >= 1) {
      const fps = Math.round(this.frames / this.elapsed);
      this.root.textContent = `${fps} FPS`;
      this.frames = 0;
      this.elapsed = 0;
    }
  }

  show(): void {
    this.root.style.display = "block";
  }

  hide(): void {
    this.root.style.display = "none";
  }

  dispose(): void {
    this.root.remove();
  }
}
