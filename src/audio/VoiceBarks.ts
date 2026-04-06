/**
 * Radio-style voice bark system.
 * Plays a short filtered noise blip (radio crackle) and types out
 * a HUD text message character-by-character, simulating comms chatter.
 */

/* ------------------------------------------------------------------ */
/*  Bark definitions                                                  */
/* ------------------------------------------------------------------ */

interface BarkDef {
  text: string;
  /** Priority barks can interrupt a bark that is currently showing. */
  priority: boolean;
}

const BARKS: Record<string, BarkDef> = {
  coreSecured:       { text: "Core secured",                              priority: false },
  allCoresCollected: { text: "All cores collected \u2014 get to extraction",     priority: false },
  extractionActive:  { text: "Extraction zone is hot",                    priority: false },
  stormClosing:      { text: "Storm wall closing \u2014 move inside",           priority: true  },
  integrityLow:      { text: "Suit integrity critical",                   priority: true  },
  missionStart:      { text: "Boots on ground \u2014 locate the cores",         priority: false },
  extractionArmed:   { text: "Extraction armed \u2014 hold position",           priority: false },
  droneScan:         { text: "Drone detected \u2014 stay low",                  priority: false },
  fuelLow:           { text: "Fuel reserves low",                         priority: true  },
  missionSuccess:    { text: "Good work, pilot \u2014 extraction complete",     priority: false },
  missionFailed:     { text: "Signal lost",                               priority: true  },
};

/* ------------------------------------------------------------------ */
/*  Timing constants                                                  */
/* ------------------------------------------------------------------ */

/** Minimum seconds between barks (non-priority). */
const COOLDOWN_SEC = 3;
/** Seconds each character takes to appear. */
const CHAR_INTERVAL = 0.035;
/** How long the full message stays visible after typing completes. */
const HOLD_SEC = 2;
/** Fade-out duration in seconds. */
const FADE_SEC = 0.4;

/* ------------------------------------------------------------------ */
/*  VoiceBarks                                                        */
/* ------------------------------------------------------------------ */

export class VoiceBarks {
  private container: HTMLElement;
  private getCtx: () => AudioContext | null;

  /* DOM */
  private el: HTMLDivElement;
  private textEl: HTMLSpanElement;

  /* State */
  private active = false;
  private fullText = "";
  private charIndex = 0;
  private charTimer = 0;
  private holdTimer = 0;
  private fadeTimer = 0;
  private phase: "typing" | "hold" | "fade" | "idle" = "idle";
  private lastPlayTime = -Infinity;

  constructor(container: HTMLElement, getCtx: () => AudioContext | null) {
    this.container = container;
    this.getCtx = getCtx;

    /* Build DOM element */
    this.el = document.createElement("div");
    this.el.className = "voice-bark";
    Object.assign(this.el.style, {
      position: "fixed",
      top: "48px",
      left: "50%",
      transform: "translateX(-50%)",
      fontFamily: 'ui-monospace, "Cascadia Mono", monospace',
      fontSize: "13px",
      lineHeight: "1.4",
      letterSpacing: "0.04em",
      color: "#b8d8b0",
      textShadow: "0 0 6px rgba(140,200,120,0.45), 0 1px 3px rgba(0,0,0,0.85)",
      background: "rgba(8,12,6,0.55)",
      border: "1px solid rgba(140,200,120,0.18)",
      borderRadius: "4px",
      padding: "5px 12px",
      pointerEvents: "none",
      whiteSpace: "nowrap",
      zIndex: "25",
      opacity: "0",
      transition: "none",
    });

    this.textEl = document.createElement("span");
    this.el.appendChild(this.textEl);
    this.container.appendChild(this.el);
  }

  /* -------------------------------------------------------------- */
  /*  Public API                                                     */
  /* -------------------------------------------------------------- */

  play(bark: string): void {
    const def = BARKS[bark];
    if (!def) return;

    const now = performance.now() / 1000;
    const onCooldown = now - this.lastPlayTime < COOLDOWN_SEC;

    if (this.active) {
      /* Already showing a bark — only priority can interrupt. */
      if (!def.priority) return;
      /* Priority bark: reset and replace. */
    } else if (onCooldown && !def.priority) {
      return;
    }

    this.lastPlayTime = now;
    this.fullText = def.text;
    this.charIndex = 0;
    this.charTimer = 0;
    this.holdTimer = 0;
    this.fadeTimer = 0;
    this.phase = "typing";
    this.active = true;

    this.textEl.textContent = "\u25B8 ";
    this.el.style.opacity = "1";

    this.playRadioBlip();
  }

  update(dt: number): void {
    if (this.phase === "idle") return;

    switch (this.phase) {
      case "typing": {
        this.charTimer += dt;
        while (this.charTimer >= CHAR_INTERVAL && this.charIndex < this.fullText.length) {
          this.charTimer -= CHAR_INTERVAL;
          this.charIndex++;
          this.textEl.textContent = "\u25B8 " + this.fullText.slice(0, this.charIndex);
        }
        if (this.charIndex >= this.fullText.length) {
          this.phase = "hold";
          this.holdTimer = 0;
        }
        break;
      }

      case "hold": {
        this.holdTimer += dt;
        if (this.holdTimer >= HOLD_SEC) {
          this.phase = "fade";
          this.fadeTimer = 0;
        }
        break;
      }

      case "fade": {
        this.fadeTimer += dt;
        const t = Math.min(this.fadeTimer / FADE_SEC, 1);
        this.el.style.opacity = String(1 - t);
        if (t >= 1) {
          this.phase = "idle";
          this.active = false;
          this.el.style.opacity = "0";
        }
        break;
      }
    }
  }

  dispose(): void {
    this.el.remove();
    this.phase = "idle";
    this.active = false;
  }

  /* -------------------------------------------------------------- */
  /*  Radio blip audio                                               */
  /* -------------------------------------------------------------- */

  private playRadioBlip(): void {
    const ctx = this.getCtx();
    if (!ctx) return;

    const t0 = ctx.currentTime;
    const dur = 0.14;

    /* ---- filtered noise burst (radio crackle) ---- */
    const nLen = Math.floor(ctx.sampleRate * dur);
    const nBuf = ctx.createBuffer(1, nLen, ctx.sampleRate);
    const nd = nBuf.getChannelData(0);
    for (let i = 0; i < nLen; i++) {
      nd[i] = (Math.random() * 2 - 1) * (1 - (i / nLen) * 0.6);
    }
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = nBuf;

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    bp.Q.value = 1.2;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.08, t0 + 0.012);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    noiseSrc.connect(bp);
    bp.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseSrc.start(t0);
    noiseSrc.stop(t0 + dur + 0.02);

    /* ---- tone pip (gives it a pitched "blip" character) ---- */
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(620, t0);
    osc.frequency.exponentialRampToValueAtTime(480, t0 + dur * 0.8);

    const toneGain = ctx.createGain();
    toneGain.gain.setValueAtTime(0.0001, t0);
    toneGain.gain.exponentialRampToValueAtTime(0.06, t0 + 0.015);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(toneGain);
    toneGain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);

    /* ---- short second pip after a gap (radio "click-click") ---- */
    const t1 = t0 + dur + 0.03;
    const dur2 = 0.06;

    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = 520;

    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.0001, t1);
    g2.gain.exponentialRampToValueAtTime(0.04, t1 + 0.008);
    g2.gain.exponentialRampToValueAtTime(0.0001, t1 + dur2);

    osc2.connect(g2);
    g2.connect(ctx.destination);
    osc2.start(t1);
    osc2.stop(t1 + dur2 + 0.02);
  }
}
