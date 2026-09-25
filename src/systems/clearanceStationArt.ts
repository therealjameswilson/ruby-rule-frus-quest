import Phaser from 'phaser';
import type { ClassNetVaultStationId } from '../game/classNetVaultReview';

export const CLEARANCE_STATION_ART: Record<ClassNetVaultStationId, { key: string; path: string }> = {
  human_desk: { key: 'clearance-human-review-v1', path: 'assets/art-pack/clearance-stations/human-review-v1.webp' },
  release_board: { key: 'clearance-release-standard-v1', path: 'assets/art-pack/clearance-stations/release-standard-v1.webp' },
  decision_ledger: { key: 'clearance-equity-ledger-v1', path: 'assets/art-pack/clearance-stations/equity-ledger-v1.webp' }
};

export function preloadClearanceStationArt(scene: Phaser.Scene) {
  for (const asset of Object.values(CLEARANCE_STATION_ART)) {
    if (!scene.textures.exists(asset.key)) scene.load.image(asset.key, asset.path);
  }
}

export function clearanceStationArt(scene: Phaser.Scene, station: ClassNetVaultStationId) {
  const asset = CLEARANCE_STATION_ART[station];
  if (!scene.textures.exists(asset.key)) return null;
  const image = scene.add.image(0, -8, asset.key).setName('classnet-research-desk');
  image.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return image.setScale(58 / image.width);
}
