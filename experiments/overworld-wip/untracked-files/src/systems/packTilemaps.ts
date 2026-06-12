import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../game/constants";
import {
  ART_PACK_IMAGES,
  ART_PACK_TILESETS,
  basePackTileIndex,
  decorationPackTileIndex
} from "../game/artPack";
import { WORLD_HUD_HEIGHT } from "../game/world";
import type { WorldScreenDefinition, WorldScreensDefinition } from "../game/world";

type TileRows = number[][];

interface PackLayerPair {
  base: Phaser.Tilemaps.TilemapLayer;
  decoration: Phaser.Tilemaps.TilemapLayer | null;
}

export function drawPackScreenTilemap(
  scene: Phaser.Scene,
  world: WorldScreensDefinition,
  screen: WorldScreenDefinition,
  targetLayer: Phaser.GameObjects.Container,
  offset = { x: 0, y: 0 }
) {
  const theme = screen.screenType === "interior" ? "interiors" : "overworld";
  const result = createPackLayerPair(scene, theme, buildScreenLayerData(screen, theme), offset.x, offset.y + WORLD_HUD_HEIGHT, world.tileSize);
  if (!result) return false;
  targetLayer.add(result.base);
  if (result.decoration) targetLayer.add(result.decoration);
  return true;
}

export function drawPackRoomFloor(scene: Phaser.Scene, textureKey: string) {
  const theme = roomThemeForTexture(textureKey);
  const background = roomBackgroundForTexture(textureKey);
  if (background && scene.textures.exists(background)) {
    scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, background).setDepth(-31).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
  }
  const result = createPackLayerPair(scene, theme, buildGenericRoomLayerData(theme), 0, 32, 16);
  if (!result) return false;
  result.base.setDepth(-24);
  result.decoration?.setDepth(-18);
  return true;
}

function createPackLayerPair(
  scene: Phaser.Scene,
  theme: keyof typeof ART_PACK_TILESETS,
  data: { base: TileRows; decoration: TileRows },
  x: number,
  y: number,
  displayTileSize: number
): PackLayerPair | null {
  const tileset = ART_PACK_TILESETS[theme];
  if (!scene.textures.exists(tileset.textureKey)) return null;
  const scale = displayTileSize / tileset.displayCellPx;
  const base = createLayer(scene, tileset, data.base, x, y, scale, -60);
  const decoration = hasVisibleTiles(data.decoration)
    ? createLayer(scene, tileset, data.decoration, x, y, scale, theme === "overworld" ? 10 : 12)
    : null;
  if (!base) return null;
  return { base, decoration };
}

function createLayer(
  scene: Phaser.Scene,
  tileset: (typeof ART_PACK_TILESETS)[keyof typeof ART_PACK_TILESETS],
  data: TileRows,
  x: number,
  y: number,
  scale: number,
  depth: number
) {
  const map = scene.make.tilemap({
    data,
    tileWidth: tileset.displayCellPx,
    tileHeight: tileset.displayCellPx
  });
  const image = map.addTilesetImage(tileset.name, tileset.textureKey, tileset.displayCellPx, tileset.displayCellPx, 0, 0);
  if (!image) return null;
  const layer = map.createLayer(0, image, x, y);
  if (!layer) return null;
  layer.setScale(scale);
  layer.setDepth(depth);
  layer.setCullPadding(1, 1);
  layer.setSkipCull(true);
  return layer;
}

function buildScreenLayerData(screen: WorldScreenDefinition, theme: keyof typeof ART_PACK_TILESETS) {
  const base: TileRows = [];
  const decoration: TileRows = [];
  screen.tileLayout.forEach((row, rowIndex) => {
    const baseRow: number[] = [];
    const decorationRow: number[] = [];
    [...row].forEach((glyph, columnIndex) => {
      baseRow.push(basePackTileIndex(glyph, theme, rowIndex, columnIndex));
      decorationRow.push(decorationPackTileIndex(glyph, theme));
    });
    base.push(baseRow);
    decoration.push(decorationRow);
  });
  return { base, decoration };
}

function buildGenericRoomLayerData(theme: keyof typeof ART_PACK_TILESETS) {
  const rows = 13;
  const cols = 16;
  const base: TileRows = [];
  const decoration: TileRows = [];
  for (let row = 0; row < rows; row += 1) {
    const baseRow: number[] = [];
    const decorationRow: number[] = [];
    for (let col = 0; col < cols; col += 1) {
      const edge = row === 0 || row === rows - 1 || col === 0 || col === cols - 1;
      const glyph = edge ? "r" : ".";
      baseRow.push(basePackTileIndex(glyph, theme, row, col));
      if (edge) decorationRow.push(decorationPackTileIndex("r", theme));
      else if (theme === "archiveDungeon" && row === 4 && (col === 3 || col === 12)) decorationRow.push(decorationPackTileIndex("a", theme));
      else if (theme === "archiveDungeon" && row === 7 && (col === 6 || col === 9)) decorationRow.push(decorationPackTileIndex("i", theme));
      else if (theme === "interiors" && row === 3 && (col === 4 || col === 11)) decorationRow.push(decorationPackTileIndex("a", theme));
      else if (theme === "interiors" && row === 8 && (col === 5 || col === 10)) decorationRow.push(decorationPackTileIndex("m", theme));
      else decorationRow.push(-1);
    }
    base.push(baseRow);
    decoration.push(decorationRow);
  }
  return { base, decoration };
}

function hasVisibleTiles(data: TileRows) {
  return data.some((row) => row.some((tileIndex) => tileIndex >= 0));
}

function roomThemeForTexture(textureKey: string): keyof typeof ART_PACK_TILESETS {
  if (textureKey.includes("office")) return "interiors";
  if (textureKey.includes("network") || textureKey.includes("vault") || textureKey.includes("archive")) return "archiveDungeon";
  return "interiors";
}

function roomBackgroundForTexture(textureKey: string) {
  if (textureKey.includes("archive")) return ART_PACK_IMAGES.bg_archive_shelves.textureKey;
  if (textureKey.includes("network") || textureKey.includes("vault")) return ART_PACK_IMAGES.bg_secure_facility.textureKey;
  if (textureKey.includes("office")) return ART_PACK_IMAGES.bg_reading_room.textureKey;
  return null;
}
