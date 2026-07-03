import Phaser from "phaser";
import { FRUS_VOLUMES } from "../assets/registry";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE, PROCESS_STAMPS } from "../game/constants";
import {
  evaluateKelloggCertificationAnswer,
  getKelloggCertificationPrompt,
  KELLOGG_CERTIFICATION_PROMPTS,
  kelloggCertificationComplete
} from "../game/kelloggCertification";
import {
  evaluateGpoPublicationAnswer,
  getGpoPublicationPrompt,
  GPO_PUBLICATION_PROMPTS,
  gpoPublicationComplete
} from "../game/gpoPublication";
import {
  CHAPTER_RELEASE_PROMPTS,
  chapterReleaseComplete,
  evaluateChapterReleaseAnswer,
  getChapterReleasePrompt
} from "../game/chapterReleaseStatus";
import {
  DIGITAL_RELEASE_PROMPTS,
  digitalReleaseComplete,
  evaluateDigitalReleaseAnswer,
  getDigitalReleasePrompt
} from "../game/digitalRelease";
import {
  PUBLIC_CITATION_CARD_PROMPTS,
  evaluatePublicCitationCardAnswer,
  getPublicCitationCardPrompt,
  publicCitationCardComplete
} from "../game/publicCitationCard";
import {
  evaluatePublicationFundingAnswer,
  getPublicationFundingPrompt,
  PUBLICATION_FUNDING_PROMPTS,
  publicationFundingComplete
} from "../game/publicationFundingQueue";
import {
  evaluateReaderAidRegisterAnswer,
  getReaderAidRegisterPrompt,
  READER_AID_REGISTER_PROMPTS,
  readerAidRegistersComplete
} from "../game/readerAidRegisters";
import {
  RELEASE_CALENDAR_PROMPTS,
  evaluateReleaseCalendarAnswer,
  getReleaseCalendarPrompt,
  releaseCalendarComplete
} from "../game/releaseCalendar";
import {
  evaluateGpoSegmentAssemblyAnswer,
  getGpoSegmentAssemblyPrompt,
  GPO_SEGMENT_ASSEMBLY_PROMPTS,
  gpoSegmentAssemblyComplete
} from "../game/gpoSegmentAssembly";
import {
  evaluateFrontMatterAssemblyAnswer,
  frontMatterAssemblyComplete,
  FRONT_MATTER_ASSEMBLY_PROMPTS,
  getFrontMatterAssemblyPrompt
} from "../game/frontMatterAssembly";
import {
  evaluateIndexDocketAnswer,
  getIndexDocketPrompt,
  INDEX_DOCKET_PROMPTS,
  indexDocketComplete
} from "../game/indexDocket";
import {
  evaluateTypesetterCorrectionsAnswer,
  getTypesetterCorrectionsPrompt,
  TYPESETTER_CORRECTIONS_PROMPTS,
  typesetterCorrectionsComplete
} from "../game/typesetterCorrections";
import {
  addDocumentPoints,
  addInventoryItem,
  addProcessItem,
  gameState,
  getFinalGateReadiness,
  getPublicationReadinessReadout,
  getStatutoryClockStateReadout,
  hasProcessItem,
  publishDocument,
  resolveStandardsViolation,
  setFinalGateCertificationState,
  setGameMode,
  setLatestMessage,
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
import { applyStandardsViolation, ReliabilityHud } from "../systems/reliability";
import { activateRoleAbility } from "../systems/roleAbility";
import { handleOpenOverlays } from "../systems/overlayInput";
import { addObjectiveText, drawRoomFrame, transitionTo } from "../systems/sceneTransitions";
import { SNES_PROCESS_STAMP_RELIC_ASSET, SNES_PUBLISHED_FRUS_PRIZE_ASSET } from "../game/snesAtlas";
import {
  addSnesFrusCoverAssembly,
  addSnesPublicationShrine,
  addSnesPublicationTeam,
  addSnesProgressMural,
  addSnesRoomLayer,
  addSnesStatutoryClock,
  addSnesWorkflowRelicRack,
  addSnesWorldMap
} from "../systems/snesPixelArt";
import { ChoicePrompt } from "../systems/verification";
import { InteractionPrompt } from "../systems/interactionPrompt";
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
const CERTIFICATION_TABLE = { x: 128, y: 176, radius: 30 };
const KELLOGG_CERTIFICATION_CONTEXT_PREFIX = "Kellogg final certification";
const FALLBACK_PUBLISHED_FRUS_REWARD_TEXTURE: keyof typeof FRUS_VOLUMES = "reward_legendary";
type BuckramBlockerIcon = "stamp" | "cover" | "equity" | "map" | "apparatus" | "bracket" | "standards" | "reliability" | "key" | "ready";
interface BuckramBlockerCue {
  short: string;
  detail: string;
  icon: BuckramBlockerIcon;
}

export class EndingScene extends Phaser.Scene {
  private player!: Player;
  private inventory!: InventoryOverlay;
  private reliability!: ReliabilityHud;
  private certificationPrompt!: ChoicePrompt;
  private interactionPrompt!: InteractionPrompt;
  private objectiveText!: Phaser.GameObjects.Text;
  private actionHint!: Phaser.GameObjects.Text;
  private gateStatusText?: Phaser.GameObjects.Text;
  private gateBlockerText?: Phaser.GameObjects.Text;
  private gateBlockerIconObjects: Phaser.GameObjects.GameObject[] = [];
  private publicationTableRouteCueObjects: Phaser.GameObjects.GameObject[] = [];
  private publicationTableRouteCueKey = "";
  private canRestart = false;
  private published = false;

  constructor() {
    super("EndingScene");
  }

  create() {
    setSceneState("EndingScene", "explore", "Buckram Gate: certify the volume at the publication table.");
    retroAudio.startMusic("EndingScene");
    this.cameras.main.setBackgroundColor(PALETTE.deepRuby);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.deepRuby));
    drawRoomFrame(this, "BUCKRAM GATE", PALETTE.goldStamp);
    addSnesRoomLayer(this, { roomId: "G1", roomType: "boss", theme: "ending" });
    this.drawGateRoom();

    this.player = new Player(this, 128, 204);
    this.inventory = new InventoryOverlay(this);
    this.reliability = new ReliabilityHud(this);
    this.certificationPrompt = new ChoicePrompt(this);
    this.interactionPrompt = new InteractionPrompt(this, 950);
    this.objectiveText = addObjectiveText(this);
    this.actionHint = this.add.text(8, 211, "", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.creamPaper,
      backgroundColor: PALETTE.black
    }).setDepth(811);

    this.syncRoomTraversal();
    this.syncVisibleState(false);
    this.updateGateReadout();
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
      this.interactionPrompt.update(delta, null);
      this.clearPublicationTableRouteCue();
      this.player.update(delta, false);
      if (this.canRestart && input.aJustPressed) {
        this.restart();
      }
      return;
    }

    if (this.certificationPrompt.active) {
      this.interactionPrompt.update(delta, null);
      this.clearPublicationTableRouteCue();
      this.certificationPrompt.updateInput();
      this.player.update(delta, false);
      return;
    }

    if (handleOpenOverlays(this.inventory, this.reliability)) {
      this.interactionPrompt.update(delta, null);
      this.clearPublicationTableRouteCue();
      this.player.update(delta, false);
      return;
    }

    if (input.pauseJustPressed) {
      setLatestMessage("Buckram Gate paused. Human certification still required.");
    }

    this.player.update(delta, true, { bounds: GATE_PLAY_BOUNDS });
    this.updateGateReadout();
    this.updatePublicationTableCue(delta);
    if (input.aJustPressed) {
      this.handleGateAction();
    }
    this.reliability.update();
    this.objectiveText.setText(gameState.objective);
  }

  private drawGateRoom() {
    const readiness = getFinalGateReadiness();
    const publication = getPublicationReadinessReadout();
    const clock = getStatutoryClockStateReadout();
    const ready = readiness.ready && hasProcessItem("buckram_key");
    addSnesWorldMap(this, 50, 78, "G1 GATE", "buckram-gate-map");
    addSnesWorkflowRelicRack(this, 184, 78);
    addSnesProgressMural(this, {
      x: 128,
      y: 38,
      pendantsCollected: publication.pendants.collected,
      pendantsRequired: publication.pendants.required,
      crystalsCollected: publication.crystals.collected,
      crystalsRequired: publication.crystals.required,
      fragmentsCollected: publication.coverFragments.collected,
      fragmentsNeeded: publication.coverFragments.required,
      repositoryMapComplete: publication.repositoryCoverageMap.complete,
      apparatusComplete: publication.apparatus.complete,
      standardsClear: publication.standards.clear,
      buckramKeyHeld: publication.buckramKeyHeld,
      gateOpen: publication.buckramGateOpen,
      completionRatio: publication.completionRatio,
      depth: 116
    });
    addSnesStatutoryClock(this, {
      x: 45,
      y: 112,
      elapsedYears: clock.elapsedYears,
      deadlineYears: clock.deadlineYears,
      yearsRemaining: clock.yearsRemaining,
      status: clock.status,
      depth: 116
    });

    this.drawStoneBureaucracyWall(74, 130, "30-YR", ready, "snes-wall-hold");
    this.drawStoneBureaucracyWall(182, 130, "DANN-E", ready, "snes-wall-danne-queue");

    this.add.rectangle(128, 89, 104, 90, color(PALETTE.black)).setStrokeStyle(2, color(ready ? PALETTE.goldStamp : PALETTE.classNetRed)).setDepth(94);
    this.add.rectangle(128, 55, 72, 8, color(PALETTE.deepRuby)).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(95);
    this.add.text(128, 51, "PUBLICATION GATE", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: ready ? PALETTE.goldStamp : PALETTE.classNetRed
    }).setOrigin(0.5, 0).setDepth(96);
    addSnesPublicationShrine(this, {
      x: 128,
      y: 100,
      ready,
      fragmentsCollected: readiness.fragmentsCollected,
      fragmentsNeeded: readiness.fragmentsNeeded,
      apparatusComplete: readiness.publicationApparatus.complete,
      stampsComplete: readiness.missingStamps.length === 0,
      reliabilityReady: readiness.reliabilityReady,
      depth: 112
    });
    this.drawAssembledPrize(128, 100, 0.76);
    if (!ready) {
      this.add.rectangle(128, 103, 70, 72, color(PALETTE.black)).setDepth(151);
      this.gateStatusText = this.add.text(128, 91, "LOCKED", {
        fontFamily: "monospace",
        fontSize: "9px",
        color: PALETTE.classNetRed
      }).setName("buckram-gate-status-label").setOrigin(0.5).setDepth(152);
      this.gateBlockerText = this.add.text(128, 103, "NEXT\nCHECK", {
        fontFamily: "monospace",
        fontSize: "6px",
        color: PALETTE.creamPaper,
        align: "center"
      }).setName("buckram-gate-blocker-label").setOrigin(0.5).setDepth(152);
    }

    this.drawCertificationTable(ready);
    this.drawFinalChecklist(readiness);
  }

  private drawCertificationTable(ready: boolean) {
    this.add.rectangle(CERTIFICATION_TABLE.x + 2, CERTIFICATION_TABLE.y + 3, 96, 24, color(PALETTE.black)).setDepth(155);
    this.add.rectangle(CERTIFICATION_TABLE.x, CERTIFICATION_TABLE.y, 96, 24, color(PALETTE.deepRuby)).setStrokeStyle(2, color(ready ? PALETTE.goldStamp : PALETTE.stoneGray)).setDepth(156);
    this.add.image(CERTIFICATION_TABLE.x - 33, CERTIFICATION_TABLE.y - 2, "buckram-key").setDepth(157);
    this.add.image(CERTIFICATION_TABLE.x + 32, CERTIFICATION_TABLE.y - 2, "citation-stamp").setDepth(157);
    this.add.rectangle(CERTIFICATION_TABLE.x, CERTIFICATION_TABLE.y - 3, 40, 8, color(PALETTE.creamPaper)).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(157);
    this.add.text(CERTIFICATION_TABLE.x, CERTIFICATION_TABLE.y - 7, "CERTIFY", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: ready ? PALETTE.deepRuby : PALETTE.sepiaInk
    }).setOrigin(0.5, 0).setDepth(158);
    this.add.text(CERTIFICATION_TABLE.x, CERTIFICATION_TABLE.y + 12, "HUMAN PUBLICATION TABLE", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: ready ? PALETTE.goldStamp : PALETTE.stoneGray
    }).setOrigin(0.5).setDepth(158);
    addSnesPublicationTeam(this, {
      x: CERTIFICATION_TABLE.x,
      y: CERTIFICATION_TABLE.y,
      depth: 159,
      members: [
        { textureKey: "compiler", label: "COMP", role: "SELECT", x: -56, y: -8, accent: PALETTE.archiveAmber },
        { textureKey: "editor", label: "EDIT", role: "TEXT", x: -28, y: -28, accent: PALETTE.goldStamp },
        { textureKey: "declassification_coordinator", label: "DECL", role: "EQUITY", x: 28, y: -28, accent: PALETTE.classNetRed },
        { textureKey: "records_officer", label: "SRC", role: "NOTES", x: 56, y: -8, accent: PALETTE.terminalCyan },
        { textureKey: "reviewer", label: "PROOF", role: "READ", x: 0, y: -36, accent: PALETTE.creamPaper }
      ]
    });
  }

  private drawFinalChecklist(readiness: ReturnType<typeof getFinalGateReadiness>) {
    const clock = getStatutoryClockStateReadout();
    const lines = [
      `STAMPS ${readiness.missingStamps.length ? "WAIT" : "OK"}`,
      `FRAG ${readiness.fragmentsCollected}/${readiness.fragmentsNeeded}`,
      `APP ${readiness.publicationApparatus.complete ? "OK" : `${readiness.publicationApparatus.completed}/${readiness.publicationApparatus.total} WAIT`}`,
      `REL ${readiness.reliability}/${readiness.reliabilityMinimum}`,
      `KEY ${hasProcessItem("buckram_key") ? "OK" : "--"}`,
      `CLOCK ${clock.status === "published" || clock.status === "buckram_gate_open" ? "OK" : clock.status === "deadline_missed" ? "MISS" : clock.elapsedYears.toFixed(1)}`
    ];
    this.add.rectangle(44, 185, 68, 48, color(PALETTE.black)).setStrokeStyle(1, color(PALETTE.terminalCyan)).setDepth(156);
    this.add.text(14, 166, "PROCESS\nCHECKLIST", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.terminalCyan,
      align: "left"
    }).setName("buckram-process-checklist-title").setDepth(157);
    lines.forEach((line, index) => {
      this.add.text(14, 179 + index * 6, line, {
        fontFamily: "monospace",
        fontSize: "5px",
        color: line.includes("WAIT") || line.includes("--") || line.includes("MISS") ? PALETTE.classNetRed : PALETTE.creamPaper
      }).setDepth(157);
    });

    this.add.rectangle(213, 181, 58, 38, color(PALETTE.black)).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(156);
    this.add.text(188, 166, "HUMAN\nSIGN-OFF", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp,
      align: "left"
    }).setDepth(157);
    this.add.text(188, 184, "SPACE\nAT TABLE\nTO PUBLISH", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper,
      align: "left"
    }).setDepth(157);
  }

  private drawStoneBureaucracyWall(x: number, y: number, label: string, cleared: boolean, textureKey: string) {
    const fill = cleared ? PALETTE.stoneGray : PALETTE.stoneDark;
    this.add.ellipse(x, y + 15, 36, 8, color(PALETTE.black)).setDepth(109);
    if (this.textures.exists(textureKey)) {
      const image = this.add.image(x, y, textureKey).setDepth(111);
      if (cleared) image.setTint(color(PALETTE.stoneLight));
    } else {
      this.add.rectangle(x, y, 38, 26, color(PALETTE.black)).setDepth(110);
      this.add.rectangle(x - 1, y - 1, 34, 22, color(fill)).setStrokeStyle(2, color(cleared ? PALETTE.goldStamp : PALETTE.classNetRed)).setDepth(111);
      for (let ix = -13; ix <= 13; ix += 13) {
        for (let iy = -7; iy <= 7; iy += 7) {
          this.add.rectangle(x + ix, y + iy, 8, 5, color(cleared ? PALETTE.creamPaper : PALETTE.black)).setDepth(112);
        }
      }
    }
    this.add.text(x, y - 5, label, {
      fontFamily: "monospace",
      fontSize: "6px",
      color: cleared ? PALETTE.goldStamp : PALETTE.creamPaper
    }).setOrigin(0.5).setDepth(113);
    this.add.text(x, y + 7, cleared ? "CLEAR" : "BLOCK", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: cleared ? PALETTE.openNetGreen : PALETTE.classNetRed
    }).setOrigin(0.5).setDepth(113);
  }

  private updateGateReadout() {
    const readiness = getFinalGateReadiness();
    const ready = readiness.ready && hasProcessItem("buckram_key");
    const canCorrectCertification = this.canCorrectKelloggCertification(readiness);
    const canAssembleApparatus = this.canAssembleFrontMatter(readiness);
    const canFileReaderAidRegisters = this.canFileReaderAidRegisters(readiness);
    const canFileIndexDocket = this.canFileIndexDocket(readiness);
    const canResolveTypesetterCorrections = this.canResolveTypesetterCorrections(readiness);
    const indexDocketReady = Boolean(gameState.sceneProgress.indexDocketComplete);
    const readerAidsReady = Boolean(gameState.sceneProgress.readerAidRegistersComplete);
    const typesetterCorrectionsReady = Boolean(gameState.sceneProgress.typesetterCorrectionsComplete);
    const certificationComplete = Boolean(gameState.sceneProgress.kelloggFinalCertificationComplete);
    const gpoComplete = Boolean(gameState.sceneProgress.gpoPublicationComplete);
    const gpoSegmentsComplete = Boolean(gameState.sceneProgress.gpoSegmentAssemblyComplete || gpoComplete);
    const publicationFundingReady = Boolean(gameState.sceneProgress.publicationFundingComplete);
    const chapterStatusReady = Boolean(gameState.sceneProgress.chapterReleaseComplete);
    const digitalReleaseReady = Boolean(gameState.sceneProgress.digitalReleaseComplete);
    const publicCitationReady = Boolean(gameState.sceneProgress.publicCitationComplete);
    const releaseCalendarReady = Boolean(gameState.sceneProgress.releaseCalendarComplete);
    const nearGate = this.isNear(CERTIFICATION_TABLE.x, CERTIFICATION_TABLE.y, CERTIFICATION_TABLE.radius);
    const blockerCue = this.buckramBlockerCue(readiness);
    this.updateGateLockPanel(ready, blockerCue.short, blockerCue.icon);
    const status = ready ? "ready" : "locked";
    const message = ready
      ? certificationComplete
        ? gpoSegmentsComplete
          ? gpoComplete
            ? publicationFundingReady
              ? chapterStatusReady
                ? digitalReleaseReady
                  ? publicCitationReady
                    ? releaseCalendarReady
                      ? "Buckram Key ready: release calendar docket complete; publish the volume."
                      : "Public citation card complete: file the public release calendar docket."
                    : "Digital release complete: assemble the public citation card."
                  : "Chapter status ledger complete: prepare the history.state.gov digital release manifest."
                : "Funding queue cleared: file the public chapter status ledger."
              : "GPO handoff complete: route the publication funding queue."
            : "GPO segments assembled: complete the final publication handoff."
          : "Final certification complete: submit the GPO publication segments."
        : indexDocketReady
          ? typesetterCorrectionsReady
            ? "Buckram Key ready: complete the final Kellogg certification."
            : "Index docket filed: resolve the typesetter correction docket."
          : readerAidsReady
            ? "Reader aids filed: file the index docket."
            : "Front matter assembled: file persons and abbreviations registers."
      : canAssembleApparatus
        ? "Buckram Gate waits for front matter assembly at the human publication table."
      : canFileIndexDocket
        ? "Buckram Gate waits for the index docket at the human publication table."
      : canResolveTypesetterCorrections
        ? "Buckram Gate waits for the typesetter correction docket at the human publication table."
      : canCorrectCertification
        ? "Final certification needs repair at the human publication table."
      : `Buckram Gate locked: next ${blockerCue.detail}.`;

    setFinalGateCertificationState({
      status,
      nearestGate: nearGate,
      checklistComplete: ready,
      certifiedBy: null,
      requiredItem: "Buckram Key",
      message
    });

    setNearestInteractable(nearGate ? (ready ? "CERTIFY FRUS VOLUME" : "BUCKRAM GATE LOCKED") : null);
    if (ready) {
      setObjective(nearGate
        ? certificationComplete
          ? gpoSegmentsComplete
            ? gpoComplete
              ? publicationFundingReady
                ? chapterStatusReady
                  ? digitalReleaseReady
                    ? publicCitationReady
                      ? releaseCalendarReady
                        ? "Buckram Gate: press Space to publish the public FRUS volume."
                        : "Buckram Gate: press Space for release calendar docket."
                      : "Buckram Gate: press Space for public citation card."
                    : "Buckram Gate: press Space for digital release manifest."
                  : "Buckram Gate: press Space for chapter status ledger."
                : "Buckram Gate: press Space for publication funding queue."
              : "Buckram Gate: press Space for GPO publication handoff."
            : "Buckram Gate: press Space to assemble GPO segments."
          : indexDocketReady
            ? typesetterCorrectionsReady
              ? "Buckram Gate: press Space for final Kellogg certification."
              : "Buckram Gate: press Space for typesetter corrections."
            : readerAidsReady
              ? "Buckram Gate: press Space for index docket."
              : "Buckram Gate: press Space for reader-aid registers."
        : "Buckram Gate: stand at the human publication table.");
      this.actionHint.setText(nearGate
        ? certificationComplete
          ? gpoSegmentsComplete
            ? gpoComplete
              ? publicationFundingReady
                ? chapterStatusReady
                  ? digitalReleaseReady
                    ? publicCitationReady
                      ? releaseCalendarReady
                        ? "SPACE: PUBLISH PUBLIC FRUS VOLUME"
                        : "SPACE: RELEASE CALENDAR DOCKET"
                      : "SPACE: PUBLIC CITATION CARD"
                    : "SPACE: DIGITAL RELEASE MANIFEST"
                  : "SPACE: CHAPTER STATUS LEDGER"
                : "SPACE: PUBLICATION FUNDING QUEUE"
              : "SPACE: GPO PUBLICATION HANDOFF"
            : "SPACE: ASSEMBLE GPO SEGMENTS"
          : indexDocketReady
            ? typesetterCorrectionsReady
              ? "SPACE: FINAL KELLOGG CERTIFICATION"
              : "SPACE: TYPESETTER CORRECTIONS"
            : readerAidsReady
              ? "SPACE: INDEX DOCKET"
              : "SPACE: READER-AID REGISTERS"
        : "MOVE TO CERTIFICATION TABLE.");
      return;
    }
    if (canAssembleApparatus) {
      setNearestInteractable(nearGate ? "ASSEMBLE FRONT MATTER" : null);
      setObjective(nearGate
        ? "Buckram Gate: press Space to assemble front matter and reader aids."
        : "Return to the publication table to assemble front matter.");
      this.actionHint.setText(nearGate ? "SPACE: ASSEMBLE FRONT MATTER" : "MOVE TO PUBLICATION TABLE.");
      return;
    }
    if (canFileReaderAidRegisters) {
      setNearestInteractable(nearGate ? "FILE READER-AID REGISTERS" : null);
      setObjective(nearGate
        ? "Buckram Gate: press Space to file persons and abbreviations registers."
        : "Return to the publication table to file reader-aid registers.");
      this.actionHint.setText(nearGate ? "SPACE: READER-AID REGISTERS" : "MOVE TO PUBLICATION TABLE.");
      return;
    }
    if (canFileIndexDocket) {
      setNearestInteractable(nearGate ? "FILE INDEX DOCKET" : null);
      setObjective(nearGate
        ? "Buckram Gate: press Space to file the index docket."
        : "Return to the publication table to file the index docket.");
      this.actionHint.setText(nearGate ? "SPACE: INDEX DOCKET" : "MOVE TO PUBLICATION TABLE.");
      return;
    }
    if (canResolveTypesetterCorrections) {
      setNearestInteractable(nearGate ? "RESOLVE TYPESETTER CORRECTIONS" : null);
      setObjective(nearGate
        ? "Buckram Gate: press Space to resolve typesetter corrections."
        : "Return to the publication table to resolve typesetter corrections.");
      this.actionHint.setText(nearGate ? "SPACE: TYPESETTER CORRECTIONS" : "MOVE TO PUBLICATION TABLE.");
      return;
    }
    if (canCorrectCertification) {
      setNearestInteractable(nearGate ? "REPAIR FINAL CERTIFICATION" : null);
      setObjective(nearGate ? "Repair final certification: press Space to rerun Kellogg checks." : "Return to the publication table to repair certification.");
      this.actionHint.setText(nearGate ? "SPACE: REPAIR CERTIFICATION" : "MOVE TO CERTIFICATION TABLE.");
      return;
    }

    setObjective(`Buckram Gate locked: ${blockerCue.short}.`);
    this.actionHint.setText(nearGate ? `LOCKED: ${blockerCue.short}.` : `NEXT: ${blockerCue.short}.`);
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

  private updateGateLockPanel(ready: boolean, blockerShort: string, icon: BuckramBlockerIcon) {
    if (!this.gateStatusText || !this.gateBlockerText) return;
    this.gateStatusText
      .setText(ready ? "READY" : "LOCKED")
      .setColor(ready ? PALETTE.openNetGreen : PALETTE.classNetRed);
    this.gateBlockerText
      .setText(ready ? "HUMAN\nCERTIFY" : `NEXT\n${blockerShort}`)
      .setColor(ready ? PALETTE.goldStamp : PALETTE.creamPaper);
    this.refreshGateBlockerIcon(ready ? "ready" : icon);
  }

  private refreshGateBlockerIcon(icon: BuckramBlockerIcon) {
    for (const object of this.gateBlockerIconObjects) object.destroy();
    this.gateBlockerIconObjects = [];
    const x = 128;
    const y = 121;
    const add = (object: Phaser.GameObjects.GameObject, suffix: string) => {
      object.setName(`buckram-gate-blocker-icon-${icon}-${suffix}`);
      this.gateBlockerIconObjects.push(object);
      return object;
    };
    add(this.add.rectangle(x, y + 3, 18, 5, color(PALETTE.black), 0.72).setDepth(152), "shadow");
    if (icon === "stamp") {
      add(this.add.rectangle(x, y - 4, 8, 7, color(PALETTE.goldStamp)).setStrokeStyle(1, color(PALETTE.black)).setDepth(153), "handle");
      add(this.add.rectangle(x, y + 2, 15, 5, color(PALETTE.classNetRed)).setStrokeStyle(1, color(PALETTE.black)).setDepth(153), "base");
      add(this.add.rectangle(x, y + 5, 13, 2, color(PALETTE.buckramRed)).setDepth(154), "ink");
      return;
    }
    if (icon === "cover") {
      add(this.add.rectangle(x, y, 13, 14, color(PALETTE.deepRuby)).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(153), "cover");
      add(this.add.rectangle(x - 4, y, 2, 14, color(PALETTE.buckramRed)).setDepth(154), "spine");
      add(this.add.rectangle(x + 2, y - 3, 5, 1, color(PALETTE.goldStamp)).setDepth(154), "band-top");
      add(this.add.rectangle(x + 2, y + 3, 5, 1, color(PALETTE.goldStamp)).setDepth(154), "band-bottom");
      return;
    }
    if (icon === "equity") {
      add(this.add.polygon(x, y, [0, -8, 8, 0, 0, 8, -8, 0], color(PALETTE.terminalCyan)).setStrokeStyle(1, color(PALETTE.black)).setDepth(153), "crystal");
      add(this.add.rectangle(x, y, 7, 2, color(PALETTE.white), 0.82).setDepth(154), "glint");
      return;
    }
    if (icon === "map") {
      add(this.add.rectangle(x, y, 15, 12, color(PALETTE.creamPaper)).setStrokeStyle(1, color(PALETTE.black)).setDepth(153), "paper");
      add(this.add.rectangle(x - 4, y, 1, 10, color(PALETTE.buckramRed)).setDepth(154), "fold-a");
      add(this.add.rectangle(x + 2, y, 1, 10, color(PALETTE.goldStamp)).setDepth(154), "fold-b");
      add(this.add.rectangle(x + 4, y - 3, 5, 1, color(PALETTE.terminalCyan)).setDepth(154), "route");
      return;
    }
    if (icon === "apparatus") {
      add(this.add.rectangle(x - 2, y, 12, 14, color(PALETTE.creamPaper)).setStrokeStyle(1, color(PALETTE.black)).setDepth(153), "sheet");
      add(this.add.rectangle(x - 7, y, 2, 12, color(PALETTE.classNetRed)).setDepth(154), "margin");
      add(this.add.rectangle(x + 2, y - 3, 6, 1, color(PALETTE.goldStamp)).setDepth(154), "line-a");
      add(this.add.rectangle(x + 1, y + 2, 7, 1, color(PALETTE.sepiaInk)).setDepth(154), "line-b");
      return;
    }
    if (icon === "bracket") {
      add(this.add.rectangle(x - 5, y, 2, 14, color(PALETTE.classNetRed)).setDepth(153), "left-stem");
      add(this.add.rectangle(x + 5, y, 2, 14, color(PALETTE.classNetRed)).setDepth(153), "right-stem");
      add(this.add.rectangle(x - 2, y - 6, 7, 2, color(PALETTE.goldStamp)).setDepth(154), "top");
      add(this.add.rectangle(x + 2, y + 6, 7, 2, color(PALETTE.goldStamp)).setDepth(154), "bottom");
      return;
    }
    if (icon === "standards") {
      add(this.add.triangle(x, y, 0, 9, 8, -7, 16, 9, color(PALETTE.goldStamp)).setStrokeStyle(1, color(PALETTE.black)).setDepth(153), "seal");
      add(this.add.rectangle(x, y + 2, 2, 6, color(PALETTE.black)).setDepth(154), "mark");
      add(this.add.rectangle(x, y + 7, 2, 2, color(PALETTE.black)).setDepth(154), "dot");
      return;
    }
    if (icon === "reliability") {
      add(this.add.rectangle(x - 4, y - 3, 6, 6, color(PALETTE.classNetRed)).setDepth(153), "heart-left");
      add(this.add.rectangle(x + 4, y - 3, 6, 6, color(PALETTE.classNetRed)).setDepth(153), "heart-right");
      add(this.add.rectangle(x, y + 3, 10, 6, color(PALETTE.classNetRed)).setDepth(153), "heart-bottom");
      add(this.add.rectangle(x + 1, y, 3, 2, color(PALETTE.white), 0.75).setDepth(154), "glint");
      return;
    }
    if (icon === "key") {
      add(this.add.circle(x - 5, y, 4, color(PALETTE.goldStamp)).setStrokeStyle(1, color(PALETTE.black)).setDepth(153), "bow");
      add(this.add.rectangle(x + 2, y, 12, 3, color(PALETTE.goldStamp)).setDepth(153), "shaft");
      add(this.add.rectangle(x + 7, y + 3, 2, 4, color(PALETTE.goldStamp)).setDepth(153), "tooth-a");
      add(this.add.rectangle(x + 10, y + 3, 2, 3, color(PALETTE.goldStamp)).setDepth(153), "tooth-b");
      return;
    }
    add(this.add.rectangle(x, y, 14, 10, color(PALETTE.openNetGreen)).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(153), "seal");
    add(this.add.rectangle(x, y, 8, 2, color(PALETTE.black)).setAngle(-35).setDepth(154), "check-a");
    add(this.add.rectangle(x + 4, y - 2, 12, 2, color(PALETTE.black)).setAngle(-35).setDepth(154), "check-b");
  }

  private updatePublicationTableCue(delta: number) {
    const label = this.publicationTableActionLabel();
    if (!label) {
      this.interactionPrompt.update(delta, null);
      this.clearPublicationTableRouteCue();
      return;
    }

    const target = this.publicationTableTarget(label);
    this.interactionPrompt.update(delta, target, undefined, { badge: "A", text: label });
    this.refreshPublicationTableRouteCue(label);
  }

  private publicationTableActionLabel() {
    const readiness = getFinalGateReadiness();
    const ready = readiness.ready && hasProcessItem("buckram_key");
    if (!ready) {
      if (this.canAssembleFrontMatter(readiness)) return "FRONT MATTER";
      if (this.canFileReaderAidRegisters(readiness)) return "READER AIDS";
      if (this.canFileIndexDocket(readiness)) return "INDEX";
      if (this.canResolveTypesetterCorrections(readiness)) return "TYPESET";
      if (this.canCorrectKelloggCertification(readiness)) return "REPAIR";
      return null;
    }

    const certificationComplete = Boolean(gameState.sceneProgress.kelloggFinalCertificationComplete);
    const gpoSegmentsComplete = Boolean(gameState.sceneProgress.gpoSegmentAssemblyComplete || gameState.sceneProgress.gpoPublicationComplete);
    if (!certificationComplete) return "CERTIFY";
    if (!gpoSegmentsComplete) return "SEGMENTS";
    if (!gameState.sceneProgress.gpoPublicationComplete) return "GPO";
    if (!gameState.sceneProgress.publicationFundingComplete) return "FUNDING";
    if (!gameState.sceneProgress.chapterReleaseComplete) return "LEDGER";
    if (!gameState.sceneProgress.digitalReleaseComplete) return "DIGITAL";
    if (!gameState.sceneProgress.publicCitationComplete) return "CITATION";
    if (!gameState.sceneProgress.releaseCalendarComplete) return "CALENDAR";
    return "PUBLISH";
  }

  private publicationTableTarget(label: string): Interactable {
    return {
      id: "buckram-publication-table",
      label,
      x: CERTIFICATION_TABLE.x,
      y: CERTIFICATION_TABLE.y,
      radius: CERTIFICATION_TABLE.radius,
      kind: "manuscript",
      onInteract: () => undefined
    };
  }

  private refreshPublicationTableRouteCue(label: string) {
    const distance = Phaser.Math.Distance.Between(
      this.player.position.x,
      this.player.position.y,
      CERTIFICATION_TABLE.x,
      CERTIFICATION_TABLE.y
    );
    if (distance <= CERTIFICATION_TABLE.radius + 2) {
      this.clearPublicationTableRouteCue();
      return;
    }

    const start = { x: Math.round(this.player.position.x), y: Math.round(this.player.position.y - 12) };
    const end = { x: CERTIFICATION_TABLE.x, y: CERTIFICATION_TABLE.y };
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
    const finalLabels = new Set(["CERTIFY", "PUBLISH", "GPO", "CALENDAR"]);
    const accent = finalLabels.has(label)
      ? PALETTE.goldStamp
      : label === "REPAIR"
        ? PALETTE.classNetRed
        : PALETTE.terminalCyan;

    this.trackPublicationTableRouteCue(this.add.ellipse(end.x, end.y + 15, 96, 14, color(PALETTE.black), 0.35)
      .setName("buckram-publication-table-route-shadow")
      .setDepth(154));
    this.trackPublicationTableRouteCue(this.add.rectangle(end.x, end.y, 104, 30, color(PALETTE.black), 0)
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

    const width = Math.max(58, label.length * 5 + 10);
    this.trackPublicationTableRouteCue(this.add.rectangle(end.x, end.y + 25, width, 10, color(PALETTE.black), 0.94)
      .setStrokeStyle(1, color(accent))
      .setName("buckram-publication-table-route-label-frame")
      .setDepth(242));
    this.trackPublicationTableRouteCue(this.add.text(end.x, end.y + 22, label, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: accent
    }).setName("buckram-publication-table-route-label")
      .setOrigin(0.5, 0)
      .setDepth(243));
  }

  private handleGateAction() {
    const readiness = getFinalGateReadiness();
    const ready = readiness.ready && hasProcessItem("buckram_key");
    const canCorrectCertification = this.canCorrectKelloggCertification(readiness);
    const canAssembleApparatus = this.canAssembleFrontMatter(readiness);
    const canFileReaderAidRegisters = this.canFileReaderAidRegisters(readiness);
    const canFileIndexDocket = this.canFileIndexDocket(readiness);
    const canResolveTypesetterCorrections = this.canResolveTypesetterCorrections(readiness);
    const nearGate = this.isNear(CERTIFICATION_TABLE.x, CERTIFICATION_TABLE.y, CERTIFICATION_TABLE.radius);
    if (!nearGate) {
      retroAudio.warning();
      setLatestMessage("Move to the human publication table before certifying.");
      return;
    }
    if (!ready && canAssembleApparatus) {
      this.startFrontMatterAssembly();
      return;
    }
    if (!ready && canFileReaderAidRegisters) {
      this.startReaderAidRegisters();
      return;
    }
    if (!ready && canFileIndexDocket) {
      this.startIndexDocket();
      return;
    }
    if (!ready && canResolveTypesetterCorrections) {
      this.startTypesetterCorrections();
      return;
    }
    if (!ready && !canCorrectCertification) {
      retroAudio.warning();
      setLatestMessage("PROVENANCE CANNOT BE GUESSED - complete the readiness checklist.");
      return;
    }
    if (!gameState.sceneProgress.kelloggFinalCertificationComplete || canCorrectCertification) {
      this.startKelloggCertification();
      return;
    }
    if (!gameState.sceneProgress.gpoPublicationComplete) {
      this.startGpoPublicationHandoff();
      return;
    }
    if (!gameState.sceneProgress.publicationFundingComplete) {
      this.startPublicationFundingQueue();
      return;
    }
    if (!gameState.sceneProgress.chapterReleaseComplete) {
      this.startChapterReleaseStatus();
      return;
    }
    if (!gameState.sceneProgress.digitalReleaseComplete) {
      this.startDigitalRelease();
      return;
    }
    if (!gameState.sceneProgress.publicCitationComplete) {
      this.startPublicCitationCard();
      return;
    }
    if (!gameState.sceneProgress.releaseCalendarComplete) {
      this.startReleaseCalendar();
      return;
    }
    this.publishVolume();
  }

  private startChapterReleaseStatus() {
    if (gameState.sceneProgress.chapterReleaseComplete) {
      this.startDigitalRelease();
      return;
    }
    if (!gameState.sceneProgress.publicationFundingComplete) {
      this.startPublicationFundingQueue();
      return;
    }
    if (!gameState.sceneProgress.gpoPublicationComplete) {
      this.startGpoPublicationHandoff();
      return;
    }
    const currentStep = Math.max(0, Math.min(
      CHAPTER_RELEASE_PROMPTS.length - 1,
      gameState.sceneProgress.chapterReleaseStep ?? 0
    ));
    gameState.sceneProgress.chapterReleaseStep = currentStep;
    const prompt = getChapterReleasePrompt(currentStep);
    setObjective(`Chapter status ledger: ${currentStep + 1}/${CHAPTER_RELEASE_PROMPTS.length}.`);
    this.certificationPrompt.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const evaluation = evaluateChapterReleaseAnswer(prompt.id, option.value);
      if (!evaluation.ok) {
        gameState.sceneProgress.chapterReleaseStep = 0;
        if (evaluation.violation) {
          applyStandardsViolation(evaluation.violation, `Chapter release status: ${prompt.id}`);
        }
        setObjective("Chapter status ledger: correct chapter release status before public release.");
        setLatestMessage(evaluation.message);
        this.updateGateReadout();
        return;
      }

      const nextStep = currentStep + 1;
      gameState.sceneProgress.chapterReleaseStep = nextStep;
      setLatestMessage(evaluation.message);
      if (!chapterReleaseComplete(nextStep)) {
        this.startChapterReleaseStatus();
        return;
      }
      gameState.sceneProgress.chapterReleaseComplete = 1;
      gameState.sceneProgress.chapterReleaseStep = CHAPTER_RELEASE_PROMPTS.length;
      addDocumentPoints(4, "chapter release status ledger filed");
      setLatestMessage("Chapter status ledger complete: cleared chapters and outstanding clearance work are visible.");
      setObjective("Buckram Gate: press Space for digital release manifest.");
      this.updateGateReadout();
    });
  }

  private startDigitalRelease() {
    if (gameState.sceneProgress.digitalReleaseComplete) {
      this.startPublicCitationCard();
      return;
    }
    if (!gameState.sceneProgress.chapterReleaseComplete) {
      this.startChapterReleaseStatus();
      return;
    }
    if (!gameState.sceneProgress.publicationFundingComplete) {
      this.startPublicationFundingQueue();
      return;
    }
    if (!gameState.sceneProgress.gpoPublicationComplete) {
      this.startGpoPublicationHandoff();
      return;
    }
    const currentStep = Math.max(0, Math.min(
      DIGITAL_RELEASE_PROMPTS.length - 1,
      gameState.sceneProgress.digitalReleaseStep ?? 0
    ));
    gameState.sceneProgress.digitalReleaseStep = currentStep;
    const prompt = getDigitalReleasePrompt(currentStep);
    setObjective(`Digital release: ${currentStep + 1}/${DIGITAL_RELEASE_PROMPTS.length}.`);
    this.certificationPrompt.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const evaluation = evaluateDigitalReleaseAnswer(prompt.id, option.value);
      if (!evaluation.ok) {
        gameState.sceneProgress.digitalReleaseStep = 0;
        if (evaluation.violation) {
          applyStandardsViolation(evaluation.violation, `Digital release: ${prompt.id}`);
        }
        setObjective("Digital release: correct the public metadata before the volume can issue.");
        setLatestMessage(evaluation.message);
        this.updateGateReadout();
        return;
      }

      const nextStep = currentStep + 1;
      gameState.sceneProgress.digitalReleaseStep = nextStep;
      setLatestMessage(evaluation.message);
      if (!digitalReleaseComplete(nextStep)) {
        this.startDigitalRelease();
        return;
      }
      gameState.sceneProgress.digitalReleaseComplete = 1;
      gameState.sceneProgress.digitalReleaseStep = DIGITAL_RELEASE_PROMPTS.length;
      addDocumentPoints(4, "history.state.gov digital release manifest filed");
      setLatestMessage("Digital release complete: document-number citations, TEI master, and eBook catalog are queued.");
      setObjective("Buckram Gate: press Space for public citation card.");
      this.updateGateReadout();
    });
  }

  private startPublicCitationCard() {
    if (gameState.sceneProgress.publicCitationComplete) {
      this.startReleaseCalendar();
      return;
    }
    if (!gameState.sceneProgress.digitalReleaseComplete) {
      this.startDigitalRelease();
      return;
    }
    const currentStep = Math.max(0, Math.min(
      PUBLIC_CITATION_CARD_PROMPTS.length - 1,
      gameState.sceneProgress.publicCitationStep ?? 0
    ));
    gameState.sceneProgress.publicCitationStep = currentStep;
    const prompt = getPublicCitationCardPrompt(currentStep);
    setObjective(`Public citation card: ${currentStep + 1}/${PUBLIC_CITATION_CARD_PROMPTS.length}.`);
    this.certificationPrompt.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const evaluation = evaluatePublicCitationCardAnswer(prompt.id, option.value);
      if (!evaluation.ok) {
        gameState.sceneProgress.publicCitationStep = 0;
        if (evaluation.violation) {
          applyStandardsViolation(evaluation.violation, `Public citation card: ${prompt.id}`);
        }
        setObjective("Public citation card: correct the reader citation before the volume can issue.");
        setLatestMessage(evaluation.message);
        this.updateGateReadout();
        return;
      }

      const nextStep = currentStep + 1;
      gameState.sceneProgress.publicCitationStep = nextStep;
      setLatestMessage(evaluation.message);
      if (!publicCitationCardComplete(nextStep)) {
        this.startPublicCitationCard();
        return;
      }
      gameState.sceneProgress.publicCitationComplete = 1;
      gameState.sceneProgress.publicCitationStep = PUBLIC_CITATION_CARD_PROMPTS.length;
      addDocumentPoints(4, "public FRUS citation card filed");
      setLatestMessage("Public citation card complete: document number, citation elements, canonical URL, and legacy caution are ready.");
      setObjective("Buckram Gate: press Space for release calendar docket.");
      this.updateGateReadout();
    });
  }

  private startReleaseCalendar() {
    if (gameState.sceneProgress.releaseCalendarComplete) {
      this.publishVolume();
      return;
    }
    if (!gameState.sceneProgress.publicCitationComplete) {
      this.startPublicCitationCard();
      return;
    }
    const currentStep = Math.max(0, Math.min(
      RELEASE_CALENDAR_PROMPTS.length - 1,
      gameState.sceneProgress.releaseCalendarStep ?? 0
    ));
    gameState.sceneProgress.releaseCalendarStep = currentStep;
    const prompt = getReleaseCalendarPrompt(currentStep);
    setObjective(`Release calendar: ${currentStep + 1}/${RELEASE_CALENDAR_PROMPTS.length}.`);
    this.certificationPrompt.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const evaluation = evaluateReleaseCalendarAnswer(prompt.id, option.value);
      if (!evaluation.ok) {
        gameState.sceneProgress.releaseCalendarStep = 0;
        if (evaluation.violation) {
          applyStandardsViolation(evaluation.violation, `Release calendar docket: ${prompt.id}`);
        }
        setObjective("Release calendar: correct public release and digitization status before publication.");
        setLatestMessage(evaluation.message);
        this.updateGateReadout();
        return;
      }

      const nextStep = currentStep + 1;
      gameState.sceneProgress.releaseCalendarStep = nextStep;
      setLatestMessage(evaluation.message);
      if (!releaseCalendarComplete(nextStep)) {
        this.startReleaseCalendar();
        return;
      }
      gameState.sceneProgress.releaseCalendarComplete = 1;
      gameState.sceneProgress.releaseCalendarStep = RELEASE_CALENDAR_PROMPTS.length;
      addDocumentPoints(4, "public release calendar docket filed");
      setLatestMessage("Release calendar docket complete: releases, anticipated releases, and digitization status are public.");
      setObjective("Buckram Gate: press Space to publish the public FRUS volume.");
      this.updateGateReadout();
    });
  }

  private startFrontMatterAssembly() {
    if (gameState.sceneProgress.frontMatterAssemblyComplete) {
      this.updateGateReadout();
      return;
    }
    const currentStep = Math.max(0, Math.min(
      FRONT_MATTER_ASSEMBLY_PROMPTS.length - 1,
      gameState.sceneProgress.frontMatterAssemblyStep ?? 0
    ));
    gameState.sceneProgress.frontMatterAssemblyStep = currentStep;
    const prompt = getFrontMatterAssemblyPrompt(currentStep);
    setObjective(`Front matter assembly: ${currentStep + 1}/${FRONT_MATTER_ASSEMBLY_PROMPTS.length}.`);
    this.certificationPrompt.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const evaluation = evaluateFrontMatterAssemblyAnswer(prompt.id, option.value);
      if (!evaluation.ok) {
        gameState.sceneProgress.frontMatterAssemblyStep = 0;
        if (evaluation.violation) {
          applyStandardsViolation(evaluation.violation, `Front matter assembly: ${prompt.id}`);
        }
        setObjective("Front matter assembly: correct the publication apparatus before certification.");
        setLatestMessage(evaluation.message);
        this.updateGateReadout();
        return;
      }

      const nextStep = currentStep + 1;
      gameState.sceneProgress.frontMatterAssemblyStep = nextStep;
      setLatestMessage(evaluation.message);
      if (!frontMatterAssemblyComplete(nextStep)) {
        this.startFrontMatterAssembly();
        return;
      }

      gameState.sceneProgress.frontMatterAssemblyComplete = 1;
      gameState.sceneProgress.frontMatterAssemblyStep = FRONT_MATTER_ASSEMBLY_PROMPTS.length;
      addDocumentPoints(6, "front matter and reader aids assembled");
      setLatestMessage("Front matter assembled: preface and sources are ready.");
      setObjective("Buckram Gate: press Space to file persons and abbreviations registers.");
      this.updateGateReadout();
    });
  }

  private startReaderAidRegisters() {
    if (gameState.sceneProgress.readerAidRegistersComplete) {
      this.startIndexDocket();
      return;
    }
    const currentStep = Math.max(0, Math.min(
      READER_AID_REGISTER_PROMPTS.length - 1,
      gameState.sceneProgress.readerAidRegistersStep ?? 0
    ));
    gameState.sceneProgress.readerAidRegistersStep = currentStep;
    const prompt = getReaderAidRegisterPrompt(currentStep);
    setObjective(`Reader-aid registers: ${currentStep + 1}/${READER_AID_REGISTER_PROMPTS.length}.`);
    this.certificationPrompt.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const evaluation = evaluateReaderAidRegisterAnswer(prompt.id, option.value);
      if (!evaluation.ok) {
        gameState.sceneProgress.readerAidRegistersStep = 0;
        if (evaluation.violation) {
          applyStandardsViolation(evaluation.violation, `Reader-aid registers: ${prompt.id}`);
        }
        setObjective("Reader-aid registers: correct persons and abbreviations before indexing.");
        setLatestMessage(evaluation.message);
        this.updateGateReadout();
        return;
      }

      const nextStep = currentStep + 1;
      gameState.sceneProgress.readerAidRegistersStep = nextStep;
      setLatestMessage(evaluation.message);
      if (!readerAidRegistersComplete(nextStep)) {
        this.startReaderAidRegisters();
        return;
      }

      gameState.sceneProgress.readerAidRegistersComplete = 1;
      gameState.sceneProgress.readerAidRegistersStep = READER_AID_REGISTER_PROMPTS.length;
      addDocumentPoints(4, "persons and abbreviations registers filed");
      setLatestMessage("Reader-aid registers filed: persons and abbreviations match the proofed text.");
      setObjective("Buckram Gate: press Space to file the index docket.");
      this.updateGateReadout();
    });
  }

  private startIndexDocket() {
    if (gameState.sceneProgress.indexDocketComplete) {
      this.updateGateReadout();
      return;
    }
    const currentStep = Math.max(0, Math.min(
      INDEX_DOCKET_PROMPTS.length - 1,
      gameState.sceneProgress.indexDocketStep ?? 0
    ));
    gameState.sceneProgress.indexDocketStep = currentStep;
    const prompt = getIndexDocketPrompt(currentStep);
    setObjective(`Index docket: ${currentStep + 1}/${INDEX_DOCKET_PROMPTS.length}.`);
    this.certificationPrompt.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const evaluation = evaluateIndexDocketAnswer(prompt.id, option.value);
      if (!evaluation.ok) {
        gameState.sceneProgress.indexDocketStep = 0;
        if (evaluation.violation) {
          applyStandardsViolation(evaluation.violation, `Index docket: ${prompt.id}`);
        }
        setObjective("Index docket: correct the reader aid before final certification.");
        setLatestMessage(evaluation.message);
        this.updateGateReadout();
        return;
      }

      const nextStep = currentStep + 1;
      gameState.sceneProgress.indexDocketStep = nextStep;
      setLatestMessage(evaluation.message);
      if (!indexDocketComplete(nextStep)) {
        this.startIndexDocket();
        return;
      }

      gameState.sceneProgress.indexDocketComplete = 1;
      gameState.sceneProgress.indexDocketStep = INDEX_DOCKET_PROMPTS.length;
      addDocumentPoints(4, "index docket filed");
      setLatestMessage("Index docket filed: verified entries and cross-references now support publication.");
      setObjective("Buckram Gate: press Space to resolve typesetter corrections.");
      this.updateGateReadout();
    });
  }

  private startTypesetterCorrections() {
    if (gameState.sceneProgress.typesetterCorrectionsComplete) {
      this.updateGateReadout();
      return;
    }
    const currentStep = Math.max(0, Math.min(
      TYPESETTER_CORRECTIONS_PROMPTS.length - 1,
      gameState.sceneProgress.typesetterCorrectionsStep ?? 0
    ));
    gameState.sceneProgress.typesetterCorrectionsStep = currentStep;
    const prompt = getTypesetterCorrectionsPrompt(currentStep);
    setObjective(`Typesetter corrections: ${currentStep + 1}/${TYPESETTER_CORRECTIONS_PROMPTS.length}.`);
    this.certificationPrompt.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const evaluation = evaluateTypesetterCorrectionsAnswer(prompt.id, option.value);
      if (!evaluation.ok) {
        gameState.sceneProgress.typesetterCorrectionsStep = 0;
        if (evaluation.violation) {
          applyStandardsViolation(evaluation.violation, `Typesetter corrections: ${prompt.id}`);
        }
        setObjective("Typesetter corrections: resolve flagged text before final certification.");
        setLatestMessage(evaluation.message);
        this.updateGateReadout();
        return;
      }

      const nextStep = currentStep + 1;
      gameState.sceneProgress.typesetterCorrectionsStep = nextStep;
      setLatestMessage(evaluation.message);
      if (!typesetterCorrectionsComplete(nextStep)) {
        this.startTypesetterCorrections();
        return;
      }

      gameState.sceneProgress.typesetterCorrectionsComplete = 1;
      gameState.sceneProgress.typesetterCorrectionsStep = TYPESETTER_CORRECTIONS_PROMPTS.length;
      addDocumentPoints(4, "typesetter corrections resolved");
      setLatestMessage("Typesetter correction docket complete: remaining editing issues are resolved.");
      setObjective("Buckram Gate: press Space for final Kellogg certification.");
      this.updateGateReadout();
    });
  }

  private startKelloggCertification() {
    const currentStep = Math.max(0, Math.min(
      KELLOGG_CERTIFICATION_PROMPTS.length - 1,
      gameState.sceneProgress.kelloggFinalCertificationStep ?? 0
    ));
    gameState.sceneProgress.kelloggFinalCertificationStep = currentStep;
    const prompt = getKelloggCertificationPrompt(currentStep);
    setObjective(`Final certification: ${currentStep + 1}/${KELLOGG_CERTIFICATION_PROMPTS.length}.`);
    this.certificationPrompt.show(prompt.question, [...prompt.options], (option) => {
      const evaluation = evaluateKelloggCertificationAnswer(prompt.id, option.value);
      if (!evaluation.ok) {
        gameState.sceneProgress.kelloggFinalCertificationComplete = 0;
        gameState.sceneProgress.kelloggFinalCertificationCorrectionNeeded = 1;
        gameState.sceneProgress.kelloggFinalCertificationStep = 0;
        const violation = evaluation.violation;
        if (violation) {
          applyStandardsViolation(violation, `${KELLOGG_CERTIFICATION_CONTEXT_PREFIX}: ${prompt.id}`);
        }
        setObjective("Repair final certification: repeat the Kellogg checks at the publication table.");
        setLatestMessage(evaluation.message);
        this.updateGateReadout();
        return;
      }
      const nextStep = currentStep + 1;
      gameState.sceneProgress.kelloggFinalCertificationStep = nextStep;
      setLatestMessage(evaluation.message);
      if (!kelloggCertificationComplete(nextStep)) {
        this.startKelloggCertification();
        return;
      }
      this.resolveKelloggCertificationViolations();
      gameState.sceneProgress.kelloggFinalCertificationComplete = 1;
      gameState.sceneProgress.kelloggFinalCertificationCorrectionNeeded = 0;
      gameState.sceneProgress.kelloggFinalCertificationStep = KELLOGG_CERTIFICATION_PROMPTS.length;
      const finalReadiness = getFinalGateReadiness();
      if (finalReadiness.ready && hasProcessItem("buckram_key")) {
        this.startGpoSegmentAssembly();
        return;
      }
      setObjective("Certification repaired. Restore reliability or remaining standards blockers before publication.");
      setLatestMessage("Certification repaired, but the Buckram Gate checklist still has blockers.");
      this.updateGateReadout();
    });
  }

  private startGpoPublicationHandoff() {
    if (gameState.sceneProgress.gpoPublicationComplete) {
      this.startPublicationFundingQueue();
      return;
    }
    if (!gameState.sceneProgress.gpoSegmentAssemblyComplete) {
      this.startGpoSegmentAssembly();
      return;
    }
    const currentStep = Math.max(0, Math.min(
      GPO_PUBLICATION_PROMPTS.length - 1,
      gameState.sceneProgress.gpoPublicationStep ?? 0
    ));
    gameState.sceneProgress.gpoPublicationStep = currentStep;
    const prompt = getGpoPublicationPrompt(currentStep);
    setObjective(`GPO handoff: ${currentStep + 1}/${GPO_PUBLICATION_PROMPTS.length}.`);
    this.certificationPrompt.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const evaluation = evaluateGpoPublicationAnswer(prompt.id, option.value);
      if (!evaluation.ok) {
        gameState.sceneProgress.gpoPublicationStep = 0;
        if (evaluation.violation) {
          applyStandardsViolation(evaluation.violation, `GPO publication handoff: ${prompt.id}`);
        }
        setObjective("GPO handoff: correct the publication route before the volume can issue.");
        setLatestMessage(evaluation.message);
        this.updateGateReadout();
        return;
      }

      const nextStep = currentStep + 1;
      gameState.sceneProgress.gpoPublicationStep = nextStep;
      setLatestMessage(evaluation.message);
      if (!gpoPublicationComplete(nextStep)) {
        this.startGpoPublicationHandoff();
        return;
      }
      gameState.sceneProgress.gpoPublicationComplete = 1;
      gameState.sceneProgress.gpoPublicationStep = GPO_PUBLICATION_PROMPTS.length;
      setLatestMessage("GPO handoff complete: the finished FRUS volume is prepared for the funding queue.");
      setObjective("Buckram Gate: press Space for publication funding queue.");
      this.updateGateReadout();
    });
  }

  private startPublicationFundingQueue() {
    if (gameState.sceneProgress.publicationFundingComplete) {
      this.startChapterReleaseStatus();
      return;
    }
    if (!gameState.sceneProgress.gpoPublicationComplete) {
      this.startGpoPublicationHandoff();
      return;
    }
    const currentStep = Math.max(0, Math.min(
      PUBLICATION_FUNDING_PROMPTS.length - 1,
      gameState.sceneProgress.publicationFundingStep ?? 0
    ));
    gameState.sceneProgress.publicationFundingStep = currentStep;
    const prompt = getPublicationFundingPrompt(currentStep);
    setObjective(`Publication funding queue: ${currentStep + 1}/${PUBLICATION_FUNDING_PROMPTS.length}.`);
    this.certificationPrompt.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const evaluation = evaluatePublicationFundingAnswer(prompt.id, option.value);
      if (!evaluation.ok) {
        gameState.sceneProgress.publicationFundingStep = 0;
        if (evaluation.violation) {
          applyStandardsViolation(evaluation.violation, `Publication funding queue: ${prompt.id}`);
        }
        setObjective("Publication funding queue: keep the prepared volume intact while the queue clears.");
        setLatestMessage(evaluation.message);
        this.updateGateReadout();
        return;
      }

      const nextStep = currentStep + 1;
      gameState.sceneProgress.publicationFundingStep = nextStep;
      setLatestMessage(evaluation.message);
      if (!publicationFundingComplete(nextStep)) {
        this.startPublicationFundingQueue();
        return;
      }
      gameState.sceneProgress.publicationFundingComplete = 1;
      gameState.sceneProgress.publicationFundingStep = PUBLICATION_FUNDING_PROMPTS.length;
      addDocumentPoints(4, "publication funding queue cleared");
      setLatestMessage("Publication funding queue cleared: the fully prepared volume stayed intact.");
      setObjective("Buckram Gate: press Space for chapter status ledger.");
      this.updateGateReadout();
    });
  }

  private startGpoSegmentAssembly() {
    if (gameState.sceneProgress.gpoSegmentAssemblyComplete) {
      this.startGpoPublicationHandoff();
      return;
    }
    const currentStep = Math.max(0, Math.min(
      GPO_SEGMENT_ASSEMBLY_PROMPTS.length - 1,
      gameState.sceneProgress.gpoSegmentAssemblyStep ?? 0
    ));
    gameState.sceneProgress.gpoSegmentAssemblyStep = currentStep;
    const prompt = getGpoSegmentAssemblyPrompt(currentStep);
    setObjective(`GPO segment assembly: ${currentStep + 1}/${GPO_SEGMENT_ASSEMBLY_PROMPTS.length}.`);
    this.certificationPrompt.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const evaluation = evaluateGpoSegmentAssemblyAnswer(prompt.id, option.value);
      if (!evaluation.ok) {
        gameState.sceneProgress.gpoSegmentAssemblyStep = 0;
        if (evaluation.violation) {
          applyStandardsViolation(evaluation.violation, `GPO segment assembly: ${prompt.id}`);
        }
        setObjective("GPO segment assembly: correct the publication packet before GPO handoff.");
        setLatestMessage(evaluation.message);
        this.updateGateReadout();
        return;
      }

      const nextStep = currentStep + 1;
      gameState.sceneProgress.gpoSegmentAssemblyStep = nextStep;
      setLatestMessage(evaluation.message);
      if (!gpoSegmentAssemblyComplete(nextStep)) {
        this.startGpoSegmentAssembly();
        return;
      }
      gameState.sceneProgress.gpoSegmentAssemblyComplete = 1;
      gameState.sceneProgress.gpoSegmentAssemblyStep = GPO_SEGMENT_ASSEMBLY_PROMPTS.length;
      addDocumentPoints(6, "GPO final publication segments assembled");
      setLatestMessage("GPO segments complete: final segment submitted for binding.");
      setObjective("Buckram Gate: press Space for GPO publication handoff.");
      this.updateGateReadout();
    });
  }

  private canCorrectKelloggCertification(readiness: ReturnType<typeof getFinalGateReadiness>) {
    if (!hasProcessItem("buckram_key") || !gameState.sceneProgress.kelloggFinalCertificationCorrectionNeeded) return false;
    if (readiness.missingStamps.length || readiness.missingFragments || readiness.documentsWithUndisclosedDeletion.length) return false;
    if (!readiness.reliabilityReady) return false;
    return readiness.standardsViolations.length > 0
      && readiness.standardsViolations.every((record) => record.context?.startsWith(KELLOGG_CERTIFICATION_CONTEXT_PREFIX));
  }

  private canAssembleFrontMatter(readiness: ReturnType<typeof getFinalGateReadiness>) {
    if (!hasProcessItem("buckram_key") || gameState.sceneProgress.frontMatterAssemblyComplete) return false;
    if (!gameState.sceneProgress.typesetterProofComplete) return false;
    if (readiness.missingStamps.length || readiness.missingFragments || readiness.documentsWithUndisclosedDeletion.length) return false;
    if (!readiness.reliabilityReady || readiness.standardsViolations.length) return false;
    const allowedAssemblyBlockers = new Set([
      "sources_consulted",
      "front_matter_assembly",
      "reader_aid_registers",
      "index_typeset_check",
      "typesetter_corrections"
    ]);
    return readiness.missingApparatus.some((component) => component.id === "front_matter_assembly")
      && readiness.missingApparatus.every((component) => allowedAssemblyBlockers.has(component.id));
  }

  private canFileIndexDocket(readiness: ReturnType<typeof getFinalGateReadiness>) {
    if (
      !hasProcessItem("buckram_key")
      || !gameState.sceneProgress.frontMatterAssemblyComplete
      || !gameState.sceneProgress.typesetterProofComplete
      || gameState.sceneProgress.indexDocketComplete
      || !gameState.sceneProgress.readerAidRegistersComplete
    ) return false;
    if (readiness.missingStamps.length || readiness.missingFragments || readiness.documentsWithUndisclosedDeletion.length) return false;
    if (!readiness.reliabilityReady || readiness.standardsViolations.length) return false;
    const allowedIndexBlockers = new Set(["index_typeset_check", "typesetter_corrections"]);
    return readiness.missingApparatus.some((component) => component.id === "index_typeset_check")
      && readiness.missingApparatus.every((component) => allowedIndexBlockers.has(component.id));
  }

  private canFileReaderAidRegisters(readiness: ReturnType<typeof getFinalGateReadiness>) {
    if (
      !hasProcessItem("buckram_key")
      || !gameState.sceneProgress.frontMatterAssemblyComplete
      || gameState.sceneProgress.readerAidRegistersComplete
    ) return false;
    if (readiness.missingStamps.length || readiness.missingFragments || readiness.documentsWithUndisclosedDeletion.length) return false;
    if (!readiness.reliabilityReady || readiness.standardsViolations.length) return false;
    const allowedReaderAidBlockers = new Set(["reader_aid_registers", "index_typeset_check", "typesetter_corrections"]);
    return readiness.missingApparatus.some((component) => component.id === "reader_aid_registers")
      && readiness.missingApparatus.every((component) => allowedReaderAidBlockers.has(component.id));
  }

  private canResolveTypesetterCorrections(readiness: ReturnType<typeof getFinalGateReadiness>) {
    if (
      !hasProcessItem("buckram_key")
      || !gameState.sceneProgress.frontMatterAssemblyComplete
      || !gameState.sceneProgress.indexDocketComplete
      || !gameState.sceneProgress.typesetterProofComplete
      || gameState.sceneProgress.typesetterCorrectionsComplete
    ) return false;
    if (readiness.missingStamps.length || readiness.missingFragments || readiness.documentsWithUndisclosedDeletion.length) return false;
    if (!readiness.reliabilityReady || readiness.standardsViolations.length) return false;
    return readiness.missingApparatus.length > 0
      && readiness.missingApparatus.every((component) => component.id === "typesetter_corrections");
  }

  private resolveKelloggCertificationViolations() {
    for (const record of unresolvedStandardsViolations()) {
      if (record.context?.startsWith(KELLOGG_CERTIFICATION_CONTEXT_PREFIX)) resolveStandardsViolation(record.id);
    }
  }

  private publishVolume() {
    this.published = true;
    this.canRestart = false;
    gameState.sceneProgress.gpoSegmentAssemblyComplete = 1;
    gameState.sceneProgress.gpoSegmentAssemblyStep = GPO_SEGMENT_ASSEMBLY_PROMPTS.length;
    gameState.sceneProgress.gpoPublicationComplete = 1;
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
    setLatestMessage("PUBLISHED FRUS COVER - HUMAN CERTIFICATION RECORDED");
    this.syncVisibleState(true);
    retroAudio.ending();
    this.showPublishedPrize();
    this.time.delayedCall(350, () => {
      this.canRestart = true;
    });
  }

  private syncRoomTraversal() {
    const readiness = getFinalGateReadiness();
    setRoomTraversalState({
      currentRoomId: "G1",
      roomTitle: "Buckram Gate",
      roomType: "boss",
      visitedRoomIds: ["G1"],
      revealedRoomIds: ["G1"],
      exits: {},
      lockedExits: readiness.ready && hasProcessItem("buckram_key") ? {} : { north: "Publication gate checklist" },
      requiredItems: { north: "buckram_key" }
    });
  }

  private syncVisibleState(published: boolean) {
    setVisibleEntities([
      "Buckram Gate",
      "Human publication table",
      "Buckram Key",
      "FRUS cover prize",
      "SNES published FRUS prize cover",
      published ? "Published FRUS Cover" : "Unpublished assembled cover",
      "Equal-rank publication team",
      "reader-aid registers",
      "chapter release status ledger",
      "history.state.gov digital release manifest",
      "public FRUS citation card",
      "public release calendar docket",
      "publication funding queue docket",
      "StateChat readiness checklist"
    ]);
    const status = published || (getFinalGateReadiness().ready && hasProcessItem("buckram_key")) ? "cleared" : "blocking";
    setVisibleThreats([
      {
        label: "30-YEAR LINE",
        x: 74,
        y: 130,
        spriteKey: "snes-wall-hold",
        behavior: "blocks publication gate until checklist is complete",
        defeatMethod: "complete FRUS workflow and certify at human publication table",
        status
      },
      {
        label: "DANN-E QUEUE",
        x: 182,
        y: 130,
        spriteKey: "snes-wall-danne-queue",
        behavior: "pushes against publication with unresolved final assembly",
        defeatMethod: "use human decision at Golden Rule gate",
        status
      }
    ]);
  }

  private showPublishedPrize() {
    const clock = getStatutoryClockStateReadout();
    this.add.rectangle(128, 120, 256, 240, color(PALETTE.deepRuby)).setDepth(900);
    for (let y = 0; y < GAME_HEIGHT; y += 8) {
      for (let x = (y / 8) % 2 === 0 ? 2 : 10; x < GAME_WIDTH; x += 16) {
        this.add.rectangle(x, y, 2, 2, color(PALETTE.buckramRed)).setDepth(901);
      }
    }

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
    this.add.text(128, 139, `COVER PIECES ${gameState.volumeFragments.length}/5`, {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5).setDepth(931);
    this.add.text(128, 149, `RELIABILITY ${gameState.reliability}/100  DOC PTS ${gameState.documentPoints}`, {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.openNetGreen
    }).setOrigin(0.5).setDepth(931);
    this.add.image(218, 145, "buckram-key").setDepth(932);
    this.add.text(218, 157, "BUCKRAM\nKEY", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.goldStamp,
      align: "center"
    }).setOrigin(0.5).setDepth(932);

    this.add.rectangle(128, 170, 236, 29, color(PALETTE.black)).setStrokeStyle(2, color(PALETTE.goldStamp)).setDepth(931);
    const hasProcessStampRelics = this.textures.exists(SNES_PROCESS_STAMP_RELIC_ASSET.key);
    PROCESS_STAMPS.forEach((stamp, index) => {
      const earned = gameState.processStamps.includes(stamp.id);
      const x = 28 + index * 39;
      if (hasProcessStampRelics) {
        this.add.image(x, 164, SNES_PROCESS_STAMP_RELIC_ASSET.key, stamp.id)
          .setName(`published-process-stamp-${stamp.id}`)
          .setAlpha(earned ? 1 : 0.28)
          .setDepth(932);
      }
      this.add.text(x, 172, stamp.label, {
        fontFamily: "monospace",
        fontSize: stamp.label.length > 3 ? "5px" : "6px",
        color: earned ? PALETTE.goldStamp : PALETTE.sepiaInk
      }).setName(`published-process-stamp-label-${stamp.id}`).setOrigin(0.5, 0).setDepth(932);
      this.add.text(x, 179, earned ? "OK" : "--", {
        fontFamily: "monospace",
        fontSize: "5px",
        color: earned ? PALETTE.openNetGreen : PALETTE.sepiaInk
      }).setName(`published-process-stamp-status-${stamp.id}`).setOrigin(0.5, 0).setDepth(932);
    });

    const lines = [
      "ELENA: SELECTION COMPLETE",
      "MARCUS: REFERRALS CLOSED",
      "PRIYA: QUERIES RESOLVED"
    ];
    lines.forEach((line, index) => {
      this.add.text(14, 184 + index * 6, line, {
        fontFamily: "monospace",
        fontSize: "6px",
        color: PALETTE.creamPaper
      }).setDepth(932);
    });

    this.add.rectangle(128, 213, 236, 28, color(PALETTE.black)).setStrokeStyle(2, color(PALETTE.terminalCyan)).setDepth(931);
    const practiced = [
      "SOURCE NOTES NEED PROVENANCE.",
      "OPENNET AND CLASSNET STAY SEPARATE.",
      "REFERRALS LEAVE A VISIBLE TRACE.",
      "AI TOOLS PROPOSE; HUMANS DECIDE."
    ];
    practiced.forEach((line, index) => {
      this.add.text(16, 203 + index * 6, line, {
        fontFamily: "monospace",
        fontSize: "6px",
        color: PALETTE.terminalCyan
      }).setDepth(932);
    });

    this.add.text(128, 233, "SPACE: RETURN TO TITLE", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5).setDepth(932);
  }

  private restart() {
    if (!this.canRestart) return;
    transitionTo(this, "TitleScene");
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
    const rewardTexture = this.textures.exists(SNES_PUBLISHED_FRUS_PRIZE_ASSET.key)
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
    const targetWidth = usesSnesPrize ? 58 : 96;
    const targetHeight = usesSnesPrize ? 84 : 64;
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
      .setName(usesSnesPrize ? "published-frus-snes-prize-art" : "published-frus-reward-art")
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
