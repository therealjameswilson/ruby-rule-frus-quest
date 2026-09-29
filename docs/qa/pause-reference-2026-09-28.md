# Pause menu process reference

Records previously placed a legacy production-board gameplay task after the active objective. It now retains the current objective first and labels the board content as process reference, presenting source rationale and URL rather than a competing instruction. English, Spanish and French explanation labels included; existing historical text preserved.

Validation: 15 inventory tests pass, including a new regression for active objective precedence and absence of competing task. Typecheck and production build pass. Standard client state confirms Office exploration and current Kathy objective. Browser fixture `tools/qa-pause-reference.mjs` passes at375x667 and844x390, taps through Records and returns, verifies no progress/player change and no page errors. Compositor screenshots inspected; final wording uses first page to avoid confusing NEXT with an arrow. Evidence /tmp/frus-pause-reference-final; build /tmp/frus-pause-reference-final-build.

Limit: fixture opens the menu through its scene method then uses touch navigation. Physical iPhone/controller and novice comprehension are unverified. No deployment.
