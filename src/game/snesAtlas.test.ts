import { describe, expect, it } from "vitest";
import {
  getSnesAtlasReadout,
  SNES_ARCHIVE_COMPASS_RELIC_ASSET,
  SNES_ARCHIVE_PROP_ASSET,
  SNES_ARCHIVE_ROOM_DETAIL_ASSET,
  SNES_ARCHIVE_TILE_ASSET,
  SNES_ARCHIVE_WALL_MAP_BOARD_ASSET,
  SNES_COVER_FRAGMENT_RELIC_ASSET,
  SNES_DECLASS_REVIEWER_FRAME_SHEET,
  SNES_DUNGEON_STATUS_RELIC_ASSET,
  SNES_EDITOR_FRAME_SHEET,
  SNES_EQUITY_CRYSTAL_RELIC_ASSET,
  SNES_FIRST_HOUR_TRAINING_RELIC_ASSET,
  SNES_GATE_GLYPH_ASSET,
  SNES_GUIDE_CAVERN_TILE_ASSET,
  SNES_NETWORK_TILE_ASSET,
  SNES_OFFICE_TILE_ASSET,
  SNES_PROOFREADER_FRAME_SHEET,
  SNES_PROCESS_STAMP_RELIC_ASSET,
  SNES_PUBLISHED_FRUS_PRIZE_ASSET,
  SNES_REFERRAL_VAULT_TILE_ASSET,
  SNES_RESEARCH_PENDANT_RELIC_ASSET,
  SNES_ROOM_MAP_MARKER_ASSET,
  SNES_ROUTE_ARROW_RELIC_ASSET,
  SNES_SOURCE_NOTE_SPECIALIST_FRAME_SHEET,
  SNES_WORKFLOW_TOOL_RELIC_ASSET,
  SNES_WORLD_ATLAS_RELIC_ASSET
} from "./snesAtlas";

describe("SNES atlas relic assets", () => {
  it("registers original one-hour, archive compass, and world atlas relics", () => {
    expect(SNES_FIRST_HOUR_TRAINING_RELIC_ASSET).toMatchObject({
      key: "snes-first-hour-training-relic",
      path: "assets/sprites/snes-first-hour-training-relic.svg",
      dimensions: { width: 24, height: 24 }
    });
    expect(SNES_ARCHIVE_COMPASS_RELIC_ASSET).toMatchObject({
      key: "snes-archive-compass-relic",
      path: "assets/sprites/snes-archive-compass-relic.svg",
      dimensions: { width: 24, height: 24 }
    });
    expect(SNES_ARCHIVE_WALL_MAP_BOARD_ASSET).toMatchObject({
      key: "snes-archive-wall-map-board",
      path: "assets/sprites/snes-archive-wall-map-board.svg",
      dimensions: { width: 48, height: 30 }
    });
    expect(SNES_ARCHIVE_PROP_ASSET).toMatchObject({
      key: "snes-archive-props",
      path: "assets/sprites/snes-archive-props.svg",
      dimensions: { width: 320, height: 48 },
      frame: { width: 64, height: 48 },
      frames: ["bookcase", "desk", "document_stack", "ruby_volumes", "research_table"]
    });
    expect(SNES_ARCHIVE_TILE_ASSET).toMatchObject({
      key: "snes-archive-tiles",
      path: "assets/sprites/snes-archive-tiles.svg",
      dimensions: { width: 128, height: 16 },
      frame: { width: 16, height: 16 },
      frames: ["floor_base", "floor_crack", "floor_dot", "floor_ruby", "wall_top", "wall_front", "wall_side", "floor_shadow"]
    });
    expect(SNES_OFFICE_TILE_ASSET).toMatchObject({
      key: "snes-office-tiles",
      path: "assets/sprites/snes-office-tiles.svg",
      dimensions: { width: 128, height: 16 },
      frame: { width: 16, height: 16 },
      frames: ["floor_base", "floor_shadow", "floor_scuff", "rug_center", "rug_edge", "wall_top", "wall_bookcase", "desk_top"]
    });
    expect(SNES_GUIDE_CAVERN_TILE_ASSET).toMatchObject({
      key: "snes-guide-cavern-tiles",
      path: "assets/sprites/snes-guide-cavern-tiles.svg",
      dimensions: { width: 128, height: 16 },
      frame: { width: 16, height: 16 },
      frames: ["floor_base", "floor_scuff", "floor_ruby", "wall_top", "wall_front", "wall_shadow", "threshold_gate", "pedestal_tile"]
    });
    expect(SNES_NETWORK_TILE_ASSET).toMatchObject({
      key: "snes-network-tiles",
      path: "assets/sprites/snes-network-tiles.svg",
      dimensions: { width: 128, height: 16 },
      frame: { width: 16, height: 16 },
      frames: ["open_floor", "class_floor", "cable_cross", "terminal_pad", "class_terminal", "firewall_gate", "vault_wall", "token_plinth"]
    });
    expect(SNES_REFERRAL_VAULT_TILE_ASSET).toMatchObject({
      key: "snes-referral-vault-tiles",
      path: "assets/sprites/snes-referral-vault-tiles.svg",
      dimensions: { width: 128, height: 16 },
      frame: { width: 16, height: 16 },
      frames: [
        "equity_floor",
        "referral_channel",
        "agency_seal_tile",
        "manifest_desk",
        "excision_gate",
        "concurrence_wall",
        "slip_plinth",
        "archive_floor"
      ]
    });
    expect(SNES_ARCHIVE_ROOM_DETAIL_ASSET).toMatchObject({
      key: "snes-archive-room-details",
      path: "assets/sprites/snes-archive-room-details.svg",
      dimensions: { width: 96, height: 16 },
      frame: { width: 16, height: 16 },
      frames: ["floor_scuff", "corner_shadow", "wall_cap", "threshold_open", "threshold_locked", "threshold_boss"]
    });
    expect(SNES_WORLD_ATLAS_RELIC_ASSET).toMatchObject({
      key: "snes-world-atlas-relic",
      path: "assets/sprites/snes-world-atlas-relic.svg",
      dimensions: { width: 24, height: 24 }
    });
    expect(SNES_ROUTE_ARROW_RELIC_ASSET).toMatchObject({
      key: "snes-route-arrows",
      path: "assets/sprites/snes-route-arrows.svg",
      dimensions: { width: 48, height: 12 },
      frame: { width: 12, height: 12 },
      frames: ["north", "east", "south", "west"]
    });
    expect(SNES_DUNGEON_STATUS_RELIC_ASSET).toMatchObject({
      key: "snes-dungeon-status-relics",
      path: "assets/sprites/snes-dungeon-status-relics.svg",
      dimensions: { width: 48, height: 12 },
      frame: { width: 12, height: 12 },
      frames: ["small_key", "big_key", "map", "boss"]
    });
    expect(SNES_ROOM_MAP_MARKER_ASSET).toMatchObject({
      key: "snes-room-map-markers",
      path: "assets/sprites/snes-room-map-markers.svg",
      dimensions: { width: 30, height: 6 },
      frame: { width: 6, height: 6 },
      frames: ["visited", "current", "locked", "boss", "reward"]
    });
    expect(SNES_GATE_GLYPH_ASSET).toMatchObject({
      key: "snes-gate-glyphs",
      path: "assets/sprites/snes-gate-glyphs.svg",
      dimensions: { width: 60, height: 12 },
      frame: { width: 12, height: 12 },
      frames: ["open", "locked", "sealed", "secret", "boss"]
    });
    expect(SNES_WORKFLOW_TOOL_RELIC_ASSET).toMatchObject({
      key: "snes-workflow-tools",
      path: "assets/sprites/snes-workflow-tools.svg",
      dimensions: { width: 128, height: 32 },
      frame: { width: 16, height: 32 },
      frames: [
        "citation_stamp",
        "source_note_card",
        "cross_reference_thread",
        "terminal",
        "frus_volume",
        "red_pencil",
        "proof_pages",
        "concurrence_slip"
      ]
    });
    expect(SNES_RESEARCH_PENDANT_RELIC_ASSET).toMatchObject({
      key: "snes-research-pendants",
      path: "assets/sprites/snes-research-pendants.svg",
      dimensions: { width: 30, height: 10 },
      frame: { width: 10, height: 10 },
      frames: ["objectivity", "provenance", "review"]
    });
    expect(SNES_EQUITY_CRYSTAL_RELIC_ASSET).toMatchObject({
      key: "snes-equity-crystals",
      path: "assets/sprites/snes-equity-crystals.svg",
      dimensions: { width: 40, height: 10 },
      frame: { width: 8, height: 10 },
      frames: ["defense", "intelligence", "diplomatic", "foreign", "privacy"]
    });
    expect(SNES_COVER_FRAGMENT_RELIC_ASSET).toMatchObject({
      key: "snes-cover-fragments",
      path: "assets/sprites/snes-cover-fragments.svg",
      dimensions: { width: 15, height: 10 },
      frame: { width: 3, height: 10 },
      frames: ["spine", "title", "years", "seal", "imprint"]
    });
    expect(SNES_PROCESS_STAMP_RELIC_ASSET).toMatchObject({
      key: "snes-process-stamps",
      path: "assets/sprites/snes-process-stamps.svg",
      dimensions: { width: 72, height: 12 },
      frame: { width: 12, height: 12 },
      frames: ["rule", "archive", "network", "referral", "sop", "proof"]
    });
    expect(SNES_PUBLISHED_FRUS_PRIZE_ASSET).toMatchObject({
      key: "frus-prize-cover",
      path: "assets/sprites/frus-prize-cover.svg",
      dimensions: { width: 80, height: 120 }
    });

    const readout = getSnesAtlasReadout();
    expect(readout.firstHourTrainingRelic.texture).toBe(SNES_FIRST_HOUR_TRAINING_RELIC_ASSET.key);
    expect(readout.archiveCompassRelic.texture).toBe(SNES_ARCHIVE_COMPASS_RELIC_ASSET.key);
    expect(readout.archiveWallMapBoard.texture).toBe(SNES_ARCHIVE_WALL_MAP_BOARD_ASSET.key);
    expect(readout.archiveProps.texture).toBe(SNES_ARCHIVE_PROP_ASSET.key);
    expect(readout.archiveProps.frames).toEqual(["bookcase", "desk", "document_stack", "ruby_volumes", "research_table"]);
    expect(readout.archiveTiles.texture).toBe(SNES_ARCHIVE_TILE_ASSET.key);
    expect(readout.archiveTiles.frames).toEqual([
      "floor_base",
      "floor_crack",
      "floor_dot",
      "floor_ruby",
      "wall_top",
      "wall_front",
      "wall_side",
      "floor_shadow"
    ]);
    expect(readout.officeTiles.texture).toBe(SNES_OFFICE_TILE_ASSET.key);
    expect(readout.officeTiles.frames).toEqual([
      "floor_base",
      "floor_shadow",
      "floor_scuff",
      "rug_center",
      "rug_edge",
      "wall_top",
      "wall_bookcase",
      "desk_top"
    ]);
    expect(readout.guideCavernTiles.texture).toBe(SNES_GUIDE_CAVERN_TILE_ASSET.key);
    expect(readout.guideCavernTiles.frames).toEqual([
      "floor_base",
      "floor_scuff",
      "floor_ruby",
      "wall_top",
      "wall_front",
      "wall_shadow",
      "threshold_gate",
      "pedestal_tile"
    ]);
    expect(readout.networkTiles.texture).toBe(SNES_NETWORK_TILE_ASSET.key);
    expect(readout.networkTiles.frames).toEqual([
      "open_floor",
      "class_floor",
      "cable_cross",
      "terminal_pad",
      "class_terminal",
      "firewall_gate",
      "vault_wall",
      "token_plinth"
    ]);
    expect(readout.referralVaultTiles.texture).toBe(SNES_REFERRAL_VAULT_TILE_ASSET.key);
    expect(readout.referralVaultTiles.frames).toEqual([
      "equity_floor",
      "referral_channel",
      "agency_seal_tile",
      "manifest_desk",
      "excision_gate",
      "concurrence_wall",
      "slip_plinth",
      "archive_floor"
    ]);
    expect(readout.archiveRoomDetails.texture).toBe(SNES_ARCHIVE_ROOM_DETAIL_ASSET.key);
    expect(readout.archiveRoomDetails.frames).toEqual([
      "floor_scuff",
      "corner_shadow",
      "wall_cap",
      "threshold_open",
      "threshold_locked",
      "threshold_boss"
    ]);
    expect(readout.worldAtlasRelic.texture).toBe(SNES_WORLD_ATLAS_RELIC_ASSET.key);
    expect(readout.routeArrowRelics.texture).toBe(SNES_ROUTE_ARROW_RELIC_ASSET.key);
    expect(readout.routeArrowRelics.frames).toEqual(["north", "east", "south", "west"]);
    expect(readout.dungeonStatusRelics.texture).toBe(SNES_DUNGEON_STATUS_RELIC_ASSET.key);
    expect(readout.dungeonStatusRelics.frames).toEqual(["small_key", "big_key", "map", "boss"]);
    expect(readout.roomMapMarkers.texture).toBe(SNES_ROOM_MAP_MARKER_ASSET.key);
    expect(readout.roomMapMarkers.frames).toEqual(["visited", "current", "locked", "boss", "reward"]);
    expect(readout.gateGlyphs.texture).toBe(SNES_GATE_GLYPH_ASSET.key);
    expect(readout.gateGlyphs.frames).toEqual(["open", "locked", "sealed", "secret", "boss"]);
    expect(readout.workflowToolRelics.texture).toBe(SNES_WORKFLOW_TOOL_RELIC_ASSET.key);
    expect(readout.workflowToolRelics.frames).toEqual([
      "citation_stamp",
      "source_note_card",
      "cross_reference_thread",
      "terminal",
      "frus_volume",
      "red_pencil",
      "proof_pages",
      "concurrence_slip"
    ]);
    expect(readout.researchPendantRelics.texture).toBe(SNES_RESEARCH_PENDANT_RELIC_ASSET.key);
    expect(readout.researchPendantRelics.frames).toEqual(["objectivity", "provenance", "review"]);
    expect(readout.equityCrystalRelics.texture).toBe(SNES_EQUITY_CRYSTAL_RELIC_ASSET.key);
    expect(readout.equityCrystalRelics.frames).toEqual(["defense", "intelligence", "diplomatic", "foreign", "privacy"]);
    expect(readout.coverFragmentRelics.texture).toBe(SNES_COVER_FRAGMENT_RELIC_ASSET.key);
    expect(readout.coverFragmentRelics.frames).toEqual(["spine", "title", "years", "seal", "imprint"]);
    expect(readout.processStampRelics.texture).toBe(SNES_PROCESS_STAMP_RELIC_ASSET.key);
    expect(readout.processStampRelics.frames).toEqual(["rule", "archive", "network", "referral", "sop", "proof"]);
    expect(readout.publishedFrusPrize.texture).toBe(SNES_PUBLISHED_FRUS_PRIZE_ASSET.key);
    expect(readout.publishedFrusPrize.displayName).toBe("Published FRUS Prize Cover");
    expect(readout.roleFrameSets.map((sheet) => sheet.roleId).sort()).toEqual([
      "compiler",
      "declass_reviewer",
      "editor",
      "proofreader",
      "source_note_specialist"
    ]);
    expect(readout.roleFrameSets.every((sheet) => (
      sheet.frame.width === 32
      && sheet.frame.height === 48
      && sheet.frameCount === 19
      && sheet.frames.includes("walk-right-2")
      && sheet.frames.includes("read")
    ))).toBe(true);
    expect(readout.assets.map((asset) => asset.key)).toEqual(expect.arrayContaining([
      SNES_FIRST_HOUR_TRAINING_RELIC_ASSET.key,
      SNES_ARCHIVE_COMPASS_RELIC_ASSET.key,
      SNES_ARCHIVE_PROP_ASSET.key,
      SNES_ARCHIVE_TILE_ASSET.key,
      SNES_OFFICE_TILE_ASSET.key,
      SNES_REFERRAL_VAULT_TILE_ASSET.key,
      SNES_ARCHIVE_ROOM_DETAIL_ASSET.key,
      SNES_WORLD_ATLAS_RELIC_ASSET.key,
      SNES_ROUTE_ARROW_RELIC_ASSET.key,
      SNES_DUNGEON_STATUS_RELIC_ASSET.key,
      SNES_ROOM_MAP_MARKER_ASSET.key,
      SNES_WORKFLOW_TOOL_RELIC_ASSET.key,
      SNES_RESEARCH_PENDANT_RELIC_ASSET.key,
      SNES_EQUITY_CRYSTAL_RELIC_ASSET.key,
      SNES_COVER_FRAGMENT_RELIC_ASSET.key,
      SNES_PROCESS_STAMP_RELIC_ASSET.key,
      SNES_PUBLISHED_FRUS_PRIZE_ASSET.key,
      SNES_EDITOR_FRAME_SHEET.key,
      SNES_PROOFREADER_FRAME_SHEET.key,
      SNES_DECLASS_REVIEWER_FRAME_SHEET.key,
      SNES_SOURCE_NOTE_SPECIALIST_FRAME_SHEET.key
    ]));
  });
});
