/**
 * Minimal procedural SFX on the same AudioContext as music (parallel to music bus).
 * No sample files, no engine — throttled one-shots + quiet wind bed.
 */

function now(ctx: AudioContext): number {
  return ctx.currentTime;
}

export class GameSfx {
  private getCtx: () => AudioContext | null;
  private out: GainNode | null = null;
  private windSrc: AudioBufferSourceNode | null = null;
  private jetThrottle = 0;
  private radThrottle = 0;
  private thermalWarnThrottle = 0;
  private droneScanThrottle = 0;
  private footstepThrottle = 0;
  private landThrottle = 0;

  constructor(getCtx: () => AudioContext | null) {
    this.getCtx = getCtx;
  }

  private bus(): GainNode | null {
    const ctx = this.getCtx();
    if (!ctx) return null;
    if (!this.out) {
      const g = ctx.createGain();
      g.gain.value = 0.38;
      g.connect(ctx.destination);
      this.out = g;
    }
    return this.out;
  }

  /** Very quiet filtered noise, started once. */
  startWindBed(): void {
    const ctx = this.getCtx();
    const bus = this.bus();
    if (!ctx || !bus || this.windSrc) return;

    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 400;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2800;
    const wg = ctx.createGain();
    wg.gain.value = 0.04;
    src.connect(hp);
    hp.connect(lp);
    lp.connect(wg);
    wg.connect(bus);
    src.start(0);
    this.windSrc = src;
  }

  private beep(
    f0: number,
    f1: number | null,
    dur: number,
    vol: number,
    type: OscillatorType = "sine"
  ): void {
    const ctx = this.getCtx();
    const bus = this.bus();
    if (!ctx || !bus) return;
    const t0 = now(ctx);
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    if (f1 != null) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, f1),
        t0 + dur * 0.85
      );
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(bus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  jetThrust(active: boolean, dt: number): void {
    if (!active) return;
    this.jetThrottle += dt;
    if (this.jetThrottle < 0.16) return;
    this.jetThrottle = 0;
    const ctx = this.getCtx();
    const bus = this.bus();
    if (!ctx || !bus) return;
    const t0 = now(ctx);
    const dur = 0.07;
    const noise = ctx.createBufferSource();
    const nlen = Math.floor(ctx.sampleRate * dur);
    const nb = ctx.createBuffer(1, nlen, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nlen; i++) nd[i] = (Math.random() * 2 - 1) * (1 - i / nlen);
    noise.buffer = nb;
    const ng = ctx.createGain();
    ng.gain.value = 0.09;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 420;
    bp.Q.value = 0.9;
    noise.connect(bp);
    bp.connect(ng);
    ng.connect(bus);
    noise.start(t0);
    noise.stop(t0 + dur);

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, t0);
    osc.frequency.exponentialRampToValueAtTime(55, t0 + dur);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t0);
    og.gain.exponentialRampToValueAtTime(0.07, t0 + 0.012);
    og.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(og);
    og.connect(bus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  corePickup(): void {
    this.beep(660, 880, 0.09, 0.12);
    window.setTimeout(() => this.beep(990, null, 0.11, 0.09), 45);
  }

  salvagePickup(): void {
    this.beep(720, 960, 0.06, 0.08);
  }

  fuelCanPickup(): void {
    this.beep(520, 780, 0.1, 0.09);
  }

  repairKitPickup(): void {
    this.beep(380, 520, 0.11, 0.08, "sine");
  }

  droneJam(): void {
    this.beep(220, 120, 0.12, 0.07, "square");
  }

  lowFuelWarning(): void {
    this.beep(440, 330, 0.14, 0.1, "triangle");
    const ctx = this.getCtx();
    if (!ctx) return;
    window.setTimeout(() => this.beep(440, 330, 0.14, 0.08, "triangle"), 160);
  }

  hazardTick(): void {
    const ctx = this.getCtx();
    const bus = this.bus();
    if (!ctx || !bus) return;
    const t0 = now(ctx);
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = 1100;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.035, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.028);
    osc.connect(g);
    g.connect(bus);
    osc.start(t0);
    osc.stop(t0 + 0.04);
  }

  hazardRadiationTick(dt: number): void {
    this.radThrottle += dt;
    if (this.radThrottle < 0.32) return;
    this.radThrottle = 0;
    this.hazardTick();
  }

  heatPulse(): void {
    this.beep(180, 95, 0.2, 0.14, "sawtooth");
  }

  /** Thermal Vent — building rumble before burst (throttled). */
  thermalVentWarn(dt: number): void {
    this.thermalWarnThrottle += dt;
    if (this.thermalWarnThrottle < 0.28) return;
    this.thermalWarnThrottle = 0;
    this.beep(95, 55, 0.08, 0.055, "sawtooth");
  }

  /** Patrol Drone — soft scan ping while player is in the cone (throttled). */
  droneScanPing(dt: number): void {
    this.droneScanThrottle += dt;
    if (this.droneScanThrottle < 0.24) return;
    this.droneScanThrottle = 0;
    this.beep(520, 380, 0.04, 0.042);
  }

  stormWarning(): void {
    const ctx = this.getCtx();
    const bus = this.bus();
    if (!ctx || !bus) return;
    const t0 = now(ctx);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(95, t0);
    osc.frequency.exponentialRampToValueAtTime(220, t0 + 0.35);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.11, t0 + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
    osc.connect(g);
    g.connect(bus);
    osc.start(t0);
    osc.stop(t0 + 0.6);
  }

  /** Dust storm incoming — deep rumble + rising wind */
  dustStormWarning(): void {
    const ctx = this.getCtx();
    const bus = this.bus();
    if (!ctx || !bus) return;
    const t0 = now(ctx);

    // Deep rumble
    const rumble = ctx.createOscillator();
    rumble.type = "sawtooth";
    rumble.frequency.setValueAtTime(45, t0);
    rumble.frequency.exponentialRampToValueAtTime(80, t0 + 1.2);
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0.0001, t0);
    rg.gain.exponentialRampToValueAtTime(0.14, t0 + 0.3);
    rg.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.5);
    const rlp = ctx.createBiquadFilter();
    rlp.type = "lowpass";
    rlp.frequency.value = 180;
    rumble.connect(rlp);
    rlp.connect(rg);
    rg.connect(bus);
    rumble.start(t0);
    rumble.stop(t0 + 1.6);

    // Rising wind noise
    const wLen = Math.floor(ctx.sampleRate * 1.5);
    const wBuf = ctx.createBuffer(1, wLen, ctx.sampleRate);
    const wd = wBuf.getChannelData(0);
    for (let i = 0; i < wLen; i++) wd[i] = Math.random() * 2 - 1;
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = wBuf;
    const wbp = ctx.createBiquadFilter();
    wbp.type = "bandpass";
    wbp.frequency.setValueAtTime(300, t0);
    wbp.frequency.exponentialRampToValueAtTime(1200, t0 + 1.2);
    wbp.Q.value = 0.8;
    const wg = ctx.createGain();
    wg.gain.setValueAtTime(0.0001, t0);
    wg.gain.exponentialRampToValueAtTime(0.12, t0 + 0.6);
    wg.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.5);
    windSrc.connect(wbp);
    wbp.connect(wg);
    wg.connect(bus);
    windSrc.start(t0);
    windSrc.stop(t0 + 1.6);
  }

  /** Dust storm hit — heavy impact */
  dustStormHit(): void {
    this.beep(60, 30, 0.35, 0.18, "sawtooth");
    this.beep(90, 45, 0.25, 0.12, "square");
  }

  /** Footstep — short filtered thud while grounded and moving (throttled). */
  footstep(dt: number, moving: boolean): void {
    if (!moving) return;
    this.footstepThrottle += dt;
    if (this.footstepThrottle < 0.28) return;
    this.footstepThrottle = 0;
    const ctx = this.getCtx();
    const bus = this.bus();
    if (!ctx || !bus) return;
    const t0 = now(ctx);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(65 + Math.random() * 20, t0);
    osc.frequency.exponentialRampToValueAtTime(35, t0 + 0.04);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.04, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
    osc.connect(g);
    g.connect(bus);
    osc.start(t0);
    osc.stop(t0 + 0.08);
    // Add a noise click for texture
    const nLen = Math.floor(ctx.sampleRate * 0.03);
    const nb = ctx.createBuffer(1, nLen, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nLen; i++) nd[i] = (Math.random() * 2 - 1) * (1 - i / nLen);
    const ns = ctx.createBufferSource();
    ns.buffer = nb;
    const ng = ctx.createGain();
    ng.gain.value = 0.025;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 800;
    ns.connect(hp);
    hp.connect(ng);
    ng.connect(bus);
    ns.start(t0);
    ns.stop(t0 + 0.04);
  }

  /** Landing impact — heavier thud when returning to ground. */
  landingImpact(): void {
    const ctx = this.getCtx();
    const bus = this.bus();
    if (!ctx || !bus) return;
    const t = now(ctx);
    if (t - this.landThrottle < 0.3) return;
    this.landThrottle = t;
    // Low thud
    this.beep(80, 30, 0.12, 0.1, "sine");
    // Crunch noise
    const nLen = Math.floor(ctx.sampleRate * 0.06);
    const nb = ctx.createBuffer(1, nLen, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nLen; i++) nd[i] = (Math.random() * 2 - 1) * (1 - i / nLen) * 0.8;
    const ns = ctx.createBufferSource();
    ns.buffer = nb;
    const ng = ctx.createGain();
    ng.gain.value = 0.05;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 600;
    ns.connect(lp);
    lp.connect(ng);
    ng.connect(bus);
    ns.start(t);
    ns.stop(t + 0.08);
  }

  /** Shield pickup — ascending shimmer */
  shieldPickup(): void {
    this.beep(440, 880, 0.12, 0.1);
    const ctx = this.getCtx();
    if (!ctx) return;
    window.setTimeout(() => this.beep(880, 1320, 0.1, 0.07), 60);
  }

  /** Shield absorb — bass thud + high chime */
  shieldAbsorb(): void {
    this.beep(120, 60, 0.2, 0.14, "sine");
    this.beep(1200, 800, 0.15, 0.08);
  }

  /** Scanner pulse — sonar ping */
  scannerPulse(): void {
    this.beep(1400, 800, 0.3, 0.08);
    const ctx = this.getCtx();
    if (!ctx) return;
    window.setTimeout(() => this.beep(800, 600, 0.25, 0.05), 150);
  }

  /** Decoy beacon deploy */
  decoyDeploy(): void {
    this.beep(300, 600, 0.15, 0.09, "square");
    const ctx = this.getCtx();
    if (!ctx) return;
    window.setTimeout(() => this.beep(600, 400, 0.1, 0.06, "square"), 100);
  }

  /** Lightning thunder — low rumble (called during storms) */
  thunder(): void {
    const ctx = this.getCtx();
    const bus = this.bus();
    if (!ctx || !bus) return;
    const t0 = now(ctx);
    // Deep rumble noise
    const nLen = Math.floor(ctx.sampleRate * 1.2);
    const nb = ctx.createBuffer(1, nLen, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nLen; i++) nd[i] = Math.random() * 2 - 1;
    const ns = ctx.createBufferSource();
    ns.buffer = nb;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(200, t0);
    lp.frequency.exponentialRampToValueAtTime(60, t0 + 0.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.09, t0 + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.2);
    ns.connect(lp);
    lp.connect(g);
    g.connect(bus);
    ns.start(t0);
    ns.stop(t0 + 1.3);
  }

  extractionActivated(): void {
    this.beep(196, 392, 0.22, 0.11);
  }

  extractionProgressPulse(): void {
    this.beep(520, 520, 0.05, 0.05);
  }

  successSting(): void {
    const ctx = this.getCtx();
    const bus = this.bus();
    if (!ctx || !bus) return;
    const t0 = now(ctx);
    const freqs = [392, 494, 587];
    for (let i = 0; i < freqs.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freqs[i]!;
      const g = ctx.createGain();
      const st = t0 + i * 0.045;
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.1, st + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.42);
      osc.connect(g);
      g.connect(bus);
      osc.start(st);
      osc.stop(st + 0.5);
    }
  }

  failureBuzzer(): void {
    const ctx = this.getCtx();
    const bus = this.bus();
    if (!ctx || !bus) return;
    const t0 = now(ctx);
    for (let k = 0; k < 3; k++) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = 150 - k * 18;
      const g = ctx.createGain();
      const st = t0 + k * 0.14;
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.09, st + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.2);
      osc.connect(g);
      g.connect(bus);
      osc.start(st);
      osc.stop(st + 0.25);
    }
  }
}
