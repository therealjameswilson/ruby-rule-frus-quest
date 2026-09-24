/** High-detail combat forms retain the legacy 32x48 logical frame. */
export const DANNE_BOSS_HD = {
  key: "danne-boss-combat-hd",
  path: "assets/art-pack/danne-pack/sprites/runtime/danne-boss-forms-v2.png",
  frameW: 128,
  frameH: 192,
  density: 4
} as const;

export const DANNE_BOSS_FORM_FRAMES = {
  colossus: [0, 1, 2, 3],
  swarm: [4, 5, 6, 7],
  cloud: [8, 9, 10, 11],
  ascendant: [12, 13, 14, 15]
} as const;

export function danneBossFormAnimation(phase: string) {
  const form = phase in DANNE_BOSS_FORM_FRAMES ? phase : "colossus";
  return `${DANNE_BOSS_HD.key}-${form}`;
}
