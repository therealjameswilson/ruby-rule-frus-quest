import manifest from '../../public/assets/research-world/nsc-holdings.json';
export const NSC_DUNGEONS = manifest.dungeons;
export const nscDungeon = (id: string) => NSC_DUNGEONS.find(d => d.library === id);
export function nscStage(progress: Record<string, number>, id: string) {
  const value = progress[`nscResearch_${id}`];
  return Number.isFinite(value) ? Math.max(0, Math.min(3, Math.floor(value))) : 0;
}
export function fileNscStage(progress: Record<string, number>, id: string, room: number, correct: boolean) {
  if (!nscDungeon(id) || !correct || nscStage(progress,id) !== room || room < 0 || room >= 3) return false;
  progress[`nscResearch_${id}`] = room + 1;
  return true;
}
export function nscQuestion(id: string, room: number) {
  const d=nscDungeon(id)!;
  if(room===0)return {question:`Which collection belongs on this request?`,correct:d.collection,wrong:'DANN-E’s Unsorted Presidential Papers (all administrations)'};
  if(room===1)return d.challenge;
  return {question:'What does your completed NSC source trail establish?',correct:'A cited research lead with access limits, ready for human review.',wrong:'A retrieved and fully cleared document ready for publication.'};
}
