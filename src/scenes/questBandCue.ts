import type { AdventureTrainingReadout } from "../game/types";

export interface QuestBandCrystalSlot {
  index: number;
  visible: boolean;
  held: boolean;
}

export function questBandVerbCode(verb: AdventureTrainingReadout["verb"]): string {
  if (verb === "EXPLORE") return "GO";
  if (verb === "UNLOCK") return "LOCK";
  if (verb === "CHOOSE") return "PICK";
  if (verb === "RETURN") return "RET";
  return verb;
}

export function questBandCueLine(cue: Pick<AdventureTrainingReadout, "text">): string {
  const text = cue.text.replace(/^\[[^\]]+\]\s*/, "").trim();
  return text.slice(0, 34);
}

export function questBandCrystalSlots(earned: number, total: number, maxSlots = 5): QuestBandCrystalSlot[] {
  const safeMax = Math.max(0, Math.floor(maxSlots));
  const visibleTotal = Math.min(safeMax, Math.max(Math.floor(total), 1));
  const heldTotal = Math.max(0, Math.floor(earned));
  return Array.from({ length: safeMax }, (_, index) => ({
    index,
    visible: index < visibleTotal,
    held: index < heldTotal && index < visibleTotal
  }));
}

export function questBandCoverFragmentSlots(current: number, total: number, maxSlots = 5): QuestBandCrystalSlot[] {
  return questBandCrystalSlots(current, total, maxSlots);
}
