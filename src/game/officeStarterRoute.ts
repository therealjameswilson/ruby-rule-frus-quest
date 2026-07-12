export type OfficeStarterStage =
  | "talk_jr"
  | "take_memo"
  | "route_memo"
  | "stamp_memo"
  | "recover_key"
  | "enter_archive";

export interface OfficeStarterRouteContext {
  juniorIntroduced: boolean;
  memoStatus: number;
  hasArchiveKey: boolean;
}

export function getOfficeStarterStage(context: OfficeStarterRouteContext): OfficeStarterStage {
  if (!context.juniorIntroduced) return "talk_jr";
  const memoStatus = Math.max(0, Math.min(3, Math.round(context.memoStatus)));
  if (memoStatus === 0) return "take_memo";
  if (memoStatus === 1) return "route_memo";
  if (memoStatus === 2) return "stamp_memo";
  if (!context.hasArchiveKey) return "recover_key";
  return "enter_archive";
}

const OBJECTIVES: Record<OfficeStarterStage, string> = {
  talk_jr: "Talk to JR at the west desk.",
  take_memo: "Pick up the Assignment Memo.",
  route_memo: "Carry the memo to INBOX.",
  stamp_memo: "Stamp the memo at INBOX.",
  recover_key: "Return to JR for the Master Declass Key.",
  enter_archive: "Enter the Archive Guide through the south door."
};

const TARGETS: Record<OfficeStarterStage, { id: "junior" | "memo" | "inbox" | "archive"; label: string }> = {
  talk_jr: { id: "junior", label: "JR" },
  take_memo: { id: "memo", label: "MEMO" },
  route_memo: { id: "inbox", label: "INBOX" },
  stamp_memo: { id: "inbox", label: "STAMP" },
  recover_key: { id: "junior", label: "JR" },
  enter_archive: { id: "archive", label: "ARCHIVE" }
};

export function officeStarterObjective(stage: OfficeStarterStage) {
  return OBJECTIVES[stage];
}

export function officeStarterTarget(stage: OfficeStarterStage) {
  return TARGETS[stage];
}
