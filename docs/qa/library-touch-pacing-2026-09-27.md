# Library touch route and pacing — 2026-09-27

Verified production build locally at port 5219. Both 390×844 portrait and 844×390 landscape complete all four Reagan desks, save/continue, pause/resume, NSC wing entry/pause/return, and outside exit with touch inputs only. No player-position or progression writes; initial debug scene entry is used, so this is not a fresh-campaign test. Directional movement uses CDP touch holds/cancel; desk actions use touch taps. Reading and pause keep the player stationary, cancellation releases movement, and continue restores position. Filing awards eight points once along this route.

Arrival and intermediate receipts now permit immediate movement. Detailed evidence remains in saved papers and latest message; final packet retains a short review receipt. MENU closes frozen overlays in both library scenes. The default shared handler behavior remains unchanged for other scenes.

Build and 282-file / 2,101-test suite passed. Both route cases report no page errors. Inspected portrait arrival and landscape filed-room compositor screenshots in /tmp/frus-library-touch-pacing. Standard headed skill client reports explore mode and movement at /tmp/frus-touch-pacing-standard; its canvas screenshot remains black, while compositor screenshots render normally. Physical iPhone and subjective controller/audio quality remain unverified.
