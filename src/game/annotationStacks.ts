import type { AnnotationDraftingPromptId } from "./annotationDrafting";
import { readAnnotationPacket } from "./annotationPacket";
import { restoredArchiveRepoWallCleared } from "./archiveSourceRoom";
import { INTERIOR_TILES } from "./networkN1Tilemap";
import { EMPTY_TILE, packedTileGid } from "./packedTileIndex";
import type { ArchiveA1TileLayers } from "./archiveA1Tilemap";

export const ANNOTATION_STACKS = {
  roomId: "AS",
  entry: { x: 128, y: 192 },
  returnToSource: { x: 128, y: 68 },
  stations: {
    published_provenance: { x: 48, y: 80 },
    contextual_annotation: { x: 128, y: 72 },
    selectivity_mitigation: { x: 208, y: 80 }
  } satisfies Record<AnnotationDraftingPromptId, { x: number; y: number }>
} as const;

export function annotationStacksOpen(progress: Readonly<Record<string, number>>) {
  return restoredArchiveRepoWallCleared(progress) || progress.archiveSourceRoomComplete === 1;
}

export function annotationStacksObjective(progress: Readonly<Record<string, number>>) {
  const packet = readAnnotationPacket(progress);
  return packet.complete ? "NORTH: NARA STACKS"
    : packet.ready ? "SOUTH: FILE NOTES" : `FIND NOTES ${packet.gathered.length}/3`;
}

export function buildAnnotationStackLayers(): ArchiveA1TileLayers {
  const ground: number[][] = [];
  const walls: number[][] = [];
  const decoration: number[][] = [];
  const collisionCells: Array<{ tileX: number; tileY: number }> = [];
  for (let y = 0; y < 12; y++) {
    ground.push([]); walls.push([]); decoration.push([]);
    for (let x = 0; x < 16; x++) {
      const doorway = (y === 0 || y === 11) && (x === 7 || x === 8);
      const border = (x === 0 || x === 15 || y === 0 || y === 11) && !doorway;
      // Three reading aisles connected at both ends, with two-tile shelf banks.
      const shelf = ((x === 4 || x === 5) || (x === 10 || x === 11)) && y >= 4 && y <= 8;
      const notePad = y === 2 && (x === 2 || x === 3 || x === 7 || x === 8 || x === 12 || x === 13);
      const floor = (x === 7 || x === 8) && y >= 10 ? 0
        : (x === 7 || x === 8) && y === 0 ? 6 : notePad ? 3 : 4;
      ground[y].push(packedTileGid(floor));
      walls[y].push(border ? packedTileGid(INTERIOR_TILES.wallPanel) : shelf ? packedTileGid(19) : EMPTY_TILE);
      decoration[y].push(EMPTY_TILE);
      if (border || shelf) collisionCells.push({ tileX: x, tileY: y });
    }
  }
  return { ground, walls, decoration, collisionCells };
}
