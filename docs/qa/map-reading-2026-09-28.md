# Readable map dialogue

GameplayMapScene previously rendered instructional dialogue at 6 logical pixels in a footer only 22 pixels from the canvas bottom. MapReadingDesk now presents the existing speaker/text in a native dialog with page count, Continue, Back and Return. It reuses DeskControls for touch, keyboard, controller, reading audio mix and neutral input arming. Scene shutdown closes the panel; dialogue still pauses player/combat and uses existing game-state dialogue readouts. Text, rewards, triggers and gate rules are unchanged.

Validation: 287 files / 2,138 tests, TypeScript and fresh production build pass. Existing scene test mocks the presentation class while preserving game-state/control assertions. Twenty real Production Floor text cases at 320/375 portrait, 844 landscape and 1024 desktop pass content, 44px controls and header separation. Additional fixtures invoke the real trigger handler with positioned player, verify movement stays paused, keyboard dismissal, two-page forward/back, simulated controller cancel and shutdown cleanup. Fixtures are not earned progression or physical controller tests.

Initial screenshots caught the entry fade; final screenshots wait 260ms for it to finish. Inspected final 320px Declassification Review and landscape Annotation panels. Standard client movement/state inspected; known black native capture supplemented by compositor screenshots. No browser page errors. Raw /tmp/frus-map-reading-final and /tmp/frus-map-reading-standard. Build /tmp/frus-map-reading-build served5233. Local only, no deployment.

Remaining: physical device/controller and novice comprehension; longer map conversations should receive further content/scroll review. No broad final-quality completion claim.
