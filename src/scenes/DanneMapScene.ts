import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { DANNE_MAP_ASSETS } from "../game/danneAtlas";
import type {
  DanneMapSceneKey,
  DanneRectDefinition,
  DanneSceneGeometry,
  DanneSceneInteractionDefinition
} from "../game/danneSceneCollisions";
import { DANNE_SCENE_GEOMETRY } from "../game/danneSceneCollisions";
import {
  addInventoryItem,
  gameState,
  setLatestMessage,
  setNearestInteractable,
  setObjective,
  setSceneState,
  setVisibleEntities,
  setVisibleThreats
} from "../game/state";
import type { Interactable, Position } from "../game/types";
import { Player } from "../entities/Player";
import { CensorshipWraith } from "../entities/enemies/CensorshipWraith";
import { RedactorDrone } from "../entities/enemies/RedactorDrone";
import { MarineSecurityGuard } from "../entities/npcs/MarineSecurityGuard";
import { getInput, tickInput } from "../input/InputState";
import { retroAudio } from "../systems/audio";
import { DialogBox } from "../systems/dialog";
import { nearestInteractable } from "../systems/interaction";
import { InventoryOverlay } from "../systems/inventory";
import { snapPixel } from "../systems/pixelPerfect";
import { ReliabilityHud } from "../systems/reliability";
import { activateRoleAbility } from "../systems/roleAbility";
import { transitionTo } from "../systems/sceneTransitions";
import { saveGameNow } from "../systems/save";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

function isCollisionDebugEnabled() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debug") === "collision";
}

function reciprocalIntegerFitScale(width: number, height: number) {
  const divisor = Math.max(1, Math.ceil(Math.max(width / GAME_WIDTH, height / GAME_HEIGHT)));
  return 1 / divisor;
}

function rectToPhaser(definition: DanneRectDefinition) {
  return new Phaser.Geom.Rectangle(definition.x, definition.y, definition.width, definition.height);
}

function polygonContains(position: Position, geometry: DanneSceneGeometry) {
  const polygon = new Phaser.Geom.Polygon(geometry.walkable.points.map((point) => new Phaser.Geom.Point(point.x, point.y)));
  return Phaser.Geom.Polygon.Contains(polygon, position.x, position.y);
}

function mapAssetFor(sceneKey: DanneMapSceneKey) {
  return DANNE_MAP_ASSETS.find((asset) => asset.sceneKey === sceneKey);
}

export abstract class DanneMapScene extends Phaser.Scene {
  private player!: Player;
  private dialog!: DialogBox;
  private inventory!: InventoryOverlay;
  private reliability!: ReliabilityHud;
  private hintText!: Phaser.GameObjects.Text;
  private readonly geometry: DanneSceneGeometry;
  private solids: Phaser.Geom.Rectangle[] = [];
  private interactables: Interactable[] = [];
  private redactorDrones: RedactorDrone[] = [];
  private censorshipWraiths: CensorshipWraith[] = [];
  private marineGuard?: MarineSecurityGuard;
  private marineDoorCleared = false;
  private lastGoodPosition: Position;

  protected constructor(sceneKey: DanneMapSceneKey) {
    super(sceneKey);
    this.geometry = DANNE_SCENE_GEOMETRY[sceneKey];
    this.lastGoodPosition = { ...this.geometry.spawn };
  }

  create() {
    setSceneState(this.geometry.sceneKey, "explore", this.geometry.objective);
    setLatestMessage(`${this.geometry.displayName} loaded.`);
    setVisibleEntities([...this.geometry.visibleEntities]);
    setVisibleThreats([]);
    this.applyDebugGrants();
    retroAudio.startMusic(this.geometry.musicScene);
    this.cameras.main.setBackgroundColor(PALETTE.black);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.black)).setDepth(-100);
    this.drawMapBackground();
    this.drawInteractionMarkers();
    if (isCollisionDebugEnabled()) this.drawCollisionDebug();
    this.drawLocationCard();

    this.solids = this.geometry.solids.map(rectToPhaser);
    this.player = new Player(this, this.geometry.spawn.x, this.geometry.spawn.y);
    this.lastGoodPosition = this.player.position;
    this.dialog = new DialogBox(this);
    this.inventory = new InventoryOverlay(this);
    this.reliability = new ReliabilityHud(this);
    this.hintText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 10, "", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.goldStamp,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(900);
    this.interactables = this.geometry.interactions.map((definition) => ({
      id: definition.id,
      label: definition.label,
      x: definition.x,
      y: definition.y,
      radius: definition.radius,
      kind: definition.kind,
      onInteract: () => this.handleInteraction(definition)
    }));
    this.createDanneEntities();
    this.syncDanneReadout(this.time.now);
  }

  update(_: number, delta: number) {
    tickInput();
    const input = getInput();
    if (input.fullscreenJustPressed) this.scale.toggleFullscreen();
    if (input.menuJustPressed) this.inventory.toggle();
    if (input.soundJustPressed) {
      retroAudio.toggle();
      this.reliability.update();
    }
    if (input.reliabilityJustPressed) this.reliability.toggleDetails();
    if (input.abilityJustPressed) activateRoleAbility(this);
    this.updateDanneEntities(this.time.now, delta, !this.dialog.active && !this.inventory.active && !this.reliability.active);

    if (this.dialog.active) {
      if (input.aJustPressed) this.dialog.advance();
      this.player.update(delta, false);
      return;
    }
    if (this.inventory.active || this.reliability.active) {
      this.player.update(delta, false);
      return;
    }
    if (input.pauseJustPressed) {
      this.dialog.show(this.geometry.displayName.toUpperCase(), "The route is paused.");
      return;
    }

    this.lastGoodPosition = this.player.position;
    this.player.update(delta, true, {
      bounds: { left: 16, right: GAME_WIDTH - 16, top: 38, bottom: GAME_HEIGHT - 18 },
      solids: this.solids
    });
    if (!polygonContains(this.player.position, this.geometry)) {
      this.player.setPosition(this.lastGoodPosition.x, this.lastGoodPosition.y);
    }
    const nearest = nearestInteractable(this.player.position, this.interactables);
    setNearestInteractable(nearest?.label ?? null);
    this.hintText.setText(nearest ? nearest.label.toUpperCase() : "");
    if (input.aJustPressed && nearest) nearest.onInteract();
    setObjective(this.geometry.objective);
    this.reliability.update();
    this.syncDanneReadout(this.time.now);
  }

  private drawMapBackground() {
    const asset = mapAssetFor(this.geometry.sceneKey);
    if (!asset || !this.textures.exists(asset.key)) {
      this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH - 20, GAME_HEIGHT - 36, color(PALETTE.deepRuby))
        .setStrokeStyle(2, color(PALETTE.goldStamp))
        .setDepth(-20);
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, this.geometry.displayName.toUpperCase(), {
        fontFamily: "monospace",
        fontSize: "10px",
        color: PALETTE.creamPaper
      }).setOrigin(0.5).setDepth(-10);
      return;
    }

    const texture = this.textures.get(asset.key);
    const source = texture.getSourceImage() as { width?: number; height?: number };
    const width = source.width ?? GAME_WIDTH;
    const height = source.height ?? GAME_HEIGHT;
    const scale = reciprocalIntegerFitScale(width, height);
    this.add.image(snapPixel(GAME_WIDTH / 2), snapPixel(GAME_HEIGHT / 2), asset.key)
      .setOrigin(0.5)
      .setScale(scale)
      .setDepth(-20);
  }

  private drawInteractionMarkers() {
    for (const interaction of this.geometry.interactions) {
      this.add.ellipse(interaction.x + 1, interaction.y + 2, 15, 7, color(PALETTE.black), 0.55).setDepth(interaction.y - 4);
      this.add.rectangle(interaction.x, interaction.y, 13, 13, color(PALETTE.black), 0.82)
        .setStrokeStyle(1, color(interaction.accent))
        .setDepth(interaction.y);
      this.add.rectangle(interaction.x, interaction.y - 3, 7, 3, color(interaction.accent)).setDepth(interaction.y + 1);
      this.add.rectangle(interaction.x + 3, interaction.y - 5, 2, 2, color(PALETTE.creamPaper)).setDepth(interaction.y + 2);
    }
  }

  private drawLocationCard() {
    const container = this.add.container(0, 0).setDepth(1200);
    const shadow = this.add.rectangle(130, 56, 168, 28, color(PALETTE.black), 0.82);
    const card = this.add.rectangle(128, 54, 168, 28, color(PALETTE.deepRuby), 0.94)
      .setStrokeStyle(2, color(PALETTE.goldStamp));
    const label = this.add.text(128, 47, this.geometry.displayName.toUpperCase(), {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5, 0);
    const sub = this.add.text(128, 59, "DANN-E EXPANSION ROUTE", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5, 0);
    container.add([shadow, card, label, sub]);
    this.tweens.add({
      targets: container,
      alpha: 0,
      delay: 1300,
      duration: 350,
      onComplete: () => container.destroy()
    });
  }

  private drawCollisionDebug() {
    const graphics = this.add.graphics().setDepth(1100);
    graphics.lineStyle(1, color(PALETTE.openNetGreen), 0.95);
    const points = this.geometry.walkable.points;
    for (let index = 0; index < points.length; index += 1) {
      const a = points[index];
      const b = points[(index + 1) % points.length];
      graphics.lineBetween(a.x, a.y, b.x, b.y);
    }
    graphics.lineStyle(1, color(PALETTE.classNetRed), 0.9);
    for (const solid of this.geometry.solids) {
      graphics.strokeRect(solid.x, solid.y, solid.width, solid.height);
      this.add.text(solid.x + 1, solid.y + 1, solid.label.toUpperCase().slice(0, 12), {
        fontFamily: "monospace",
        fontSize: "5px",
        color: PALETTE.classNetRed,
        backgroundColor: PALETTE.black
      }).setDepth(1101);
    }
    for (const route of this.geometry.patrolRoutes ?? []) {
      graphics.lineStyle(1, color(PALETTE.terminalCyan), 0.9);
      for (let index = 0; index < route.points.length - 1; index += 1) {
        const a = route.points[index];
        const b = route.points[index + 1];
        graphics.lineBetween(a.x, a.y, b.x, b.y);
      }
    }
  }

  private handleInteraction(definition: DanneSceneInteractionDefinition) {
    if (definition.action === "return-office") {
      transitionTo(this, this.geometry.exitTarget);
      return;
    }
    if (definition.action === "save-point") {
      const saved = saveGameNow("manual");
      retroAudio.confirm();
      this.dialog.show("SAVE POINT", saved ? "Record saved at the garden register." : "Save unavailable in this browser session.");
      return;
    }
    if (definition.action === "boss-trigger") {
      this.dialog.show("DANN-E CORE", [
        "The vault core is dormant.",
        "Phase 7 will wire the boss encounter here.",
        "For now, the trigger volume is verified."
      ]);
      return;
    }
    if (definition.action === "witness-table") {
      this.dialog.show("WITNESS TABLE", [
        "The record is entered without partisan flourish.",
        "Question, answer, source, and date remain separate."
      ]);
      return;
    }
    if (definition.action === "nara-stacks-note") {
      this.dialog.show("STACK CONTROL NOTE", [
        "Four redactor-drone patrol routes are marked for Phase 4.",
        "Do not move boxes without a manifest."
      ]);
      return;
    }
    if (definition.action === "cipher-machine") {
      this.dialog.show("FAKE CABLE", [
        "ROUTINE CABLE: punctuation survives transmission.",
        "Archivist note: verify the station slug before citation."
      ]);
      return;
    }
    if (definition.action === "marine-guard") {
      if (this.hasMasterDeclassKey()) {
        this.marineDoorCleared = true;
        this.dialog.show("MARINE GUARD", this.marineGuard?.clearedDialog() ?? "Clearance verified.");
        setLatestMessage("Marine guard verified Master Declass Key.");
        return;
      }
      this.dialog.show("MARINE GUARD", this.marineGuard?.blockedDialog() ?? "Classified door remains closed.");
      setLatestMessage("Marine guard blocks classified door.");
    }
  }

  private createDanneEntities() {
    if (this.geometry.sceneKey === "NaraStacksScene") {
      this.redactorDrones = (this.geometry.patrolRoutes ?? []).map((route) => {
        const [start, ...rest] = route.points;
        return new RedactorDrone(this, start.x, start.y, [start, ...rest]);
      });
    }
    if (this.geometry.sceneKey === "BlackVaultLairScene") {
      this.censorshipWraiths = [
        new CensorshipWraith(this, 82, 184, [{ x: 82, y: 184 }, { x: 110, y: 148 }, { x: 74, y: 126 }]),
        new CensorshipWraith(this, 174, 184, [{ x: 174, y: 184 }, { x: 146, y: 148 }, { x: 184, y: 126 }])
      ];
    }
    if (this.geometry.sceneKey === "EmbassyCableRoomScene") {
      this.marineGuard = new MarineSecurityGuard(this, 202, 156);
    }
  }

  private updateDanneEntities(timeMs: number, deltaMs: number, canAct: boolean) {
    for (const drone of this.redactorDrones) drone.update(timeMs, deltaMs, this.player, canAct);
    for (const wraith of this.censorshipWraiths) wraith.update(timeMs, deltaMs, this.player, canAct);
    this.marineGuard?.update(timeMs);
    this.syncDanneReadout(timeMs);
  }

  private syncDanneReadout(timeMs: number) {
    const visible = [...this.geometry.visibleEntities];
    if (this.redactorDrones.length) visible.push(...this.redactorDrones.map((_drone, index) => `Redactor Drone ${index + 1}`));
    if (this.censorshipWraiths.length) visible.push(...this.censorshipWraiths.map((_wraith, index) => `Censorship Wraith ${index + 1}`));
    if (this.marineGuard) visible.push(this.marineDoorCleared ? "Marine Security Guard (cleared)" : "Marine Security Guard (blocking)");
    setVisibleEntities(visible);
    setVisibleThreats([
      ...this.redactorDrones.map((drone, index) => ({
        label: `Redactor Drone ${index + 1}`,
        x: drone.position.x,
        y: drone.position.y,
        spriteKey: drone.spriteKey,
        behavior: "patrol + stamp drop",
        defeatMethod: "Avoid black-bar stamps until Phase 5 tools are wired.",
        status: drone.status(timeMs)
      })),
      ...this.censorshipWraiths.map((wraith, index) => ({
        label: `Censorship Wraith ${index + 1}`,
        x: wraith.position.x,
        y: wraith.position.y,
        spriteKey: wraith.spriteKey,
        behavior: "slow float + ink sweep",
        defeatMethod: "Keep distance until Phase 5 tools are wired.",
        status: wraith.status(timeMs)
      }))
    ]);
  }

  private applyDebugGrants() {
    if (typeof window === "undefined") return;
    const give = new URLSearchParams(window.location.search).get("give") ?? "";
    if (!give.split(",").some((part) => part === "declass-key" || part === "master-declass-key")) return;
    addInventoryItem("Master Declass Key");
  }

  private hasMasterDeclassKey() {
    return gameState.inventory.some((item) => {
      const normalized = item.toLowerCase().replace(/[_\s]+/g, "-");
      return normalized === "master-declass-key" || normalized === "declass-key";
    });
  }
}
