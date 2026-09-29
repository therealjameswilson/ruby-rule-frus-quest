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
  const showChoice = vi.fn<ChoicePrompt["showCompilerDecision"]>();
  const showDialog = vi.fn<ChoicePrompt["showCompilerFeedback"]>();
  const done = vi.fn();
  const choice = { showCompilerFeedback: showDialog, showCompilerDecision: showChoice } as unknown as ChoicePrompt;
  const dialog = { show: showDialog } as unknown as DialogBox;
  runCompilerCheckpoint(choice, dialog, "research_plan", done);
  showChoice.mock.lastCall![1]({ key: "A", label: "Wrong", value: "publish" });
  expect(saveGameNow).not.toHaveBeenCalled();
  showDialog.mock.lastCall![3]?.();
  for (const task of COMPILER_TASKS.slice(0, 2)) {
    showChoice.mock.lastCall![1](task.options.find(option => option.value === task.correct)!);
    expect(done).not.toHaveBeenCalled();
    showDialog.mock.lastCall![3]?.();
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

it("lets an old assigned save finish both reviews without a required library packet", () => {
  gameState.sceneProgress = {compilerSopVersion:1,compilerVolumeAssignment:3,compilerSop_plan:1,compilerSop_research:1};
  const showDesk=vi.fn<ChoicePrompt['showManuscriptDesk']>();
  const showChapter=vi.fn<ChoicePrompt['showChapterDesk']>();
  const showRevision=vi.fn<ChoicePrompt['showRevisionDesk']>();
  const showChoice=vi.fn<ChoicePrompt['showCompilerDecision']>();const showDialog=vi.fn<ChoicePrompt['showCompilerFeedback']>();const done=vi.fn();
  runCompilerCheckpoint({showCompilerFeedback:showDialog,showCompilerDecision:showChoice, showManuscriptDesk:showDesk,showChapterDesk:showChapter,showRevisionDesk:showRevision} as unknown as ChoicePrompt,{show:showDialog} as unknown as DialogBox,'review_submission',done);
  expect(showDesk).toHaveBeenCalledOnce();
  showDesk.mock.lastCall![2]();
  showDialog.mock.lastCall![3]?.();
  expect(showChapter).toHaveBeenCalledOnce();
  showChapter.mock.lastCall![2]();
  showDialog.mock.lastCall![3]?.();
  for(const task of COMPILER_TASKS.slice(4)){
    if(task.id==="revision"){expect(showRevision).toHaveBeenCalledOnce();showRevision.mock.lastCall![2]();showDialog.mock.lastCall![3]?.();continue;}
    expect(showChoice.mock.lastCall![0].question).toBe(task.question);
    showChoice.mock.lastCall![1](task.options.find(o=>o.value===task.correct)!);
    showDialog.mock.lastCall![3]?.();
  }
  expect(done).toHaveBeenCalledExactlyOnceWith();
  expect(gameState.sceneProgress.compilerSop_submission).toBe(1);
  expect(gameState.sceneProgress.finalGatePublished).toBeUndefined();
});

it('keeps an accepted decision saved when returning from its explanation',()=>{
 const decision=vi.fn<ChoicePrompt['showCompilerDecision']>(),feedback=vi.fn<ChoicePrompt['showCompilerFeedback']>(),done=vi.fn();
 const choice={showCompilerDecision:decision,showCompilerFeedback:feedback} as unknown as ChoicePrompt;
 runCompilerCheckpoint(choice,{} as DialogBox,'research_plan',done);
 const task=COMPILER_TASKS[0];decision.mock.lastCall![1](task.options.find(o=>o.value===task.correct)!);
 expect(feedback.mock.lastCall![2]).toBe(true);expect(saveGameNow).toHaveBeenCalledOnce();feedback.mock.lastCall![4]();
 expect(gameState.sceneProgress.compilerSop_plan).toBe(1);expect(done).not.toHaveBeenCalled();
 runCompilerCheckpoint(choice,{} as DialogBox,'research_plan',done);expect(decision.mock.lastCall![0].id).toBe('research');expect(saveGameNow).toHaveBeenCalledOnce();
});

it('does not save or advance when returning from a rejected decision',()=>{
 const decision=vi.fn<ChoicePrompt['showCompilerDecision']>(),feedback=vi.fn<ChoicePrompt['showCompilerFeedback']>(),done=vi.fn();
 const choice={showCompilerDecision:decision,showCompilerFeedback:feedback} as unknown as ChoicePrompt;
 runCompilerCheckpoint(choice,{} as DialogBox,'research_plan',done);decision.mock.lastCall![1]({key:'A',label:'Wrong',value:'publish'});
 expect(feedback.mock.lastCall![2]).toBe(false);feedback.mock.lastCall![4]();expect(saveGameNow).not.toHaveBeenCalled();expect(done).not.toHaveBeenCalled();
 runCompilerCheckpoint(choice,{} as DialogBox,'research_plan',done);expect(decision.mock.lastCall![0].id).toBe('plan');
});
