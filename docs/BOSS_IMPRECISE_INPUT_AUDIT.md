# DANN-E Imprecise Input Audit

September 9, 2026. Local build following a85836d. No combat values changed.

## Why This Check

The main counter-loop regression reads bolt coordinates to schedule swings.
That is useful for collision verification, but cannot establish how forgiving
the fight feels. Added `--imprecise` to the existing browser audit as a separate
observation mode; it does not replace the full-fight regression.

After the earned entry and normal approach, it attempts 16 swings at fixed,
uneven delays (420, 760, 500, 620 ms, repeated), nudging north every fourth
attempt. No HP, projectile position or core-opening state drives those inputs.
The setup still knows the central aisle and correct tool, so this is emphatically
not an unaided novice playtest. Reporting state is read after the sequence.

## Results

| Input | HP Before | HP After | Bolts Returned | Reliability Lost During Sequence | Retry |
| --- | --- | --- | --- | --- | --- |
| Simulated touch, 375x667 | 180 | 40 | 3 | 10 | No |
| Keyboard, 1024x960 | 180 | 96 | 1 | 20 | No |

Both runs started the measured sequence at 90 reliability; the approach had
already cost 10. Documents and points remained unchanged. No browser errors.
These are single observations with real-time scheduling differences, not an
estimate of device superiority, a timing threshold, or a win-rate claim.

Evidence:
- `/private/tmp/frus-boss-imprecise-touch-0909/result.json`
- `/private/tmp/frus-boss-imprecise-desktop-0909/result.json`

![Imprecise touch counterplay](screenshots/boss-imprecise-touch.png)

Native touch and keyboard captures inspected. The standard installed game client
also approached from an earned entry using ordinary keyboard bursts; its separate
capture is not counter-loop proof. The attempted interactive Chrome debug visit
was not used as earned or novice evidence.

## Decision

Do not widen exposure windows or lower HP simply because the precise regression
looks demanding. Imperfect swings can produce returns and follow-up damage with
recoverable mistakes. Preserve the counter-and-core mechanic while seeking
first-player evidence about recognizing the required button, return timing and
follow-up approach. The broader fun goal remains unproven.

Validation: script syntax and diff checks pass. No runtime source or assets were
changed in this checkpoint; the previously verified build remains in use.
