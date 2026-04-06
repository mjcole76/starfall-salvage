/**
 * Simple full-screen fade overlay for scene transitions.
 *
 * fadeIn  = black -> transparent  (revealing the scene)
 * fadeOut = transparent -> black   (hiding the scene)
 */
export class ScreenTransition {
  private overlay: HTMLDivElement;

  constructor(container: HTMLElement) {
    this.overlay = document.createElement("div");
    Object.assign(this.overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: "1100",
      background: "#080605",
      pointerEvents: "none",
      opacity: "0",
      transition: "none", // managed per-call
    } as CSSStyleDeclaration);

    container.appendChild(this.overlay);
  }

  /** Fade FROM black (black -> transparent). Resolves when fully transparent. */
  fadeIn(durationSec: number): Promise<void> {
    return new Promise<void>((resolve) => {
      // ensure we start opaque
      this.overlay.style.transition = "none";
      this.overlay.style.opacity = "1";

      // force reflow
      void this.overlay.offsetHeight;

      this.overlay.style.transition = `opacity ${durationSec}s ease`;
      this.overlay.style.opacity = "0";

      const onEnd = () => {
        this.overlay.removeEventListener("transitionend", onEnd);
        resolve();
      };
      this.overlay.addEventListener("transitionend", onEnd);

      // safety fallback in case transitionend never fires
      setTimeout(resolve, durationSec * 1000 + 50);
    });
  }

  /** Fade TO black (transparent -> black). Resolves when fully opaque. */
  fadeOut(durationSec: number): Promise<void> {
    return new Promise<void>((resolve) => {
      // ensure we start transparent
      this.overlay.style.transition = "none";
      this.overlay.style.opacity = "0";

      void this.overlay.offsetHeight;

      this.overlay.style.transition = `opacity ${durationSec}s ease`;
      this.overlay.style.opacity = "1";

      const onEnd = () => {
        this.overlay.removeEventListener("transitionend", onEnd);
        resolve();
      };
      this.overlay.addEventListener("transitionend", onEnd);

      setTimeout(resolve, durationSec * 1000 + 50);
    });
  }
}
