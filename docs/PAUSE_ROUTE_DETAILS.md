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

## Physical Filing and Crossing Replay

An earned carried-packet save was replayed through the table review and filing,
then through both supporting-document pickups and the actual east threshold into
Two Networks. `qa-earned-network.mjs` now requires earned storage and checks the
map stays locked after filing and after the first document, then opens with the
completed packet. It also captures console errors.

The filing capture exposed a stale Office doorway sign: it still read LOCK even
after the carrying restriction ended. Filing now redraws the gates and refreshes
traversal immediately. `qa-file-annotation.mjs` asserts LOCK before filing and
OFFICE afterward, without reloading. The fixed filing capture under
`/private/tmp/frus-packet-gate-filing-fixed/` and successful Network arrival under
`/private/tmp/frus-packet-gate-crossing/` were inspected. Both runs had no captured
page/console errors. Full suite: 224 files / 1,695 tests; build passes with the
existing large-chunk warning. These are scripted keyboard checks, not unaided
player enjoyment or physical-phone evidence.

## Network Routing Gate

The earned touch replay reproduced the opposite mismatch in N1: the physical
vault opened after the fourth delivery, while the map still described a locked
small-key door. Both restoration and the map now use `networkRoutingComplete`,
including the legacy Network stamp. The map identifies a workflow gate and asks
for the routing batch, not an unrelated key.

`qa-earned-network-routing.mjs --mobile` asserts closed before the batch and
after three deliveries, then open after the fourth. The pre-fix run failed the
last assertion (`/private/tmp/frus-network-map-before/`); the fixed run passed
through the physical east crossing, vault reload and resumed movement
(`/private/tmp/frus-network-map-fixed/`). Native completion and phone-shaped
restored-vault captures were inspected, with no captured browser errors. Unit
coverage includes small keys not bypassing routing, completion, save/restore and
legacy stamps. Full suite: 224 files / 1,696 tests; production build passes.

## Carried Vault Docket

The N2 return mismatch is now corrected. A shared carried-docket lookup drives
the existing gameplay check and map restriction. The west gate shows FILE while
a valid docket is held, with the pause route naming its destination desk. Gate
art and traversal refresh on pickup and final filing; the return reopens before
the Clearance Token is collected. Invalid/empty docket orders do not lock it.

The earned `qa-earned-clearance.mjs` replay now checks the initial SPLIT sign,
FILE plus the map restriction after pickup, and the restored SPLIT sign after
review without leaving the room. It passed through rejected missing chronology,
correction, token pickup, Referral arrival and reload. Native locked and reopened
captures under `/private/tmp/frus-vault-return-fixed/` were inspected. No browser
errors were captured. Unit tests cover all docket orders, invalid/empty orders,
and persistence. Full suite: 225 files / 1,698 tests; production build passes
with the existing chunk warning. This did not add a new gameplay restriction or
change save schemas. It remains scripted browser evidence, not physical-phone QA.
