import manifest from '../../public/assets/research-world/active-compilation.json';

export const ACTIVE_COMPILATION = manifest.dossiers;
export const activeDossier = (library: string) => ACTIVE_COMPILATION.find(d => d.library === library);
export function assignedDossier(progress: Readonly<Record<string, number>>) {
  return ACTIVE_COMPILATION[progress.compilerVolumeAssignment - 1];
}
export function assignCompilerVolume(progress: Record<string, number>, library: string) {
  const index = ACTIVE_COMPILATION.findIndex(d => d.library === library);
  if (index < 0 || assignedDossier(progress)) return false;
  progress.compilerVolumeAssignment = index + 1;
  return true;
}
// New content has independent receipts; an old Iran-Contra packet must not
// silently become evidence for a Western Europe assignment.
export const libraryProgressKey = (id: string) => activeDossier(id) ? `libraryResearch_v2_${id}` : `libraryResearch_${id}`;
export const nscProgressKey = (id: string) => activeDossier(id) ? `nscResearch_v2_${id}` : `nscResearch_${id}`;
export const nscGuideReadKey = (id: string, room: number) => `${activeDossier(id) ? "nscGuideRead_v2" : "nscGuideRead"}_${id}_${room}`;
export function assignedResearchReady(progress: Readonly<Record<string, number>>) {
  const d = assignedDossier(progress);
  return !d || progress[libraryProgressKey(d.library)] === 4;
}
export function compilerDossierContext(progress: Readonly<Record<string, number>>, task: string): string[] {
  const d = assignedDossier(progress);
  if (!d) return [];
  const context: Record<string, string[]> = {
    plan: [d.title, 'Kathy’s assignment: agree the scope and coordinate neighboring volumes before chasing folders.'],
    research: [d.task, `${d.short}: ${d.handle}`, 'Map State and relevant agency evidence as well as presidential files. Ask your supervisor to approve the plan.'],
    selection: [d.title, 'Your filed library packet supplies leads and unresolved gaps. It does not establish unseen document contents.', 'DANN-E offers 180 pages of routine material. Keep the policy-decision packet and the coverage questions.'],
    backup: [d.handle, 'Keep this locator on the source sheet. Check the actual document before quoting; number the backup by footnote and highlight the cited passage.'],
    first_review: [d.short, 'Submit the chapter’s documents, annotation and backup to your supervisor. Retain the marked review copy; do not revise between reviews.'],
    second_review: [d.title, 'Send the whole first-reviewed volume, in the same review copy, to GE/AGE. DANN-E’s self-approval stamp goes in the wastebasket.'],
    revision: [d.comparison, 'Resolve both reviews: chase missing evidence, reconsider selection, and correct annotation. Record what remains unavailable.'],
    front_matter: [d.title, 'Check chapter titles, names, terms, preface and sources against the manuscript. Draft release materials go to the GE, not straight online.'],
    joint_historian: ['If the manuscript includes CIA equities, obtain Joint Historian review of provenance and terminology. No library receipt grants declassification authority.'],
    submission: [d.short, 'Pair documents and annotation sheets, include numbered backup and cleared front matter, and complete the signed checklist. Your supervisor notifies DPD leads.']
  };
  return context[task] ?? [];
}
export function activeCompilationReadout(progress: Readonly<Record<string, number>>) {
  const d = assignedDossier(progress);
  return { assigned: d?.volumeId ?? null, title: d?.title ?? null, statusChecked: manifest.checked,
    researchReady: assignedResearchReady(progress), packets: ACTIVE_COMPILATION.map(a => ({
      library: a.library, volumeId: a.volumeId, stage: progress[libraryProgressKey(a.library)] ?? 0,
      receipts: a.questions.filter((_, i) => i < (progress[libraryProgressKey(a.library)] ?? 0)).map(q => q.receipt)
    })) };
}
