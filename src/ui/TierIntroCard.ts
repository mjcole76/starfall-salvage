/**
 * Brief biome name + tagline overlay shown when entering a new tier.
 * Auto-dismisses after ~2 seconds.
 */
export class TierIntroCard {
  private root: HTMLDivElement;
  private title: HTMLDivElement;
  private subtitle: HTMLDivElement;
  private hideTimer: number | null = null;

  constructor(container: HTMLElement) {
    this.root = document.createElement("div");
    Object.assign(this.root.style, {
      position: "absolute",
      top: "32%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      color: "#dceaff",
      fontFamily: "monospace",
      textAlign: "center",
      pointerEvents: "none",
      opacity: "0",
      transition: "opacity 0.4s ease-out",
      zIndex: "180",
      textShadow: "0 0 18px rgba(0,0,0,0.85), 0 2px 6px rgba(0,0,0,0.9)",
    } as CSSStyleDeclaration);

    this.title = document.createElement("div");
    Object.assign(this.title.style, {
      fontSize: "2.4rem",
      fontWeight: "700",
      letterSpacing: "0.20em",
      color: "#88ccff",
    });
    this.root.appendChild(this.title);

    this.subtitle = document.createElement("div");
    Object.assign(this.subtitle.style, {
      fontSize: "0.95rem",
      letterSpacing: "0.18em",
      marginTop: "0.6rem",
      color: "#aac4dc",
    });
    this.root.appendChild(this.subtitle);

    container.appendChild(this.root);
  }

  show(tierLabel: string, biomeName: string, tagline: string): void {
    this.title.textContent = `${tierLabel} · ${biomeName.toUpperCase()}`;
    this.subtitle.textContent = tagline;
    this.root.style.opacity = "1";

    if (this.hideTimer !== null) clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => {
      this.root.style.opacity = "0";
      this.hideTimer = null;
    }, 2200);
  }
}

/** One-line flavor tag per tier. */
export function biomeTagline(tierIndex: number): string {
  const tags = [
    "Learn the dunes. Hold the line.",
    "Cold bites deeper than the storm.",
    "Every breath here is a debt.",
    "Heat will find what radiation missed.",
    "Beautiful. Wrong. Lethal.",
    "Reality thins where the rift opens.",
    "Mirrors do not forgive footprints.",
    "What glows here was never asleep.",
    "The sky remembers iron.",
    "They hunt better at night. They always do.",
    "Fire under ice. Choose your burn.",
    "Beyond this point, gravity has opinions.",
  ];
  const i = ((tierIndex % tags.length) + tags.length) % tags.length;
  return tags[i]!;
}
