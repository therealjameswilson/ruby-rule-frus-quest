import { ABOUT_SERIES_SOURCE } from "./aboutSeries";

export const WITHHOLDING_CHRONOLOGY_TITLE = "WITHHOLDING CHRONOLOGY";
export type WithholdingSlot = 0 | 1 | 2 | 3;

// Fictional evidence: memcons are placed by conversation time, not drafting time.
export const WITHHOLDING_RECORDS = {
  cable: { id: "cable", label: "CABLE", date: "3 JUN", time: "09:00", order: 900 },
  memcon: { id: "memcon", label: "MEMCON", date: "3 JUN", time: "11:00", order: 1100 },
  telegram: { id: "telegram", label: "TELEGRAM", date: "3 JUN", time: "15:00", order: 1500 }
} as const;

export const WITHHOLDING_EVIDENCE = {
  heading: "MEMCON: 3 JUN 11:00",
  drafted: "DRAFTED: 4 JUN 09:00",
  sourceNote: "SOURCE: TRAINING FILE A",
  pages: "3 PAGES NOT DECLASSIFIED",
  clock: "ALL TIMES: WASHINGTON, DC",
  sourceUrl: ABOUT_SERIES_SOURCE.url
} as const;

export function restoreWithholdingSlot(value: number | undefined): WithholdingSlot {
  return value === 1 || value === 2 || value === 3 ? value : 0;
}

export function shiftWithholdingSlot(slot: WithholdingSlot, direction: -1 | 1): WithholdingSlot {
  return restoreWithholdingSlot(Math.max(0, Math.min(3, slot + direction)));
}

export function withholdingSequence(slot: WithholdingSlot) {
  const records: Array<(typeof WITHHOLDING_RECORDS)[keyof typeof WITHHOLDING_RECORDS]> = [
    WITHHOLDING_RECORDS.cable, WITHHOLDING_RECORDS.telegram
  ];
  if (slot > 0) records.splice(slot - 1, 0, WITHHOLDING_RECORDS.memcon);
  return records;
}

export function validateWithholdingEntry(value: number) {
  const slot = restoreWithholdingSlot(value);
  if (!slot) return { ok: false, message: "KEEP A WITHHOLDING ENTRY" };
  const records = withholdingSequence(slot);
  const ordered = records.every((record, index) => index === 0 || records[index - 1].order < record.order);
  return { ok: ordered, message: ordered ? "WITHHOLDING ENTRY FILED"
    : "USE THE CONVERSATION TIME\nNOT THE DRAFT DATE" };
}
