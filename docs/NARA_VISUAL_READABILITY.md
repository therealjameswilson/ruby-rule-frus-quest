# NARA Walkable Floor Pilot

The optional `GameplayMapScene?map=nara_stacks` formerly combined a detailed
full-map image with translucent generated floor tiles. Hiding the extra grid
alone did not meaningfully separate paths from decorative details.

The pilot draws opaque 16-pixel archive tiles only in completely clear cells.
It retains a full tile of border art and leaves cells touching collision
objects, including a one-pixel silhouette margin, transparent. Original map
art remains underneath. Doors, features, pickups, actors and collision data are
unchanged. Other maps retain their existing rendering.

Tiles use the existing `archiveDungeonNative` registry entry, packed margin and
spacing, and GID conversion. Zero-based floor frames are 0, 1, 2 and 5; accents
are sparse and deterministic. Missing textures or a failed layer build use the
previous renderer. The tilemap is destroyed at scene shutdown.

## Visual Evidence

Before:
![Detailed source art with translucent grid](screenshots/nara-walk-floor-before.png)

After:
![Clearer walking areas with original obstacle art](screenshots/nara-walk-floor-after.png)

Actor positions differ between captures. These are native renderer screenshots,
not edited mockups. Playwright verified physical aisle navigation and a resisted
Pencil hit on Mark I: unchanged enemy HP, readable Folder hint and explore mode.
That focused encounter used the existing debug tool grants, not earned progress.

Fourteen focused tests and production build pass. Browser readiness checks pass
for missing, unequipped and equipped tools. No page errors were observed.

## Remaining Work

The source map's tiny border labels and some decorative wall details remain.
This is a visual pilot, not a replacement for reviewing optional-room layout,
unaided player comprehension or physical-device performance. Compare room
navigation with the main quest before applying this approach to other maps.
