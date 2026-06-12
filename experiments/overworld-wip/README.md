# Overworld WIP Quarantine

Phase 8 moved incomplete overworld and art-pack work here so the cleanup branch can stay runnable while the ideas remain recoverable.

## Layout

- `untracked-files/`: files that were untracked before quarantine, preserving their original relative paths.
- `tracked-files/`: dirty tracked files copied before restoring the source tree to the Phase 7 branch state.
- `tracked-working-tree.patch.gz`: gzipped binary-capable patch of the dirty tracked changes before restoration.
- `status-before-quarantine.txt`: original `git status --short --branch`.
- `diff-stat-before-quarantine.txt`: original tracked diff summary.

## Notes For Future Promotion

Treat this as reference material, not live game code. Promote one subsystem at a time, preferably in this order:

1. Data definitions that validate without loading new runtime code.
2. Tile registry or tilemap helpers behind fallbacks.
3. `WorldScene` and screen transitions after all existing scene shortcuts still boot.
4. Art-pack swaps only when guarded by `textures.exists()` and local fallbacks.

Do not reintroduce the whole folder at once.
