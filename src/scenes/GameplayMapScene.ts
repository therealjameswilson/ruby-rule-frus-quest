import Phaser from "phaser";
import { GAMEPLAY_MAPS, type GameplayMapKey } from "../assets/registry";
import { getDistrictById, REGION_LABELS } from "../data/regions";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { setLatestMessage, setSceneState, setVisibleEntities, setVisibleThreats } from "../game/state";
import { getInput, tickInput, bindPointerPress } from "../input/InputState";
import { retroAudio } from "../systems/audio";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

type GameplayMapSceneData = {
  mapKey?: GameplayMapKey;
  sourceRegion?: string;
  districtId?: string;
  districtName?: string;
};

const MAP_LABELS: Record<GameplayMapKey, string> = {
  historian_office: "Office of the Historian",
  nara_stacks: "NARA II Stacks",
  foggy_bottom: "Foggy Bottom Street",
  west_wing: "White House West Wing",
  black_vault: "Black Vault Lair",
  frus_floor: "FRUS Production Floor",
  embassy: "Embassy Compound",
  capitol_hill: "Capitol Hill Hearing"
};

export class GameplayMapScene extends Phaser.Scene {
  private mapKey: GameplayMapKey = "historian_office";
  private sourceRegion = "europe";
  private districtName = "World Map";

  constructor() {
    super("GameplayMapScene");
  }

  init(data: GameplayMapSceneData) {
    const queryMap = new URLSearchParams(window.location.search).get("map");
    const requestedMap = data.mapKey ?? (queryMap && queryMap in GAMEPLAY_MAPS ? queryMap as GameplayMapKey : undefined);
    this.mapKey = requestedMap ?? "historian_office";
    this.sourceRegion = data.sourceRegion ?? "europe";
    const district = data.districtId ? getDistrictById(data.districtId) : null;
    this.districtName = data.districtName ?? district?.displayName ?? MAP_LABELS[this.mapKey];
  }

  create() {
    setSceneState("GameplayMapScene", "explore", `${MAP_LABELS[this.mapKey]} selected from the world map.`);
    setVisibleThreats([]);
    setVisibleEntities([MAP_LABELS[this.mapKey], `District: ${this.districtName}`, "Phase 2 collision layers pending"]);
    setLatestMessage(`Gameplay map preview: ${this.mapKey}`);
    retroAudio.startMusic("TitleScene");
    this.cameras.main.setBackgroundColor(PALETTE.black);
    this.renderMap();
  }

  update() {
    tickInput();
    const input = getInput();
    if (input.bJustPressed || input.pauseJustPressed || input.startJustPressed) this.returnToWorldMap();
  }

  private renderMap() {
    const fit = this.computeMapFit();
    this.add.image(fit.x, fit.y, this.mapKey).setOrigin(0, 0).setScale(fit.scale).setDepth(10);
    this.add.rectangle(GAME_WIDTH / 2, 13, GAME_WIDTH, 26, color(PALETTE.black), 0.92).setDepth(900);
    this.add.rectangle(GAME_WIDTH / 2, 26, GAME_WIDTH, 2, color(PALETTE.goldStamp)).setDepth(901);
    this.add.text(GAME_WIDTH / 2, 5, MAP_LABELS[this.mapKey].toUpperCase(), {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5, 0).setDepth(902);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 13, GAME_WIDTH, 26, color(PALETTE.black), 0.92).setDepth(900);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 26, GAME_WIDTH, 2, color(PALETTE.goldStamp)).setDepth(901);
    const label = `${this.regionLabel()} / ${this.districtName}`;
    this.add.text(8, GAME_HEIGHT - 21, label.slice(0, 32), {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper
    }).setDepth(902);

    const back = this.add.rectangle(GAME_WIDTH - 39, GAME_HEIGHT - 13, 68, 16, color(PALETTE.deepRuby)).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(902);
    this.add.text(GAME_WIDTH - 39, GAME_HEIGHT - 18, "B BACK", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5, 0).setDepth(903);
    bindPointerPress(back, { down: () => this.returnToWorldMap() });
  }

  private computeMapFit() {
    const texture = this.textures.get(this.mapKey);
    const source = texture.getSourceImage() as { width: number; height: number };
    const scale = Math.min(GAME_WIDTH / source.width, (GAME_HEIGHT - 52) / source.height);
    const width = Math.round(source.width * scale);
    const height = Math.round(source.height * scale);
    return {
      x: Math.round((GAME_WIDTH - width) / 2),
      y: 26 + Math.round((GAME_HEIGHT - 52 - height) / 2),
      scale
    };
  }

  private regionLabel() {
    return this.sourceRegion in REGION_LABELS ? REGION_LABELS[this.sourceRegion as keyof typeof REGION_LABELS] : "World Map";
  }

  private returnToWorldMap() {
    retroAudio.transition();
    this.scene.start("WorldMapScene", { region: this.sourceRegion });
  }
}
