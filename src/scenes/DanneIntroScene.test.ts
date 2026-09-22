import { beforeEach, expect, it, vi } from "vitest";
import { DanneIntroScene } from "./DanneIntroScene";
import { DANNE_INTRO } from "../game/danneIntro";
import { transitionTo } from "../systems/sceneTransitions";
import { getInput } from "../input/InputState";
vi.mock("phaser", () => ({ default: { Scene: class {} } }));
vi.mock("../systems/sceneTransitions", () => ({ transitionTo: vi.fn() }));
vi.mock("../systems/audio", () => ({ retroAudio: {} }));
vi.mock("../input/InputState", () => ({ getInput: vi.fn(() => ({})), tickInput: vi.fn(), swallowNextInputFrame: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
function intro() {
  return Object.assign(new DanneIntroScene(), { time: { now: 1000 }, readyAt: 0, renderPage: vi.fn() }) as unknown as {
    page: number; time: { now: number }; next(): void; back(): void; finish(): void; update(): void;
  };
}
it("requires fresh presses, debounces taps, supports back, and exits the final page once", () => {
  const scene = intro();
  vi.mocked(getInput).mockReturnValue({ a: true, start: true } as ReturnType<typeof getInput>);
  scene.update(); expect(scene.page).toBe(0);
  scene.back(); expect(scene.page).toBe(0);
  scene.next(); scene.next(); expect(scene.page).toBe(1);
  scene.time.now += 200; scene.back(); expect(scene.page).toBe(0);
  for (let i = 0; i < DANNE_INTRO.length; i++) { scene.time.now += 200; scene.next(); }
  scene.finish();
  expect(transitionTo).toHaveBeenCalledExactlyOnceWith(scene, "OfficeScene");
});
it("skips from the first page without starting gameplay twice", () => {
  const scene = intro(); scene.finish(); scene.next(); scene.finish();
  expect(transitionTo).toHaveBeenCalledExactlyOnceWith(scene, "OfficeScene");
});
it("fits every story card into the fixed native text area without truncation", () => {
  for (const card of DANNE_INTRO) {
    expect(card.lines.length).toBeLessThanOrEqual(5);
    for (const line of [...card.lines, card.boast, card.phase]) expect(line.length).toBeLessThanOrEqual(35);
  }
});
