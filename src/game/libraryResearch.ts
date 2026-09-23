import manifest from '../../public/assets/research-world/library-assignments.json';
export const LIBRARY_ASSIGNMENTS = manifest.assignments;
export const LIBRARY_STATUS_SOURCE = manifest.statusSource;
export const LIBRARY_STATUS_CHECKED = manifest.checked;
export function libraryAssignment(id: string) { return LIBRARY_ASSIGNMENTS.find(a => a.library === id); }
export function libraryStage(progress: Record<string, number>, id: string) {
  const value = progress[`libraryResearch_${id}`];
  return Number.isFinite(value) ? Math.max(0, Math.min(4, Math.floor(value))) : 0;
}
export function fileLibraryStage(progress: Record<string, number>, id: string, station: number, correct: boolean) {
  const current = libraryStage(progress, id);
  if (!libraryAssignment(id) || !correct || station !== current || current >= 4) return false;
  progress[`libraryResearch_${id}`] = current + 1;
  return true;
}
export function libraryResearchReadout(progress: Record<string, number>) {
  return LIBRARY_ASSIGNMENTS.map(a => ({ library:a.library, volume:a.title, status:a.status, backgroundOnly:a.backgroundOnly, completed:libraryStage(progress,a.library), total:4 }));
}
