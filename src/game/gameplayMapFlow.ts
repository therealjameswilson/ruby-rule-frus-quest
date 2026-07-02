import type { GameplayMapKey } from "../assets/registry";
import { ITEM_REGISTRY, PALETTE, type ProcessItemId } from "./constants";

export interface GameplayMapFlowStep {
  code: string;
  title: string;
  verb: string;
  accent: string;
}

export interface FrusProductionFloorStep {
  code: string;
  shortLabel: string;
  fullLabel: string;
  taskLabel: string;
  taskDetail: string;
  xRatio: number;
  accent: string;
}

export type FrusProductionFloorGateStatus = "complete" | "waiting";

export interface FrusProductionFloorGateContext {
  citationStamp: boolean;
  selectionReady: boolean;
  clearanceReady: boolean;
  editorialReady: boolean;
  buckramReady: boolean;
}

export interface FrusProductionFloorGateReadout {
  code: string;
  requirement: string;
  status: FrusProductionFloorGateStatus;
  label: "OK" | "NEED";
  readout: string;
  xRatio: number;
  accent: string;
}

export interface FrusProductionFloorGateToolCue {
  gateCode: string;
  requirement: string;
  itemId: ProcessItemId;
  displayName: string;
  shortLabel: string;
}

export const GAMEPLAY_MAP_FLOW_STEPS: Record<GameplayMapKey, GameplayMapFlowStep> = {
  historian_office: {
    code: "01",
    title: "RESEARCH",
    verb: "CHARTER",
    accent: PALETTE.goldStamp
  },
  nara_stacks: {
    code: "02",
    title: "STACKS",
    verb: "CITE",
    accent: PALETTE.archiveAmber
  },
  foggy_bottom: {
    code: "03",
    title: "ROUTE",
    verb: "ENTER",
    accent: PALETTE.stoneLight
  },
  west_wing: {
    code: "04",
    title: "REVIEW",
    verb: "BRIEF",
    accent: PALETTE.terminalCyan
  },
  black_vault: {
    code: "08",
    title: "FINAL",
    verb: "CERTIFY",
    accent: PALETTE.classNetRed
  },
  frus_floor: {
    code: "05",
    title: "PROCESS",
    verb: "STAMP",
    accent: PALETTE.goldStamp
  },
  embassy: {
    code: "06",
    title: "CABLES",
    verb: "PERMIT",
    accent: PALETTE.openNetGreen
  },
  capitol_hill: {
    code: "07",
    title: "HEARING",
    verb: "TESTIFY",
    accent: PALETTE.paleGold
  }
};

export const FRUS_PRODUCTION_FLOOR_STEPS: readonly FrusProductionFloorStep[] = [
  {
    code: "1",
    shortLabel: "R",
    fullLabel: "RESEARCH",
    taskLabel: "VERIFY SRC",
    taskDetail: "verify source trail",
    xRatio: 0.129,
    accent: PALETTE.goldStamp
  },
  {
    code: "2",
    shortLabel: "C",
    fullLabel: "COMPILE",
    taskLabel: "SELECT DOC",
    taskDetail: "select documents",
    xRatio: 0.314,
    accent: PALETTE.terminalCyan
  },
  {
    code: "3",
    shortLabel: "D",
    fullLabel: "DECLASS",
    taskLabel: "ROUTE EQ",
    taskDetail: "route equities",
    xRatio: 0.505,
    accent: PALETTE.classNetRed
  },
  {
    code: "4",
    shortLabel: "A",
    fullLabel: "ANNOTATE",
    taskLabel: "CHECK NOTE",
    taskDetail: "check annotation",
    xRatio: 0.691,
    accent: PALETTE.creamPaper
  },
  {
    code: "5",
    shortLabel: "P",
    fullLabel: "PUBLISH",
    taskLabel: "BIND VOL",
    taskDetail: "bind volume",
    xRatio: 0.869,
    accent: PALETTE.oldGold
  }
];

export function gameplayMapFlowReadout(mapKey: GameplayMapKey) {
  const step = GAMEPLAY_MAP_FLOW_STEPS[mapKey];
  return `${step.code} ${step.title}: ${step.verb}`;
}

export function frusProductionFloorRailReadout() {
  return `FRUS FLOOR RAIL: ${FRUS_PRODUCTION_FLOOR_STEPS.map((step) => `${step.code} ${step.fullLabel}`).join(" > ")}`;
}

export function frusProductionFloorStepForRatio(rawRatio: number) {
  const ratio = Math.max(0, Math.min(1, rawRatio));
  return FRUS_PRODUCTION_FLOOR_STEPS.reduce((closest, step) => {
    return Math.abs(step.xRatio - ratio) < Math.abs(closest.xRatio - ratio) ? step : closest;
  }, FRUS_PRODUCTION_FLOOR_STEPS[0]);
}

export function frusProductionFloorStageReadout(rawRatio: number) {
  const step = frusProductionFloorStepForRatio(rawRatio);
  return `FRUS FLOOR CURRENT: ${step.code} ${step.fullLabel}`;
}

export function frusProductionFloorTaskReadout(rawRatio: number) {
  const step = frusProductionFloorStepForRatio(rawRatio);
  return `FRUS FLOOR TASK: ${step.taskDetail.toUpperCase()}`;
}

const FRUS_FLOOR_GATE_REQUIREMENTS = [
  { code: "1", requirement: "CITE", complete: (context: FrusProductionFloorGateContext) => context.citationStamp },
  { code: "2", requirement: "SEL", complete: (context: FrusProductionFloorGateContext) => context.selectionReady },
  { code: "3", requirement: "EQ", complete: (context: FrusProductionFloorGateContext) => context.clearanceReady },
  { code: "4", requirement: "EDIT", complete: (context: FrusProductionFloorGateContext) => context.editorialReady },
  { code: "5", requirement: "BIND", complete: (context: FrusProductionFloorGateContext) => context.buckramReady }
] as const;

const FRUS_FLOOR_GATE_TOOL_ITEMS: Record<string, ProcessItemId> = {
  "1": "citation_stamp",
  "2": "review_folder",
  "3": "clearance_token",
  "4": "red_pencil",
  "5": "buckram_key"
};

export function frusProductionFloorGateReadouts(context: FrusProductionFloorGateContext): FrusProductionFloorGateReadout[] {
  return FRUS_FLOOR_GATE_REQUIREMENTS.map((gate) => {
    const step = FRUS_PRODUCTION_FLOOR_STEPS.find((candidate) => candidate.code === gate.code) ?? FRUS_PRODUCTION_FLOOR_STEPS[0];
    const complete = gate.complete(context);
    const label = complete ? "OK" : "NEED";
    return {
      code: gate.code,
      requirement: gate.requirement,
      status: complete ? "complete" : "waiting",
      label,
      readout: `${gate.code} ${label} ${gate.requirement}`,
      xRatio: step.xRatio,
      accent: step.accent
    };
  });
}

export function frusProductionFloorGateSummary(context: FrusProductionFloorGateContext) {
  return `FRUS FLOOR GATES: ${frusProductionFloorGateReadouts(context).map((gate) => gate.readout).join(" > ")}`;
}

export function frusProductionFloorGateCount(context: FrusProductionFloorGateContext) {
  const gates = frusProductionFloorGateReadouts(context);
  return {
    complete: gates.filter((gate) => gate.status === "complete").length,
    total: gates.length
  };
}

export function frusProductionFloorGateCountReadout(context: FrusProductionFloorGateContext) {
  const count = frusProductionFloorGateCount(context);
  return `FRUS FLOOR GATE COUNT: ${count.complete}/${count.total}`;
}

export function frusProductionFloorNextGate(context: FrusProductionFloorGateContext) {
  return frusProductionFloorGateReadouts(context).find((gate) => gate.status === "waiting") ?? null;
}

export function frusProductionFloorNextGateReadout(context: FrusProductionFloorGateContext) {
  const gate = frusProductionFloorNextGate(context);
  return gate ? `FRUS FLOOR NEXT GATE: ${gate.code} ${gate.requirement}` : "FRUS FLOOR NEXT GATE: READY";
}

export function frusProductionFloorNextGateRouteReadout(context: FrusProductionFloorGateContext) {
  const gate = frusProductionFloorNextGate(context);
  return gate ? `FRUS FLOOR ROUTE: TO ${gate.code} ${gate.requirement}` : "FRUS FLOOR ROUTE: TO GATE READY";
}

export function frusProductionFloorNextGateInteractionReadout(context: FrusProductionFloorGateContext) {
  const gate = frusProductionFloorNextGate(context);
  return gate ? `FRUS FLOOR INTERACT: GATE ${gate.code} ${gate.requirement}` : "FRUS FLOOR INTERACT: GATE READY";
}

export function frusProductionFloorGateToolCue(gateOrCode: FrusProductionFloorGateReadout | string | null): FrusProductionFloorGateToolCue | null {
  const gateCode = typeof gateOrCode === "string" ? gateOrCode : gateOrCode?.code;
  if (!gateCode) return null;
  const itemId = FRUS_FLOOR_GATE_TOOL_ITEMS[gateCode];
  const item = ITEM_REGISTRY.find((candidate) => candidate.id === itemId);
  const requirement = typeof gateOrCode === "string"
    ? FRUS_FLOOR_GATE_REQUIREMENTS.find((candidate) => candidate.code === gateCode)?.requirement ?? gateCode
    : gateOrCode?.requirement ?? gateCode;
  if (!item) return null;
  return {
    gateCode,
    requirement,
    itemId,
    displayName: item.displayName,
    shortLabel: item.shortLabel
  };
}

export function frusProductionFloorNextGateToolReadout(context: FrusProductionFloorGateContext) {
  const cue = frusProductionFloorGateToolCue(frusProductionFloorNextGate(context));
  return cue ? `FRUS FLOOR TOOL: ${cue.requirement} ${cue.displayName}` : "FRUS FLOOR TOOL: NONE";
}

export function frusProductionFloorGateToolSummary(context: FrusProductionFloorGateContext) {
  return `FRUS FLOOR LOCKS: ${frusProductionFloorGateReadouts(context).map((gate) => {
    const cue = frusProductionFloorGateToolCue(gate);
    const itemLabel = cue?.displayName ?? gate.requirement;
    return `${gate.code} ${gate.requirement} ${itemLabel} ${gate.label}`;
  }).join(" > ")}`;
}

export function frusProductionFloorGateInstruction(gate: FrusProductionFloorGateReadout | null) {
  if (!gate) {
    return {
      speaker: "FRUS FLOOR",
      pages: [
        "All workflow gates are clear. Carry the certified record toward the Buckram Gate.",
        "Publication can proceed only if standards violations remain resolved."
      ]
    };
  }
  if (gate.status === "complete") {
    return {
      speaker: `GATE ${gate.code} ${gate.requirement}`,
      pages: [
        `${gate.requirement} gate is clear.`,
        "Follow the NEXT marker to the next unresolved production step."
      ]
    };
  }
  const waitingPages: Record<string, string[]> = {
    "1": [
      "Citation gate needs the Citation Stamp.",
      "Verify Source Note 47 at the Archive research table, then return to the production rail."
    ],
    "2": [
      "Selection gate needs a balanced document set.",
      "File the selection docket or complete the policy coverage audit before compilation moves on."
    ],
    "3": [
      "Equity gate needs declassification routing.",
      "Use the Clearance Token or Concurrence Slip to resolve agency equities before release."
    ],
    "4": [
      "Editorial gate needs human review.",
      "Use the Red Pencil and Proof Lens so unsupported text and proof discrepancies are handled openly."
    ],
    "5": [
      "Publication gate needs final certification.",
      "Bring the Buckram Key or complete Kellogg review before the volume can be bound."
    ]
  };
  return {
    speaker: `GATE ${gate.code} ${gate.requirement}`,
    pages: waitingPages[gate.code] ?? [`${gate.requirement} gate is waiting for its FRUS production tool.`]
  };
}

function gameplayMapRouteDestinationReadout(mapKey: GameplayMapKey) {
  const step = GAMEPLAY_MAP_FLOW_STEPS[mapKey];
  if (step.title === "ROUTE") return `${step.code} ${step.verb}`;
  return gameplayMapFlowReadout(mapKey);
}

export function gameplayMapRouteBadgeLabel(target: { scene: string; mapKey?: GameplayMapKey; locked?: boolean }) {
  if (target.locked) return "LOCK";
  if (target.mapKey) {
    const step = GAMEPLAY_MAP_FLOW_STEPS[target.mapKey];
    return `${step.code} ${step.verb}`;
  }
  if (target.scene === "WorldMapScene") return "WORLD";
  return target.scene.replace(/Scene$/, "").replace(/([a-z])([A-Z])/g, "$1 $2").toUpperCase();
}

export function gameplayMapRouteReadout(target: { scene: string; mapKey?: GameplayMapKey; locked?: boolean }) {
  const prefix = target.locked ? "LOCKED" : "ROUTE";
  if (target.mapKey) return `${prefix} ${gameplayMapRouteDestinationReadout(target.mapKey)}`;
  if (target.scene === "WorldMapScene") return `${prefix} WORLD MAP`;
  return `${prefix} ${target.scene.replace(/Scene$/, "").replace(/([a-z])([A-Z])/g, "$1 $2").toUpperCase()}`;
}
