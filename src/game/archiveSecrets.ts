export const ARCHIVE_SECRET_IDS = ["C3", "D2"] as const;
export type ArchiveSecretId = typeof ARCHIVE_SECRET_IDS[number];
type SecretMilestone = "revealed" | "collected";

export function hasArchiveSecret(progress: Record<string, number>, room: ArchiveSecretId, milestone: SecretMilestone) {
  return progress[`archiveSecret${room}_${milestone}`] === 1;
}

export function recordArchiveSecret(progress: Record<string, number>, room: ArchiveSecretId, milestone: SecretMilestone) {
  if (hasArchiveSecret(progress, room, milestone)) return false;
  progress[`archiveSecret${room}_${milestone}`] = 1;
  progress[`archiveSecret${room}_revealed`] = 1;
  return true;
}
