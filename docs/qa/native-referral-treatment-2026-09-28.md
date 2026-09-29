# Readable referral treatment decisions

The treatment board now pairs each case note with a large draft choice and its consequence. Pending consent requires a hold; a wholly withheld record remains in the appeal trail. The screen states that an appeal does not itself release a document. Case-note limits remain in a fixed strip while the decision cards scroll.

The original two-field validator, draft encoding and scene-owned completion remain unchanged. Edits use annotation foley; filing is explicit and cannot succeed after correcting only one field.

Validation: 286 files / 2,127 tests and production build passed. Desktop, 375x667 portrait and 844x390 landscape fixtures passed both invalid choices, no early filing, draft restoration, touch/keyboard/simulated controller and shutdown cleanup. Phone/landscape compositor screenshots inspected. Standard client returned ReferralVaultScene state; its native canvas capture remains black.

These automated checks do not establish physical iPhone/controller feel or human listening/comprehension.

The production-preview touch-only replay continued from the previously earned dispatch checkpoint. It passed rejected treatments, saved-draft reload, deliberate filing, bracket printing, Concurrence Slip, duplicate-reward protection and proofing arrival with no browser errors. Evidence: `native-treatment-earned-2026-09-28.json`.
