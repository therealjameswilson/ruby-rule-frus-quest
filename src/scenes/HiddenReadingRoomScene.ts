import Phaser from "phaser";
import { SECRET_READING_ROOM_ASSETS } from "../assets/registry";
import { Player } from "../entities/Player";
import { readChapterArrival } from "../game/chapterTravel";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import {
  HIDDEN_FIRST_EDITION_FOUND_FLAG,
  HIDDEN_FIRST_EDITION_LABEL,
  HIDDEN_READING_ROOM_DISCOVERED_FLAG,
  hiddenFirstEditionFound,
  reachedReadingRoomReturn
} from "../game/secretReadingRoom";
import {
  addDocumentPoints,
  addInventoryItem,
  gameState,
  getVisitedRoomIds,
  setLatestMessage,
  setNearestInteractable,
  setObjective,
  setRoomTraversalState,
  setSceneState,
  setVisibleEntities,
  setVisibleThreats
} from "../game/state";
import type { Interactable } from "../game/types";
import { getInput, tickInput } from "../input/InputState";
import { retroAudio } from "../systems/audio";
import { FeedbackToast } from "../systems/feedbackToast";
import { decideInteractionFeedback, InteractionAssist, nearestInteractable, nearestInteractableHint } from "../systems/interaction";
import { InteractionPrompt } from "../systems/interactionPrompt";
import { InventoryOverlay } from "../systems/inventory";
import { handleOpenOverlays } from "../systems/overlayInput";
import { saveGameNow } from "../systems/save";
import { transitionTo } from "../systems/sceneTransitions";

import { addReadingRoomArt } from "../systems/readingRoomArt";
import { RESEARCH_PROPS } from "../systems/researchProps";
import { worldItemImage } from "../systems/worldItemArt";

const ROOM_TOP = 32;
const TILE_SIZE = SECRET_READING_ROOM_ASSETS.tilesetNative.tileSize;
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
  private toast!: FeedbackToast;
  private prompt!: InteractionPrompt;
  private inventory!: InventoryOverlay;
  private readonly interactionAssist = new InteractionAssist();
  private interactables: Interactable[] = [];
  private collectible?: Phaser.GameObjects.Image;
  private inputReadyAt = 0;
  private leaving = false;
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
    if (!this.textures.exists(RESEARCH_PROPS.key)) this.load.image(RESEARCH_PROPS.key, RESEARCH_PROPS.path);
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

  create(data?: unknown) {
    const arrival = readChapterArrival(data, "HiddenReadingRoomScene", gameState.currentScene);
    this.leaving = false;
    this.inputReadyAt = this.time.now + 350;
    this.interactionAssist.clear();
    this.cameras.main.setBackgroundColor(PALETTE.black);
    setSceneState("HiddenReadingRoomScene", "explore", "Hidden Reading Room: claim the first-edition FRUS volume.");
    setObjective(hiddenFirstEditionFound(gameState) ? "SOUTH TO STACKS" : "CLAIM FIRST EDITION");
    gameState.sceneProgress[HIDDEN_READING_ROOM_DISCOVERED_FLAG] = 1;
    setRoomTraversalState({
      currentRoomId: "DN2", roomTitle: "Hidden Reading Room", roomType: "secret",
      visitedRoomIds: [...new Set([...getVisitedRoomIds(["DN1", "DN2"] as const), "DN2"])],
      exits: { south: "DN1" }
    });
    setLatestMessage(hiddenFirstEditionFound(gameState)
      ? "Hidden reading room: first edition already filed."
      : "Hidden reading room discovered.");
    setVisibleEntities([
      "Hidden Reading Room",
      hiddenFirstEditionFound(gameState) ? "Empty Book Stand" : "First Edition FRUS Volume",
      "NARA Stacks return threshold"
    ]);
    setVisibleThreats([]);
    retroAudio.startMusic("NaraStacksScene");
    this.drawTileRoom();
    addReadingRoomArt(this);
    this.drawFurnitureDepth();
    this.drawCollectible();
    this.player = new Player(this, 128, 208);
    if (arrival) this.player.setPosition(arrival.x, arrival.y);
    this.toast = new FeedbackToast(this);
    this.prompt = new InteractionPrompt(this, 940);
    this.inventory = new InventoryOverlay(this);
    this.interactables = [
      {
        id: "first-edition-frus",
        label: "First Edition FRUS",
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
        onInteract: () => this.returnToStacks()
      }
    ];
    if (hiddenFirstEditionFound(gameState)) this.removeCollectedBookInteraction();
    this.drawTitleCard();
    saveGameNow("manual");
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.toast.destroy());
  }

  update(_: number, delta: number) {
    tickInput();
    const input = getInput();
    this.toast.update(delta, this.player.position);
    if (this.leaving || this.time.now < this.inputReadyAt) {
      this.player.update(delta, false);
      this.prompt.update(delta, null);
      return;
    }
    if (input.menuJustPressed) this.inventory.toggle();
    if (handleOpenOverlays(this.inventory)) {
      this.player.update(delta, false);
      this.prompt.update(delta, null);
      return;
    }
    if (input.pauseJustPressed) {
      this.inventory.toggle();
      return;
    }

    this.player.update(delta, true, {
      bounds: { left: 18, right: GAME_WIDTH - 18, top: ROOM_TOP + 18, bottom: GAME_HEIGHT - 18 },
      solids: this.solids
    });
    if (reachedReadingRoomReturn(this.player.position)) {
      this.returnToStacks();
      return;
    }
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

  private drawCollectible() {
    if (hiddenFirstEditionFound(gameState) || !this.textures.exists(SECRET_READING_ROOM_ASSETS.firstEdition.key)) {
      this.add.rectangle(COLLECTIBLE_POSITION.x, COLLECTIBLE_POSITION.y, 22, 28, color(PALETTE.deepRuby), 0.5)
        .setStrokeStyle(1, color(PALETTE.goldStamp))
        .setDepth(100);
      return;
    }
    this.collectible = worldItemImage(this, COLLECTIBLE_POSITION.x, COLLECTIBLE_POSITION.y, "volume-fragment")
      .setDepth(105).setName("first-edition-detailed-volume");
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
      this.toast.show("FIRST EDITION FILED", this.player.position, "info");
      return;
    }
    gameState.sceneProgress[HIDDEN_FIRST_EDITION_FOUND_FLAG] = 1;
    addInventoryItem(HIDDEN_FIRST_EDITION_LABEL);
    addDocumentPoints(25, "Hidden first edition found");
    setLatestMessage("Hidden first edition filed: bonus completion recorded.");
    setObjective("SOUTH TO STACKS");
    setVisibleEntities(["Hidden Reading Room", "Empty Book Stand", "NARA Stacks return threshold"]);
    const collectible = this.collectible;
    if (collectible) {
      collectible.setDepth(901).setName("first-edition-reveal");
      this.tweens.add({ targets: collectible, y: 88, duration: 240,
        onUpdate: () => collectible.setY(Math.round(collectible.y)) });
      this.tweens.add({ targets: collectible, alpha: 0, delay: 1140, duration: 400,
        onComplete: () => collectible.destroy() });
    }
    this.collectible = undefined;
    this.removeCollectedBookInteraction();
    retroAudio.danneItemPickup("First Edition");
    saveGameNow("manual");
    this.toast.show("FIRST EDITION +25", this.player.position, "info");
  }

  private removeCollectedBookInteraction() {
    this.interactables = this.interactables.filter((item) => item.id !== "first-edition-frus");
    this.interactionAssist.clear();
    setNearestInteractable(null);
    this.prompt.update(0, null);
  }

  private returnToStacks() {
    if (this.leaving || this.time.now < this.inputReadyAt) return;
    this.leaving = true;
    saveGameNow("manual");
    transitionTo(this, "NaraStacksScene", { chapterFrom: "DN2", chapterTo: "DN1" });
  }
}
