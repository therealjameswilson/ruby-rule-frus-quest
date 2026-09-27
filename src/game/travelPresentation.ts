import { LIBRARY_ASSIGNMENTS } from './libraryResearch';
import { RESEARCH_LANDMARKS, RESEARCH_ZONES, researchZone } from './researchWorld';

/** Destination copy describes the work, never assigns a particular FRUS volume. */
export function travelPresentation(target: string, progress: Record<string, number>) {
  const libraryId = LIBRARY_ASSIGNMENTS[progress.libraryResearchActive]?.library ?? 'reagan';
  const library = RESEARCH_LANDMARKS.find(place => place.id === libraryId);
  if (target === 'PresidentialLibraryScene') return {
    title: library?.label ?? 'RESEARCH LIBRARY', caption: 'FIND · COMPARE · DOCUMENT'
  };
  if (target === 'NscLibraryScene') return {
    title: `${library?.label ?? 'LIBRARY'}\nNSC RESEARCH`, caption: 'TRACE SOURCES · CHECK ACCESS'
  };
  if (target === 'ResearchWorldScene') return {
    title: RESEARCH_ZONES[researchZone(progress.researchWorldZone)].name, caption: 'EXPLORE THE ARCHIVES'
  };
  const destinations: Record<string, [string, string]> = {
    OfficeScene: ['OFFICE OF THE HISTORIAN', 'PLAN YOUR RESEARCH'],
    ArchiveScene: ['ARCHIVE CAVERN', 'EVIDENCE INTO MANUSCRIPT'],
    NetworkScene: ['TWO NETWORKS', 'PREPARE THE REVIEW COPY'],
    ReferralVaultScene: ['REFERRAL VAULT', 'TRACK CLEARANCE DECISIONS'],
    SilentReadScene: ['SILENT READ TOWER', 'CHECK EVERY LINE'],
    BlackVaultLairScene: ['BLACK VAULT LAIR', 'DEFEND THE DOCUMENTARY RECORD'],
    TrueEndingScene: ['THE FINISHED VOLUME', 'A RECORD FOR THE PUBLIC']
  };
  const [title, caption] = destinations[target] ?? [target.replace(/Scene$/, '').replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase(), 'THE FRUS QUEST'];
  return { title, caption };
}
