import { CHAPTER_RELEASE_PROMPTS } from "./chapterReleaseStatus";
import { DIGITAL_RELEASE_PROMPTS } from "./digitalRelease";
import { FRONT_MATTER_ASSEMBLY_PROMPTS } from "./frontMatterAssembly";
import { GPO_PUBLICATION_PROMPTS } from "./gpoPublication";
import { GPO_SEGMENT_ASSEMBLY_PROMPTS } from "./gpoSegmentAssembly";
import { INDEX_DOCKET_PROMPTS } from "./indexDocket";
import { KELLOGG_CERTIFICATION_PROMPTS } from "./kelloggCertification";
import { PUBLIC_CITATION_CARD_PROMPTS } from "./publicCitationCard";
import { PUBLICATION_FUNDING_PROMPTS } from "./publicationFundingQueue";
import { READER_AID_REGISTER_PROMPTS } from "./readerAidRegisters";
import { RELEASE_CALENDAR_PROMPTS } from "./releaseCalendar";
import { TYPESETTER_CORRECTIONS_PROMPTS } from "./typesetterCorrections";

export type BuckramBindingStatus = "waiting" | "carried" | "routed" | "sealed";
export type BuckramBindingStationId =
  | "front-matter-bench"
  | "index-desk"
  | "kellogg-press"
  | "gpo-handoff"
  | "public-release-terminal";

export interface BuckramBindingPacket {
  id: string;
  label: string;
  shortLabel: string;
  station: BuckramBindingStationId;
  texture: string;
  accent: string;
  checkIds: readonly string[];
}

const promptIds = (prompts: ReadonlyArray<{ id: string }>) => prompts.map((prompt) => prompt.id);

export const BUCKRAM_BINDING_PACKETS = [
  {
    id: "front-matter-packet",
    label: "Front Matter and Reader-Aid Packet",
    shortLabel: "FRONT PACKET",
    station: "front-matter-bench",
    texture: "source-note",
    accent: "#D6A23A",
    checkIds: [
      ...promptIds(FRONT_MATTER_ASSEMBLY_PROMPTS),
      ...promptIds(READER_AID_REGISTER_PROMPTS)
    ]
  },
  {
    id: "index-proof-docket",
    label: "Index and Typesetter Correction Docket",
    shortLabel: "INDEX DOCKET",
    station: "index-desk",
    texture: "proof-page",
    accent: "#68C0C0",
    checkIds: [
      ...promptIds(INDEX_DOCKET_PROMPTS),
      ...promptIds(TYPESETTER_CORRECTIONS_PROMPTS)
    ]
  },
  {
    id: "kellogg-certification",
    label: "Kellogg Standards Certification",
    shortLabel: "KELLOGG SEAL",
    station: "kellogg-press",
    texture: "citation-stamp",
    accent: "#B82030",
    checkIds: promptIds(KELLOGG_CERTIFICATION_PROMPTS)
  },
  {
    id: "gpo-binding-packet",
    label: "GPO Binding and Funding Packet",
    shortLabel: "GPO PACKET",
    station: "gpo-handoff",
    texture: "review-folder",
    accent: "#D6A23A",
    checkIds: [
      ...promptIds(GPO_SEGMENT_ASSEMBLY_PROMPTS),
      ...promptIds(GPO_PUBLICATION_PROMPTS),
      ...promptIds(PUBLICATION_FUNDING_PROMPTS)
    ]
  },
  {
    id: "public-release-packet",
    label: "Public Release and Citation Packet",
    shortLabel: "PUBLIC PACKET",
    station: "public-release-terminal",
    texture: "cross-reference",
    accent: "#68C0C0",
    checkIds: [
      ...promptIds(CHAPTER_RELEASE_PROMPTS),
      ...promptIds(DIGITAL_RELEASE_PROMPTS),
      ...promptIds(PUBLIC_CITATION_CARD_PROMPTS),
      ...promptIds(RELEASE_CALENDAR_PROMPTS)
    ]
  }
] as const satisfies readonly BuckramBindingPacket[];

export const BUCKRAM_BINDING_TOTAL = BUCKRAM_BINDING_PACKETS.length;
export const BUCKRAM_BINDING_CHECK_TOTAL = BUCKRAM_BINDING_PACKETS.reduce(
  (total, packet) => total + packet.checkIds.length,
  0
);

export interface BuckramBindingRouteResult {
  ok: boolean;
  packet: BuckramBindingPacket;
  reason?: string;
}

export function routeBuckramBindingPacket(
  step: number,
  packetId: string,
  stationId: BuckramBindingStationId
): BuckramBindingRouteResult {
  const packet = BUCKRAM_BINDING_PACKETS[Math.max(0, Math.min(BUCKRAM_BINDING_TOTAL - 1, step))];
  if (packet.id !== packetId) {
    return { ok: false, packet, reason: `${packet.label} must be filed before ${packetId}.` };
  }
  if (packet.station !== stationId) {
    return { ok: false, packet, reason: `${packet.shortLabel} belongs at ${packet.station}.` };
  }
  return { ok: true, packet };
}

export function buckramBindingStatusCode(status: BuckramBindingStatus) {
  if (status === "carried") return 1;
  if (status === "routed") return 2;
  return 0;
}

export function buckramBindingStatusFromCode(code: number): BuckramBindingStatus {
  if (code === 1) return "carried";
  if (code === 2) return "routed";
  return "waiting";
}

export function deriveBuckramBindingStep(sceneProgress: Readonly<Record<string, number>>) {
  const explicit = sceneProgress.buckramBindingStep;
  if (Number.isFinite(explicit)) {
    return Math.max(0, Math.min(BUCKRAM_BINDING_TOTAL, Math.floor(explicit)));
  }

  let step = 0;
  if (sceneProgress.frontMatterAssemblyComplete && sceneProgress.readerAidRegistersComplete) step = 1;
  if (step === 1 && sceneProgress.indexDocketComplete && sceneProgress.typesetterCorrectionsComplete) step = 2;
  if (step === 2 && sceneProgress.kelloggFinalCertificationComplete) step = 3;
  if (
    step === 3
    && sceneProgress.gpoSegmentAssemblyComplete
    && sceneProgress.gpoPublicationComplete
    && sceneProgress.publicationFundingComplete
  ) step = 4;
  if (
    step === 4
    && sceneProgress.chapterReleaseComplete
    && sceneProgress.digitalReleaseComplete
    && sceneProgress.publicCitationComplete
    && sceneProgress.releaseCalendarComplete
  ) step = BUCKRAM_BINDING_TOTAL;
  return step;
}

export function getBuckramBindingReadout(sceneProgress: Readonly<Record<string, number>>) {
  const step = deriveBuckramBindingStep(sceneProgress);
  const status = step < BUCKRAM_BINDING_TOTAL
    ? buckramBindingStatusFromCode(sceneProgress.buckramBindingStatus ?? 0)
    : "sealed";
  const activePacket = step < BUCKRAM_BINDING_TOTAL ? BUCKRAM_BINDING_PACKETS[step] : null;
  return {
    step,
    completed: step,
    total: BUCKRAM_BINDING_TOTAL,
    checks: BUCKRAM_BINDING_CHECK_TOTAL,
    status,
    activePacketId: activePacket?.id ?? null,
    activePacketLabel: activePacket?.shortLabel ?? null,
    complete: step >= BUCKRAM_BINDING_TOTAL
  };
}
