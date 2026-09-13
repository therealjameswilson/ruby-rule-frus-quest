import { ANNOTATION_DRAFTING_STATIONS, type AnnotationDraftingPromptId } from "./annotationDrafting";

const ALL_NOTES = (1 << ANNOTATION_DRAFTING_STATIONS.length) - 1;
type Progress = Readonly<Record<string, number>>;

function boundedInteger(value: number | undefined, max: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(max, Math.floor(value))) : 0;
}

export function readAnnotationPacket(progress: Progress) {
  const complete = progress.annotationDraftingComplete === 1;
  const filedCount = complete ? 3 : boundedInteger(progress.annotationDraftingStep, 3);
  const filedMask = (1 << filedCount) - 1;
  const legacyCarried = boundedInteger(progress.annotationDraftingCarried, 3);
  // Old saves filed a prefix of the notes and carried at most one. Preserve both.
  const gatheredMask = complete ? ALL_NOTES : boundedInteger(progress.annotationGatheredMask, ALL_NOTES)
    | filedMask | (legacyCarried ? 1 << (legacyCarried - 1) : 0);
  const gathered = ANNOTATION_DRAFTING_STATIONS.filter((station) => gatheredMask & (1 << (station.order - 1)));
  const held = gathered.filter((station) => !(filedMask & (1 << (station.order - 1))));
  const missing = ANNOTATION_DRAFTING_STATIONS.filter((station) => !(gatheredMask & (1 << (station.order - 1))));
  return { gatheredMask, filedCount, gathered, held, missing, complete, ready: missing.length === 0,
    heldLabel: held.length ? `Annotation packet ${gathered.length}/3` : null };
}

export function gatherAnnotationNote(progress: Progress, id: AnnotationDraftingPromptId) {
  const packet = readAnnotationPacket(progress);
  const station = ANNOTATION_DRAFTING_STATIONS.find((candidate) => candidate.id === id)!;
  const bit = 1 << (station.order - 1);
  const ok = !packet.complete && !(packet.gatheredMask & bit);
  return { ok, station, gatheredMask: packet.gatheredMask | bit,
    message: ok ? `${station.carriedLabel} added to the packet.` : `${station.carriedLabel} already collected.` };
}

export function fileAnnotationPacket(progress: Progress) {
  const packet = readAnnotationPacket(progress);
  return { ok: packet.ready && !packet.complete,
    message: packet.complete ? "Annotation packet already filed."
      : packet.ready ? "Source, context, and selection notes filed together."
        : `Find ${packet.missing.map((station) => station.shortLabel).join(" + ")} before filing.` };
}

export function annotationPacketObjective(progress: Progress) {
  const packet = readAnnotationPacket(progress);
  return packet.ready ? "FILE PACKET AT TABLE" : `NOTES ${packet.gathered.length}/3 - EXPLORE`;
}
