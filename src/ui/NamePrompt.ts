/**
 * NamePrompt — asks for a pilot name before the first game.
 * Stores in localStorage. Only shows once.
 * Contest rules: "except maybe ask username if you want"
 */

const LS_KEY = "starfall_player_name";

export class NamePrompt {
  private root: HTMLDivElement;
  private input: HTMLInputElement;
  private resolve: ((name: string) => void) | null = null;

  constructor(container: HTMLElement) {
    this.root = document.createElement("div");
    Object.assign(this.root.style, {
      position: "fixed",
      inset: "0",
      zIndex: "1100",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(8,6,5,0.92)",
      fontFamily: "system-ui, sans-serif",
      userSelect: "none",
      opacity: "0",
      transition: "opacity 0.4s ease",
      pointerEvents: "none",
    });

    const card = document.createElement("div");
    Object.assign(card.style, {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "12px",
      padding: "28px 36px",
      background: "rgba(8,6,5,0.95)",
      border: "1px solid rgba(74,216,160,0.25)",
      borderRadius: "12px",
    });

    const label = document.createElement("div");
    label.textContent = "ENTER PILOT NAME";
    Object.assign(label.style, {
      fontSize: "14px",
      fontWeight: "700",
      letterSpacing: "0.15em",
      color: "#4ad8a0",
    });
    card.appendChild(label);

    const sub = document.createElement("div");
    sub.textContent = "For the shared leaderboard";
    Object.assign(sub.style, {
      fontSize: "11px",
      color: "#6a6460",
      marginBottom: "4px",
    });
    card.appendChild(sub);

    this.input = document.createElement("input");
    this.input.type = "text";
    this.input.maxLength = 20;
    this.input.placeholder = "Pilot callsign...";
    Object.assign(this.input.style, {
      width: "220px",
      padding: "8px 12px",
      border: "1px solid rgba(74,216,160,0.3)",
      borderRadius: "6px",
      background: "rgba(0,0,0,0.4)",
      color: "#e8e0d8",
      fontSize: "15px",
      fontFamily: 'ui-monospace, "Cascadia Mono", monospace',
      textAlign: "center",
      outline: "none",
    });
    this.input.addEventListener("focus", () => {
      this.input.style.borderColor = "rgba(74,216,160,0.6)";
    });
    this.input.addEventListener("blur", () => {
      this.input.style.borderColor = "rgba(74,216,160,0.3)";
    });
    card.appendChild(this.input);

    const btn = document.createElement("button");
    btn.textContent = "DROP IN";
    Object.assign(btn.style, {
      padding: "8px 32px",
      border: "1px solid rgba(74,216,160,0.5)",
      borderRadius: "6px",
      background: "rgba(74,216,160,0.15)",
      color: "#4ad8a0",
      fontSize: "13px",
      fontWeight: "700",
      letterSpacing: "0.1em",
      cursor: "pointer",
      fontFamily: "inherit",
      transition: "background 0.2s",
    });
    btn.addEventListener("mouseenter", () => {
      btn.style.background = "rgba(74,216,160,0.25)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "rgba(74,216,160,0.15)";
    });
    btn.addEventListener("click", () => this.submit());
    card.appendChild(btn);

    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.submit();
    });

    this.root.appendChild(card);
    container.appendChild(this.root);
  }

  /** Returns true if the player already has a name saved. */
  static hasName(): boolean {
    return !!localStorage.getItem(LS_KEY);
  }

  /** Show the prompt and return the name. */
  prompt(): Promise<string> {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.root.style.pointerEvents = "auto";
      void this.root.offsetHeight;
      this.root.style.opacity = "1";
      setTimeout(() => this.input.focus(), 100);
    });
  }

  private submit(): void {
    const raw = this.input.value.trim();
    const name = raw || `Pilot-${Math.floor(Math.random() * 9999)}`;
    localStorage.setItem(LS_KEY, name.slice(0, 20));
    this.root.style.opacity = "0";
    this.root.style.pointerEvents = "none";
    this.resolve?.(name);
    this.resolve = null;
  }
}
