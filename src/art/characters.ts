import type Phaser from "phaser";

export const CHARACTER_FRAME = { width: 32, height: 48 } as const;

export const CHARACTERS = {
  compiler: "assets/art-pack/sprites/native/sprite_compiler.png",
  editor: "assets/art-pack/sprites/native/sprite_editor.png",
  declassification_coordinator: "assets/art-pack/sprites/native/sprite_declassification_coordinator.png",
  reviewer: "assets/art-pack/sprites/native/sprite_reviewer.png",
  senior_reviewer: "assets/art-pack/sprites/native/sprite_senior_reviewer.png",
  general_editor: "assets/art-pack/sprites/native/sprite_general_editor.png",
  archivist: "assets/art-pack/sprites/native/sprite_archivist.png",
  records_officer: "assets/art-pack/sprites/native/sprite_records_officer.png",
  security_officer: "assets/art-pack/sprites/native/sprite_security_officer.png",
  statechat_terminal: "assets/art-pack/sprites/native/sprite_statechat_terminal.png"
} as const;

export type CharacterKey = keyof typeof CHARACTERS;

export const CHARACTER_KEYS = Object.keys(CHARACTERS) as CharacterKey[];

export function getCharacterKeyForProcessRole(roleId: string): CharacterKey {
  if (roleId === "compiler") return "compiler";
  if (roleId === "editor") return "editor";
  if (roleId === "declass_reviewer") return "declassification_coordinator";
  if (roleId === "source_note_specialist") return "records_officer";
  return "reviewer";
}

export function getCharacterKeyForNpcId(npcId: string): CharacterKey {
  if (npcId === "elena") return "compiler";
  if (npcId === "marcus") return "declassification_coordinator";
  if (npcId === "priya") return "general_editor";
  if (npcId === "archive-colleague") return "archivist";
  return "reviewer";
}

export function getCharacterKeyForProductionColleague(colleagueId: string): CharacterKey {
  if (colleagueId === "compiler") return "compiler";
  if (colleagueId === "editor") return "editor";
  if (colleagueId === "declass_coordinator") return "declassification_coordinator";
  if (colleagueId === "review_specialist") return "senior_reviewer";
  return "reviewer";
}

export function preloadCharacters(scene: Phaser.Scene) {
  for (const key of CHARACTER_KEYS) {
    scene.load.spritesheet(key, CHARACTERS[key], {
      frameWidth: CHARACTER_FRAME.width,
      frameHeight: CHARACTER_FRAME.height
    });
  }
}

export function logLoadedCharacterTextureSizes(scene: Phaser.Scene) {
  for (const key of CHARACTER_KEYS) {
    if (!scene.textures.exists(key)) {
      console.warn(`[16bit-sprites] ${key}: texture missing`);
      continue;
    }
    const texture = scene.textures.get(key);
    const source = texture.getSourceImage() as { width?: number; height?: number };
    console.log(
      `[16bit-sprites] ${key}: source ${source.width ?? "?"}x${source.height ?? "?"}; frame ${CHARACTER_FRAME.width}x${CHARACTER_FRAME.height}; path ${CHARACTERS[key]}`
    );
  }
}
