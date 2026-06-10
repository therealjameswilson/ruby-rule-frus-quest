import { setAudioStatus } from "../game/state";

type Wave = OscillatorType;

class RetroAudio {
  private context: AudioContext | null = null;
  private enabled = true;
  private musicTimer: number | null = null;
  private musicStep = 0;

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stopMusic();
    }
    setAudioStatus(this.enabled ? "audio on" : "audio muted");
    return this.enabled;
  }

  get isEnabled() {
    return this.enabled;
  }

  blip() {
    this.tone(660, 0.035, 0.025, "square");
  }

  confirm() {
    setAudioStatus("confirm chime");
    this.sequence([523, 659, 784], 0.055, 0.05, 0.04);
  }

  warning() {
    setAudioStatus("warning tone");
    this.sequence([220, 196, 174], 0.075, 0.08, 0.055, "sawtooth");
  }

  stamp() {
    setAudioStatus("process stamp chime");
    this.sequence([392, 523, 659, 1046], 0.07, 0.06, 0.045);
  }

  transition() {
    setAudioStatus("transition sweep");
    this.sequence([330, 392, 494, 659], 0.055, 0.055, 0.035);
  }

  ending() {
    setAudioStatus("ending fanfare");
    this.sequence([392, 523, 659, 784, 1046, 784, 1046], 0.12, 0.09, 0.045);
  }

  startMusic(sceneKey: string) {
    if (!this.enabled || typeof window === "undefined") return;
    this.stopMusic();
    const patterns: Record<string, number[]> = {
      TitleScene: [196, 196, 262, 294, 330, 294, 262, 196],
      OfficeScene: [262, 330, 392, 330, 294, 330, 262, 196],
      ArchiveScene: [220, 262, 330, 262, 196, 220, 262, 330],
      NetworkScene: [147, 196, 294, 196, 147, 220, 294, 220],
      ReferralVaultScene: [196, 233, 294, 233, 196, 262, 330, 262],
      SilentReadScene: [247, 294, 330, 294, 247, 262, 330, 392],
      EndingScene: [262, 330, 392, 523, 392, 330, 392, 523]
    };
    const pattern = patterns[sceneKey] ?? patterns.OfficeScene;
    setAudioStatus(`music ${sceneKey}`);
    this.musicStep = 0;
    this.musicTimer = window.setInterval(() => {
      const note = pattern[this.musicStep % pattern.length];
      this.tone(note, 0.045, 0.012, "square");
      this.musicStep += 1;
    }, 520);
  }

  stopMusic() {
    if (this.musicTimer !== null && typeof window !== "undefined") {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private sequence(notes: number[], duration: number, gap: number, gain: number, wave: Wave = "square") {
    notes.forEach((note, index) => {
      window.setTimeout(() => this.tone(note, duration, gain, wave), index * (duration + gap) * 1000);
    });
  }

  private tone(frequency: number, duration: number, gainValue: number, wave: Wave = "square") {
    if (!this.enabled || typeof window === "undefined") return;
    const AudioCtor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    this.context ??= new AudioCtor();
    const context = this.context;
    if (context.state === "suspended") {
      void context.resume();
    }
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = wave;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(gainValue, context.currentTime + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start();
    osc.stop(context.currentTime + duration + 0.02);
  }
}

export const retroAudio = new RetroAudio();
