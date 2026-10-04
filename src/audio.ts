// All sound is made in code with the Web Audio API: no sound files.

export interface NoteDef {
  name: string;
  freq: number;
  color: string;
}

/** The notes the music puzzles are built from: one octave of C major, plus high C. */
export const NOTES: readonly NoteDef[] = [
  { name: 'C', freq: 261.63, color: '#ef476f' },
  { name: 'D', freq: 293.66, color: '#f78c6b' },
  { name: 'E', freq: 329.63, color: '#ffd166' },
  { name: 'F', freq: 349.23, color: '#83d483' },
  { name: 'G', freq: 392.0, color: '#06d6a0' },
  { name: 'A', freq: 440.0, color: '#118ab2' },
  { name: 'B', freq: 493.88, color: '#7b6cf6' },
  { name: 'C′', freq: 523.25, color: '#c77dff' },
];

export const NOTE_GAP = 0.42;

class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  /** Browsers only allow sound after a click or key press, so call this from one. */
  unlock(): void {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      } catch {
        this.ctx = null;
      }
    }
    void this.ctx?.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  private tone(
    freq: number,
    start: number,
    length: number,
    volume: number,
    type: OscillatorType = 'triangle',
    slideTo?: number,
  ): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + start;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + length);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + length + 0.05);
  }

  /** One puzzle note, a soft bell: the note plus a quiet octave above. */
  note(index: number, delay = 0, volume = 0.5): void {
    const n = NOTES[index];
    if (!n) return;
    this.tone(n.freq, delay, 0.55, volume, 'triangle');
    this.tone(n.freq * 2, delay, 0.3, volume * 0.25, 'sine');
  }

  /** Play a melody; returns how long it lasts in seconds. */
  melody(notes: readonly number[], volume = 0.5): number {
    notes.forEach((n, k) => this.note(n, k * NOTE_GAP, volume));
    return notes.length * NOTE_GAP + 0.3;
  }

  swing(): void {
    this.tone(520, 0, 0.12, 0.12, 'sawtooth', 180);
  }

  hit(): void {
    this.tone(180, 0, 0.12, 0.3, 'square', 70);
  }

  hurt(): void {
    this.tone(300, 0, 0.25, 0.3, 'sawtooth', 90);
  }

  eat(): void {
    this.tone(500, 0, 0.07, 0.2, 'square');
    this.tone(660, 0.08, 0.09, 0.2, 'square');
  }

  jump(): void {
    this.tone(330, 0, 0.14, 0.12, 'sine', 560);
  }

  pickup(): void {
    this.tone(660, 0, 0.1, 0.25);
    this.tone(990, 0.09, 0.18, 0.25);
  }

  shift(): void {
    this.tone(220, 0, 0.35, 0.22, 'sine', 880);
    this.tone(440, 0.05, 0.35, 0.12, 'triangle', 1320);
  }

  denied(): void {
    this.tone(160, 0, 0.16, 0.22, 'square');
  }

  waterShot(): void {
    this.tone(520, 0, 0.18, 0.2, 'sine', 900);
    this.tone(260, 0.02, 0.2, 0.1, 'triangle', 420);
  }

  bubbles(): void {
    this.tone(300, 0, 0.3, 0.18, 'sine', 700);
    this.tone(450, 0.08, 0.3, 0.14, 'sine', 900);
    this.tone(600, 0.16, 0.3, 0.1, 'sine', 1100);
  }

  wrong(): void {
    this.tone(196, 0, 0.2, 0.25, 'square');
    this.tone(147, 0.2, 0.3, 0.25, 'square');
  }

  checkpoint(): void {
    [392, 523.25, 659.25].forEach((f, k) => this.tone(f, k * 0.09, 0.3, 0.25));
  }

  light(): void {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => this.tone(f, k * 0.08, 0.4, 0.28));
  }

  levelUp(): void {
    [392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, k) => this.tone(f, k * 0.11, 0.5, 0.3));
    this.tone(1046.5, 0.7, 0.9, 0.25, 'sine');
  }

  defeat(): void {
    this.tone(260, 0, 0.3, 0.25, 'square', 60);
  }

  /** An archer loosing an arrow: a plucked string. */
  bow(): void {
    this.tone(420, 0, 0.16, 0.14, 'triangle', 140);
    this.tone(1200, 0, 0.04, 0.06, 'square', 600);
  }

  /** An arrow sticking into something solid. */
  thunk(): void {
    this.tone(140, 0, 0.09, 0.18, 'square', 60);
  }

  /** Thin ice giving way: a sharp snap and a tinkle of falling shards. */
  crack(): void {
    this.tone(1800, 0, 0.05, 0.16, 'square', 400);
    this.tone(900, 0.02, 0.12, 0.12, 'sawtooth', 200);
    [2400, 3100, 2700].forEach((f, k) => this.tone(f, 0.08 + k * 0.05, 0.12, 0.05, 'sine'));
  }

  magic(): void {
    [880, 1174.7, 1568].forEach((f, k) => this.tone(f, k * 0.06, 0.3, 0.18, 'sine'));
  }
}

export const sound = new Sound();
