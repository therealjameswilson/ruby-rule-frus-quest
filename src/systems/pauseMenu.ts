export const PAUSE_PAGES = ["tools", "map", "record", "settings"] as const;
export type PausePage = (typeof PAUSE_PAGES)[number];
export type PauseDirection = "left" | "right" | "up" | "down";
export interface PauseHit { id: string; x: number; y: number; width: number; height: number }
export const PAUSE_HEADER: readonly PauseHit[] = [...PAUSE_PAGES, "close"].map((id, index) => ({
  id, x: 32 + index * 48, y: 34, width: 44, height: 44
}));
export const PAUSE_PREVIOUS: PauseHit = { id: "previous", x: 32, y: 80, width: 44, height: 44 };
export const PAUSE_NEXT: PauseHit = { id: "next", x: 224, y: 80, width: 44, height: 44 };

export function pauseToolHit(index: number): PauseHit {
  return { id: `tool-${index}`, x: 48 + index % 4 * 52, y: 80 + Math.floor(index / 4) * 48, width: 44, height: 44 };
}

export function pauseHitAt(hits: readonly PauseHit[], x: number, y: number) {
  return hits.find((hit) => x >= hit.x - hit.width / 2 && x < hit.x + hit.width / 2
    && y >= hit.y - hit.height / 2 && y < hit.y + hit.height / 2);
}

// Up from the first row focuses the page tabs, including an empty inventory.
export function movePauseTool(index: number, count: number, direction: PauseDirection): number | "header" {
  if (!count) return "header";
  if (direction === "up") return index < 4 ? "header" : index - 4;
  if (direction === "down") return Math.min(count - 1, index + 4);
  if (direction === "left") return Math.max(0, index - 1);
  return Math.min(count - 1, index + 1);
}

// Paginate long source prose/URLs without shrinking the native 8px text face.
export function pauseTextPages(text: string, columns = 36, rows = 10): string[] {
  columns = Math.max(1, Math.floor(columns));
  rows = Math.max(1, Math.floor(rows));
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (let word of paragraph.trim().split(/\s+/)) {
      if (!word) continue;
      if (line && line.length + word.length + 1 > columns) { lines.push(line); line = ""; }
      while (word.length > columns) {
        if (line) { lines.push(line); line = ""; }
        lines.push(word.slice(0, columns)); word = word.slice(columns);
      }
      line = line ? `${line} ${word}` : word;
    }
    lines.push(line);
  }
  const pages: string[] = [];
  for (let index = 0; index < lines.length; index += rows) pages.push(lines.slice(index, index + rows).join("\n"));
  return pages.length ? pages : [""];
}

export function layoutPauseRooms<T extends { id: string; grid: { x: number; y: number } }>(rooms: readonly T[]) {
  if (!rooms.length) return [];
  const minX = Math.min(...rooms.map((room) => room.grid.x));
  const minY = Math.min(...rooms.map((room) => room.grid.y));
  const spanX = Math.max(...rooms.map((room) => room.grid.x)) - minX + 1;
  const spanY = Math.max(...rooms.map((room) => room.grid.y)) - minY + 1;
  const pitchX = Math.min(48, Math.floor(216 / spanX));
  const pitchY = Math.min(24, Math.floor(76 / spanY));
  return rooms.map((room) => ({ ...room,
    x: Math.round(128 + (room.grid.x - minX - (spanX - 1) / 2) * pitchX),
    y: Math.round(140 + (room.grid.y - minY - (spanY - 1) / 2) * pitchY),
    width: Math.min(28, pitchX - 6), height: Math.min(16, pitchY - 2)
  }));
}

export interface PauseMenuReadout {
  page: PausePage;
  focus: "header" | "content";
  selectedTool: string | null;
  detailOpen: boolean;
  mapArea: string | null;
  recordPage: number;
  recordPages: number;
  controls: PauseHit[];
}
let readout: PauseMenuReadout | null = null;
export function setPauseMenuReadout(value: PauseMenuReadout | null) { readout = value; }
export function getPauseMenuReadout() { return readout; }
