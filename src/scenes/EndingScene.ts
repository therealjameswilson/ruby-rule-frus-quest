import Phaser from "phaser";
import { ALT_ENDING_ASSETS, FRUS_VOLUMES, SCREENS, publicAssetPath } from "../assets/registry";
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
  getStatutoryClockStateReadout,
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
import { addObjectiveText, drawRoomFrame, transitionTo } from "../systems/sceneTransitions";
import { SNES_PUBLISHED_FRUS_PRIZE_ASSET } from "../game/snesAtlas";
import { hiddenFirstEditionBonusLabel } from "../game/secretReadingRoom";
import {
  addSnesFrusCoverAssembly,
  addSnesPublicationShrine,
  addSnesRoomLayer,
  addSnesStatutoryClock,
} from "../systems/snesPixelArt";
import { InteractionPrompt } from "../systems/interactionPrompt";
import { FeedbackToast } from "../systems/feedbackToast";
import { VOLUME_ASSEMBLY_ASSETS } from "../systems/volumeAssembly";
import type { Interactable } from "../game/types";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

const COVER_PIECES = [
  { fragment: "Front Matter Fragment", label: "TITLE", x: 10, y: 10, width: 56, height: 24 },
  { fragment: "Source Note Fragment", label: "DATES", x: 10, y: 34, width: 56, height: 19 },
  { fragment: "Routing Fragment", label: "START", x: 10, y: 53, width: 56, height: 32 },
  { fragment: "Referral Fragment", label: "SEAL", x: 10, y: 85, width: 56, height: 15 },
  { fragment: "Proof Fragment", label: "READ", x: 10, y: 100, width: 56, height: 7 }
] as const;

const GATE_PLAY_BOUNDS = { left: 16, right: 240, top: 48, bottom: 220 };
const BINDERY_INBOX = { x: 128, y: 190, radius: 28 };
const BINDING_PRESS = { x: 128, y: 148, radius: 28 };
const KELLOGG_CERTIFICATION_CONTEXT_PREFIX = "Kellogg final certification";
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
  labelText?: Phaser.GameObjects.Text;
}

const BINDING_STATIONS: readonly BindingStation[] = [
  { id: "front-matter-bench", label: "Front Matter Bench", shortLabel: "FRONT", x: 42, y: 102, accent: PALETTE.goldStamp, texture: "source-note" },
  { id: "index-desk", label: "Index Desk", shortLabel: "INDEX", x: 42, y: 164, accent: PALETTE.terminalCyan, texture: "proof-page" },
  { id: "kellogg-press", label: "Kellogg Seal Press", shortLabel: "SEAL", x: 128, y: 94, accent: PALETTE.classNetRed, texture: "citation-stamp" },
  { id: "gpo-handoff", label: "GPO Handoff", shortLabel: "GPO", x: 214, y: 102, accent: PALETTE.goldStamp, texture: "review-folder" },
  { id: "public-release-terminal", label: "Public Release Terminal", shortLabel: "PUBLIC", x: 214, y: 164, accent: PALETTE.terminalCyan, texture: "opennet-terminal" }
];

export class EndingScene extends Phaser.Scene {
  private player!: Player;
  private inventory!: InventoryOverlay;
  private reliability!: ReliabilityHud;
  private toast!: FeedbackToast;
  private interactionPrompt!: InteractionPrompt;
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
    const introKey = "intro_screen_256x224" satisfies keyof typeof SCREENS;
    if (!this.textures.exists(introKey)) {
      this.load.image(introKey, publicAssetPath(SCREENS[introKey]));
    }
  }

  create() {
    this.resetTransientState();
    setSceneState("EndingScene", "explore", "Buckram Gate: carry the first binding packet.");
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
    this.objectiveText = addObjectiveText(this);
    this.actionHint = this.add.text(8, 211, "", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.creamPaper,
      backgroundColor: PALETTE.black
    }).setDepth(811).setVisible(false);

    this.startPhysicalBindingLoop();
    this.syncRoomTraversal();
    this.syncVisibleState(false);
    this.updateGateReadout();
    if (gameState.finalGateCertification?.status === "published") {
      this.published = true;
      this.showPublishedPrize();
      this.canRestart = true;
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
    if (input.abilityJustPressed && !this.published) activateRoleAbility(this);

    if (this.published) {
      this.toast.update(delta, this.player.position, GATE_PLAY_BOUNDS);
      this.interactionPrompt.update(delta, null);
      this.clearPublicationTableRouteCue();
      this.player.update(delta, false);
      if (this.canRestart && input.aJustPressed) {
        this.restart();
      }
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

    this.player.update(delta, true, { bounds: GATE_PLAY_BOUNDS });
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
    this.add.rectangle(128, 58, 130, 28, color(PALETTE.black), 0.96)
      .setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(140);
    this.add.text(128, 47, "FRUS BINDERY", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5).setDepth(141);
    this.bindingProgressText = this.add.text(128, 56, "PACKETS 0/5", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5).setDepth(141);
    for (let index = 0; index < BUCKRAM_BINDING_TOTAL; index += 1) {
      this.bindingProgressLights.push(this.add.rectangle(108 + index * 10, 68, 7, 4, color(PALETTE.stoneDark))
        .setStrokeStyle(1, color(PALETTE.stoneGray)).setDepth(141));
    }

    for (const station of BINDING_STATIONS) this.drawBindingStation(station);

    this.bindingPressFrame = this.add.rectangle(BINDING_PRESS.x, BINDING_PRESS.y, 62, 36, color(PALETTE.black), 0.96)
      .setStrokeStyle(2, color(PALETTE.classNetRed)).setDepth(146);
    this.add.rectangle(BINDING_PRESS.x, BINDING_PRESS.y + 10, 52, 8, color(PALETTE.deepRuby))
      .setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(147);
    this.add.image(BINDING_PRESS.x - 20, BINDING_PRESS.y + 9, "buckram-key").setDepth(148);
    this.add.image(BINDING_PRESS.x + 20, BINDING_PRESS.y + 9, "citation-stamp").setDepth(148);
    this.add.rectangle(BINDING_PRESS.x, BINDING_PRESS.y - 5, 18, 20, color(PALETTE.deepRuby))
      .setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(148);
    this.add.rectangle(BINDING_PRESS.x - 5, BINDING_PRESS.y - 5, 2, 18, color(PALETTE.buckramHighlight)).setDepth(149);
    this.bindingPressLabel = this.add.text(BINDING_PRESS.x, BINDING_PRESS.y + 17, "LOCKED PRESS", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.classNetRed
    }).setOrigin(0.5).setDepth(149);

    this.add.rectangle(BINDERY_INBOX.x, BINDERY_INBOX.y, 58, 16, color(PALETTE.black), 0.96)
      .setStrokeStyle(2, color(PALETTE.terminalCyan)).setDepth(145);
    this.add.text(BINDERY_INBOX.x, BINDERY_INBOX.y + 11, "BINDERY INBOX", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.terminalCyan
    }).setOrigin(0.5).setDepth(146);

  }

  private drawBindingStation(station: BindingStation) {
    this.add.rectangle(station.x + 1, station.y + 2, 40, 26, color(PALETTE.black), 0.7).setDepth(142);
    this.add.rectangle(station.x, station.y, 38, 24, color(PALETTE.deepRuby), 0.98)
      .setStrokeStyle(2, color(station.accent)).setDepth(143);
    this.add.image(station.x - 10, station.y, station.texture).setDepth(144);
    this.bindingStationLights.set(
      station.id,
      this.add.rectangle(station.x + 10, station.y - 3, 10, 5, color(PALETTE.stoneDark))
        .setStrokeStyle(1, color(station.accent)).setDepth(144)
    );
    this.add.rectangle(station.x + 10, station.y + 4, 10, 2, color(PALETTE.creamPaper)).setDepth(144);
    this.add.text(station.x, station.y + 16, station.shortLabel, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: station.accent
    }).setOrigin(0.5).setDepth(145);
  }

  private updateGateReadout() {
    const activePacket = this.getActiveBindingPacket();
    const readiness = getFinalGateReadiness();
    const ready = !activePacket && readiness.ready && hasProcessItem("buckram_key");
    this.updateBindingRoomVisuals();

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
      setObjective(`Buckram Gate: ${message}`);
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
    setObjective(ready
      ? nearPress
        ? "Buckram Gate: press Space to bind and publish the FRUS volume."
        : "Buckram Gate: carry the Buckram Key to the binding press."
      : `Buckram Gate locked: ${blocker.short}.`);
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
    this.interactionPrompt.update(delta, target, undefined, { badge: "A", text: label });
    this.refreshPublicationTableRouteCue(label, position);
  }

  private publicationTableActionLabel() {
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

    const start = { x: Math.round(this.player.position.x), y: Math.round(this.player.position.y - 12) };
    const end = { x: target.x, y: target.y };
    const cueKey = `G1:${label}:${start.x},${start.y}->${end.x},${end.y}`;
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
      .setStrokeStyle(2, color(accent))
      .setName("buckram-publication-table-route-target-glow")
      .setDepth(240));

    const distance = Phaser.Math.Distance.Between(start.x, start.y, end.x, end.y);
    const steps = Math.max(1, Math.min(8, Math.floor(distance / 12)));
    for (let index = 1; index <= steps; index += 1) {
      const t = index / (steps + 1);
      const x = Math.round(Phaser.Math.Linear(start.x, end.x, t));
      const y = Math.round(Phaser.Math.Linear(start.y, end.y, t));
      this.trackPublicationTableRouteCue(this.add.rectangle(x, y, 5, 5, color(index % 2 === 0 ? PALETTE.goldStamp : accent), 0.92)
        .setName("buckram-publication-table-route-dot")
        .setDepth(241));
    }

  }

  private handleGateAction() {
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
        .setDepth(240).setVisible(false);
      physicalPacket.labelText = this.add.text(physicalPacket.x, physicalPacket.y + 13, physicalPacket.shortLabel, {
        fontFamily: "monospace",
        fontSize: "5px",
        color: physicalPacket.accent,
        backgroundColor: PALETTE.black
      }).setOrigin(0.5).setDepth(241).setVisible(false);
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
  }

  private updateCarriedBindingPacket() {
    const activePacket = this.getActiveBindingPacket();
    if (activePacket?.status === "carried" && activePacket.icon) {
      activePacket.x = Math.round(this.player.position.x);
      activePacket.y = Math.round(this.player.position.y - 16);
      activePacket.icon.setPosition(activePacket.x, activePacket.y).setDepth(Math.round(this.player.position.y) + 4);
      activePacket.labelText?.setPosition(activePacket.x, activePacket.y + 13).setDepth(Math.round(this.player.position.y) + 5);
    }
    this.updateBindingPacketVisibility();
  }

  private updateBindingPacketVisibility() {
    const activePacket = this.getActiveBindingPacket();
    for (const packet of this.bindingPackets) {
      const visible = packet === activePacket;
      packet.icon?.setVisible(visible);
      packet.labelText?.setVisible(visible && packet.status !== "carried");
    }
  }

  private updateBindingRoomVisuals() {
    const completed = this.bindingPackets.filter((packet) => packet.status === "sealed").length;
    this.bindingProgressText?.setText(`PACKETS ${completed}/${BUCKRAM_BINDING_TOTAL}`);
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
        packet.status = "waiting";
        packet.routedStation = undefined;
        packet.x = BINDERY_INBOX.x;
        packet.y = BINDERY_INBOX.y - 13;
        packet.icon?.setPosition(packet.x, packet.y);
        packet.labelText?.setPosition(packet.x, packet.y + 13);
        setHeldItem(null);
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
      packet.labelText?.setPosition(packet.x, packet.y + 13).setDepth(243);
      setHeldItem(null);
      setLatestMessage(`ROUTE: ${packet.shortLabel} placed at ${station.label}.`);
      this.savePhysicalBindingProgress(packet);
      retroAudio.confirm();
      this.updateBindingPacketVisibility();
      return;
    }

    const station = this.bindingStation(packet.station);
    if (!this.isNear(station.x, station.y, 36)) {
      retroAudio.warning();
      setLatestMessage(`SEAL: return to ${station.label}.`);
      return;
    }
    packet.status = "sealed";
    this.applyBindingPacketReward(packet);
    this.savePhysicalBindingProgress();
    retroAudio.stamp();
    this.updateBindingPacketVisibility();
    this.updateBindingRoomVisuals();
    this.syncRoomTraversal();
    this.syncVisibleState(false);
    const nextPacket = this.getActiveBindingPacket();
    if (nextPacket) {
      nextPacket.x = BINDERY_INBOX.x;
      nextPacket.y = BINDERY_INBOX.y - 13;
      nextPacket.icon?.setPosition(nextPacket.x, nextPacket.y);
      nextPacket.labelText?.setPosition(nextPacket.x, nextPacket.y + 13);
      this.toast.show(`${packet.shortLabel} SEALED`, this.player.position, "info", GATE_PLAY_BOUNDS);
    } else {
      gameState.sceneProgress.buckramGateOpen = getFinalGateReadiness().buckramGateOpen ? 1 : 0;
      this.toast.show("PRESS READY", this.player.position, "info", GATE_PLAY_BOUNDS);
    }
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
      this.resolveKelloggCertificationViolations();
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
    setLatestMessage(`${packet.shortLabel} SEALED - ${packet.checkCount} FINAL CHECKS RECORDED`);
  }

 private resolveKelloggCertificationViolations() {
    for (const record of unresolvedStandardsViolations()) {
      if (record.context?.startsWith(KELLOGG_CERTIFICATION_CONTEXT_PREFIX)) resolveStandardsViolation(record.id);
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
      ? this.add.sprite(128, 100, VOLUME_ASSEMBLY_ASSETS.bindingAnimation.key, 0).setScale(0.72).setDepth(885)
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
      exits: {},
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
    const clock = getStatutoryClockStateReadout();
    this.drawPublishedBackdrop();

    addSnesPublicationShrine(this, {
      x: 128,
      y: 82,
      ready: true,
      published: true,
      fragmentsCollected: COVER_PIECES.length,
      fragmentsNeeded: COVER_PIECES.length,
      apparatusComplete: true,
      stampsComplete: true,
      reliabilityReady: true,
      depth: 920
    });
    addSnesStatutoryClock(this, {
      x: 41,
      y: 78,
      elapsedYears: clock.elapsedYears,
      deadlineYears: clock.deadlineYears,
      yearsRemaining: clock.yearsRemaining,
      status: "published",
      depth: 929
    });
    this.drawPublishedPrize(128, 76, 930);
    this.add.text(128, 5, "BUCKRAM GATE CLEARED", {
      fontFamily: "monospace",
      fontSize: "11px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5).setDepth(931);
    this.add.text(128, 16, "PUBLISHED FRUS COVER", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5).setDepth(931);
    this.add.text(128, 25, `${gameState.playerProfile.displayName.toUpperCase()} / ${gameState.playerProfile.roleLabel.toUpperCase()}`, {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5).setDepth(931);
    this.drawCompletionStatsBlock(128, 164);

    this.add.rectangle(128, 213, 236, 28, color(PALETTE.black)).setStrokeStyle(2, color(PALETTE.terminalCyan)).setDepth(931);
    const practiced = [
      "SOURCE NOTES NEED PROVENANCE.",
      "OPENNET AND CLASSNET STAY SEPARATE.",
      "REFERRALS LEAVE A VISIBLE TRACE.",
      "AI TOOLS PROPOSE; HUMANS DECIDE.",
      hiddenFirstEditionBonusLabel(gameState).toUpperCase()
    ];
    practiced.forEach((line, index) => {
      this.add.text(16, 202 + index * 5, line, {
        fontFamily: "monospace",
        fontSize: "5px",
        color: PALETTE.terminalCyan
      }).setDepth(932);
    });

    this.add.text(128, 233, "SPACE: RETURN TO TITLE", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5).setDepth(932);
  }

  private showContestedPrize() {
    const clock = getStatutoryClockStateReadout();
    const bgKey = "interagency_review_room" satisfies keyof typeof ALT_ENDING_ASSETS;
    if (this.textures.exists(bgKey)) {
      const background = this.add.image(128, 120, bgKey).setDepth(900);
      background.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    } else {
      this.add.rectangle(128, 120, 256, 240, color(PALETTE.deepRuby)).setDepth(900);
      this.add.rectangle(128, 96, 210, 92, color(PALETTE.stoneDark), 0.88).setStrokeStyle(2, color(PALETTE.goldStamp)).setDepth(901);
      this.add.rectangle(128, 146, 160, 34, color(PALETTE.creamPaper), 0.92).setStrokeStyle(2, color(PALETTE.black)).setDepth(902);
    }

    addSnesStatutoryClock(this, {
      x: 40,
      y: 70,
      elapsedYears: clock.elapsedYears,
      deadlineYears: clock.deadlineYears,
      yearsRemaining: clock.yearsRemaining,
      status: "published",
      depth: 925
    });

    this.add.text(128, 5, "CONTESTED DECLASSIFICATION", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5).setDepth(931);
    this.add.text(128, 17, "PUBLISHED UNDER APPEAL", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5).setDepth(931);

    const volumeKey = "volume_contested_redacted" satisfies keyof typeof ALT_ENDING_ASSETS;
    if (this.textures.exists(volumeKey)) {
      this.add.ellipse(128, 140, 70, 12, color(PALETTE.black), 0.62).setDepth(927);
      const cover = this.add.image(128, 84, volumeKey).setDepth(930);
      cover.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    } else {
      this.drawAssembledPrize(128, 82, 0.82, 930, true);
    }

    const stampKey = "stamp_under_appeal" satisfies keyof typeof ALT_ENDING_ASSETS;
    if (this.textures.exists(stampKey)) {
      const stamp = this.add.image(174, 75, stampKey).setDepth(932).setAngle(-8);
      stamp.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    } else {
      this.add.rectangle(174, 75, 92, 20, color(PALETTE.black), 0.9).setStrokeStyle(2, color(PALETTE.classNetRed)).setDepth(932);
      this.add.text(174, 70, "UNDER APPEAL", {
        fontFamily: "monospace",
        fontSize: "7px",
        color: PALETTE.goldStamp
      }).setOrigin(0.5).setDepth(933);
    }

    const outcome = getPublicationOutcomeReadout();
    this.add.rectangle(128, 143, 230, 24, color(PALETTE.black), 0.9).setStrokeStyle(1, color(PALETTE.classNetRed)).setDepth(931);
    this.add.text(128, 135, `${outcome.unresolvedEquities} UNRESOLVED EQUIT${outcome.unresolvedEquities === 1 ? "Y" : "IES"} RECORDED`, {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5).setDepth(932);
    this.add.text(128, 146, "THE PUBLICATION DOCKET CARRIES AN APPEAL TRAIL.", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5).setDepth(932);

    this.drawCompletionStatsBlock(128, 177);

    this.add.rectangle(128, 223, 236, 22, color(PALETTE.black)).setStrokeStyle(2, color(PALETTE.terminalCyan)).setDepth(931);
    [
      "CLEAN RUN: CLEAR EVERY EQUITY BEFORE THE BUCKRAM GATE.",
      "SPACE: RETURN TO TITLE"
    ].forEach((line, index) => {
      this.add.text(128, 216 + index * 8, line, {
        fontFamily: "monospace",
        fontSize: index === 0 ? "6px" : "7px",
        color: index === 0 ? PALETTE.terminalCyan : PALETTE.goldStamp
      }).setOrigin(0.5).setDepth(932);
    });
  }

  private drawCompletionStatsBlock(x: number, y: number) {
    const depth = 3100;
    const stats = getCompletionStatsReadout();
    this.add.rectangle(x, y, 236, 56, color(PALETTE.black)).setStrokeStyle(2, color(PALETTE.goldStamp)).setDepth(depth);
    this.add.text(x, y - 23, "COMPLETION STATS", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5).setDepth(depth + 1);

    const leftLines = [
      `TIME ${stats.totalPlayTime}`,
      `RELIABILITY ${stats.finalReliabilityScore}/100`,
      `PIECES ${stats.volumePiecesCollected}/${stats.volumePiecesTotal}`
    ];
    const rightLines = [
      `DANN-E ${stats.danneVariantsDefeated.total}`,
      `SECRET ${stats.hiddenCollectibleFound ? "YES" : "NO"}`,
      stats.publicationOutcome.id === "published_under_appeal" ? "OUTCOME APPEAL" : "OUTCOME CLEAN"
    ];

    leftLines.forEach((line, index) => {
      this.add.text(x - 105, y - 13 + index * 12, line, {
        fontFamily: "monospace",
        fontSize: "7px",
        color: index === 1 ? PALETTE.openNetGreen : PALETTE.creamPaper
      }).setOrigin(0, 0.5).setDepth(depth + 1);
    });
    rightLines.forEach((line, index) => {
      const lineColor = line === "OUTCOME APPEAL"
        ? PALETTE.classNetRed
        : index === 1 && stats.hiddenCollectibleFound
          ? PALETTE.terminalCyan
          : PALETTE.creamPaper;
      this.add.text(x + 12, y - 13 + index * 12, line, {
        fontFamily: "monospace",
        fontSize: "7px",
        color: lineColor
      }).setOrigin(0, 0.5).setDepth(depth + 1);
    });
  }

  private restart() {
    if (!this.canRestart) return;
    transitionTo(this, "TitleScene");
  }

  private drawPublishedBackdrop() {
    const key = "intro_screen_256x224" satisfies keyof typeof SCREENS;
    if (this.textures.exists(key)) {
      const source = this.textures.get(key).getSourceImage() as { width?: number; height?: number };
      if (source.width === GAME_WIDTH && source.height === 224) {
        this.add.rectangle(128, 120, 256, 240, color(PALETTE.black)).setDepth(900);
        this.add.image(0, 0, key).setOrigin(0).setDepth(901);
        this.add.rectangle(128, 120, 256, 240, color(PALETTE.deepRuby), 0.28).setDepth(902);
        this.add.rectangle(128, 224, 256, 16, color(PALETTE.black), 0.94).setDepth(903);
        return;
      }
    }

    this.add.rectangle(128, 120, 256, 240, color(PALETTE.deepRuby)).setDepth(900);
    for (let y = 0; y < GAME_HEIGHT; y += 8) {
      for (let x = (y / 8) % 2 === 0 ? 2 : 10; x < GAME_WIDTH; x += 16) {
        this.add.rectangle(x, y, 2, 2, color(PALETTE.buckramRed)).setDepth(901);
      }
    }
  }

  private isNear(x: number, y: number, radius: number) {
    const position = this.player.position;
    return Phaser.Math.Distance.Between(position.x, position.y, x, y) <= radius;
  }

  private drawAssembledPrize(x: number, y: number, scale: number, depth = 130, published = false) {
    return addSnesFrusCoverAssembly(this, {
      x,
      y,
      scale,
      depth,
      pieces: COVER_PIECES,
      earnedFragments: gameState.volumeFragments,
      published,
      title: published ? "PUBLISHED FRUS" : "ASSEMBLED FRUS"
    });
  }

  private drawPublishedPrize(x: number, y: number, depth = 130) {
    const rewardTexture = this.textures.exists(VOLUME_ASSEMBLY_ASSETS.completedHero.key)
      ? VOLUME_ASSEMBLY_ASSETS.completedHero.key
      : this.textures.exists(SNES_PUBLISHED_FRUS_PRIZE_ASSET.key)
      ? SNES_PUBLISHED_FRUS_PRIZE_ASSET.key
      : this.textures.exists(FALLBACK_PUBLISHED_FRUS_REWARD_TEXTURE)
        ? FALLBACK_PUBLISHED_FRUS_REWARD_TEXTURE
        : null;
    if (!rewardTexture) {
      return this.drawAssembledPrize(x, y, 0.82, depth, true);
    }

    const texture = this.textures.get(rewardTexture);
    const source = texture.getSourceImage() as HTMLCanvasElement | HTMLImageElement;
    const usesSnesPrize = rewardTexture === SNES_PUBLISHED_FRUS_PRIZE_ASSET.key;
    const usesAssemblyHero = rewardTexture === VOLUME_ASSEMBLY_ASSETS.completedHero.key;
    const targetWidth = usesAssemblyHero ? 74 : usesSnesPrize ? 58 : 96;
    const targetHeight = usesAssemblyHero ? 74 : usesSnesPrize ? 84 : 64;
    const scale = Math.min(targetWidth / source.width, targetHeight / source.height);
    const renderedWidth = Math.round(source.width * scale);
    const renderedHeight = Math.round(source.height * scale);

    this.add.ellipse(x + 1, y + 38, renderedWidth + 18, 12, color(PALETTE.black), 0.62)
      .setName("published-frus-reward-shadow")
      .setDepth(depth - 2);
    this.add.rectangle(x, y, renderedWidth + 8, renderedHeight + 8, color(PALETTE.black), 0.92)
      .setStrokeStyle(2, color(PALETTE.goldStamp))
      .setName("published-frus-reward-frame")
      .setDepth(depth - 1);
    this.add.rectangle(x, y - Math.round(renderedHeight / 2) - 8, 74, 9, color(PALETTE.deepRuby), 1)
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setName("published-frus-reward-title-band")
      .setDepth(depth + 1);
    this.add.text(x, y - Math.round(renderedHeight / 2) - 12, "FINAL PRIZE", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp,
      align: "center"
    }).setOrigin(0.5, 0).setName("published-frus-reward-title").setDepth(depth + 2);

    const cover = this.add.image(x, y, rewardTexture)
      .setScale(scale)
      .setName(usesAssemblyHero ? "published-frus-volume-assembly-hero" : usesSnesPrize ? "published-frus-snes-prize-art" : "published-frus-reward-art")
      .setDepth(depth);
    cover.setData("rewardTexture", rewardTexture);
    cover.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

    for (const [dx, dy] of [[-55, -38], [55, -31], [-51, 35], [50, 32], [0, -45]] as const) {
      this.add.rectangle(x + dx, y + dy, 4, 4, color(PALETTE.goldStamp), 0.94)
        .setName("published-frus-reward-spark")
        .setDepth(depth + 3);
      this.add.rectangle(x + dx + 1, y + dy + 1, 1, 1, color(PALETTE.white), 0.96)
        .setName("published-frus-reward-spark-core")
        .setDepth(depth + 4);
    }

    this.add.rectangle(x, y + Math.round(renderedHeight / 2) + 9, 92, 10, color(PALETTE.black), 0.96)
      .setStrokeStyle(1, color(PALETTE.openNetGreen))
      .setName("published-frus-reward-caption-frame")
      .setDepth(depth + 1);
    this.add.text(x, y + Math.round(renderedHeight / 2) + 5, "PUBLIC FRUS VOLUME", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.openNetGreen,
      align: "center"
    }).setOrigin(0.5, 0).setName("published-frus-reward-caption").setDepth(depth + 2);

    return cover;
  }
}
