import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import { WORLD_TILE_SIZE } from "../game/world";

export type TileId =
  | "grass"
  | "grass_accent"
  | "path_horizontal"
  | "path_vertical"
  | "path_corner_ne"
  | "path_corner_nw"
  | "path_corner_se"
  | "path_corner_sw"
  | "path_cross"
  | "office_floor"
  | "wall_top"
  | "wall_side"
  | "water"
  | "bridge"
  | "tree"
  | "archive_shelf"
  | "desk"
  | "file_box"
  | "file_cabinet"
  | "reading_table"
  | "document_cart"
  | "door"
  | "locked_door"
  | "terminal"
  | "document_stack"
  | "redaction_barrier"
  | "fence"
  | "security_checkpoint";

export interface TileDefinition {
  id: TileId;
  displayName: string;
  textureKey: string;
  glyphs: string[];
  walkable: boolean;
  interactable: boolean;
  transitionTarget?: string;
}

type TilePainter = (graphics: Phaser.GameObjects.Graphics) => void;

interface InternalTileDefinition extends TileDefinition {
  paint: TilePainter;
}

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

function rect(graphics: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number, fill: string) {
  graphics.fillStyle(color(fill), 1);
  graphics.fillRect(x, y, width, height);
}

function line(graphics: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number, fill: string) {
  rect(graphics, x, y, width, height, fill);
}

function base(fill: string, paint?: TilePainter): TilePainter {
  return (graphics) => {
    rect(graphics, 0, 0, WORLD_TILE_SIZE, WORLD_TILE_SIZE, fill);
    paint?.(graphics);
  };
}

const TILE_DEFINITIONS: InternalTileDefinition[] = [
  {
    id: "grass",
    displayName: "Grass",
    textureKey: "tile-grass",
    glyphs: ["g"],
    walkable: true,
    interactable: false,
    paint: base(PALETTE.openNetGreen, (g) => {
      rect(g, 2, 3, 1, 1, PALETTE.deepRuby);
      rect(g, 9, 7, 1, 1, PALETTE.deepRuby);
      rect(g, 13, 12, 1, 1, PALETTE.goldStamp);
    })
  },
  {
    id: "grass_accent",
    displayName: "Grass Fleck",
    textureKey: "tile-grass-accent",
    glyphs: [","],
    walkable: true,
    interactable: false,
    paint: base(PALETTE.openNetGreen, (g) => {
      rect(g, 3, 4, 2, 1, PALETTE.goldStamp);
      rect(g, 10, 10, 2, 2, PALETTE.deepRuby);
    })
  },
  {
    id: "path_horizontal",
    displayName: "Path Horizontal",
    textureKey: "tile-path-horizontal",
    glyphs: ["p"],
    walkable: true,
    interactable: false,
    paint: base(PALETTE.openNetGreen, (g) => {
      rect(g, 0, 4, 16, 8, PALETTE.creamPaper);
      line(g, 0, 4, 16, 1, PALETTE.archiveAmber);
      line(g, 0, 11, 16, 1, PALETTE.archiveAmber);
      rect(g, 4, 7, 2, 1, PALETTE.sepiaInk);
      rect(g, 11, 9, 1, 1, PALETTE.white);
    })
  },
  {
    id: "path_vertical",
    displayName: "Path Vertical",
    textureKey: "tile-path-vertical",
    glyphs: ["p"],
    walkable: true,
    interactable: false,
    paint: base(PALETTE.openNetGreen, (g) => {
      rect(g, 4, 0, 8, 16, PALETTE.creamPaper);
      line(g, 4, 0, 1, 16, PALETTE.archiveAmber);
      line(g, 11, 0, 1, 16, PALETTE.archiveAmber);
      rect(g, 7, 5, 1, 2, PALETTE.sepiaInk);
      rect(g, 9, 12, 1, 1, PALETTE.white);
    })
  },
  {
    id: "path_corner_ne",
    displayName: "Path Corner NE",
    textureKey: "tile-path-corner-ne",
    glyphs: ["p"],
    walkable: true,
    interactable: false,
    paint: base(PALETTE.openNetGreen, (g) => {
      rect(g, 4, 0, 8, 12, PALETTE.creamPaper);
      rect(g, 4, 4, 12, 8, PALETTE.creamPaper);
      rect(g, 5, 5, 2, 1, PALETTE.sepiaInk);
    })
  },
  {
    id: "path_corner_nw",
    displayName: "Path Corner NW",
    textureKey: "tile-path-corner-nw",
    glyphs: ["p"],
    walkable: true,
    interactable: false,
    paint: base(PALETTE.openNetGreen, (g) => {
      rect(g, 4, 0, 8, 12, PALETTE.creamPaper);
      rect(g, 0, 4, 12, 8, PALETTE.creamPaper);
      rect(g, 9, 6, 2, 1, PALETTE.sepiaInk);
    })
  },
  {
    id: "path_corner_se",
    displayName: "Path Corner SE",
    textureKey: "tile-path-corner-se",
    glyphs: ["p"],
    walkable: true,
    interactable: false,
    paint: base(PALETTE.openNetGreen, (g) => {
      rect(g, 4, 4, 8, 12, PALETTE.creamPaper);
      rect(g, 4, 4, 12, 8, PALETTE.creamPaper);
      rect(g, 7, 10, 1, 1, PALETTE.sepiaInk);
    })
  },
  {
    id: "path_corner_sw",
    displayName: "Path Corner SW",
    textureKey: "tile-path-corner-sw",
    glyphs: ["p"],
    walkable: true,
    interactable: false,
    paint: base(PALETTE.openNetGreen, (g) => {
      rect(g, 4, 4, 8, 12, PALETTE.creamPaper);
      rect(g, 0, 4, 12, 8, PALETTE.creamPaper);
      rect(g, 10, 10, 1, 1, PALETTE.sepiaInk);
    })
  },
  {
    id: "path_cross",
    displayName: "Path Cross",
    textureKey: "tile-path-cross",
    glyphs: ["p"],
    walkable: true,
    interactable: false,
    paint: base(PALETTE.creamPaper, (g) => {
      rect(g, 2, 2, 1, 1, PALETTE.white);
      rect(g, 12, 12, 1, 1, PALETTE.sepiaInk);
    })
  },
  {
    id: "office_floor",
    displayName: "Office Floor",
    textureKey: "tile-office-floor",
    glyphs: ["o"],
    walkable: true,
    interactable: false,
    paint: base(PALETTE.terminalCyan, (g) => {
      line(g, 0, 0, 16, 1, PALETTE.creamPaper);
      line(g, 0, 15, 16, 1, PALETTE.stoneDark);
      rect(g, 5, 5, 2, 2, PALETTE.white);
      rect(g, 11, 10, 2, 1, PALETTE.stoneDark);
    })
  },
  {
    id: "wall_top",
    displayName: "Wall Top",
    textureKey: "tile-wall-top",
    glyphs: ["r"],
    walkable: false,
    interactable: false,
    paint: base(PALETTE.buckramRed, (g) => {
      line(g, 0, 0, 16, 2, PALETTE.goldStamp);
      rect(g, 3, 5, 2, 2, PALETTE.deepRuby);
      rect(g, 10, 10, 2, 2, PALETTE.deepRuby);
    })
  },
  {
    id: "wall_side",
    displayName: "Wall Side",
    textureKey: "tile-wall-side",
    glyphs: ["r"],
    walkable: false,
    interactable: false,
    paint: base(PALETTE.deepRuby, (g) => {
      line(g, 0, 0, 2, 16, PALETTE.buckramRed);
      line(g, 14, 0, 2, 16, PALETTE.buckramRed);
      rect(g, 5, 4, 2, 2, PALETTE.goldStamp);
      rect(g, 9, 11, 2, 1, PALETTE.goldStamp);
    })
  },
  {
    id: "water",
    displayName: "Reflecting Pool",
    textureKey: "tile-water",
    glyphs: ["w"],
    walkable: false,
    interactable: false,
    paint: base(PALETTE.mapWater, (g) => {
      line(g, 1, 4, 7, 1, PALETTE.terminalCyan);
      line(g, 8, 9, 7, 1, PALETTE.terminalCyan);
      line(g, 2, 13, 4, 1, PALETTE.creamPaper);
    })
  },
  {
    id: "bridge",
    displayName: "Bridge",
    textureKey: "tile-bridge",
    glyphs: ["b"],
    walkable: true,
    interactable: false,
    paint: base(PALETTE.mapWater, (g) => {
      rect(g, 0, 4, 16, 8, PALETTE.archiveAmber);
      line(g, 0, 4, 16, 1, PALETTE.goldStamp);
      line(g, 0, 11, 16, 1, PALETTE.goldStamp);
      line(g, 3, 5, 1, 6, PALETTE.sepiaInk);
      line(g, 8, 5, 1, 6, PALETTE.sepiaInk);
      line(g, 13, 5, 1, 6, PALETTE.sepiaInk);
    })
  },
  {
    id: "tree",
    displayName: "Tree",
    textureKey: "tile-tree",
    glyphs: ["t"],
    walkable: false,
    interactable: false,
    paint: base(PALETTE.openNetGreen, (g) => {
      rect(g, 6, 9, 4, 6, PALETTE.sepiaInk);
      rect(g, 2, 4, 12, 8, PALETTE.openNetGreen);
      rect(g, 4, 2, 8, 4, PALETTE.openNetGreen);
      rect(g, 10, 5, 2, 2, PALETTE.creamPaper);
      line(g, 2, 11, 12, 1, PALETTE.deepRuby);
    })
  },
  {
    id: "archive_shelf",
    displayName: "Archive Shelf",
    textureKey: "tile-archive-shelf",
    glyphs: ["a"],
    walkable: false,
    interactable: true,
    paint: base(PALETTE.sepiaInk, (g) => {
      rect(g, 1, 1, 14, 14, PALETTE.archiveAmber);
      line(g, 2, 4, 12, 1, PALETTE.deepRuby);
      line(g, 2, 8, 12, 1, PALETTE.deepRuby);
      rect(g, 3, 5, 2, 3, PALETTE.creamPaper);
      rect(g, 8, 9, 3, 3, PALETTE.creamPaper);
      line(g, 1, 14, 14, 1, PALETTE.black);
    })
  },
  {
    id: "desk",
    displayName: "Desk",
    textureKey: "tile-desk",
    glyphs: ["m"],
    walkable: false,
    interactable: true,
    paint: base(PALETTE.creamPaper, (g) => {
      rect(g, 1, 5, 14, 8, PALETTE.sepiaInk);
      line(g, 2, 5, 12, 1, PALETTE.goldStamp);
      rect(g, 4, 2, 8, 4, PALETTE.creamPaper);
      line(g, 5, 4, 6, 1, PALETTE.buckramRed);
    })
  },
  {
    id: "file_box",
    displayName: "File Box",
    textureKey: "tile-file-box",
    glyphs: ["q"],
    walkable: false,
    interactable: true,
    paint: base(PALETTE.creamPaper, (g) => {
      rect(g, 2, 4, 12, 9, PALETTE.archiveAmber);
      line(g, 2, 4, 12, 1, PALETTE.goldStamp);
      rect(g, 5, 7, 6, 2, PALETTE.creamPaper);
      rect(g, 11, 5, 2, 2, PALETTE.sepiaInk);
    })
  },
  {
    id: "file_cabinet",
    displayName: "File Cabinet",
    textureKey: "tile-file-cabinet",
    glyphs: ["i"],
    walkable: false,
    interactable: true,
    paint: base(PALETTE.creamPaper, (g) => {
      rect(g, 3, 2, 10, 12, PALETTE.stoneGray);
      line(g, 3, 2, 10, 1, PALETTE.white);
      line(g, 4, 6, 8, 1, PALETTE.black);
      line(g, 4, 10, 8, 1, PALETTE.black);
      rect(g, 7, 4, 2, 1, PALETTE.goldStamp);
      rect(g, 7, 8, 2, 1, PALETTE.goldStamp);
      rect(g, 7, 12, 2, 1, PALETTE.goldStamp);
    })
  },
  {
    id: "reading_table",
    displayName: "Reading Table",
    textureKey: "tile-reading-table",
    glyphs: ["u"],
    walkable: false,
    interactable: true,
    paint: base(PALETTE.creamPaper, (g) => {
      rect(g, 1, 4, 14, 8, PALETTE.sepiaInk);
      line(g, 1, 4, 14, 1, PALETTE.goldStamp);
      rect(g, 3, 2, 4, 3, PALETTE.white);
      rect(g, 9, 2, 4, 3, PALETTE.creamPaper);
      line(g, 4, 3, 2, 1, PALETTE.buckramRed);
      line(g, 10, 3, 2, 1, PALETTE.buckramRed);
    })
  },
  {
    id: "document_cart",
    displayName: "Document Cart",
    textureKey: "tile-document-cart",
    glyphs: ["c"],
    walkable: false,
    interactable: true,
    paint: base(PALETTE.creamPaper, (g) => {
      rect(g, 2, 5, 12, 6, PALETTE.archiveAmber);
      rect(g, 4, 2, 8, 4, PALETTE.creamPaper);
      line(g, 2, 11, 12, 1, PALETTE.stoneDark);
      rect(g, 3, 13, 2, 2, PALETTE.black);
      rect(g, 11, 13, 2, 2, PALETTE.black);
      line(g, 1, 4, 1, 7, PALETTE.stoneGray);
      line(g, 14, 4, 1, 7, PALETTE.stoneGray);
    })
  },
  {
    id: "door",
    displayName: "Door",
    textureKey: "tile-door",
    glyphs: ["d"],
    walkable: true,
    interactable: true,
    transitionTarget: "screen-exit",
    paint: base(PALETTE.creamPaper, (g) => {
      rect(g, 4, 2, 8, 13, PALETTE.goldStamp);
      line(g, 4, 2, 8, 1, PALETTE.white);
      rect(g, 10, 8, 1, 1, PALETTE.deepRuby);
    })
  },
  {
    id: "locked_door",
    displayName: "Locked Door",
    textureKey: "tile-locked-door",
    glyphs: ["l"],
    walkable: false,
    interactable: true,
    transitionTarget: "locked-route",
    paint: base(PALETTE.deepRuby, (g) => {
      rect(g, 4, 2, 8, 13, PALETTE.classNetRed);
      line(g, 4, 2, 8, 1, PALETTE.goldStamp);
      rect(g, 7, 7, 3, 3, PALETTE.black);
      rect(g, 8, 5, 1, 2, PALETTE.goldStamp);
    })
  },
  {
    id: "terminal",
    displayName: "Terminal",
    textureKey: "tile-terminal",
    glyphs: ["x"],
    walkable: false,
    interactable: true,
    paint: base(PALETTE.creamPaper, (g) => {
      rect(g, 2, 3, 12, 8, PALETTE.black);
      rect(g, 4, 5, 8, 3, PALETTE.terminalCyan);
      rect(g, 5, 12, 6, 2, PALETTE.stoneGray);
      rect(g, 11, 12, 2, 2, PALETTE.classNetRed);
    })
  },
  {
    id: "document_stack",
    displayName: "Document Stack",
    textureKey: "tile-document-stack",
    glyphs: ["n"],
    walkable: false,
    interactable: true,
    paint: base(PALETTE.creamPaper, (g) => {
      rect(g, 4, 3, 9, 5, PALETTE.white);
      rect(g, 3, 6, 9, 5, PALETTE.creamPaper);
      rect(g, 2, 9, 9, 5, PALETTE.white);
      line(g, 4, 5, 6, 1, PALETTE.buckramRed);
      line(g, 3, 11, 6, 1, PALETTE.buckramRed);
    })
  },
  {
    id: "redaction_barrier",
    displayName: "Redaction Barrier",
    textureKey: "tile-redaction-barrier",
    glyphs: ["z"],
    walkable: false,
    interactable: true,
    paint: base(PALETTE.creamPaper, (g) => {
      rect(g, 1, 5, 14, 6, PALETTE.black);
      rect(g, 3, 3, 3, 10, PALETTE.classNetRed);
      rect(g, 10, 3, 3, 10, PALETTE.classNetRed);
      line(g, 1, 5, 14, 1, PALETTE.goldStamp);
      line(g, 1, 10, 14, 1, PALETTE.goldStamp);
    })
  },
  {
    id: "fence",
    displayName: "Fence",
    textureKey: "tile-fence",
    glyphs: ["f"],
    walkable: false,
    interactable: false,
    paint: base(PALETTE.openNetGreen, (g) => {
      line(g, 1, 5, 14, 2, PALETTE.goldStamp);
      line(g, 1, 10, 14, 2, PALETTE.goldStamp);
      line(g, 3, 2, 2, 12, PALETTE.stoneDark);
      line(g, 11, 2, 2, 12, PALETTE.stoneDark);
    })
  },
  {
    id: "security_checkpoint",
    displayName: "Security Checkpoint",
    textureKey: "tile-security-checkpoint",
    glyphs: ["s"],
    walkable: false,
    interactable: true,
    paint: base(PALETTE.classNetRed, (g) => {
      rect(g, 1, 1, 14, 14, PALETTE.deepRuby);
      line(g, 2, 3, 12, 2, PALETTE.goldStamp);
      line(g, 2, 11, 12, 2, PALETTE.goldStamp);
      rect(g, 6, 6, 4, 4, PALETTE.black);
      rect(g, 7, 7, 2, 2, PALETTE.terminalCyan);
    })
  }
];

const TILE_BY_ID = new Map<TileId, InternalTileDefinition>(TILE_DEFINITIONS.map((tile) => [tile.id, tile]));

const GLYPH_TO_TILE: Record<string, TileId> = TILE_DEFINITIONS.reduce<Record<string, TileId>>((result, tile) => {
  for (const glyph of tile.glyphs) result[glyph] = tile.id;
  return result;
}, {});

const PATH_GLYPHS = new Set(["p", "d", "b"]);

export function getTileRegistryReadout() {
  return TILE_DEFINITIONS.map(({ paint: _paint, ...tile }) => ({
    ...tile,
    glyphs: [...tile.glyphs]
  }));
}

export class TileRegistry {
  private readonly definitions = TILE_BY_ID;

  constructor(scene: Phaser.Scene) {
    this.ensureTextures(scene);
  }

  readout() {
    return getTileRegistryReadout();
  }

  resolveTile(layout: string[], column: number, row: number) {
    const glyph = layout[row]?.[column] ?? "g";
    const id = this.resolveTileId(layout, column, row, glyph);
    return this.definitions.get(id) ?? this.definitions.get("grass")!;
  }

  tileForGlyph(glyph: string) {
    return this.definitions.get(GLYPH_TO_TILE[glyph] ?? "grass") ?? this.definitions.get("grass")!;
  }

  private resolveTileId(layout: string[], column: number, row: number, glyph: string): TileId {
    if (glyph === "p") return this.resolvePathVariant(layout, column, row);
    if (glyph === "r") {
      const north = layout[row - 1]?.[column];
      return north === "r" ? "wall_side" : "wall_top";
    }
    return GLYPH_TO_TILE[glyph] ?? "grass";
  }

  private resolvePathVariant(layout: string[], column: number, row: number): TileId {
    const north = PATH_GLYPHS.has(layout[row - 1]?.[column] ?? "");
    const south = PATH_GLYPHS.has(layout[row + 1]?.[column] ?? "");
    const west = PATH_GLYPHS.has(layout[row]?.[column - 1] ?? "");
    const east = PATH_GLYPHS.has(layout[row]?.[column + 1] ?? "");
    const connections = [north, south, west, east].filter(Boolean).length;
    if (connections >= 3) return "path_cross";
    if (north && east) return "path_corner_ne";
    if (north && west) return "path_corner_nw";
    if (south && east) return "path_corner_se";
    if (south && west) return "path_corner_sw";
    if (north || south) return "path_vertical";
    return "path_horizontal";
  }

  private ensureTextures(scene: Phaser.Scene) {
    for (const tile of TILE_DEFINITIONS) {
      if (scene.textures.exists(tile.textureKey)) continue;
      const graphics = scene.add.graphics();
      tile.paint(graphics);
      graphics.generateTexture(tile.textureKey, WORLD_TILE_SIZE, WORLD_TILE_SIZE);
      graphics.destroy();
    }
  }
}
