import type Phaser from "phaser";

export const CHARACTER_FRAME = { width: 32, height: 48 } as const;

// Art-pack 32x48 sprites use a pixel-aligned vertical origin near 0.9, so the
// origin point sits 90% of the way down the sprite and the feet are only
// height*(1-origin) = 48*0.1 ≈ 5px below the container/world origin. The ground
// shadow must sit at the feet; placing it at height*(origin-0.5)=19 pushes it
// ~14px below the feet, leaving a standalone black oval drifting beneath the
// sprite (the orphan-oval defect near the JR desk). Exported so the Player and
// every DanneNpc share one source of truth and cannot drift apart.
export const ART_PACK_SPRITE_ORIGIN_Y = Math.round(CHARACTER_FRAME.height * 0.9) / CHARACTER_FRAME.height;
export const ART_PACK_FOOT_OFFSET_Y = Math.round(
  CHARACTER_FRAME.height * (1 - ART_PACK_SPRITE_ORIGIN_Y)
);
export const ART_PACK_LABEL_OFFSET_Y = ART_PACK_FOOT_OFFSET_Y + 3;

export const BASE_CHARACTERS = {
  compiler: "assets/art-pack/sprites/native/sprite_compiler.png",
  editor: "assets/art-pack/sprites/native/sprite_editor.png",
  declassification_coordinator: "assets/art-pack/sprites/refreshed/sprite_declassification_coordinator.png",
  reviewer: "assets/art-pack/sprites/refreshed/sprite_reviewer.png",
  senior_reviewer: "assets/art-pack/sprites/native/sprite_senior_reviewer.png",
  general_editor: "assets/art-pack/sprites/refreshed/sprite_general_editor.png",
  archivist: "assets/art-pack/sprites/refreshed/sprite_archivist.png",
  records_officer: "assets/art-pack/sprites/native/sprite_records_officer.png",
  security_officer: "assets/art-pack/sprites/native/sprite_security_officer.png",
  statechat_terminal: "assets/art-pack/sprites/native/sprite_statechat_terminal.png"
} as const;

export const VETERAN_CHARACTERS = {
  compiler_veteran: "assets/art-pack/sprites/refreshed/sprite_compiler_veteran.png",
  editor_veteran: "assets/art-pack/ng-plus/native/sprite_editor_veteran.png",
  declassification_coordinator_veteran: "assets/art-pack/ng-plus/native/sprite_declass_reviewer_veteran.png",
  reviewer_veteran: "assets/art-pack/ng-plus/native/sprite_proofreader_veteran.png",
  records_officer_veteran: "assets/art-pack/ng-plus/native/sprite_source_note_specialist_veteran.png"
} as const;

export const COMPILER_APPEARANCES = [
  { key: "compiler", label: "CLASSIC" },
  { key: "compiler_ada", label: "TEAL CURLS" },
  { key: "compiler_clara", label: "SILVER BOB" },
  { key: "compiler_maya", label: "OCHRE BUN" },
  { key: "compiler_robin", label: "MOSS SCARF" },
  { key: "compiler_quinn", label: "NAVY VEST" }
] as const;

export const EXTRA_COMPILERS = {
  compiler_ada: "assets/characters/compilers/compiler_ada.png",
  compiler_clara: "assets/characters/compilers/compiler_clara.png",
  compiler_maya: "assets/characters/compilers/compiler_maya.png",
  compiler_robin: "assets/characters/compilers/compiler_robin.png",
  compiler_quinn: "assets/characters/compilers/compiler_quinn.png"
} as const;

export const HERO_CHARACTERS = {
  compiler_hd: "assets/characters/compilers/hd/compiler.png",
  compiler_ada_hd: "assets/characters/compilers/hd/compiler_ada.png",
  compiler_clara_hd: "assets/characters/compilers/hd/compiler_clara.png",
  compiler_maya_hd: "assets/characters/compilers/hd/compiler_maya.png",
  compiler_robin_hd: "assets/characters/compilers/hd/compiler_robin.png",
  compiler_quinn_hd: "assets/characters/compilers/hd/compiler_quinn.png"
} as const;

export function heroCharacterKey(key: CharacterKey): CharacterKey {
  const candidate = `${key}_hd`;
  return Object.prototype.hasOwnProperty.call(HERO_CHARACTERS, candidate) ? candidate as CharacterKey : key;
}

export function characterTextureDensity(key: CharacterKey | null) {
  return key?.endsWith("_hd") ? 3 : 1;
}

export const CHARACTERS = {
  ...HERO_CHARACTERS,
  ...EXTRA_COMPILERS,
  ...BASE_CHARACTERS,
  ...VETERAN_CHARACTERS
} as const;

export type CharacterKey = keyof typeof CHARACTERS;

export const CHARACTER_KEYS = Object.keys(CHARACTERS) as CharacterKey[];

export function getCharacterKeyForProcessRole(roleId: string, veteran = false, appearance?: string): CharacterKey {
  if (roleId === "compiler" && appearance && Object.prototype.hasOwnProperty.call(EXTRA_COMPILERS, appearance)) return appearance as CharacterKey;
  if (veteran) {
    if (roleId === "compiler") return "compiler_veteran";
    if (roleId === "editor") return "editor_veteran";
    if (roleId === "declass_reviewer") return "declassification_coordinator_veteran";
    if (roleId === "source_note_specialist") return "records_officer_veteran";
    return "reviewer_veteran";
  }
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
      frameWidth: CHARACTER_FRAME.width * characterTextureDensity(key),
      frameHeight: CHARACTER_FRAME.height * characterTextureDensity(key)
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
