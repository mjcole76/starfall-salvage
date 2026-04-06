/**
 * In-game settings/options menu.
 * Toggled with ESC key. Persisted to localStorage.
 */

import type { MusicPresetId } from "../audio/ProceduralMusic";

const STORAGE_KEY = "starfall_settings";

export type GameSettings = {
  musicVolume: number;    // 0-1
  sfxVolume: number;      // 0-1
  musicMuted: boolean;
  musicPreset: MusicPresetId;
  graphicsQuality: 'low' | 'medium' | 'high';
  showFps: boolean;
};

const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 0.15,
  sfxVolume: 0.38,
  musicMuted: false,
  musicPreset: 'dark_ambient',
  graphicsQuality: 'medium',
  showFps: false,
};

export class SettingsMenu {
  private root: HTMLDivElement;
  private visible = false;
  private style: HTMLStyleElement;
  private settings: GameSettings;
  private onChange: (settings: GameSettings) => void;

  constructor(container: HTMLElement, onChange: (settings: GameSettings) => void) {
    this.onChange = onChange;
    this.settings = SettingsMenu.loadSettings();

    this.style = document.createElement("style");
    this.style.textContent = `
      @keyframes sm-fadein {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .sm-row:hover { background: rgba(74,216,160,0.04); }
      .sm-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 180px;
        height: 6px;
        border-radius: 3px;
        background: rgba(255,255,255,0.1);
        outline: none;
        cursor: pointer;
      }
      .sm-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #4ad8a0;
        border: 2px solid rgba(8,6,5,0.8);
        cursor: pointer;
        transition: transform 0.15s ease;
      }
      .sm-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }
      .sm-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #4ad8a0;
        border: 2px solid rgba(8,6,5,0.8);
        cursor: pointer;
      }
      .sm-slider::-webkit-slider-runnable-track {
        height: 6px;
        border-radius: 3px;
      }
      .sm-toggle {
        width: 40px;
        height: 22px;
        border-radius: 11px;
        border: 1px solid rgba(255,255,255,0.15);
        background: rgba(255,255,255,0.08);
        cursor: pointer;
        position: relative;
        transition: background 0.2s;
        flex-shrink: 0;
      }
      .sm-toggle.sm-toggle--on {
        background: rgba(74,216,160,0.35);
        border-color: rgba(74,216,160,0.5);
      }
      .sm-toggle::after {
        content: "";
        position: absolute;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        top: 2px;
        left: 2px;
        background: #888;
        transition: transform 0.2s, background 0.2s;
      }
      .sm-toggle.sm-toggle--on::after {
        transform: translateX(18px);
        background: #4ad8a0;
      }
      .sm-quality-btn {
        padding: 4px 14px;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 4px;
        background: rgba(255,255,255,0.04);
        color: #a8a0a0;
        cursor: pointer;
        font-size: 12px;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
      }
      .sm-quality-btn:hover { background: rgba(74,216,160,0.1); }
      .sm-quality-btn.sm-quality-btn--active {
        background: rgba(74,216,160,0.2);
        border-color: rgba(74,216,160,0.5);
        color: #4ad8a0;
      }
    `;
    document.head.appendChild(this.style);

    this.root = document.createElement("div");
    Object.assign(this.root.style, {
      position: "fixed",
      inset: "0",
      zIndex: "980",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(8,6,5,0.88)",
      fontFamily: 'ui-monospace, "Cascadia Mono", monospace',
      userSelect: "none",
      opacity: "0",
      transition: "opacity 0.3s ease",
      pointerEvents: "none",
    } as CSSStyleDeclaration);
    container.appendChild(this.root);

    this.buildUI();
  }

  /* ---- public ---- */

  show(): void {
    this.settings = SettingsMenu.loadSettings();
    this.buildUI();
    this.visible = true;
    this.root.style.pointerEvents = "auto";
    void this.root.offsetHeight;
    this.root.style.opacity = "1";
  }

  hide(): void {
    SettingsMenu.saveSettings(this.settings);
    this.visible = false;
    this.root.style.opacity = "0";
    this.root.style.pointerEvents = "none";
  }

  toggle(): void {
    if (this.visible) this.hide();
    else this.show();
  }

  isVisible(): boolean {
    return this.visible;
  }

  getSettings(): GameSettings {
    return { ...this.settings };
  }

  /* ---- static ---- */

  static loadSettings(): GameSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        return { ...DEFAULT_SETTINGS, ...data };
      }
    } catch { /* empty */ }
    return { ...DEFAULT_SETTINGS };
  }

  static saveSettings(s: GameSettings): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }

  /* ---- internal ---- */

  private emitChange(): void {
    SettingsMenu.saveSettings(this.settings);
    this.onChange({ ...this.settings });
  }

  private buildUI(): void {
    this.root.innerHTML = "";

    const panel = document.createElement("div");
    Object.assign(panel.style, {
      background: "rgba(8,6,5,0.94)",
      border: "1px solid rgba(74,216,160,0.2)",
      borderRadius: "10px",
      padding: "28px 32px 24px",
      width: "420px",
      maxHeight: "85vh",
      overflowY: "auto",
      animation: "sm-fadein 0.25s ease-out",
    });
    this.root.appendChild(panel);

    // Title
    const title = document.createElement("div");
    Object.assign(title.style, {
      fontSize: "18px",
      fontWeight: "700",
      color: "#e8e0d8",
      marginBottom: "20px",
      textAlign: "center",
      letterSpacing: "1.5px",
      textTransform: "uppercase",
    });
    title.textContent = "Settings";
    panel.appendChild(title);

    // --- Music Volume ---
    this.buildSliderRow(panel, "Music Volume", this.settings.musicVolume, (v) => {
      this.settings.musicVolume = v;
      this.emitChange();
    });

    // --- SFX Volume ---
    this.buildSliderRow(panel, "SFX Volume", this.settings.sfxVolume, (v) => {
      this.settings.sfxVolume = v;
      this.emitChange();
    });

    // --- Music Mute ---
    this.buildToggleRow(panel, "Mute Music", this.settings.musicMuted, (v) => {
      this.settings.musicMuted = v;
      this.emitChange();
    }, "M");

    // --- Music Style ---
    this.buildPresetRow(panel);

    // --- Graphics Quality ---
    this.buildQualityRow(panel);

    // --- Show FPS ---
    this.buildToggleRow(panel, "Show FPS", this.settings.showFps, (v) => {
      this.settings.showFps = v;
      this.emitChange();
    });

    // --- Divider ---
    const divider = document.createElement("div");
    Object.assign(divider.style, {
      height: "1px",
      background: "rgba(255,255,255,0.06)",
      margin: "16px 0 12px",
    });
    panel.appendChild(divider);

    // --- Close hint ---
    const hint = document.createElement("div");
    Object.assign(hint.style, {
      textAlign: "center",
      color: "rgba(168,160,160,0.5)",
      fontSize: "11px",
    });
    hint.textContent = "Press ESC to close";
    panel.appendChild(hint);
  }

  private buildSliderRow(
    parent: HTMLElement,
    label: string,
    value: number,
    onInput: (v: number) => void,
  ): void {
    const row = document.createElement("div");
    row.className = "sm-row";
    Object.assign(row.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 6px",
      borderRadius: "4px",
      marginBottom: "4px",
    });

    const lbl = document.createElement("span");
    Object.assign(lbl.style, {
      color: "#c8c0b8",
      fontSize: "13px",
      flexShrink: "0",
      width: "110px",
    });
    lbl.textContent = label;
    row.appendChild(lbl);

    const controls = document.createElement("div");
    Object.assign(controls.style, {
      display: "flex",
      alignItems: "center",
      gap: "10px",
    });

    const slider = document.createElement("input");
    slider.type = "range";
    slider.className = "sm-slider";
    slider.min = "0";
    slider.max = "100";
    slider.value = String(Math.round(value * 100));
    controls.appendChild(slider);

    const valText = document.createElement("span");
    Object.assign(valText.style, {
      color: "#4ad8a0",
      fontSize: "12px",
      width: "36px",
      textAlign: "right",
    });
    valText.textContent = `${Math.round(value * 100)}%`;
    controls.appendChild(valText);

    slider.addEventListener("input", () => {
      const v = parseInt(slider.value, 10) / 100;
      valText.textContent = `${Math.round(v * 100)}%`;
      onInput(v);
    });

    row.appendChild(controls);
    parent.appendChild(row);
  }

  private buildToggleRow(
    parent: HTMLElement,
    label: string,
    value: boolean,
    onToggle: (v: boolean) => void,
    shortcut?: string,
  ): void {
    const row = document.createElement("div");
    row.className = "sm-row";
    Object.assign(row.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 6px",
      borderRadius: "4px",
      marginBottom: "4px",
    });

    const lbl = document.createElement("span");
    Object.assign(lbl.style, {
      color: "#c8c0b8",
      fontSize: "13px",
      flexShrink: "0",
    });
    lbl.textContent = label;
    if (shortcut) {
      const kbd = document.createElement("span");
      Object.assign(kbd.style, {
        fontSize: "10px",
        color: "rgba(168,160,160,0.5)",
        marginLeft: "6px",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "3px",
        padding: "1px 5px",
      });
      kbd.textContent = shortcut;
      lbl.appendChild(kbd);
    }
    row.appendChild(lbl);

    const toggle = document.createElement("div");
    toggle.className = "sm-toggle" + (value ? " sm-toggle--on" : "");
    toggle.addEventListener("click", () => {
      const next = !toggle.classList.contains("sm-toggle--on");
      toggle.classList.toggle("sm-toggle--on", next);
      onToggle(next);
    });
    row.appendChild(toggle);

    parent.appendChild(row);
  }

  private buildPresetRow(parent: HTMLElement): void {
    const row = document.createElement("div");
    row.className = "sm-row";
    Object.assign(row.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 6px",
      borderRadius: "4px",
      marginBottom: "4px",
    });

    const lbl = document.createElement("span");
    Object.assign(lbl.style, {
      color: "#c8c0b8",
      fontSize: "13px",
      flexShrink: "0",
    });
    lbl.textContent = "Music Style";
    row.appendChild(lbl);

    const btnGroup = document.createElement("div");
    Object.assign(btnGroup.style, {
      display: "flex",
      gap: "4px",
      flexWrap: "wrap",
      justifyContent: "flex-end",
      maxWidth: "250px",
    });

    const presets: { id: MusicPresetId; label: string }[] = [
      { id: "dark_ambient", label: "Dark" },
      { id: "synth_drive", label: "Drive" },
      { id: "desert_noir", label: "Noir" },
      { id: "ghost_signal", label: "Ghost" },
      { id: "iron_drift", label: "Iron" },
    ];

    const buttons: HTMLButtonElement[] = [];

    for (const p of presets) {
      const btn = document.createElement("button");
      btn.className = "sm-quality-btn" + (this.settings.musicPreset === p.id ? " sm-quality-btn--active" : "");
      btn.textContent = p.label;
      Object.assign(btn.style, { fontSize: "11px", padding: "3px 8px" });
      btn.addEventListener("click", () => {
        for (const b of buttons) b.classList.remove("sm-quality-btn--active");
        btn.classList.add("sm-quality-btn--active");
        this.settings.musicPreset = p.id;
        this.emitChange();
      });
      buttons.push(btn);
      btnGroup.appendChild(btn);
    }

    row.appendChild(btnGroup);
    parent.appendChild(row);
  }

  private buildQualityRow(parent: HTMLElement): void {
    const row = document.createElement("div");
    row.className = "sm-row";
    Object.assign(row.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 6px",
      borderRadius: "4px",
      marginBottom: "4px",
    });

    const lbl = document.createElement("span");
    Object.assign(lbl.style, {
      color: "#c8c0b8",
      fontSize: "13px",
      flexShrink: "0",
    });
    lbl.textContent = "Graphics";
    row.appendChild(lbl);

    const btnGroup = document.createElement("div");
    Object.assign(btnGroup.style, {
      display: "flex",
      gap: "6px",
    });

    const levels: Array<'low' | 'medium' | 'high'> = ["low", "medium", "high"];
    const buttons: HTMLButtonElement[] = [];

    for (const lvl of levels) {
      const btn = document.createElement("button");
      btn.className = "sm-quality-btn" + (this.settings.graphicsQuality === lvl ? " sm-quality-btn--active" : "");
      btn.textContent = lvl.charAt(0).toUpperCase() + lvl.slice(1);
      btn.addEventListener("click", () => {
        for (const b of buttons) b.classList.remove("sm-quality-btn--active");
        btn.classList.add("sm-quality-btn--active");
        this.settings.graphicsQuality = lvl;
        this.emitChange();
      });
      buttons.push(btn);
      btnGroup.appendChild(btn);
    }

    row.appendChild(btnGroup);
    parent.appendChild(row);
  }
}
