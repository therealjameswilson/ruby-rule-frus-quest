import Phaser from 'phaser';

export const SUPPORTING_SPRITES = {
  archivist: {key:'archive-guide-detailed-v2',path:'assets/presentation/consistency/archivist-v2.webp',bounds:[294,91,432,1347],height:40},
  'snes-hac-member': {key:'snes-hac-member',path:'assets/presentation/consistency/hac-v2.webp',bounds:[260,13,498,1488],height:32},
  'snes-federal-shutdown': {key:'snes-federal-shutdown',path:'assets/presentation/consistency/shutdown-v2.webp',bounds:[214,143,858,1024],height:30},
  'snes-frus-bees': {key:'snes-frus-bees',path:'assets/presentation/consistency/bees-v2.webp',bounds:[93,64,1097,1094],height:27},
  'snes-navy-hill-mice': {key:'snes-navy-hill-mice',path:'assets/presentation/consistency/mice-v2.webp',bounds:[109,208,1083,823],height:22}
} as const;

export function supportingSprite(scene: Phaser.Scene, id: keyof typeof SUPPORTING_SPRITES, x: number, y: number) {
  const art=SUPPORTING_SPRITES[id]; const t=scene.textures.get(art.key);
  if(!t.has('figure'))t.add('figure',0,art.bounds[0],art.bounds[1],art.bounds[2],art.bounds[3]);
  t.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return scene.add.sprite(x,y,art.key,'figure').setScale(art.height/art.bounds[3]);
}

export const MARINE_GUARD_ART={key:'marine-guard-detailed-v2',path:'assets/presentation/consistency/marine-guard-v2.webp'};
