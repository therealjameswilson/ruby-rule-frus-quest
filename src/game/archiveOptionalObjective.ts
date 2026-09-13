import { hasArchiveSecret } from "./archiveSecrets";

export function archiveOptionalObjective(roomId: string, progress: Record<string, number>): string | null {
  switch (roomId) {
    case "A3":
      if (hasArchiveSecret(progress, "C3", "collected")) return "SOUTH: RETURN";
      if (hasArchiveSecret(progress, "C3", "revealed")) return "CACHE: 2 SOUTH";
      return progress.archiveCacheClueHeard === 1 ? "CHECK LEFT SHELF" : "ASK ARCHIVIST";
    case "B3":
      if (hasArchiveSecret(progress, "C3", "collected")) return "WEST: RETURN";
      return hasArchiveSecret(progress, "C3", "revealed") ? "SOUTH: CACHE" : "NORTH: ARCHIVIST";
    case "B1":
      if (hasArchiveSecret(progress, "D2", "collected")) return "NORTH: RETURN";
      return progress["archiveWall_pending-manifest"] === 1 && progress["archiveWall_wait-timer"] === 1
        ? "SOUTH: CRACK" : "TRAY: FILE SLIP";
    case "B2":
      if (progress["archiveWall_ambiguous-flag"] !== 1) {
        return progress.archiveAmbiguousSplit === 1 ? "ASK SPECIALIST" : "EXAMINE FLAG";
      }
      return progress["archiveWall_danne-queue"] === 1 ? "EAST: HINT ROOM" : "SOUTH: RECORD IT";
    case "C1":
      if (hasArchiveSecret(progress, "D2", "collected")) return "NORTH: RETURN";
      return hasArchiveSecret(progress, "D2", "revealed") ? "WELL: SOUTH/EAST" : "STAMP THE CRACK";
    case "D1":
      if (hasArchiveSecret(progress, "D2", "collected")) return "NORTH: RETURN";
      return hasArchiveSecret(progress, "D2", "revealed") ? "EAST: WELL" : "NORTH: CRACK";
    case "D2":
      return hasArchiveSecret(progress, "D2", "collected") ? "WEST: RETURN" : "TAKE WELL REWARD";
    case "C3":
      return hasArchiveSecret(progress, "C3", "collected") ? "NORTH: RETURN" : "TAKE FRAGMENT";
    default:
      return null;
  }
}
