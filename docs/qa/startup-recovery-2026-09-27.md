# Startup measurement and recovery

Six fresh-menu and six saved-menu starts completed during a three-page concurrent Chromium test. Saved-menu cold starts took 912–1,107 ms and warm starts 630–920 ms on the local preview server. Initial resource transfer was about 8.95 MB across 144 resources. These are local software-browser measurements, not network-constrained mobile performance.

The prior sporadic startup timeouts were not reproduced. Their cause remains unproven. The startup runner now records exact expected scenes, resource timing, transferred bytes, request failures scoped to navigation, and failure screenshots.

The boot loader previously exposed retry only after a reported load error. A request that stopped making progress could leave the loading screen indefinitely without a recovery action. It now offers a readable waiting message and retry after 15 seconds without progress, while allowing the current load to continue. Progress clears the waiting state. Real errors remain errors; timers and event handlers clean up on completion/shutdown.

Fault injection holds one data request until the waiting state appears, then releases it. A separate case aborts a required request, then allows it after the player taps retry. Both cases must reach the saved-game menu and preserve the exact saved JSON. Results are in startup-recovery-2026-09-27.json.

This does not diagnose the earlier intermittent failure or cover a failure to load the initial JavaScript module. No public release or physical-device verification is claimed.
