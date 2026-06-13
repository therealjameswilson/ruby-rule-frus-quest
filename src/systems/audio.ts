import { setAudioStatus } from "../game/state";
import { addInputGestureListener } from "../input/InputState";

type Wave = OscillatorType;
type RuntimeAudioState = AudioContextState | "interrupted" | "unavailable" | "uncreated";

interface MidiTheme {
  title: string;
  source: string;
  stepMs: number;
  notes: Array<number | null>;
  bass?: number[];
  wave?: Wave;
}

interface ResolvedTheme {
  key: keyof typeof PUBLIC_DOMAIN_MIDI_THEMES;
  theme: MidiTheme;
}

export interface AudioDebugState {
  enabled: boolean;
  prepared: boolean;
  unlocked: boolean;
  contextState: RuntimeAudioState;
  currentSceneKey: string | null;
  currentThemeKey: string | null;
  currentThemeTitle: string | null;
  pendingSceneKey: string | null;
  musicTimerActive: boolean;
  musicStep: number;
  resumePending: boolean;
  hiddenPaused: boolean;
  firstUnlockMs: number | null;
  lastFirstSampleMs: number | null;
  lastVisibilityEvent: string | null;
  lastInterruptionEvent: string | null;
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
  },
  cherryGarden: {
    title: "Cherry Blossom Garden",
    source: "Ruby Rule procedural oscillator stem",
    stepMs: 360,
    notes: [69, null, 72, 76, 74, null, 72, 69, 67, null, 69, 72, 64, null, 67, 69],
    bass: [45, 45, 52, 50],
    wave: "triangle"
  },
  blackVault: {
    title: "Black Vault Lair",
    source: "Ruby Rule procedural oscillator stem",
    stepMs: 190,
    notes: [43, 46, null, 43, 42, 43, 49, null, 43, 51, 46, null, 42, 43, null, 39],
    bass: [31, 31, 34, 30],
    wave: "sawtooth"
  },
  senate: {
    title: "Senate Hearing Chamber",
    source: "Ruby Rule procedural oscillator stem",
    stepMs: 420,
    notes: [55, 59, 62, null, 60, 59, 55, null, 52, 55, 59, 60, 62, null, 59, 55],
    bass: [36, 43, 40, 38],
    wave: "triangle"
  },
  naraStacks: {
    title: "NARA Stacks HVAC",
    source: "Ruby Rule procedural oscillator stem",
    stepMs: 260,
    notes: [48, null, 50, null, 47, null, 45, null, 48, 52, null, 50, 47, null, 45, null],
    bass: [32, 32, 35, 35],
    wave: "square"
  },
  embassyCable: {
    title: "Embassy Cable Room",
    source: "Ruby Rule procedural oscillator stem",
    stepMs: 150,
    notes: [60, null, 60, 67, null, 64, 60, null, 62, null, 62, 69, null, 65, 62, null],
    bass: [36, 39, 36, 41],
    wave: "square"
  },
  danneBoss: {
    title: "DANN-E Boss Alert",
    source: "Ruby Rule procedural oscillator stem",
    stepMs: 135,
    notes: [55, 58, 67, 58, 55, null, 70, 67, 55, 58, 67, 72, 70, 67, 58, null],
    bass: [31, 31, 34, 30],
    wave: "sawtooth"
  }
};

function midiToFrequency(note: number) {
  return 440 * 2 ** ((note - 69) / 12);
}

function nowMs() {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

class RetroAudio {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled = true;
  private prepared = false;
  private unlocked = false;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private currentSceneKey: string | null = null;
  private currentThemeKey: string | null = null;
  private currentTheme: MidiTheme | null = null;
  private pendingSceneKey: string | null = null;
  private removeGestureResumeListener?: () => void;
  private lifecycleInstalled = false;
  private stateListenerInstalled = false;
  private resumePending = false;
  private hiddenPaused = false;
  private firstUnlockMs: number | null = null;
  private lastFirstSampleMs: number | null = null;
  private lastVisibilityEvent: string | null = null;
  private lastInterruptionEvent: string | null = null;
  private lastContextState: RuntimeAudioState = "uncreated";

  prepare() {
    if (typeof window === "undefined" || this.prepared) return;
    this.prepared = true;
    this.installLifecycleListeners();
    setAudioStatus("oscillator score prepared");
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stopMusic();
      setAudioStatus("audio muted");
      return this.enabled;
    }
    setAudioStatus("audio on");
    void this.resumeAfterGesture();
    return this.enabled;
  }

  get isEnabled() {
    return this.enabled;
  }

  async unlock() {
    if (!this.enabled || typeof window === "undefined") return false;
    this.prepare();
    const startedAt = nowMs();
    const context = this.getContext();
    if (!context) {
      setAudioStatus("audio unavailable");
      return false;
    }

    await this.resumeContext(context);
    if (context.state !== "running") {
      this.resumePending = true;
      this.installGestureResume();
      setAudioStatus("audio resume pending");
      return false;
    }

    this.unlocked = true;
    this.resumePending = false;
    this.ensureMasterGain(context);
    this.prewarmWithSilentBuffer(context);
    this.prewarmWithSilentOscillator(context);
    this.firstUnlockMs = Math.max(0, nowMs() - startedAt);
    this.lastFirstSampleMs = this.firstUnlockMs;
    setAudioStatus("audio unlocked + prewarmed");

    const pending = this.pendingSceneKey;
    if (pending) this.startMusic(pending, { forceRestart: true });
    return true;
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

  egoBoltFire() {
    setAudioStatus("ego bolt fire");
    this.sequence([740, 370, 555], 0.035, 0.012, 0.035, "square");
  }

  egoBoltImpact() {
    setAudioStatus("ego bolt impact");
    this.sequence([196, 110, 82], 0.055, 0.018, 0.05, "sawtooth");
  }

  danneBoast() {
    setAudioStatus("DANN-E boast glitch");
    this.sequence([123, 92, 185, 104, 156], 0.04, 0.018, 0.035, "sawtooth");
  }

  dannePhaseTransition() {
    setAudioStatus("DANN-E phase transition");
    this.sequence([196, 247, 294, 370, 494], 0.06, 0.035, 0.045, "square");
  }

  danneItemPickup(itemLabel: string) {
    setAudioStatus(`DANN-E item pickup: ${itemLabel}`);
    if (itemLabel.includes("Fragment")) {
      this.sequence([392, 523, 659, 880], 0.065, 0.035, 0.045, "triangle");
      return;
    }
    if (itemLabel.includes("Key")) {
      this.sequence([330, 494, 659, 988], 0.07, 0.04, 0.05, "square");
      return;
    }
    this.sequence([523, 784, 1046, 1175], 0.06, 0.035, 0.048, "square");
  }

  startMusic(sceneKey: string, options: { forceRestart?: boolean } = {}) {
    if (!this.enabled || typeof window === "undefined") return;
    this.prepare();
    const { key, theme } = this.resolveTheme(sceneKey);
    this.currentSceneKey = sceneKey;
    this.currentTheme = theme;

    if (!this.unlocked) {
      this.pendingSceneKey = sceneKey;
      this.resumePending = true;
      this.installGestureResume();
      setAudioStatus(`audio pending ${theme.title}`);
      return;
    }

    const context = this.getContext();
    if (!context || context.state !== "running") {
      this.pendingSceneKey = sceneKey;
      this.resumePending = true;
      this.installGestureResume();
      setAudioStatus(`audio pending ${theme.title}`);
      return;
    }

    this.pendingSceneKey = null;
    this.resumePending = false;
    if (this.musicTimer !== null && this.currentThemeKey === key && !options.forceRestart) {
      setAudioStatus(`pd midi ${theme.title}`);
      return;
    }

    this.stopMusic();
    this.currentThemeKey = key;
    this.musicStep = 0;
    this.fadeMasterGain(0.85, 0.2);
    this.playMusicStep(theme);
    this.musicTimer = window.setInterval(() => this.playMusicStep(theme), theme.stepMs);
    setAudioStatus(`pd midi ${theme.title}`);
  }

  stopMusic() {
    if (this.musicTimer !== null && typeof window !== "undefined") {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  getDebugState(): AudioDebugState {
    return {
      enabled: this.enabled,
      prepared: this.prepared,
      unlocked: this.unlocked,
      contextState: this.getContextState(),
      currentSceneKey: this.currentSceneKey,
      currentThemeKey: this.currentThemeKey,
      currentThemeTitle: this.currentTheme?.title ?? null,
      pendingSceneKey: this.pendingSceneKey,
      musicTimerActive: this.musicTimer !== null,
      musicStep: this.musicStep,
      resumePending: this.resumePending,
      hiddenPaused: this.hiddenPaused,
      firstUnlockMs: this.firstUnlockMs,
      lastFirstSampleMs: this.lastFirstSampleMs,
      lastVisibilityEvent: this.lastVisibilityEvent,
      lastInterruptionEvent: this.lastInterruptionEvent
    };
  }

  private resolveTheme(sceneKey: string): ResolvedTheme {
    const themeMap: Record<string, keyof typeof PUBLIC_DOMAIN_MIDI_THEMES> = {
      TitleScene: "title",
      CharacterCreateScene: "title",
      OfficeScene: "title",
      CherryBlossomGardenScene: "cherryGarden",
      SenateHearingChamberScene: "senate",
      GuideScene: "archive",
      ArchiveScene: "archive",
      NaraStacksScene: "naraStacks",
      EmbassyCableRoomScene: "embassyCable",
      BlackVaultLairScene: "blackVault",
      DanneBoss: "danneBoss",
      NetworkScene: "archive",
      ReferralVaultScene: "archive",
      SilentReadScene: "satie",
      EndingScene: "satie"
    };
    const key = themeMap[sceneKey] ?? "title";
    return { key, theme: PUBLIC_DOMAIN_MIDI_THEMES[key] };
  }

  private playMusicStep(theme: MidiTheme) {
    const note = theme.notes[this.musicStep % theme.notes.length];
    if (note !== null) {
      this.tone(midiToFrequency(note), Math.min(0.16, (theme.stepMs / 1000) * 0.68), 0.012, theme.wave ?? "square");
    }
    if (theme.bass && this.musicStep % 4 === 0) {
      const bass = theme.bass[Math.floor(this.musicStep / 4) % theme.bass.length];
      this.tone(midiToFrequency(bass), Math.min(0.18, (theme.stepMs / 1000) * 0.85), 0.008, "triangle");
    }
    this.musicStep += 1;
  }

  private sequence(notes: number[], duration: number, gap: number, gain: number, wave: Wave = "square") {
    if (typeof window === "undefined") return;
    notes.forEach((note, index) => {
      window.setTimeout(() => this.tone(note, duration, gain, wave), index * (duration + gap) * 1000);
    });
  }

  private tone(frequency: number, duration: number, gainValue: number, wave: Wave = "square") {
    if (!this.enabled || typeof window === "undefined") return;
    const context = this.getContext();
    if (!context) return;
    if (!this.unlocked || context.state !== "running") {
      this.resumePending = true;
      this.installGestureResume();
      return;
    }
    const output = this.ensureMasterGain(context);
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = wave;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(gainValue, context.currentTime + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    osc.connect(gain);
    gain.connect(output);
    osc.start();
    osc.stop(context.currentTime + duration + 0.02);
  }

  private prewarmWithSilentBuffer(context: AudioContext) {
    const output = this.ensureMasterGain(context);
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = context.createBuffer(1, 1, context.sampleRate);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    source.connect(gain);
    gain.connect(output);
    source.start();
    source.stop(context.currentTime + 0.01);
  }

  private prewarmWithSilentOscillator(context: AudioContext) {
    const output = this.ensureMasterGain(context);
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "square";
    osc.frequency.value = 440;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.012);
    osc.connect(gain);
    gain.connect(output);
    osc.start();
    osc.stop(context.currentTime + 0.015);
  }

  private ensureMasterGain(context: AudioContext) {
    if (!this.masterGain) {
      this.masterGain = context.createGain();
      this.masterGain.gain.setValueAtTime(0.85, context.currentTime);
      this.masterGain.connect(context.destination);
    }
    return this.masterGain;
  }

  private fadeMasterGain(target: number, seconds: number) {
    const context = this.getContext();
    if (!context || !this.masterGain) return;
    const gain = this.masterGain.gain;
    gain.cancelScheduledValues(context.currentTime);
    gain.setTargetAtTime(target, context.currentTime, Math.max(0.01, seconds / 4));
  }

  private installGestureResume() {
    if (this.removeGestureResumeListener || typeof window === "undefined") return;
    this.removeGestureResumeListener = addInputGestureListener(() => {
      void this.resumeAfterGesture();
    });
  }

  private async resumeAfterGesture() {
    if (!this.enabled) return false;
    const unlocked = await this.unlock();
    if (unlocked && this.currentSceneKey) this.startMusic(this.currentSceneKey);
    if (unlocked) {
      this.removeGestureResumeListener?.();
      this.removeGestureResumeListener = undefined;
    }
    return unlocked;
  }

  private installLifecycleListeners() {
    if (this.lifecycleInstalled || typeof document === "undefined") return;
    this.lifecycleInstalled = true;
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.handleHidden();
      } else {
        void this.handleVisible();
      }
    });
    window.addEventListener("pagehide", () => this.handleHidden());
    window.addEventListener("pageshow", () => {
      if (!document.hidden) void this.handleVisible();
    });
  }

  private handleHidden() {
    this.lastVisibilityEvent = "hidden";
    this.hiddenPaused = this.musicTimer !== null || this.hiddenPaused;
    this.stopMusic();
    if (this.context?.state === "running") {
      void this.context.suspend();
    }
    if (this.hiddenPaused) {
      this.resumePending = true;
      setAudioStatus("audio paused for background");
    }
  }

  private async handleVisible() {
    this.lastVisibilityEvent = "visible";
    if (!this.enabled || !this.hiddenPaused) return;
    const context = this.getContext();
    if (!context) return;
    await this.resumeContext(context);
    if (context.state === "running") {
      this.unlocked = true;
      this.resumePending = false;
      this.hiddenPaused = false;
      if (this.currentSceneKey && this.musicTimer === null) this.startMusic(this.currentSceneKey, { forceRestart: true });
      this.fadeMasterGain(0.85, 0.2);
      return;
    }
    this.installGestureResume();
    setAudioStatus("tap to resume audio");
  }

  private handleContextStateChange() {
    const state = this.getContextState();
    const previous = this.lastContextState;
    this.lastContextState = state;
    if (state === "interrupted") {
      this.lastInterruptionEvent = "interrupted";
      this.stopMusic();
      this.resumePending = true;
      setAudioStatus("audio interrupted");
      return;
    }
    if (state === "running" && (previous === "interrupted" || this.resumePending)) {
      this.lastInterruptionEvent = `${previous}->running`;
      this.resumePending = false;
      this.unlocked = true;
      if (this.currentSceneKey) this.startMusic(this.currentSceneKey, { forceRestart: true });
      this.fadeMasterGain(0.85, 0.2);
    }
  }

  private async resumeContext(context: AudioContext) {
    try {
      if (context.state !== "running") await context.resume();
    } catch {
      // Mobile browsers can reject resume outside a trusted gesture; the next input gesture retries.
    }
  }

  private getContextState(): RuntimeAudioState {
    if (!this.context) return "uncreated";
    return this.context.state as RuntimeAudioState;
  }

  private getContext() {
    if (typeof window === "undefined") return null;
    const AudioCtor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return null;
    this.context ??= new AudioCtor();
    if (!this.stateListenerInstalled) {
      this.stateListenerInstalled = true;
      this.lastContextState = this.context.state as RuntimeAudioState;
      this.context.addEventListener("statechange", () => this.handleContextStateChange());
    }
    return this.context;
  }
}

export const retroAudio = new RetroAudio();
