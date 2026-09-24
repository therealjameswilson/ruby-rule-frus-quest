/** Warm, spatial score voices. All timbres and room response are synthesized locally. */
export type ScorePart = 'lead' | 'counter' | 'bass' | 'pad';

export class ScoreVoice {
  readonly input: GainNode;
  private readonly room: ConvolverNode;
  private readonly wet: GainNode;
  private readonly compressor: DynamicsCompressorNode;

  constructor(private readonly context: AudioContext, output: AudioNode) {
    this.input = context.createGain();
    this.compressor = context.createDynamicsCompressor();
    this.compressor.threshold.value = -20;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 3;
    this.compressor.attack.value = 0.012;
    this.compressor.release.value = 0.25;
    this.input.connect(this.compressor);
    this.compressor.connect(output);
    this.room = context.createConvolver();
    const impulse = context.createBuffer(2, Math.floor(context.sampleRate * 1.1), context.sampleRate);
    // Deterministic decorrelated stereo reflections; no downloaded samples.
    let seed = 9137;
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < data.length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
        data[i] = (seed / 2147483648) * Math.pow(1 - i / data.length, 3.5) * 0.3;
      }
    }
    this.room.buffer = impulse;
    this.wet = context.createGain();
    this.wet.gain.value = 0.19;
    this.input.connect(this.room);
    this.room.connect(this.wet);
    this.wet.connect(this.compressor);
  }

  play(frequency: number, at: number, duration: number, volume: number, part: ScorePart) {
    const context = this.context;
    const envelope = context.createGain();
    const filter = context.createBiquadFilter();
    const pan = context.createStereoPanner();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(part === 'bass' ? 650 : part === 'pad' ? 1400 : 3200, at);
    filter.frequency.exponentialRampToValueAtTime(part === 'bass' ? 220 : 850, at + duration);
    filter.Q.value = 0.45;
    pan.pan.value = part === 'counter' ? 0.32 : part === 'lead' ? -0.18 : 0;
    const attack = part === 'pad' ? 0.12 : 0.014;
    const release = part === 'bass' ? 0.13 : 0.28;
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(volume, at + attack);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * 0.32), at + Math.max(attack + 0.01, duration));
    envelope.gain.linearRampToValueAtTime(0, at + duration + release);
    envelope.connect(filter);
    filter.connect(pan);
    pan.connect(this.input);
    const partials = part === 'bass' ? [[1, 1], [2, 0.18]] : [[1, 1], [2, 0.22], [3, 0.06]];
    let remaining = partials.length;
    for (const [ratio, strength] of partials) {
      const oscillator = context.createOscillator();
      const level = context.createGain();
      oscillator.type = part === 'pad' ? 'triangle' : 'sine';
      oscillator.frequency.value = frequency * ratio;
      level.gain.value = strength;
      oscillator.connect(level);
      level.connect(envelope);
      oscillator.onended = () => {
        oscillator.disconnect(); level.disconnect();
        if (--remaining === 0) { envelope.disconnect(); filter.disconnect(); pan.disconnect(); }
      };
      oscillator.start(at);
      oscillator.stop(at + duration + release + 0.02);
    }
  }

  dispose() {
    this.input.disconnect(); this.room.disconnect(); this.wet.disconnect(); this.compressor.disconnect();
  }
}
