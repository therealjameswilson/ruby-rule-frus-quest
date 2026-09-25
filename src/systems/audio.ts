import { playPaperFoley, type PaperAction } from "./paperFoley";
import { footstepSurface, playFootstep } from "./footsteps";
import { RoomAmbience, ambienceForScene } from "./roomAmbience";
import { ORIGINAL_SCORE, scoreEventsAtStep, type ScoreTheme } from "./originalScore";
import { readAudioMix, saveAudioMix, type AudioChannel } from "./audioMix";
import { setAudioStatus } from "../game/state";
import type { ProcessItemId } from "../game/constants";
import { addInputGestureListener } from "../input/InputState";

import { playToolFoley } from "./toolFoley";
import { ScoreVoice } from "./scoreVoice";

type Wave = OscillatorType;
type RuntimeAudioState = AudioContextState | "interrupted" | "unavailable" | "uncreated";

type MidiTheme = ScoreTheme;

interface ResolvedTheme {
  key: keyof typeof ORIGINAL_SCORE;
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
  currentThemeSource: string | null;
  currentThemeStem: string | null;
  pendingSceneKey: string | null;
  musicTimerActive: boolean;
  musicStep: number;
  ambienceProfile: string | null;
  ambienceSources: number;
  ambienceRiverPresence: number;
  resumePending: boolean;
  hiddenPaused: boolean;
  firstUnlockMs: number | null;
  lastFirstSampleMs: number | null;
  lastVisibilityEvent: string | null;
  lastInterruptionEvent: string | null;
}

function midiToFrequency(note: number) {
  return 440 * 2 ** ((note - 69) / 12);
}

function pageHidden() {
  return typeof document !== "undefined" && document.hidden;
}

function nowMs() {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

class RetroAudio {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private outputNode: DynamicsCompressorNode | null = null;
  private foley = new Set<() => void>();
  private musicGain: GainNode | null = null;
  private effectsGain: GainNode | null = null;
  private effects = new Map<OscillatorNode, GainNode>();
  private mix = readAudioMix();
  private enabled = true;
  private prepared = false;
  private unlocked = false;
  private musicTimer: number | null = null;
  private crossfadeTimer: number | null = null;
  private musicStep = 0;
  private nextMusicTime = 0;
  private scoreVoice: ScoreVoice | null = null;
  private ambience: RoomAmbience | null = null;
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
      this.stopEffects();
      this.stopMusic();
      this.fadeMasterGain(0.0001, 0.04);
      setAudioStatus("audio muted");
      return this.enabled;
    }
    setAudioStatus("audio on");
    void this.resumeAfterGesture();
    return this.enabled;
  }

  getMix() { return { ...this.mix }; }

  setChannelVolume(channel: AudioChannel, value: number) {
    if (!Number.isFinite(value)) return;
    this.mix[channel] = Math.max(0, Math.min(1, value));
    saveAudioMix(this.mix);
    if ((channel === "master" || channel === "effects") && this.mix[channel] === 0) this.stopEffects();
    if (!this.context) return;
    if (channel === "master") this.fadeMasterGain(this.enabled ? 0.85 : 0.0001, 0.04);
    else {
      const gain = channel === "music" ? this.musicGain : this.effectsGain;
      gain?.gain.setTargetAtTime(this.mix[channel], this.context.currentTime, 0.015);
    }
  }

  private channelOutput(context: AudioContext, channel: "music" | "effects") {
    const property = channel === "music" ? "musicGain" : "effectsGain";
    if (!this[property]) {
      const node = context.createGain();
      node.gain.value = this.mix[channel];
      node.connect(this.ensureMasterGain(context));
      this[property] = node;
    }
    return this[property]!;
  }

  get isEnabled() {
    return this.enabled;
  }

  async unlock() {
    if (!this.enabled || typeof window === "undefined" || pageHidden()) return false;
    this.prepare();
    const startedAt = nowMs();
    const context = this.getContext();
    if (!context) {
      setAudioStatus("audio unavailable");
      return false;
    }

    await this.resumeContext(context);
    if (pageHidden()) { this.handleHidden(); return false; }
    if (!this.enabled) return false;
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

  paperPickup() {
    setAudioStatus("paper packet pickup");
    this.paperSound('pickup');
  }

  fileDocket() {
    setAudioStatus("paper filing and stamp");
    this.paperSound('file');
  }

  private paperSound(action: PaperAction) {
    if (!this.enabled || typeof window === 'undefined' || pageHidden() || this.mix.effects === 0 || this.mix.master === 0) return;
    const context = this.getContext();
    if (!context) return;
    if (!this.unlocked || context.state !== 'running') {
      this.resumePending = true; this.installGestureResume(); return;
    }
    let cancel: () => void;
    cancel = playPaperFoley(context, this.channelOutput(context, 'effects'), action, () => this.foley.delete(cancel));
    this.foley.add(cancel);
  }

  toolWindup(tool: ProcessItemId) {
    setAudioStatus(`${tool.replace(/_/g, ' ')} windup`);
    this.toolSound(tool, false);
  }

  toolHit(tool: ProcessItemId) {
    setAudioStatus(`${tool.replace(/_/g, ' ')} impact`);
    this.toolSound(tool, true);
  }

  private toolSound(tool: ProcessItemId, hit: boolean) {
    if (!this.enabled || typeof window === 'undefined' || pageHidden() || this.mix.effects === 0 || this.mix.master === 0) return;
    const context = this.getContext();
    if (!context) return;
    if (!this.unlocked || context.state !== 'running') {
      this.resumePending = true; this.installGestureResume(); return;
    }
    let cancel: () => void;
    cancel = playToolFoley(context, this.channelOutput(context, 'effects'), tool, hit, () => this.foley.delete(cancel));
    this.foley.add(cancel);
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

  playerHurt(heavy = false) {
    setAudioStatus(heavy ? "player hurt (heavy)" : "player hurt");
    if (heavy) {
      this.sequence([174, 116, 82], 0.06, 0.016, 0.055, "sawtooth");
      return;
    }
    this.sequence([220, 146, 104], 0.05, 0.014, 0.05, "sawtooth");
  }

  bossHit() {
    setAudioStatus("boss review hit");
    this.sequence([330, 208], 0.04, 0.008, 0.05, "square");
  }

  bossDefeat() {
    setAudioStatus("boss defeat sting");
    this.sequence([392, 294, 220, 147, 98], 0.12, 0.02, 0.05, "sawtooth");
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

  crossfadeToMusic(sceneKey: string, options: { forceRestart?: boolean } = {}) {
    if (typeof window === "undefined") return;
    if (!this.enabled) {
      this.startMusic(sceneKey, options);
      return;
    }
    this.prepare();
    const { key, theme } = this.resolveTheme(sceneKey);
    if (this.currentThemeKey === key && !options.forceRestart) {
      this.startMusic(sceneKey);
      return;
    }
    if (!this.unlocked || !this.getContext() || this.getContextState() !== "running") {
      this.startMusic(sceneKey, options);
      return;
    }

    if (this.crossfadeTimer !== null) window.clearTimeout(this.crossfadeTimer);
    this.currentSceneKey = sceneKey;
    this.pendingSceneKey = null;
    this.fadeMusicGain(0, 0.18);
    setAudioStatus(`crossfade ${theme.title}`);
    this.crossfadeTimer = window.setTimeout(() => {
      this.crossfadeTimer = null;
      this.startMusic(sceneKey, { forceRestart: true });
    }, 180);
  }

  startMusic(sceneKey: string, options: { forceRestart?: boolean } = {}) {
    if (typeof window === "undefined") return;
    const { key, theme } = this.resolveTheme(sceneKey);
    this.currentSceneKey = sceneKey;
    this.currentTheme = theme;
    // Muting silences playback, not room/theme selection for the next unmute.
    if (!this.enabled) {
      this.currentThemeKey = key;
      this.pendingSceneKey = null;
      return;
    }
    if (pageHidden()) {
      this.pendingSceneKey = sceneKey;
      this.hiddenPaused = true;
      this.handleHidden();
      return;
    }
    const canceledCrossfade = this.crossfadeTimer !== null;
    if (this.crossfadeTimer !== null) {
      window.clearTimeout(this.crossfadeTimer);
      this.crossfadeTimer = null;
    }
    this.prepare();

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
      this.ensureAmbience(context, sceneKey);
      // A canceled outgoing fade must not leave the surviving theme silent.
      if (canceledCrossfade) this.fadeMusicGain(this.mix.music, 0.18);
      setAudioStatus(`original score ${theme.title}`);
      return;
    }

    this.stopMusic();
    this.currentThemeKey = key;
    this.ensureAmbience(context, sceneKey);
    this.musicStep = 0;
    this.fadeMasterGain(0.85, 0.2);
    this.scoreVoice = new ScoreVoice(context, this.channelOutput(context, "music"));
    this.fadeMusicGain(this.mix.music, 0.25);
    this.nextMusicTime = context.currentTime + 0.025;
    const schedule = () => {
      if (context.state !== "running") return;
      // Recover from a stalled tab without playing a burst of missed notes.
      if (this.nextMusicTime < context.currentTime - 0.15) this.nextMusicTime = context.currentTime + 0.025;
      while (this.nextMusicTime < context.currentTime + 0.12) {
        this.playMusicStep(theme, this.nextMusicTime);
        this.nextMusicTime += theme.stepMs / 1000;
      }
    };
    schedule();
    this.musicTimer = window.setInterval(schedule, 25);
    setAudioStatus(`original score ${theme.title}`);
  }

  setOutdoorListener(position: {y:number}) {
    if (this.currentSceneKey === 'ResearchWorldScene') this.ambience?.setRiverPosition(position);
  }

  private ensureAmbience(context: AudioContext, sceneKey: string) {
    const profile = ambienceForScene(sceneKey);
    if (this.ambience?.profile === profile) {
      if (sceneKey !== 'ResearchWorldScene') this.ambience?.setRiverPosition(null);
      return;
    }
    this.ambience?.dispose();
    this.ambience = profile ? new RoomAmbience(context, this.channelOutput(context, "effects"), profile) : null;
  }

  stopMusic() {
    this.ambience?.dispose();
    this.ambience = null;
    this.scoreVoice?.dispose();
    this.scoreVoice = null;
    if (this.crossfadeTimer !== null && typeof window !== "undefined") {
      window.clearTimeout(this.crossfadeTimer);
      this.crossfadeTimer = null;
    }
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
      currentThemeSource: this.currentTheme?.source ?? null,
      currentThemeStem: this.currentTheme?.midiStem ?? null,
      pendingSceneKey: this.pendingSceneKey,
      musicTimerActive: this.musicTimer !== null,
      musicStep: this.musicStep,
      ambienceProfile: this.ambience?.profile ?? null,
      ambienceSources: this.ambience?.activeSourceCount ?? 0,
      ambienceRiverPresence: this.ambience?.riverPresence ?? 0,
      resumePending: this.resumePending,
      hiddenPaused: this.hiddenPaused,
      firstUnlockMs: this.firstUnlockMs,
      lastFirstSampleMs: this.lastFirstSampleMs,
      lastVisibilityEvent: this.lastVisibilityEvent,
      lastInterruptionEvent: this.lastInterruptionEvent
    };
  }

  private resolveTheme(sceneKey: string): ResolvedTheme {
    const themeMap: Record<string, keyof typeof ORIGINAL_SCORE> = {
      title: "title",
      TitleScene: "title",
      CharacterCreateScene: "title",
      OfficeScene: "officeHub",
      CherryBlossomGardenScene: "cherryGarden",
      SenateHearingChamberScene: "senate",
      GuideScene: "archiveDungeon",
      ArchiveScene: "archiveDungeon",
      NaraStacksScene: "naraStacks",
      EmbassyCableRoomScene: "embassyCable",
      BlackVaultLairScene: "blackVault",
      DanneCombat: "danneCombat",
      DanneMiniboss: "miniboss",
      DanneBoss: "danneCombat",
      NetworkScene: "openNetRouting",
      ReferralVaultScene: "referralVault",
      SilentReadScene: "silentReadTower",
      EndingScene: "bindingCeremony",
      TrueEndingScene: "bindingCeremony",
      BadEndingScene: "danneBoss",
      historian_office: "officeHub",
      nara_stacks: "archiveDungeon",
      foggy_bottom: "officeHub",
      west_wing: "senate",
      black_vault: "blackVault",
      frus_floor: "officeHub",
      embassy: "embassyCable",
      capitol_hill: "senate"
    };
    const key = themeMap[sceneKey] ?? "title";
    return { key, theme: ORIGINAL_SCORE[key] };
  }

  private playMusicStep(theme: MidiTheme, at: number) {
    for (const event of scoreEventsAtStep(theme, this.musicStep)) {
      this.scoreVoice?.play(midiToFrequency(event.note), at + event.offset, event.duration, event.volume, event.part);
    }
    if (theme.pulse) this.scoreVoice?.pulse(this.musicStep % 8, at, theme.stepMs / 1000);
    this.musicStep += 1;
  }

  private sequence(notes: number[], duration: number, gap: number, gain: number, wave: Wave = "square") {
    if (!this.enabled || typeof window === "undefined" || pageHidden()) return;
    const at = this.getContext()?.currentTime;
    if (at === undefined) return;
    notes.forEach((note, index) => {
      this.tone(note, duration, gain, wave, at + index * (duration + gap));
    });
  }

  footstep(scene: string, right: boolean, position?: {x:number; y:number}) {
    if (!this.enabled || !this.unlocked || !this.context || this.context.state !== "running") return;
    if (this.mix.effects === 0 || this.mix.master === 0) return;
    playFootstep(this.context, this.channelOutput(this.context, "effects"), footstepSurface(scene, position), right);
  }

  private tone(frequency: number, duration: number, gainValue: number, wave: Wave = "square", scheduledAt?: number) {
    if (!this.enabled || typeof window === "undefined" || pageHidden() || this.mix.effects === 0 || this.mix.master === 0) return;
    const context = this.getContext();
    if (!context) return;
    if (!this.unlocked || context.state !== "running") {
      this.resumePending = true;
      this.installGestureResume();
      return;
    }
    const output = this.channelOutput(context, "effects");
    const at = Math.max(context.currentTime, scheduledAt ?? context.currentTime);
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = wave;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(gainValue, at + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(gain);
    gain.connect(output);
    this.effects.set(osc, gain);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); this.effects.delete(osc); };
    osc.start(at);
    osc.stop(at + duration + 0.02);
  }

  private stopEffects() {
    for (const cancel of this.foley) cancel();
    this.foley.clear();
    const at = this.context?.currentTime ?? 0;
    for (const [osc, gain] of this.effects) {
      gain.gain.cancelScheduledValues(at);
      gain.gain.setTargetAtTime(0.0001, at, 0.003);
      osc.stop(at + 0.015);
    }
    this.effects.clear();
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
      this.masterGain.gain.setValueAtTime(0.85 * this.mix.master, context.currentTime);
      // Raise the deliberately quiet synthesis mix while controlling stacked effects.
      const level = context.createGain(); level.gain.value = 4;
      this.outputNode = context.createDynamicsCompressor();
      this.outputNode.threshold.value = -8; this.outputNode.knee.value = 6;
      this.outputNode.ratio.value = 12; this.outputNode.attack.value = .003; this.outputNode.release.value = .18;
      this.masterGain.connect(level); level.connect(this.outputNode); this.outputNode.connect(context.destination);
    }
    return this.masterGain;
  }

  private fadeMusicGain(target: number, seconds: number) {
    const context = this.context;
    if (!context || !this.musicGain) return;
    this.musicGain.gain.cancelScheduledValues(context.currentTime);
    this.musicGain.gain.setTargetAtTime(target, context.currentTime, Math.max(.01, seconds / 4));
  }

  private fadeMasterGain(target: number, seconds: number) {
    const context = this.getContext();
    if (!context || !this.masterGain) return;
    const gain = this.masterGain.gain;
    gain.cancelScheduledValues(context.currentTime);
    gain.setTargetAtTime(target * this.mix.master, context.currentTime, Math.max(0.01, seconds / 4));
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
    this.stopEffects();
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
    if (!this.enabled || !this.hiddenPaused || pageHidden()) return;
    const context = this.getContext();
    if (!context) return;
    await this.resumeContext(context);
    // Visibility can change while the browser is resolving resume().
    if (pageHidden()) { this.handleHidden(); return; }
    if (!this.enabled) return;
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
    if (state === "running" && pageHidden()) { this.handleHidden(); return; }
    if (state === "interrupted") {
      this.stopEffects();
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
