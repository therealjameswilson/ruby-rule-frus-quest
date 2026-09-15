import { expect, it, vi } from "vitest";
import { WarningScene } from "./WarningScene";
import { retroAudio } from "../systems/audio";

vi.mock("phaser", () => ({ default: { Scene: class {}, Cameras: { Scene2D: { Events: { FADE_OUT_COMPLETE: "fade" } } } } }));
vi.mock("../systems/audio", () => ({ retroAudio: { unlock: vi.fn(), confirm: vi.fn() } }));
vi.mock("../input/InputState", () => ({ swallowNextInputFrame: vi.fn() }));

it("continues once even when Safari audio unlock never resolves", async () => {
  vi.mocked(retroAudio.unlock).mockReturnValue(new Promise(() => undefined));
  const fadeOut = vi.fn(), once = vi.fn(), start = vi.fn();
  const scene = Object.assign(new WarningScene(), {
    cameras: { main: { fadeOut, once } }, scene: { start }
  }) as unknown as { begin(gesture: boolean): Promise<void> };
  await scene.begin(true);
  await scene.begin(true);
  expect(fadeOut).toHaveBeenCalledOnce();
  once.mock.calls[0][1]();
  expect(start).toHaveBeenCalledWith("TitleScene");
});
