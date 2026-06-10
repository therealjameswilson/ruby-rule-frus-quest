import type Phaser from "phaser";
import type { CHARACTERS, PROCESS_ROLES } from "./constants";

export type CharacterId = keyof typeof CHARACTERS;
export type ProcessRole = (typeof PROCESS_ROLES)[number];

export type ProposalKind =
  | "mechanical"
  | "evidence_bound"
  | "ambiguous"
  | "classification"
  | "provenance"
  | "publication_status";

export type GameMode = "boot" | "title" | "explore" | "dialog" | "choice" | "pause" | "ending" | "debug";

export interface Position {
  x: number;
  y: number;
}

export interface Interactable {
  id: string;
  label: string;
  x: number;
  y: number;
  radius?: number;
  kind: "npc" | "terminal" | "poster" | "document" | "door" | "manuscript" | "enemy";
  onInteract: () => void;
}

export interface ChoiceOption {
  key: "A" | "B" | "C" | "D";
  label: string;
  value?: string;
}

export interface RouteItem {
  label: string;
  network: "OpenNet" | "ClassNet";
  classification: "unclassified" | "sbu" | "classified" | "codeword";
}

export interface PlayerProfile {
  displayName: string;
  roleId: ProcessRole["id"];
  roleLabel: string;
  ability: string;
  remit: string;
  spriteKey: string;
}

export interface KeyboardMap {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  w: Phaser.Input.Keyboard.Key;
  a: Phaser.Input.Keyboard.Key;
  s: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
  e: Phaser.Input.Keyboard.Key;
  space: Phaser.Input.Keyboard.Key;
  enter: Phaser.Input.Keyboard.Key;
  esc: Phaser.Input.Keyboard.Key;
  m: Phaser.Input.Keyboard.Key;
  n: Phaser.Input.Keyboard.Key;
  r: Phaser.Input.Keyboard.Key;
  f: Phaser.Input.Keyboard.Key;
}
