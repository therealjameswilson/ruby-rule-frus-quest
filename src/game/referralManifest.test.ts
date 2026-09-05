import { describe, expect, it } from "vitest";
import { REFERRAL_EQUITY_PACKETS } from "./referralVaultReview";
import { changeManifestRoute, encodeReferralManifest, firstManifestMismatch, initialReferralManifest, REFERRAL_MANIFEST_LABELS, restoreReferralManifest } from "./referralManifest";
import { pixelFontMetrics } from "../systems/pixelFontMetrics";

describe("human referral manifest repair", () => {
  it("starts with one incorrect draft route matching the carried training batch", () => {
    const draft = initialReferralManifest();
    expect(REFERRAL_EQUITY_PACKETS.filter(packet => draft[packet.id] !== packet.agency)).toHaveLength(1);
    expect(firstManifestMismatch(draft)?.id).toBe("white_house_minutes");
    expect(draft.white_house_minutes).toBe("CIA");
  });

  it("cycles each route in both directions without mutating the prior draft", () => {
    for (const packet of REFERRAL_EQUITY_PACKETS) {
      const draft = initialReferralManifest();
      let changed = draft;
      for (let step = 0; step < 3; step++) changed = changeManifestRoute(changed, packet.id, 1);
      expect(changed).toEqual(draft);
      const left = changeManifestRoute(draft, packet.id, -1);
      expect(left).not.toEqual(draft);
      expect(changeManifestRoute(left, packet.id, 1)).toEqual(draft);
      expect(draft).toEqual(initialReferralManifest());
    }
  });

  it("requires every destination to match before the draft can be filed", () => {
    const corrected = changeManifestRoute(initialReferralManifest(), "white_house_minutes", -1);
    expect(firstManifestMismatch(corrected)).toBeNull();
    for (const packet of REFERRAL_EQUITY_PACKETS) {
      expect(firstManifestMismatch(changeManifestRoute(corrected, packet.id, 1))?.id).toBe(packet.id);
    }
  });

  it("round-trips all 27 edited drafts without silently correcting them", () => {
    let validCount = 0;
    for (let code = 1; code <= 27; code++) {
      const draft = restoreReferralManifest(code);
      expect(encodeReferralManifest(draft)).toBe(code);
      if (!firstManifestMismatch(draft)) validCount++;
    }
    expect(validCount).toBe(1);
    expect(firstManifestMismatch(restoreReferralManifest(encodeReferralManifest(initialReferralManifest())))).not.toBeNull();
  });

  it.each([undefined, 0, -1, 1.5, 28, NaN, Infinity])("restores missing/invalid code %s as an unapproved draft", code => {
    const restored = restoreReferralManifest(code);
    expect(restored).toEqual(initialReferralManifest());
    expect(firstManifestMismatch(restored)).not.toBeNull();
  });

  it("keeps document labels separate from the agency selector at native size", () => {
    for (const label of Object.values(REFERRAL_MANIFEST_LABELS)) {
      expect(25 + label.length * pixelFontMetrics(8).advance).toBeLessThan(160);
    }
    expect(166 + "< CIA >".length * pixelFontMetrics(8).advance).toBeLessThan(237);
    for (const line of ["ROUTING ONLY", "NOT RELEASE APPROVAL", "INTEL ANNEX -> CIA", "DRAFT KEPT - REVISE"]) {
      expect(20 + line.length * pixelFontMetrics(8).advance).toBeLessThan(150);
    }
  });
});
