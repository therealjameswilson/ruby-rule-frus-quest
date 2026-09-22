import { describe, expect, it } from "vitest";
import en from "../data/i18n/en.json";
import es from "../data/i18n/es.json";
import fr from "../data/i18n/fr.json";
import { QUEST_BAND_LAYOUT } from "../scenes/questBandLayout";
import {
  BUCKRAM_BINDING_CHECK_TOTAL,
  BUCKRAM_BINDING_PACKETS,
  BUCKRAM_BINDING_TOTAL,
  canAssembleBindingPacket,
  buckramBindingStatusCode,
  buckramBindingObjective,
  buckramBindingDestination,
  buckramBindingStatusFromCode,
  deriveBuckramBindingStep,
  getBuckramBindingReadout,
  routeBuckramBindingPacket
} from "./buckramBinding";

describe("physical Buckram Gate binding", () => {
  const earned = { blackVaultBossCleared: 1, typesetterProofComplete: 1,
    typeflowOrderComplete: 1, typesettingPreparationComplete: 1 };

  it("assembles reviewed pages but never infers human certification", () => {
    expect(canAssembleBindingPacket("front-matter-packet", earned)).toBe(true);
    expect(canAssembleBindingPacket("index-proof-docket", earned)).toBe(true);
    expect(canAssembleBindingPacket("kellogg-certification", { ...earned, kelloggFinalCertificationComplete: 1 })).toBe(false);
    expect(canAssembleBindingPacket("unknown", earned)).toBe(false);
  });

  it("requires proofing and boss milestones and retains incomplete-save desks", () => {
    expect(canAssembleBindingPacket("front-matter-packet", {})).toBe(false);
    for (const key of Object.keys(earned)) {
      expect(canAssembleBindingPacket("index-proof-docket", { ...earned, [key]: 0 })).toBe(false);
    }
  });

  it("prepares the handoff only after the final human seal", () => {
    for (const id of ["gpo-binding-packet", "public-release-packet"]) {
      expect(canAssembleBindingPacket(id, earned)).toBe(false);
      expect(canAssembleBindingPacket(id, { ...earned, kelloggFinalCertificationComplete: 1 })).toBe(true);
    }
  });
  it("points waiting packets to the inbox and saved deliveries to their own station", () => {
    for (const [step, packet] of BUCKRAM_BINDING_PACKETS.entries()) {
      expect(buckramBindingDestination({ buckramBindingStep: step })).toBe("inbox");
      for (const status of [1, 2]) {
        const saved = { buckramBindingStep: step, buckramBindingStatus: status };
        expect(buckramBindingDestination(saved)).toBe(packet.station);
        expect(saved).toEqual({ buckramBindingStep: step, buckramBindingStatus: status });
      }
    }
    expect(buckramBindingDestination({ buckramBindingStep: 5 })).toBe("binding-press");
    expect(buckramBindingDestination({})).toBe("inbox");
  });

  it("has a fitting localized cue for every destination, including legacy saves", () => {
    const legacy = { frontMatterAssemblyComplete: 1, readerAidRegistersComplete: 1, buckramBindingStatus: 2 };
    expect(buckramBindingDestination(legacy)).toBe("index-desk");
    for (const locale of [en, es, fr]) {
      for (let step = 0; step <= BUCKRAM_BINDING_TOTAL; step++) {
        for (const status of [0, 1, 2]) {
          const destination = buckramBindingDestination({ buckramBindingStep: step, buckramBindingStatus: status });
          const cue = locale.hud.bindery[destination];
          expect(cue.length).toBeGreaterThan(0);
          expect(cue.length).toBeLessThanOrEqual(QUEST_BAND_LAYOUT.actionCue.maxChars);
        }
      }
    }
  });
  it("keeps pickup, routing, and sealing destinations within the HUD", () => {
    for (const packet of BUCKRAM_BINDING_PACKETS) {
      expect(buckramBindingObjective(packet, "waiting")).toBe(`TAKE ${packet.shortLabel}`);
      expect(buckramBindingObjective(packet, "carried")).toMatch(/^TO /);
      expect(buckramBindingObjective(packet, "routed")).toMatch(/^(ASSEMBLE|CHECK|CERTIFY|FILE|VERIFY) /);
      for (const status of ["waiting", "carried", "routed"] as const) {
        expect(buckramBindingObjective(packet, status).length).toBeLessThanOrEqual(20);
      }
    }
  });

  it("bundles every final check into five ordered packets", () => {
    expect(BUCKRAM_BINDING_PACKETS.map((packet) => packet.id)).toEqual([
      "front-matter-packet",
      "index-proof-docket",
      "kellogg-certification",
      "gpo-binding-packet",
      "public-release-packet"
    ]);
    expect(BUCKRAM_BINDING_PACKETS.map((packet) => packet.checkIds.length)).toEqual([7, 6, 4, 8, 13]);
    expect(BUCKRAM_BINDING_CHECK_TOTAL).toBe(38);
  });

  it("accepts only the active packet at its matching station", () => {
    expect(routeBuckramBindingPacket(0, "front-matter-packet", "front-matter-bench").ok).toBe(true);
    expect(routeBuckramBindingPacket(1, "index-proof-docket", "gpo-handoff")).toMatchObject({
      ok: false,
      reason: "INDEX DOCKET belongs at index-desk."
    });
    expect(routeBuckramBindingPacket(3, "public-release-packet", "public-release-terminal")).toMatchObject({
      ok: false,
      reason: "GPO Binding and Funding Packet must be filed before public-release-packet."
    });
  });

  it("round-trips persisted carried and routed states", () => {
    for (const status of ["waiting", "carried", "routed"] as const) {
      expect(buckramBindingStatusFromCode(buckramBindingStatusCode(status))).toBe(status);
    }
  });

  it("clamps explicit progress to the five-packet sequence", () => {
    expect(deriveBuckramBindingStep({ buckramBindingStep: -2 })).toBe(0);
    expect(deriveBuckramBindingStep({ buckramBindingStep: 3 })).toBe(3);
    expect(deriveBuckramBindingStep({ buckramBindingStep: 99 })).toBe(BUCKRAM_BINDING_TOTAL);
  });

  it("translates completed legacy modal chains into physical packet progress", () => {
    expect(deriveBuckramBindingStep({
      frontMatterAssemblyComplete: 1,
      readerAidRegistersComplete: 1
    })).toBe(1);
    expect(deriveBuckramBindingStep({
      frontMatterAssemblyComplete: 1,
      readerAidRegistersComplete: 1,
      indexDocketComplete: 1,
      typesetterCorrectionsComplete: 1,
      kelloggFinalCertificationComplete: 1,
      gpoSegmentAssemblyComplete: 1,
      gpoPublicationComplete: 1,
      publicationFundingComplete: 1
    })).toBe(4);
  });

  it("reports the active packet and completed state for QA", () => {
    expect(getBuckramBindingReadout({ buckramBindingStep: 2, buckramBindingStatus: 1 })).toMatchObject({
      step: 2,
      status: "carried",
      activePacketId: "kellogg-certification",
      complete: false
    });
    expect(getBuckramBindingReadout({ buckramBindingStep: 5 })).toMatchObject({
      completed: 5,
      activePacketId: null,
      complete: true
    });
  });
});
