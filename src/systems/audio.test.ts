import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../game/state", () => ({ setAudioStatus: vi.fn() }));
vi.mock("../input/InputState", () => ({ addInputGestureListener: vi.fn() }));
let audio: typeof import("./audio").retroAudio;

beforeEach(async () => {
  vi.resetModules();
  vi.stubGlobal("window", {});
  audio = (await import("./audio")).retroAudio;
  audio.toggle();
});
afterEach(() => vi.unstubAllGlobals());

describe("muted music requests", () => {
  it("remembers the latest room without creating audio or scheduling music", () => {
    audio.startMusic("OfficeScene");
    audio.startMusic("GuideScene");
    expect(audio.getDebugState()).toMatchObject({ enabled: false, currentSceneKey: "GuideScene",
      currentThemeKey: "archiveDungeon", contextState: "uncreated", musicTimerActive: false, pendingSceneKey: null });
  });
  it("keeps a muted combat crossfade from restoring an old room theme", () => {
    audio.startMusic("NetworkScene");
    audio.crossfadeToMusic("DanneCombat");
    expect(audio.getDebugState()).toMatchObject({ currentSceneKey: "DanneCombat", currentThemeKey: "danneCombat",
      enabled: false, contextState: "uncreated", musicTimerActive: false });
    audio.crossfadeToMusic("NetworkScene");
    expect(audio.getDebugState()).toMatchObject({ currentSceneKey: "NetworkScene", currentThemeKey: "openNetRouting" });
  });
});

describe('interrupted music transitions',()=>{
  it.each([0,.37,1])('restores music volume %s when returning to the still-playing theme',(volume)=>{
    const clearTimeout=vi.fn();vi.stubGlobal('window',{clearTimeout,AudioContext:class{}});
    const runtime=audio as unknown as {enabled:boolean;unlocked:boolean;prepared:boolean;stateListenerInstalled:boolean;context:object;currentThemeKey:string;musicTimer:number;crossfadeTimer:number;mix:{music:number};fadeMusicGain:(value:number,seconds:number)=>void;ensureAmbience:()=>void};
    runtime.enabled=true;runtime.unlocked=true;runtime.prepared=true;runtime.stateListenerInstalled=true;runtime.context={state:'running'};runtime.currentThemeKey='archiveDungeon';runtime.musicTimer=12;runtime.crossfadeTimer=34;runtime.mix.music=volume;
    const fade=vi.spyOn(runtime,'fadeMusicGain').mockImplementation(()=>{});vi.spyOn(runtime,'ensureAmbience').mockImplementation(()=>{});
    audio.startMusic('ArchiveScene');
    expect(clearTimeout).toHaveBeenCalledWith(34);expect(fade).toHaveBeenCalledWith(volume,.18);expect(audio.getDebugState().musicTimerActive).toBe(true);
  });
});
