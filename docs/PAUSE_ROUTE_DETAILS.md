# Pause Route Details

The chapter map previously showed room codes and red X marks without explaining
the destination or requirement. On the current chapter, select the current-room
line (the chevron) or confirm to inspect routes. This uses the existing pause
overlay, not a new scene or a travel shortcut.

- Each page names one direction and destination, then shows OPEN or LOCKED.
- Locked explanations come from the same live room-graph readout as the map.
- Left/right or the existing arrow buttons cycle routes. Back restores the map;
  a second back resumes gameplay with the normal input-swallow behavior.
- Destinations not yet revealed are omitted, preserving hidden-room discoveries.
- Other chapters retain their existing confirm-to-cycle behavior. The overview
  location line is bounded; the detail page wraps the full room title.

## Evidence

`tools/qa-pause-routes.mjs` now starts from an earned Source Entry save in an isolated
375x667, DPR3 Chrome context. It checks touch selection, the actual north-source
gate explanation, the open west route, keyboard opening, back navigation and
unchanged player position/reliability/swing ID after closing. Native overview,
locked and open captures under `/private/tmp/frus-route-gate-earned/` were inspected.
No browser errors were captured. An initial immediate post-key assertion ran
before the game processed input; the corrected check waits for actual menu state.

Unit tests exercise the real overlay with current gate updates and hidden-room
exclusion. The standard browser movement client also ran; its native Archive
capture was inspected. This verifies the mechanics and layout, not whether a
first-time player will discover the chevron without help. Physical-phone and
unaided-player checks remain outstanding. No save or progression schema changed.

## Route Truthfulness Follow-up

Inspection found the old map used tool ownership for the east Network gate while
Archive gameplay also required the complete source packet and research reviews.
Both now share `archiveSourceRoomExitReady`; the map restores the same document
evidence used on scene entry. The carrying-notes restriction also appears on
the map and gate artwork, including the otherwise unlocked Office return. The
north stacks route remains available for completing the packet.

The earlier harness mistakenly treated a Playwright storage-state object as
flat localStorage and therefore tested a fresh debug room, not its claimed earned
save. It now uses `storageState`, enters through normal TapToStart, and asserts
the earned Citation Stamp is present before testing the locked east exit.
The updated browser check passed, including a readable packet explanation.
Unit coverage checks incomplete reviews, completion evidence without a cached
flag, save/restore, and carried notes. The full suite passes 224 files / 1,694
tests; build passes with the existing large-chunk warning. This is not a new
physical traversal of every room-graph edge or a deployment.
