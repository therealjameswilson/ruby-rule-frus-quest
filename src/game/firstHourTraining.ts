export type FirstHourTrainingBeatId =
  | "room_readability"
  | "unvisited_exit"
  | "visible_gate"
  | "small_key"
  | "map_literacy"
  | "boss_gate"
  | "reward_return"
  | "standards_pressure";

export type FirstHourTrainingPhaseId =
  | "orientation"
  | "overworld_loop"
  | "dungeon_entry"
  | "item_mastery"
  | "key_lock_loop"
  | "boss_readiness"
  | "reward_return"
  | "deadline_pressure";

export type FirstHourTrainingDrillId =
  | "start_room_affordance"
  | "edge_route_memory"
  | "blocked_route_tease"
  | "threshold_transition"
  | "map_chip_orientation"
  | "local_key_task"
  | "tool_reward_use"
  | "shortcut_return"
  | "key_lock_cadence"
  | "hazard_readability"
  | "boss_gate_check"
  | "reward_changes_world";

export interface FirstHourTrainingBeat {
  id: FirstHourTrainingBeatId;
  phase: FirstHourTrainingPhaseId;
  sourceLesson: string;
  frusTransfer: string;
  cueText: string;
}

export interface FirstHourTrainingSegment {
  id: FirstHourTrainingPhaseId;
  minutes: readonly [number, number];
  label: string;
  sourcePattern: string;
  frusMechanic: string;
  cuePriority: readonly FirstHourTrainingBeatId[];
}

export interface FirstHourTrainingDrill {
  id: FirstHourTrainingDrillId;
  minutes: readonly [number, number];
  phase: FirstHourTrainingPhaseId;
  label: string;
  primaryBeat: FirstHourTrainingBeatId;
  sourcePattern: string;
  frusTrainingObjective: string;
  acceptanceSignal: string;
}

export interface FirstHourTrainingCoverageEntry {
  id: FirstHourTrainingDrillId;
  minutes: readonly [number, number];
  minuteRange: string;
  phase: FirstHourTrainingPhaseId;
  label: string;
  primaryBeat: FirstHourTrainingBeatId;
  frusTrainingObjective: string;
  acceptanceSignal: string;
  implementationSignal: string;
  active: boolean;
}

export interface FirstHourTrainingMinuteMark {
  minute: number;
  minuteLabel: string;
  phase: FirstHourTrainingPhaseId;
  phaseLabel: string;
  drillId: FirstHourTrainingDrillId;
  drillLabel: string;
  primaryBeat: FirstHourTrainingBeatId;
  cueText: string;
  frusTrainingObjective: string;
  implementationSignal: string;
}

export interface FirstHourTrainingCoverageReadout {
  sourceTitle: string;
  sourceUrl: string;
  scope: string;
  sourceDurationSeconds: number;
  trainedSeconds: number;
  trainingWindow: {
    startMinute: number;
    endMinute: number;
    coveragePercent: number;
  };
  trainingWindowMinutes: number;
  visualRelic: {
    textureKey: "snes-first-hour-training-relic";
    displayName: "One-Hour Route Relic";
    mapCue: string;
  };
  trainedMinuteMarks: number;
  activeDrillId: FirstHourTrainingDrillId;
  activeMinuteRange: string;
  coveredDrills: number;
  totalDrills: number;
  drills: readonly FirstHourTrainingCoverageEntry[];
  minuteMarks: readonly FirstHourTrainingMinuteMark[];
}

export const FIRST_HOUR_REFERENCE = {
  sourceTitle: "Legend of Zelda A LINK TO THE PAST Full Game Walkthrough - No Commentary (A Link to the Past Full)",
  sourceUrl: "https://www.youtube.com/watch?v=Dq_gUziNZUk",
  scope: "First-hour gameplay grammar only; no copied maps, sprites, music, puzzles, text, names, or room layouts.",
  sourceDurationSeconds: 23936,
  trainingStartMinute: 0,
  trainingWindowMinutes: 60,
  trainedSeconds: 3600
} as const;

export const FIRST_HOUR_TRAINING_VISUAL_RELIC = {
  textureKey: "snes-first-hour-training-relic",
  displayName: "One-Hour Route Relic",
  mapCue: "Office Hub wall prop beside the FRUS Path board; proves the one-hour grammar as a visible SNES relic."
} as const;

export const FIRST_HOUR_TRAINING_SEGMENTS: readonly FirstHourTrainingSegment[] = [
  {
    id: "orientation",
    minutes: [0, 8],
    label: "Orientation",
    sourcePattern: "The opening teaches movement, readable exits, and safe interaction before demanding mastery.",
    frusMechanic: "Start with obvious desks, doors, and source-note objects before abstract production goals.",
    cuePriority: ["room_readability", "unvisited_exit"]
  },
  {
    id: "overworld_loop",
    minutes: [8, 18],
    label: "Overworld Loop",
    sourcePattern: "The player moves between connected screens, learns landmarks, and sees blocked routes early.",
    frusMechanic: "FRUS regions should expose future process gates while offering at least one open route.",
    cuePriority: ["unvisited_exit", "visible_gate"]
  },
  {
    id: "dungeon_entry",
    minutes: [18, 28],
    label: "Dungeon Entry",
    sourcePattern: "The first dungeon establishes a room-by-room grammar: map, locked door, reward, return path.",
    frusMechanic: "Archive chapters should teach source-note locks, room maps, and local key spending.",
    cuePriority: ["map_literacy", "small_key", "visible_gate"]
  },
  {
    id: "item_mastery",
    minutes: [28, 38],
    label: "Item Mastery",
    sourcePattern: "New tools immediately solve nearby obstacles so the player understands their verb.",
    frusMechanic: "Citation stamps, red pencils, and clearance tools should open a visible gate right away.",
    cuePriority: ["visible_gate", "reward_return"]
  },
  {
    id: "key_lock_loop",
    minutes: [38, 48],
    label: "Key Lock Loop",
    sourcePattern: "Small rewards rhythmically convert local puzzle completion into local movement progress.",
    frusMechanic: "Document subtasks earn chapter keys that unlock the next citation, referral, or proof room.",
    cuePriority: ["small_key", "unvisited_exit"]
  },
  {
    id: "boss_readiness",
    minutes: [48, 56],
    label: "Boss Readiness",
    sourcePattern: "The final room is readable because the player has learned the tool and the route structure.",
    frusMechanic: "A contested equity or deadline gate should appear only after the player has the stage tool.",
    cuePriority: ["boss_gate", "standards_pressure"]
  },
  {
    id: "reward_return",
    minutes: [56, 60],
    label: "Reward Return",
    sourcePattern: "The area reward points back outward, turning previous blockers into new shortcuts.",
    frusMechanic: "A process stamp should reveal a newly opened FRUS shortcut and the next production area.",
    cuePriority: ["reward_return", "unvisited_exit"]
  },
  {
    id: "deadline_pressure",
    minutes: [45, 60],
    label: "Deadline Pressure",
    sourcePattern: "Late pressure is fair only when the player can read the state, damage, and recovery route.",
    frusMechanic: "Statutory-clock pressure and Kellogg-standard damage should be explicit and recoverable.",
    cuePriority: ["standards_pressure"]
  }
] as const;

export const FIRST_HOUR_TRAINING_DRILLS: readonly FirstHourTrainingDrill[] = [
  {
    id: "start_room_affordance",
    minutes: [0, 5],
    phase: "orientation",
    label: "Start Room",
    primaryBeat: "room_readability",
    sourcePattern: "The opening screen teaches movement, facing, and the first interaction with almost no ambiguity.",
    frusTrainingObjective: "The starting FRUS office should show one obvious desk, one route, and one safe object to inspect.",
    acceptanceSignal: "A new player can name the next verb without reading a paragraph."
  },
  {
    id: "edge_route_memory",
    minutes: [5, 10],
    phase: "orientation",
    label: "Edges",
    primaryBeat: "unvisited_exit",
    sourcePattern: "Screen edges teach that the world is larger than the current room.",
    frusTrainingObjective: "Each early screen should expose a clean cardinal exit and remember visited rooms.",
    acceptanceSignal: "The HUD cue points to an unvisited N/E/S/W exit before generic objectives."
  },
  {
    id: "blocked_route_tease",
    minutes: [10, 15],
    phase: "overworld_loop",
    label: "Tease Gate",
    primaryBeat: "visible_gate",
    sourcePattern: "A visible blocked route teaches future capability before the player owns the item.",
    frusTrainingObjective: "Show the missing FRUS process tool at citation, clearance, referral, edit, or proof gates.",
    acceptanceSignal: "Blocked routes say which tool is missing and why the route matters."
  },
  {
    id: "threshold_transition",
    minutes: [15, 20],
    phase: "dungeon_entry",
    label: "Threshold",
    primaryBeat: "room_readability",
    sourcePattern: "Crossing into a dungeon tightens the room grammar and makes each screen more purposeful.",
    frusTrainingObjective: "Archive interiors should reduce clutter and make source-note locks feel local.",
    acceptanceSignal: "The player sees the difference between overworld exploration and chapter-room routing."
  },
  {
    id: "map_chip_orientation",
    minutes: [20, 25],
    phase: "dungeon_entry",
    label: "Map Chip",
    primaryBeat: "map_literacy",
    sourcePattern: "A compact map turns room-by-room exploration into a learnable plan.",
    frusTrainingObjective: "Room-map chips should reveal contested equities and the shortest route to them.",
    acceptanceSignal: "The map/compass cue appears before the player spends keys blindly."
  },
  {
    id: "local_key_task",
    minutes: [25, 30],
    phase: "dungeon_entry",
    label: "Local Key",
    primaryBeat: "small_key",
    sourcePattern: "A small local task pays off as an immediate local route opening.",
    frusTrainingObjective: "Resolving a source note, citation, or referral subtask should earn a chapter key.",
    acceptanceSignal: "A key is earned and the nearest locked chapter door becomes the obvious next use."
  },
  {
    id: "tool_reward_use",
    minutes: [30, 35],
    phase: "item_mastery",
    label: "Use Reward",
    primaryBeat: "visible_gate",
    sourcePattern: "A new tool is taught by putting its first obstacle close to the reward.",
    frusTrainingObjective: "New stamps, pencils, lenses, and tokens should immediately solve a visible FRUS gate.",
    acceptanceSignal: "The player uses the newly acquired tool within one or two rooms."
  },
  {
    id: "shortcut_return",
    minutes: [35, 40],
    phase: "item_mastery",
    label: "Shortcut",
    primaryBeat: "reward_return",
    sourcePattern: "The reward loop points back toward a changed route instead of leaving the player adrift.",
    frusTrainingObjective: "Process stamps should reveal a shortcut or a newly valid FRUS production route.",
    acceptanceSignal: "The next cue is return/shortcut oriented after the reward."
  },
  {
    id: "key_lock_cadence",
    minutes: [40, 45],
    phase: "key_lock_loop",
    label: "Cadence",
    primaryBeat: "small_key",
    sourcePattern: "Key spending repeats with variation so the player learns the rhythm without boredom.",
    frusTrainingObjective: "Multiple document subtasks should alternate between earning and spending local chapter keys.",
    acceptanceSignal: "The dungeon loop has a visible key count, a lock, and a next room unlocked by the spend."
  },
  {
    id: "hazard_readability",
    minutes: [45, 50],
    phase: "key_lock_loop",
    label: "Hazards",
    primaryBeat: "standards_pressure",
    sourcePattern: "Threats work when their movement and recovery windows are readable.",
    frusTrainingObjective: "Standards damage, deadlines, and bureaucratic blockers should be visible before they punish.",
    acceptanceSignal: "The player can see the hazard state and recover through a valid FRUS action."
  },
  {
    id: "boss_gate_check",
    minutes: [50, 55],
    phase: "boss_readiness",
    label: "Boss Gate",
    primaryBeat: "boss_gate",
    sourcePattern: "The boss gate confirms mastery of the area's route, tool, and key grammar.",
    frusTrainingObjective: "A contested equity or deadline hurdle should require the local big key/stage tool.",
    acceptanceSignal: "The boss-readiness cue only appears once the required tool is held."
  },
  {
    id: "reward_changes_world",
    minutes: [55, 60],
    phase: "reward_return",
    label: "World Change",
    primaryBeat: "reward_return",
    sourcePattern: "The area reward changes the overworld and tells the player where to go next.",
    frusTrainingObjective: "A completed FRUS chapter should open a visible shortcut, process stamp, or next region.",
    acceptanceSignal: "The game state exposes a new route immediately after the reward."
  }
] as const;

export const FIRST_HOUR_TRAINING_BEATS: readonly FirstHourTrainingBeat[] = [
  {
    id: "room_readability",
    phase: "orientation",
    sourceLesson: "A new screen should communicate its main idea as soon as the player enters.",
    frusTransfer: "Every FRUS room needs one visible blocker, reward, workstation, or route choice.",
    cueText: "READ ROOM"
  },
  {
    id: "unvisited_exit",
    phase: "overworld_loop",
    sourceLesson: "Opening play teaches exploration by making the next unopened edge obvious.",
    frusTransfer: "Prefer unvisited room exits before abstract objectives.",
    cueText: "GO EXIT"
  },
  {
    id: "visible_gate",
    phase: "item_mastery",
    sourceLesson: "Locked routes are fair when the missing item is legible at the gate itself.",
    frusTransfer: "Show the missing FRUS process tool on the gate and in the HUD cue.",
    cueText: "NEED TOOL"
  },
  {
    id: "small_key",
    phase: "key_lock_loop",
    sourceLesson: "Small keys turn local puzzle completion into immediate route opening.",
    frusTransfer: "Per-document subtasks should earn and spend local chapter keys.",
    cueText: "USE KEY"
  },
  {
    id: "map_literacy",
    phase: "dungeon_entry",
    sourceLesson: "A map or compass turns hidden structure into a readable dungeon plan.",
    frusTransfer: "Reveal contested-equity locations and show the room map chip.",
    cueText: "FIND MAP"
  },
  {
    id: "boss_gate",
    phase: "boss_readiness",
    sourceLesson: "A boss gate is a clear final test after the area reward loop is understood.",
    frusTransfer: "A chapter's hardest review hurdle should require the stage-gate tool.",
    cueText: "BOSS GATE"
  },
  {
    id: "reward_return",
    phase: "reward_return",
    sourceLesson: "Major rewards point the player back to the overworld with new shortcuts open.",
    frusTransfer: "After a process stamp or tool, route the player toward newly opened workflow shortcuts.",
    cueText: "RETURN"
  },
  {
    id: "standards_pressure",
    phase: "deadline_pressure",
    sourceLesson: "Late pressure works when the player can read phases and recover from mistakes.",
    frusTransfer: "The statutory clock and Kellogg-standard damage should be explicit, not surprise failures.",
    cueText: "CHECK RULE"
  }
] as const;

export const FIRST_HOUR_IMPLEMENTATION_SIGNALS: Record<FirstHourTrainingDrillId, string> = {
  start_room_affordance: "Office Hub route board, tutorial prompt, and nearest-interactable ACT cue.",
  edge_route_memory: "RoomTraversal visited-exit cues and world/map route badges.",
  blocked_route_tease: "Process-tool gate prompts and visible lock glyphs at FRUS exits.",
  threshold_transition: "Ruby route cards and separate gameplay-map/interior scenes.",
  map_chip_orientation: "Adventure subscreen room map and contested-equity map literacy cue.",
  local_key_task: "Dungeon small-key state from document subtasks and chapter locks.",
  tool_reward_use: "Citation Stamp, Clearance Token, Concurrence Slip, Red Pencil, Proof Lens gates.",
  shortcut_return: "Reward-return cue after stamps/tools and newly revealed shortcuts.",
  key_lock_cadence: "Per-area small-key counts, locked exits, and chapter-door spend checks.",
  hazard_readability: "Reliability hearts, standards damage labels, DANN-E/statutory-clock pressure.",
  boss_gate_check: "Boss gate appears only with local big key/stage tool and readiness checks.",
  reward_changes_world: "Published FRUS cover, Buckram Gate reward, and opened overworld routes."
} as const;

export function firstHourBeat(id: FirstHourTrainingBeatId): FirstHourTrainingBeat {
  return FIRST_HOUR_TRAINING_BEATS.find((beat) => beat.id === id) ?? FIRST_HOUR_TRAINING_BEATS[0];
}

export function firstHourSegmentForMinute(minute: number): FirstHourTrainingSegment {
  const clampedMinute = Math.max(0, Math.min(FIRST_HOUR_REFERENCE.trainingWindowMinutes - 1, Math.floor(minute)));
  return FIRST_HOUR_TRAINING_SEGMENTS.find((segment) => (
    clampedMinute >= segment.minutes[0] && clampedMinute < segment.minutes[1]
  )) ?? FIRST_HOUR_TRAINING_SEGMENTS[0];
}

export function firstHourTrainingDrillForMinute(minute: number): FirstHourTrainingDrill {
  const clampedMinute = Math.max(0, Math.min(FIRST_HOUR_REFERENCE.trainingWindowMinutes - 1, Math.floor(minute)));
  return FIRST_HOUR_TRAINING_DRILLS.find((drill) => (
    clampedMinute >= drill.minutes[0] && clampedMinute < drill.minutes[1]
  )) ?? FIRST_HOUR_TRAINING_DRILLS[0];
}

export function firstHourTrainingDrillsForBeat(id: FirstHourTrainingBeatId): readonly FirstHourTrainingDrill[] {
  const matches = FIRST_HOUR_TRAINING_DRILLS.filter((drill) => drill.primaryBeat === id);
  return matches.length > 0 ? matches : [FIRST_HOUR_TRAINING_DRILLS[0]];
}

export function firstHourTrainingDrillForBeat(id: FirstHourTrainingBeatId): FirstHourTrainingDrill {
  return firstHourTrainingDrillsForBeat(id)[0];
}

export function firstHourSegmentForBeat(id: FirstHourTrainingBeatId): FirstHourTrainingSegment {
  const beat = firstHourBeat(id);
  return FIRST_HOUR_TRAINING_SEGMENTS.find((segment) => segment.id === beat.phase) ?? FIRST_HOUR_TRAINING_SEGMENTS[0];
}

export function firstHourTrainingCoverageReadout(
  activeDrillId: FirstHourTrainingDrillId = FIRST_HOUR_TRAINING_DRILLS[0].id
): FirstHourTrainingCoverageReadout {
  const safeActiveDrill = FIRST_HOUR_TRAINING_DRILLS.find((drill) => drill.id === activeDrillId)
    ?? FIRST_HOUR_TRAINING_DRILLS[0];
  const drills = FIRST_HOUR_TRAINING_DRILLS.map((drill) => ({
    id: drill.id,
    minutes: drill.minutes,
    minuteRange: `${drill.minutes[0]}-${drill.minutes[1]}`,
    phase: drill.phase,
    label: drill.label,
    primaryBeat: drill.primaryBeat,
    frusTrainingObjective: drill.frusTrainingObjective,
    acceptanceSignal: drill.acceptanceSignal,
    implementationSignal: FIRST_HOUR_IMPLEMENTATION_SIGNALS[drill.id],
    active: drill.id === safeActiveDrill.id
  }));
  const minuteMarks = Array.from({ length: FIRST_HOUR_REFERENCE.trainingWindowMinutes }, (_, minute) => {
    const drill = firstHourTrainingDrillForMinute(minute);
    const segment = firstHourSegmentForMinute(minute);
    const beat = firstHourBeat(drill.primaryBeat);
    return {
      minute,
      minuteLabel: `${String(minute).padStart(2, "0")}:00`,
      phase: segment.id,
      phaseLabel: segment.label,
      drillId: drill.id,
      drillLabel: drill.label,
      primaryBeat: drill.primaryBeat,
      cueText: beat.cueText,
      frusTrainingObjective: drill.frusTrainingObjective,
      implementationSignal: FIRST_HOUR_IMPLEMENTATION_SIGNALS[drill.id]
    };
  });
  return {
    sourceTitle: FIRST_HOUR_REFERENCE.sourceTitle,
    sourceUrl: FIRST_HOUR_REFERENCE.sourceUrl,
    scope: FIRST_HOUR_REFERENCE.scope,
    sourceDurationSeconds: FIRST_HOUR_REFERENCE.sourceDurationSeconds,
    trainedSeconds: FIRST_HOUR_REFERENCE.trainedSeconds,
    trainingWindow: {
      startMinute: FIRST_HOUR_REFERENCE.trainingStartMinute,
      endMinute: FIRST_HOUR_REFERENCE.trainingStartMinute + FIRST_HOUR_REFERENCE.trainingWindowMinutes,
      coveragePercent: Math.round((FIRST_HOUR_REFERENCE.trainedSeconds / FIRST_HOUR_REFERENCE.sourceDurationSeconds) * 1000) / 10
    },
    trainingWindowMinutes: FIRST_HOUR_REFERENCE.trainingWindowMinutes,
    visualRelic: { ...FIRST_HOUR_TRAINING_VISUAL_RELIC },
    trainedMinuteMarks: minuteMarks.length,
    activeDrillId: safeActiveDrill.id,
    activeMinuteRange: `${safeActiveDrill.minutes[0]}-${safeActiveDrill.minutes[1]}`,
    coveredDrills: drills.filter((drill) => drill.implementationSignal.length > 0).length,
    totalDrills: FIRST_HOUR_TRAINING_DRILLS.length,
    drills,
    minuteMarks
  };
}
