# Startup Asset Loading

## Measured Change (2026-09-13)

A fresh isolated Chrome context on the local Vite server recorded resource
timings through the first opening scene. The initial 150-entry timing buffer
filled with development modules, so the usable measurements increased it to
10,000 entries before navigation. Counting only `/assets/` response bodies:

| Opening asset payload | Bytes |
| --- | ---: |
| Before | 78,776,811 |
| After map/reference deferral | 50,593,301 |
| After portrait deferral | 21,089,433 |
| Total deferred | 57,687,378 (73.2%) |

The two raw records under `/private/tmp/frus-startup-{before,after}/result.json`
also include the 21,793-byte development registry module; the table excludes
that module. Local elapsed times were about 1.07 and 0.96 seconds, but these
single localhost samples are not a mobile-network speed benchmark.

The portrait follow-up is `/private/tmp/frus-startup-portraits-after/result.json`.
Its raw total also includes the development registry module; the table excludes
it. This additional change defers 29,503,868 bytes. Its 0.89-second localhost
sample likewise does not establish real-device or mobile-network performance.

## Ownership

- Boot loads shared DANN-E images and live runtime character sheets.
- The final-boss speaker portrait is room-owned: Black Vault preloads it with
  variant stills, and the gallery retains it in its full collection. Ordinary
  rooms and the title do not request it. Cached return visits skip the load.
- NPC portraits and variant stills are not shared startup images. The field
  guide loads only unlocked portraits on demand, with cached returns making
  no additional requests. Black Vault loads all variant stills before its fight.
- The field guide captures return state and pauses its parent in `init`, before
  preload. Its loading screen hides gameplay controls; closing restores play
  without consuming a combat window or forwarding the closing press.
- Each expansion scene loads its own map painting, using its existing preload
  hook and texture-existence guard. It no longer requests all five maps.
- DanneGallery loads the full map and original sprite-sheet collection through
  its existing preload. Original assets and keys are unchanged.
- Animation registration already skips absent reference textures. Runtime
  actors retain their frames, and the global nearest-filter guard covers late
  texture additions.

No image was resized, recompressed, removed or replaced. No movement, collision,
save schema, rewards or progression gates changed.

## Verification

`tools/qa-danne-demand-loading.mjs` uses independent browser contexts for the
title, Office, all five expansion scenes, and the gallery. It asserts that only
the requested map exists outside the gallery, reference sheets exist only in
the gallery, and all runtime actor sheets retain at least 16 frames. All eight
routes passed without captured page/console errors. Native screenshots under
`/private/tmp/frus-danne-demand-loading/` were inspected. The standard NARA
movement/render client also ran and its native capture was inspected.

Portrait follow-up: all eight routes passed again under
`/private/tmp/frus-demand-portraits/`, including assertions for variant/portrait
ownership. `/private/tmp/frus-codex-slow-final/` delays each portrait request two
seconds and verifies frozen drone tells, no closing swing/hit and a successful
dodge after resuming. The native loading screen was inspected. The earned-touch
boss opening under `/private/tmp/frus-deferred-boss/` reaches Swarm after three
bolt returns, without browser errors; its phase artwork was inspected. This is
a partial encounter regression, not a new full-fight or unaided-player proof.

Unit tests exercise actual NARA and field-guide preload, pause ordering and
cached returns. The complete suite passes: 223 files / 1,689 tests. Production
build retains the existing large-JS-chunk warning. This is local verification,
not a public deployment.

## Remaining Cost

The latest title-route measurement is 23,421,609 bytes, notably item cards and
large UI/VFX sheets. Further demand loading must account for codex, inventory,
and cutscene consumers so those do not flash missing art or pause unexpectedly.
This change is a measured reduction, not a claim that mobile loading is solved.

## Boss Speaker Follow-up (2026-09-13)

Fresh isolated contexts on the current worktree measured TitleScene at
28,018,006 bytes before and 26,515,841 after; OfficeScene fell from 27,517,255
to 26,015,090. The exact saving is 1,502,165 bytes per ordinary route.
Black Vault and gallery totals are unchanged: they still load the portrait.
These current route measurements supersede the older opening payload as an
estimate of current cost, but use a different endpoint and newer assets.

Raw records and native captures: `/private/tmp/frus-boss-portrait-{before,after}/`.
All eight routes passed texture ownership and browser-error checks. Actual
boss dialogue rendered the robot portrait in an earned-checkpoint touch run
under `/private/tmp/frus-demand-boss-speaker/`; this was a portrait-loading
regression, not a completed fight. Standard NARA gameplay was also captured
and inspected. No artwork was resized or removed, and no public deployment
was performed.

## Boss HUD Follow-up (2026-09-13)

The boss health-bar source sheet is now owned by Black Vault, with an explicit
preload for other expansion rooms when `?debug=ui` is enabled. Gallery ownership
and texture keys are unchanged. Scroll artwork remains available at startup;
the subsequent letterbox follow-up below gives cutscene bars room ownership.
Cached room returns skip the boss HUD request.

Fresh title loads fell from 26,515,841 to 25,018,658 asset bytes; Office fell from
26,015,090 to 24,517,907. Each ordinary route saves 1,497,183 bytes. Black Vault
and gallery totals are unchanged. These are response-body measurements, not
physical-phone load-time benchmarks.

Before/after records: `/private/tmp/frus-boss-ui-{before,after}/result.json`.
The final demand-loading run also presses the actual X UI-debug control in NARA
and checks the generated HUD slice. Its native screenshot and title capture
were inspected. All eight ordinary routes and the UI-debug route report no
browser errors. Full suite: 230 files / 1,732 tests; build passes with the existing
large-chunk warning. No asset resizing or public deployment.

## Letterbox Follow-up (2026-09-13)

Only Black Vault and the explicit expansion UI-debug view consume the cutscene
bars. They now preload the original sheet alongside the boss HUD; the gallery
retains it, and cached returns skip loading. No texture keys or images changed.

Fresh title asset response bodies fell from25,018,658 to23,421,609 bytes;
Office fell from24,517,907 to22,920,858. Each ordinary route saves1,597,049
bytes. Black Vault (50,924,828) and gallery (85,204,633) are unchanged.
These local response-body measurements are not phone network timing results.

Raw eight-route comparisons: /private/tmp/frus-letterbox-{before,after}/.
The debug check also verifies both generated letterbox slices. Actual earned
touch boss introduction and Colossus dialogue rendered correctly under
/private/tmp/frus-letterbox-boss/; this was a partial fight loading regression,
not another complete encounter. Standard NARA gameplay capture was inspected.
All1,747 tests and production build pass, with the existing chunk warning.
No public deployment.

## Per-file Startup Audit (2026-09-13)

The demand-loading harness now records every asset request's encoded response
bytes, sorted largest first, rather than only a total. Current evidence is
`/private/tmp/frus-startup-breakdown/result.json`; all eight routes and the
UI-debug check passed. Title assets total23,421,609 bytes.

| Startup asset | Bytes | Current consumer / deferral constraint |
| --- | ---: | --- |
| Treaty Fragments card | 2,810,196 | Inventory locked/acquired slots, item detail, expansion pickups |
| Ego bolt sheet | 2,706,752 | Guide, roaming DANN-E, regular enemies and boss |
| Ruby Pen card | 2,517,125 | Inventory locked/acquired slots, item detail, garden reward |
| Declass Key card | 2,407,399 | Inventory locked/acquired slots and detail |
| UI kit | 2,355,543 | Shared UI framing |
| HUD sheet | 2,261,255 | Live HUD |
| Scroll corners | 1,950,293 | Shared dialogue |
| Six-volume shelf | 1,787,125 | Pause records shelf card |
| Stamp effects | 1,641,633 | Shared feedback effects |

The three item cards total7,734,720 bytes (33.0% of title asset bodies).
`InventoryMenu.renderTools` requests their thumbnails even while unacquired;
`renderToolDetail` also uses them. Therefore removing them from Boot alone
would silently lose inventory art, including on a restored save. The next
deferral should explicitly pause gameplay during inventory asset loading,
preserve pending attacks/input swallowing, keep menu navigation usable, and
test cold saved-game inventory plus field-guide and expansion consumers.
The shelf card could share that same menu-owned loading boundary.

Do not prioritize the completed-volume hero and binding animation: together
they are only4,628 bytes. No asset was removed or gameplay changed during this
audit. Response-body sizes are not physical-device latency measurements.

## Inventory-owned Cards: Verified (2026-09-13)

The three illustrated expansion item cards and six-volume record shelf are now
owned by the inventory loader, not Boot/UIScene. Core tool navigation and
equipping remain immediate while artwork downloads. Pending expansion icons
use a small marker; item descriptions remain readable and failed art can be
retried. Closing during loading never reopens the menu on completion.

| Cold route | Asset bytes |
| --- | ---: |
| Title | 13,899,764 |
| Office | 13,399,013 |
| Cherry Blossom Garden | 24,663,283 |
| Black Vault | 49,137,703 |
| Senate | 24,306,913 |
| NARA Stacks | 24,290,880 |
| Embassy | 24,293,119 |
| DANN-E gallery | 83,417,508 |

Title and Office each shed 9,521,845 bytes; title reduction is 40.7% compared
with the preceding audit. Expansion maps still preload their pickup cards.
The field guide requests unlocked cards on demand; locked ones remain absent.
The gallery retains the complete DANN-E art collection, not the unrelated
record-shelf image. All eight routes and the cutscene UI debug view pass.

Evidence: `/private/tmp/frus-inventory-startup-proof/result.json` and native
screenshots. `/private/tmp/frus-inventory-earned-immediate/` verifies a genuine
earned Silent Read save with three-second download delays: equip Review Folder
before the cards arrive, close safely, reopen from cache, and render thumbnails.
An explicit preload regression test covers unlocked versus locked field-guide
cards. These are local asset-body measurements and simulated touch tests, not
real-device network timings or a public deployment.
