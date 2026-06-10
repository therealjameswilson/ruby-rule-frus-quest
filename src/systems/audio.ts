import { setAudioStatus } from "../game/state";

type Wave = OscillatorType;

interface MidiTheme {
  title: string;
  source: string;
  stepMs: number;
  notes: Array<number | null>;
  bass?: number[];
  wave?: Wave;
}

const PUBLIC_DOMAIN_MIDI_THEMES: Record<string, MidiTheme> = {
  title: {
    title: "Bach Contrapunctus I",
    source: "Mutopia public-domain MIDI",
    stepMs: 300,
    notes: [50, 57, 53, 50, 49, 50, 52, 53, 55, 57, 53, 52, 50, null, 45, 50],
    bass: [38, 38, 41, 45]
  },
  archive: {
    title: "Bach Chromatic Fantasy",
    source: "Mutopia public-domain MIDI",
    stepMs: 180,
    notes: [64, 65, 66, 67, 68, 69, 70, 71, 72, 71, 70, 69, 68, 67, 66, 65],
    bass: [40, 43, 45, 47],
    wave: "square"
  },
  satie: {
    title: "Satie Ogive No. 2",
    source: "Wikimedia Commons public-domain MIDI",
    stepMs: 520,
    notes: [48, 55, 60, 64, 67, 64, 60, 55, 50, 57, 62, 65, 69, 65, 62, 57],
    bass: [36, 36, 38, 38],
    wave: "triangle"
  }
};

function midiToFrequency(note: number) {
  return 440 * 2 ** ((note - 69) / 12);
}

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
    const themes: Record<string, MidiTheme> = {
      TitleScene: PUBLIC_DOMAIN_MIDI_THEMES.title,
      CharacterCreateScene: PUBLIC_DOMAIN_MIDI_THEMES.title,
      OfficeScene: PUBLIC_DOMAIN_MIDI_THEMES.title,
      ArchiveScene: PUBLIC_DOMAIN_MIDI_THEMES.archive,
      NetworkScene: PUBLIC_DOMAIN_MIDI_THEMES.archive,
      ReferralVaultScene: PUBLIC_DOMAIN_MIDI_THEMES.archive,
      SilentReadScene: PUBLIC_DOMAIN_MIDI_THEMES.satie,
      EndingScene: PUBLIC_DOMAIN_MIDI_THEMES.satie
    };
    const theme = themes[sceneKey] ?? PUBLIC_DOMAIN_MIDI_THEMES.title;
    setAudioStatus(`pd midi ${theme.title}`);
    this.musicStep = 0;
    this.musicTimer = window.setInterval(() => {
      const note = theme.notes[this.musicStep % theme.notes.length];
      if (note !== null) {
        this.tone(midiToFrequency(note), Math.min(0.16, (theme.stepMs / 1000) * 0.68), 0.012, theme.wave ?? "square");
      }
      if (theme.bass && this.musicStep % 4 === 0) {
        const bass = theme.bass[Math.floor(this.musicStep / 4) % theme.bass.length];
        this.tone(midiToFrequency(bass), Math.min(0.18, (theme.stepMs / 1000) * 0.85), 0.008, "triangle");
      }
      this.musicStep += 1;
    }, theme.stepMs);
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
