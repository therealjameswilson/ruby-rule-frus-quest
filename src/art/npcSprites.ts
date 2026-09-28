import type Phaser from 'phaser';

// Original transparent single-pose sprites. The measured sole and body center
// keep each figure anchored to the existing NPC position and ground shadow.
const DETAILED_NPCS = {
  elena: {key: 'npc-elena-detailed-v1', path: 'assets/characters/colleagues/elena-v1.png', centerX: 547.5 / 1024, soleY: 1464 / 1536},
  priya: {key: 'npc-priya-detailed-v1', path: 'assets/characters/colleagues/priya-v1.png', centerX: 539.5 / 1024, soleY: 1447 / 1536},
  marcus: {key: 'npc-marcus-detailed-v1', path: 'assets/characters/colleagues/marcus-v1.png', centerX: 514.5 / 1024, soleY: 1467 / 1536}
} as const;

export function detailedNpcSprite(id: string) {
  return id === 'elena' || id === 'priya' || id === 'marcus' ? DETAILED_NPCS[id] : undefined;
}

export function preloadDetailedNpcs(scene: Phaser.Scene, ids: readonly (keyof typeof DETAILED_NPCS)[]) {
  for (const id of ids) {
    const art = DETAILED_NPCS[id];
    if (!scene.textures.exists(art.key)) scene.load.image(art.key, art.path);
  }
}
