import type { AdventureTrainingReadout } from "../game/types";
import type { GameState } from "../game/state";

type RiskThreat = Pick<GameState["visibleThreats"][number], "hp" | "enemyState" | "difficultyTier" | "reliabilityRisk" | "bossCombat">;

export function questBandAwaitingDialog(mode: GameState["mode"], dialog: GameState["activeDialog"]): boolean {
  return mode === "dialog" && !dialog?.text.trim();
}

export function questBandBossCue(mode: GameState["mode"], threats: readonly RiskThreat[]) {
  if (mode !== "explore") return null;
  const boss = threats.find((threat) => threat.bossCombat && (threat.hp ?? 0) > 0
    && threat.enemyState !== "intro" && threat.enemyState !== "defeated");
  const combat = boss?.bossCombat;
  if (!combat || combat.retryAvailable) return null;
  if (combat.feedback && combat.feedback.msRemaining > 0) {
    return { text: combat.feedback.text, tone: combat.feedback.tone,
      badge: combat.feedback.tone === "warn" ? "notice" : "tool" } as const;
  }
  return { text: (combat.counterWindowMs ?? 0) > 0 ? "CORE OPEN: STRIKE" : "FACE BOLT + SWING",
    tone: "info", badge: "tool" } as const;
}

export function questBandRiskLine(mode: GameState["mode"], threats: readonly RiskThreat[]): string | null {
  // Boss telegraphs and hearts convey danger; keep the action/decision cue visible.
  if (mode !== "explore" || threats.some((threat) => threat.bossCombat && (threat.hp ?? 0) > 0)) return null;
  const hardestThreat = threats
    .filter((threat) => (threat.hp ?? 0) > 0 && threat.enemyState !== "defeated" && (threat.difficultyTier ?? 0) >= 4)
    .sort((left, right) => (right.difficultyTier ?? 0) - (left.difficultyTier ?? 0))[0];
  return hardestThreat ? `RELIABILITY RISK: ${(hardestThreat.reliabilityRisk ?? "high").toUpperCase()}` : null;
}

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
