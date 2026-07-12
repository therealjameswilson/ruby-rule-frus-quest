export type ArchiveSourceRoomDocumentId = "source-note" | "telegram" | "cross-reference";

export interface ArchiveSourceRoomDocumentDefinition {
  id: ArchiveSourceRoomDocumentId;
  label: string;
  x: number;
  y: number;
  progressKey: string;
  supporting: boolean;
}

export const ARCHIVE_SOURCE_ROOM_DOCUMENTS: readonly ArchiveSourceRoomDocumentDefinition[] = [
  {
    id: "source-note",
    label: "Source Note 47",
    x: 128,
    y: 164,
    progressKey: "archiveSourceNoteCollected",
    supporting: false
  },
  {
    id: "telegram",
    label: "Telegram",
    x: 68,
    y: 124,
    progressKey: "archiveTelegramCollected",
    supporting: true
  },
  {
    id: "cross-reference",
    label: "Cross-Ref",
    x: 188,
    y: 124,
    progressKey: "archiveCrossReferenceCollected",
    supporting: true
  }
] as const;

export function visibleArchiveSourceRoomDocuments(annotationComplete: boolean) {
  return ARCHIVE_SOURCE_ROOM_DOCUMENTS.filter((document) => !document.supporting || annotationComplete);
}

export function restoredArchiveSourceRoomDocumentIds(sceneProgress: Readonly<Record<string, number>>) {
  return ARCHIVE_SOURCE_ROOM_DOCUMENTS
    .filter((document) => sceneProgress[document.progressKey] === 1)
    .map((document) => document.id);
}

export function archiveSourceRoomDocumentProgressKey(documentId: string) {
  return ARCHIVE_SOURCE_ROOM_DOCUMENTS.find((document) => document.id === documentId)?.progressKey ?? null;
}

export function archiveSourceRoomPacketComplete(input: {
  sourceNoteStamped: boolean;
  annotationComplete: boolean;
  collectedDocumentIds: ReadonlySet<string>;
}) {
  return input.sourceNoteStamped
    && input.annotationComplete
    && ARCHIVE_SOURCE_ROOM_DOCUMENTS.every((document) => input.collectedDocumentIds.has(document.id));
}
