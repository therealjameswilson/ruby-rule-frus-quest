export const RED_ZONE_GATE_SOURCE_URL = "https://history.state.gov/historicaldocuments/frus1969-76v22/preface";
export const RED_ZONE_GATE_POINT_VALUE = 4;

export interface RedZoneGateInput {
  alreadyOpen?: boolean;
  hasClearanceToken?: boolean;
  eo13526ReviewComplete?: boolean;
  declassificationReviewComplete?: boolean;
}

export interface RedZoneGateResult {
  ok: boolean;
  alreadyOpen: boolean;
  documentPoints: number;
  shouldOpenGate: boolean;
  sourceUrl: string;
  sourceBasis: string;
  objective: string;
  message: string;
  pages: readonly string[];
}

export const RED_ZONE_GATE_SOURCE_BASIS =
  "The E.O. 13526 FRUS preface says declassification review releases all information subject only to current national security requirements, with appropriate concurrence and accounting for withheld or excised material.";

function hasDeclassificationAuthority(input: RedZoneGateInput) {
  return Boolean(input.hasClearanceToken)
    || (Boolean(input.eo13526ReviewComplete) && Boolean(input.declassificationReviewComplete));
}

export function checkRedZoneGate(input: RedZoneGateInput = {}): RedZoneGateResult {
  const alreadyOpen = Boolean(input.alreadyOpen);
  if (!hasDeclassificationAuthority(input)) {
    const message = "Red Zone locked: complete ClassNet routing and carry the Clearance Token.";
    return {
      ok: false,
      alreadyOpen,
      documentPoints: 0,
      shouldOpenGate: false,
      sourceUrl: RED_ZONE_GATE_SOURCE_URL,
      sourceBasis: RED_ZONE_GATE_SOURCE_BASIS,
      objective: "Need Clearance Token: finish E.O. 13526 review before entering the Red Zone.",
      message,
      pages: [
        message,
        RED_ZONE_GATE_SOURCE_BASIS,
        "This vault only opens after human declassification review, concurrence routing, and visible accounting."
      ]
    };
  }

  const message = alreadyOpen
    ? "Red Zone already open: declassification accounting remains visible."
    : "Red Zone opened: Clearance Token accepted and declassification accounting filed.";

  return {
    ok: true,
    alreadyOpen,
    documentPoints: alreadyOpen ? 0 : RED_ZONE_GATE_POINT_VALUE,
    shouldOpenGate: !alreadyOpen,
    sourceUrl: RED_ZONE_GATE_SOURCE_URL,
    sourceBasis: RED_ZONE_GATE_SOURCE_BASIS,
    objective: "Red Zone opened. Inspect classified fragments without hiding review limits.",
    message,
    pages: [
      message,
      RED_ZONE_GATE_SOURCE_BASIS,
      "Proceed only with accountable human review; no silent deletions, no smoothed gaps."
    ]
  };
}
