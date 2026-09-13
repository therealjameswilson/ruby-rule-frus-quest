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
