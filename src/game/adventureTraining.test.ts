import { describe, expect, it } from "vitest";
import { getAdventureTrainingCue } from "./adventureTraining";
import {
  FIRST_HOUR_IMPLEMENTATION_SIGNALS,
  FIRST_HOUR_REFERENCE,
  FIRST_HOUR_TRAINING_DRILLS,
  FIRST_HOUR_TRAINING_SEGMENTS,
  firstHourSegmentForBeat,
  firstHourSegmentForMinute,
  firstHourTrainingCoverageReadout,
  firstHourTrainingDrillForMinute,
  firstHourTrainingDrillsForBeat
} from "./firstHourTraining";

describe("adventure training cue", () => {
  it("encodes a one-hour reference profile without copied expression", () => {
    expect(FIRST_HOUR_REFERENCE.trainingWindowMinutes).toBe(60);
    expect(FIRST_HOUR_REFERENCE.scope).toContain("no copied maps");
    expect(FIRST_HOUR_TRAINING_SEGMENTS).toHaveLength(8);
    expect(FIRST_HOUR_TRAINING_DRILLS).toHaveLength(12);
    expect(firstHourSegmentForMinute(0)).toMatchObject({ id: "orientation" });
    expect(firstHourSegmentForMinute(18)).toMatchObject({ id: "dungeon_entry" });
    expect(firstHourSegmentForMinute(57)).toMatchObject({ id: "reward_return" });
    expect(firstHourSegmentForMinute(900)).toMatchObject({ id: "reward_return" });
    expect(firstHourSegmentForBeat("small_key")).toMatchObject({ id: "key_lock_loop" });
    expect(firstHourSegmentForBeat("standards_pressure")).toMatchObject({ id: "deadline_pressure" });
    expect(firstHourTrainingDrillForMinute(0)).toMatchObject({ id: "start_room_affordance", minutes: [0, 5] });
    expect(firstHourTrainingDrillForMinute(31)).toMatchObject({ id: "tool_reward_use" });
    expect(firstHourTrainingDrillForMinute(59)).toMatchObject({ id: "reward_changes_world" });
    expect(firstHourTrainingDrillsForBeat("small_key").map((drill) => drill.id)).toEqual([
      "local_key_task",
      "key_lock_cadence"
    ]);
  });

  it("reports full one-hour implementation coverage for the active drill", () => {
    const readout = firstHourTrainingCoverageReadout("tool_reward_use");
    expect(readout.trainingWindowMinutes).toBe(60);
    expect(readout.sourceDurationSeconds).toBe(23936);
    expect(readout.trainedSeconds).toBe(3600);
    expect(readout.trainingWindow).toEqual({
      startMinute: 0,
      endMinute: 60,
      coveragePercent: 15
    });
    expect(readout.visualRelic).toMatchObject({
      textureKey: "snes-first-hour-training-relic",
      displayName: "One-Hour Route Relic"
    });
    expect(readout.trainedMinuteMarks).toBe(60);
    expect(readout.activeDrillId).toBe("tool_reward_use");
    expect(readout.activeMinuteRange).toBe("30-35");
    expect(readout.coveredDrills).toBe(FIRST_HOUR_TRAINING_DRILLS.length);
    expect(readout.totalDrills).toBe(FIRST_HOUR_TRAINING_DRILLS.length);
    expect(Object.keys(FIRST_HOUR_IMPLEMENTATION_SIGNALS).sort()).toEqual(
      FIRST_HOUR_TRAINING_DRILLS.map((drill) => drill.id).sort()
    );
    expect(readout.drills.filter((drill) => drill.active)).toHaveLength(1);
    expect(readout.drills.find((drill) => drill.id === "tool_reward_use")).toMatchObject({
      active: true,
      implementationSignal: expect.stringContaining("Citation Stamp")
    });
    expect(readout.drills.every((drill) => drill.implementationSignal.length > 0)).toBe(true);
    expect(readout.minuteMarks).toHaveLength(60);
    expect(readout.minuteMarks[0]).toMatchObject({
      minute: 0,
      minuteLabel: "00:00",
      phase: "orientation",
      drillId: "start_room_affordance",
      primaryBeat: "room_readability",
      cueText: "READ ROOM"
    });
    expect(readout.minuteMarks[31]).toMatchObject({
      minute: 31,
      minuteLabel: "31:00",
      phase: "item_mastery",
      drillId: "tool_reward_use",
      cueText: "NEED TOOL"
    });
    expect(readout.minuteMarks[59]).toMatchObject({
      minute: 59,
      minuteLabel: "59:00",
      phase: "reward_return",
      drillId: "reward_changes_world",
      cueText: "RETURN"
    });
    expect(new Set(readout.minuteMarks.map((mark) => mark.minute)).size).toBe(60);
    expect(readout.minuteMarks.every((mark) => mark.implementationSignal.length > 0)).toBe(true);
  });

  it("prioritizes choice and dialog controls over room traversal", () => {
    expect(getAdventureTrainingCue({
      mode: "choice",
      currentChoice: {
        title: "Which equity responds?",
        options: [
          { key: "A", label: "Defense", value: "defense" },
          { key: "B", label: "State", value: "state" }
        ]
      },
      roomTraversal: roomState()
    })).toMatchObject({
      verb: "CHOOSE",
      text: "CHOOSE A/B",
      sourceBeatId: "room_readability",
      phase: "orientation",
      drillId: "start_room_affordance"
    });

    expect(getAdventureTrainingCue({
      mode: "dialog",
      activeDialog: { speaker: "Archivist", text: "Check the source note." },
      roomTraversal: roomState()
    })).toMatchObject({
      verb: "READ",
      text: "A ADVANCE",
      detail: "Archivist",
      phaseLabel: "Orientation",
      drillLabel: "Start Room"
    });
  });

  it("surfaces the nearest interactable as the immediate action", () => {
    expect(getAdventureTrainingCue({
      mode: "explore",
      nearestInteractable: "Research Table",
      roomTraversal: roomState()
    })).toMatchObject({
      verb: "ACT",
      text: "A RESEARCH TABLE",
      sourceBeatId: "room_readability"
    });
  });

  it("does not double-prefix fallback objectives that already begin with next", () => {
    expect(getAdventureTrainingCue({
      mode: "explore",
      latestMessage: "NEXT Office Hub loaded."
    })).toMatchObject({
      verb: "GOAL",
      text: "NEXT Office Hub loaded.",
      detail: "Office Hub loaded."
    });
  });

  it("points toward the first unvisited exit in adventure direction order", () => {
    expect(getAdventureTrainingCue({
      mode: "explore",
      roomTraversal: roomState()
    })).toMatchObject({
      verb: "EXPLORE",
      text: "GO EXIT E",
      phase: "overworld_loop"
    });
  });

  it("explains locked gates through the required FRUS tool", () => {
    expect(getAdventureTrainingCue({
      mode: "explore",
      roomTraversal: {
        ...roomState(),
        visitedRoomIds: ["A1", "A2", "B1"],
        lockedExits: { north: "Source note lock" },
        requiredItems: { north: "citation_stamp" }
      }
    })).toMatchObject({
      verb: "UNLOCK",
      text: "NEED TOOL: CITE",
      detail: "N gate: Source note lock.",
      sourceBeatId: "visible_gate",
      phase: "item_mastery"
    });
  });

  it("does not mistake process-tool gates for small-key locks", () => {
    expect(getAdventureTrainingCue({
      mode: "explore",
      roomTraversal: {
        ...roomState(),
        visitedRoomIds: ["A1", "A2", "B1"],
        lockedExits: { north: "Source note lock" },
        requiredItems: { north: "citation_stamp" }
      },
      dungeon: {
        displayName: "Archive Cavern",
        smallKeys: 1,
        smallKeysRequired: 2,
        bigKeyHeld: false,
        bossDefeated: false,
        mapRevealed: true
      }
    })).toMatchObject({
      verb: "UNLOCK",
      text: "NEED TOOL: CITE",
      detail: "N gate: Source note lock.",
      sourceBeatId: "visible_gate"
    });
  });

  it("teaches small-key spending for true local chapter locks", () => {
    expect(getAdventureTrainingCue({
      mode: "explore",
      roomTraversal: {
        ...roomState(),
        visitedRoomIds: ["A1", "A2", "B1"],
        lockedExits: { north: "Chapter lock" }
      },
      dungeon: {
        displayName: "Archive Cavern",
        smallKeys: 1,
        smallKeysRequired: 2,
        bigKeyHeld: false,
        bossDefeated: false,
        mapRevealed: true
      }
    })).toMatchObject({
      verb: "KEY",
      text: "USE KEY",
      detail: "N gate can open with a chapter key.",
      phaseLabel: "Key Lock Loop"
    });
  });

  it("turns dungeon progress into first-hour map, boss, and return cues", () => {
    expect(getAdventureTrainingCue({
      mode: "explore",
      roomTraversal: {
        ...roomState(),
        visitedRoomIds: ["A1", "A2", "B1"]
      },
      dungeon: {
        displayName: "Archive Cavern",
        smallKeys: 0,
        smallKeysRequired: 2,
        bigKeyHeld: false,
        bossDefeated: false,
        mapRevealed: false
      }
    })).toMatchObject({ verb: "MAP", text: "FIND MAP" });

    expect(getAdventureTrainingCue({
      mode: "explore",
      roomTraversal: {
        ...roomState(),
        roomType: "boss",
        visitedRoomIds: ["A1", "A2", "B1"]
      },
      dungeon: {
        displayName: "Archive Cavern",
        smallKeys: 0,
        smallKeysRequired: 2,
        bigKeyHeld: true,
        bossDefeated: false,
        mapRevealed: true
      }
    })).toMatchObject({ verb: "BOSS", text: "BOSS GATE" });

    expect(getAdventureTrainingCue({
      mode: "explore",
      roomTraversal: roomState(),
      dungeon: {
        displayName: "Archive Cavern",
        smallKeys: 0,
        smallKeysRequired: 2,
        bigKeyHeld: true,
        bossDefeated: true,
        mapRevealed: true
      }
    })).toMatchObject({ verb: "RETURN", text: "RETURN" });
  });

  it("treats a published Buckram Gate as the one-hour world-change reward", () => {
    expect(getAdventureTrainingCue({
      mode: "ending",
      finalGatePublished: true,
      latestMessage: "PUBLISHED FRUS COVER - HUMAN CERTIFICATION RECORDED",
      roomTraversal: roomState()
    })).toMatchObject({
      verb: "RETURN",
      text: "RETURN",
      detail: "Published FRUS cover changed the world: public record complete.",
      sourceBeatId: "reward_return",
      phase: "reward_return",
      drillId: "reward_changes_world",
      drillMinuteRange: "55-60"
    });
  });
});

function roomState() {
  return {
    currentRoomId: "A1",
    roomTitle: "Source Room",
    visitedRoomIds: ["A1"],
    exits: {
      east: "A2",
      south: "B1"
    }
  } as const;
}
