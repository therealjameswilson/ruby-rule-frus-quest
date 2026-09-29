# Combat artwork loading boundary

Moved DANNE_BOSS_HD from BootScene into the existing recoverable PlayerArtLoadScene boundary through preloadCombatEffects/gameplayArtReady. The 691,882-byte sheet stays absent during menus and the introduction; gameplay waits until it is ready. Existing animation registration runs after load. Original artwork, frames and game rules unchanged.

Cold local startup resource bodies: 7,487,502 bytes, versus 8,179,333 before this change and 11,519,030 before both loading passes. This shifts download timing; it does not reduce total full-campaign asset size or prove internet/device latency.

286 source files / 2,129 tests pass; TypeScript and fresh production build pass. Six direct-entry fixtures verify 16 frames at 128×192, all four form animations and one request: Guide, Archive, Network, Referral Vault, Silent Read and Black Vault. These are loading fixtures, not earned campaign progress or all-form battle tests. Network abort fixture keeps Guide closed and recovers via retry. A transient boot-overlay fade in the first screenshot was addressed by waiting for its hidden state before inspection, not by changing game behavior.

Fresh touch-only opening through counter coaching, save/reload and earned Archive entry passes, errors empty. Standard client state inspected (its known black canvas output persists); compositor Guide, Black Vault and retry screenshots inspected. Raw /tmp/frus-demand-boss, /tmp/frus-demand-boss-opening. Build /tmp/frus-demand-boss-build served on 5230.

Local only. Physical hardware, subjective audio quality, novice learning and broad final presentation remain unverified.
