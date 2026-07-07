import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import {
  FRUS_QUEST_FIRST_OBJECTIVE,
  FRUS_QUEST_MISSION,
  FRUS_QUEST_STAKES
} from "../game/mission";
import {
  addDocumentPoints,
  addDanneItem,
  awardProcessStamp,
  gameState,
  getAdventureTrainingReadout,
  getProductionBoardReadout,
  hasDanneItem,
  setHeldItem,
  setLatestMessage,
  setDocumentWorkflowState,
  setNearestInteractable,
  setObjective,
  setSceneState,
  setVisibleEntities,
  setVisibleThreats
} from "../game/state";
import { getFrusProductionPhaseReadout } from "../game/frusProductionPhases";
import {
  DOCUMENT_SELECTION_PROMPT,
  evaluateDocumentSelectionAnswer
} from "../game/documentSelection";
import {
  evaluateSelectionDocketAnswer,
  getSelectionDocketPrompt,
  selectionDocketComplete,
  SELECTION_DOCKET_PROMPTS
} from "../game/selectionDocket";
import {
  evaluatePolicyCoverageAuditAnswer,
  getPolicyCoverageAuditPrompt,
  policyCoverageAuditComplete,
  POLICY_COVERAGE_AUDIT_PROMPTS
} from "../game/policyCoverageAudit";
import { getResearchCoverageReadout } from "../game/researchCoverage";
import {
  evaluateRecordCollectionAnswer,
  getRecordCollectionPrompt,
  recordCollectionComplete,
  RECORD_COLLECTION_PROMPTS
} from "../game/recordCollection";
import {
  evaluateRepositoryCoverageMapAnswer,
  getRepositoryCoverageMapPrompt,
  repositoryCoverageLaneCount,
  repositoryCoverageMapComplete,
  REPOSITORY_COVERAGE_MAP_PROMPTS
} from "../game/repositoryCoverageMap";
import {
  evaluateRecordsAccessAnswer,
  getRecordsAccessPrompt,
  recordsAccessComplete,
  RECORDS_ACCESS_PROMPTS
} from "../game/recordsAccess";
import {
  evaluateResearchCharterAnswer,
  getResearchCharterPrompt,
  researchCharterComplete,
  RESEARCH_CHARTER_PROMPTS
} from "../game/researchCharter";
import {
  evaluateSeriesConceptAnswer,
  getSeriesConceptPrompt,
  seriesConceptComplete,
  SERIES_CONCEPT_PROMPTS
} from "../game/seriesConcept";
import { FIRST_HOUR_TRAINING_DRILLS } from "../game/firstHourTraining";
import { SNES_FIRST_HOUR_TRAINING_RELIC_ASSET, SNES_OFFICE_TILE_ASSET } from "../game/snesAtlas";
import {
  evaluateVolumeConceptAnswer,
  getVolumeConceptPrompt,
  volumeConceptComplete,
  VOLUME_CONCEPT_PROMPTS
} from "../game/volumeConcept";
import {
  evaluateManuscriptReviewAnswer,
  getManuscriptReviewPrompt,
  manuscriptReviewComplete,
  MANUSCRIPT_REVIEW_PROMPTS
} from "../game/manuscriptReview";
import type { Interactable } from "../game/types";
import { Player } from "../entities/Player";
import { DanneLurker } from "../entities/enemies/DanneLurker";
import { JuniorCompiler } from "../entities/npcs/JuniorCompiler";
import { bindPointerDown, getInput, tickInput } from "../input/InputState";
import { retroAudio } from "../systems/audio";
import { DialogBox } from "../systems/dialog";
import {
  InteractionAssist,
  decideInteractionFeedback,
  nearestInteractable,
  nearestInteractableHint
} from "../systems/interaction";
import { InteractionPrompt } from "../systems/interactionPrompt";
import { FeedbackToast } from "../systems/feedbackToast";
import { InventoryOverlay } from "../systems/inventory";
import { applyStandardsViolation, ReliabilityHud } from "../systems/reliability";
import { activateRoleAbility } from "../systems/roleAbility";
import { handleOpenOverlays } from "../systems/overlayInput";
import { shouldDismissControlsCard } from "../systems/tutorialDismiss";
import { drawRoomFrame, transitionTo } from "../systems/sceneTransitions";
import { ChoicePrompt } from "../systems/verification";

type OfficeDanneRoute = "CherryBlossomGardenScene" | "SenateHearingChamberScene";
type OfficeTileFrame = (typeof SNES_OFFICE_TILE_ASSET.frames)[number];

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class OfficeScene extends Phaser.Scene {
  private player!: Player;
  private juniorCompiler!: JuniorCompiler;
  private dialog!: DialogBox;
  private choice!: ChoicePrompt;
  private inventory!: InventoryOverlay;
  private reliability!: ReliabilityHud;
  private hintText!: Phaser.GameObjects.Text;
  // The floating proximity prompt now carries the contextual "A [verb]" cue, so
  // the persistent bottom line drops INTERACT and trims spacing to de-clutter the
  // bottom band (live audit, 2026-06-15).
  private readonly controlsHint = "MOVE · A INTERACT · M MENU";
  private prompt!: InteractionPrompt;
  private toast!: FeedbackToast;
  private tutorialCard?: Phaser.GameObjects.Container;
  private firstQuestCue?: Phaser.GameObjects.Container;
  private firstQuestCueLabel?: Phaser.GameObjects.Text;
  private firstQuestCuePlate?: Phaser.GameObjects.Rectangle;
  private starterMemoIcon?: Phaser.GameObjects.Container;
  private postIntroLabels: Phaser.GameObjects.GameObject[] = [];
  private firstRoomProgressObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly interactionAssist = new InteractionAssist();
  private interactables: Interactable[] = [];
  private solids: Phaser.Geom.Rectangle[] = [];
  private danneLurker!: DanneLurker;

  constructor() {
    super("OfficeScene");
  }

  create() {
    setSceneState("OfficeScene", "explore", FRUS_QUEST_FIRST_OBJECTIVE);
    setLatestMessage(FRUS_QUEST_MISSION);
    setVisibleThreats([]);
    retroAudio.startMusic("GuideScene");
    this.cameras.main.setBackgroundColor(PALETTE.shadowNavy);
    drawRoomFrame(this, "OFFICE HUB", PALETTE.goldStamp, { showLegacyHud: false });
    this.hideLegacyRoomHud();
    this.postIntroLabels = [];
    this.drawOfficeInterior();

    const returnSpawn = this.consumeOfficeReturnSpawn();
    this.player = new Player(this, returnSpawn?.x ?? 128, returnSpawn?.y ?? 184);
    this.juniorCompiler = new JuniorCompiler(this, 70, 122);
    this.danneLurker = new DanneLurker(this, 218, 78, {
      waypoints: [
        { x: 218, y: 78 },
        { x: 188, y: 58 },
        { x: 102, y: 58 },
        { x: 46, y: 132 },
        { x: 190, y: 186 }
      ]
    });
    this.dialog = new DialogBox(this);
    this.choice = new ChoicePrompt(this);
    this.inventory = new InventoryOverlay(this);
    this.reliability = new ReliabilityHud(this);
    this.reliability.setSummaryVisible(false);
    this.hintText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 10, this.controlsHint, {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(900);
    this.prompt = new InteractionPrompt(this);
    this.toast = new FeedbackToast(this);
    this.solids = [
      new Phaser.Geom.Rectangle(34, 72, 72, 28),
      new Phaser.Geom.Rectangle(154, 72, 64, 28)
    ];
    this.interactables = [
      {
        id: "junior-compiler",
        label: "Junior Compiler",
        x: this.juniorCompiler.x,
        y: this.juniorCompiler.y,
        radius: 30,
        kind: "npc",
        onInteract: () => this.talkJuniorCompiler()
      },
      {
        id: "starter-memo",
        label: "Assignment Memo",
        x: 128,
        y: 166,
        radius: 26,
        kind: "document",
        onInteract: () => this.handleStarterMemo()
      },
      {
        id: "production-inbox",
        label: "Production Inbox",
        x: 60,
        y: 154,
        radius: 28,
        kind: "document",
        onInteract: () => this.handleJuniorQuestStation("inbox")
      },
      {
        id: "scope-charter-desk",
        label: "Scope / Selection Desk",
        x: 158,
        y: 116,
        radius: 34,
        kind: "document",
        onInteract: () => this.showResearchCharterChoice()
      },
      {
        id: "frus-cart",
        label: "FRUS Cart",
        x: 128,
        y: 132,
        radius: 30,
        kind: "document",
        onInteract: () => this.handleJuniorQuestStation("cart")
      },
      {
        id: "Archive Terminal",
        label: "Archive Terminal",
        x: 195,
        y: 154,
        radius: 36,
        kind: "terminal",
        onInteract: () => this.handleJuniorQuestStation("terminal")
      },
      {
        id: "frus-production-board",
        label: "FRUS Production Board",
        x: 148,
        y: 60,
        radius: 34,
        kind: "terminal",
        onInteract: () => this.openProductionBoard()
      },
      {
        id: "archive-guide-door",
        label: "Archive Guide Door",
        x: 128,
        y: 216,
        radius: 24,
        kind: "door",
        onInteract: () => this.handleArchiveGuideDoor()
      },
      {
        id: "cherry-garden-door",
        label: "Cherry Blossom Garden",
        x: 39,
        y: 51,
        radius: 26,
        kind: "door",
        onInteract: () => this.routeToDanneMap("CherryBlossomGardenScene", 39, 58)
      },
      {
        id: "senate-hearing-door",
        label: "Senate Hearing Chamber",
        x: 215,
        y: 51,
        radius: 26,
        kind: "door",
        onInteract: () => this.routeToDanneMap("SenateHearingChamberScene", 215, 58)
      }
    ];
    setVisibleEntities([
      "Junior Compiler",
      "Assignment Memo",
      "Production Inbox",
      "Scope and Candidate Selection Desk",
      "FRUS Cart",
      "Archive Terminal",
      "FRUS Production Board",
      "Archive Guide Door",
      "Cherry Blossom Garden Door",
      "Senate Hearing Chamber Door"
    ]);
    this.createFirstQuestCue();
    this.syncOfficeThreatState();
    if (!gameState.sceneProgress.officeTutorialSeen) this.showOfficeTutorial();
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
    this.juniorCompiler.update(this.time.now);

    if (this.tutorialCard) {
      // The card is an overlay hint, not a hard modal: the player can walk away
      // from it. Any movement intent (or confirm/cancel/pointer) dismisses it so
      // the first step is never swallowed and the room never feels frozen.
      if (shouldDismissControlsCard(input)) {
        const actionDismissed = input.confirmJustPressed
          || input.aJustPressed
          || input.cancelJustPressed
          || input.pointerPrimaryJustPressed;
        this.dismissOfficeTutorial();
        if (actionDismissed) {
          this.player.update(delta, false);
          this.prompt.update(delta, null);
          this.toast.update(delta, this.player.position);
          this.reliability.update();
          setObjective(FRUS_QUEST_FIRST_OBJECTIVE);
          return;
        }
      }
    }

    if (this.dialog.active) {
      if (input.aJustPressed) this.dialog.advance();
      this.player.update(delta, false);
      this.prompt.update(delta, null);
      this.toast.update(delta, this.player.position);
      this.updateFirstQuestCue();
      return;
    }
    if (this.choice.active) {
      this.choice.updateInput();
      this.player.update(delta, false);
      this.prompt.update(delta, null);
      this.toast.update(delta, this.player.position);
      this.reliability.update();
      this.updateFirstQuestCue();
      return;
    }
    if (handleOpenOverlays(this.inventory, this.reliability)) {
      this.player.update(delta, false);
      this.prompt.update(delta, null);
      this.toast.update(delta, this.player.position);
      this.updateFirstQuestCue();
      return;
    }
    if (input.pauseJustPressed) {
      this.dialog.show("OFFICE HUB", "The office route is paused.");
      this.updateFirstQuestCue();
      return;
    }

    this.player.update(delta, true, {
      bounds: { left: 16, right: GAME_WIDTH - 16, top: 42, bottom: GAME_HEIGHT - 18 },
      solids: this.solids
    });
    this.updateDanneLurker(delta, true);
    const activeInteractables = this.currentInteractables();
    const nearest = nearestInteractable(this.player.position, activeInteractables);
    const tutorialVisible = Boolean(this.tutorialCard);
    // Show the prompt/ring from a little further out than the strict interact
    // radius so it is impossible to miss on approach, but only allow acting on a
    // target inside the strict radius.
    const hintTarget = tutorialVisible ? null : nearestInteractableHint(this.player.position, activeInteractables);
    const promptTarget = nearest ?? hintTarget;
    setNearestInteractable(tutorialVisible ? null : nearest?.label ?? null);
    const approachCue = hintTarget ? this.approachCueFor(hintTarget) : null;
    this.prompt.update(
      delta,
      tutorialVisible ? null : promptTarget,
      undefined,
      nearest ? undefined : hintTarget && approachCue ? { badge: "!", text: approachCue } : undefined
    );
    this.toast.update(delta, this.player.position);
    const bufferedInteraction = this.interactionAssist.update(this.time.now, input.aJustPressed, nearest);
    if (bufferedInteraction) {
      bufferedInteraction.onInteract();
    } else if (input.aJustPressed) {
      const feedback = decideInteractionFeedback(nearest, hintTarget);
      if (feedback.kind === "step-closer") this.nudgeTowardTarget(feedback.target);
      else if (feedback.kind === "nothing") this.flashNoTargetHint();
    }
    setObjective(this.currentOfficeObjective());
    this.reliability.update();
    this.updateFirstQuestCue();
  }

  private updateDanneLurker(delta: number, canPressure: boolean) {
    const result = this.danneLurker.update(this.time.now, delta, this.player.position, canPressure);
    if (result.triggered) {
      this.player.takeHit(this.danneLurker.position, 10, 700);
      applyStandardsViolation("missed_30_year_deadline", "DANN-E deadline pressure interrupted office workflow.");
      setObjective("Keep moving: DANN-E pressure cannot replace human review.");
      this.reliability.update();
    } else if (result.egoBoltHit) {
      this.player.takeHit(this.danneLurker.position, 9, 700);
      applyStandardsViolation("missed_30_year_deadline", "DANN-E ego bolt interrupted office workflow.");
      setObjective("Dodge Ego bolts and keep the human review route moving.");
      this.reliability.update();
    }
    this.syncOfficeThreatState();
  }

  private syncOfficeThreatState() {
    setVisibleThreats([this.danneLurker.readout(this.time.now)]);
  }

  private currentInteractables() {
    if (gameState.sceneProgress.juniorCompilerIntroduced) {
      const memoStatus = this.officeStarterMemoStatus();
      const routeUnlocked = hasDanneItem("master-declass-key");
      const junior = this.interactables.find((interactable) => interactable.id === "junior-compiler");
      const memo = this.interactables.find((interactable) => interactable.id === "starter-memo");
      const inbox = this.interactables.find((interactable) => interactable.id === "production-inbox");
      const archive = this.interactables.find((interactable) => interactable.id === "archive-guide-door");
      if (!routeUnlocked) {
        const focused: Interactable[] = [];
        if (memoStatus === 0 && memo) focused.push({ ...memo, radius: 36 });
        if ((memoStatus === 1 || memoStatus === 2) && inbox) {
          focused.push({
            ...inbox,
            label: memoStatus === 1 ? "Route Memo" : "Stamp Memo",
            radius: 54
          });
        }
        if (junior) focused.push({ ...junior, radius: memoStatus >= 3 ? 34 : 18 });
        if (archive) focused.push(archive);
        return focused;
      }
      return this.interactables.map((interactable) => {
        if (interactable.id === "junior-compiler") {
          return {
            ...interactable,
            radius: 34
          };
        }
        return interactable;
      });
    }
    const junior = this.interactables.find((interactable) => interactable.id === "junior-compiler");
    return junior ? [{ ...junior, radius: 72 }] : [];
  }

  private currentOfficeObjective() {
    if (!gameState.sceneProgress.juniorCompilerIntroduced) return FRUS_QUEST_FIRST_OBJECTIVE;
    const memoStatus = this.officeStarterMemoStatus();
    if (memoStatus === 0) return "Pick up the Assignment Memo.";
    if (memoStatus === 1) return "Carry the memo to INBOX.";
    if (memoStatus === 2) return "Stamp the memo at INBOX.";
    if (!hasDanneItem("master-declass-key")) return "Stamp the memo to open Archive.";
    return "Enter Archive Guide.";
  }

  private nextJuniorStationLabel(progress = gameState.sceneProgress.juniorCompilerFetch ?? 0) {
    if (progress <= 0) return "Assignment Memo";
    if (progress === 1) return "Production Inbox";
    if (progress === 2) return "Stamp";
    return "Archive Guide";
  }

  private talkJuniorCompiler() {
    retroAudio.confirm();
    gameState.sceneProgress.juniorCompilerIntroduced = 1;
    this.updateFirstQuestCue();
    const memoStatus = this.officeStarterMemoStatus();
    if (hasDanneItem("master-declass-key")) {
      setLatestMessage("Archive Guide is open. Go south through the gold door.");
      setObjective("Enter Archive Guide.");
      this.toast.show("ARCHIVE GUIDE OPEN", this.player.position, "info");
      return;
    }
    if (memoStatus >= 3) {
      setLatestMessage("Memo is stamped. Archive Guide is open.");
      setObjective("Enter Archive Guide.");
      this.toast.show("ARCHIVE GUIDE OPEN", this.player.position, "info");
      return;
    }
    setObjective(this.currentOfficeObjective());
    setLatestMessage("Pick up the memo, carry it to INBOX, then stamp it.");
    this.toast.show("PICK MEMO -> INBOX -> STAMP", this.player.position, "info");
  }

  private showOfficeTutorial() {
    this.hintText.setVisible(false);
    const dim = this.add.rectangle(128, 155, GAME_WIDTH, 170, color(PALETTE.black), 0.34)
      .setName("office-tutorial-dim");
    const shadow = this.add.rectangle(129, 61, 170, 40, color(PALETTE.black), 0.62)
      .setName("office-tutorial-shadow");
    const panel = this.add.rectangle(128, 58, 162, 36, color(PALETTE.shadowNavy), 0.97)
      .setName("office-tutorial-panel")
      .setStrokeStyle(1, color(PALETTE.goldStamp));
    const title = this.add.text(128, 44, "BUILD ONE FRUS VOLUME", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.goldStamp
    }).setName("office-tutorial-title").setOrigin(0.5, 0);
    const body = this.add.text(128, 54, "TALK TO JR", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.terminalCyan,
      align: "center",
      lineSpacing: 0
    }).setName("office-tutorial-body").setOrigin(0.5, 0);
    const route = this.add.text(128, 68, "THEN FOLLOW THE GOLD TARGET", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.goldStamp,
      align: "center"
    }).setName("office-tutorial-route").setOrigin(0.5, 0);
    this.tutorialCard = this.add.container(0, 0, [dim, shadow, panel, title, body, route]).setDepth(1800);
    bindPointerDown(panel, () => this.dismissOfficeTutorial());
  }

  private flashNoTargetHint() {
    retroAudio.blip();
    // Float a prominent, long-lived toast above the player instead of briefly
    // swapping the low-contrast bottom hint, which the live audit could not see.
    this.toast.show("NOTHING TO INTERACT WITH", this.player.position, "warn");
    setLatestMessage("Nothing to interact with here.");
  }

  private nudgeTowardTarget(target: Interactable) {
    // The prompt is showing because the player is in range to see the cue but a
    // hair outside the strict interact radius. Tell them to step in instead of
    // the misleading "nothing to interact with".
    retroAudio.blip();
    this.toast.show(`STEP CLOSER TO ${target.label.toUpperCase()}`, this.player.position, "info");
    setLatestMessage(`Step closer to ${target.label}.`);
  }

  private dismissOfficeTutorial() {
    if (!this.tutorialCard) return;
    this.tutorialCard.destroy(true);
    this.tutorialCard = undefined;
    this.hintText.setVisible(true);
    this.setOfficeRouteCompassVisible(hasDanneItem("master-declass-key"));
    gameState.sceneProgress.officeTutorialSeen = 1;
    setLatestMessage(`${FRUS_QUEST_MISSION} ${FRUS_QUEST_STAKES}`);
    setObjective(FRUS_QUEST_FIRST_OBJECTIVE);
    this.updateFirstQuestCue();
  }

  private approachCueFor(target: Interactable) {
    if (target.id === "junior-compiler") return "GO TO JR";
    if (target.id === "starter-memo") return "GO TO MEMO";
    if (target.id === "production-inbox") return "GO TO INBOX";
    if (target.id === "frus-cart") return "GO TO CART";
    if (target.id === "Archive Terminal") return "GO TO TERM";
    if (target.id === "archive-guide-door") return "GO TO ARCHIVE";
    return `GO TO ${target.label.toUpperCase().slice(0, 12)}`;
  }

  private createFirstQuestCue() {
    const arrow = this.add.triangle(0, -15, 0, 0, 8, 0, 4, 7, color(PALETTE.goldStamp), 0.96)
      .setName("office-first-quest-arrow")
      .setStrokeStyle(1, color(PALETTE.black));
    this.firstQuestCuePlate = this.add.rectangle(0, -26, 50, 10, color(PALETTE.black), 0.86)
      .setName("office-first-quest-plate")
      .setStrokeStyle(1, color(PALETTE.goldStamp));
    this.firstQuestCueLabel = this.add.text(0, -29, "JR", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.goldStamp
    }).setName("office-first-quest-label").setOrigin(0.5, 0);
    this.firstQuestCue = this.add.container(this.juniorCompiler.x, this.juniorCompiler.y - 16, [arrow, this.firstQuestCuePlate, this.firstQuestCueLabel])
      .setName("office-first-quest-cue")
      .setDepth(850)
      .setVisible(false);
    this.tweens.add({
      targets: this.firstQuestCue,
      y: this.juniorCompiler.y - 20,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    this.updateFirstQuestCue();
  }

  private updateFirstQuestCue() {
    const target = this.currentGuidedTarget();
    const closeToTarget = this.player && target
      ? Phaser.Math.Distance.Between(this.player.position.x, this.player.position.y, target.x, target.y) <= 34
      : false;
    const visible = Boolean(
      this.firstQuestCue
      && !this.tutorialCard
      && !this.dialog?.active
      && !this.choice?.active
      && target
      && !closeToTarget
    );
    if (this.firstQuestCue && target) {
      this.firstQuestCue.setPosition(target.x, target.y - 16);
      this.firstQuestCueLabel?.setText(target.label);
      this.firstQuestCuePlate?.setDisplaySize(target.label.length >= 6 ? 58 : 50, 10);
    }
    this.firstQuestCue?.setVisible(visible);
    this.updateFirstRoomProgressVisibility();
  }

  private currentGuidedTarget() {
    if (!gameState.sceneProgress.juniorCompilerIntroduced) {
      return { x: this.juniorCompiler.x, y: this.juniorCompiler.y, label: "JR" };
    }
    const memoStatus = this.officeStarterMemoStatus();
    if (!hasDanneItem("master-declass-key")) {
      if (memoStatus === 0) return { x: 128, y: 166, label: "MEMO" };
      if (memoStatus === 1) return { x: 60, y: 154, label: "INBOX" };
      if (memoStatus === 2) return { x: 60, y: 154, label: "STAMP" };
    }
    return { x: 128, y: 216, label: "ARCHIVE" };
  }

  private updateFirstRoomProgressVisibility() {
    const routeUnlocked = hasDanneItem("master-declass-key");
    this.setOfficeRouteCompassVisible(routeUnlocked);
    this.firstRoomProgressObjects.forEach((object) => {
      const visibleObject = object as Phaser.GameObjects.GameObject & {
        setVisible?: (value: boolean) => Phaser.GameObjects.GameObject;
      };
      visibleObject.setVisible?.(false);
    });
    this.postIntroLabels.forEach((object) => {
      const visibleObject = object as Phaser.GameObjects.GameObject & {
        setVisible?: (value: boolean) => Phaser.GameObjects.GameObject;
      };
      visibleObject.setVisible?.(false);
    });
    this.syncStarterMemoVisual();
  }

  private hideLegacyRoomHud() {
    this.children.list.forEach((object) => {
      const displayObject = object as Phaser.GameObjects.GameObject & {
        depth?: number;
        y?: number;
        setVisible?: (value: boolean) => Phaser.GameObjects.GameObject;
      };
      if ((displayObject.depth ?? 0) >= 760 && (displayObject.depth ?? 0) <= 805 && (displayObject.y ?? 999) <= 36) {
        displayObject.setVisible?.(false);
      }
    });
  }

  private handleJuniorQuestStation(station: "inbox" | "cart" | "terminal") {
    if (station === "inbox") {
      this.handleStarterMemoInbox();
      return;
    }
    if (!gameState.sceneProgress.juniorCompilerIntroduced) {
      retroAudio.warning();
      setObjective(FRUS_QUEST_FIRST_OBJECTIVE);
      this.dialog.show("OFFICE CHECK", "Talk to the Junior Compiler first. They will give you the production-check route.");
      return;
    }
    const progress = gameState.sceneProgress.juniorCompilerFetch ?? 0;
    const expected = progress === 0 ? "inbox" : progress === 1 ? "cart" : progress === 2 ? "terminal" : "done";
    if (expected === "done") {
      if (station === "cart" && hasDanneItem("master-declass-key")) {
        this.showManuscriptReviewChoice();
        return;
      }
      this.dialog.show("OFFICE CHECK", "The three production checks are complete. Return to the Junior Compiler.");
      return;
    }
    if (station !== expected) {
      const next = this.nextJuniorStationLabel(progress);
      retroAudio.warning();
      setObjective(`Inspect ${next}.`);
      const alreadyLogged = (station === "cart" && progress > 1)
        || (station === "terminal" && progress > 2);
      this.dialog.show(
        "OFFICE CHECK",
        alreadyLogged ? `Already logged. Next: go to ${next}.` : `Check order matters: go to ${next}.`
      );
      return;
    }
    gameState.sceneProgress.juniorCompilerFetch = progress + 1;
    retroAudio.confirm();
    const messages = {
      inbox: "Inbox slip logged: unresolved clearance request found.",
      cart: "FRUS cart checked: document packet is physically present.",
      terminal: "Archive terminal checked: request status matches the paper trail."
    } as const;
    setLatestMessage(messages[station]);
    setObjective(this.currentOfficeObjective());
    this.dialog.show("OFFICE CHECK", [
      messages[station],
      progress + 1 >= 3 ? "Return to the Junior Compiler for key issuance." : "Continue the production check sequence."
    ]);
  }

  private officeStarterMemoStatus() {
    const stored = gameState.sceneProgress.officeStarterMemoStatus;
    if (typeof stored === "number") return Phaser.Math.Clamp(Math.round(stored), 0, 3);
    return (gameState.sceneProgress.juniorCompilerFetch ?? 0) >= 3 ? 3 : 0;
  }

  private setOfficeStarterMemoStatus(status: 0 | 1 | 2 | 3) {
    gameState.sceneProgress.officeStarterMemoStatus = status;
    gameState.sceneProgress.juniorCompilerFetch = status >= 3 ? 3 : status;
    this.syncStarterMemoVisual();
    this.updateFirstQuestCue();
  }

  private handleStarterMemo() {
    if (!gameState.sceneProgress.juniorCompilerIntroduced) {
      retroAudio.warning();
      setObjective(FRUS_QUEST_FIRST_OBJECTIVE);
      this.dialog.show("OFFICE CHECK", "Talk to JR first. Then pick up the memo.");
      return;
    }
    const memoStatus = this.officeStarterMemoStatus();
    if (memoStatus > 0) {
      this.toast.show(memoStatus >= 3 ? "MEMO ALREADY STAMPED" : "MEMO ALREADY HELD", this.player.position, "info");
      return;
    }
    this.setOfficeStarterMemoStatus(1);
    setHeldItem("Assignment Memo");
    setLatestMessage("CARRY: Assignment Memo.");
    setObjective("Carry the memo to INBOX.");
    retroAudio.confirm();
    this.toast.show("MEMO PICKED UP", this.player.position, "info");
  }

  private handleStarterMemoInbox() {
    if (!gameState.sceneProgress.juniorCompilerIntroduced) {
      retroAudio.warning();
      setObjective(FRUS_QUEST_FIRST_OBJECTIVE);
      this.dialog.show("OFFICE CHECK", "Talk to JR first. Then use INBOX.");
      return;
    }
    const memoStatus = this.officeStarterMemoStatus();
    if (memoStatus === 0) {
      retroAudio.warning();
      setObjective("Pick up the Assignment Memo.");
      this.dialog.show("INBOX", "Pick up the memo first.");
      return;
    }
    if (memoStatus === 1) {
      this.setOfficeStarterMemoStatus(2);
      setHeldItem(null);
      setLatestMessage("ROUTE: memo placed in INBOX.");
      setObjective("Stamp the memo at INBOX.");
      retroAudio.confirm();
      this.toast.show("MEMO ROUTED", this.player.position, "info");
      return;
    }
    if (memoStatus === 2) {
      this.setOfficeStarterMemoStatus(3);
      setHeldItem(null);
      addDocumentPoints(5, "opening assignment memo stamped");
      const added = addDanneItem("master-declass-key");
      if (added) retroAudio.danneItemPickup("Master Declass Key");
      retroAudio.stamp();
      setLatestMessage("STAMPED: Archive Guide door open.");
      setObjective("Archive Guide open. Go south.");
      this.showArchiveUnlockBurst();
      this.toast.show("ARCHIVE GUIDE OPEN", this.player.position, "info");
      this.dialog.show("STAMP", "Memo stamped. Archive Guide door is open.");
      return;
    }
    this.toast.show("ARCHIVE GUIDE OPEN", this.player.position, "info");
  }

  private handleArchiveGuideDoor() {
    if (!gameState.sceneProgress.juniorCompilerIntroduced) {
      retroAudio.warning();
      setObjective(FRUS_QUEST_FIRST_OBJECTIVE);
      this.dialog.show("ARCHIVE GUIDE", "Talk to JR first. They will open the first production route.");
      return;
    }
    const memoStatus = this.officeStarterMemoStatus();
    if (memoStatus < 3) {
      const next = this.nextJuniorStationLabel(memoStatus);
      retroAudio.warning();
      setObjective(this.currentOfficeObjective());
      this.dialog.show("ARCHIVE GUIDE", `Finish the first route before entering the archive: ${next}.`);
      return;
    }
    if (!hasDanneItem("master-declass-key")) {
      retroAudio.warning();
      setObjective("Return to JR for the key.");
      this.dialog.show("ARCHIVE GUIDE", "Return to JR for the Master Declass Key, then enter the archive.");
      return;
    }
    transitionTo(this, "GuideScene");
  }

  private showResearchCharterChoice() {
    if (!gameState.sceneProgress.seriesConceptComplete) {
      this.showSeriesConceptChoice();
      return;
    }
    if (!gameState.sceneProgress.volumeConceptComplete) {
      this.showVolumeConceptChoice();
      return;
    }
    const recordsAccessFiled = Boolean(gameState.sceneProgress.recordsAccessComplete) || gameState.processStamps.includes("rule");
    if (!recordsAccessFiled) {
      this.showRecordsAccessChoice();
      return;
    }
    if (gameState.sceneProgress.researchCharterComplete) {
      if (!gameState.sceneProgress.recordCollectionComplete) {
        this.showRecordCollectionChoice();
        return;
      }
      if (!gameState.sceneProgress.repositoryCoverageMapComplete) {
        this.showRepositoryCoverageMapChoice();
        return;
      }
      if (!gameState.sceneProgress.documentSelectionComplete) {
        this.showDocumentSelectionChoice();
        return;
      }
      if (!gameState.sceneProgress.selectionDocketComplete) {
        this.showSelectionDocketChoice();
        return;
      }
      if (!gameState.sceneProgress.policyCoverageAuditComplete) {
        this.showPolicyCoverageAuditChoice();
        return;
      }
      this.dialog.show("SCOPE CHARTER", [
        "Scope charter is already filed.",
        "20-year records access is already authorized.",
        "Collection notes are already logged.",
        "Repository coverage map is already filed.",
        "Candidate selection is already logged.",
        "Selection docket is already filed.",
        "Policy coverage audit is already filed.",
        "Next: verify source notes with the Archive Guide."
      ]);
      return;
    }

    const step = gameState.sceneProgress.researchCharterStep ?? 0;
    const prompt = getResearchCharterPrompt(step);
    setObjective(`Scope Charter: answer ${step + 1}/${RESEARCH_CHARTER_PROMPTS.length}.`);
    this.choice.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const result = evaluateResearchCharterAnswer(prompt.id, option.value);
      if (!result.ok) {
        retroAudio.warning();
        this.toast.show("REVISE CHARTER", this.player.position, "warn");
        this.dialog.show("SCOPE CHARTER", [
          result.message,
          "A FRUS volume starts with human scope and source discipline."
        ], () => this.showResearchCharterChoice());
        return;
      }

      const nextStep = step + 1;
      gameState.sceneProgress.researchCharterStep = nextStep;
      if (!researchCharterComplete(nextStep)) {
        retroAudio.confirm();
        setLatestMessage(`Scope charter check ${nextStep}/${RESEARCH_CHARTER_PROMPTS.length}: ${result.prompt.id}.`);
        this.dialog.show("SCOPE CHARTER", [
          result.message,
          "Continue the charter before opening the archive route."
        ], () => this.showResearchCharterChoice());
        return;
      }

      gameState.sceneProgress.researchCharterComplete = 1;
      setDocumentWorkflowState("telegram_001", "candidate", "scope charter identified first candidate set");
      setDocumentWorkflowState("doc-001", "candidate", "scope charter identified policy record");
      addDocumentPoints(4, "scope charter and Kellogg standards recorded");
      retroAudio.confirm();
      setLatestMessage("Scope charter filed: scope, source route, and Kellogg standards recorded.");
      setObjective("Scope charter filed. Return to the desk to collect source records.");
      this.reliability.update();
      this.dialog.show("SCOPE CHARTER", [
        result.message,
        "Scope charter filed: plan scope, preserve source route, and protect material facts.",
        "Next: collect and note the records before candidate selection."
      ]);
    });
  }

  private showRecordsAccessChoice() {
    if (!gameState.sceneProgress.volumeConceptComplete) {
      this.showVolumeConceptChoice();
      return;
    }
    if (gameState.sceneProgress.recordsAccessComplete || gameState.processStamps.includes("rule")) {
      this.showResearchCharterChoice();
      return;
    }

    const step = gameState.sceneProgress.recordsAccessStep ?? 0;
    const prompt = getRecordsAccessPrompt(step);
    setObjective(`20-Year Access: answer ${step + 1}/${RECORDS_ACCESS_PROMPTS.length}.`);
    this.choice.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const result = evaluateRecordsAccessAnswer(prompt.id, option.value);
      if (!result.ok) {
        retroAudio.warning();
        if (result.violation) applyStandardsViolation(result.violation, `20-year records access shortcut: ${option.value}`);
        this.toast.show("REVISE ACCESS ROUTE", this.player.position, "warn");
        this.dialog.show("20-YEAR ACCESS", [
          result.message,
          "FRUS research needs human access to the pertinent record before selection narrows it."
        ], () => this.showRecordsAccessChoice());
        return;
      }

      const nextStep = step + 1;
      gameState.sceneProgress.recordsAccessStep = nextStep;
      if (!recordsAccessComplete(nextStep)) {
        retroAudio.confirm();
        setLatestMessage(`20-year access check ${nextStep}/${RECORDS_ACCESS_PROMPTS.length}: ${result.prompt.id}.`);
        this.dialog.show("20-YEAR ACCESS", [
          result.message,
          "Continue the access authorization before filing the Scope Charter."
        ], () => this.showRecordsAccessChoice());
        return;
      }

      gameState.sceneProgress.recordsAccessComplete = 1;
      gameState.sceneProgress.recordsAccessStep = RECORDS_ACCESS_PROMPTS.length;
      awardProcessStamp("rule");
      addDocumentPoints(4, "20-year full records access authorized");
      retroAudio.stamp();
      setLatestMessage("20-year records access filed: full pertinent records route is open.");
      setObjective("20-year access filed. Return to the desk to file the Scope Charter.");
      this.reliability.update();
      this.dialog.show("20-YEAR ACCESS", [
        result.message,
        "Golden Rule stamp earned: full and complete pertinent records access is authorized.",
        "Next: file the Scope Charter before collection."
      ]);
    });
  }

  private showSeriesConceptChoice() {
    if (gameState.sceneProgress.seriesConceptComplete) {
      this.showResearchCharterChoice();
      return;
    }

    const step = gameState.sceneProgress.seriesConceptStep ?? 0;
    const prompt = getSeriesConceptPrompt(step);
    setObjective(`Series Plan: answer ${step + 1}/${SERIES_CONCEPT_PROMPTS.length}.`);
    this.choice.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const result = evaluateSeriesConceptAnswer(prompt.id, option.value);
      if (!result.ok) {
        retroAudio.warning();
        if (result.violation) applyStandardsViolation(result.violation, `Series conceptualization shortcut: ${option.value}`);
        this.toast.show("REVISE SERIES PLAN", this.player.position, "warn");
        this.dialog.show("SERIES PLAN", [
          result.message,
          "Build the volume inside the FRUS series architecture; shortcuts distort context."
        ], () => this.showSeriesConceptChoice());
        return;
      }

      const nextStep = step + 1;
      gameState.sceneProgress.seriesConceptStep = nextStep;
      if (!seriesConceptComplete(nextStep)) {
        retroAudio.confirm();
        setLatestMessage(`Series plan check ${nextStep}/${SERIES_CONCEPT_PROMPTS.length}: ${result.prompt.id}.`);
        this.dialog.show("SERIES PLAN", [
          result.message,
          "Continue the whole-series plan before drafting the volume charter."
        ], () => this.showSeriesConceptChoice());
        return;
      }

      gameState.sceneProgress.seriesConceptComplete = 1;
      gameState.sceneProgress.seriesConceptStep = SERIES_CONCEPT_PROMPTS.length;
      addDocumentPoints(4, "whole-series FRUS architecture filed");
      retroAudio.confirm();
      setLatestMessage("Series architecture filed: this volume now fits the whole FRUS plan.");
      setObjective("Series plan filed. Return to the desk to define the volume concept.");
      this.reliability.update();
      this.dialog.show("SERIES PLAN", [
        result.message,
        "Grand conceptualization filed: organize the series, fit this volume, and reserve special topics for sufficient importance.",
        "Next: define this volume's parameters."
      ]);
    });
  }

  private showVolumeConceptChoice() {
    if (!gameState.sceneProgress.seriesConceptComplete) {
      this.showSeriesConceptChoice();
      return;
    }
    if (gameState.sceneProgress.volumeConceptComplete) {
      this.showResearchCharterChoice();
      return;
    }

    const step = gameState.sceneProgress.volumeConceptStep ?? 0;
    const prompt = getVolumeConceptPrompt(step);
    setObjective(`Volume Concept: answer ${step + 1}/${VOLUME_CONCEPT_PROMPTS.length}.`);
    this.choice.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const result = evaluateVolumeConceptAnswer(prompt.id, option.value);
      if (!result.ok) {
        retroAudio.warning();
        if (result.violation) applyStandardsViolation(result.violation, `Volume conceptualization shortcut: ${option.value}`);
        this.toast.show("REVISE VOLUME CONCEPT", this.player.position, "warn");
        this.dialog.show("VOLUME CONCEPT", [
          result.message,
          "Define the volume before research narrows the record."
        ], () => this.showVolumeConceptChoice());
        return;
      }

      const nextStep = step + 1;
      gameState.sceneProgress.volumeConceptStep = nextStep;
      if (!volumeConceptComplete(nextStep)) {
        retroAudio.confirm();
        setLatestMessage(`Volume concept check ${nextStep}/${VOLUME_CONCEPT_PROMPTS.length}: ${result.prompt.id}.`);
        this.dialog.show("VOLUME CONCEPT", [
          result.message,
          "Continue defining the volume before filing the access charter."
        ], () => this.showVolumeConceptChoice());
        return;
      }

      gameState.sceneProgress.volumeConceptComplete = 1;
      gameState.sceneProgress.volumeConceptStep = VOLUME_CONCEPT_PROMPTS.length;
      addDocumentPoints(4, "individual volume concept and strategy sources filed");
      retroAudio.confirm();
      setLatestMessage("Volume concept filed: parameters, strategy sources, and implementation depth recorded.");
      setObjective("Volume concept filed. Return to the desk to authorize 20-year records access.");
      this.reliability.update();
      this.dialog.show("VOLUME CONCEPT", [
        result.message,
        "Volume concept filed: parameters, histories/memoirs/accounts, and implementation depth are recorded.",
        "Next: authorize the 20-year records-access route."
      ]);
    });
  }

  private showDocumentSelectionChoice() {
    if (!gameState.sceneProgress.recordsAccessComplete && !gameState.processStamps.includes("rule")) {
      this.dialog.show("CANDIDATE SELECTION", "Authorize 20-year records access before selecting documents.");
      return;
    }
    if (!gameState.sceneProgress.researchCharterComplete) {
      this.dialog.show("CANDIDATE SELECTION", "File the Scope Charter before selecting documents.");
      return;
    }
    if (!gameState.sceneProgress.recordCollectionComplete) {
      this.dialog.show("CANDIDATE SELECTION", "Complete the collection pass before selecting documents.");
      return;
    }
    if (!gameState.sceneProgress.repositoryCoverageMapComplete) {
      this.dialog.show("CANDIDATE SELECTION", "File the repository coverage map before selecting documents.");
      return;
    }
    setObjective("Candidate Selection: choose the balanced FRUS document set.");
    this.choice.show(`${DOCUMENT_SELECTION_PROMPT.question}\n\n${DOCUMENT_SELECTION_PROMPT.sourceBasis}`, [...DOCUMENT_SELECTION_PROMPT.options], (option) => {
      const result = evaluateDocumentSelectionAnswer(option.value, gameState.documentCandidates);
      if (!result.ok) {
        retroAudio.warning();
        if (result.violation) applyStandardsViolation(result.violation, `Candidate selection shortcut: ${option.value}`);
        this.toast.show("REVISE SELECTION", this.player.position, "warn");
        this.dialog.show("CANDIDATE SELECTION", [
          result.message,
          "A FRUS volume cannot be built from only easy records."
        ], () => this.showDocumentSelectionChoice());
        return;
      }

      gameState.sceneProgress.documentSelectionComplete = 1;
      for (const documentId of result.selectedDocumentIds) {
        setDocumentWorkflowState(documentId, "selected", "candidate selected for balanced FRUS volume");
      }
      addDocumentPoints(result.documentPoints, "balanced FRUS candidate set selected");
      const coverage = getResearchCoverageReadout(gameState.documentCandidates);
      retroAudio.confirm();
      setObjective("Candidate set selected. Return to the desk to file the selection docket.");
      setLatestMessage("Balanced FRUS candidate set selected: hard evidence stays in the volume.");
      this.reliability.update();
      this.dialog.show("CANDIDATE SELECTION", [
        result.message,
        `Selected ${result.selectedDocumentIds.length} records for source-note and review work.`,
        coverage.summary,
        "Next: file the selection docket so the printed subset stays transparent."
      ]);
    });
  }

  private showSelectionDocketChoice() {
    if (!gameState.sceneProgress.documentSelectionComplete) {
      this.showDocumentSelectionChoice();
      return;
    }
    if (gameState.sceneProgress.selectionDocketComplete) {
      this.dialog.show("SELECTION DOCKET", [
        "Selection docket is already filed.",
        "The printed subset has a visible rationale and annotation bridge."
      ]);
      return;
    }

    const step = gameState.sceneProgress.selectionDocketStep ?? 0;
    const prompt = getSelectionDocketPrompt(step);
    setObjective(`Selection Docket: answer ${step + 1}/${SELECTION_DOCKET_PROMPTS.length}.`);
    this.choice.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const result = evaluateSelectionDocketAnswer(prompt.id, option.value);
      if (!result.ok) {
        retroAudio.warning();
        if (result.violation) applyStandardsViolation(result.violation, `Selection docket shortcut: ${option.value}`);
        this.toast.show("REVISE SELECTION DOCKET", this.player.position, "warn");
        this.dialog.show("SELECTION DOCKET", [
          result.message,
          "A selective printed volume still needs visible rationale and annotation context."
        ], () => this.showSelectionDocketChoice());
        return;
      }

      const nextStep = step + 1;
      gameState.sceneProgress.selectionDocketStep = nextStep;
      if (!selectionDocketComplete(nextStep)) {
        retroAudio.confirm();
        setLatestMessage(`Selection docket check ${nextStep}/${SELECTION_DOCKET_PROMPTS.length}: ${result.prompt.id}.`);
        this.dialog.show("SELECTION DOCKET", [
          result.message,
          "Continue the docket before moving to source-note verification."
        ], () => this.showSelectionDocketChoice());
        return;
      }

      gameState.sceneProgress.selectionDocketComplete = 1;
      gameState.sceneProgress.selectionDocketStep = SELECTION_DOCKET_PROMPTS.length;
      addDocumentPoints(4, "selection docket and annotation bridge filed");
      retroAudio.confirm();
      setLatestMessage("Selection docket filed: selected subset and annotation bridge are visible.");
      setObjective("Selection docket filed. Return to the desk for the policy coverage audit.");
      this.reliability.update();
      this.dialog.show("SELECTION DOCKET", [
        result.message,
        "The volume now needs a Kellogg coverage audit before source-note verification.",
        "Next: certify that major decisions, material facts, and hard policy defects are not hidden."
      ]);
    });
  }

  private showPolicyCoverageAuditChoice() {
    if (!gameState.sceneProgress.selectionDocketComplete) {
      this.showSelectionDocketChoice();
      return;
    }
    if (gameState.sceneProgress.policyCoverageAuditComplete) {
      this.dialog.show("POLICY COVERAGE AUDIT", [
        "Policy coverage audit is already filed.",
        "Major decisions, material facts, and policy defects remain visible."
      ]);
      return;
    }

    const step = gameState.sceneProgress.policyCoverageAuditStep ?? 0;
    const prompt = getPolicyCoverageAuditPrompt(step);
    setObjective(`Coverage Audit: answer ${step + 1}/${POLICY_COVERAGE_AUDIT_PROMPTS.length}.`);
    this.choice.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const result = evaluatePolicyCoverageAuditAnswer(prompt.id, option.value);
      if (!result.ok) {
        retroAudio.warning();
        if (result.violation) applyStandardsViolation(result.violation, `Policy coverage audit shortcut: ${option.value}`);
        this.toast.show("REVISE COVERAGE AUDIT", this.player.position, "warn");
        this.dialog.show("POLICY COVERAGE AUDIT", [
          result.message,
          "The selected set still has to prove it is thorough, accurate, reliable, and not hiding defects."
        ], () => this.showPolicyCoverageAuditChoice());
        return;
      }

      const nextStep = step + 1;
      gameState.sceneProgress.policyCoverageAuditStep = nextStep;
      if (!policyCoverageAuditComplete(nextStep)) {
        retroAudio.confirm();
        setLatestMessage(`Coverage audit check ${nextStep}/${POLICY_COVERAGE_AUDIT_PROMPTS.length}: ${result.prompt.id}.`);
        this.dialog.show("POLICY COVERAGE AUDIT", [
          result.message,
          "Continue the audit before moving to source-note verification."
        ], () => this.showPolicyCoverageAuditChoice());
        return;
      }

      gameState.sceneProgress.policyCoverageAuditComplete = 1;
      gameState.sceneProgress.policyCoverageAuditStep = POLICY_COVERAGE_AUDIT_PROMPTS.length;
      addDocumentPoints(5, "policy coverage audit filed");
      retroAudio.confirm();
      setLatestMessage("Policy coverage audit filed: major decisions, material facts, and policy defects stay visible.");
      setObjective("Coverage audit filed. Enter the Archive Guide to verify source notes.");
      this.reliability.update();
      this.dialog.show("POLICY COVERAGE AUDIT", [
        result.message,
        "The selected set is now certified against major omissions and concealed policy defects.",
        "Next: verify source notes with the Archive Guide."
      ]);
    });
  }

  private showRecordCollectionChoice() {
    if (!gameState.sceneProgress.recordsAccessComplete && !gameState.processStamps.includes("rule")) {
      this.dialog.show("COLLECTION", "Authorize 20-year records access before collecting records.");
      return;
    }
    if (!gameState.sceneProgress.researchCharterComplete) {
      this.dialog.show("COLLECTION", "File the Scope Charter before collecting records.");
      return;
    }
    if (gameState.sceneProgress.recordCollectionComplete) {
      this.showDocumentSelectionChoice();
      return;
    }

    const step = gameState.sceneProgress.recordCollectionStep ?? 0;
    const prompt = getRecordCollectionPrompt(step);
    setObjective(`Record Collection: answer ${step + 1}/${RECORD_COLLECTION_PROMPTS.length}.`);
    this.choice.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const result = evaluateRecordCollectionAnswer(prompt.id, option.value);
      if (!result.ok) {
        retroAudio.warning();
        if (result.violation) applyStandardsViolation(result.violation, `Record collection shortcut: ${option.value}`);
        this.toast.show("REVISE COLLECTION", this.player.position, "warn");
        this.dialog.show("COLLECTION", [
          result.message,
          "Collect the record before narrowing it; context records matter even when they are not printed."
        ], () => this.showRecordCollectionChoice());
        return;
      }

      const nextStep = step + 1;
      gameState.sceneProgress.recordCollectionStep = nextStep;
      if (!recordCollectionComplete(nextStep)) {
        retroAudio.confirm();
        setLatestMessage(`Collection check ${nextStep}/${RECORD_COLLECTION_PROMPTS.length}: ${result.prompt.id}.`);
        this.dialog.show("COLLECTION", [
          result.message,
          "Continue the collection pass before choosing the publication subset."
        ], () => this.showRecordCollectionChoice());
        return;
      }

      gameState.sceneProgress.recordCollectionComplete = 1;
      gameState.sceneProgress.recordCollectionStep = RECORD_COLLECTION_PROMPTS.length;
      for (const documentId of ["source_note_047", "cross_reference_001", "sbu_annotation_001", "proof_page_412"]) {
        setDocumentWorkflowState(documentId, "candidate", "collection pass copied or noted record for publication/context");
      }
      addDocumentPoints(6, "collection pass copied records and context notes");
      retroAudio.confirm();
      setLatestMessage("Collection pass filed: likely documents and context records are preserved.");
      setObjective("Collection filed. Return to the desk to file the repository coverage map.");
      this.reliability.update();
      this.dialog.show("COLLECTION", [
        result.message,
        "Collection filed: searched records, copies, and context notes are ready.",
        "Next: file the repository coverage map before selection narrows the record."
      ]);
    });
  }

  private showRepositoryCoverageMapChoice() {
    if (!gameState.sceneProgress.recordCollectionComplete) {
      this.dialog.show("REPOSITORY MAP", "Complete the collection pass before filing the repository coverage map.");
      return;
    }
    if (gameState.sceneProgress.repositoryCoverageMapComplete) {
      this.showDocumentSelectionChoice();
      return;
    }

    const step = gameState.sceneProgress.repositoryCoverageMapStep ?? 0;
    const prompt = getRepositoryCoverageMapPrompt(step);
    setObjective(`Repository Coverage Map: answer ${step + 1}/${REPOSITORY_COVERAGE_MAP_PROMPTS.length}.`);
    this.choice.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const result = evaluateRepositoryCoverageMapAnswer(prompt.id, option.value);
      if (!result.ok) {
        retroAudio.warning();
        if (result.violation) applyStandardsViolation(result.violation, `Repository coverage map shortcut: ${option.value}`);
        this.toast.show("REVISE SOURCE MAP", this.player.position, "warn");
        this.dialog.show("REPOSITORY MAP", [
          result.message,
          "A reliable FRUS volume needs a visible source map before selection narrows the record."
        ], () => this.showRepositoryCoverageMapChoice());
        return;
      }

      const nextStep = step + 1;
      gameState.sceneProgress.repositoryCoverageMapStep = nextStep;
      if (!repositoryCoverageMapComplete(nextStep)) {
        retroAudio.confirm();
        setLatestMessage(`Repository map check ${nextStep}/${REPOSITORY_COVERAGE_MAP_PROMPTS.length}: ${result.prompt.id}.`);
        this.dialog.show("REPOSITORY MAP", [
          result.message,
          "Continue the repository coverage map before selecting the publication subset."
        ], () => this.showRepositoryCoverageMapChoice());
        return;
      }

      gameState.sceneProgress.repositoryCoverageMapComplete = 1;
      gameState.sceneProgress.repositoryCoverageMapStep = REPOSITORY_COVERAGE_MAP_PROMPTS.length;
      addDocumentPoints(5, "repository coverage map filed");
      retroAudio.confirm();
      setLatestMessage(`Repository coverage map filed: ${repositoryCoverageLaneCount()} source lanes are visible.`);
      setObjective("Repository map filed. Return to the desk to select the candidate set.");
      this.reliability.update();
      this.dialog.show("REPOSITORY MAP", [
        result.message,
        "Repository coverage map filed: White House/NSC, State, Defense, CIA, other agencies, and private papers are visible.",
        "Next: select the balanced document set."
      ]);
    });
  }

  private showManuscriptReviewChoice() {
    if (!gameState.processStamps.includes("archive") && !gameState.sceneProgress.sourceNoteProvenanceComplete) {
      retroAudio.warning();
      this.dialog.show("MANUSCRIPT REVIEW", [
        "The manuscript cart is not ready.",
        "Verify source-note provenance in the Archive Guide before review."
      ]);
      return;
    }
    if (gameState.sceneProgress.manuscriptReviewComplete) {
      this.dialog.show("MANUSCRIPT REVIEW", [
        "Manuscript review is already filed.",
        "Completeness, cohesion, concision, and annotation accuracy are logged.",
        "Next: route the reviewed manuscript into declassification."
      ]);
      return;
    }

    const step = gameState.sceneProgress.manuscriptReviewStep ?? 0;
    const prompt = getManuscriptReviewPrompt(step);
    setObjective(`Manuscript Review: answer ${step + 1}/${MANUSCRIPT_REVIEW_PROMPTS.length}.`);
    this.choice.show(`${prompt.question}\n\n${prompt.sourceBasis}`, [...prompt.options], (option) => {
      const result = evaluateManuscriptReviewAnswer(prompt.id, option.value);
      if (!result.ok) {
        retroAudio.warning();
        if (result.violation) applyStandardsViolation(result.violation, `Manuscript review shortcut: ${option.value}`);
        this.toast.show("REVISE REVIEW", this.player.position, "warn");
        this.dialog.show("MANUSCRIPT REVIEW", [
          result.message,
          "Review recommendations stay visible; DANN-E cannot launder the manuscript."
        ], () => this.showManuscriptReviewChoice());
        return;
      }

      const nextStep = step + 1;
      gameState.sceneProgress.manuscriptReviewStep = nextStep;
      if (!manuscriptReviewComplete(nextStep)) {
        retroAudio.confirm();
        setLatestMessage(`Manuscript review check ${nextStep}/${MANUSCRIPT_REVIEW_PROMPTS.length}: ${result.prompt.id}.`);
        this.dialog.show("MANUSCRIPT REVIEW", [
          result.message,
          "Continue the human review before declassification routing."
        ], () => this.showManuscriptReviewChoice());
        return;
      }

      gameState.sceneProgress.manuscriptReviewComplete = 1;
      gameState.sceneProgress.manuscriptReviewStep = MANUSCRIPT_REVIEW_PROMPTS.length;
      for (const documentId of ["telegram_001", "source_note_047", "cross_reference_001", "sbu_annotation_001"]) {
        setDocumentWorkflowState(documentId, "ready_for_review", "manuscript review checked completeness, cohesion, and annotation accuracy");
      }
      addDocumentPoints(10, "human manuscript review filed");
      retroAudio.confirm();
      setObjective("Manuscript review filed. Route the reviewed manuscript to declassification.");
      setLatestMessage("Manuscript review filed: recommendations and series assessment complete.");
      this.reliability.update();
      this.dialog.show("MANUSCRIPT REVIEW", [
        result.message,
        "Manuscript review filed: completeness, cohesion, concision, and annotation accuracy checked.",
        "The manuscript is ready for declassification routing."
      ]);
    });
  }

  private openProductionBoard() {
    const board = getProductionBoardReadout();
    const next = board.nextStep;
    const statusPages: string[] = [];
    for (let start = 0; start < board.steps.length; start += 3) {
      const page = board.steps.slice(start, start + 3)
        .map((step) => `${step.complete ? "OK" : step.status === "active" ? "GO" : "--"} ${step.shortLabel}: ${step.label}`)
        .join("\n");
      if (page.length > 0) statusPages.push(page);
    }
    const coveragePage = `COVERAGE: ${board.researchCoverage.completed}/${board.researchCoverage.total}\n${board.researchCoverage.summary}`;
    retroAudio.confirm();
    setLatestMessage(next ? `Production board next: ${next.label}.` : "Production board complete.");
    this.dialog.show("FRUS BOARD", [
      `FRUS volume board: ${board.completed}/${board.total} production checks complete.`,
      next
        ? `NEXT ${next.shortLabel}: ${next.gameplayTask}`
        : "All production checks are complete. Certify the Buckram Gate.",
      next
        ? `WHY: ${next.sourceBasis}`
        : "The volume is ready only if the record remains complete and standards-clean.",
      next
        ? `SOURCE:\n${next.sourceUrl}`
        : "SOURCE:\nhttps://history.state.gov/historicaldocuments/about-frus",
      coveragePage,
      ...statusPages
    ]);
  }

  private consumeOfficeReturnSpawn() {
    const x = gameState.sceneProgress.officeReturnX;
    const y = gameState.sceneProgress.officeReturnY;
    delete gameState.sceneProgress.officeReturnX;
    delete gameState.sceneProgress.officeReturnY;
    if (typeof x !== "number" || typeof y !== "number") return null;
    return { x, y };
  }

  private routeToDanneMap(target: OfficeDanneRoute, returnX: number, returnY: number) {
    gameState.sceneProgress.officeReturnX = returnX;
    gameState.sceneProgress.officeReturnY = returnY;
    transitionTo(this, target);
  }

  private drawOfficeInterior() {
    this.add.rectangle(128, 128, 210, 160, color(PALETTE.creamPaper)).setDepth(-20);
    this.drawFloorPattern();
    this.drawSnesOfficeHubDressing();
    this.drawWallDressing();
    this.drawOfficeProps();
    this.add.rectangle(128, 43, 208, 12, color(PALETTE.sepiaInk)).setDepth(-15);
    this.drawSmallDoor(39, 47, "GARDEN", PALETTE.openNetGreen);
    this.drawSmallDoor(215, 47, "SENATE", PALETTE.goldStamp);
    this.add.rectangle(128, 219, 30, 10, color(PALETTE.black)).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(20);
    this.add.rectangle(117, 214, 5, 1, color(PALETTE.white), 0.74).setName("office-archive-threshold-glint").setDepth(22);
    this.add.rectangle(140, 222, 5, 1, color(PALETTE.goldStamp), 0.86).setName("office-archive-threshold-glint").setDepth(22);
    const archiveLabel = this.add.text(128, 213, "ARCHIVE", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.goldStamp,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(21);
    archiveLabel.setName("office-post-intro-label-archive");
    this.postIntroLabels.push(archiveLabel);
    this.drawOfficeRouteCompass();
    this.setOfficeRouteCompassVisible(Boolean(gameState.sceneProgress.officeTutorialSeen));
    this.drawDesk(70, 92, "JR");
    this.drawDesk(186, 92, "SCOPE");
    this.drawDesk(60, 154, "IN");
    this.drawTerminalDesk(195, 154);
    this.add.rectangle(128, 132, 40, 18, color(PALETTE.buckramRed)).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(-5);
    this.add.rectangle(128, 130, 26, 9, color(PALETTE.creamPaper)).setDepth(-4);
    const cartLabel = this.add.text(128, 145, "FRUS CART", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.black
    }).setOrigin(0.5).setDepth(-3);
    cartLabel.setName("office-post-intro-label-cart");
    this.postIntroLabels.push(cartLabel);
    this.drawStarterMemo(128, 166);
  }

  private drawSnesOfficeHubDressing() {
    // Original 16-bit dressing for the first playable room: the player should
    // read this as an office "overworld start" with workflow landmarks, not a
    // flat staging rectangle.
    if (!this.officeTileFramesReady(["floor_base", "floor_shadow", "floor_scuff"])) {
      for (let row = 0; row < 8; row += 1) {
        for (let col = 0; col < 12; col += 1) {
          const x = 40 + col * 16;
          const y = 62 + row * 16;
          const variant = (row * 5 + col * 3) % 4;
          const fill = variant === 0
            ? PALETTE.creamPaper
            : variant === 1
              ? PALETTE.buckramHighlight
              : PALETTE.archiveAmber;
          const alpha = variant === 0 ? 0.16 : variant === 1 ? 0.18 : 0.1;
          this.add.rectangle(x, y, 13, 13, color(fill), alpha)
            .setName("office-snes-floor-tile")
            .setDepth(-17);
          if (variant === 2) {
            this.add.rectangle(x - 4, y + 4, 5, 1, color(PALETTE.sepiaInk), 0.32)
              .setName("office-snes-floor-detail")
              .setDepth(-16);
          } else if (variant === 3) {
            this.add.rectangle(x + 3, y - 3, 1, 1, color(PALETTE.goldStamp), 0.48)
              .setName("office-snes-floor-detail")
              .setDepth(-16);
            this.add.rectangle(x - 2, y + 2, 1, 1, color(PALETTE.sepiaInk), 0.42)
              .setName("office-snes-floor-detail")
              .setDepth(-16);
          }
        }
      }
    }

    for (let index = 0; index < 4; index += 1) {
      const shelfX = 45 + index * 17;
      const tileShelf = this.drawOfficeTileFrame("wall_bookcase", shelfX, 57, -13, `wall-bookcase-${index}`);
      if (tileShelf) continue;
      this.add.rectangle(shelfX, 57, 13, 13, color(PALETTE.sepiaInk))
        .setName("office-snes-wall-shelf")
        .setStrokeStyle(1, color(PALETTE.black))
        .setDepth(-13);
      this.add.rectangle(shelfX - 3, 56, 2, 8, color(PALETTE.deepRuby))
        .setName("office-snes-wall-book")
        .setDepth(-12);
      this.add.rectangle(shelfX, 56, 2, 8, color(PALETTE.goldStamp))
        .setName("office-snes-wall-book")
        .setDepth(-12);
      this.add.rectangle(shelfX + 3, 56, 2, 8, color(PALETTE.shadowNavy))
        .setName("office-snes-wall-book")
        .setDepth(-12);
    }

    this.add.rectangle(73, 117, 38, 6, color(PALETTE.goldStamp), 0.72)
      .setName("office-snes-route-inlay")
      .setDepth(-11);
    this.add.rectangle(101, 130, 42, 6, color(PALETTE.goldStamp), 0.72)
      .setName("office-snes-route-inlay")
      .setDepth(-11);
    this.add.rectangle(128, 151, 6, 42, color(PALETTE.goldStamp), 0.72)
      .setName("office-snes-route-inlay")
      .setDepth(-11);
    this.add.rectangle(128, 208, 40, 4, color(PALETTE.goldStamp), 0.72)
      .setName("office-snes-route-inlay")
      .setDepth(-11);

    this.drawOfficeWorkflowIcon(186, 116, "scope");
    this.drawOfficeWorkflowIcon(60, 154, "inbox");
    this.drawOfficeWorkflowIcon(195, 154, "terminal");
    this.drawOfficeWorkflowIcon(128, 132, "cart");
  }

  private drawOfficeWorkflowIcon(x: number, y: number, kind: "scope" | "inbox" | "terminal" | "cart") {
    this.add.ellipse(x, y + 10, 20, 6, color(PALETTE.black), 0.36)
      .setName("office-snes-workflow-shadow")
      .setDepth(-10);
    if (kind === "scope") {
      this.add.rectangle(x - 4, y, 10, 12, color(PALETTE.creamPaper))
        .setName("office-snes-workflow-icon")
        .setStrokeStyle(1, color(PALETTE.sepiaInk))
        .setDepth(-9);
      this.add.rectangle(x - 8, y, 2, 12, color(PALETTE.buckramRed))
        .setName("office-snes-workflow-icon")
        .setDepth(-8);
      this.add.rectangle(x + 4, y - 2, 7, 4, color(PALETTE.goldStamp))
        .setName("office-snes-workflow-icon")
        .setDepth(-8);
      return;
    }
    if (kind === "inbox") {
      this.add.rectangle(x, y + 1, 16, 9, color(PALETTE.archiveAmber))
        .setName("office-snes-workflow-icon")
        .setStrokeStyle(1, color(PALETTE.sepiaInk))
        .setDepth(-9);
      this.add.rectangle(x, y - 5, 14, 4, color(PALETTE.creamPaper))
        .setName("office-snes-workflow-icon")
        .setStrokeStyle(1, color(PALETTE.sepiaInk))
        .setDepth(-8);
      return;
    }
    if (kind === "terminal") {
      this.add.rectangle(x, y, 15, 12, color(PALETTE.shadowNavy))
        .setName("office-snes-workflow-icon")
        .setStrokeStyle(1, color(PALETTE.terminalCyan))
        .setDepth(-9);
      this.add.rectangle(x, y - 1, 9, 3, color(PALETTE.terminalCyan), 0.86)
        .setName("office-snes-workflow-icon")
        .setDepth(-8);
      this.add.rectangle(x + 4, y + 5, 7, 2, color(PALETTE.stoneGray))
        .setName("office-snes-workflow-icon")
        .setDepth(-8);
      return;
    }
    this.add.rectangle(x, y, 19, 12, color(PALETTE.deepRuby))
      .setName("office-snes-workflow-icon")
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setDepth(-9);
    this.add.rectangle(x - 4, y - 2, 8, 6, color(PALETTE.creamPaper))
      .setName("office-snes-workflow-icon")
      .setDepth(-8);
    this.add.rectangle(x + 5, y + 4, 4, 3, color(PALETTE.black), 0.5)
      .setName("office-snes-workflow-icon")
      .setDepth(-8);
  }

  private drawFloorPattern() {
    if (this.officeTileFramesReady(["floor_base", "floor_shadow", "floor_scuff", "rug_center", "rug_edge"])) {
      for (let row = 0; row < 8; row += 1) {
        for (let col = 0; col < 12; col += 1) {
          const x = 40 + col * 16;
          const y = 62 + row * 16;
          const variant = (row * 7 + col * 5) % 5;
          const frame: OfficeTileFrame = variant === 0
            ? "floor_shadow"
            : variant === 2
              ? "floor_scuff"
              : "floor_base";
          this.drawOfficeTileFrame(frame, x, y, -19, `floor-${row}-${col}`);
        }
      }
      for (let row = 0; row < 5; row += 1) {
        for (let col = 0; col < 5; col += 1) {
          const edge = row === 0 || row === 4 || col === 0 || col === 4;
          this.drawOfficeTileFrame(edge ? "rug_edge" : "rug_center", 96 + col * 16, 144 + row * 16, -18, `rug-${row}-${col}`);
        }
      }
      return;
    }

    // Subtle checker tiling across the cream floor to break up the empty space.
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        if ((row + col) % 2 !== 0) continue;
        const x = 32 + col * 24;
        const y = 58 + row * 24;
        this.add.rectangle(x, y, 22, 22, color(PALETTE.sepiaInk), 0.16).setDepth(-19);
      }
    }
    // Central archive runner rug leading from the entrance to the FRUS cart.
    this.add.rectangle(128, 176, 70, 78, color(PALETTE.buckramRed), 0.55).setDepth(-18);
    this.add.rectangle(128, 176, 60, 68, color(PALETTE.deepRuby), 0.45)
      .setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(-17);
    this.add.rectangle(128, 176, 46, 54).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(-16);
  }

  private drawOfficeTileFrame(
    frame: OfficeTileFrame,
    x: number,
    y: number,
    depth: number,
    name: string
  ) {
    if (!this.textures.exists(SNES_OFFICE_TILE_ASSET.key)) return null;
    const texture = this.textures.get(SNES_OFFICE_TILE_ASSET.key);
    if (!texture.has(frame)) return null;
    return this.add.image(Math.round(x), Math.round(y), SNES_OFFICE_TILE_ASSET.key, frame)
      .setName(`office-tile-${name}`)
      .setDepth(depth);
  }

  private officeTileFramesReady(frames: readonly OfficeTileFrame[]) {
    if (!this.textures.exists(SNES_OFFICE_TILE_ASSET.key)) return false;
    const texture = this.textures.get(SNES_OFFICE_TILE_ASSET.key);
    return frames.every((frame) => texture.has(frame));
  }

  private drawWallDressing() {
    if (this.officeTileFramesReady(["wall_top"])) {
      for (let col = 0; col < 10; col += 1) {
        this.drawOfficeTileFrame("wall_top", 49 + col * 16, 48, -15, `wall-top-${col}`);
      }
    }
    // Framed wall map and reference charts on the back wall strip (above desks).
    this.add.rectangle(108, 60, 30, 20, color(PALETTE.shadowNavy)).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(-14);
    this.add.rectangle(108, 60, 24, 14, color(PALETTE.mapWater)).setDepth(-13);
    this.add.rectangle(102, 58, 6, 4, color(PALETTE.openNetGreen)).setDepth(-12);
    this.add.rectangle(113, 62, 5, 5, color(PALETTE.archiveAmber)).setDepth(-12);
    this.drawProductionBoard(174, 60);
    this.drawFirstHourTrainingRelic(222, 61);
    this.captureFirstRoomProgressObjects();
    this.updateFirstRoomProgressVisibility();
    // Hanging archive banner near the senate door.
    this.add.rectangle(128, 52, 18, 14, color(PALETTE.buckramRed)).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(-14);
    this.add.rectangle(128, 50, 10, 6, color(PALETTE.goldStamp)).setDepth(-13);
  }

  private captureFirstRoomProgressObjects() {
    this.firstRoomProgressObjects = this.children.list.filter((child) => {
      const name = child.name ?? "";
      return name.startsWith("office-production-route")
        || name.startsWith("office-first-hour")
        || name.startsWith("office-snes-route-inlay");
    });
  }

  private drawStarterMemo(x: number, y: number) {
    const shadow = this.add.ellipse(0, 8, 18, 5, color(PALETTE.black), 0.3).setDepth(-3);
    const page = this.add.rectangle(0, 0, 14, 16, color(PALETTE.creamPaper))
      .setStrokeStyle(1, color(PALETTE.sepiaInk))
      .setDepth(-2);
    const margin = this.add.rectangle(-5, 0, 2, 14, color(PALETTE.buckramRed)).setDepth(-1);
    const lineA = this.add.rectangle(2, -4, 6, 1, color(PALETTE.sepiaInk), 0.75).setDepth(-1);
    const lineB = this.add.rectangle(1, 1, 8, 1, color(PALETTE.goldStamp), 0.86).setDepth(-1);
    const lineC = this.add.rectangle(2, 5, 5, 1, color(PALETTE.sepiaInk), 0.55).setDepth(-1);
    this.starterMemoIcon = this.add.container(x, y, [shadow, page, margin, lineA, lineB, lineC])
      .setName("office-starter-assignment-memo")
      .setDepth(28);
    this.syncStarterMemoVisual();
  }

  private syncStarterMemoVisual() {
    this.starterMemoIcon?.setVisible(this.officeStarterMemoStatus() === 0);
  }

  private showArchiveUnlockBurst() {
    const burst = this.add.container(128, 205).setDepth(1200);
    const panel = this.add.rectangle(0, 0, 126, 18, color(PALETTE.black), 0.88)
      .setStrokeStyle(1, color(PALETTE.goldStamp));
    const text = this.add.text(0, -5, "ARCHIVE GUIDE OPEN", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5, 0);
    const left = this.add.rectangle(-72, 0, 24, 2, color(PALETTE.terminalCyan));
    const right = this.add.rectangle(72, 0, 24, 2, color(PALETTE.terminalCyan));
    burst.add([panel, text, left, right]);
    this.tweens.add({
      targets: burst,
      y: 194,
      alpha: 0,
      duration: 950,
      ease: "Sine.easeOut",
      onComplete: () => burst.destroy(true)
    });
  }

  private drawFirstHourTrainingRelic(x: number, y: number) {
    this.add.ellipse(x, y + 12, 22, 5, color(PALETTE.black), 0.34)
      .setName("office-first-hour-relic-shadow")
      .setDepth(-13);
    if (this.textures.exists(SNES_FIRST_HOUR_TRAINING_RELIC_ASSET.key)) {
      this.add.image(x, y, SNES_FIRST_HOUR_TRAINING_RELIC_ASSET.key)
        .setName("office-first-hour-training-relic")
        .setDepth(-12);
    } else {
      this.add.rectangle(x, y, 22, 22, color(PALETTE.buckramRed))
        .setName("office-first-hour-training-relic-fallback")
        .setStrokeStyle(1, color(PALETTE.goldStamp))
        .setDepth(-12);
      this.add.rectangle(x, y, 10, 10, color(PALETTE.terminalCyan), 0.86)
        .setName("office-first-hour-training-relic-fallback")
        .setDepth(-11);
    }
    this.add.text(x, y + 15, "1HR", {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.goldStamp,
      backgroundColor: PALETTE.black
    }).setName("office-first-hour-relic-label").setOrigin(0.5, 0).setDepth(-11);
  }

  private drawProductionBoard(x: number, y: number) {
    const board = getProductionBoardReadout();
    const training = getAdventureTrainingReadout();
    const phases = getFrusProductionPhaseReadout(board);
    const boardWidth = 74;
    const boardHeight = 58;
    this.add.rectangle(x, y, boardWidth, boardHeight, color(PALETTE.shadowNavy))
      .setName("office-production-route-board")
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setDepth(-14);
    this.add.rectangle(x, y - boardHeight / 2 + 6, boardWidth - 8, 7, color(PALETTE.deepRuby))
      .setName("office-production-route-heading-band")
      .setDepth(-13);
    this.add.text(x, y - boardHeight / 2 + 2, "FRUS PATH", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.goldStamp
    }).setName("office-production-route-heading").setOrigin(0.5).setDepth(-13);
    phases.forEach((phase, index) => {
      const rowY = y - 17 + index * 5;
      const rowColor = phase.status === "complete"
        ? PALETTE.openNetGreen
        : phase.status === "active"
          ? PALETTE.terminalCyan
          : PALETTE.stoneGray;
      if (phase.status === "active") {
        this.add.rectangle(x, rowY + 1, boardWidth - 10, 5, color(PALETTE.black), 0.68)
          .setName("office-production-route-active-row")
          .setStrokeStyle(1, color(PALETTE.white), 0.84)
          .setDepth(-12);
      }
      this.add.text(x - 31, rowY - 2, phase.shortLabel.slice(0, 4), {
        fontFamily: "monospace",
        fontSize: "4px",
        color: rowColor
      }).setName("office-production-route-phase-label").setOrigin(0, 0).setDepth(-11);
      for (let tick = 0; tick < phase.total; tick += 1) {
        const tickX = x - 11 + tick * 4;
        const tickFilled = tick < phase.completed;
        const tickColor = tickFilled
          ? PALETTE.goldStamp
          : phase.status === "active"
            ? PALETTE.terminalCyan
            : PALETTE.stoneGray;
        this.add.rectangle(tickX, rowY + 1, 2, 3, color(tickColor), tickFilled ? 1 : 0.54)
          .setName("office-production-route-phase-tick")
          .setDepth(-11);
      }
      this.add.rectangle(x + 28, rowY + 1, 4, 4, color(rowColor), phase.status === "locked" ? 0.45 : 1)
        .setName("office-production-route-phase-state")
        .setDepth(-11);
    });
    this.drawFirstHourTrainingStrip(x, y + 16, training.drillId);
    const activeStep = `${training.drillLabel.slice(0, 8).toUpperCase()} ${board.nextStep?.shortLabel ?? "DONE"}`;
    this.add.rectangle(x, y + boardHeight / 2 - 7, boardWidth - 10, 5, color(PALETTE.buckramRed))
      .setName("office-production-route-next-band")
      .setDepth(-13);
    this.add.text(x, y + boardHeight / 2 - 11, activeStep, {
      fontFamily: "monospace",
      fontSize: "4px",
      color: board.nextStep ? PALETTE.terminalCyan : PALETTE.goldStamp
    }).setName("office-production-route-next-label").setOrigin(0.5, 0).setDepth(-12);
    const completeWidth = Math.max(1, Math.round((board.completed / Math.max(1, board.total)) * (boardWidth - 12)));
    this.add.rectangle(x - (boardWidth - 12) / 2 + completeWidth / 2, y + boardHeight / 2 - 3, completeWidth, 1, color(PALETTE.goldStamp), 0.7)
      .setName("office-production-route-progress")
      .setDepth(-12);
  }

  private drawFirstHourTrainingStrip(x: number, y: number, activeDrillId: string) {
    const drillLabels: Record<string, string> = {
      start_room_affordance: "ST",
      edge_route_memory: "ED",
      blocked_route_tease: "GT",
      threshold_transition: "TH",
      map_chip_orientation: "MP",
      local_key_task: "KY",
      tool_reward_use: "TL",
      shortcut_return: "SC",
      key_lock_cadence: "KD",
      hazard_readability: "HZ",
      boss_gate_check: "BS",
      reward_changes_world: "RW"
    };
    const activeDrill = FIRST_HOUR_TRAINING_DRILLS.find((drill) => drill.id === activeDrillId)
      ?? FIRST_HOUR_TRAINING_DRILLS[0];
    const activeCode = drillLabels[activeDrill.id] ?? activeDrill.label.slice(0, 2).toUpperCase();
    const startX = x - 33;
    const nodeSpacing = 6;
    this.add.rectangle(x - 15, y - 8, 38, 7, color(PALETTE.black), 0.78)
      .setName("office-first-hour-active-chip")
      .setStrokeStyle(1, color(PALETTE.terminalCyan), 0.84)
      .setDepth(-10);
    this.add.text(x - 32, y - 11, "1HR", {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.goldStamp
    }).setName("office-first-hour-chip-label").setOrigin(0, 0).setDepth(-9);
    this.add.text(x - 15, y - 11, `${activeDrill.minutes[0]}-${activeDrill.minutes[1]} ${activeCode}`, {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.terminalCyan
    }).setName("office-first-hour-chip-minute").setOrigin(0.5, 0).setDepth(-9);
    FIRST_HOUR_TRAINING_DRILLS.forEach((drill, index) => {
      const nodeX = startX + index * nodeSpacing;
      const active = drill.id === activeDrillId;
      const nodeColor = active ? PALETTE.terminalCyan : PALETTE.stoneGray;
      if (index > 0) {
        this.add.rectangle(nodeX - 3, y, 3, 1, color(PALETTE.goldStamp), 0.54)
          .setName("office-first-hour-route-link")
          .setDepth(-12);
      }
      this.add.rectangle(nodeX, y, 5, 5, color(active ? PALETTE.black : PALETTE.deepRuby), active ? 1 : 0.82)
        .setName("office-first-hour-route-node")
        .setStrokeStyle(1, color(nodeColor), active ? 1 : 0.62)
        .setDepth(-11);
      this.add.text(nodeX, y - 2, drillLabels[drill.id] ?? drill.label.slice(0, 2).toUpperCase(), {
        fontFamily: "monospace",
        fontSize: "3px",
        color: active ? PALETTE.white : nodeColor
      }).setName("office-first-hour-route-label").setOrigin(0.5, 0.5).setDepth(-10);
      if (index % 2 === 0) {
        this.add.text(nodeX, y + 4, String(drill.minutes[0]).padStart(2, "0"), {
          fontFamily: "monospace",
          fontSize: "3px",
          color: active ? PALETTE.goldStamp : PALETTE.stoneGray
        }).setName("office-first-hour-minute-label").setOrigin(0.5, 0).setDepth(-10);
      }
    });
  }

  private drawOfficeProps() {
    // Stacked archive boxes in the lower-left corner.
    this.drawArchiveBox(28, 196);
    this.drawArchiveBox(28, 182);
    this.drawArchiveBox(40, 198);
    // Document stacks on the floor near the FILES desk.
    this.add.rectangle(214, 116, 12, 4, color(PALETTE.creamPaper)).setStrokeStyle(1, color(PALETTE.sepiaInk)).setDepth(-6);
    this.add.rectangle(214, 112, 11, 4, color(PALETTE.archiveAmber)).setStrokeStyle(1, color(PALETTE.sepiaInk)).setDepth(-6);
    // Potted plant in the lower-right corner for warmth.
    this.drawPottedPlant(228, 200);
    // Desk lamp glow on the terminal desk.
    this.add.ellipse(195, 150, 30, 16, color(PALETTE.goldStamp), 0.18).setDepth(-7);
  }

  private drawPottedPlant(x: number, y: number) {
    // Blocky NES-style potted plant. Earlier versions stacked several green
    // ellipses, which merged into one flat green mass at 256x240 and read as a
    // placeholder blob. Built from outlined rectangles instead so the pot, soil
    // and individual leaf blades are all legible as an intentional plant prop.
    // Terracotta pot body + rim.
    this.add.rectangle(x, y + 3, 12, 9, color(PALETTE.archiveAmber)).setStrokeStyle(1, color(PALETTE.sepiaInk)).setDepth(-6);
    this.add.rectangle(x, y - 2, 14, 4, color(PALETTE.archiveAmber)).setStrokeStyle(1, color(PALETTE.sepiaInk)).setDepth(-6);
    this.add.rectangle(x, y + 6, 12, 2, color(PALETTE.sepiaInk), 0.4).setDepth(-5);
    // Dark soil line under the rim.
    this.add.rectangle(x, y - 1, 10, 2, color(PALETTE.sepiaInk)).setDepth(-5);
    // Foliage as discrete outlined leaf blades fanning out of the pot.
    this.add.rectangle(x, y - 11, 6, 14, color(PALETTE.plantLeafDark)).setStrokeStyle(1, color(PALETTE.sepiaInk)).setDepth(-6);
    this.add.rectangle(x - 5, y - 8, 4, 9, color(PALETTE.plantLeafShade)).setStrokeStyle(1, color(PALETTE.sepiaInk)).setDepth(-5).setAngle(-18);
    this.add.rectangle(x + 5, y - 8, 4, 9, color(PALETTE.plantLeafShade)).setStrokeStyle(1, color(PALETTE.sepiaInk)).setDepth(-5).setAngle(18);
    this.add.rectangle(x - 1, y - 14, 3, 8, color(PALETTE.plantLeaf)).setDepth(-4);
    this.add.rectangle(x + 2, y - 13, 2, 6, color(PALETTE.plantLeaf)).setDepth(-4);
  }

  private drawArchiveBox(x: number, y: number) {
    this.add.rectangle(x, y, 14, 11, color(PALETTE.archiveAmber)).setStrokeStyle(1, color(PALETTE.sepiaInk)).setDepth(-6);
    this.add.rectangle(x, y - 3, 14, 3, color(PALETTE.sepiaInk), 0.5).setDepth(-5);
    this.add.rectangle(x, y + 1, 8, 3, color(PALETTE.creamPaper)).setDepth(-5);
  }

  private drawDesk(x: number, y: number, label: string) {
    this.add.rectangle(x + 2, y + 2, 58, 20, color(PALETTE.black), 0.35).setDepth(-8);
    this.add.rectangle(x, y, 58, 20, color(PALETTE.sepiaInk)).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(-6);
    if (this.officeTileFramesReady(["desk_top"])) {
      for (let col = 0; col < 3; col += 1) {
        this.drawOfficeTileFrame("desk_top", x - 16 + col * 16, y - 2, -5, `desk-top-${label}-${col}`);
      }
    }
    this.add.rectangle(x - 15, y - 2, 18, 8, color(PALETTE.creamPaper)).setDepth(-5);
    this.add.rectangle(x + 13, y - 2, 15, 8, color(PALETTE.buckramRed)).setDepth(-5);
    const deskLabel = this.add.text(x, y + 5, label, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5).setDepth(-4);
    deskLabel.setName(label === "JR" ? "office-primary-label-jr" : `office-post-intro-label-${label.toLowerCase()}`);
    if (label !== "JR") this.postIntroLabels.push(deskLabel);
  }

  private drawTerminalDesk(x: number, y: number) {
    this.drawDesk(x, y, "TERM");
    this.add.rectangle(x, y - 9, 22, 14, color(PALETTE.black)).setStrokeStyle(1, color(PALETTE.terminalCyan)).setDepth(-3);
    this.add.rectangle(x, y - 9, 14, 7, color(PALETTE.terminalCyan), 0.7).setDepth(-2);
  }

  private drawOfficeRouteCompass() {
    const y = 202;
    this.add.rectangle(128, y + 2, 110, 16, color(PALETTE.black), 0.34)
      .setName("office-route-compass-shadow")
      .setDepth(-5);
    this.add.rectangle(128, y, 108, 14, color(PALETTE.shadowNavy), 0.92)
      .setName("office-route-compass-panel")
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setDepth(-4);
    const routes = [
      { x: 93, label: "GDN", accent: PALETTE.openNetGreen, kind: "garden" },
      { x: 128, label: "ARC", accent: PALETTE.goldStamp, kind: "archive" },
      { x: 163, label: "HAC", accent: PALETTE.creamPaper, kind: "senate" }
    ] as const;
    routes.forEach((route, index) => {
      if (index > 0) {
        this.add.rectangle(route.x - 18, y + 2, 14, 1, color(PALETTE.goldStamp), 0.6)
          .setName("office-route-compass-link")
          .setDepth(-3);
      }
      this.add.rectangle(route.x, y + 2, 22, 10, color(PALETTE.black), 0.88)
        .setName("office-route-compass-chip")
        .setStrokeStyle(1, color(route.accent))
        .setDepth(-3);
      this.drawOfficeRouteCompassIcon(route.x - 6, y + 1, route.kind, route.accent);
      this.add.text(route.x + 5, y - 1, route.label, {
        fontFamily: "monospace",
        fontSize: "4px",
        color: route.accent
      }).setName("office-route-compass-label").setOrigin(0.5, 0).setDepth(-2);
    });
  }

  private drawOfficeRouteCompassIcon(x: number, y: number, kind: "garden" | "archive" | "senate", accent: string) {
    if (kind === "garden") {
      this.add.rectangle(x, y + 2, 5, 4, color(PALETTE.plantLeafDark))
        .setName("office-route-compass-icon")
        .setStrokeStyle(1, color(accent))
        .setDepth(-2);
      this.add.rectangle(x, y + 5, 2, 3, color(PALETTE.sepiaInk))
        .setName("office-route-compass-icon")
        .setDepth(-1);
      return;
    }
    if (kind === "senate") {
      this.add.rectangle(x, y + 3, 7, 4, color(PALETTE.creamPaper))
        .setName("office-route-compass-icon")
        .setStrokeStyle(1, color(PALETTE.goldStamp))
        .setDepth(-2);
      this.add.rectangle(x - 2, y + 1, 2, 3, color(accent))
        .setName("office-route-compass-icon")
        .setDepth(-1);
      this.add.rectangle(x + 2, y + 1, 2, 3, color(accent))
        .setName("office-route-compass-icon")
        .setDepth(-1);
      return;
    }
    this.add.rectangle(x, y + 3, 6, 7, color(PALETTE.deepRuby))
      .setName("office-route-compass-icon")
      .setStrokeStyle(1, color(accent))
      .setDepth(-2);
    this.add.rectangle(x - 2, y + 3, 2, 7, color(PALETTE.buckramRed))
      .setName("office-route-compass-icon")
      .setDepth(-1);
    this.add.rectangle(x + 1, y + 1, 4, 1, color(accent))
      .setName("office-route-compass-icon")
      .setDepth(-1);
  }

  private setOfficeRouteCompassVisible(visible: boolean) {
    for (const object of this.children.list) {
      if (!object.name.startsWith("office-route-compass")) continue;
      const visibleObject = object as Phaser.GameObjects.GameObject & {
        setVisible?: (value: boolean) => Phaser.GameObjects.GameObject;
      };
      visibleObject.setVisible?.(visible);
    }
  }

  private drawSmallDoor(x: number, y: number, label: string, accent: string) {
    this.add.rectangle(x, y, 30, 12, color(PALETTE.black)).setStrokeStyle(1, color(accent)).setDepth(16);
    this.add.rectangle(x, y + 3, 20, 5, color(PALETTE.deepRuby)).setDepth(17);
    this.add.rectangle(x - 9, y - 3, 5, 1, color(PALETTE.white), 0.72).setName("office-route-door-glint").setDepth(18);
    this.add.rectangle(x + 8, y + 1, 4, 1, color(accent), 0.9).setName("office-route-door-glint").setDepth(18);
    const doorLabel = this.add.text(x, y - 4, label, {
      fontFamily: "monospace",
      fontSize: "4px",
      color: accent,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(18);
    doorLabel.setName(`office-post-intro-label-door-${label.toLowerCase()}`);
    this.postIntroLabels.push(doorLabel);
  }
}
