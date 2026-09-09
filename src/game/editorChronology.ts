import { ABOUT_SERIES_SOURCE } from "./aboutSeries";

export type EditorChronologySlot = 1 | 2 | 3;
export const EDITOR_CHRONOLOGY_TITLE = "REPAIR THE CHRONOLOGY";
export const EDITOR_CHRONOLOGY_SOURCE = ABOUT_SERIES_SOURCE.url;
export const EDITOR_CHRONOLOGY_EVIDENCE = [
  "MEETING: 10 JAN 11:00", "MEMO DRAFTED: 12 JAN", "SOURCE: TRAINING FILE B",
  "ORDER BY THE EVENT", "ALL TIMES: WASHINGTON, DC"
] as const;

const RECORDS = {
  cable: { id: "cable", label: "CABLE", date: "10 JAN", time: "09:00", order: 900 },
  memcon: { id: "memcon", label: "MEMCON", date: "10 JAN", time: "11:00", order: 1100 },
  telegram: { id: "telegram", label: "TELEGRAM", date: "10 JAN", time: "15:00", order: 1500 }
} as const;

// The faulty printer's sequence places the later-drafted memcon last.
export function restoreEditorChronology(value: number | undefined): EditorChronologySlot {
  return value === 1 || value === 2 ? value : 3;
}

export function shiftEditorChronology(slot: number, direction: -1 | 1): EditorChronologySlot {
  return restoreEditorChronology(Math.max(1, Math.min(3, restoreEditorChronology(slot) + direction)));
}

export function editorChronologySequence(slot: number) {
  const sequence: Array<(typeof RECORDS)[keyof typeof RECORDS]> = [RECORDS.cable, RECORDS.telegram];
  sequence.splice(restoreEditorChronology(slot) - 1, 0, RECORDS.memcon);
  return sequence;
}

export function validateEditorChronology(slot: number) {
  const records = editorChronologySequence(slot);
  const ok = records.every((record, index) => index === 0 || records[index - 1].order < record.order);
  return { ok, message: ok ? "CHRONOLOGY FILED" : "USE THE MEETING TIME\nNOT THE DRAFT DATE" };
}
