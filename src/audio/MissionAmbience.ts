/**
 * Dual seamless loops: main mission bed + urgent endgame (last 30s).
 * Web Audio looping; crossfade between layers (no camera / gameplay coupling).
 */
const MAIN_URL = `${import.meta.env.BASE_URL}audio/mission_ambience_loop.ogg`;
const ENDGAME_URL = `${import.meta.env.BASE_URL}audio/mission_endgame_loop.ogg`;

const MAIN_GAIN = 0.11;
const ENDGAME_GAIN = 0.12;
const CROSSFADE_SEC = 1.15;

async function decodeLoop(
  ctx: AudioContext,
  url: string
): Promise<AudioBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  const raw = await res.arrayBuffer();
  return ctx.decodeAudioData(raw.slice(0));
}

export class MissionAmbience {
  private ctx: AudioContext | null = null;
  private mainGain: GainNode | null = null;
  private endGain: GainNode | null = null;
  private musicDuck: GainNode | null = null;
  private endgameUrgent = false;

  constructor() {
    void this.prepare();
  }

  private async prepare(): Promise<void> {
    try {
      const ctx = new AudioContext({ latencyHint: "playback" });
      const [mainBuf, endBuf] = await Promise.all([
        decodeLoop(ctx, MAIN_URL),
        decodeLoop(ctx, ENDGAME_URL),
      ]);

      const mainSrc = ctx.createBufferSource();
      mainSrc.buffer = mainBuf;
      mainSrc.loop = true;

      const endSrc = ctx.createBufferSource();
      endSrc.buffer = endBuf;
      endSrc.loop = true;

      const mg = ctx.createGain();
      mg.gain.value = MAIN_GAIN;
      const eg = ctx.createGain();
      eg.gain.value = 0;

      const musicDuck = ctx.createGain();
      musicDuck.gain.value = 1;

      mainSrc.connect(mg);
      endSrc.connect(eg);
      mg.connect(musicDuck);
      eg.connect(musicDuck);
      musicDuck.connect(ctx.destination);

      mainSrc.start(0);
      endSrc.start(0);

      this.ctx = ctx;
      this.mainGain = mg;
      this.endGain = eg;
      this.musicDuck = musicDuck;
    } catch (e) {
      console.warn("[MissionAmbience] loops unavailable", e);
    }
  }

  /** Call on first user gesture (browser autoplay policy). */
  resume(): void {
    void this.ctx?.resume();
  }

  getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  /** Briefly lower music so stings read (0–1 duck factor). */
  duckMusic(factor: number, holdSec: number): void {
    const ctx = this.ctx;
    const d = this.musicDuck;
    if (!ctx || !d) return;
    const t = ctx.currentTime;
    const down = Math.max(0.08, Math.min(1, factor));
    d.gain.cancelScheduledValues(t);
    d.gain.setValueAtTime(d.gain.value, t);
    d.gain.linearRampToValueAtTime(down, t + 0.04);
    d.gain.linearRampToValueAtTime(1, t + 0.04 + holdSec);
  }

  /**
   * When true, crossfade to the 30s endgame loop (storm final phase).
   * When false, crossfade back to the main gameplay bed.
   */
  setEndgameUrgent(urgent: boolean): void {
    const ctx = this.ctx;
    const mg = this.mainGain;
    const eg = this.endGain;
    if (!ctx || !mg || !eg) return;
    if (urgent === this.endgameUrgent) return;
    this.endgameUrgent = urgent;

    const now = ctx.currentTime;
    const endT = now + CROSSFADE_SEC;
    mg.gain.cancelScheduledValues(now);
    eg.gain.cancelScheduledValues(now);
    mg.gain.setValueAtTime(mg.gain.value, now);
    eg.gain.setValueAtTime(eg.gain.value, now);

    if (urgent) {
      eg.gain.linearRampToValueAtTime(ENDGAME_GAIN, endT);
      mg.gain.linearRampToValueAtTime(0, endT);
    } else {
      mg.gain.linearRampToValueAtTime(MAIN_GAIN, endT);
      eg.gain.linearRampToValueAtTime(0, endT);
    }
  }

  /** Call on mission restart so music returns to the main bed. */
  resetLayers(): void {
    this.setEndgameUrgent(false);
    const ctx = this.ctx;
    const d = this.musicDuck;
    if (ctx && d) {
      const t = ctx.currentTime;
      d.gain.cancelScheduledValues(t);
      d.gain.setValueAtTime(1, t);
    }
  }

  dispose(): void {
    void this.ctx?.close();
    this.ctx = null;
    this.mainGain = null;
    this.endGain = null;
    this.musicDuck = null;
  }
}
