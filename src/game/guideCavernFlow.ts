import { GUIDE_CAVERN_BOUNDS } from "./guideCavernRoom";

export type GuideCavernStage = "stamp" | "counter" | "fragment" | "gate";

export function reachedGuideExit(stage: GuideCavernStage, position: { x: number; y: number }, movingSouth: boolean) {
  return stage === "gate" && movingSouth && position.x >= 116 && position.x <= 140
    && position.y >= GUIDE_CAVERN_BOUNDS.bottom - 1;
}

export function getGuideCavernStage(
  hasStamp: boolean,
  hasFragment: boolean,
  counterTrained = hasFragment
): GuideCavernStage {
  if (!hasStamp) return "stamp";
  if (!counterTrained && !hasFragment) return "counter";
  if (!hasFragment) return "fragment";
  return "gate";
}

const GUIDE_CAVERN_OBJECTIVES: Record<GuideCavernStage, string> = {
  stamp: "Archive Cavern: take the glowing Citation Stamp.",
  counter: "Archive Cavern: return DANN-E's practice bolt with the Citation Stamp.",
  fragment: "Archive Cavern: interact with the Front Matter to collect it.",
  gate: "Archive Cavern: walk south through the open gate."
};

const GUIDE_CAVERN_ACTION_CUES: Record<GuideCavernStage, string> = {
  stamp: "FIND GOLD STAMP",
  counter: "FACE BOLT - SWING STAMP",
  fragment: "TAKE FRONT MATTER",
  gate: "SOUTH: ARCHIVE"
};

export function guideCavernObjective(stage: GuideCavernStage) {
  return GUIDE_CAVERN_OBJECTIVES[stage];
}

export function guideCavernActionCue(stage: GuideCavernStage) {
  return GUIDE_CAVERN_ACTION_CUES[stage];
}

export function guideCavernTargetId(stage: GuideCavernStage) {
  if (stage === "stamp") return "stamp";
  if (stage === "counter") return "ego-seal";
  if (stage === "fragment") return "fragment";
  return "gate";
}
