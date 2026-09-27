# Earned manuscript touch route and input handoff fix

Continued the earned annotation save through collection of the supporting telegram and cross-reference, the east review door, selection, chapter assembly, two reviews, evidence-led revision, front-matter/CIA checks, DPD submission and Network entry. Touch-only route uses native controls and rendered choice rows; keyboard/mouse APIs are guarded, no player/progression writes. End state: 10/10 compiler checkpoints, chapter submitted, revision complete, dpdSubmitted true, NetworkScene. No page/console errors.

Found and reproduced a real input handoff problem twice: keeping the movement thumb held as the native desk opens selected the decision packet before any desk tap (1320 instead of1100 pages). DeskControls now captures pointer clicks and requires a preceding pointerdown within that desk; pointercancel disarms it. Zero-detail keyboard/controller activation is preserved. Fixed earned route asserts1100 initial pages after the held gesture. It then verifies missing-decision rejection,1500-page over-budget rejection,1320-page correction, and saved selection after leaving/reopening.

QA movement bursts were also shortened near destinations to avoid overshooting a waypoint. The compiler helper supports touch for manuscript, chapter, revision and ordinary checkpoint choices. Existing library helpers are outside this route.

Validation: build and all282files/2111tests passed. Existing desk suite passed desktop, portrait and landscape including save/reload, native touch, mouse/keyboard and simulated controller, plus DPD handoff. That suite uses fixtures/positioning and mixed input outside desk checks; the separately earned route provides the touch-only progression evidence. Inspected portrait over-budget and landscape ready screenshots. Standard headed skill client reaches Office explore atx143; known black canvas-capture limitation persists. Hardware/novice comprehension and full current campaign remain unverified.

Next earned save: /tmp/frus-touch-manuscript-fixed-0927/earned-storage.json. Runtime change is local, not published.
