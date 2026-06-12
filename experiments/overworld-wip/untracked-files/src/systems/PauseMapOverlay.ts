import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import type { WorldScreensDefinition } from "../game/world";

type MapIcon = "document" | "stamp" | "pen" | "seal";

interface PauseMapState {
  currentScreenId: string;
  visitedScreenIds: string[];
  discoveredRegionNames: string[];
  questFlags: Record<string, boolean>;
  debugRevealMap: boolean;
}

const OVERVIEW_REGIONS: Array<{
  screenId: string;
  label: string;
  icon: MapIcon;
  shortLabel: string;
}> = [
  { screenId: "nara-ii", label: "NARA II", shortLabel: "NARA II", icon: "document" },
  { screenId: "nara-i", label: "NARA I", shortLabel: "NARA I", icon: "document" },
  { screenId: "navy-hill", label: "Navy Hill", shortLabel: "NAVY", icon: "document" },
  { screenId: "white-house", label: "White House", shortLabel: "WHITE", icon: "seal" },
  { screenId: "little-rock", label: "Little Rock", shortLabel: "L ROCK", icon: "seal" },
  { screenId: "newington", label: "Newington", shortLabel: "NEWING", icon: "stamp" },
  { screenId: "springfield", label: "Springfield", shortLabel: "SPRING", icon: "pen" },
  { screenId: "undisclosed-location", label: "Undisclosed Location", shortLabel: "UNDISC", icon: "stamp" }
];

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class PauseMapOverlay {
  private readonly scene: Phaser.Scene;
  private readonly world: WorldScreensDefinition;
  private readonly container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, world: WorldScreensDefinition) {
    this.scene = scene;
    this.world = world;
    this.container = scene.add.container(0, 0).setDepth(1150).setScrollFactor(0).setVisible(false);
  }

  get active() {
    return this.container.visible;
  }

  toggle(state: PauseMapState) {
    if (this.active) {
      this.hide();
      return false;
    }
    this.show(state);
    return true;
  }

  show(state: PauseMapState) {
    this.rebuild(state);
    this.container.setVisible(true);
  }

  hide() {
    this.container.setVisible(false);
  }

  refresh(state: PauseMapState) {
    if (!this.active) return;
    this.rebuild(state);
  }

  private rebuild(state: PauseMapState) {
    this.container.removeAll(true);
    this.addPanel();
    this.addRegionPlates(state);
    this.addCurrentMarker(state.currentScreenId);
    this.addLegend();
  }

  private addPanel() {
    this.addRect(128, 120, 236, 208, PALETTE.black);
    this.addRect(128, 120, 228, 200, PALETTE.creamPaper);
    this.addRect(128, 22, 228, 18, PALETTE.deepRuby);
    this.addRect(128, 218, 228, 12, PALETTE.deepRuby);
    this.addOutline(128, 120, 236, 208, PALETTE.goldStamp);
    this.addText(128, 16, "FRUS DISTRICT MAP", 9, PALETTE.goldStamp);
    this.addText(128, 29, "DISCOVERED REGIONS", 6, PALETTE.creamPaper);
    this.addText(128, 215, "M/TAB CLOSE   CURRENT: CYAN", 6, PALETTE.creamPaper);
  }

  private addRegionPlates(state: PauseMapState) {
    for (const region of OVERVIEW_REGIONS) {
      const screen = this.world.screens.find((candidate) => candidate.id === region.screenId);
      if (!screen) continue;
      const discovered = state.visitedScreenIds.includes(screen.id) || state.discoveredRegionNames.includes(screen.regionName);
      const visible = discovered || state.debugRevealMap;
      const locked = this.isLocked(screen.id, state.questFlags);
      const center = this.mapPoint(screen.gridX, screen.gridY);
      const fill = locked ? PALETTE.deepRuby : visible ? PALETTE.white : PALETTE.archiveAmber;
      const stroke = screen.id === state.currentScreenId ? PALETTE.terminalCyan : visible ? PALETTE.goldStamp : PALETTE.sepiaInk;

      this.addRect(center.x, center.y, 36, 21, fill);
      this.addOutline(center.x, center.y, 38, 23, stroke);

      if (!visible) {
        this.addRect(center.x, center.y, 25, 5, PALETTE.black);
        this.addText(center.x, center.y - 7, "?", 8, PALETTE.deepRuby);
        continue;
      }

      if (locked) {
        this.addText(center.x, center.y - 7, "?", 8, PALETTE.goldStamp);
        this.addRect(center.x, center.y + 1, 28, 4, PALETTE.black);
      } else {
        this.drawIcon(region.icon, center.x - 12, center.y - 3);
      }

      this.addText(center.x + 4, center.y + 5, region.shortLabel, 5, locked ? PALETTE.goldStamp : PALETTE.black);
    }
  }

  private addCurrentMarker(currentScreenId: string) {
    const current = this.world.screens.find((screen) => screen.id === currentScreenId);
    if (!current) return;
    const center = this.mapPoint(current.gridX, current.gridY);
    this.addRect(center.x, center.y - 15, 8, 8, PALETTE.terminalCyan);
    this.addRect(center.x, center.y - 15, 4, 4, PALETTE.black);
    this.addText(center.x, center.y - 27, "YOU", 5, PALETTE.terminalCyan);
  }

  private addLegend() {
    const y = 192;
    this.drawIcon("document", 38, y);
    this.addText(67, y + 1, "DOC", 5, PALETTE.black);
    this.drawIcon("stamp", 91, y);
    this.addText(120, y + 1, "STAMP", 5, PALETTE.black);
    this.drawIcon("pen", 149, y);
    this.addText(174, y + 1, "PEN", 5, PALETTE.black);
    this.drawIcon("seal", 198, y);
    this.addText(224, y + 1, "SEAL", 5, PALETTE.black);
  }

  private isLocked(screenId: string, questFlags: Record<string, boolean>) {
    const screen = this.world.screens.find((candidate) => candidate.id === screenId);
    if (!screen) return false;
    return (screen.requiredFlags ?? []).some((flag) => !questFlags[flag]);
  }

  private mapPoint(gridX: number, gridY: number) {
    return {
      x: 32 + gridX * 48,
      y: 62 + gridY * 34
    };
  }

  private drawIcon(icon: MapIcon, x: number, y: number) {
    if (icon === "document") {
      this.addRect(x - 3, y - 5, 8, 7, PALETTE.white);
      this.addRect(x - 5, y - 2, 8, 7, PALETTE.creamPaper);
      this.addRect(x - 3, y, 5, 1, PALETTE.deepRuby);
      return;
    }
    if (icon === "stamp") {
      this.addRect(x - 4, y - 5, 8, 4, PALETTE.goldStamp);
      this.addRect(x - 6, y - 1, 12, 5, PALETTE.deepRuby);
      this.addRect(x - 7, y + 4, 14, 2, PALETTE.black);
      return;
    }
    if (icon === "pen") {
      this.addRect(x - 6, y + 3, 4, 2, PALETTE.goldStamp);
      this.addRect(x - 3, y, 4, 2, PALETTE.deepRuby);
      this.addRect(x, y - 3, 4, 2, PALETTE.buckramHighlight);
      this.addRect(x + 3, y - 5, 3, 2, PALETTE.black);
      return;
    }
    this.addRect(x - 6, y - 5, 12, 10, PALETTE.goldStamp);
    this.addRect(x - 4, y - 3, 8, 6, PALETTE.creamPaper);
    this.addRect(x - 2, y - 1, 4, 2, PALETTE.deepRuby);
  }

  private addRect(x: number, y: number, width: number, height: number, fill: string) {
    const rect = this.scene.add.rectangle(x, y, width, height, color(fill));
    this.container.add(rect);
    return rect;
  }

  private addOutline(x: number, y: number, width: number, height: number, stroke: string) {
    const rect = this.scene.add.rectangle(x, y, width, height).setStrokeStyle(1, color(stroke));
    this.container.add(rect);
    return rect;
  }

  private addText(x: number, y: number, text: string, fontSize: number, fill: string) {
    const label = this.scene.add.text(x, y, text, {
      fontFamily: "monospace",
      fontSize: `${fontSize}px`,
      color: fill,
      align: "center"
    }).setOrigin(0.5);
    this.container.add(label);
    return label;
  }
}
