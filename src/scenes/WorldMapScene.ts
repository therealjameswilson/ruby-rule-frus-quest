import Phaser from "phaser";
import { OVERWORLD_REGIONS, publicAssetPath, type GameplayMapKey, type OverworldRegionKey } from "../assets/registry";
import { DISTRICTS, REGION_LABELS, REGION_ORDER, districtsForRegion, type District } from "../data/regions";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { SNES_ROUTE_ARROW_RELIC_ASSET, SNES_WORLD_ATLAS_RELIC_ASSET } from "../game/snesAtlas";
import { setLatestMessage, setNearestInteractable, setSceneState, setVisibleEntities, setVisibleThreats } from "../game/state";
import { bindPointerPress, getInput, tickInput } from "../input/InputState";
import { retroAudio } from "../systems/audio";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

type FitRect = { x: number; y: number; width: number; height: number; scale: number; sourceWidth: number; sourceHeight: number };

const TOP_SAFE_BAND = 32;
const BOTTOM_SAFE_BAND = 26;

type ScreenPoint = { x: number; y: number };
type DistrictGlyphPart = {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
  alpha?: number;
};

export class WorldMapScene extends Phaser.Scene {
  private currentRegion: OverworldRegionKey = "europe";
  private regionIndex = 0;
  private startRegion: OverworldRegionKey | null = null;
  private mapLayer?: Phaser.GameObjects.Container;
  private districtLayer?: Phaser.GameObjects.Container;
  private overlayLayer?: Phaser.GameObjects.Container;
  private regionTitle?: Phaser.GameObjects.Text;
  private tooltip?: Phaser.GameObjects.Text;
  private routePreview?: Phaser.GameObjects.Container;
  private selectedRouteCursor?: Phaser.GameObjects.Container;
  private modal?: Phaser.GameObjects.Container;
  private fitRect: FitRect | null = null;
  private numberKeysInstalled = false;
  private selectedDistrictNumber = 1;

  constructor() {
    super("WorldMapScene");
  }

  init(data: { region?: OverworldRegionKey }) {
    this.startRegion = data.region && data.region in OVERWORLD_REGIONS ? data.region : null;
  }

  preload() {
    for (const [key, path] of Object.entries(OVERWORLD_REGIONS)) {
      if (!this.textures.exists(key)) this.load.image(key, publicAssetPath(path));
    }
  }

  create() {
    setSceneState("WorldMapScene", "explore", "Select a FRUS region.");
    setVisibleThreats([]);
    this.currentRegion = this.startRegion ?? this.regionFromQuery();
    this.regionIndex = REGION_ORDER.indexOf(this.currentRegion);
    if (this.regionIndex < 0) this.regionIndex = 0;
    this.currentRegion = REGION_ORDER[this.regionIndex];
    retroAudio.startMusic("TitleScene");
    this.cameras.main.setBackgroundColor(PALETTE.black);
    this.createChrome();
    this.installNumberShortcuts();
    this.renderRegion();
  }

  update() {
    tickInput();
    const input = getInput();
    if (this.modal) {
      if (input.aJustPressed || input.bJustPressed || input.startJustPressed || input.pointerPrimaryJustPressed) this.closeModal();
      return;
    }
    if (input.navLeftJustPressed) this.cycleRegion(-1);
    if (input.navRightJustPressed) this.cycleRegion(1);
    if (input.navUpJustPressed) this.cycleDistrict(-1);
    if (input.navDownJustPressed) this.cycleDistrict(1);
    if (input.aJustPressed || input.startJustPressed) {
      const district = this.selectedDistrict();
      if (district) this.activateDistrict(district);
    }
  }

  private regionFromQuery(): OverworldRegionKey {
    const rawRegion = new URLSearchParams(window.location.search).get("region");
    if (rawRegion && rawRegion in OVERWORLD_REGIONS) return rawRegion as OverworldRegionKey;
    return "europe";
  }

  private createChrome() {
    this.add.rectangle(GAME_WIDTH / 2, 15, GAME_WIDTH, 30, color(PALETTE.black)).setDepth(900);
    this.add.rectangle(GAME_WIDTH / 2, 30, GAME_WIDTH, 2, color(PALETTE.goldStamp)).setDepth(901);
    this.regionTitle = this.add.text(GAME_WIDTH / 2, 6, "", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5, 0).setDepth(902);

    const leftButton = this.add.rectangle(16, 15, 24, 18, color(PALETTE.deepRuby)).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(902);
    this.add.text(16, 9, "<", { fontFamily: "monospace", fontSize: "10px", color: PALETTE.goldStamp }).setOrigin(0.5, 0).setDepth(903);
    bindPointerPress(leftButton, { down: () => this.cycleRegion(-1) });

    const rightButton = this.add.rectangle(240, 15, 24, 18, color(PALETTE.deepRuby)).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(902);
    this.add.text(240, 9, ">", { fontFamily: "monospace", fontSize: "10px", color: PALETTE.goldStamp }).setOrigin(0.5, 0).setDepth(903);
    bindPointerPress(rightButton, { down: () => this.cycleRegion(1) });

    this.drawWorldAtlasRelic(226, TOP_SAFE_BAND + 11);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 13, GAME_WIDTH, BOTTOM_SAFE_BAND, color(PALETTE.black)).setDepth(900);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - BOTTOM_SAFE_BAND, GAME_WIDTH, 2, color(PALETTE.goldStamp)).setDepth(901);
    this.tooltip = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 19, "HOVER A CARTOUCHE", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.goldStamp,
      align: "center"
    }).setOrigin(0.5, 0).setDepth(902).setVisible(false);
  }

  private drawWorldAtlasRelic(x: number, y: number) {
    this.add.rectangle(x, y, 29, 22, color(PALETTE.black), 0.92)
      .setName("world-map-atlas-relic-panel")
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.9)
      .setDepth(902);

    if (this.textures.exists(SNES_WORLD_ATLAS_RELIC_ASSET.key)) {
      this.add.image(x - 4, y - 1, SNES_WORLD_ATLAS_RELIC_ASSET.key)
        .setName("world-map-atlas-relic")
        .setDepth(903);
    } else {
      this.add.rectangle(x - 4, y - 1, 18, 18, color(PALETTE.terminalCyan), 0.86)
        .setName("world-map-atlas-relic-fallback")
        .setStrokeStyle(1, color(PALETTE.goldStamp))
        .setDepth(903);
    }

    this.add.text(x + 7, y - 6, "MAP", {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.goldStamp,
      backgroundColor: PALETTE.black
    }).setName("world-map-atlas-relic-label").setOrigin(0.5, 0).setDepth(904);
  }

  private installNumberShortcuts() {
    if (this.numberKeysInstalled || !this.input.keyboard) return;
    this.numberKeysInstalled = true;
    const handler = (event: KeyboardEvent) => {
      const index = Number.parseInt(event.key, 10) - 1;
      if (Number.isInteger(index) && index >= 0 && index < REGION_ORDER.length) this.selectRegion(index);
    };
    this.input.keyboard.on("keydown", handler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown", handler);
      this.numberKeysInstalled = false;
    });
  }

  private renderRegion() {
    this.routePreview?.destroy();
    this.routePreview = undefined;
    this.selectedRouteCursor?.destroy();
    this.selectedRouteCursor = undefined;
    this.mapLayer?.destroy();
    this.districtLayer?.destroy();
    this.overlayLayer?.destroy();
    this.modal?.destroy();
    this.modal = undefined;
    setNearestInteractable(null);
    const regionLabel = REGION_LABELS[this.currentRegion];
    this.regionTitle?.setText(`REGION: ${regionLabel.toUpperCase()}  [1-5]`);

    this.mapLayer = this.add.container(0, 0).setDepth(10);
    this.districtLayer = this.add.container(0, 0).setDepth(40);
    this.overlayLayer = this.add.container(0, 0).setDepth(50);

    const fit = this.computeMapFit(this.currentRegion);
    this.fitRect = fit;
    const map = this.add.image(fit.x, fit.y, this.currentRegion).setOrigin(0, 0).setScale(fit.scale).setDepth(10);
    map.setTexture(this.currentRegion);
    this.mapLayer.add(map);

    const districts = districtsForRegion(this.currentRegion);
    setVisibleEntities(districts.map((district) => `${district.number}. ${district.displayName} -> ${district.destinationScene ?? "unrouted"}`));
    setLatestMessage(`World Map: ${regionLabel}`);

    this.drawSnesRouteOverlay(districts, fit);
    for (const district of districts) this.createDistrictZone(district, fit);
    this.selectedDistrictNumber = this.clampedDistrictNumber(this.selectedDistrictNumber, districts);
    this.drawSelectedDistrictState();
  }

  private computeMapFit(region: OverworldRegionKey): FitRect {
    const texture = this.textures.get(region);
    const source = texture.getSourceImage() as { width: number; height: number };
    const maxWidth = GAME_WIDTH;
    const maxHeight = GAME_HEIGHT - TOP_SAFE_BAND - BOTTOM_SAFE_BAND;
    const scale = Math.min(maxWidth / source.width, maxHeight / source.height);
    const width = Math.round(source.width * scale);
    const height = Math.round(source.height * scale);
    return {
      x: Math.round((GAME_WIDTH - width) / 2),
      y: TOP_SAFE_BAND + Math.round((maxHeight - height) / 2),
      width,
      height,
      scale,
      sourceWidth: source.width,
      sourceHeight: source.height
    };
  }

  private createDistrictZone(district: District, fit: FitRect) {
    const x = fit.x + district.bounds.x * fit.scale;
    const y = fit.y + district.bounds.y * fit.scale;
    const width = district.bounds.w * fit.scale;
    const height = district.bounds.h * fit.scale;
    const zone = this.add.rectangle(x + width / 2, y + height / 2, width, height, color(PALETTE.goldStamp), 0)
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0)
      .setDepth(41);
    bindPointerPress(zone, { down: () => this.activateDistrict(district) });
    zone.on("pointerover", () => this.hoverDistrict(district, zone));
    zone.on("pointerout", () => this.clearDistrictHover(zone));
    this.districtLayer?.add(zone);
  }

  private drawSnesRouteOverlay(districts: readonly District[], fit: FitRect) {
    if (!this.overlayLayer) return;
    const points = districts.map((district) => ({ district, point: this.districtCenter(district, fit) }));
    const routed = points.filter(({ district }) => !district.locked && district.destinationScene);

    for (let index = 1; index < routed.length; index += 1) {
      this.addRouteSegment(routed[index - 1].point, routed[index].point, index);
    }

    for (const { district, point } of points) {
      this.addDistrictSeal(district, point);
    }

    this.addRouteLegend();
  }

  private districtCenter(district: District, fit: FitRect): ScreenPoint {
    return {
      x: Math.round(fit.x + (district.bounds.x + district.bounds.w / 2) * fit.scale),
      y: Math.round(fit.y + (district.bounds.y + district.bounds.h / 2) * fit.scale)
    };
  }

  private addRouteSegment(a: ScreenPoint, b: ScreenPoint, index: number) {
    if (!this.overlayLayer) return;
    const graphics = this.add.graphics().setDepth(48);
    const midX = Math.round((a.x + b.x) / 2);
    const midY = Math.round((a.y + b.y) / 2);
    graphics.lineStyle(3, color(PALETTE.black), 0.52);
    graphics.lineBetween(a.x, a.y, midX, midY);
    graphics.lineBetween(midX, midY, b.x, b.y);
    graphics.lineStyle(1, color(index % 2 === 0 ? PALETTE.goldStamp : PALETTE.paleGold), 0.82);
    graphics.lineBetween(a.x, a.y, midX, midY);
    graphics.lineBetween(midX, midY, b.x, b.y);
    graphics.name = "snes-world-route-thread";
    this.overlayLayer.add(graphics);
  }

  private addDistrictSeal(district: District, point: ScreenPoint) {
    if (!this.overlayLayer) return;
    const routed = Boolean(district.destinationScene);
    const locked = Boolean(district.locked);
    const container = this.add.container(point.x, point.y).setDepth(52);
    container.name = "snes-world-district-seal";

    const shadow = this.add.ellipse(1, 7, 19, 7, color(PALETTE.black), 0.5);
    shadow.name = "snes-world-district-shadow";
    const seal = this.add.rectangle(0, 0, 15, 15, color(locked ? PALETTE.black : PALETTE.deepRuby), 0.94)
      .setStrokeStyle(2, color(locked ? PALETTE.classNetRed : PALETTE.goldStamp));
    seal.name = "snes-world-district-cartouche";
    const number = this.add.text(0, -6, String(district.number), {
      fontFamily: "monospace",
      fontSize: "8px",
      color: locked ? PALETTE.classNetRed : PALETTE.creamPaper,
      align: "center"
    }).setOrigin(0.5, 0);
    number.name = "snes-world-district-number";
    container.add([shadow, seal, number]);

    this.addDestinationGlyph(container, district.destinationScene, routed, locked);
    if (locked) {
      const barA = this.add.rectangle(0, -1, 21, 3, color(PALETTE.classNetRed), 0.94).setAngle(-18);
      barA.name = "snes-world-district-redaction-bar";
      const barB = this.add.rectangle(0, 4, 19, 2, color(PALETTE.classNetRed), 0.78).setAngle(12);
      barB.name = "snes-world-district-redaction-bar";
      container.add([barA, barB]);
    }

    this.overlayLayer.add(container);
  }

  private addDestinationGlyph(
    container: Phaser.GameObjects.Container,
    mapKey: GameplayMapKey | undefined,
    routed: boolean,
    locked: boolean,
    offset: ScreenPoint = { x: 0, y: 0 }
  ) {
    const accent = locked
      ? PALETTE.classNetRed
      : routed
        ? this.destinationAccent(mapKey)
        : PALETTE.stoneGray;
    const frame = this.add.rectangle(offset.x + 9, offset.y + 9, 10, 8, color(PALETTE.black), 0.84)
      .setStrokeStyle(1, color(accent), 0.9);
    frame.name = "snes-world-district-destination-frame";
    container.add(frame);

    if (!routed || !mapKey) {
      const mark = this.add.text(offset.x + 9, offset.y + 5, "?", {
        fontFamily: "monospace",
        fontSize: "7px",
        color: PALETTE.stoneLight
      }).setOrigin(0.5, 0);
      mark.name = "snes-world-district-unrouted-mark";
      container.add(mark);
      return;
    }

    const glyph = this.destinationGlyph(mapKey);
    for (const part of glyph) {
      const rect = this.add.rectangle(offset.x + 9 + part.x, offset.y + 9 + part.y, part.w, part.h, color(part.color ?? accent), part.alpha ?? 1);
      rect.name = `snes-world-district-${part.name}`;
      container.add(rect);
    }
  }

  private destinationGlyph(mapKey: GameplayMapKey): readonly DistrictGlyphPart[] {
    if (mapKey === "nara_stacks") {
      return [
        { name: "archive-stack-a", x: -3, y: 0, w: 2, h: 7 },
        { name: "archive-stack-b", x: 0, y: -1, w: 2, h: 8 },
        { name: "archive-stack-c", x: 3, y: 0, w: 2, h: 7 }
      ] as const;
    }
    if (mapKey === "embassy") {
      return [
        { name: "embassy-flag-pole", x: -3, y: 0, w: 1, h: 7 },
        { name: "embassy-flag", x: 0, y: -2, w: 5, h: 3 },
        { name: "embassy-base", x: -3, y: 4, w: 7, h: 2, color: PALETTE.deepBrown }
      ] as const;
    }
    if (mapKey === "west_wing" || mapKey === "capitol_hill") {
      return [
        { name: "federal-column-a", x: -4, y: 0, w: 1, h: 6 },
        { name: "federal-column-b", x: -1, y: 0, w: 1, h: 6 },
        { name: "federal-column-c", x: 2, y: 0, w: 1, h: 6 },
        { name: "federal-roof", x: -4, y: -3, w: 8, h: 2 }
      ] as const;
    }
    if (mapKey === "black_vault") {
      return [
        { name: "vault-core", x: -3, y: -3, w: 6, h: 6, color: PALETTE.classNetRed },
        { name: "vault-lock", x: -1, y: 1, w: 2, h: 5, color: PALETTE.goldStamp }
      ] as const;
    }
    if (mapKey === "frus_floor" || mapKey === "historian_office") {
      return [
        { name: "frus-volume", x: -3, y: -3, w: 6, h: 8, color: PALETTE.deepRuby },
        { name: "frus-volume-band", x: -1, y: -2, w: 1, h: 7, color: PALETTE.goldStamp }
      ] as const;
    }
    return [
      { name: "field-office", x: -3, y: 0, w: 6, h: 5 },
      { name: "field-office-roof", x: -4, y: -3, w: 8, h: 2, color: PALETTE.deepRuby }
    ] as const;
  }

  private destinationAccent(mapKey: GameplayMapKey | undefined) {
    if (mapKey === "black_vault") return PALETTE.classNetRed;
    if (mapKey === "embassy") return PALETTE.terminalCyan;
    if (mapKey === "nara_stacks") return PALETTE.stoneLight;
    if (mapKey === "capitol_hill" || mapKey === "west_wing") return PALETTE.paleGold;
    if (mapKey === "frus_floor" || mapKey === "historian_office") return PALETTE.goldStamp;
    return PALETTE.openNetGreen;
  }

  private addRouteLegend() {
    if (!this.overlayLayer) return;
    const legend = this.add.container(64, TOP_SAFE_BAND + 9).setDepth(55);
    legend.name = "snes-world-route-legend";
    const panel = this.add.rectangle(0, 0, 124, 13, color(PALETTE.black), 0.78)
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.72);
    panel.name = "snes-world-route-legend-panel";
    const text = this.add.text(0, -5, "A ENTER  ↑↓ ROUTE  ←→ REGION", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.terminalCyan,
      align: "center"
    }).setOrigin(0.5, 0);
    text.name = "snes-world-route-legend-text";
    legend.add([panel, text]);
    this.overlayLayer.add(legend);
  }

  private hoverDistrict(district: District, zone: Phaser.GameObjects.Rectangle) {
    zone.setFillStyle(color(PALETTE.goldStamp), 0.2);
    zone.setStrokeStyle(1, color(PALETTE.creamPaper), 0.9);
    this.selectedDistrictNumber = district.number;
    this.drawSelectedDistrictState();
    setNearestInteractable(district.displayName);
    setLatestMessage(`World Map hover: ${district.displayName}`);
  }

  private clearDistrictHover(zone: Phaser.GameObjects.Rectangle) {
    zone.setFillStyle(color(PALETTE.goldStamp), 0);
    zone.setStrokeStyle(1, color(PALETTE.goldStamp), 0);
    this.tooltip?.setVisible(false);
    setNearestInteractable(null);
  }

  private drawSelectedDistrictState() {
    const district = this.selectedDistrict();
    this.drawRoutePreview(district);
    this.drawSelectedRouteCursor(district);
    this.tooltip?.setVisible(false);
    if (!district) return;
    setNearestInteractable(district.displayName);
    setLatestMessage(`World Map selected: ${district.displayName}`);
  }

  private drawSelectedRouteCursor(district: District | null) {
    this.selectedRouteCursor?.destroy();
    this.selectedRouteCursor = undefined;
    if (!district || !this.overlayLayer || !this.fitRect) return;
    const point = this.districtCenter(district, this.fitRect);
    const accent = district.locked ? PALETTE.classNetRed : this.destinationAccent(district.destinationScene);
    const cursor = this.add.container(point.x, point.y).setDepth(70);
    cursor.name = "snes-world-selected-route-cursor";
    cursor.add(this.add.rectangle(0, 0, 27, 27, color(PALETTE.black), 0)
      .setStrokeStyle(2, color(PALETTE.black), 0.64)
      .setName("snes-world-selected-route-cursor-shadow"));
    cursor.add(this.add.rectangle(0, 0, 24, 24, color(PALETTE.black), 0)
      .setStrokeStyle(1, color(accent), 0.98)
      .setName("snes-world-selected-route-cursor-frame"));
    this.addSelectedRouteArrow(cursor, "north", 0, -18, accent);
    this.addSelectedRouteArrow(cursor, "south", 0, 18, accent);
    this.addSelectedRouteArrow(cursor, "west", -18, 0, accent);
    this.addSelectedRouteArrow(cursor, "east", 18, 0, accent);
    cursor.add(this.add.text(0, -4, String(district.number), {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.creamPaper,
      align: "center"
    }).setName("snes-world-selected-route-cursor-number").setOrigin(0.5, 0));
    this.selectedRouteCursor = cursor;
    this.overlayLayer.add(cursor);
  }

  private addSelectedRouteArrow(
    cursor: Phaser.GameObjects.Container,
    frame: (typeof SNES_ROUTE_ARROW_RELIC_ASSET.frames)[number],
    x: number,
    y: number,
    accent: string
  ) {
    if (this.textures.exists(SNES_ROUTE_ARROW_RELIC_ASSET.key)) {
      cursor.add(this.add.image(x, y, SNES_ROUTE_ARROW_RELIC_ASSET.key, frame)
        .setName(`snes-world-selected-route-cursor-${frame}`));
      return;
    }

    const fallback = frame === "north"
      ? this.add.triangle(x, y, -4, -3, 4, -3, 0, 4, color(accent), 0.96)
      : frame === "south"
        ? this.add.triangle(x, y, -4, 3, 4, 3, 0, -4, color(accent), 0.96)
        : frame === "west"
          ? this.add.triangle(x, y, -3, -4, -3, 4, 4, 0, color(accent), 0.96)
          : this.add.triangle(x, y, 3, -4, 3, 4, -4, 0, color(accent), 0.96);
    cursor.add(fallback.setName(`snes-world-selected-route-cursor-${frame}`));
  }

  private drawRoutePreview(district: District | null) {
    this.routePreview?.destroy();
    this.routePreview = undefined;
    if (!this.overlayLayer) return;

    const card = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 13).setDepth(904);
    card.name = "snes-world-route-preview";
    const frame = this.add.rectangle(0, 0, 236, 21, color(PALETTE.black), 0.9)
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.88);
    frame.name = "snes-world-route-preview-frame";
    card.add(frame);

    if (!district) {
      const idle = this.add.text(0, -4, "PICK ROUTE", {
        fontFamily: "monospace",
        fontSize: "6px",
        color: PALETTE.goldStamp,
        align: "center"
      }).setOrigin(0.5, 0);
      idle.name = "snes-world-route-preview-idle";
      card.add(idle);
      this.routePreview = card;
      return;
    }

    const label = this.add.text(-112, -8, `${district.number}. ${district.displayName.toUpperCase().slice(0, 16)}`, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: district.locked ? PALETTE.classNetRed : PALETTE.creamPaper
    }).setOrigin(0, 0);
    label.name = "snes-world-route-preview-title";
    card.add(label);

    const destination = district.destinationScene ? this.mapDisplayName(district.destinationScene).toUpperCase() : "UNCATALOGED";
    const route = this.add.text(-20, -8, destination.slice(0, 16), {
      fontFamily: "monospace",
      fontSize: "5px",
      color: district.locked ? PALETTE.stoneGray : this.destinationAccent(district.destinationScene)
    }).setOrigin(0, 0);
    route.name = "snes-world-route-preview-destination";
    card.add(route);

    const verb = this.routeVerb(district.destinationScene, Boolean(district.locked));
    const verbText = this.add.text(68, -8, verb, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: district.locked ? PALETTE.classNetRed : PALETTE.terminalCyan
    }).setOrigin(0, 0);
    verbText.name = "snes-world-route-preview-verb";
    card.add(verbText);

    this.addDestinationGlyph(card, district.destinationScene, Boolean(district.destinationScene), Boolean(district.locked), { x: 94, y: -10 });

    this.routePreview = card;
  }

  private routeVerb(mapKey: GameplayMapKey | undefined, locked: boolean) {
    if (locked) return "REDACTED";
    if (mapKey === "nara_stacks") return "RESEARCH";
    if (mapKey === "embassy") return "CABLES";
    if (mapKey === "west_wing" || mapKey === "capitol_hill") return "REVIEW";
    if (mapKey === "black_vault") return "DEADLINE";
    if (mapKey === "frus_floor" || mapKey === "historian_office") return "COMPILE";
    if (mapKey === "foggy_bottom") return "ROUTE";
    return "CATALOG";
  }

  private activateDistrict(district: District) {
    if (district.locked) {
      this.showModal("LOCKED", `${district.displayName} is behind a redaction bar.`);
      return;
    }
    if (!district.destinationScene) {
      this.showModal(district.displayName.toUpperCase(), "No route has been cataloged for this district.");
      return;
    }
    setLatestMessage(`World Map route: ${district.displayName} -> ${district.destinationScene}`);
    retroAudio.transition();
    this.scene.start("GameplayMapScene", {
      mapKey: district.destinationScene,
      sourceRegion: district.region,
      districtId: district.id,
      districtName: district.displayName
    });
  }

  private showModal(title: string, message: string) {
    this.closeModal();
    const modal = this.add.container(0, 0).setDepth(1200);
    modal.add(this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 188, 66, color(PALETTE.black), 0.94).setStrokeStyle(2, color(PALETTE.goldStamp)));
    modal.add(this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 24, title.slice(0, 24), {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.goldStamp,
      align: "center"
    }).setOrigin(0.5, 0));
    modal.add(this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 8, message, {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.creamPaper,
      align: "center",
      wordWrap: { width: 168 }
    }).setOrigin(0.5, 0));
    modal.add(this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 22, "A / B TO CLOSE", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.terminalCyan
    }).setOrigin(0.5, 0));
    this.modal = modal;
  }

  private closeModal() {
    this.modal?.destroy();
    this.modal = undefined;
  }

  private cycleRegion(delta: number) {
    this.selectRegion((this.regionIndex + delta + REGION_ORDER.length) % REGION_ORDER.length);
  }

  private selectRegion(index: number) {
    this.regionIndex = index;
    this.currentRegion = REGION_ORDER[this.regionIndex];
    retroAudio.confirm();
    this.renderRegion();
  }

  private cycleDistrict(delta: number) {
    const districts = districtsForRegion(this.currentRegion);
    if (districts.length === 0) return;
    const currentIndex = Math.max(0, districts.findIndex((district) => district.number === this.selectedDistrictNumber));
    const nextIndex = (currentIndex + delta + districts.length) % districts.length;
    this.selectedDistrictNumber = districts[nextIndex].number;
    retroAudio.confirm();
    this.drawSelectedDistrictState();
  }

  private selectedDistrict() {
    return districtsForRegion(this.currentRegion).find((district) => district.number === this.selectedDistrictNumber)
      ?? districtsForRegion(this.currentRegion)[0]
      ?? null;
  }

  private clampedDistrictNumber(number: number, districts: readonly District[]) {
    if (districts.some((district) => district.number === number)) return number;
    return districts[0]?.number ?? 1;
  }

  private mapDisplayName(mapKey: GameplayMapKey) {
    return mapKey
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
}
