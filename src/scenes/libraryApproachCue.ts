import { LIBRARY_ASSIGNMENTS, libraryStage } from '../game/libraryResearch';
import { nscStage } from '../game/nscResearch';

/** Directions describe available research actions, never the equipped combat tool. */
export function libraryApproachCue(scene: string | null, mode: string, nearest: string | null,
  progress: Record<string, number>, primaryBadge: string) {
  if (mode !== 'explore' || (scene !== 'NscLibraryScene' && scene !== 'PresidentialLibraryScene')) return null;
  const library = LIBRARY_ASSIGNMENTS[progress.libraryResearchActive]?.library ?? 'reagan';
  const action = (text: string) => ({text, badge: primaryBadge});
  const direction = (text: string) => ({text, badge: '!'});
  if (scene === 'NscLibraryScene') {
    const stage = nscStage(progress, library);
    const room = Math.max(0, Math.min(2, stage, Math.floor(progress[`nscRoom_${library}`] || 0)));
    const filed = stage > room;
    if (nearest === 'Holding guide') return action('READ HOLDING GUIDE');
    if (nearest === 'Source check') return action(filed ? 'CHECK SAVED FILE' : 'VERIFY SOURCE');
    if (nearest === 'North door' && filed) return action(room === 2 ? 'RETURN TO LIBRARY' : 'ENTER NEXT ROOM');
    if (filed) return direction(room === 2 ? 'NORTH: LIBRARY LOBBY' : 'NORTH: NEXT ROOM');
    if (nearest === 'North door' || progress[`nscGuideRead_${library}_${room}`]) return direction('EAST: VERIFY SOURCE');
    return direction('WEST: READ THE GUIDE');
  }
  if (nearest === 'NSC research wing') return action('ENTER NSC WING');
  const actions: Record<string, string> = {
    'FINDING AID': 'READ FINDING AID', 'COMPARE RECORDS': 'COMPARE RECORDS',
    'SOURCE NOTE': 'WRITE SOURCE NOTE', 'FILE PACKET': 'FILE RESEARCH PACKET'
  };
  if (nearest && actions[nearest]) return action(actions[nearest]);
  return direction(['NW: FINDING AID', 'NE: COMPARE RECORDS', 'SE: SOURCE NOTE', 'SW: FILE PACKET', 'SOUTH: RETURN OUTSIDE'][libraryStage(progress, library)]);
}
