import { getAnnotationDraftingStation } from "./annotationDrafting";
import { getSourceNoteProvenanceStation } from "./sourceNoteProvenance";
import { annotationPacketObjective, readAnnotationPacket } from "./annotationPacket";
import type { ProcessItemId } from "./constants";

export type SourceNoteStatus = "inactive" | "carried" | "routed" | "verified" | "stamped";

type SwingBounds = { x: number; y: number; width: number; height: number };

export function archiveRepoWallSwing(input: {
  sourceNoteStatus: SourceNoteStatus;
  hasCitationStamp: boolean;
  tool: ProcessItemId | null;
  hitbox: SwingBounds | null;
  wallBounds: SwingBounds;
}): "miss" | "review-required" | "stamp-required" | "clear" {
  const { hitbox: hit, wallBounds: wall } = input;
  if (!hit || hit.x + hit.width < wall.x || hit.x > wall.x + wall.width
    || hit.y + hit.height < wall.y || hit.y > wall.y + wall.height) return "miss";
  if (input.sourceNoteStatus !== "stamped") return "review-required";
  if (!input.hasCitationStamp || input.tool !== "citation_stamp") return "stamp-required";
  return "clear";
}

export function restoredArchiveRepoWallCleared(progress: Readonly<Record<string, number>>) {
  // Annotation notes were only reachable after stamping NO REPO in older saves.
  return progress.archiveRepoWallCleared === 1 || progress.annotationDraftingComplete === 1
    || readAnnotationPacket(progress).gathered.length > 0;
}

export function restoredArchiveSourceNoteStatus(input: {
  sceneProgress: Readonly<Record<string, number>>;
  heldItem: string | null;
  hasArchiveStamp: boolean;
  sourceNoteCollected: boolean;
}): SourceNoteStatus {
  const progress = input.sceneProgress;
  if (progress.annotationDraftingComplete || progress.archiveSourceNoteStamped || input.hasArchiveStamp) return "stamped";
  if (progress.sourceNoteProvenanceComplete) return "verified";
  if (progress.archiveSourceNoteRouted || (progress.sourceNoteProvenanceStep ?? 0) > 0) return "routed";
  // Older saves did not record routing before the first ledger. Recover the
  // note in hand so the table can restart that step without losing the item.
  if (input.heldItem === "Source Note 47" || input.sourceNoteCollected) return "carried";
  return "inactive";
}

export function archiveSourceRoomObjective(input: {
  sourceNoteStatus: SourceNoteStatus;
  provenanceStep: number;
  wallNeedsStamp: boolean;
  annotationStep: number;
  annotationCarried: boolean;
  annotationComplete: boolean;
  annotationProgress?: Readonly<Record<string, number>>;
  collectedDocumentIds: ReadonlySet<string>;
  complete: boolean;
}) {
  if (input.complete) return "EXIT EAST - NETWORK";
  if (input.sourceNoteStatus === "inactive") return "PICK UP SOURCE NOTE";
  if (input.sourceNoteStatus === "carried") return "NOTE TO TABLE";
  if (input.sourceNoteStatus === "routed") {
    return `CHECK ${getSourceNoteProvenanceStation(input.provenanceStep).shortLabel}`;
  }
  if (input.sourceNoteStatus === "verified") return "STAMP AT TABLE";
  if (input.wallNeedsStamp) return "STAMP REPO WALL";
  if (!input.annotationComplete) {
    if (input.annotationProgress) return annotationPacketObjective(input.annotationProgress);
    if (input.annotationCarried) return "FILE NOTE AT TABLE";
    return `TAKE ${getAnnotationDraftingStation(input.annotationStep).shortLabel}`;
  }
  if (!input.collectedDocumentIds.has("telegram")) return "PICK UP TELEGRAM";
  if (!input.collectedDocumentIds.has("cross-reference")) return "PICK UP CROSS-REF";
  return "EXIT EAST - NETWORK";
}

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
