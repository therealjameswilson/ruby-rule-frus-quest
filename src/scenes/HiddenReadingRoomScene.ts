import Phaser from "phaser";
import { SECRET_READING_ROOM_ASSETS } from "../assets/registry";
import { Player } from "../entities/Player";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import {
  HIDDEN_FIRST_EDITION_FOUND_FLAG,
  HIDDEN_FIRST_EDITION_LABEL,
  hiddenFirstEditionFound
} from "../game/secretReadingRoom";
import {
  addDocumentPoints,
  addInventoryItem,
  gameState,
  setLatestMessage,
  setNearestInteractable,
  setObjective,
  setSceneState,
  setVisibleEntities,
  setVisibleThreats
} from "../game/state";
import type { Interactable } from "../game/types";
import { getInput, tickInput } from "../input/InputState";
import { retroAudio } from "../systems/audio";
import { DialogBox } from "../systems/dialog";
import { decideInteractionFeedback, InteractionAssist, nearestInteractable, nearestInteractableHint } from "../systems/interaction";
import { InteractionPrompt } from "../systems/interactionPrompt";
import { saveGameNow } from "../systems/save";
import { transitionTo } from "../systems/sceneTransitions";

const ROOM_TOP = 32;
const TILE_SIZE = SECRET_READING_ROOM_ASSETS.tilesetNative.tileSize;
const ANIM_KEY = "secret-frus-first-edition-sparkle";
const COLLECTIBLE_POSITION = { x: 128, y: 126 } as const;

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

function buildReadingRoomTiles() {
  const columns = 16;
  const rows = 13;
  const data: number[][] = [];
  for (let y = 0; y < rows; y += 1) {
    const row: number[] = [];
    for (let x = 0; x < columns; x += 1) {
      const border = x === 0 || x === columns - 1 || y === 0 || y === rows - 1;
      if (border) {
        row.push(y === rows - 1 && (x === 7 || x === 8) ? 11 : 7);
      } else if (x >= 5 && x <= 10 && y >= 4 && y <= 8) {
        row.push(2);
      } else if (x >= 2 && x <= 4 && y >= 9) {
        row.push(5);
      } else if (x >= 11 && x <= 13 && y >= 2 && y <= 4) {
        row.push(6);
      } else {
        row.push((x + y) % 5 === 0 ? 1 : 0);
      }
    }
    data.push(row);
  }

  data[1][2] = 14;
  data[1][3] = 14;
  data[1][4] = 15;
  data[1][11] = 14;
  data[1][12] = 14;
  data[1][13] = 15;
  data[3][6] = 16;
  data[3][7] = 17;
  data[4][7] = 18;
  data[5][7] = 19;
  data[5][9] = 20;
  data[2][8] = 23;
  data[2][9] = 24;
  data[1][7] = 26;
  data[1][8] = 27;
  data[0][7] = 13;
  data[0][8] = 13;
  return data;
}

export class HiddenReadingRoomScene extends Phaser.Scene {
  private player!: Player;
  private dialog!: DialogBox;
  private prompt!: InteractionPrompt;
  private readonly interactionAssist = new InteractionAssist();
  private interactables: Interactable[] = [];
  private collectible?: Phaser.GameObjects.Sprite;
  private readonly solids = [
    new Phaser.Geom.Rectangle(0, ROOM_TOP, 256, 14),
    new Phaser.Geom.Rectangle(0, ROOM_TOP, 14, 208),
    new Phaser.Geom.Rectangle(242, ROOM_TOP, 14, 208),
    new Phaser.Geom.Rectangle(0, 226, 112, 14),
    new Phaser.Geom.Rectangle(144, 226, 112, 14),
    new Phaser.Geom.Rectangle(30, 48, 52, 20),
    new Phaser.Geom.Rectangle(174, 48, 52, 20),
    new Phaser.Geom.Rectangle(94, 78, 68, 20)
  ];

  constructor() {
    super("HiddenReadingRoomScene");
  }

  preload() {
    const { tilesetNative, firstEdition } = SECRET_READING_ROOM_ASSETS;
    if (!this.textures.exists(tilesetNative.key)) {
      this.load.image(tilesetNative.key, tilesetNative.path);
    }
    if (!this.textures.exists(firstEdition.key)) {
      this.load.spritesheet(firstEdition.key, firstEdition.path, {
        frameWidth: firstEdition.frameWidth,
        frameHeight: firstEdition.frameHeight
      });
    }
  }

  create() {
    this.cameras.main.setBackgroundColor(PALETTE.black);
    setSceneState("HiddenReadingRoomScene", "explore", "Hidden Reading Room: claim the first-edition FRUS volume.");
    setObjective("Hidden Reading Room: claim the first-edition FRUS volume.");
    setLatestMessage(hiddenFirstEditionFound(gameState)
      ? "Hidden reading room: first edition already filed."
      : "Hidden reading room discovered.");
    setVisibleEntities([
      "Hidden Reading Room",
      hiddenFirstEditionFound(gameState) ? "First Edition FRUS Volume (filed)" : "First Edition FRUS Volume",
      "NARA Stacks return threshold"
    ]);
    setVisibleThreats([]);
    retroAudio.startMusic("NaraStacksScene");
    this.drawTileRoom();
    this.drawFurnitureDepth();
    this.ensureCollectibleAnimation();
    this.drawCollectible();
    this.player = new Player(this, 128, 208);
    this.dialog = new DialogBox(this);
    this.prompt = new InteractionPrompt(this, 940);
    this.interactables = [
      {
        id: "first-edition-frus",
        label: hiddenFirstEditionFound(gameState) ? "Filed First Edition" : "First Edition FRUS",
        x: COLLECTIBLE_POSITION.x,
        y: COLLECTIBLE_POSITION.y,
        radius: 28,
        kind: "document",
        onInteract: () => this.collectFirstEdition()
      },
      {
        id: "reading-room-return",
        label: "Return to NARA Stacks",
        x: 128,
        y: 224,
        radius: 26,
        kind: "door",
        onInteract: () => transitionTo(this, "NaraStacksScene")
      }
    ];
    this.drawTitleCard();
  }

  update(_: number, delta: number) {
    tickInput();
    const input = getInput();
    if (this.dialog.active) {
      if (input.aJustPressed) this.dialog.advance();
      this.player.update(delta, false);
      this.prompt.update(delta, null);
      return;
    }

    this.player.update(delta, true, {
      bounds: { left: 18, right: GAME_WIDTH - 18, top: ROOM_TOP + 18, bottom: GAME_HEIGHT - 18 },
      solids: this.solids
    });
    const nearest = nearestInteractable(this.player.position, this.interactables);
    const hint = nearestInteractableHint(this.player.position, this.interactables);
    setNearestInteractable(nearest?.label ?? null);
    this.prompt.update(delta, nearest ?? hint, undefined, nearest ? undefined : hint ? { badge: "!", text: "STEP CLOSER" } : undefined);
    const buffered = this.interactionAssist.update(this.time.now, input.aJustPressed, nearest);
    if (buffered) buffered.onInteract();
    else if (input.aJustPressed) {
      const feedback = decideInteractionFeedback(nearest, hint);
      if (feedback.kind === "step-closer") setLatestMessage(`Step closer to ${feedback.target.label}.`);
      else setLatestMessage("Nothing to interact with here.");
      retroAudio.blip();
    }
  }

  private drawTileRoom() {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.black)).setDepth(-100);
    if (!this.textures.exists(SECRET_READING_ROOM_ASSETS.tilesetNative.key)) {
      this.add.rectangle(128, 132, 224, 184, color(PALETTE.stoneGray)).setStrokeStyle(2, color(PALETTE.goldStamp));
      return;
    }
    const map = this.make.tilemap({ data: buildReadingRoomTiles(), tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tileset = map.addTilesetImage("reading_room", SECRET_READING_ROOM_ASSETS.tilesetNative.key, TILE_SIZE, TILE_SIZE, 0, 0);
    if (!tileset) return;
    map.createLayer(0, tileset, 0, ROOM_TOP)?.setDepth(-20);
  }

  private drawFurnitureDepth() {
    this.add.rectangle(128, 42, 92, 4, color(PALETTE.black), 0.72).setDepth(-4);
    this.add.rectangle(128, 86, 70, 5, color(PALETTE.black), 0.45).setDepth(-3);
    this.add.ellipse(COLLECTIBLE_POSITION.x, COLLECTIBLE_POSITION.y + 12, 28, 8, color(PALETTE.black), 0.36).setDepth(95);
    this.add.rectangle(128, 218, 44, 8, color(PALETTE.black), 0.82)
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setDepth(80);
    this.add.text(128, 215, "STACKS", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5).setDepth(81);
  }

  private ensureCollectibleAnimation() {
    const asset = SECRET_READING_ROOM_ASSETS.firstEdition;
    if (!this.textures.exists(asset.key) || this.anims.exists(ANIM_KEY)) return;
    this.anims.create({
      key: ANIM_KEY,
      frames: this.anims.generateFrameNumbers(asset.key, { start: 0, end: asset.frames - 1 }),
      frameRate: 8,
      repeat: -1
    });
  }

  private drawCollectible() {
    if (hiddenFirstEditionFound(gameState) || !this.textures.exists(SECRET_READING_ROOM_ASSETS.firstEdition.key)) {
      this.add.rectangle(COLLECTIBLE_POSITION.x, COLLECTIBLE_POSITION.y, 22, 28, color(PALETTE.deepRuby), 0.5)
        .setStrokeStyle(1, color(PALETTE.goldStamp))
        .setDepth(100);
      return;
    }
    this.collectible = this.add.sprite(COLLECTIBLE_POSITION.x, COLLECTIBLE_POSITION.y, SECRET_READING_ROOM_ASSETS.firstEdition.key, 0)
      .setDepth(105);
    this.collectible.play(ANIM_KEY);
  }

  private drawTitleCard() {
    const card = this.add.container(128, 72).setDepth(1200);
    card.add(this.add.rectangle(0, 0, 168, 22, color(PALETTE.black), 0.86).setStrokeStyle(2, color(PALETTE.goldStamp)));
    card.add(this.add.text(0, -7, "HIDDEN READING ROOM", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5));
    card.add(this.add.text(0, 4, "FIRST EDITION CACHE", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5));
    this.tweens.add({ targets: card, alpha: 0, delay: 1400, duration: 300, onComplete: () => card.destroy() });
  }

  private collectFirstEdition() {
    if (hiddenFirstEditionFound(gameState)) {
      this.dialog.show("FIRST EDITION", "The first-edition FRUS volume is already filed in the bonus ledger.");
      return;
    }
    gameState.sceneProgress[HIDDEN_FIRST_EDITION_FOUND_FLAG] = 1;
    addInventoryItem(HIDDEN_FIRST_EDITION_LABEL);
    addDocumentPoints(25, "Hidden first edition found");
    setLatestMessage("Hidden first edition filed: bonus completion recorded.");
    setObjective("Hidden Reading Room: first edition filed; return to NARA Stacks.");
    setVisibleEntities(["Hidden Reading Room", "First Edition FRUS Volume (filed)", "NARA Stacks return threshold"]);
    this.collectible?.destroy();
    this.collectible = undefined;
    retroAudio.danneItemPickup("First Edition");
    saveGameNow("manual");
    this.dialog.show("FIRST EDITION", [
      "You found a gilded first-edition FRUS volume.",
      "Bonus stat recorded for the final completion summary."
    ]);
  }
}
