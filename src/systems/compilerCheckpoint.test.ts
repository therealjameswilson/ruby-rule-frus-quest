import { beforeEach, expect, it, vi } from "vitest";
import { COMPILER_TASKS, getCompilerMissionReadout, nextCompilerTask } from "../game/compilerMission";
import { createGameSaveData, gameState, resetGameState, restoreGameSaveData, setSceneState } from "../game/state";
import { runCompilerCheckpoint } from "./compilerCheckpoint";
import type { ChoicePrompt } from "./verification";
import type { DialogBox } from "./dialog";
import { saveGameNow } from "./save";

vi.mock("./save", () => ({ saveGameNow: vi.fn() }));
beforeEach(() => { resetGameState(); vi.clearAllMocks(); setSceneState("OfficeScene", "explore", "PLAN"); });

it("saves each accepted task, retries mistakes, and completes only its checkpoint", () => {
  const showChoice = vi.fn<ChoicePrompt["show"]>();
  const showDialog = vi.fn<DialogBox["show"]>();
  const done = vi.fn();
  const choice = { show: showChoice } as unknown as ChoicePrompt;
  const dialog = { show: showDialog } as unknown as DialogBox;
  runCompilerCheckpoint(choice, dialog, "research_plan", done);
  showChoice.mock.lastCall![2]({ key: "A", label: "Wrong", value: "publish" });
  expect(saveGameNow).not.toHaveBeenCalled();
  showDialog.mock.lastCall![2]?.();
  for (const task of COMPILER_TASKS.slice(0, 2)) {
    showChoice.mock.lastCall![2](task.options.find(option => option.value === task.correct)!);
    expect(done).not.toHaveBeenCalled();
    showDialog.mock.lastCall![2]?.();
  }
  expect(saveGameNow).toHaveBeenCalledTimes(2);
  expect(done).toHaveBeenCalledTimes(1);
  expect(nextCompilerTask(gameState.sceneProgress)?.id).toBe("selection");
});

it("round-trips SOP progress through the real game save without granting publication", () => {
  gameState.sceneProgress.compilerSopVersion = 1;
  gameState.sceneProgress.compilerSop_plan = 1;
  const saved = JSON.parse(JSON.stringify(createGameSaveData()));
  resetGameState();
  expect(restoreGameSaveData(saved)).toBe("OfficeScene");
  expect(nextCompilerTask(gameState.sceneProgress)?.id).toBe("research");
  expect(getCompilerMissionReadout(gameState.sceneProgress).enabled).toBe(true);
  expect(gameState.finalGateCertification?.status).not.toBe("published");
});
