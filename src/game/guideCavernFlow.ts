export type GuideCavernStage = "stamp" | "fragment" | "gate";

export function getGuideCavernStage(hasStamp: boolean, hasFragment: boolean): GuideCavernStage {
  if (!hasStamp) return "stamp";
  if (!hasFragment) return "fragment";
  return "gate";
}

const GUIDE_CAVERN_OBJECTIVES: Record<GuideCavernStage, string> = {
  stamp: "Archive Cavern: take the glowing Citation Stamp.",
  fragment: "Archive Cavern: use the stamp to claim the FRUS fragment.",
  gate: "Archive Cavern: open the south Verification Gate."
};

const GUIDE_CAVERN_ACTION_CUES: Record<GuideCavernStage, string> = {
  stamp: "FIND GOLD STAMP",
  fragment: "TAKE FRUS FRAGMENT",
  gate: "OPEN SOUTH GATE"
};

export function guideCavernObjective(stage: GuideCavernStage) {
  return GUIDE_CAVERN_OBJECTIVES[stage];
}

export function guideCavernActionCue(stage: GuideCavernStage) {
  return GUIDE_CAVERN_ACTION_CUES[stage];
}

export function guideCavernTargetId(stage: GuideCavernStage) {
  if (stage === "stamp") return "stamp";
  if (stage === "fragment") return "fragment";
  return "gate";
}
