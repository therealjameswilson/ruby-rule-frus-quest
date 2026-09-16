import { pauseTextPages } from "./pauseMenu";

export const DIALOG_COLUMNS = 31;
export const DIALOG_ROWS = 2;

export function dialogPages(pages: string | readonly string[]): string[] {
  return (typeof pages === "string" ? [pages] : pages)
    .flatMap((page) => pauseTextPages(page, DIALOG_COLUMNS, DIALOG_ROWS));
}

export function dialogHeading(speaker: string, index: number, total: number): string {
  const suffix = total > 1 ? ` ${index + 1}/${total}` : ":";
  const room = Math.max(0, DIALOG_COLUMNS - suffix.length);
  const name = speaker.length > room ? `${speaker.slice(0, room - 3)}...` : speaker;
  return `${name}${suffix}`;
}
