# Elena visual distinction

Replaced the default-hero duplicate used for Elena with original detailed artwork. Both Archive A1 and B2 preload the new stationary sprite. No interaction or progression changes.

- Production build passed; 282 test files / 2,114 tests passed.
- Desktop 1024×960 and simulated touch 375×667: both rooms load `npc-elena-detailed-v1`, distinct from `compiler_hd`; 32×48 display, measured soles five logical pixels below NPC anchor, matching the existing shadow convention. No page errors.
- Inspected compositor screenshots after room banner dismissal: `/tmp/frus-elena-{desktop,phone}-{A1,B2}.png`. Elena is visibly distinct and grounded.
- Standard game client moved the hero to x140 in Archive explore mode. Its native screenshot was black, consistent with the existing capture limitation; compositor screenshots supplied visual evidence.
- Room transitions were explicit visual fixtures, not an earned playthrough. Physical-device readability and overall goal completion are not established by these checks.
