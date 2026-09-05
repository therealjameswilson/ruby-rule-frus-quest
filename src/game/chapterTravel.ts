import { READING_PASSAGE } from "./secretReadingRoom";

export interface ChapterTravelData {
  chapterFrom: string;
  chapterTo: string;
}

const CHAPTER_DOORWAYS = [
  { from: "A1", to: "O1", scene: "OfficeScene", x: 128, y: 196 },
  { from: "O1", to: "A1", scene: "ArchiveScene", x: 30, y: 120 },
  { from: "N1", to: "A1", scene: "ArchiveScene", x: 226, y: 120 },
  { from: "A1", to: "N1", scene: "NetworkScene", x: 30, y: 124 },
  { from: "R1", to: "N2", scene: "NetworkScene", x: 226, y: 124 },
  { from: "N2", to: "R1", scene: "ReferralVaultScene", x: 30, y: 124 },
  { from: "E1", to: "R2", scene: "ReferralVaultScene", x: 226, y: 124 },
  { from: "R2", to: "E1", scene: "SilentReadScene", x: 30, y: 124 },
  { from: "DN1", to: "DN2", scene: "HiddenReadingRoomScene", x: 128, y: 208 },
  { from: "DN2", to: "DN1", scene: "NaraStacksScene", ...READING_PASSAGE.returnSpawn }
] as const;

// Only authored door pairs can supply an arrival. Continue keeps its exact saved spawn.
export function readChapterArrival(data: unknown, scene: string, currentScene?: string) {
  if (currentScene === scene) return null;
  if (!data || typeof data !== "object" || !("chapterFrom" in data) || !("chapterTo" in data)) return null;
  return CHAPTER_DOORWAYS.find((door) => door.scene === scene
    && door.from === data.chapterFrom && door.to === data.chapterTo) ?? null;
}
