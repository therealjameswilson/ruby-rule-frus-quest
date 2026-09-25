import Phaser from 'phaser';

/** Distinct silhouettes identify the four stages before the player reads labels. */
export const LIBRARY_STATION_ART = [
  {name:'finding-aid', bounds:[11,7,505,244]},
  {name:'comparison', bounds:[11,12,501,253]},
  {name:'source-note', bounds:[37,22,475,229]},
  {name:'filing', bounds:[53,19,459,240]}
].map(({name,bounds}) => ({key:`library-station-${name}-v1`,path:`assets/art-pack/library-stations/${name}-v1.webp`,bounds}));

export function preloadLibraryStationArt(scene: Phaser.Scene) {
  for (const asset of LIBRARY_STATION_ART) {
    if (!scene.textures.exists(asset.key)) scene.load.image(asset.key,asset.path);
  }
}

export function libraryStationArt(scene: Phaser.Scene, index: number, x: number, y: number) {
  const asset=LIBRARY_STATION_ART[index];
  if (!asset || !scene.textures.exists(asset.key)) return null;
  const texture=scene.textures.get(asset.key);
  const [left,top,right,bottom]=asset.bounds;
  if (!texture.has('body')) texture.add('body',0,left,top,right-left,bottom-top);
  texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  // Keep every front edge at the existing walkable/collision boundary.
  return scene.add.image(x,y+11,asset.key,'body').setOrigin(.5,1).setScale(46/(right-left));
}
