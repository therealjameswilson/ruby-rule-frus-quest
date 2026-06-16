import Phaser from "phaser";
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
import { addSnesRoomLayer, addSnesWorkflowRelicRack, addSnesWorldMap } from "../systems/snesPixelArt";
import { ChoicePrompt } from "../systems/verification";

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

export class EndingScene extends Phaser.Scene {
  private player!: Player;
  private inventory!: InventoryOverlay;
  private reliability!: ReliabilityHud;
  private certificationPrompt!: ChoicePrompt;
  private objectiveText!: Phaser.GameObjects.Text;
  private actionHint!: Phaser.GameObjects.Text;
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
      this.player.update(delta, false);
      if (this.canRestart && input.aJustPressed) {
        this.restart();
      }
      return;
    }

    if (this.certificationPrompt.active) {
      this.certificationPrompt.updateInput();
      this.player.update(delta, false);
      return;
    }

    if (handleOpenOverlays(this.inventory, this.reliability)) {
      this.player.update(delta, false);
      return;
    }

    if (input.pauseJustPressed) {
      setLatestMessage("Buckram Gate paused. Human certification still required.");
    }

    this.player.update(delta, true, { bounds: GATE_PLAY_BOUNDS });
    this.updateGateReadout();
    if (input.aJustPressed) {
      this.handleGateAction();
    }
    this.reliability.update();
    this.objectiveText.setText(gameState.objective);
  }

  private drawGateRoom() {
    const readiness = getFinalGateReadiness();
    const ready = readiness.ready && hasProcessItem("buckram_key");
    addSnesWorldMap(this, 50, 78, "G1 GATE", "buckram-gate-map");
    addSnesWorkflowRelicRack(this, 184, 78);

    this.drawStoneBureaucracyWall(74, 130, "30-YR", ready, "snes-wall-hold");
    this.drawStoneBureaucracyWall(182, 130, "DANN-E", ready, "snes-wall-danne-queue");

    this.add.rectangle(128, 89, 104, 90, color(PALETTE.black)).setStrokeStyle(2, color(ready ? PALETTE.goldStamp : PALETTE.classNetRed)).setDepth(94);
    this.add.rectangle(128, 55, 72, 8, color(PALETTE.deepRuby)).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(95);
    this.add.text(128, 51, "PUBLICATION GATE", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: ready ? PALETTE.goldStamp : PALETTE.classNetRed
    }).setOrigin(0.5, 0).setDepth(96);
    this.drawAssembledPrize(128, 103, 1);
    if (!ready) {
      this.add.rectangle(128, 103, 70, 72, color(PALETTE.black)).setDepth(151);
      this.add.text(128, 91, "LOCKED", {
        fontFamily: "monospace",
        fontSize: "9px",
        color: PALETTE.classNetRed
      }).setOrigin(0.5).setDepth(152);
      this.add.text(128, 103, "CHECKLIST\nINCOMPLETE", {
        fontFamily: "monospace",
        fontSize: "6px",
        color: PALETTE.creamPaper,
        align: "center"
      }).setOrigin(0.5).setDepth(152);
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
    this.add.text(14, 166, "STATECHAT\nCHECKLIST", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.terminalCyan,
      align: "left"
    }).setDepth(157);
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
    const canFileIndexDocket = this.canFileIndexDocket(readiness);
    const canResolveTypesetterCorrections = this.canResolveTypesetterCorrections(readiness);
    const indexDocketReady = Boolean(gameState.sceneProgress.indexDocketComplete);
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
          : "Front matter assembled: file the index docket."
      : canAssembleApparatus
        ? "Buckram Gate waits for front matter assembly at the human publication table."
      : canFileIndexDocket
        ? "Buckram Gate waits for the index docket at the human publication table."
      : canResolveTypesetterCorrections
        ? "Buckram Gate waits for the typesetter correction docket at the human publication table."
      : canCorrectCertification
        ? "Final certification needs repair at the human publication table."
      : "Buckram Gate locked: StateChat may checklist, but humans must complete readiness.";

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
            : "Buckram Gate: press Space for index docket."
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
            : "SPACE: INDEX DOCKET"
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

    const missing = [
      readiness.missingStamps.length ? `stamps ${readiness.missingStamps.join(" ")}` : "",
      readiness.missingFragments ? `${readiness.missingFragments} cover pieces` : "",
      readiness.missingApparatus.length ? `apparatus ${readiness.missingApparatus.map((component) => component.shortLabel).join("/")}` : "",
      readiness.documentsWithUndisclosedDeletion.length ? "bracketed insertion" : "",
      readiness.standardsViolations.length ? "standards violation" : "",
      readiness.reliabilityReady ? "" : "reliability"
    ].filter(Boolean).join(", ");
    setObjective(`Buckram Gate locked: ${missing || "Buckram Key required"}.`);
    this.actionHint.setText(nearGate ? "LOCKED: COMPLETE HUMAN READINESS." : "INSPECT GATE CHECKLIST.");
  }

  private handleGateAction() {
    const readiness = getFinalGateReadiness();
    const ready = readiness.ready && hasProcessItem("buckram_key");
    const canCorrectCertification = this.canCorrectKelloggCertification(readiness);
    const canAssembleApparatus = this.canAssembleFrontMatter(readiness);
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
      setLatestMessage("Front matter assembled: preface, sources, persons, and abbreviations are ready.");
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
    const allowedAssemblyBlockers = new Set(["front_matter_assembly", "index_typeset_check", "typesetter_corrections"]);
    return readiness.missingApparatus.some((component) => component.id === "front_matter_assembly")
      && readiness.missingApparatus.every((component) => allowedAssemblyBlockers.has(component.id));
  }

  private canFileIndexDocket(readiness: ReturnType<typeof getFinalGateReadiness>) {
    if (
      !hasProcessItem("buckram_key")
      || !gameState.sceneProgress.frontMatterAssemblyComplete
      || !gameState.sceneProgress.typesetterProofComplete
      || gameState.sceneProgress.indexDocketComplete
    ) return false;
    if (readiness.missingStamps.length || readiness.missingFragments || readiness.documentsWithUndisclosedDeletion.length) return false;
    if (!readiness.reliabilityReady || readiness.standardsViolations.length) return false;
    const allowedIndexBlockers = new Set(["index_typeset_check", "typesetter_corrections"]);
    return readiness.missingApparatus.some((component) => component.id === "index_typeset_check")
      && readiness.missingApparatus.every((component) => allowedIndexBlockers.has(component.id));
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
      published ? "Published FRUS Cover" : "Unpublished assembled cover",
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
    this.add.rectangle(128, 120, 256, 240, color(PALETTE.deepRuby)).setDepth(900);
    for (let y = 0; y < GAME_HEIGHT; y += 8) {
      for (let x = (y / 8) % 2 === 0 ? 2 : 10; x < GAME_WIDTH; x += 16) {
        this.add.rectangle(x, y, 2, 2, color(PALETTE.buckramRed)).setDepth(901);
      }
    }

    this.drawAssembledPrize(128, 78, 1, 930);
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
    this.add.text(128, 140, `COVER PIECES ${gameState.volumeFragments.length}/5`, {
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
    PROCESS_STAMPS.forEach((stamp, index) => {
      const earned = gameState.processStamps.includes(stamp.id);
      const x = 15 + index * 39;
      this.add.text(x, 161, stamp.label, {
        fontFamily: "monospace",
        fontSize: stamp.label.length > 3 ? "6px" : "8px",
        color: earned ? PALETTE.goldStamp : PALETTE.sepiaInk
      }).setDepth(932);
      this.add.text(x, 173, earned ? "OK" : "--", {
        fontFamily: "monospace",
        fontSize: "7px",
        color: earned ? PALETTE.openNetGreen : PALETTE.sepiaInk
      }).setDepth(932);
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

    this.add.text(128, 231, "SPACE: RETURN TO TITLE", {
      fontFamily: "monospace",
      fontSize: "9px",
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

  private drawAssembledPrize(x: number, y: number, scale: number, depth = 130) {
    this.add.rectangle(x + 4, y + 5, 80 * scale, 120 * scale, color(PALETTE.black)).setDepth(depth);
    this.add.image(x, y, "frus-prize-cover").setScale(scale).setDepth(depth + 1);

    const left = x - (80 * scale) / 2;
    const top = y - (120 * scale) / 2;
    COVER_PIECES.forEach((piece) => {
      const earned = gameState.volumeFragments.includes(piece.fragment);
      const pieceX = left + (piece.x + piece.width / 2) * scale;
      const pieceY = top + (piece.y + piece.height / 2) * scale;
      const pieceWidth = piece.width * scale;
      const pieceHeight = piece.height * scale;
      this.add.rectangle(pieceX, pieceY, pieceWidth, pieceHeight)
        .setStrokeStyle(1, color(earned ? PALETTE.goldStamp : PALETTE.sepiaInk))
        .setDepth(depth + 2);
      if (!earned) {
        this.add.rectangle(pieceX, pieceY, pieceWidth, pieceHeight, color(PALETTE.black)).setDepth(depth + 3);
        this.add.text(pieceX, pieceY - 3, piece.label, {
          fontFamily: "monospace",
          fontSize: "5px",
          color: PALETTE.sepiaInk
        }).setOrigin(0.5).setDepth(depth + 4);
      }
    });

    this.add.rectangle(x, y + 50, 68, 10, color(PALETTE.black))
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setDepth(depth + 5);
    this.add.text(x, y + 47, "ASSEMBLED FRUS", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5, 0).setDepth(depth + 6);
  }
}
