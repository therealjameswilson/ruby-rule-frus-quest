import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import {
  addDocumentPoints,
  addInventoryItem,
  addVolumeFragment,
  awardProcessStamp,
  gameState,
  setHeldItem,
  setLatestMessage,
  setNearestInteractable,
  setObjective,
  setPhysicalVerificationState,
  setSceneState,
  setVisibleEntities
} from "../game/state";
import { HistorianNPC } from "../entities/HistorianNPC";
import { Player } from "../entities/Player";
import { retroAudio } from "../systems/audio";
import { DialogBox } from "../systems/dialog";
import { InventoryOverlay } from "../systems/inventory";
import { adjustReliability, canAutoApplyProposal, ReliabilityHud } from "../systems/reliability";
import { activateRoleAbility } from "../systems/roleAbility";
import { addProofingTable, addTinySparkle } from "../systems/roomDressing";
import { addObjectiveText, addTerminalPanel, drawRoomFrame, transitionTo } from "../systems/sceneTransitions";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

type WorkstationId = "opennet" | "classnet" | "editor-desk" | "referral-tray" | "proof-table";
type PhysicalFlagStatus = "waiting" | "carried" | "routed" | "verified" | "stamped";

interface Workstation {
  id: WorkstationId;
  label: string;
  x: number;
  y: number;
  accent: string;
  texture: string;
}

interface PhysicalFlag {
  id: string;
  label: string;
  shortLabel: string;
  kind: string;
  destination: WorkstationId;
  texture: string;
  status: PhysicalFlagStatus;
  x: number;
  y: number;
  icon?: Phaser.GameObjects.Image;
  labelText?: Phaser.GameObjects.Text;
  routedStation?: WorkstationId;
}

const WORKSTATIONS: Workstation[] = [
  { id: "opennet", label: "OpenNet", x: 42, y: 190, accent: PALETTE.openNetGreen, texture: "opennet-terminal" },
  { id: "classnet", label: "ClassNet", x: 214, y: 190, accent: PALETTE.classNetRed, texture: "classnet-terminal" },
  { id: "editor-desk", label: "Editor Desk", x: 78, y: 176, accent: PALETTE.buckramHighlight, texture: "red-pencil" },
  { id: "referral-tray", label: "Referral Tray", x: 178, y: 176, accent: PALETTE.goldStamp, texture: "concurrence-slip" },
  { id: "proof-table", label: "Proof Table", x: 128, y: 188, accent: PALETTE.terminalCyan, texture: "proof-page" }
];

const PHYSICAL_FLAGS: Array<Omit<PhysicalFlag, "status" | "x" | "y" | "icon" | "labelText" | "routedStation">> = [
  {
    id: "mechanical-fix",
    label: "StateChat Mechanical Fix Proposal",
    shortLabel: "MECH FIX",
    kind: "mechanical",
    destination: "editor-desk",
    texture: "red-pencil"
  },
  {
    id: "public-crossref",
    label: "Evidence-Bound OpenNet Cross-Reference",
    shortLabel: "OPEN NOTE",
    kind: "evidence_bound",
    destination: "opennet",
    texture: "cross-reference"
  },
  {
    id: "classified-source",
    label: "Evidence-Bound ClassNet Source Note",
    shortLabel: "CLASS NOTE",
    kind: "classification",
    destination: "classnet",
    texture: "source-note"
  },
  {
    id: "referral-equity",
    label: "Evidence-Bound Referral Equity Slip",
    shortLabel: "REF SLIP",
    kind: "evidence_bound",
    destination: "referral-tray",
    texture: "concurrence-slip"
  },
  {
    id: "proof-date",
    label: "Evidence-Bound Proof Date Discrepancy",
    shortLabel: "PROOF DATE",
    kind: "evidence_bound",
    destination: "proof-table",
    texture: "proof-page"
  }
];

export class SilentReadScene extends Phaser.Scene {
  private player!: Player;
  private dialog!: DialogBox;
  private inventory!: InventoryOverlay;
  private reliability!: ReliabilityHud;
  private objectiveText!: Phaser.GameObjects.Text;
  private actionHint!: Phaser.GameObjects.Text;
  private physicalFlags: PhysicalFlag[] = [];
  private readonly outbox = { x: 128, y: 202 };

  constructor() {
    super("SilentReadScene");
  }

  create() {
    setSceneState("SilentReadScene", "explore", "Run AI annotation review SOP.");
    retroAudio.startMusic("SilentReadScene");
    setVisibleEntities([
      "Priya",
      "Manuscript page",
      "Typeset proof",
      "Proof page icon",
      "Red pencil",
      "Review Folder",
      "Proof Lens",
      "AI Annotation Review terminal",
      ...WORKSTATIONS.map((station) => station.label)
    ]);
    this.cameras.main.setBackgroundColor(PALETTE.creamPaper);
    this.add.rectangle(128, 120, 256, 240, color(PALETTE.sepiaInk));
    this.add.rectangle(128, 120, 248, 232, color(PALETTE.creamPaper));
    drawRoomFrame(this, "SILENT READ", PALETTE.deepRuby);
    addProofingTable(this, 128, 172);
    addTinySparkle(this, 178, 87, PALETTE.classNetRed);
    new HistorianNPC(this, "priya", 28, 52);
    this.drawPage(78, 114, "MANUSCRIPT", [
      "The office office",
      "opened in 1947.",
      "The record said",
      "\"publish fully."
    ]);
    this.drawPage(178, 114, "TYPESET PROOF", [
      "The office",
      "opened in 1974.",
      "The record said",
      "\"publish fully."
    ]);
    this.add.image(177, 162, "proof-page").setDepth(165);
    this.add.image(128, 163, "red-pencil").setDepth(166);
    addTerminalPanel(this, 128, 44, [
      "AI ANNO REVIEW",
      "SCHEMA: OK",
      `MECH AUTO: ${canAutoApplyProposal("mechanical") ? "YES" : "NO"}`,
      "EVIDENCE: COMMENT",
      "HUMAN TRIAGE"
    ]);
    this.drawWorkstations();
    this.drawToolbeltIcons();

    this.player = new Player(this, 128, 202);
    this.dialog = new DialogBox(this);
    this.inventory = new InventoryOverlay(this);
    this.reliability = new ReliabilityHud(this);
    this.objectiveText = addObjectiveText(this);
    this.actionHint = this.add.text(8, 211, "", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.creamPaper,
      backgroundColor: PALETTE.black
    }).setDepth(811);
    this.dialog.show("PRIYA", [
      "Run the AI annotation review tool first.",
      "It returns a JSON plan, not a final decision.",
      "Carry each flag to a workstation, verify it, then stamp the human review."
    ], () => this.startPhysicalVerificationLoop());
  }

  update(_: number, delta: number) {
    const keys = this.player.inputKeys;
    if (Phaser.Input.Keyboard.JustDown(keys.f)) this.scale.toggleFullscreen();
    if (Phaser.Input.Keyboard.JustDown(keys.m)) this.inventory.toggle();
    if (Phaser.Input.Keyboard.JustDown(keys.n)) {
      retroAudio.toggle();
      this.reliability.update();
    }
    if (Phaser.Input.Keyboard.JustDown(keys.r)) this.reliability.toggleDetails();
    if (Phaser.Input.Keyboard.JustDown(keys.e)) activateRoleAbility(this);
    if (this.dialog.active) {
      if (Phaser.Input.Keyboard.JustDown(keys.space) || Phaser.Input.Keyboard.JustDown(keys.enter)) this.dialog.advance();
      this.player.update(delta, false);
      return;
    }
    if (this.inventory.active || this.reliability.active) {
      this.player.update(delta, false);
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(keys.esc)) {
      this.dialog.show("PAUSED", "The page waits.");
      return;
    }
    this.player.update(delta, true);
    this.updatePhysicalVerification();
    if (Phaser.Input.Keyboard.JustDown(keys.space) || Phaser.Input.Keyboard.JustDown(keys.enter)) {
      this.handlePhysicalAction();
    }
    this.reliability.update();
    this.objectiveText.setText(gameState.objective);
  }

  private drawPage(x: number, y: number, title: string, lines: string[]) {
    this.add.rectangle(x, y, 86, 112, color(PALETTE.white)).setStrokeStyle(2, color(PALETTE.sepiaInk));
    this.add.rectangle(x - 38, y, 3, 104, color(PALETTE.classNetRed));
    this.add.text(x, y - 49, title, {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.deepRuby
    }).setOrigin(0.5);
    lines.forEach((line, index) => {
      const isDate = line.includes("1974") || line.includes("1947");
      this.add.text(x - 34, y - 31 + index * 16, line, {
        fontFamily: "monospace",
        fontSize: "7px",
        color: isDate ? PALETTE.classNetRed : PALETTE.sepiaInk
      });
    });
  }

  private drawWorkstations() {
    for (const station of WORKSTATIONS) {
      this.add.rectangle(station.x, station.y + 1, 40, 18, color(PALETTE.black), 0.88).setDepth(150);
      this.add.rectangle(station.x, station.y, 38, 16, color(PALETTE.deepRuby), 0.92).setStrokeStyle(2, color(station.accent)).setDepth(151);
      this.add.image(station.x - 11, station.y, station.texture).setDepth(152);
      this.add.rectangle(station.x + 9, station.y - 2, 13, 5, color(station.accent)).setDepth(153);
      this.add.rectangle(station.x + 9, station.y + 4, 13, 2, color(PALETTE.creamPaper)).setDepth(153);
      this.add.text(station.x, station.y + 12, station.label.toUpperCase(), {
        fontFamily: "monospace",
        fontSize: "5px",
        color: station.accent
      }).setOrigin(0.5).setDepth(154);
    }
    this.add.rectangle(this.outbox.x, this.outbox.y, 44, 16, color(PALETTE.black), 0.82).setStrokeStyle(2, color(PALETTE.terminalCyan)).setDepth(149);
    this.add.text(this.outbox.x, this.outbox.y + 12, "STATECHAT OUTBOX", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.terminalCyan
    }).setOrigin(0.5).setDepth(154);
  }

  private drawToolbeltIcons() {
    const tools = [
      { x: 92, y: 72, key: "review-folder", label: "FOLDER", color: PALETTE.goldStamp },
      { x: 128, y: 72, key: "proof-lens", label: "LENS", color: PALETTE.terminalCyan },
      { x: 164, y: 72, key: "red-pencil", label: "PENCIL", color: PALETTE.buckramHighlight }
    ];
    for (const tool of tools) {
      this.add.rectangle(tool.x, tool.y, 28, 22, color(PALETTE.black), 0.86).setStrokeStyle(1, color(tool.color)).setDepth(146);
      this.add.image(tool.x, tool.y - 3, tool.key).setDepth(147);
      this.add.text(tool.x, tool.y + 9, tool.label, {
        fontFamily: "monospace",
        fontSize: "5px",
        color: tool.color
      }).setOrigin(0.5).setDepth(148);
    }
  }

  private startPhysicalVerificationLoop() {
    addInventoryItem("Review Folder");
    addInventoryItem("Proof Lens");
    addInventoryItem("Red Pencil");
    this.physicalFlags = PHYSICAL_FLAGS.map((flag, index) => {
      const physicalFlag: PhysicalFlag = {
        ...flag,
        status: "waiting",
        x: this.outbox.x,
        y: this.outbox.y - 10
      };
      physicalFlag.icon = this.add.image(physicalFlag.x, physicalFlag.y, flag.texture).setDepth(240).setVisible(index === 0);
      physicalFlag.labelText = this.add.text(physicalFlag.x, physicalFlag.y + 14, flag.shortLabel, {
        fontFamily: "monospace",
        fontSize: "5px",
        color: flag.kind === "mechanical" ? PALETTE.goldStamp : PALETTE.terminalCyan,
        backgroundColor: PALETTE.black
      }).setOrigin(0.5).setDepth(241).setVisible(index === 0);
      return physicalFlag;
    });
    setLatestMessage("Review Folder carries unresolved issues; Proof Lens reveals discrepancies.");
    setObjective("CARRY: pick up the first StateChat flag.");
    this.syncVisibleEntities();
    this.updatePhysicalVerification();
  }

  private updatePhysicalVerification() {
    const activeFlag = this.getActiveFlag();
    if (!activeFlag) {
      this.actionHint.setText("DONE: verification loop stamped.");
      setNearestInteractable(null);
      this.syncPhysicalState("DONE", null);
      return;
    }

    const nearestStation = this.findNearestWorkstation();
    const carriedFlag = activeFlag.status === "carried" ? activeFlag : null;
    if (carriedFlag?.icon) {
      carriedFlag.x = Math.round(this.player.position.x);
      carriedFlag.y = Math.round(this.player.position.y - 15);
      carriedFlag.icon.setPosition(carriedFlag.x, carriedFlag.y);
      carriedFlag.icon.setDepth(Math.round(this.player.position.y) + 4);
      carriedFlag.labelText?.setPosition(carriedFlag.x, carriedFlag.y + 14);
      carriedFlag.labelText?.setDepth(Math.round(this.player.position.y) + 5);
    }

    this.updateFlagVisibility();
    const verb = this.verbFor(activeFlag);
    this.syncPhysicalState(verb, nearestStation);
    this.updateActionHint(activeFlag, nearestStation);
  }

  private handlePhysicalAction() {
    const activeFlag = this.getActiveFlag();
    if (!activeFlag) return;

    if (activeFlag.status === "waiting") {
      if (!this.isNear(activeFlag.x, activeFlag.y, 24)) {
        retroAudio.warning();
        setLatestMessage(`CARRY: move to ${activeFlag.shortLabel}.`);
        return;
      }
      activeFlag.status = "carried";
      setHeldItem(`Review Folder: ${activeFlag.shortLabel}`);
      setLatestMessage(`CARRY: ${activeFlag.label}.`);
      setObjective(`ROUTE: place ${activeFlag.shortLabel} on ${this.stationFor(activeFlag.destination).label}.`);
      retroAudio.blip();
      this.updatePhysicalVerification();
      return;
    }

    const nearestStation = this.findNearestWorkstation(28);
    if (!nearestStation) {
      retroAudio.warning();
      setLatestMessage(`${this.verbFor(activeFlag)}: stand beside the correct workstation.`);
      return;
    }
    const correctStation = this.stationFor(activeFlag.destination);
    if (nearestStation.id !== activeFlag.destination) {
      retroAudio.warning();
      setLatestMessage(`ROUTE: ${activeFlag.shortLabel} belongs at ${correctStation.label}.`);
      return;
    }

    if (activeFlag.status === "carried") {
      activeFlag.status = "routed";
      setHeldItem(null);
      activeFlag.routedStation = nearestStation.id;
      activeFlag.x = nearestStation.x;
      activeFlag.y = nearestStation.y - 17;
      activeFlag.icon?.setPosition(activeFlag.x, activeFlag.y).setDepth(242);
      activeFlag.labelText?.setPosition(activeFlag.x, activeFlag.y + 14).setDepth(243);
      setLatestMessage(`ROUTE: ${activeFlag.shortLabel} placed on ${nearestStation.label}.`);
      setObjective(`VERIFY: press Space at ${nearestStation.label}.`);
      retroAudio.confirm();
      this.updatePhysicalVerification();
      return;
    }

    if (activeFlag.status === "routed") {
      activeFlag.status = "verified";
      this.addVerificationMark(nearestStation);
      setLatestMessage(`VERIFY: human review resolved ${activeFlag.shortLabel}.`);
      setObjective(`STAMP: apply a process stamp at ${nearestStation.label}.`);
      retroAudio.confirm();
      this.updatePhysicalVerification();
      return;
    }

    if (activeFlag.status === "verified") {
      activeFlag.status = "stamped";
      this.addProcessStampMark(activeFlag, nearestStation);
      this.applyFlagReward(activeFlag);
      retroAudio.stamp();
      this.updatePhysicalVerification();
      this.advanceAfterStamp();
    }
  }

  private applyFlagReward(flag: PhysicalFlag) {
    if (flag.id === "mechanical-fix") {
      awardProcessStamp("sop");
      addInventoryItem("AI Annotation Review Log");
      addInventoryItem("Red Pencil");
      addDocumentPoints(8, "mechanical StateChat proposal routed to human review");
      adjustReliability(8, "AI checker output kept inside SOP");
      setLatestMessage("MECHANICAL FIX ACCEPTED");
      return;
    }
    if (flag.id === "proof-date") {
      awardProcessStamp("proof");
      addInventoryItem("Proof Lens");
      addVolumeFragment("Proof Fragment");
      addDocumentPoints(16, "evidence-bound factual discrepancy physically verified");
      adjustReliability(12, "human caught factual discrepancy");
      return;
    }
    addDocumentPoints(5, `${flag.shortLabel} verified at ${this.stationFor(flag.destination).label}`);
    adjustReliability(3, `${flag.shortLabel} routed to human workstation`);
  }

  private advanceAfterStamp() {
    this.syncVisibleEntities();
    const nextFlag = this.getActiveFlag();
    if (!nextFlag) {
      addInventoryItem("Buckram Key");
      setObjective("STAMP: all physical verification loops complete.");
      setLatestMessage("Buckram Key opens the final publication gate.");
      this.add.image(this.outbox.x, this.outbox.y - 24, "buckram-key").setDepth(250);
      this.actionHint.setText("DONE: all StateChat flags verified and stamped.");
      this.reliability.update();
      this.dialog.show(gameState.playerProfile.displayName.toUpperCase(), [
        "Every evidence-bound flag became a physical object.",
        "Mechanical fixes proposed; human workstations verified.",
        "The final read panel completes the ruby volume."
      ], () => transitionTo(this, "EndingScene"));
      return;
    }
    nextFlag.x = this.outbox.x;
    nextFlag.y = this.outbox.y - 10;
    nextFlag.icon?.setPosition(nextFlag.x, nextFlag.y).setVisible(true);
    nextFlag.labelText?.setPosition(nextFlag.x, nextFlag.y + 14).setVisible(true);
    setObjective(`CARRY: pick up ${nextFlag.shortLabel} from the StateChat outbox.`);
  }

  private addVerificationMark(station: Workstation) {
    const glow = this.add.rectangle(station.x, station.y - 18, 24, 4, color(PALETTE.terminalCyan), 0.92).setDepth(245);
    this.tweens.add({
      targets: glow,
      alpha: 0.25,
      duration: 260,
      yoyo: true,
      repeat: 2
    });
  }

  private addProcessStampMark(flag: PhysicalFlag, station: Workstation) {
    const stationStampCount = this.physicalFlags.filter((candidate) => candidate.status === "stamped" && candidate.destination === station.id).length;
    const x = station.x - 14 + ((stationStampCount - 1) % 3) * 14;
    const y = station.y + 22 + Math.floor((stationStampCount - 1) / 3) * 7;
    this.add.rectangle(x, y, 12, 6, color(PALETTE.goldStamp)).setStrokeStyle(1, color(PALETTE.black)).setDepth(246);
    this.add.rectangle(x, y + 2, 10, 2, color(PALETTE.buckramHighlight)).setDepth(247);
    this.add.text(x, y - 3, "OK", {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.black
    }).setOrigin(0.5).setDepth(248);
    flag.icon?.setAlpha(0.74);
    flag.labelText?.setAlpha(0.74);
    setLatestMessage(`STAMP: ${flag.shortLabel} human review recorded.`);
  }

  private updateActionHint(flag: PhysicalFlag, nearestStation: Workstation | null) {
    const correctStation = this.stationFor(flag.destination);
    const verb = this.verbFor(flag);
    const stationText = nearestStation ? ` NEAR: ${nearestStation.label.toUpperCase()}` : "";
    if (flag.status === "waiting") {
      const nearFlag = this.isNear(flag.x, flag.y, 24);
      setNearestInteractable(nearFlag ? `CARRY ${flag.shortLabel}` : null);
      this.actionHint.setText(`CARRY ${flag.shortLabel}: press Space at StateChat outbox.`);
      return;
    }
    if (flag.status === "carried") {
      setNearestInteractable(nearestStation ? `ROUTE to ${nearestStation.label}` : null);
      this.actionHint.setText(`ROUTE ${flag.shortLabel}: ${correctStation.label}.${stationText}`);
      return;
    }
    if (flag.status === "routed") {
      setNearestInteractable(nearestStation?.id === flag.destination ? `VERIFY ${flag.shortLabel}` : null);
      this.actionHint.setText(`VERIFY ${flag.shortLabel}: press Space at ${correctStation.label}.`);
      return;
    }
    setNearestInteractable(nearestStation?.id === flag.destination ? `STAMP ${flag.shortLabel}` : null);
    this.actionHint.setText(`${verb} ${flag.shortLabel}: press Space at ${correctStation.label}.`);
  }

  private updateFlagVisibility() {
    const activeFlag = this.getActiveFlag();
    for (const flag of this.physicalFlags) {
      const visible = flag === activeFlag || flag.status === "stamped";
      flag.icon?.setVisible(visible);
      flag.labelText?.setVisible(visible && flag.status !== "carried");
    }
  }

  private syncPhysicalState(verb: "CARRY" | "ROUTE" | "VERIFY" | "STAMP" | "DONE", nearestStation: Workstation | null) {
    const completed = this.physicalFlags.filter((flag) => flag.status === "stamped").length;
    const carried = this.physicalFlags.find((flag) => flag.status === "carried");
    setPhysicalVerificationState({
      verb,
      carriedItem: carried ? `Review Folder: ${carried.shortLabel}` : null,
      nearestStation: nearestStation?.label ?? null,
      completed,
      total: this.physicalFlags.length,
      flags: this.physicalFlags.map((flag) => ({
        id: flag.id,
        label: flag.label,
        kind: flag.kind,
        destination: this.stationFor(flag.destination).label,
        status: flag.status
      }))
    });
  }

  private syncVisibleEntities() {
    setVisibleEntities([
      "Priya",
      "Manuscript page",
      "Typeset proof",
      "AI Annotation Review terminal",
      "StateChat outbox",
      "Review Folder",
      "Proof Lens",
      "Red Pencil",
      ...WORKSTATIONS.map((station) => station.label),
      ...this.physicalFlags
        .filter((flag) => flag.status !== "stamped")
        .map((flag) => flag.label)
    ]);
  }

  private getActiveFlag() {
    return this.physicalFlags.find((flag) => flag.status !== "stamped") ?? null;
  }

  private verbFor(flag: PhysicalFlag): "CARRY" | "ROUTE" | "VERIFY" | "STAMP" {
    if (flag.status === "waiting") return "CARRY";
    if (flag.status === "carried") return "ROUTE";
    if (flag.status === "routed") return "VERIFY";
    return "STAMP";
  }

  private stationFor(id: WorkstationId) {
    const station = WORKSTATIONS.find((candidate) => candidate.id === id);
    if (!station) throw new Error(`Unknown workstation: ${id}`);
    return station;
  }

  private findNearestWorkstation(maxDistance = 24) {
    const nearest = WORKSTATIONS.map((station) => ({
      station,
      distance: Phaser.Math.Distance.Between(this.player.position.x, this.player.position.y, station.x, station.y)
    })).sort((a, b) => a.distance - b.distance)[0];
    return nearest && nearest.distance <= maxDistance ? nearest.station : null;
  }

  private isNear(x: number, y: number, radius: number) {
    return Phaser.Math.Distance.Between(this.player.position.x, this.player.position.y, x, y) <= radius;
  }
}
