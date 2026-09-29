# Production Floor hierarchy

Consolidated gate count and next action into one banner. Replaced abbreviated requirements with explicit task labels (verify sources, select records, review equities, check annotation, bind the volume). The all-clear banner directs the player to the publication gate; it does not claim publication. Removed redundant NOW/task cards and flow-title plaque. Preserved stage nodes, completion status lights, tool icons, current-position cursor, next-gate arrow and route/gate logic.

Visual QA caught overlap between the new banner and action prompt after an initially green containment test. Restricted floor prompts above the banner and removed the older FRUS VOLUME PATH title. Added a prompt/banner separation assertion and reran all cases.

Final validation: 287 files / 2,138 tests, TypeScript and production build pass. Eighteen fixtures (six completion states x portrait/landscape/desktop) verify next task, count, completion lights, absence of removed cards/title, label containment and prompt/banner separation. No page errors. Fixtures override the scene presentation context without changing inventory, mission or save state; they are not earned progression. Standard client movement/text state checked; its black native capture was supplemented by inspected compositor phone/landscape screenshots.

Evidence /tmp/frus-floor-hierarchy-verified and /tmp/frus-floor-hierarchy-standard-final. Final bundle from /tmp/frus-floor-hierarchy-verified copied into /tmp/frus-floor-hierarchy-build, served5232. Local only. Physical hardware and novice comprehension remain unverified.
