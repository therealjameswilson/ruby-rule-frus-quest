import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import type { Direction, RoomType } from "../game/constants";
import {
  addDocumentPoints,
  addProcessItem,
  addVolumeFragment,
  awardProcessStamp,
  gameState,
  getHeldProcessItemIds,
  hasProcessItem,
  clearDocumentUndisclosedDeletion,
  markDocumentUndisclosedDeletion,
  setAgencyEquityResponse,
  setDocumentWorkflowState,
  setLatestMessage,
  setNearestInteractable,
  setObjective,
  setRoomTraversalState,
  setSceneState,
  setVisibleEntities,
  setVisibleThreats
} from "../game/state";
import type { ChoiceOption } from "../game/types";
import { getInput, tickInput, type InputState } from "../input/InputState";
import { blockedExitPrompt, canTraverseExit, getRevealedShortcutRoomIds } from "../game/questArchitecture";
import { BureaucraticWall } from "../entities/BureaucraticWall";
import { Player } from "../entities/Player";
import { Terminal } from "../entities/items/Terminal";
import { HistorianNPC } from "../entities/npcs/HistorianNPC";
import { retroAudio } from "../systems/audio";
import { DialogBox } from "../systems/dialog";
import { InventoryOverlay } from "../systems/inventory";
import { adjustReliability, applyStandardsViolation, ReliabilityHud } from "../systems/reliability";
import { activateRoleAbility } from "../systems/roleAbility";
import { handleOpenOverlays } from "../systems/overlayInput";
import { addDocumentStack, addTinySparkle, addVaultBlocks } from "../systems/roomDressing";
import { addObjectiveText, drawRoomFrame, drawTiledFloor, transitionArchiveRoom, transitionTo } from "../systems/sceneTransitions";
import { addSnesRoomLayer, addSnesWorldMap } from "../systems/snesPixelArt";
import { ChoicePrompt } from "../systems/verification";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

interface EquityMatch {
  label: string;
  agency: "CIA" | "DOD" | "NSC";
}

type ReferralRoomId = "R1" | "R2";

interface ReferralRoom {
  id: ReferralRoomId;
  title: string;
  roomType: RoomType;
  exits: Partial<Record<Direction, ReferralRoomId | "SilentReadScene">>;
  lockedExits?: Partial<Record<Direction, string>>;
  requiredItems?: Partial<Record<Direction, "concurrence_slip">>;
}

const REFERRAL_PLAY_BOUNDS = { left: 14, right: 242, top: 42, bottom: 220 };
const DOOR_Y_MIN = 100;
const DOOR_Y_MAX = 150;
const EXIT_SPAWNS: Record<Direction, { x: number; y: number }> = {
  north: { x: 128, y: 58 },
  south: { x: 128, y: 204 },
  east: { x: 30, y: 124 },
  west: { x: 226, y: 124 }
};

const REFERRAL_ROOMS: Record<ReferralRoomId, ReferralRoom> = {
  R1: {
    id: "R1",
    title: "Equity Gate",
    roomType: "puzzle",
    exits: { east: "R2" },
    lockedExits: { east: "Visible excision gate" }
  },
  R2: {
    id: "R2",
    title: "Concurrence Chamber",
    roomType: "reward",
    exits: { west: "R1", east: "SilentReadScene" },
    lockedExits: { east: "Concurrence Slip handoff" },
    requiredItems: { east: "concurrence_slip" }
  }
};

export class ReferralVaultScene extends Phaser.Scene {
  private player!: Player;
  private dialog!: DialogBox;
  private choice!: ChoicePrompt;
  private inventory!: InventoryOverlay;
  private reliability!: ReliabilityHud;
  private objectiveText!: Phaser.GameObjects.Text;
  private vaultText!: Phaser.GameObjects.Text;
  private matchIndex = 0;
  private correctMatches = 0;
  private referralGateOpen = false;
  private concurrenceSlipCollected = false;
  private currentRoomId: ReferralRoomId = "R1";
  private visitedRoomIds = new Set<ReferralRoomId>();
  private roomObjects: Phaser.GameObjects.GameObject[] = [];
  private roomCleanups: Array<() => void> = [];
  private mapCells = new Map<ReferralRoomId, Phaser.GameObjects.Rectangle>();
  private mapLabels = new Map<ReferralRoomId, Phaser.GameObjects.Text>();
  private roomTitleText!: Phaser.GameObjects.Text;
  private roomTransitionLocked = false;
  private exitCooldownUntil = 0;
  private concurrenceSlipIcon?: Phaser.GameObjects.Image;
  private bureaucraticWalls: BureaucraticWall[] = [];

  private readonly matches: EquityMatch[] = [
    { label: "Intelligence annex", agency: "CIA" },
    { label: "Base access memo", agency: "DOD" },
    { label: "White House minutes", agency: "NSC" }
  ];

  constructor() {
    super("ReferralVaultScene");
  }

  create() {
    setSceneState("ReferralVaultScene", "explore", "Referral Vault: earn the Concurrence Slip.");
    retroAudio.startMusic("ReferralVaultScene");
    this.cameras.main.setBackgroundColor(PALETTE.deepRuby);
    drawTiledFloor(this, "vault-tiles");
    drawRoomFrame(this, "REFERRAL VAULT");
    this.drawReferralMinimap();
    this.roomTitleText = this.add.text(128, 33, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(902);

    this.vaultText = this.add.text(128, 88, "BATCH MANIFEST\nPENDING HUMAN CHECK", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.terminalCyan,
      backgroundColor: PALETTE.black,
      align: "center"
    }).setOrigin(0.5).setDepth(820);

    this.player = new Player(this, 128, 192);
    this.dialog = new DialogBox(this);
    this.choice = new ChoicePrompt(this);
    this.inventory = new InventoryOverlay(this);
    this.reliability = new ReliabilityHud(this);
    this.objectiveText = addObjectiveText(this);
    this.referralGateOpen = gameState.processStamps.includes("referral");
    this.concurrenceSlipCollected = hasProcessItem("concurrence_slip");
    this.enterRoom("R1", { x: 128, y: 192 }, false);
    this.dialog.show("MARCUS", [
      "Referral means agency equity.",
      "Your clearance token opens this red vault door.",
      "StateChat can draft a manifest. You confirm it, then take the slip by hand."
    ], () => {
      if (!this.referralGateOpen) this.startMatching();
    });
  }

  update(_: number, delta: number) {
    tickInput();
    const input = getInput();
    this.bureaucraticWalls.forEach((wall) => wall.update(this.time.now, delta, this.player?.position));
    this.syncThreatState();
    if (input.fullscreenJustPressed) this.scale.toggleFullscreen();
    if (input.menuJustPressed) this.inventory.toggle();
    if (input.soundJustPressed) {
      retroAudio.toggle();
      this.reliability.update();
    }
    if (input.reliabilityJustPressed) this.reliability.toggleDetails();
    if (input.abilityJustPressed) activateRoleAbility(this);
    if (this.roomTransitionLocked) {
      this.player.update(delta, false);
      return;
    }
    if (this.dialog.active) {
      if (input.aJustPressed) this.dialog.advance();
      this.player.update(delta, false);
      return;
    }
    if (this.choice.active || this.inventory.active || this.reliability.active) {
      handleOpenOverlays(this.inventory, this.reliability);
      this.choice.updateInput();
      this.player.update(delta, false);
      return;
    }
    if (input.pauseJustPressed) {
      this.dialog.show("PAUSED", "The vault waits.");
      return;
    }
    this.player.update(delta, true, { bounds: REFERRAL_PLAY_BOUNDS });
    if (this.handleConcurrenceSlipAction(input)) {
      this.reliability.update();
      this.objectiveText.setText(gameState.objective);
      return;
    }
    if (this.checkRoomExit()) return;
    this.reliability.update();
    this.objectiveText.setText(gameState.objective);
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T) {
    this.roomObjects.push(object);
    return object;
  }

  private enterRoom(roomId: ReferralRoomId, spawn: { x: number; y: number }, wipe = true, direction: Direction = "east") {
    const applyRoom = () => {
      this.currentRoomId = roomId;
      this.visitedRoomIds.add(roomId);
      this.clearRoom();
      this.renderCurrentRoom();
      this.player.setPosition(spawn.x, spawn.y);
      this.syncRoomTraversalState();
      this.updateReferralMinimap();
      this.exitCooldownUntil = this.time.now + 280;
    };

    if (!wipe) {
      applyRoom();
      this.roomTransitionLocked = false;
      return;
    }

    this.roomTransitionLocked = true;
    transitionArchiveRoom(this, {
      fromRoomId: this.currentRoomId,
      toRoomId: roomId,
      direction,
      label: REFERRAL_ROOMS[roomId].title.toUpperCase(),
      onCovered: applyRoom,
      onComplete: () => {
        this.roomTransitionLocked = false;
      }
    });
  }

  private clearRoom() {
    for (const cleanup of this.roomCleanups) cleanup();
    for (const object of this.roomObjects) {
      if (object.active) object.destroy();
    }
    for (const wall of this.bureaucraticWalls) wall.destroy();
    this.roomCleanups = [];
    this.roomObjects = [];
    this.bureaucraticWalls = [];
    this.concurrenceSlipIcon = undefined;
    setNearestInteractable(null);
  }

  private renderCurrentRoom() {
    const room = REFERRAL_ROOMS[this.currentRoomId];
    this.roomTitleText.setText(`${room.id} ${room.title}`);
    addSnesRoomLayer(this, { roomId: room.id, roomType: room.roomType, theme: "vault", track: (object) => this.track(object) });
    this.drawRoomDoors();
    if (room.id === "R1") this.renderEquityGate();
    else this.renderConcurrenceChamber();
    this.syncRoomTraversalState();
    this.syncThreatState();
  }

  private drawRoomDoors() {
    const room = REFERRAL_ROOMS[this.currentRoomId];
    if (room.exits.west) {
      this.track(this.add.rectangle(11, 124, 9, 36, color(PALETTE.black)).setDepth(65));
      this.track(this.add.rectangle(16, 124, 3, 26, color(PALETTE.goldStamp)).setDepth(66));
    }
    if (room.exits.east) {
      const open = this.currentRoomId === "R1" ? this.referralGateOpen : this.concurrenceSlipCollected;
      const accent = open ? PALETTE.goldStamp : PALETTE.classNetRed;
      this.track(this.add.rectangle(245, 124, 9, 36, color(PALETTE.black)).setDepth(65));
      this.track(this.add.rectangle(240, 124, 3, 26, color(accent)).setDepth(66));
      if (!open) this.track(this.add.rectangle(242, 124, 2, 30, color(PALETTE.classNetRed)).setDepth(67));
    }
  }

  private renderEquityGate() {
    setVisibleEntities([
      "Marcus",
      "StateChat terminal",
      "CIA equity seal",
      "DOD equity seal",
      "NSC equity seal",
      "Referral Manifest",
      "Excision Bracket Marker",
      "Stone Wall: Referral delay"
    ]);
    addVaultBlocks(this, (object) => this.track(object));
    addSnesWorldMap(this, 128, 62, "EQUITY MAP", "referral-vault-map", (object) => this.track(object));
    addDocumentStack(this, 214, 116, true, (object) => this.track(object));
    this.track(addTinySparkle(this, 128, 120, PALETTE.goldStamp));
    const marcus = new HistorianNPC(this, "marcus", 42, 58);
    this.roomCleanups.push(() => marcus.destroy());
    this.track(new Terminal(this, 214, 58, "StateChat").container);
    this.track(this.add.image(114, 112, "referral-manifest").setDepth(120));
    this.track(this.add.image(158, 112, "excision-bracket-marker").setDepth(120));
    this.addSeal(70, 132, "CIA");
    this.addSeal(128, 132, "DOD");
    this.addSeal(186, 132, "NSC");
    if (!this.referralGateOpen) {
      this.bureaucraticWalls = [
        new BureaucraticWall(this, "cia-delay-wall", "WAIT", 44, 160, { behavior: "freeze", accent: PALETTE.goldStamp }),
        new BureaucraticWall(this, "nsc-delay-wall", "HOLD", 212, 160, { behavior: "block", accent: PALETTE.classNetRed })
      ];
      this.vaultText.setText("BATCH MANIFEST\nPENDING HUMAN CHECK");
      setObjective("Referral Vault: match each document to its agency equity.");
    } else {
      this.vaultText.setText("REFERRAL GATE OPEN\nEAST: CONCURRENCE");
      setObjective("Referral Vault: enter R2 and collect the Concurrence Slip.");
    }
  }

  private renderConcurrenceChamber() {
    setVisibleEntities(["Concurrence Slip pedestal", "Agency concurrence chamber", "Silent Read handoff gate"]);
    addVaultBlocks(this, (object) => this.track(object));
    this.track(this.add.rectangle(128, 76, 172, 28, color(PALETTE.black)).setStrokeStyle(2, color(PALETTE.goldStamp)).setDepth(76));
    this.track(this.add.text(128, 67, "CONCURRENCE CHAMBER", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5).setDepth(78));
    for (let x = 62; x <= 194; x += 33) {
      this.track(this.add.rectangle(x, 104, 24, 20, color(PALETTE.deepRuby)).setStrokeStyle(2, color(PALETTE.goldStamp)).setDepth(95));
      this.track(this.add.image(x, 101, "agency-equity-seal").setScale(1).setDepth(96));
    }
    this.track(this.add.rectangle(128, 145, 78, 32, color(PALETTE.black)).setStrokeStyle(2, color(PALETTE.goldStamp)).setDepth(138));
    this.track(this.add.rectangle(128, 156, 96, 7, color(PALETTE.deepRuby)).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(139));
    if (!this.concurrenceSlipCollected) {
      this.concurrenceSlipIcon = this.track(this.add.image(128, 132, "concurrence-slip").setDepth(155));
      this.vaultText.setText("CONCURRENCE SLIP\nPRESS SPACE");
      setObjective("Referral Vault: collect the Concurrence Slip in R2.");
    } else {
      this.track(this.add.image(128, 132, "concurrence-slip").setTint(color(PALETTE.goldStamp)).setDepth(155));
      this.vaultText.setText("SLIP EARNED\nEAST: SILENT READ");
      setObjective("Referral Vault: exit east to Silent Read Tower.");
    }
  }

  private addSeal(x: number, y: number, label: string) {
    const container = this.track(this.add.container(x, y).setDepth(120));
    const plate = this.add.rectangle(0, 0, 38, 30, color(PALETTE.black)).setStrokeStyle(2, color(PALETTE.goldStamp));
    const seal = this.add.image(0, -1, "agency-equity-seal");
    const text = this.add.text(0, -5, label, {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.black,
      backgroundColor: PALETTE.goldStamp
    }).setOrigin(0.5);
    container.add([plate, seal, text]);
  }

  private syncThreatState() {
    setVisibleThreats(
      this.bureaucraticWalls.filter((wall) => !wall.isCleared).map((wall) => ({
        label: `Stone Wall: ${wall.label}`,
        x: wall.position.x,
        y: wall.position.y,
        spriteKey: wall.spriteKey,
        behavior: wall.label === "WAIT" ? "freezes exits temporarily" : "blocks referral gate",
        defeatMethod: "Resolve agency response timer and visible referral review",
        status: this.referralGateOpen ? "cleared" : "active"
      }))
    );
  }

  private drawReferralMinimap() {
    (["R1", "R2"] as ReferralRoomId[]).forEach((roomId, index) => {
      const x = 16 + index * 11;
      const cell = this.add.rectangle(x, 16, 8, 7, color(PALETTE.stoneDark)).setStrokeStyle(1, color(PALETTE.creamPaper)).setDepth(805);
      const label = this.add.text(x, 12, roomId, {
        fontFamily: "monospace",
        fontSize: "4px",
        color: PALETTE.creamPaper
      }).setOrigin(0.5, 0).setDepth(806);
      this.mapCells.set(roomId, cell);
      this.mapLabels.set(roomId, label);
    });
  }

  private updateReferralMinimap() {
    for (const [roomId, cell] of this.mapCells) {
      const active = roomId === this.currentRoomId;
      const visited = this.visitedRoomIds.has(roomId);
      cell.setFillStyle(color(active ? PALETTE.goldStamp : visited ? PALETTE.terminalCyan : PALETTE.stoneDark));
      this.mapLabels.get(roomId)?.setColor(active ? PALETTE.black : PALETTE.creamPaper);
    }
  }

  private syncRoomTraversalState() {
    const room = REFERRAL_ROOMS[this.currentRoomId];
    const lockedExits: Partial<Record<Direction, string>> = {};
    if (room.id === "R1" && !this.referralGateOpen) lockedExits.east = room.lockedExits?.east;
    if (room.id === "R2" && !canTraverseExit(room.id, "east", getHeldProcessItemIds())) {
      lockedExits.east = room.lockedExits?.east;
    }
    setRoomTraversalState({
      currentRoomId: room.id,
      roomTitle: room.title,
      roomType: room.roomType,
      visitedRoomIds: [...this.visitedRoomIds],
      revealedRoomIds: [
        ...(this.referralGateOpen || this.concurrenceSlipCollected ? ["R1", "R2"] : ["R1"]),
        ...getRevealedShortcutRoomIds(getHeldProcessItemIds()).filter((roomId): roomId is ReferralRoomId => roomId in REFERRAL_ROOMS)
      ],
      exits: room.exits,
      lockedExits,
      requiredItems: room.requiredItems
    });
  }

  private handleConcurrenceSlipAction(input: Readonly<InputState>) {
    if (this.currentRoomId !== "R2") {
      setNearestInteractable(null);
      return false;
    }
    if (this.concurrenceSlipCollected) {
      setNearestInteractable(null);
      this.vaultText.setText("SLIP EARNED\nEAST: SILENT READ");
      return false;
    }
    const nearSlip = Phaser.Math.Distance.Between(this.player.position.x, this.player.position.y, 128, 132) <= 32;
    if (!nearSlip) {
      setNearestInteractable(null);
      this.vaultText.setText("CONCURRENCE SLIP\nPRESS SPACE");
      return false;
    }
    setNearestInteractable("Concurrence Slip");
    this.vaultText.setText("CONCURRENCE SLIP\nPRESS SPACE");
    if (!input.aJustPressed) return false;
    this.collectConcurrenceSlip();
    return true;
  }

  private collectConcurrenceSlip() {
    if (this.concurrenceSlipCollected) return;
    this.concurrenceSlipCollected = true;
    addProcessItem("concurrence_slip");
    setLatestMessage("Concurrence Slip opens referral gates.");
    setObjective("Referral Vault: exit east to Silent Read Tower.");
    this.vaultText.setText("SLIP EARNED\nEAST: SILENT READ");
    this.concurrenceSlipIcon?.setTint(color(PALETTE.goldStamp));
    retroAudio.stamp();
    this.syncRoomTraversalState();
    this.updateReferralMinimap();
    this.dialog.show("MARCUS", [
      "Concurrence logged after human review.",
      "The slip is process evidence, not a machine decision.",
      "Carry it east to the proof tower."
    ]);
  }

  private checkRoomExit() {
    if (this.time.now < this.exitCooldownUntil) return false;
    const position = this.player.position;
    let direction: Direction | null = null;
    if (position.x >= REFERRAL_PLAY_BOUNDS.right - 1 && position.y >= DOOR_Y_MIN && position.y <= DOOR_Y_MAX) direction = "east";
    else if (position.x <= REFERRAL_PLAY_BOUNDS.left + 1 && position.y >= DOOR_Y_MIN && position.y <= DOOR_Y_MAX) direction = "west";
    if (!direction) return false;

    if (this.currentRoomId === "R1" && direction === "east") {
      if (!this.referralGateOpen) {
        setLatestMessage("Referral gate waits for visible excision review.");
        setObjective("Resolve agency equity and visible withholding language before entering R2.");
        this.player.setPosition(REFERRAL_PLAY_BOUNDS.right - 18, position.y);
        this.exitCooldownUntil = this.time.now + 500;
        return false;
      }
      this.enterRoom("R2", EXIT_SPAWNS.east, true, "east");
      return true;
    }

    if (this.currentRoomId === "R2" && direction === "west") {
      this.enterRoom("R1", EXIT_SPAWNS.west, true, "west");
      return true;
    }

    if (this.currentRoomId === "R2" && direction === "east") {
      const heldItems = getHeldProcessItemIds();
      if (!canTraverseExit(this.currentRoomId, direction, heldItems)) {
        const prompt = blockedExitPrompt(this.currentRoomId, direction, heldItems);
        setLatestMessage(prompt.message);
        setObjective(prompt.objective);
        this.player.setPosition(REFERRAL_PLAY_BOUNDS.right - 18, position.y);
        this.exitCooldownUntil = this.time.now + 500;
        return false;
      }
      this.roomTransitionLocked = true;
      transitionTo(this, "SilentReadScene");
      return true;
    }

    this.exitCooldownUntil = this.time.now + 360;
    return false;
  }

  private startMatching() {
    this.matchIndex = 0;
    this.correctMatches = 0;
    setObjective("Referral Vault: match each document to its agency equity.");
    this.showMatchChoice();
  }

  private showMatchChoice() {
    const item = this.matches[this.matchIndex];
    this.vaultText.setText(`MATCH ${this.matchIndex + 1}/3\n${item.label.toUpperCase()}`);
    const options: ChoiceOption[] = [
      { key: "A", label: "CIA equity", value: "CIA" },
      { key: "B", label: "DOD equity", value: "DOD" },
      { key: "C", label: "NSC equity", value: "NSC" }
    ];
    this.choice.show(`REFERRAL MATCH:\n${item.label}\n\nWHICH EQUITY SEAL?`, options, (option) => {
      if (option.value === item.agency) {
        this.correctMatches += 1;
        adjustReliability(3, `${item.label} matched to ${item.agency}`);
      } else {
        applyStandardsViolation("omitted_material_fact", `${item.label} was sent to the wrong equity.`);
        this.vaultText.setText("STANDARD HIT\nMATERIAL FACT RISK");
      }
      this.reliability.update();
      this.matchIndex += 1;
      if (this.matchIndex >= this.matches.length) {
        this.showManifestChoice();
      } else {
        this.showMatchChoice();
      }
    });
  }

  private showManifestChoice() {
    setObjective("Confirm the manifest with human judgment.");
    this.vaultText.setText("STATECHAT MANIFEST\n3 REFERRALS QUEUED\nHUMAN CONFIRM?");
    const options: ChoiceOption[] = [
      { key: "A", label: "Accept without review", value: "blind" },
      { key: "B", label: "Confirm after checking equities", value: "checked" },
      { key: "C", label: "Let StateChat decide", value: "machine" }
    ];
    this.choice.show("STATECHAT GENERATED A BATCH MANIFEST.\n\nWHO DECIDES?", options, (option) => {
      if (option.value === "checked" && this.correctMatches === this.matches.length) {
        setDocumentWorkflowState("source_note_047", "referred");
        setDocumentWorkflowState("sbu_annotation_001", "referred");
        addDocumentPoints(8, "agency concurrence checked");
        setLatestMessage("EVIDENCE-BOUND: HUMAN CHECK REQUIRED");
        adjustReliability(7, "manifest confirmed by human review");
        this.reliability.update();
        this.showExcisionChoice();
        return;
      }
      const violation = applyStandardsViolation("concealed_policy_defect", "A final referral decision was ceded or unchecked.");
      this.reliability.update();
      this.dialog.show("STANDARD VIOLATION", [
        violation.label,
        "No silent handoff. Review the equities again."
      ], () => this.startMatching());
    });
  }

  private showExcisionChoice() {
    setObjective("Mark excised text visibly.");
    const options: ChoiceOption[] = [
      { key: "A", label: "Delete the missing passage", value: "erase" },
      { key: "B", label: "[Text not declassified]", value: "visible" },
      { key: "C", label: "Leave a blank gap", value: "blank" }
    ];
    this.choice.show("EXCISION REQUIRED.\nFRUS DOES NOT SILENTLY ERASE WITHHELD MATERIAL.\n\nWHAT PRINTS?", options, (option) => {
      if (option.value === "visible") {
        awardProcessStamp("referral");
        setDocumentWorkflowState("source_note_047", "cleared");
        setDocumentWorkflowState("cross_reference_001", "cleared");
        clearDocumentUndisclosedDeletion("sbu_annotation_001", "bracketed insertion added");
        setDocumentWorkflowState("sbu_annotation_001", "excised");
        setAgencyEquityResponse("sbu_annotation_001", "agency-cyan", "cleared");
        setAgencyEquityResponse("sbu_annotation_001", "agency-red", "excised");
        addVolumeFragment("Referral Fragment");
        addDocumentPoints(12, "visible withholding language printed");
        retroAudio.stamp();
        adjustReliability(8, "visible withholding language used");
        this.reliability.update();
        this.referralGateOpen = true;
        this.bureaucraticWalls.forEach((wall) => wall.clear());
        this.clearRoom();
        this.renderCurrentRoom();
        this.player.setPosition(128, 178);
        this.syncRoomTraversalState();
        this.updateReferralMinimap();
        this.dialog.show("MARCUS", [
          "Correct.",
          "The reader sees the withholding. The record does not pretend.",
          "The Concurrence Chamber is open. Take the slip by hand."
        ]);
        return;
      }
      markDocumentUndisclosedDeletion("sbu_annotation_001", "unbracketed excision");
      const violation = applyStandardsViolation("undisclosed_deletion", "Excision skipped the bracketed insertion.");
      this.reliability.update();
      this.dialog.show("STANDARD VIOLATION", [
        violation.label,
        "Visible language. Never a silent gap."
      ], () => this.showExcisionChoice());
    });
  }
}
