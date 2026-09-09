import Phaser from "phaser";
import { ALT_ENDING_ASSETS, FRUS_VOLUMES, GAMEPLAY_TILESETS, publicAssetPath } from "../assets/registry";
import { BINDERY_INBOX, BINDING_PRESS, BINDERY_STATIONS, BINDERY_SOLIDS, BINDERY_TILEMAP, binderyFloor, binderyWalkRoute } from "../game/binderyFurniture";
import { safeWorkstationPosition, WORKSTATION_DESK } from "../game/workstationGeometry";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { KELLOGG_CERTIFICATION_PROMPTS } from "../game/kelloggCertification";
import { GPO_PUBLICATION_PROMPTS } from "../game/gpoPublication";
import { CHAPTER_RELEASE_PROMPTS } from "../game/chapterReleaseStatus";
import { DIGITAL_RELEASE_PROMPTS } from "../game/digitalRelease";
import { PUBLIC_CITATION_CARD_PROMPTS } from "../game/publicCitationCard";
import { PUBLICATION_FUNDING_PROMPTS } from "../game/publicationFundingQueue";
import { READER_AID_REGISTER_PROMPTS } from "../game/readerAidRegisters";
import { RELEASE_CALENDAR_PROMPTS } from "../game/releaseCalendar";
import { GPO_SEGMENT_ASSEMBLY_PROMPTS } from "../game/gpoSegmentAssembly";
import { FRONT_MATTER_ASSEMBLY_PROMPTS } from "../game/frontMatterAssembly";
import { INDEX_DOCKET_PROMPTS } from "../game/indexDocket";
import { TYPESETTER_CORRECTIONS_PROMPTS } from "../game/typesetterCorrections";
import {
  BUCKRAM_BINDING_PACKETS,
  BUCKRAM_BINDING_TOTAL,
  buckramBindingObjective,
  buckramBindingStatusCode,
  buckramBindingStatusFromCode,
  deriveBuckramBindingStep,
  routeBuckramBindingPacket,
  type BuckramBindingStationId,
  type BuckramBindingStatus
} from "../game/buckramBinding";
import {
  addDocumentPoints,
  addInventoryItem,
  addProcessItem,
  finalizeCompletionStats,
  gameState,
  getCompletionStatsReadout,
  getFinalGateReadiness,
  getPublicationOutcomeReadout,
  getTreatyFragmentCount,
  hasProcessItem,
  markVolumeAssemblyCeremonyComplete,
  publishDocument,
  recordBindingCeremonyCompletion,
  resolveStandardsViolation,
  setFinalGateCertificationState,
  setGameMode,
  setLatestMessage,
  setHeldItem,
  setNearestInteractable,
  setObjective,
  setRoomTraversalState,
  setSceneState,
  setVisibleEntities,
  setVisibleThreats,
  unresolvedStandardsViolations
} from "../game/state";
import { getInput, tickInput } from "../input/InputState";
import { Player } from "../entities/Player";
import { retroAudio } from "../systems/audio";
import { InventoryOverlay } from "../systems/inventory";
import { adjustReliability, ReliabilityHud } from "../systems/reliability";
import { activateRoleAbility } from "../systems/roleAbility";
import { handleOpenOverlays } from "../systems/overlayInput";
import { saveGameNow } from "../systems/save";
import { addObjectiveText, drawRoomFrame, transitionTo } from "../systems/sceneTransitions";
import { SNES_PUBLISHED_FRUS_PRIZE_ASSET } from "../game/snesAtlas";
import { hiddenFirstEditionBonusLabel } from "../game/secretReadingRoom";
import { addSnesRoomLayer } from "../systems/snesPixelArt";
import { PublicationSummary } from "../systems/publicationSummary";
import { InteractionPrompt } from "../systems/interactionPrompt";
import { FeedbackToast } from "../systems/feedbackToast";
import { VOLUME_ASSEMBLY_ASSETS } from "../systems/volumeAssembly";
import { IndexRouterOverlay } from "../systems/indexRouter";
import { BindingCertificationBoard } from "../systems/bindingCertificationBoard";
import { bindingCertificationEvidence, isLegacyCertificationExercise } from "../game/bindingCertification";
import type { Interactable } from "../game/types";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

const GATE_PLAY_BOUNDS = { left: 16, right: 240, top: 48, bottom: 220 };
const BINDERY_RETURN = { x: 16, y: 205, radius: 18 };
const FALLBACK_PUBLISHED_FRUS_REWARD_TEXTURE: keyof typeof FRUS_VOLUMES = "reward_legendary";
type BuckramBlockerIcon = "stamp" | "cover" | "equity" | "map" | "apparatus" | "bracket" | "standards" | "reliability" | "key" | "ready";
interface BuckramBlockerCue {
  short: string;
  detail: string;
  icon: BuckramBlockerIcon;
}

interface BindingStation {
  id: BuckramBindingStationId;
  label: string;
  shortLabel: string;
  x: number;
  y: number;
  accent: string;
  texture: string;
}

interface PhysicalBindingPacket {
  id: string;
  label: string;
  shortLabel: string;
  station: BuckramBindingStationId;
  texture: string;
  accent: string;
  checkCount: number;
  status: BuckramBindingStatus;
  x: number;
  y: number;
  routedStation?: BuckramBindingStationId;
  icon?: Phaser.GameObjects.Image;
}

const BINDING_STATIONS: readonly BindingStation[] = [
  { id: "front-matter-bench", label: "Front Matter Bench", shortLabel: "FRONT", ...BINDERY_STATIONS["front-matter-bench"], accent: PALETTE.goldStamp, texture: "source-note" },
  { id: "index-desk", label: "Index Desk", shortLabel: "INDEX", ...BINDERY_STATIONS["index-desk"], accent: PALETTE.terminalCyan, texture: "proof-page" },
  { id: "kellogg-press", label: "Kellogg Seal Press", shortLabel: "SEAL", ...BINDERY_STATIONS["kellogg-press"], accent: PALETTE.classNetRed, texture: "citation-stamp" },
  { id: "gpo-handoff", label: "GPO Handoff", shortLabel: "GPO", ...BINDERY_STATIONS["gpo-handoff"], accent: PALETTE.goldStamp, texture: "review-folder" },
  { id: "public-release-terminal", label: "Public Release Terminal", shortLabel: "PUBLIC", ...BINDERY_STATIONS["public-release-terminal"], accent: PALETTE.terminalCyan, texture: "opennet-terminal" }
];

export class EndingScene extends Phaser.Scene {
  private player!: Player;
  private inventory!: InventoryOverlay;
  private reliability!: ReliabilityHud;
  private toast!: FeedbackToast;
  private interactionPrompt!: InteractionPrompt;
  private indexRouter!: IndexRouterOverlay;
  private standardsBoard!: BindingCertificationBoard;
  private roomSolids: Phaser.Geom.Rectangle[] = [];
  private objectiveText!: Phaser.GameObjects.Text;
  private actionHint!: Phaser.GameObjects.Text;
  private bindingPackets: PhysicalBindingPacket[] = [];
  private bindingProgressLights: Phaser.GameObjects.Rectangle[] = [];
  private bindingStationLights = new Map<BuckramBindingStationId, Phaser.GameObjects.Rectangle>();
  private bindingProgressText?: Phaser.GameObjects.Text;
  private bindingPressFrame?: Phaser.GameObjects.Rectangle;
  private bindingPressLabel?: Phaser.GameObjects.Text;
  private publicationTableRouteCueObjects: Phaser.GameObjects.GameObject[] = [];
  private publicationTableRouteCueKey = "";
  private canRestart = false;
  private published = false;
  private leaving = false;
  private publicationSummary?: PublicationSummary;

  constructor() {
    super("EndingScene");
  }

  preload() {
    for (const [key, path] of Object.entries(ALT_ENDING_ASSETS)) {
      if (!this.textures.exists(key)) this.load.image(key, publicAssetPath(path));
    }
    const rewardKey = FALLBACK_PUBLISHED_FRUS_REWARD_TEXTURE;
    if (!this.textures.exists(rewardKey)) {
      this.load.image(rewardKey, publicAssetPath(FRUS_VOLUMES[rewardKey]));
    }
  }

  create() {
    this.resetTransientState();
    this.published = gameState.finalGateCertification?.status === "published";
    setSceneState("EndingScene", this.published ? "ending" : "explore", this.published
      ? "Published FRUS cover complete."
      : "Buckram Gate: carry the first binding packet.");
    retroAudio.startMusic("EndingScene");
    this.cameras.main.setBackgroundColor(PALETTE.deepRuby);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.deepRuby));
    drawRoomFrame(this, "BUCKRAM GATE", PALETTE.goldStamp, { showLegacyHud: false });
    addSnesRoomLayer(this, { roomId: "G1", roomType: "boss", theme: "ending" });
    this.drawGateRoom();

    this.player = new Player(this, 80, 214);
    this.inventory = new InventoryOverlay(this);
    this.reliability = new ReliabilityHud(this);
    this.reliability.setSummaryVisible(false);
    this.toast = new FeedbackToast(this);
    this.interactionPrompt = new InteractionPrompt(this, 950);
    this.indexRouter = new IndexRouterOverlay(this);
    this.standardsBoard = new BindingCertificationBoard(this);
    this.objectiveText = addObjectiveText(this);
    this.actionHint = this.add.text(8, 211, "", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.creamPaper,
      backgroundColor: PALETTE.black
    }).setDepth(811).setVisible(false);

    this.startPhysicalBindingLoop();
    this.syncRoomTraversal();
    this.syncVisibleState(this.published);
    if (this.published) {
      if (getPublicationOutcomeReadout().id === "published_under_appeal") {
        this.showContestedPrize();
        this.canRestart = true;
      } else {
        this.finishBindingCeremonyPresentation();
      }
    } else {
      this.updateGateReadout();
    }
  }

  private resetTransientState() {
    this.bindingPackets = [];
    this.bindingProgressLights = [];
    this.bindingStationLights = new Map<BuckramBindingStationId, Phaser.GameObjects.Rectangle>();
    this.bindingProgressText = undefined;
    this.bindingPressFrame = undefined;
    this.bindingPressLabel = undefined;
    this.publicationTableRouteCueObjects = [];
    this.publicationTableRouteCueKey = "";
    this.canRestart = false;
    this.published = false;
    this.leaving = false;
    this.publicationSummary = undefined;
    this.roomSolids = BINDERY_SOLIDS.map(r => new Phaser.Geom.Rectangle(r.x, r.y, r.width, r.height));
  }

  update(_: number, delta: number) {
    tickInput();
    const input = getInput();
    if (this.leaving) { this.player.update(delta, false); return; }
    if (input.fullscreenJustPressed) this.scale.toggleFullscreen();
    if (this.standardsBoard.active) {
      this.toast.hide();
      this.interactionPrompt.update(delta, null);
      this.clearPublicationTableRouteCue();
      this.player.update(delta, false);
      this.standardsBoard.updateInput();
      return;
    }
    if (this.indexRouter.active) {
      this.toast.update(delta, this.player.position, GATE_PLAY_BOUNDS);
      this.interactionPrompt.update(delta, null);
      this.clearPublicationTableRouteCue();
      this.player.update(delta, false);
      this.indexRouter.updateInput(input);
      return;
    }
    if (input.menuJustPressed && !this.published) this.inventory.toggle();
    if (input.soundJustPressed) {
      retroAudio.toggle();
      this.reliability.update();
    }
    if (input.reliabilityJustPressed && !this.published) this.reliability.toggleDetails();
    if (input.abilityJustPressed && !this.published) activateRoleAbility(this);

    if (this.published) {
      this.toast.update(delta, this.player.position, GATE_PLAY_BOUNDS);
      this.interactionPrompt.update(delta, null);
      this.clearPublicationTableRouteCue();
      this.player.update(delta, false);
      this.publicationSummary?.update(input);
      return;
    }

    if (handleOpenOverlays(this.inventory, this.reliability)) {
      this.interactionPrompt.update(delta, null);
      this.clearPublicationTableRouteCue();
      this.player.update(delta, false);
      return;
    }

    if (input.pauseJustPressed) {
      this.inventory.toggle();
      return;
    }

    const safe = safeWorkstationPosition(this.player.position, this.roomSolids);
    if (safe.x !== this.player.position.x || safe.y !== this.player.position.y) this.player.setPosition(safe.x, safe.y);
    this.player.update(delta, true, { bounds: GATE_PLAY_BOUNDS, solids: this.roomSolids });
    this.toast.update(delta, this.player.position, GATE_PLAY_BOUNDS);
    this.updateCarriedBindingPacket();
    this.updateGateReadout();
    this.updatePublicationTableCue(delta);
    if (input.aJustPressed) {
      this.handleGateAction();
    }
    this.reliability.update();
    this.objectiveText.setText("");
  }

  private drawGateRoom() {
    this.add.rectangle(128, 136, 224, 160, color(PALETTE.stoneGray)).setDepth(1);
    const asset = GAMEPLAY_TILESETS.interiorsNative;
    if (this.textures.exists(asset.key)) {
      const map = this.make.tilemap({ data: binderyFloor(), tileWidth: asset.tileSize, tileHeight: asset.tileSize });
      const tiles = map.addTilesetImage(asset.manifestKey, asset.key, asset.tileSize, asset.tileSize, 0, 0, asset.firstGid);
      if (tiles) map.createLayer(0, tiles, BINDERY_TILEMAP.x, BINDERY_TILEMAP.y)?.setDepth(2).setAlpha(0.25);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => map.destroy());
    }
    this.add.rectangle(128, 58, 130, 28, color(PALETTE.black), 0.96)
      .setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(140);
    this.add.text(128, 47, "FRUS BINDERY", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5).setDepth(141);
    this.bindingProgressText = this.add.text(128, 56, "PACKETS 0/5", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5).setDepth(141);
    for (let index = 0; index < BUCKRAM_BINDING_TOTAL; index += 1) {
      this.bindingProgressLights.push(this.add.rectangle(108 + index * 10, 68, 7, 4, color(PALETTE.stoneDark))
        .setStrokeStyle(1, color(PALETTE.stoneGray)).setDepth(141));
    }

    for (const station of BINDING_STATIONS) this.drawBindingStation(station);

    this.bindingPressFrame = this.add.rectangle(BINDING_PRESS.x, BINDING_PRESS.y, 48, 16, color(PALETTE.black), 0.96)
      .setStrokeStyle(2, color(PALETTE.classNetRed)).setDepth(156);
    this.add.ellipse(128, 158, 48, 4, color(PALETTE.black), 0.3).setDepth(46);
    this.add.image(112, 148, "buckram-key").setDisplaySize(10, 10).setDepth(156);
    this.add.image(144, 148, "citation-stamp").setDisplaySize(10, 10).setDepth(156);
    this.add.rectangle(128, 144, 12, 18, color(PALETTE.deepRuby))
      .setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(156);
    this.add.rectangle(124, 144, 2, 14, color(PALETTE.buckramHighlight)).setDepth(156);
    this.bindingPressLabel = this.add.text(BINDING_PRESS.x, BINDING_PRESS.y - 17, "LOCKED PRESS", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.classNetRed, backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(156);

    this.add.rectangle(BINDERY_INBOX.x, BINDERY_INBOX.y, 32, 12, color(PALETTE.black), 0.96)
      .setStrokeStyle(2, color(PALETTE.terminalCyan)).setDepth(200);
    this.add.text(BINDERY_INBOX.x, BINDERY_INBOX.y + 11, "BINDERY INBOX", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.terminalCyan
    }).setOrigin(0.5).setDepth(146);
    if (!this.published) {
      this.add.rectangle(BINDERY_RETURN.x, BINDERY_RETURN.y, 20, 24, color(PALETTE.black))
        .setStrokeStyle(1, color(PALETTE.terminalCyan)).setDepth(150);
      for (let step = 0; step < 3; step++) {
        this.add.rectangle(10 + step * 5, BINDERY_RETURN.y, 2, 16, color(PALETTE.stoneGray)).setDepth(151);
      }
      this.add.text(30, 204, "< VAULT", { fontFamily: "monospace", fontSize: "8px", color: PALETTE.terminalCyan }).setDepth(152);
    }
  }

  private drawBindingStation(station: BindingStation) {
    this.add.ellipse(station.x, station.y + 9, 32, 4, color(PALETTE.black), 0.3).setDepth(46);
    const desk = this.add.container(station.x, station.y).setDepth(station.y + 8).setName(`bindery-desk-${station.id}`);
    const asset = GAMEPLAY_TILESETS.interiorsNative;
    if (this.textures.exists(asset.key)) {
      const frame = "bindery-desk", texture = this.textures.get(asset.key);
      if (!texture.has(frame)) texture.add(frame, 0, WORKSTATION_DESK.tileIndex % asset.columns * asset.tileSize,
        Math.floor(WORKSTATION_DESK.tileIndex / asset.columns) * asset.tileSize, asset.tileSize, asset.tileSize);
      desk.add([this.add.image(-8, 0, asset.key, frame), this.add.image(8, 0, asset.key, frame)]);
    } else desk.add(this.add.rectangle(0, 0, 32, 16, color(PALETTE.deepRuby)));
    desk.add(this.add.rectangle(0, 0, 32, 16, 0, 0).setStrokeStyle(1, color(station.accent)));
    desk.add(this.add.image(-9, 1, station.texture).setDisplaySize(10, 10));
    this.bindingStationLights.set(
      station.id,
      this.add.rectangle(7, 1, 10, 5, color(PALETTE.stoneDark)).setStrokeStyle(1, color(station.accent))
    );
    desk.add(this.bindingStationLights.get(station.id)!);
    desk.add(this.add.text(0, -7, station.shortLabel, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.creamPaper, backgroundColor: PALETTE.black
    }).setOrigin(0.5, 0));
  }

  private updateGateReadout() {
    const activePacket = this.getActiveBindingPacket();
    const readiness = getFinalGateReadiness();
    const ready = !activePacket && readiness.ready && hasProcessItem("buckram_key");
    this.updateBindingRoomVisuals();

    if (this.nearBinderyReturn()) {
      setFinalGateCertificationState({ status: "locked", nearestGate: false, checklistComplete: ready,
        certifiedBy: null, requiredItem: "Buckram Key", message: "Return passage open. Filed packets stay at the bindery." });
      setNearestInteractable("RETURN TO VAULT");
      setObjective("RETURN TO VAULT");
      return;
    }

    if (activePacket) {
      const station = this.bindingStation(activePacket.station);
      const target = activePacket.status === "waiting" ? BINDERY_INBOX : station;
      const radius = activePacket.status === "waiting" ? BINDERY_INBOX.radius : 30;
      const nearTarget = this.isNear(target.x, target.y, radius);
      const verb = activePacket.status === "waiting" ? "CARRY" : activePacket.status === "carried" ? "ROUTE" : "SEAL";
      const message = activePacket.status === "waiting"
        ? `Collect ${activePacket.shortLabel} from the bindery inbox.`
        : activePacket.status === "carried"
          ? `Route ${activePacket.shortLabel} to ${station.label}.`
          : `Seal ${activePacket.shortLabel} at ${station.label}.`;
      setFinalGateCertificationState({
        status: "locked",
        nearestGate: nearTarget,
        checklistComplete: false,
        certifiedBy: null,
        requiredItem: "Buckram Key",
        message
      });
      setNearestInteractable(nearTarget ? `${verb} ${activePacket.shortLabel}` : null);
      setObjective(buckramBindingObjective(activePacket, activePacket.status));
      this.actionHint.setText("");
      return;
    }

    const nearPress = this.isNear(BINDING_PRESS.x, BINDING_PRESS.y, BINDING_PRESS.radius);
    const blocker = this.buckramBlockerCue(readiness);
    setFinalGateCertificationState({
      status: ready ? "ready" : "locked",
      nearestGate: nearPress,
      checklistComplete: ready,
      certifiedBy: null,
      requiredItem: "Buckram Key",
      message: ready
        ? "Five binding packets are sealed. Human publication can proceed."
        : `Buckram Gate locked: ${blocker.detail}.`
    });
    setNearestInteractable(nearPress ? (ready ? "PUBLISH FRUS VOLUME" : "BINDING PRESS LOCKED") : null);
    setObjective(ready ? "PUBLISH AT PRESS" : "PRESS LOCKED");
    this.actionHint.setText("");
  }

  private buckramBlockerCue(readiness: ReturnType<typeof getFinalGateReadiness>): BuckramBlockerCue {
    const firstStamp = readiness.missingStamps[0];
    if (firstStamp) {
      const stamp = firstStamp.toUpperCase();
      return {
        short: `STAMP ${stamp}`,
        detail: `earn ${stamp} process stamp`,
        icon: "stamp"
      };
    }
    if (readiness.missingFragments) {
      return {
        short: `COVER x${readiness.missingFragments}`,
        detail: `recover ${readiness.missingFragments} cover piece${readiness.missingFragments === 1 ? "" : "s"}`,
        icon: "cover"
      };
    }
    if (readiness.equityCrystalsRequired === 0) {
      return {
        short: "EQUITY MAP",
        detail: "create the agency-equity map",
        icon: "map"
      };
    }
    if (readiness.missingEquityCrystals) {
      return {
        short: `EQUITY x${readiness.missingEquityCrystals}`,
        detail: `clear ${readiness.missingEquityCrystals} agency equit${readiness.missingEquityCrystals === 1 ? "y" : "ies"}`,
        icon: "equity"
      };
    }
    if (!readiness.repositoryCoverageMapReady) {
      return {
        short: "REPO MAP",
        detail: "complete the repository coverage map",
        icon: "map"
      };
    }
    const firstApparatus = readiness.missingApparatus[0];
    if (firstApparatus) {
      return {
        short: `APP ${firstApparatus.shortLabel}`,
        detail: `file ${firstApparatus.label}`,
        icon: "apparatus"
      };
    }
    if (readiness.documentsWithUndisclosedDeletion.length) {
      return {
        short: "BRACKET TEXT",
        detail: "repair visible bracketed insertion",
        icon: "bracket"
      };
    }
    if (readiness.standardsViolations.length) {
      return {
        short: "STANDARDS",
        detail: "resolve standards violation ledger",
        icon: "standards"
      };
    }
    if (!readiness.reliabilityReady) {
      return {
        short: `REL ${readiness.reliability}/${readiness.reliabilityMinimum}`,
        detail: `restore reliability to ${readiness.reliabilityMinimum}`,
        icon: "reliability"
      };
    }
    if (!readiness.buckramKeyHeld) {
      return {
        short: "BUCKRAM KEY",
        detail: "recover the Buckram Key",
        icon: "key"
      };
    }
    return {
      short: "HUMAN READY",
      detail: "complete human readiness",
      icon: "ready"
    };
  }

  private updatePublicationTableCue(delta: number) {
    const label = this.publicationTableActionLabel();
    if (!label) {
      this.interactionPrompt.update(delta, null);
      this.clearPublicationTableRouteCue();
      return;
    }

    const position = this.bindingCuePosition();
    const target = this.publicationTableTarget(label, position);
    const nearTarget = this.isNear(position.x, position.y, position.radius);
    this.interactionPrompt.update(delta, nearTarget && !this.toast.visible ? target : null, undefined, { badge: "A", text: label });
    if (nearTarget) {
      this.clearPublicationTableRouteCue();
      return;
    }
    this.refreshPublicationTableRouteCue(label, position);
  }

  private publicationTableActionLabel() {
    if (this.nearBinderyReturn()) return "RETURN TO VAULT";
    const activePacket = this.getActiveBindingPacket();
    if (activePacket) {
      if (activePacket.status === "waiting") return `CARRY ${activePacket.shortLabel}`;
      if (activePacket.status === "carried") return `ROUTE ${activePacket.shortLabel}`;
      return `SEAL ${activePacket.shortLabel}`;
    }
    const readiness = getFinalGateReadiness();
    const ready = readiness.ready && hasProcessItem("buckram_key");
    return ready ? "PUBLISH" : "PRESS LOCKED";
  }

  private bindingCuePosition() {
    if (this.nearBinderyReturn()) return BINDERY_RETURN;
    const activePacket = this.getActiveBindingPacket();
    if (!activePacket) return BINDING_PRESS;
    if (activePacket.status === "waiting") return BINDERY_INBOX;
    return { ...this.bindingStation(activePacket.station), radius: 30 };
  }

  private publicationTableTarget(label: string, position: { x: number; y: number; radius: number }): Interactable {
    return {
      id: "buckram-binding-target",
      label,
      x: position.x,
      y: position.y,
      radius: position.radius,
      kind: "manuscript",
      onInteract: () => undefined
    };
  }

  private refreshPublicationTableRouteCue(label: string, target: { x: number; y: number; radius: number }) {
    const distance = Phaser.Math.Distance.Between(
      this.player.position.x,
      this.player.position.y,
      target.x,
      target.y
    );
    if (distance <= target.radius + 2) {
      this.clearPublicationTableRouteCue();
      return;
    }

    const start = { x: Math.round(this.player.position.x), y: Math.round(this.player.position.y) };
    const end = { x: target.x, y: target.y };
    const cueKey = `G1:${label}:${Math.floor(start.x / 8)},${Math.floor(start.y / 8)}->${end.x},${end.y}`;
    if (cueKey === this.publicationTableRouteCueKey) return;

    this.clearPublicationTableRouteCue();
    this.publicationTableRouteCueKey = cueKey;
    this.drawPublicationTableRouteCue(start, end, label);
  }

  private clearPublicationTableRouteCue() {
    for (const object of this.publicationTableRouteCueObjects) {
      if (object.active) object.destroy();
    }
    this.publicationTableRouteCueObjects = [];
    this.publicationTableRouteCueKey = "";
  }

  private trackPublicationTableRouteCue<T extends Phaser.GameObjects.GameObject>(object: T) {
    this.publicationTableRouteCueObjects.push(object);
    return object;
  }

  private drawPublicationTableRouteCue(start: { x: number; y: number }, end: { x: number; y: number }, label: string) {
    const accent = label === "PUBLISH"
      ? PALETTE.goldStamp
      : label === "PRESS LOCKED"
        ? PALETTE.classNetRed
        : PALETTE.terminalCyan;

    this.trackPublicationTableRouteCue(this.add.ellipse(end.x, end.y + 14, 42, 8, color(PALETTE.black), 0.35)
      .setName("buckram-publication-table-route-shadow")
      .setDepth(154));
    this.trackPublicationTableRouteCue(this.add.rectangle(end.x, end.y, 44, 30, color(PALETTE.black), 0)
      .setStrokeStyle(1, color(accent))
      .setName("buckram-publication-table-route-target-glow")
      .setDepth(240));

    let previous = start;
    for (const next of binderyWalkRoute(start, end)) {
      const steps = Math.max(1, Math.floor(Phaser.Math.Distance.Between(previous.x, previous.y, next.x, next.y) / 12));
      for (let index = 1; index <= steps; index += 1) {
        const t = index / (steps + 1);
        const x = Math.round(Phaser.Math.Linear(previous.x, next.x, t));
        const y = Math.round(Phaser.Math.Linear(previous.y, next.y, t));
        this.trackPublicationTableRouteCue(this.add.rectangle(x, y, 2, 2, color(accent), 0.92)
          .setName("buckram-publication-table-route-dot")
          .setDepth(48));
      }
      previous = next;
    }

  }

  private handleGateAction() {
    if (this.nearBinderyReturn()) { this.leaveBindery(); return; }
    const activePacket = this.getActiveBindingPacket();
    if (activePacket) {
      this.handleBindingPacketAction(activePacket);
      return;
    }
    const readiness = getFinalGateReadiness();
    const ready = readiness.ready && hasProcessItem("buckram_key");
    if (!this.isNear(BINDING_PRESS.x, BINDING_PRESS.y, BINDING_PRESS.radius)) {
      retroAudio.warning();
      setLatestMessage("Carry the Buckram Key to the binding press.");
      return;
    }
    if (!ready) {
      const blocker = this.buckramBlockerCue(readiness);
      retroAudio.warning();
      setLatestMessage(`BINDING PRESS LOCKED - ${blocker.detail}.`);
      this.toast.show(`LOCKED - ${blocker.short}`, this.player.position, "warn", GATE_PLAY_BOUNDS);
      return;
    }
    this.publishVolume();
  }

  private nearBinderyReturn() {
    return !this.published && this.isNear(BINDERY_RETURN.x, BINDERY_RETURN.y, BINDERY_RETURN.radius);
  }

  private leaveBindery() {
    if (this.published || this.leaving) return;
    this.leaving = true;
    this.savePhysicalBindingProgress();
    this.toast.hide();
    this.interactionPrompt.update(0, null);
    this.clearPublicationTableRouteCue();
    setHeldItem(null);
    setLatestMessage("Filed packets remain here. The cleared vault leads back to proofing.");
    transitionTo(this, "BlackVaultLairScene");
  }

  private startPhysicalBindingLoop() {
    if (this.bindingPackets.length > 0) return;
    const restoredStep = deriveBuckramBindingStep(gameState.sceneProgress);
    const restoredStatus = buckramBindingStatusFromCode(gameState.sceneProgress.buckramBindingStatus ?? 0);
    this.bindingPackets = BUCKRAM_BINDING_PACKETS.map((packet, index) => {
      const status: BuckramBindingStatus = index < restoredStep
        ? "sealed"
        : index === restoredStep
          ? restoredStatus
          : "waiting";
      const station = this.bindingStation(packet.station);
      const placed = status === "routed";
      const physicalPacket: PhysicalBindingPacket = {
        id: packet.id,
        label: packet.label,
        shortLabel: packet.shortLabel,
        station: packet.station,
        texture: packet.texture,
        accent: packet.accent,
        checkCount: packet.checkIds.length,
        status,
        x: placed ? station.x : BINDERY_INBOX.x,
        y: placed ? station.y - 18 : BINDERY_INBOX.y - 13,
        routedStation: placed ? station.id : undefined
      };
      physicalPacket.icon = this.add.image(physicalPacket.x, physicalPacket.y, physicalPacket.texture)
        .setDisplaySize(12, 12).setDepth(240).setVisible(false);
      return physicalPacket;
    });
    const carried = this.bindingPackets.find((packet) => packet.status === "carried");
    setHeldItem(carried ? `Binding Folder: ${carried.shortLabel}` : null);
    gameState.sceneProgress.buckramBindingStep = restoredStep;
    gameState.sceneProgress.buckramBindingStatus = buckramBindingStatusCode(restoredStatus);
    this.updateBindingPacketVisibility();
    this.updateBindingRoomVisuals();
  }

  private getActiveBindingPacket() {
    return this.bindingPackets.find((packet) => packet.status !== "sealed") ?? null;
  }

  private bindingStation(id: BuckramBindingStationId) {
    return BINDING_STATIONS.find((station) => station.id === id) ?? BINDING_STATIONS[0];
  }

  private savePhysicalBindingProgress(packet: PhysicalBindingPacket | null = this.getActiveBindingPacket()) {
    const step = packet ? this.bindingPackets.indexOf(packet) : BUCKRAM_BINDING_TOTAL;
    gameState.sceneProgress.buckramBindingStep = Math.max(0, step);
    gameState.sceneProgress.buckramBindingStatus = packet ? buckramBindingStatusCode(packet.status) : 0;
    saveGameNow();
  }

  private updateCarriedBindingPacket() {
    const activePacket = this.getActiveBindingPacket();
    if (activePacket?.status === "carried" && activePacket.icon) {
      activePacket.x = Math.round(this.player.position.x + 12);
      activePacket.y = Math.round(this.player.position.y - 5);
      activePacket.icon.setPosition(activePacket.x, activePacket.y).setDepth(Math.round(this.player.position.y) + 4);
    }
    this.updateBindingPacketVisibility();
  }

  private updateBindingPacketVisibility() {
    const activePacket = this.getActiveBindingPacket();
    for (const packet of this.bindingPackets) {
      const visible = packet === activePacket;
      packet.icon?.setVisible(visible);
    }
  }

  private updateBindingRoomVisuals() {
    const completed = this.bindingPackets.filter((packet) => packet.status === "sealed").length;
    this.bindingProgressText?.setText(`PACKETS ${completed}/${BUCKRAM_BINDING_TOTAL}`);
    // The public seal belongs to the final ceremony, not merely to five deliveries.
    this.bindingProgressLights.forEach((light, index) => {
      const filled = index < completed;
      light.setFillStyle(color(filled ? PALETTE.openNetGreen : PALETTE.stoneDark));
      light.setStrokeStyle(1, color(filled ? PALETTE.goldStamp : PALETTE.stoneGray));
    });
    for (const station of BINDING_STATIONS) {
      const sealed = this.bindingPackets.some((packet) => packet.station === station.id && packet.status === "sealed");
      this.bindingStationLights.get(station.id)
        ?.setFillStyle(color(sealed ? PALETTE.openNetGreen : PALETTE.stoneDark));
    }
    const ready = completed === BUCKRAM_BINDING_TOTAL
      && getFinalGateReadiness().ready
      && hasProcessItem("buckram_key");
    this.bindingPressFrame?.setStrokeStyle(2, color(ready ? PALETTE.goldStamp : PALETTE.classNetRed));
    this.bindingPressLabel
      ?.setText(ready ? "PUBLISH READY" : "LOCKED PRESS")
      .setColor(ready ? PALETTE.goldStamp : PALETTE.classNetRed);
  }

  private findNearestBindingStation(maxDistance = 28) {
    const nearest = BINDING_STATIONS
      .map((station) => ({
        station,
        distance: Phaser.Math.Distance.Between(this.player.position.x, this.player.position.y, station.x, station.y)
      }))
      .sort((a, b) => a.distance - b.distance)[0];
    return nearest && nearest.distance <= maxDistance ? nearest.station : null;
  }

  private findActionBindingStation(packet: PhysicalBindingPacket, maxDistance = 28) {
    const intended = this.bindingStation(packet.station);
    const intendedDistance = Phaser.Math.Distance.Between(
      this.player.position.x,
      this.player.position.y,
      intended.x,
      intended.y
    );
    if (intendedDistance <= maxDistance + 8) return intended;
    return this.findNearestBindingStation(maxDistance);
  }

  private handleBindingPacketAction(packet: PhysicalBindingPacket) {
    if (packet !== this.getActiveBindingPacket()) return;
    if (packet.status === "waiting") {
      if (!this.isNear(BINDERY_INBOX.x, BINDERY_INBOX.y, BINDERY_INBOX.radius)) {
        retroAudio.warning();
        setLatestMessage(`CARRY: move to ${packet.shortLabel} at the bindery inbox.`);
        return;
      }
      packet.status = "carried";
      setHeldItem(`Binding Folder: ${packet.shortLabel}`);
      setLatestMessage(`CARRY: ${packet.label}.`);
      this.savePhysicalBindingProgress(packet);
      retroAudio.blip();
      this.updateBindingPacketVisibility();
      return;
    }

    if (packet.status === "carried") {
      const station = this.findActionBindingStation(packet);
      if (!station) {
        retroAudio.warning();
        setLatestMessage(`ROUTE: carry ${packet.shortLabel} to ${this.bindingStation(packet.station).label}.`);
        return;
      }
      const step = this.bindingPackets.indexOf(packet);
      const routed = routeBuckramBindingPacket(step, packet.id, station.id);
      if (!routed.ok) {
        const intended = this.bindingStation(packet.station);
        setHeldItem(`Binding Folder: ${packet.shortLabel}`);
        adjustReliability(-2, `${packet.shortLabel} filed at wrong bindery station`);
        this.reliability.update();
        setLatestMessage(`RETRY: ${packet.shortLabel} belongs at ${intended.label}.`);
        this.toast.show(`WRONG: ${intended.shortLabel} BENCH`, this.player.position, "warn", GATE_PLAY_BOUNDS);
        this.savePhysicalBindingProgress(packet);
        retroAudio.warning();
        this.updateBindingPacketVisibility();
        return;
      }
      packet.status = "routed";
      packet.routedStation = station.id;
      packet.x = station.x;
      packet.y = station.y - 18;
      packet.icon?.setPosition(packet.x, packet.y).setDepth(242);
      setHeldItem(null);
      setLatestMessage(`ROUTE: ${packet.shortLabel} placed at ${station.label}.`);
      this.savePhysicalBindingProgress(packet);
      retroAudio.confirm();
      this.updateBindingPacketVisibility();
      this.finishBindingDelivery(packet);
      return;
    }

    const station = this.bindingStation(packet.station);
    if (!this.isNear(station.x, station.y, 36)) {
      retroAudio.warning();
      setLatestMessage(`SEAL: return to ${station.label}.`);
      return;
    }
    this.finishBindingDelivery(packet);
  }

  private finishBindingDelivery(packet: PhysicalBindingPacket) {
    if (packet.id === "index-proof-docket" && !gameState.sceneProgress.aboutSeriesIndexRoutingComplete) {
      this.openIndexRouter(packet);
      return;
    }
    if (packet.id === "kellogg-certification") {
      this.openStandardsBoard(packet);
      return;
    }
    this.sealBindingPacket(packet);
  }

  private openStandardsBoard(packet: PhysicalBindingPacket) {
    this.toast.hide();
    setGameMode("choice");
    setObjective("REVIEW FULL RECORD");
    this.standardsBoard.show(
      () => bindingCertificationEvidence(gameState.documentCandidates, gameState.standardsViolations),
      () => {
        // Only a present human may attest. This does not edit source documents.
        if (packet !== this.getActiveBindingPacket() || packet.status !== "routed") return;
        if (!bindingCertificationEvidence(gameState.documentCandidates, gameState.standardsViolations).ready) return;
        this.resolveKelloggCertificationViolations();
        setGameMode("explore");
        this.sealBindingPacket(packet);
      },
      () => { setGameMode("explore"); this.updateGateReadout(); }
    );
  }

  private openIndexRouter(packet: PhysicalBindingPacket) {
    this.toast.hide();
    setGameMode("choice");
    setObjective("INDEX: ROUTE TO DOC");
    this.indexRouter.show({
      onComplete: (message) => {
        gameState.sceneProgress.aboutSeriesIndexRoutingComplete = 1;
        setGameMode("explore");
        this.sealBindingPacket(packet, message);
      },
      onCancel: () => {
        setGameMode("explore");
        this.updateGateReadout();
      }
    });
  }

  private sealBindingPacket(packet: PhysicalBindingPacket, completionMessage?: string) {
    if (packet !== this.getActiveBindingPacket() || packet.status !== "routed") return;
    packet.status = "sealed";
    this.applyBindingPacketReward(packet);
    if (completionMessage) setLatestMessage(completionMessage);
    retroAudio.stamp();
    const nextPacket = this.getActiveBindingPacket();
    if (nextPacket) {
      nextPacket.status = "carried";
      setHeldItem(`Binding Folder: ${nextPacket.shortLabel}`);
      this.updateCarriedBindingPacket();
      this.toast.show(completionMessage ? "DOC 87 INDEXED" : `${packet.shortLabel} SEALED`, this.player.position, "info", GATE_PLAY_BOUNDS);
    } else {
      gameState.sceneProgress.buckramGateOpen = getFinalGateReadiness().buckramGateOpen ? 1 : 0;
      const ready = getFinalGateReadiness().ready && hasProcessItem("buckram_key");
      this.toast.show(ready ? "PRESS READY" : "PRESS LOCKED", this.player.position, ready ? "info" : "warn", GATE_PLAY_BOUNDS);
    }
    this.updateBindingPacketVisibility();
    this.updateBindingRoomVisuals();
    this.syncRoomTraversal();
    this.syncVisibleState(false);
    this.savePhysicalBindingProgress();
  }

  private applyBindingPacketReward(packet: PhysicalBindingPacket) {
    if (packet.id === "front-matter-packet") {
      gameState.sceneProgress.frontMatterAssemblyComplete = 1;
      gameState.sceneProgress.frontMatterAssemblyStep = FRONT_MATTER_ASSEMBLY_PROMPTS.length;
      gameState.sceneProgress.readerAidRegistersComplete = 1;
      gameState.sceneProgress.readerAidRegistersStep = READER_AID_REGISTER_PROMPTS.length;
      addDocumentPoints(8, "front matter and reader-aid packet sealed");
    } else if (packet.id === "index-proof-docket") {
      gameState.sceneProgress.indexDocketComplete = 1;
      gameState.sceneProgress.indexDocketStep = INDEX_DOCKET_PROMPTS.length;
      gameState.sceneProgress.typesetterCorrectionsComplete = 1;
      gameState.sceneProgress.typesetterCorrectionsStep = TYPESETTER_CORRECTIONS_PROMPTS.length;
      addDocumentPoints(8, "index and typesetter correction docket sealed");
    } else if (packet.id === "kellogg-certification") {
      gameState.sceneProgress.kelloggFinalCertificationComplete = 1;
      gameState.sceneProgress.kelloggFinalCertificationCorrectionNeeded = 0;
      gameState.sceneProgress.kelloggFinalCertificationStep = KELLOGG_CERTIFICATION_PROMPTS.length;
      addDocumentPoints(6, "Kellogg standards certification sealed by human review");
    } else if (packet.id === "gpo-binding-packet") {
      gameState.sceneProgress.gpoSegmentAssemblyComplete = 1;
      gameState.sceneProgress.gpoSegmentAssemblyStep = GPO_SEGMENT_ASSEMBLY_PROMPTS.length;
      gameState.sceneProgress.gpoPublicationComplete = 1;
      gameState.sceneProgress.gpoPublicationStep = GPO_PUBLICATION_PROMPTS.length;
      gameState.sceneProgress.publicationFundingComplete = 1;
      gameState.sceneProgress.publicationFundingStep = PUBLICATION_FUNDING_PROMPTS.length;
      addDocumentPoints(8, "GPO binding and funding packet sealed");
    } else if (packet.id === "public-release-packet") {
      gameState.sceneProgress.chapterReleaseComplete = 1;
      gameState.sceneProgress.chapterReleaseStep = CHAPTER_RELEASE_PROMPTS.length;
      gameState.sceneProgress.digitalReleaseComplete = 1;
      gameState.sceneProgress.digitalReleaseStep = DIGITAL_RELEASE_PROMPTS.length;
      gameState.sceneProgress.publicCitationComplete = 1;
      gameState.sceneProgress.publicCitationStep = PUBLIC_CITATION_CARD_PROMPTS.length;
      gameState.sceneProgress.releaseCalendarComplete = 1;
      gameState.sceneProgress.releaseCalendarStep = RELEASE_CALENDAR_PROMPTS.length;
      addDocumentPoints(10, "public release and citation packet sealed");
    }
    adjustReliability(3, `${packet.shortLabel} completed by accountable human review`);
    setLatestMessage(`${packet.shortLabel} FILED - ${this.bindingPackets.filter(entry => entry.status === "sealed").length}/5 BINDING STATIONS COMPLETE`);
  }

  private resolveKelloggCertificationViolations() {
    for (const record of unresolvedStandardsViolations()) {
      if (isLegacyCertificationExercise(record)) resolveStandardsViolation(record.id);
    }
  }

  private publishVolume() {
    this.published = true;
    this.canRestart = false;
    gameState.sceneProgress.buckramBindingStep = BUCKRAM_BINDING_TOTAL;
    gameState.sceneProgress.buckramBindingStatus = 0;
    gameState.sceneProgress.gpoSegmentAssemblyComplete = 1;
    gameState.sceneProgress.gpoSegmentAssemblyStep = GPO_SEGMENT_ASSEMBLY_PROMPTS.length;
    gameState.sceneProgress.gpoPublicationComplete = 1;
    gameState.sceneProgress.gpoPublicationStep = GPO_PUBLICATION_PROMPTS.length;
    gameState.sceneProgress.publicationFundingComplete = 1;
    gameState.sceneProgress.publicationFundingStep = PUBLICATION_FUNDING_PROMPTS.length;
    gameState.sceneProgress.readerAidRegistersComplete = 1;
    gameState.sceneProgress.readerAidRegistersStep = READER_AID_REGISTER_PROMPTS.length;
    gameState.sceneProgress.chapterReleaseComplete = 1;
    gameState.sceneProgress.chapterReleaseStep = CHAPTER_RELEASE_PROMPTS.length;
    gameState.sceneProgress.digitalReleaseComplete = 1;
    gameState.sceneProgress.digitalReleaseStep = DIGITAL_RELEASE_PROMPTS.length;
    gameState.sceneProgress.publicCitationComplete = 1;
    gameState.sceneProgress.publicCitationStep = PUBLIC_CITATION_CARD_PROMPTS.length;
    gameState.sceneProgress.releaseCalendarComplete = 1;
    gameState.sceneProgress.releaseCalendarStep = RELEASE_CALENDAR_PROMPTS.length;
    setHeldItem(null);
    setNearestInteractable(null);
    addProcessItem("buckram_key");
    addInventoryItem("Published FRUS Cover");
    ["telegram_001", "source_note_047", "cross_reference_001", "sbu_annotation_001", "proof_page_412"].forEach((documentId) => {
      publishDocument(documentId);
    });
    setGameMode("ending", "Published FRUS cover complete.");
    setFinalGateCertificationState({
      status: "published",
      nearestGate: true,
      checklistComplete: true,
      certifiedBy: gameState.playerProfile.displayName,
      requiredItem: "Buckram Key",
      message: "PUBLISHED FRUS COVER - HUMAN CERTIFICATION RECORDED"
    });
    markVolumeAssemblyCeremonyComplete();
    this.syncRoomTraversal();
    recordBindingCeremonyCompletion();
    const completionStats = finalizeCompletionStats();
    const outcome = completionStats.publicationOutcome;
    const trueEndingReady = outcome.id === "published_clean"
      && Boolean(gameState.sceneProgress.blackVaultBossCleared)
      && getTreatyFragmentCount() >= 3;
    gameState.sceneProgress.trueEndingPublicationCertified = trueEndingReady ? 1 : 0;
    setLatestMessage(outcome.id === "published_under_appeal"
      ? "PUBLISHED UNDER APPEAL - UNRESOLVED EQUITIES RECORDED - NEW GAME+ READY"
      : "PUBLISHED FRUS COVER - HUMAN CERTIFICATION RECORDED - NEW GAME+ READY");
    this.syncVisibleState(true);
    saveGameNow("manual");
    retroAudio.ending();
    if (outcome.id === "published_under_appeal") {
      this.showContestedPrize();
      this.time.delayedCall(350, () => {
        this.canRestart = true;
      });
    } else {
      this.playBindingCeremony();
    }
  }

  private playBindingCeremony() {
    const hasAnimation = this.textures.exists(VOLUME_ASSEMBLY_ASSETS.bindingAnimation.key);
    this.add.rectangle(128, 120, 256, 240, color(PALETTE.black), 0.92).setDepth(880);
    this.add.text(128, 20, "BINDING CEREMONY", {
      fontFamily: "monospace",
      fontSize: "11px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5).setDepth(884);
    this.add.text(128, 35, "ASSEMBLING THE PUBLIC FRUS VOLUME", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5).setDepth(884);
    const sprite = hasAnimation
      ? this.add.sprite(128, 104, VOLUME_ASSEMBLY_ASSETS.bindingAnimation.key, 0).setDepth(885)
      : null;
    if (!sprite) {
      this.finishBindingCeremonyPresentation();
      return;
    }
    let frame = 0;
    this.time.addEvent({
      delay: 170,
      repeat: VOLUME_ASSEMBLY_ASSETS.bindingAnimation.frameCount - 1,
      callback: () => {
        sprite.setFrame(frame);
        frame += 1;
      }
    });
    this.time.delayedCall(1250, () => {
      sprite.destroy();
      this.finishBindingCeremonyPresentation();
    });
  }

  private finishBindingCeremonyPresentation() {
    if (gameState.sceneProgress.trueEndingPublicationCertified) {
      setLatestMessage("Complete treaty record certified. True-ending docket opened.");
      transitionTo(this, "TrueEndingScene");
      return;
    }
    this.showPublishedPrize();
    this.canRestart = true;
  }

  private syncRoomTraversal() {
    const readiness = getFinalGateReadiness();
    const bindingComplete = !this.getActiveBindingPacket();
    setRoomTraversalState({
      currentRoomId: "G1",
      roomTitle: "Buckram Gate",
      roomType: "boss",
      visitedRoomIds: ["G1"],
      revealedRoomIds: ["G1"],
      exits: this.published ? {} : { west: "DV1" },
      lockedExits: bindingComplete && readiness.ready && hasProcessItem("buckram_key")
        ? {}
        : { north: bindingComplete ? "Publication gate checklist" : "Seal all five binding packets" },
      requiredItems: { north: "buckram_key" }
    });
  }

  private syncVisibleState(published: boolean) {
    const activePacket = this.getActiveBindingPacket();
    setVisibleEntities([
      "Buckram Gate",
      "Bindery inbox",
      "Human binding press",
      ...(!published ? ["Return passage to cleared Black Vault"] : []),
      "Buckram Key",
      "FRUS cover prize",
      "SNES published FRUS prize cover",
      published ? "Published FRUS Cover" : "Unpublished assembled cover",
      hiddenFirstEditionBonusLabel(gameState),
      ...BINDING_STATIONS.map((station) => station.label),
      ...(activePacket ? [activePacket.label] : [])
    ]);
    const status = published || (!activePacket && getFinalGateReadiness().ready && hasProcessItem("buckram_key")) ? "cleared" : "blocking";
    setVisibleThreats([
      {
        label: "30-YEAR LINE",
        x: 21,
        y: 126,
        spriteKey: "snes-wall-hold",
        behavior: "pressures the five-packet binding route",
        defeatMethod: "seal every packet and publish at the human binding press",
        status
      },
      {
        label: "DANN-E QUEUE",
        x: 235,
        y: 126,
        spriteKey: "snes-wall-danne-queue",
        behavior: "pushes against unresolved final assembly",
        defeatMethod: "complete the accountable bindery route without a shortcut",
        status
      }
    ]);
  }

  private showPublishedPrize() {
    this.showPublicationSummary(false);
  }

  private showContestedPrize() {
    this.showPublicationSummary(true);
  }

  private showPublicationSummary(appealed: boolean) {
    this.publicationSummary = new PublicationSummary(this, {
      compiler: gameState.playerProfile.displayName,
      stats: getCompletionStatsReadout(),
      volumesCompleted: gameState.volumesCompleted,
      textureKeys: [
        ...(appealed ? ["volume_contested_redacted"] : []),
        VOLUME_ASSEMBLY_ASSETS.completedHero.key,
        SNES_PUBLISHED_FRUS_PRIZE_ASSET.key,
        FALLBACK_PUBLISHED_FRUS_REWARD_TEXTURE
      ],
      canAct: () => this.canRestart,
      onTitle: () => this.restart(),
      onPageChange: (page) => {
        setVisibleEntities(page === "volume"
          ? ["Published FRUS volume", "Publication record button", "Return to title button"]
          : ["Publication record", "Completion stats", "Skills practiced", "Volume button", "Return to title button"]);
        setVisibleThreats([]);
        setNearestInteractable(null);
      }
    });
  }

  private restart() {
    if (!this.canRestart) return;
    this.canRestart = false;
    transitionTo(this, "TitleScene");
  }

  private isNear(x: number, y: number, radius: number) {
    const position = this.player.position;
    return Phaser.Math.Distance.Between(position.x, position.y, x, y) <= radius;
  }
}
