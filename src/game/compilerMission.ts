import type { ChoiceOption } from "./types";

export const COMPILER_SOP_SOURCE = "FRUS Compiling and Review Process (August 2026), user-supplied SOP";
export type CompilerCheckpoint = "research_plan" | "review_submission";
export type CompilerPhase = "Planning" | "Research" | "Compilation" | "Review and revision" | "DPD submission";

interface CompilerTask {
  id: string;
  phase: CompilerPhase;
  checkpoint: CompilerCheckpoint;
  objective: string;
  question: string;
  context: string;
  options: readonly ChoiceOption[];
  correct: string;
  success: string;
  hint: string;
}

// Fictional manuscript decisions illustrate the SOP; no operational contacts,
// restricted system addresses, or classified source material are shipped.
export const COMPILER_TASKS = [
  {
    id: "plan", phase: "Planning", checkpoint: "research_plan", objective: "ROUTE THE VOLUME PLAN",
    question: "The working group has a subseries plan. Route it.",
    context: "It identifies topics, overlaps, and possible declassification issues.",
    options: [
      { key: "A", label: "Publish the plan immediately", value: "publish" },
      { key: "B", label: "GE, then Director; then HAC feedback", value: "route" }
    ], correct: "route",
    success: "Internal approvals and HAC feedback recorded. The General Editor assigns your volume; you are its compiler.",
    hint: "The General Editor and OH Director approve internally before the plan goes to the HAC for feedback."
  },
  {
    id: "research", phase: "Research", checkpoint: "research_plan", objective: "GET RESEARCH APPROVAL",
    question: "Prepare your research plan before the archive run.",
    context: "Identify decisions, policymakers, collections, and overlap with other compilers.",
    options: [
      { key: "A", label: "Read, map sources, coordinate; supervisor approves", value: "approve" },
      { key: "B", label: "Use only the easiest public folder", value: "easy" }
    ], correct: "approve",
    success: "Research plan approved. Investigate State, presidential/NSC, and relevant agency records; retain source references and identify access gaps. Access is not permission to publish.",
    hint: "Read the literature, identify the source base, coordinate overlap, and obtain first-line supervisory approval."
  },
  {
    id: "selection", phase: "Compilation", checkpoint: "review_submission", objective: "SELECT POLICY RECORDS",
    question: "Your draft has 1,100 document pages. What do you add?",
    context: "220 pages: key decision. 180: routine detail. The 1,400-page cap excludes annotation sheets.",
    options: [
      { key: "A", label: "Both packets: 1,500 document pages", value: "both" },
      { key: "B", label: "Decision packet: 1,320; cite useful backup", value: "decision" }
    ], correct: "decision",
    success: "Illustrative selection: 1,320 document pages. Keep policymaking, relevant topics and agencies, including evidence of policy defects. Annotation can identify additional relevant records.",
    hint: "The limit is 1,400 document pages, not annotation sheets. Select for policymaking and substantive coverage, not convenience."
  },
  {
    id: "backup", phase: "Compilation", checkpoint: "review_submission", objective: "ASSEMBLE CHAPTER BACKUP",
    question: "Assemble the chapter manuscript for your supervisor.",
    context: "Documents, annotation sheets, and evidence for quotations must travel together.",
    options: [
      { key: "A", label: "Chronology, chapter annotations, numbered backup", value: "packet" },
      { key: "B", label: "Loose documents; discard quotation backup", value: "loose" }
    ], correct: "packet",
    success: "Chapter packet assembled in chronology. One annotation file per chapter; backup ordered by footnote with quoted passages highlighted. Develop names, terms, and sources lists alongside annotation.",
    hint: "Submit organized documents and backup with the chapter annotation file, not isolated document files."
  },
  {
    id: "first_review", phase: "Review and revision", checkpoint: "review_submission", objective: "SUBMIT FIRST REVIEW",
    question: "The supervisor reviews your completed chapters.",
    context: "Check style, accuracy, substance, and gaps. Track changes in a separate review copy.",
    options: [
      { key: "A", label: "Revise immediately after each first review", value: "early" },
      { key: "B", label: "Keep comments; finish first review of the volume", value: "retain" }
    ], correct: "retain",
    success: "First review recorded. Keep the original and clearly identified review copy. Discuss the feedback; do not revise yet.",
    hint: "The SOP explicitly defers compiler revision until after second review."
  },
  {
    id: "second_review", phase: "Review and revision", checkpoint: "review_submission", objective: "SUBMIT SECOND REVIEW",
    question: "First review of the entire volume is complete. Route it.",
    context: "The second reviewer assesses the whole volume and its place in the subseries.",
    options: [
      { key: "A", label: "GE or AGE, using the same review copy", value: "second" },
      { key: "B", label: "DANN-E auto-approves it for publication", value: "skip" }
    ], correct: "second",
    success: "GE/AGE second review recorded in the supervisor's review copy: substantive cohesion, subseries fit, and remaining style issues.",
    hint: "Second review is volume-level, by the General Editor or Assistant General Editor, after first review of the whole volume."
  },
  {
    id: "revision", phase: "Review and revision", checkpoint: "review_submission", objective: "REVISE BOTH REVIEWS",
    question: "Both reviews are back. Resolve the manuscript changes.",
    context: "Reviewers found a coverage gap and an unsupported quotation.",
    options: [
      { key: "A", label: "Hide the gap and accept every change blindly", value: "hide" },
      { key: "B", label: "Research gap, check quote, revise annotation", value: "revise" }
    ], correct: "revise",
    success: "Both reviews addressed through additional research, document selection, and corrected annotation. Revisions are generally completed within six weeks; the game compresses that work.",
    hint: "Revision responds to both reviews, with additional research or document changes where needed. No unmarked alterations."
  },
  {
    id: "front_matter", phase: "DPD submission", checkpoint: "review_submission", objective: "CLEAR FRONT MATTER",
    question: "Send the volume's front matter to the General Editor.",
    context: "Chapter titles, names, terms, preface, sources, plus chapter-level release materials.",
    options: [
      { key: "A", label: "Obtain GE review/clearance and revise", value: "clear" },
      { key: "B", label: "Leave lists and release materials unfinished", value: "unfinished" }
    ], correct: "clear",
    success: "GE-cleared front matter prepared, including chapter-level social media posts, press release, and Department notice. These drafts are not a public release.",
    hint: "Front matter requires General Editor review/clearance and compiler revision before submission."
  },
  {
    id: "joint_historian", phase: "DPD submission", checkpoint: "review_submission", objective: "CHECK CIA PROVENANCE",
    question: "The packet includes CIA-equity records and annotations.",
    context: "Check provenance and terminology before the DPD handoff.",
    options: [
      { key: "A", label: "Treat compiler access as release authority", value: "access" },
      { key: "B", label: "Joint Historian review; revise as recommended", value: "joint" }
    ], correct: "joint",
    success: "Joint Historian recommendations addressed. This provenance/terminology review does not replace subsequent agency declassification review.",
    hint: "The Joint Historian reviews CIA-equity documents and annotations for correct provenance and terminology."
  },
  {
    id: "submission", phase: "DPD submission", checkpoint: "review_submission", objective: "HAND OFF TO DPD",
    question: "Certify the submission packet, not publication.",
    context: "Pair documents and annotation sheets; account for backup and front matter.",
    options: [
      { key: "A", label: "Signed checklist; supervisor notifies DPD leads", value: "handoff" },
      { key: "B", label: "Bind immediately without declassification", value: "bind" }
    ], correct: "handoff",
    success: "DPD submission ready. The supervisor notifies declassification and editing leads; the compiler answers follow-up queries. Next: declassification coordination, editing, proof, and publication.",
    hint: "Complete the checklist with all signatures. DPD handoff starts the next production stage; it does not certify public release."
  }
] as const satisfies readonly CompilerTask[];

export type CompilerTaskId = typeof COMPILER_TASKS[number]["id"];
const taskFlag = (id: CompilerTaskId) => `compilerSop_${id}`;

export function nextCompilerTask(progress: Readonly<Record<string, number>>, checkpoint?: CompilerCheckpoint) {
  // Enforce global order, even when a caller requests a later checkpoint.
  const next = COMPILER_TASKS.find(task => progress[taskFlag(task.id)] !== 1);
  return next && (!checkpoint || next.checkpoint === checkpoint) ? next : null;
}

export function compilerCheckpointComplete(progress: Readonly<Record<string, number>>, checkpoint: CompilerCheckpoint) {
  return COMPILER_TASKS.filter(task => task.checkpoint === checkpoint).every(task => progress[taskFlag(task.id)] === 1);
}

export function submitCompilerTask(progress: Record<string, number>, id: CompilerTaskId, answer?: string) {
  const task = COMPILER_TASKS.find(candidate => candidate.id === id)!;
  if (nextCompilerTask(progress)?.id !== id) return { ok: false, message: "Complete the preceding compiler task first." };
  if (answer !== task.correct) return { ok: false, message: task.hint };
  progress[taskFlag(id)] = 1;
  if (id === "selection") progress.compilerSopDocumentPages = 1320;
  return { ok: true, message: task.success };
}

export function getCompilerMissionReadout(progress: Readonly<Record<string, number>>) {
  const next = nextCompilerTask(progress);
  return {
    source: COMPILER_SOP_SOURCE,
    enabled: progress.compilerSopVersion === 1,
    completed: COMPILER_TASKS.filter(task => progress[taskFlag(task.id)] === 1).length,
    total: COMPILER_TASKS.length,
    phase: next?.phase ?? "DPD handoff complete",
    nextTask: next?.objective ?? "Declassification, editing, and publication remain",
    documentPages: progress.compilerSopDocumentPages ?? 0,
    documentPageLimit: 1400,
    annotationSheetsCountTowardLimit: false,
    dpdSubmitted: compilerCheckpointComplete(progress, "review_submission"),
    tasks: COMPILER_TASKS.map(task => ({ id: task.id, phase: task.phase, objective: task.objective, complete: progress[taskFlag(task.id)] === 1 }))
  };
}
