import { describe, expect, it } from "vitest";
import {
  BUCKRAM_BINDING_CHECK_TOTAL,
  BUCKRAM_BINDING_PACKETS,
  BUCKRAM_BINDING_TOTAL,
  buckramBindingStatusCode,
  buckramBindingStatusFromCode,
  deriveBuckramBindingStep,
  getBuckramBindingReadout,
  routeBuckramBindingPacket
} from "./buckramBinding";

describe("physical Buckram Gate binding", () => {
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
