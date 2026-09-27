import manifest from '../../public/assets/research-world/active-compilation.json';

export const ACTIVE_COMPILATION = manifest.dossiers;
export const activeDossier = (library: string) => ACTIVE_COMPILATION.find(d => d.library === library);
// New content has independent receipts; an old Iran-Contra packet must not
// silently become evidence for a Western Europe assignment.
export const libraryProgressKey = (id: string) => activeDossier(id) ? `libraryResearch_v2_${id}` : `libraryResearch_${id}`;
export const nscProgressKey = (id: string) => activeDossier(id) ? `nscResearch_v2_${id}` : `nscResearch_${id}`;
export const nscGuideReadKey = (id: string, room: number) => `${activeDossier(id) ? "nscGuideRead_v2" : "nscGuideRead"}_${id}_${room}`;
// Keep the readout shape for older QA clients, but ignore retired assignment flags.
export function activeCompilationReadout(progress: Readonly<Record<string, number>>) {
  return { assigned: null, title: null, statusChecked: manifest.checked,
    researchReady: true, packets: ACTIVE_COMPILATION.map(a => ({
      library: a.library, volumeId: a.volumeId, stage: progress[libraryProgressKey(a.library)] ?? 0,
      receipts: a.questions.filter((_, i) => i < (progress[libraryProgressKey(a.library)] ?? 0)).map(q => q.receipt)
    })) };
}
