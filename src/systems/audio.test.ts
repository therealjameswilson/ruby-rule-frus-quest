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
  it("keeps the outdoor scene identity while sharing the garden score", () => {
    audio.startMusic("ResearchWorldScene");
    expect(audio.getDebugState()).toMatchObject({ currentSceneKey: "ResearchWorldScene", currentThemeKey: "cherryGarden" });
  });
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

describe('effect sequences on the audio clock', () => {
  it('schedules every note immediately at exact audio times and cancels queued notes on mute', () => {
    const timeout=vi.fn();vi.stubGlobal('window',{setTimeout:timeout});
    const starts:number[]=[];const stops:ReturnType<typeof vi.fn>[]=[];
    const gains:Record<string,ReturnType<typeof vi.fn>>[]=[];
    const context={currentTime:10,state:'running',createOscillator:()=>{
      const stop=vi.fn();stops.push(stop);
      return {type:'square',frequency:{value:0},connect:vi.fn(),disconnect:vi.fn(),start:(at:number)=>starts.push(at),stop,onended:null};
    },createGain:()=>{const gain={setValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn(),cancelScheduledValues:vi.fn(),setTargetAtTime:vi.fn()};gains.push(gain);return {gain,connect:vi.fn(),disconnect:vi.fn()};}};
    const runtime=audio as unknown as {enabled:boolean;unlocked:boolean;context:unknown;getContext:()=>unknown;channelOutput:()=>unknown;stopMusic:()=>void;fadeMasterGain:()=>void;effects:Map<unknown,unknown>};
    runtime.enabled=true;runtime.unlocked=true;runtime.context=context;
    vi.spyOn(runtime,'getContext').mockReturnValue(context);vi.spyOn(runtime,'channelOutput').mockReturnValue({});
    vi.spyOn(runtime,'stopMusic').mockImplementation(()=>{});vi.spyOn(runtime,'fadeMasterGain').mockImplementation(()=>{});
    audio.confirm();
    expect(starts).toEqual([10,10.105,10.21]);expect(timeout).not.toHaveBeenCalled();expect(runtime.effects.size).toBe(3);
    context.currentTime=10.01;audio.toggle();
    for(const stop of stops)expect(stop).toHaveBeenLastCalledWith(10.025);
    for(const gain of gains)expect(gain.cancelScheduledValues).toHaveBeenCalledWith(10.01);
    expect(runtime.effects.size).toBe(0);
  });
  it('does not create or defer effects while muted',()=>{
    const timeout=vi.fn();vi.stubGlobal('window',{setTimeout:timeout});
    const runtime=audio as unknown as {getContext:()=>unknown};
    const context=vi.spyOn(runtime,'getContext');audio.ending();
    expect(context).not.toHaveBeenCalled();expect(timeout).not.toHaveBeenCalled();
  });
});
