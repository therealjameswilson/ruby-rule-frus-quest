import { describe, expect, it } from "vitest";
import {
  awardVolumeAssemblyPiece,
  createGameSaveData,
  gameState,
  getVolumeAssemblyReadout,
  resetGameState,
  restoreGameSaveData,
  setSceneState
} from "../game/state";
import {
  createInitialVolumeAssemblyState,
  earnVolumeAssemblyPiece,
  markVolumeAssemblyCeremonyPlayed,
  normalizeVolumeAssemblyState,
  pieceForDanneVariant,
  volumeAssemblyReadout,
  VOLUME_ASSEMBLY_DANNE_REWARDS,
  VOLUME_ASSEMBLY_PIECES
} from "./volumeAssembly";

const LEGACY_FRAGMENTS = [
  "Front Matter Fragment",
  "Source Note Fragment",
  "Routing Fragment",
  "Referral Fragment",
  "Proof Fragment"
] as const;

describe("volumeAssembly", () => {
  it("starts with five unearned cover-piece slots", () => {
    const readout = volumeAssemblyReadout(createInitialVolumeAssemblyState());

    expect(readout.total).toBe(5);
    expect(readout.earnedCount).toBe(0);
    expect(readout.missingCount).toBe(5);
    expect(readout.complete).toBe(false);
    expect(readout.ceremonyUnlocked).toBe(false);
    expect(readout.pieces.map((piece) => piece.id)).toEqual(VOLUME_ASSEMBLY_PIECES.map((piece) => piece.id));
  });

  it("normalizes old cover-fragment saves into earned assembly pieces", () => {
    const state = normalizeVolumeAssemblyState(null, LEGACY_FRAGMENTS);
    const readout = volumeAssemblyReadout(state);

    expect(readout.earnedPieces).toEqual(["spine", "front_board", "title_plate", "ribbon_marker", "seal_stamp"]);
    expect(readout.complete).toBe(true);
    expect(readout.ceremonyUnlocked).toBe(true);
    expect(readout.pieces.every((piece) => piece.earnedAt === "legacy")).toBe(true);
  });

  it("maps boss-tier DANN-E variants to exactly five cover pieces", () => {
    expect(VOLUME_ASSEMBLY_DANNE_REWARDS).toEqual({
      "danne-mark-i-prototype": "spine",
      "danne-colossus-final-form": "front_board",
      "danne-cloud-form": "title_plate",
      "danne-executive-suit": "ribbon_marker",
      "danne-ascendant": "seal_stamp"
    });
    expect(pieceForDanneVariant("danne-prime-humanoid")).toBeNull();
    expect(pieceForDanneVariant("danne-swarm")).toBeNull();
  });

  it("earns each piece once and unlocks the ceremony only after all five", () => {
    let state = createInitialVolumeAssemblyState();
    for (const piece of VOLUME_ASSEMBLY_PIECES.slice(0, 4)) {
      const result = earnVolumeAssemblyPiece(state, piece.id, `earned:${piece.id}`);
      expect(result.changed).toBe(true);
      state = result.state;
      expect(volumeAssemblyReadout(state).complete).toBe(false);
    }

    const duplicate = earnVolumeAssemblyPiece(state, "spine", "duplicate");
    expect(duplicate.changed).toBe(false);
    expect(volumeAssemblyReadout(duplicate.state).earnedCount).toBe(4);

    const final = earnVolumeAssemblyPiece(duplicate.state, "seal_stamp", "earned:seal_stamp");
    const readout = volumeAssemblyReadout(final.state);
    expect(final.changed).toBe(true);
    expect(readout.complete).toBe(true);
    expect(readout.ceremonyUnlocked).toBe(true);
    expect(readout.lastEarnedPiece).toBe("seal_stamp");
  });

  it("marks the binding ceremony as played without losing earned pieces", () => {
    let state = createInitialVolumeAssemblyState();
    for (const piece of VOLUME_ASSEMBLY_PIECES) {
      state = earnVolumeAssemblyPiece(state, piece.id).state;
    }

    const played = markVolumeAssemblyCeremonyPlayed(state);
    const readout = volumeAssemblyReadout(played);

    expect(readout.complete).toBe(true);
    expect(readout.ceremonyPlayed).toBe(true);
    expect(readout.earnedCount).toBe(5);
  });

  it("persists earned progress through the save/restore boundary", () => {
    resetGameState();
    setSceneState("OfficeScene", "explore", "Testing volume assembly persistence.");

    expect(awardVolumeAssemblyPiece("spine", "test reward").changed).toBe(true);
    expect(awardVolumeAssemblyPiece("front_board", "test reward").changed).toBe(true);
    const saved = createGameSaveData();

    resetGameState();
    expect(getVolumeAssemblyReadout().earnedCount).toBe(0);

    const restoredScene = restoreGameSaveData(saved);
    expect(restoredScene).toBe("OfficeScene");
    expect(gameState.volumeAssembly.earnedPieces).toEqual(["spine", "front_board"]);
    expect(getVolumeAssemblyReadout()).toMatchObject({
      earnedCount: 2,
      total: 5,
      complete: false,
      ceremonyUnlocked: false
    });
  });

  it("sets the global completion flag when the fifth cover piece is earned", () => {
    resetGameState();
    setSceneState("OfficeScene", "explore", "Testing volume assembly completion.");

    for (const piece of VOLUME_ASSEMBLY_PIECES) {
      awardVolumeAssemblyPiece(piece.id, "test reward");
    }

    const readout = getVolumeAssemblyReadout();
    expect(readout.earnedCount).toBe(5);
    expect(readout.complete).toBe(true);
    expect(readout.ceremonyUnlocked).toBe(true);
    expect(gameState.sceneProgress.volumeAssemblyComplete).toBe(1);
  });
});
