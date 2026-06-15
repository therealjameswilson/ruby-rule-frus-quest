import Phaser from "phaser";
import { OVERWORLD_REGIONS, type GameplayMapKey, type OverworldRegionKey } from "../assets/registry";
import { DISTRICTS, REGION_LABELS, REGION_ORDER, districtsForRegion, type District } from "../data/regions";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { setLatestMessage, setNearestInteractable, setSceneState, setVisibleEntities, setVisibleThreats } from "../game/state";
import { bindPointerPress, getInput, tickInput } from "../input/InputState";
import { retroAudio } from "../systems/audio";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

type FitRect = { x: number; y: number; width: number; height: number; scale: number; sourceWidth: number; sourceHeight: number };

const TOP_SAFE_BAND = 32;
const BOTTOM_SAFE_BAND = 26;

export class WorldMapScene extends Phaser.Scene {
  private currentRegion: OverworldRegionKey = "europe";
  private regionIndex = 0;
  private startRegion: OverworldRegionKey | null = null;
  private mapLayer?: Phaser.GameObjects.Container;
  private districtLayer?: Phaser.GameObjects.Container;
  private overlayLayer?: Phaser.GameObjects.Container;
  private regionTitle?: Phaser.GameObjects.Text;
  private tooltip?: Phaser.GameObjects.Text;
  private modal?: Phaser.GameObjects.Container;
  private fitRect: FitRect | null = null;
  private numberKeysInstalled = false;

  constructor() {
    super("WorldMapScene");
  }

  init(data: { region?: OverworldRegionKey }) {
    this.startRegion = data.region && data.region in OVERWORLD_REGIONS ? data.region : null;
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

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 13, GAME_WIDTH, BOTTOM_SAFE_BAND, color(PALETTE.black)).setDepth(900);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - BOTTOM_SAFE_BAND, GAME_WIDTH, 2, color(PALETTE.goldStamp)).setDepth(901);
    this.tooltip = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 19, "HOVER A CARTOUCHE", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.goldStamp,
      align: "center"
    }).setOrigin(0.5, 0).setDepth(902);
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
    setVisibleEntities(districts.map((district) => `${district.number}. ${district.displayName}${district.destinationScene ? ` -> ${district.destinationScene}` : " -> coming soon"}`));
    setLatestMessage(`World Map: ${regionLabel}`);

    for (const district of districts) this.createDistrictZone(district, fit);
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

  private hoverDistrict(district: District, zone: Phaser.GameObjects.Rectangle) {
    zone.setFillStyle(color(PALETTE.goldStamp), 0.2);
    zone.setStrokeStyle(1, color(PALETTE.creamPaper), 0.9);
    const suffix = district.locked ? "LOCKED" : district.destinationScene ? `A: ${this.mapDisplayName(district.destinationScene)}` : "COMING SOON";
    this.tooltip?.setText(`${district.number}. ${district.displayName.toUpperCase()}   ${suffix}`);
    setNearestInteractable(district.displayName);
    setLatestMessage(`World Map hover: ${district.displayName}`);
  }

  private clearDistrictHover(zone: Phaser.GameObjects.Rectangle) {
    zone.setFillStyle(color(PALETTE.goldStamp), 0);
    zone.setStrokeStyle(1, color(PALETTE.goldStamp), 0);
    this.tooltip?.setText("HOVER A CARTOUCHE");
    setNearestInteractable(null);
  }

  private activateDistrict(district: District) {
    if (district.locked) {
      this.showModal("LOCKED", `${district.displayName} is behind a redaction bar.`);
      return;
    }
    if (!district.destinationScene) {
      this.showModal(district.displayName.toUpperCase(), "Coming soon - diplomatic cable archive.");
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

  private mapDisplayName(mapKey: GameplayMapKey) {
    return mapKey
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
}
