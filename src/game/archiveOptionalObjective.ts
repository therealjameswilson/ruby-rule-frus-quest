import { hasArchiveSecret } from "./archiveSecrets";

export function archiveOptionalObjective(roomId: string, progress: Record<string, number>): string | null {
  switch (roomId) {
    case "B1":
      return progress["archiveWall_pending-manifest"] === 1 && progress["archiveWall_wait-timer"] === 1
        ? "SOUTH: CRACK" : "TRAY: FILE SLIP";
    case "C1":
      return hasArchiveSecret(progress, "D2", "revealed") ? "WELL: SOUTH/EAST" : "STAMP THE CRACK";
    case "D1":
      return hasArchiveSecret(progress, "D2", "revealed") ? "EAST: WELL" : "NORTH: CRACK";
    case "D2":
      return hasArchiveSecret(progress, "D2", "collected") ? "WEST: RETURN" : "TAKE WELL REWARD";
    case "C3":
      return hasArchiveSecret(progress, "C3", "collected") ? "NORTH: RETURN" : "TAKE FRAGMENT";
    default:
      return null;
  }
}
