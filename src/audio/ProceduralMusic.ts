/**
 * Fully procedural synthesizer soundtrack for Starfall Salvage.
 * No audio files — everything is generated from oscillators, filters, and noise.
 * Dark, atmospheric, sci-fi desert vibe (Blade Runner meets wasteland).
 *
 * Layers:
 *  1. Ambient pad  — detuned sawtooth drone, evolving chord progression
 *  2. Rhythmic pulse — sub-kick on every beat
 *  3. Hi-hat pattern — filtered noise bursts on 8th notes
 *  4. Bass line — root note on beats 1 & 3 (every beat when urgent)
 *  5. Tension layer — filter sweep + dissonant stabs at high tension
 *  6. Urgency layer — faster tempo, alarm tone, busier bass
 */

// ---------------------------------------------------------------------------
// Frequency helpers
// ---------------------------------------------------------------------------

/** MIDI note -> Hz */
function mtof(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

// Named note MIDI values
const A2 = 45, C3 = 48, E3 = 52;
const F2 = 41, D2 = 38, G2 = 43, B2 = 47;
const Bb2 = 46, Eb3 = 51, Ab2 = 44, Db3 = 49;
const C2 = 36, E2 = 40, G3 = 55, D3 = 50, F3 = 53;

// ---------------------------------------------------------------------------
// Music Presets
// ---------------------------------------------------------------------------

export type MusicPresetId = 'dark_ambient' | 'synth_drive' | 'desert_noir' | 'ghost_signal' | 'iron_drift';

export interface MusicPreset {
  readonly id: MusicPresetId;
  readonly name: string;
  readonly chords: number[][];
  readonly roots: number[];
  readonly bpmNormal: number;
  readonly bpmUrgent: number;
  readonly beatsPerChord: number;
  readonly padWaveform: OscillatorType;
  readonly padFilterBase: number;
  readonly bassWaveform: OscillatorType;
  readonly hatMix: number; // 0-1, how much hi-hat
  readonly sweepQ: number;
  readonly alarmFreqs: [number, number];
}

export const MUSIC_PRESETS: Record<MusicPresetId, MusicPreset> = {
  dark_ambient: {
    id: 'dark_ambient',
    name: 'Dark Ambient',
    chords: [
      [A2, C3, E3],     // Am
      [F2, A2, C3],     // F
      [D2, F2, A2],     // Dm
      [E2, G2, B2],     // Em
    ],
    roots: [A2, F2, D2, E2],
    bpmNormal: 90,
    bpmUrgent: 105,
    beatsPerChord: 8,
    padWaveform: 'sawtooth',
    padFilterBase: 400,
    bassWaveform: 'sine',
    hatMix: 1,
    sweepQ: 12,
    alarmFreqs: [880, 660],
  },
  synth_drive: {
    id: 'synth_drive',
    name: 'Synth Drive',
    chords: [
      [C2, E2, G2],       // C
      [A2, C3, E3],       // Am
      [F2, A2, C3],       // F
      [G2, B2, D3],       // G
    ],
    roots: [C2, A2, F2, G2],
    bpmNormal: 110,
    bpmUrgent: 128,
    beatsPerChord: 4,
    padWaveform: 'square',
    padFilterBase: 600,
    bassWaveform: 'sawtooth',
    hatMix: 1.4,
    sweepQ: 8,
    alarmFreqs: [1046, 784],
  },
  desert_noir: {
    id: 'desert_noir',
    name: 'Desert Noir',
    chords: [
      [D2, F2, A2],       // Dm
      [Bb2, D3, F3],      // Bb
      [G2, Bb2, D3],      // Gm
      [A2, Db3, E3],      // A (major for tension)
    ],
    roots: [D2, Bb2, G2, A2],
    bpmNormal: 78,
    bpmUrgent: 95,
    beatsPerChord: 8,
    padWaveform: 'sawtooth',
    padFilterBase: 320,
    bassWaveform: 'triangle',
    hatMix: 0.6,
    sweepQ: 15,
    alarmFreqs: [740, 554],
  },
  ghost_signal: {
    id: 'ghost_signal',
    name: 'Ghost Signal',
    chords: [
      [E2, G2, B2],       // Em
      [C2, E2, G2],       // C
      [A2, C3, E3],       // Am
      [D2, F2, Ab2],      // Ddim-ish
    ],
    roots: [E2, C2, A2, D2],
    bpmNormal: 72,
    bpmUrgent: 88,
    beatsPerChord: 8,
    padWaveform: 'sine',
    padFilterBase: 280,
    bassWaveform: 'sine',
    hatMix: 0.3,
    sweepQ: 18,
    alarmFreqs: [660, 440],
  },
  iron_drift: {
    id: 'iron_drift',
    name: 'Iron Drift',
    chords: [
      [E2, G2, B2],       // Em
      [D2, F2, A2],       // Dm
      [C2, Eb3, G3],      // Cm (higher voicing)
      [B2, D3, F3],       // Bdim
    ],
    roots: [E2, D2, C2, B2],
    bpmNormal: 100,
    bpmUrgent: 120,
    beatsPerChord: 4,
    padWaveform: 'sawtooth',
    padFilterBase: 500,
    bassWaveform: 'sawtooth',
    hatMix: 1.2,
    sweepQ: 10,
    alarmFreqs: [988, 740],
  },
};

const BEATS_PER_CHORD = 8; // default, overridden by preset
const TOTAL_BEATS = BEATS_PER_CHORD * 4; // 32 beats full cycle (default)

const BPM_NORMAL = 90;
const BPM_URGENT = 105;

const LS_KEY = "starfall_music_muted";

// ---------------------------------------------------------------------------
// Pad oscillator voice (3 detuned saws per note)
// ---------------------------------------------------------------------------

interface PadVoice {
  oscs: OscillatorNode[];
  gain: GainNode;
}

function createPadVoice(ctx: AudioContext, dest: AudioNode, waveform: OscillatorType = "sawtooth"): PadVoice {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(dest);

  const oscs: OscillatorNode[] = [];
  const detunes = [-7, 0, 7]; // cents
  for (const d of detunes) {
    const o = ctx.createOscillator();
    o.type = waveform;
    o.detune.value = d;
    o.connect(gain);
    o.start();
    oscs.push(o);
  }
  return { oscs, gain };
}

function setPadFreq(voice: PadVoice, freq: number, time: number): void {
  for (const o of voice.oscs) {
    o.frequency.setTargetAtTime(freq, time, 0.6);
  }
}

function setPadGain(voice: PadVoice, val: number, time: number): void {
  voice.gain.gain.setTargetAtTime(val, time, 0.8);
}

// ---------------------------------------------------------------------------
// ProceduralMusic
// ---------------------------------------------------------------------------

export class ProceduralMusic {
  // Audio graph
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muteGain: GainNode | null = null;

  // Pad layer
  private padFilter: BiquadFilterNode | null = null;
  private padVoices: PadVoice[] = [];

  // Kick / pulse
  private kickOsc: OscillatorNode | null = null;
  private kickGain: GainNode | null = null;

  // Hi-hat
  private hatNoiseBuf: AudioBuffer | null = null;
  private hatFilter: BiquadFilterNode | null = null;
  private hatOut: GainNode | null = null;

  // Bass
  private bassOsc1: OscillatorNode | null = null;
  private bassOsc2: OscillatorNode | null = null;
  private bassGain: GainNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;

  // Tension sweep
  private sweepOsc: OscillatorNode | null = null;
  private sweepFilter: BiquadFilterNode | null = null;
  private sweepGain: GainNode | null = null;

  // Alarm (urgency)
  private alarmOsc: OscillatorNode | null = null;
  private alarmGain: GainNode | null = null;

  // State
  private playing = false;
  private volume = 0.15;
  private muted = false;
  private tension = 0;
  private urgent = false;
  private preset: MusicPreset = MUSIC_PRESETS.dark_ambient;

  // Sequencer
  private bpm = BPM_NORMAL;
  private targetBpm = BPM_NORMAL;
  private beatPos = 0; // fractional beat position
  private lastBeat = -1; // last integer beat that was triggered
  private lastEighth = -1;
  private chordIndex = 0;
  private beatInChord = 0;

  constructor() {
    // Restore muted state
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored === "true") this.muted = true;
    } catch { /* ignore */ }
    // Restore preset
    try {
      const pid = localStorage.getItem("starfall_music_preset");
      if (pid && pid in MUSIC_PRESETS) this.preset = MUSIC_PRESETS[pid as MusicPresetId];
    } catch { /* ignore */ }
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Start playback. Must be called after a user gesture. */
  start(ctx: AudioContext): void {
    if (this.playing) return;
    this.ctx = ctx;
    this.playing = true;
    this.beatPos = 0;
    this.lastBeat = -1;
    this.lastEighth = -1;
    this.chordIndex = 0;
    this.beatInChord = 0;
    this.bpm = this.urgent ? this.preset.bpmUrgent : this.preset.bpmNormal;
    this.targetBpm = this.bpm;

    this.buildGraph();
    this.applyChord(0);
  }

  /** Stop all playback and tear down nodes. */
  stop(): void {
    if (!this.playing) return;
    this.playing = false;
    this.tearDown();
  }

  /** Master volume 0-1 */
  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  /** Tension level 0-1 */
  setTension(t: number): void {
    this.tension = Math.max(0, Math.min(1, t));
  }

  /** Urgent mode (tempo up, alarm, busier patterns) */
  setUrgent(urgent: boolean): void {
    this.urgent = urgent;
    this.targetBpm = urgent ? this.preset.bpmUrgent : this.preset.bpmNormal;
  }

  /** Mute / unmute */
  setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      localStorage.setItem(LS_KEY, muted ? "true" : "false");
    } catch {
      // ignore
    }
    if (this.muteGain && this.ctx) {
      this.muteGain.gain.setTargetAtTime(
        muted ? 0 : 1,
        this.ctx.currentTime,
        0.05
      );
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  getPresetId(): MusicPresetId {
    return this.preset.id;
  }

  /** Switch music style. Restarts the audio graph with new parameters. */
  setPreset(id: MusicPresetId): void {
    if (!(id in MUSIC_PRESETS)) return;
    this.preset = MUSIC_PRESETS[id];
    try { localStorage.setItem("starfall_music_preset", id); } catch { /* ignore */ }
    if (this.playing && this.ctx) {
      this.tearDown();
      this.beatPos = 0;
      this.lastBeat = -1;
      this.lastEighth = -1;
      this.chordIndex = 0;
      this.bpm = this.urgent ? this.preset.bpmUrgent : this.preset.bpmNormal;
      this.targetBpm = this.bpm;
      this.buildGraph();
      this.applyChord(0);
    }
  }

  /** Advance sequencer — call every frame with delta seconds. */
  update(dt: number): void {
    if (!this.playing || !this.ctx) return;

    // Smooth BPM transition
    const bpmDiff = this.targetBpm - this.bpm;
    if (Math.abs(bpmDiff) > 0.1) {
      this.bpm += bpmDiff * Math.min(1, dt * 2);
    } else {
      this.bpm = this.targetBpm;
    }

    // Advance beat position
    const beatsPerSec = this.bpm / 60;
    this.beatPos += dt * beatsPerSec;

    // Wrap around full cycle
    const bpc = this.preset.beatsPerChord;
    const totalBeats = bpc * this.preset.chords.length;
    if (this.beatPos >= totalBeats) {
      this.beatPos -= totalBeats;
      this.lastBeat = -1;
      this.lastEighth = -1;
    }

    const currentBeat = Math.floor(this.beatPos);
    const currentEighth = Math.floor(this.beatPos * 2);

    // Chord tracking
    this.chordIndex = Math.floor(currentBeat / bpc) % this.preset.chords.length;
    this.beatInChord = currentBeat % bpc;

    // --- Trigger events on beat boundaries ---
    if (currentBeat !== this.lastBeat) {
      this.lastBeat = currentBeat;
      this.onBeat(currentBeat);
    }

    if (currentEighth !== this.lastEighth) {
      this.lastEighth = currentEighth;
      this.onEighth(currentEighth);
    }

    // --- Continuous updates ---
    this.updateContinuous(dt);
  }

  dispose(): void {
    this.stop();
    this.ctx = null;
  }

  // -----------------------------------------------------------------------
  // Audio graph construction
  // -----------------------------------------------------------------------

  private buildGraph(): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;

    // Master chain: source -> muteGain -> master -> destination
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(ctx.destination);

    this.muteGain = ctx.createGain();
    this.muteGain.gain.value = this.muted ? 0 : 1;
    this.muteGain.connect(this.master);

    const out = this.muteGain;

    // --- Pad layer ---
    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = "lowpass";
    this.padFilter.frequency.value = this.preset.padFilterBase;
    this.padFilter.Q.value = 1.5;
    this.padFilter.connect(out);

    const padBus = ctx.createGain();
    padBus.gain.value = 0.12;
    padBus.connect(this.padFilter);

    this.padVoices = [];
    for (let i = 0; i < 3; i++) {
      this.padVoices.push(createPadVoice(ctx, padBus, this.preset.padWaveform));
    }

    // --- Kick / pulse ---
    this.kickOsc = ctx.createOscillator();
    this.kickOsc.type = "sine";
    this.kickOsc.frequency.value = 40;
    this.kickGain = ctx.createGain();
    this.kickGain.gain.value = 0;
    this.kickOsc.connect(this.kickGain);
    this.kickGain.connect(out);
    this.kickOsc.start(t);

    // --- Hi-hat noise buffer (reusable) ---
    const hatLen = Math.ceil(ctx.sampleRate * 0.05);
    this.hatNoiseBuf = ctx.createBuffer(1, hatLen, ctx.sampleRate);
    const hatData = this.hatNoiseBuf.getChannelData(0);
    for (let i = 0; i < hatLen; i++) hatData[i] = Math.random() * 2 - 1;

    this.hatFilter = ctx.createBiquadFilter();
    this.hatFilter.type = "bandpass";
    this.hatFilter.frequency.value = 8000;
    this.hatFilter.Q.value = 1.2;
    this.hatFilter.connect(out);

    this.hatOut = ctx.createGain();
    this.hatOut.gain.value = 0.06;
    this.hatOut.connect(this.hatFilter);

    // --- Bass ---
    this.bassFilter = ctx.createBiquadFilter();
    this.bassFilter.type = "lowpass";
    this.bassFilter.frequency.value = 300;
    this.bassFilter.Q.value = 0.8;
    this.bassFilter.connect(out);

    this.bassGain = ctx.createGain();
    this.bassGain.gain.value = 0;
    this.bassGain.connect(this.bassFilter);

    this.bassOsc1 = ctx.createOscillator();
    this.bassOsc1.type = this.preset.bassWaveform;
    this.bassOsc1.frequency.value = mtof(this.preset.roots[0]);
    this.bassOsc1.connect(this.bassGain);
    this.bassOsc1.start(t);

    this.bassOsc2 = ctx.createOscillator();
    this.bassOsc2.type = "triangle";
    this.bassOsc2.frequency.value = mtof(this.preset.roots[0]);
    this.bassOsc2.connect(this.bassGain);
    this.bassOsc2.start(t);

    // --- Tension sweep ---
    this.sweepOsc = ctx.createOscillator();
    this.sweepOsc.type = "sawtooth";
    this.sweepOsc.frequency.value = mtof(this.preset.roots[0] + 12);
    this.sweepFilter = ctx.createBiquadFilter();
    this.sweepFilter.type = "lowpass";
    this.sweepFilter.frequency.value = 200;
    this.sweepFilter.Q.value = this.preset.sweepQ;
    this.sweepGain = ctx.createGain();
    this.sweepGain.gain.value = 0;
    this.sweepOsc.connect(this.sweepFilter);
    this.sweepFilter.connect(this.sweepGain);
    this.sweepGain.connect(out);
    this.sweepOsc.start(t);

    // --- Alarm (urgency) ---
    this.alarmOsc = ctx.createOscillator();
    this.alarmOsc.type = "square";
    this.alarmOsc.frequency.value = this.preset.alarmFreqs[0];
    this.alarmGain = ctx.createGain();
    this.alarmGain.gain.value = 0;
    this.alarmOsc.connect(this.alarmGain);

    const alarmFilter = ctx.createBiquadFilter();
    alarmFilter.type = "lowpass";
    alarmFilter.frequency.value = 1200;
    alarmFilter.Q.value = 2;
    this.alarmGain.connect(alarmFilter);
    alarmFilter.connect(out);
    this.alarmOsc.start(t);
  }

  // -----------------------------------------------------------------------
  // Chord management
  // -----------------------------------------------------------------------

  private applyChord(index: number): void {
    if (!this.ctx || this.padVoices.length < 3) return;
    const t = this.ctx.currentTime;
    const chord = this.preset.chords[index % this.preset.chords.length];

    for (let i = 0; i < 3; i++) {
      setPadFreq(this.padVoices[i], mtof(chord[i]), t);
      setPadGain(this.padVoices[i], 1, t);
    }
  }

  // -----------------------------------------------------------------------
  // Beat callbacks
  // -----------------------------------------------------------------------

  private onBeat(beat: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Check chord change
    const newChordIdx = Math.floor(beat / this.preset.beatsPerChord) % this.preset.chords.length;
    if (newChordIdx !== this.chordIndex || beat === 0) {
      this.chordIndex = newChordIdx;
      this.applyChord(this.chordIndex);
    }

    const beatInBar = beat % 4;

    // --- Kick on every beat ---
    this.triggerKick(t);

    // --- Bass on 1 and 3 (or every beat if urgent) ---
    if (this.urgent || beatInBar === 0 || beatInBar === 2) {
      this.triggerBass(t);
    }

    // --- Tension: dissonant stab at high tension, occasionally ---
    if (this.tension > 0.6 && beatInBar === 3 && Math.random() < this.tension * 0.5) {
      this.triggerDissonantStab(t);
    }
  }

  private onEighth(eighth: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Hi-hat on every 8th note
    const isDownbeat = eighth % 2 === 0;
    const accentGain = isDownbeat ? 1.0 : 0.5;
    // Tension increases hat velocity
    const tensionBoost = 1 + this.tension * 1.5;
    this.triggerHat(t, accentGain * tensionBoost * this.preset.hatMix);
  }

  // -----------------------------------------------------------------------
  // Continuous parameter updates (called every frame)
  // -----------------------------------------------------------------------

  private updateContinuous(_dt: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Pad filter — open up slightly with tension
    if (this.padFilter) {
      const baseCutoff = this.preset.padFilterBase;
      const tensionCutoff = baseCutoff + this.tension * 600;
      this.padFilter.frequency.setTargetAtTime(tensionCutoff, t, 0.3);
    }

    // Tension sweep
    if (this.sweepFilter && this.sweepGain) {
      const sweepCutoff = 200 + this.tension * 3800; // 200 -> 4000 Hz
      this.sweepFilter.frequency.setTargetAtTime(sweepCutoff, t, 0.15);
      const sweepVol = this.tension > 0.2 ? this.tension * 0.04 : 0;
      this.sweepGain.gain.setTargetAtTime(sweepVol, t, 0.2);

      // Sweep osc follows root
      if (this.sweepOsc) {
        const root = this.preset.roots[this.chordIndex % this.preset.roots.length];
        this.sweepOsc.frequency.setTargetAtTime(mtof(root + 12), t, 0.5);
      }
    }

    // Alarm pulsing when urgent
    if (this.alarmGain) {
      if (this.urgent) {
        // Pulsing effect tied to beat position
        const phase = (this.beatPos % 1) * Math.PI * 2;
        const pulse = (Math.sin(phase * 2) + 1) * 0.5; // 0-1, twice per beat
        this.alarmGain.gain.setTargetAtTime(pulse * 0.03, t, 0.02);
      } else {
        this.alarmGain.gain.setTargetAtTime(0, t, 0.1);
      }
    }

    // Alarm pitch: oscillate between two tones
    if (this.alarmOsc && this.urgent) {
      const halfBeat = Math.floor(this.beatPos * 2) % 2;
      const freq = halfBeat === 0 ? this.preset.alarmFreqs[0] : this.preset.alarmFreqs[1];
      this.alarmOsc.frequency.setTargetAtTime(freq, t, 0.02);
    }
  }

  // -----------------------------------------------------------------------
  // Trigger functions (one-shot envelopes on persistent nodes)
  // -----------------------------------------------------------------------

  private triggerKick(time: number): void {
    if (!this.kickOsc || !this.kickGain || !this.ctx) return;

    // Pitch envelope: 120Hz -> 40Hz over 80ms
    this.kickOsc.frequency.cancelScheduledValues(time);
    this.kickOsc.frequency.setValueAtTime(120, time);
    this.kickOsc.frequency.exponentialRampToValueAtTime(40, time + 0.08);

    // Amplitude envelope
    this.kickGain.gain.cancelScheduledValues(time);
    this.kickGain.gain.setValueAtTime(0.18, time);
    this.kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
  }

  private triggerBass(time: number): void {
    if (!this.bassOsc1 || !this.bassOsc2 || !this.bassGain || !this.ctx) return;

    const root = this.preset.roots[this.chordIndex % this.preset.roots.length];
    const freq = mtof(root);

    this.bassOsc1.frequency.setTargetAtTime(freq, time, 0.01);
    this.bassOsc2.frequency.setTargetAtTime(freq, time, 0.01);

    // Envelope: quick attack, medium release
    this.bassGain.gain.cancelScheduledValues(time);
    this.bassGain.gain.setValueAtTime(0.14, time);
    this.bassGain.gain.setTargetAtTime(0.001, time + 0.05, 0.15);
  }

  private triggerHat(time: number, velocity: number): void {
    if (!this.ctx || !this.hatNoiseBuf || !this.hatOut) return;

    // Each hat is a short noise burst — create a BufferSource (lightweight)
    const src = this.ctx.createBufferSource();
    src.buffer = this.hatNoiseBuf;

    const env = this.ctx.createGain();
    const vol = 0.06 * Math.min(velocity, 3.0);
    env.gain.setValueAtTime(vol, time);

    // Envelope: 20-40ms depending on tension
    const decay = 0.02 + (1 - this.tension * 0.5) * 0.02;
    env.gain.exponentialRampToValueAtTime(0.001, time + decay);

    src.connect(env);
    env.connect(this.hatOut);
    src.start(time);
    src.stop(time + 0.05);
  }

  private triggerDissonantStab(time: number): void {
    if (!this.ctx) return;

    // Short dissonant tone: root + tritone
    const root = this.preset.roots[this.chordIndex % this.preset.roots.length];
    const freq1 = mtof(root + 12); // octave up
    const freq2 = mtof(root + 18); // tritone above that

    const out = this.muteGain;
    if (!out) return;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.tension * 0.06, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
    gain.connect(out);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1200;
    filter.Q.value = 4;
    filter.connect(gain);

    for (const freq of [freq1, freq2]) {
      const osc = this.ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      osc.connect(filter);
      osc.start(time);
      osc.stop(time + 0.3);
    }
  }

  // -----------------------------------------------------------------------
  // Teardown
  // -----------------------------------------------------------------------

  private tearDown(): void {
    const stop = (osc: OscillatorNode | null) => {
      try {
        osc?.stop();
      } catch {
        // already stopped
      }
    };

    // Pad voices
    for (const v of this.padVoices) {
      for (const o of v.oscs) stop(o);
      v.gain.disconnect();
    }
    this.padVoices = [];

    stop(this.kickOsc);
    stop(this.bassOsc1);
    stop(this.bassOsc2);
    stop(this.sweepOsc);
    stop(this.alarmOsc);

    this.kickOsc = null;
    this.kickGain = null;
    this.bassOsc1 = null;
    this.bassOsc2 = null;
    this.bassGain = null;
    this.bassFilter = null;
    this.sweepOsc = null;
    this.sweepFilter = null;
    this.sweepGain = null;
    this.alarmOsc = null;
    this.alarmGain = null;
    this.padFilter = null;
    this.hatNoiseBuf = null;
    this.hatFilter = null;
    this.hatOut = null;

    if (this.master) {
      this.master.disconnect();
      this.master = null;
    }
    if (this.muteGain) {
      this.muteGain.disconnect();
      this.muteGain = null;
    }
  }
}
