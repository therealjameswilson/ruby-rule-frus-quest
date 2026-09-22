import { describe, expect, it } from "vitest";
import { COMPILER_TASKS, compilerCheckpointComplete, getCompilerMissionReadout, nextCompilerTask, submitCompilerTask } from "./compilerMission";
import { choiceLayout } from "../systems/choiceLayout";

describe("SOP compiler mission", () => {
  it.each(COMPILER_TASKS)("keeps $id evidence and choices on screen", task => {
    const layout = choiceLayout(`${task.question}\n\n${task.context}`, task.options, 8);
    expect(layout.top).toBeGreaterThanOrEqual(30);
    expect(layout.top + layout.height).toBeLessThanOrEqual(210);
    expect(layout.questionText.replace(/\n/g, " ")).toBe(task.question);
    expect(layout.contextText.replace(/\n/g, " ")).toBe(task.context);
    layout.rows.forEach((row, index) => expect(row.text.replace(/\n/g, " ")).toBe(`[${task.options[index].key}] ${task.options[index].label}`));
  });
  it("requires research approval before compilation and both reviews before revision", () => {
    const progress: Record<string, number> = {};
    expect(submitCompilerTask(progress, "submission", "handoff").ok).toBe(false);
    expect(nextCompilerTask(progress, "review_submission")).toBeNull();
    for (const task of COMPILER_TASKS) {
      expect(nextCompilerTask(progress)?.id).toBe(task.id);
      if (task.id === "first_review" || task.id === "second_review") {
        expect(submitCompilerTask(progress, "revision", "revise").ok).toBe(false);
      }
      expect(submitCompilerTask(progress, task.id, task.correct).ok).toBe(true);
    }
    expect(nextCompilerTask(progress)).toBeNull();
    expect(compilerCheckpointComplete(progress, "review_submission")).toBe(true);
  });

  it("rejects every incorrect choice without changing progress or inventing a standards violation", () => {
    const progress: Record<string, number> = {};
    for (const task of COMPILER_TASKS) {
      const before = { ...progress };
      const wrong = task.options.find(option => option.value !== task.correct)!;
      const result = submitCompilerTask(progress, task.id, wrong.value);
      expect(result).toEqual({ ok: false, message: task.hint });
      expect(progress).toEqual(before);
      submitCompilerTask(progress, task.id, task.correct);
    }
  });

  it("resumes through the existing numeric sceneProgress save format", () => {
    let progress: Record<string, number> = { compilerSopVersion: 1, archiveSourceRoomComplete: 1 };
    for (const task of COMPILER_TASKS.slice(0, 6)) submitCompilerTask(progress, task.id, task.correct);
    progress = JSON.parse(JSON.stringify(progress));
    expect(nextCompilerTask(progress)?.id).toBe("revision");
    expect(progress.archiveSourceRoomComplete).toBe(1);
    expect(compilerCheckpointComplete(progress, "research_plan")).toBe(true);
    expect(compilerCheckpointComplete(progress, "review_submission")).toBe(false);
    expect(submitCompilerTask(progress, "plan", "route").ok).toBe(false);
  });

  it("distinguishes the document-page budget and DPD handoff from public release", () => {
    const progress: Record<string, number> = { compilerSopVersion: 1 };
    for (const task of COMPILER_TASKS) submitCompilerTask(progress, task.id, task.correct);
    const readout = getCompilerMissionReadout(progress);
    expect(readout.documentPages).toBe(1320);
    expect(readout.documentPageLimit).toBe(1400);
    expect(readout.annotationSheetsCountTowardLimit).toBe(false);
    expect(readout.completed).toBe(10);
    expect(readout.dpdSubmitted).toBe(true);
    expect(readout.nextTask).toContain("publication remain");
    expect(progress.finalGatePublished).toBeUndefined();
  });

  it("does not fabricate SOP work for legacy saves", () => {
    const readout = getCompilerMissionReadout({ officeStarterMemoStatus: 3, manuscriptReviewComplete: 1 });
    expect(readout.enabled).toBe(false);
    expect(readout.completed).toBe(0);
    expect(readout.dpdSubmitted).toBe(false);
  });
});
