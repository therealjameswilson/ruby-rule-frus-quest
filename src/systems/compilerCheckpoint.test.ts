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

it("keeps the selected volume visible through compilation and both reviews", () => {
  gameState.sceneProgress = {compilerSopVersion:1,compilerVolumeAssignment:3,compilerSop_plan:1,compilerSop_research:1,libraryResearch_v2_clinton:4};
  const showChoice=vi.fn<ChoicePrompt['show']>();const showDialog=vi.fn<DialogBox['show']>();const done=vi.fn();
  runCompilerCheckpoint({show:showChoice} as unknown as ChoicePrompt,{show:showDialog} as unknown as DialogBox,'review_submission',done);
  for(const task of COMPILER_TASKS.slice(2)){
    expect(showDialog.mock.lastCall![0]).toBe('MANUSCRIPT DESK');
    if(task.id==='selection'||task.id==='second_review')expect(showDialog.mock.lastCall![1]).toContain('1993–2000, Volume XVIII, Russia: High-Level Contacts');
    showDialog.mock.lastCall![2]?.();
    expect(showChoice.mock.lastCall![0]).toContain(task.question);
    showChoice.mock.lastCall![2](task.options.find(o=>o.value===task.correct)!);
    showDialog.mock.lastCall![2]?.();
  }
  expect(done).toHaveBeenCalledExactlyOnceWith();
  expect(gameState.sceneProgress.compilerSop_submission).toBe(1);
  expect(gameState.sceneProgress.finalGatePublished).toBeUndefined();
});
