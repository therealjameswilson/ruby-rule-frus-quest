import type { GameplayMapKey } from "../assets/registry";

export const MAP_OBJECTIVES: Record<GameplayMapKey, string> = {
  historian_office: "Visit the Archive Guide or inspect the FRUS bookshelf.",
  nara_stacks: "TO CATALOG DESK",
  foggy_bottom: "Stay on the sidewalks and enter the Truman Building.",
  west_wing: "Find the Situation Room gate and review room entrances.",
  black_vault: "Approach the obelisk core when the record is ready.",
  frus_floor: "Walk through each FRUS production phase room.",
  embassy: "Enter from the south gate and inspect the chancery door.",
  capitol_hill: "Use the witness table or inspect the closed-session vault."
};
const titles: Record<GameplayMapKey, string> = {"historian_office": "ARCHIVE GUIDE", "nara_stacks": "CATALOG DESK", "foggy_bottom": "TRUMAN BUILDING", "west_wing": "SITUATION ROOM", "black_vault": "PREPARE THE RECORD", "frus_floor": "PRODUCTION ROOMS", "embassy": "CHANCERY DOOR", "capitol_hill": "WITNESS TABLE"};

/** Keep full instructions in game state; summarize only known idle map objectives. */
export function mapQuestTitle(objective: string) {
  const key = (Object.keys(MAP_OBJECTIVES) as GameplayMapKey[]).find(key => MAP_OBJECTIVES[key] === objective);
  return key ? titles[key] : objective;
}
