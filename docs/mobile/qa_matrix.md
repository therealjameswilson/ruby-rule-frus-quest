# Mobile SNES Quality Phase 10 QA Matrix

Date: 2026-06-12

## Result

Phase 10 has automated proxy coverage, but the real-device gate is still pending.

The prompt requires physical iPhone, Pixel, iPad, older Android, and Bluetooth-controller checks. This Codex run cannot operate those devices directly, so no physical row is marked as passed. Instead, this matrix records repeatable Playwright device-profile evidence and leaves the final shipping decision blocked on real hardware.

## Commands

```sh
npm run build
node /Users/jameswilson/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js \
  --url 'http://127.0.0.1:5197/?scene=GuideScene&role=compiler&name=Ruby' \
  --screenshot-dir docs/screenshots/mobile/phase10-web-game-client \
  --iterations 2 \
  --pause-ms 300 \
  --click 128,120
```

The matrix probe used local Vite dev server:

`http://127.0.0.1:5197/?scene=GuideScene&role=compiler&name=Ruby&mobileDebug=1&fps=1`

## Physical QA Matrix

| Device | Browser | Orientation | FPS | Latency | Audio | Save | Pass? |
| --- | --- | --- | ---: | ---: | --- | --- | --- |
| iPhone 14/15 Pro | Safari | Portrait | Pending hardware | Pending hardware | Pending hardware | Pending hardware | Pending |
| iPhone 14/15 Pro | Safari | Landscape | Pending hardware | Pending hardware | Pending hardware | Pending hardware | Pending |
| iPhone SE 2 | Safari | Portrait | Pending hardware | Pending hardware | Pending hardware | Pending hardware | Pending |
| Pixel 7/8 | Chrome | Portrait | Pending hardware | Pending hardware | Pending hardware | Pending hardware | Pending |
| Pixel 7/8 | Chrome | Landscape | Pending hardware | Pending hardware | Pending hardware | Pending hardware | Pending |
| Older Android (4GB) | Chrome | Portrait | Pending hardware | Pending hardware | Pending hardware | Pending hardware | Pending |
| iPad Air | Safari | Landscape | Pending hardware | Pending hardware | Pending hardware | Pending hardware | Pending |
| iPhone + 8BitDo | Safari | Landscape | Pending hardware | Pending hardware | Pending hardware | Pending hardware | Pending |

## Automated Proxy Matrix

These rows used Chromium device profiles. They verify code paths and layout under mobile viewport constraints, but they do not prove Safari hardware audio policy, real GPU frame pacing, real notch behavior, physical touch latency, or actual Bluetooth controller pairing.

| Proxy profile | Orientation | FPS avg | FPS min | Input latency | Audio before background | Save on pagehide | Pixel zoom | Controller | Proxy pass |
| --- | --- | ---: | ---: | ---: | --- | --- | --- | --- | --- |
| iPhone 14/15 Pro Safari profile | Portrait | 60.00 | 59.52 | 4.6ms | running, 0.4ms unlock | yes | 1x integer | none | yes |
| iPhone 14/15 Pro Safari profile | Landscape | 60.01 | 59.52 | 12.2ms | running, 0.4ms unlock | yes | 1x integer | none | yes |
| iPhone SE 2 Safari profile | Portrait | 60.00 | 59.52 | 13.4ms | running, 0.1ms unlock | yes | 1x integer | none | yes |
| Pixel 7/8 Chrome profile | Portrait | 60.00 | 59.52 | 10.6ms | running, 0.2ms unlock | yes | 1x integer | none | yes |
| Pixel 7/8 Chrome profile | Landscape | 60.00 | 59.52 | 13.9ms | running, 0.1ms unlock | yes | 1x integer | none | yes |
| Older Android Chrome profile | Portrait | 60.00 | 59.52 | 10.4ms | running, 0.4ms unlock | yes | 1x integer | none | yes |
| iPad Air Safari profile | Landscape | 60.00 | 59.52 | 13.8ms | running, 0.3ms unlock | yes | 3x integer | none | yes |
| iPhone + 8BitDo profile | Landscape | 60.00 | 59.52 | n/a | running, 1.3ms unlock | yes | 1x integer | mock 8BitDo connected; touch hidden | yes |

## Evidence

Raw metrics:

- `docs/mobile/phase10-proxy-results.json`

Screenshots:

- `docs/screenshots/mobile/phase10-iphone14pro-safari-portrait.png`
- `docs/screenshots/mobile/phase10-iphone14pro-safari-landscape.png`
- `docs/screenshots/mobile/phase10-iphonese2-safari-portrait.png`
- `docs/screenshots/mobile/phase10-pixel7-chrome-portrait.png`
- `docs/screenshots/mobile/phase10-pixel7-chrome-landscape.png`
- `docs/screenshots/mobile/phase10-older-android-chrome-portrait.png`
- `docs/screenshots/mobile/phase10-ipadair-safari-landscape.png`
- `docs/screenshots/mobile/phase10-iphone14pro-8bitdo-landscape.png`

Recordings:

- `docs/screenshots/mobile/phase10-recordings/iphone14pro-portrait.webm`
- `docs/screenshots/mobile/phase10-recordings/iphone14pro-landscape.webm`
- `docs/screenshots/mobile/phase10-recordings/pixel7-portrait.webm`
- `docs/screenshots/mobile/phase10-recordings/pixel7-landscape.webm`

Regression smoke:

- `docs/screenshots/mobile/phase10-web-game-client/shot-0.png`
- `docs/screenshots/mobile/phase10-web-game-client/shot-1.png`
- `docs/screenshots/mobile/phase10-web-game-client/state-0.json`
- `docs/screenshots/mobile/phase10-web-game-client/state-1.json`

## Notes

- The proxy matrix saw zero page errors.
- Two screenshot captures logged Chromium `ReadPixels` performance warnings; these warnings are caused by Playwright screenshot capture and are not game page errors.
- Audio was sampled before backgrounding and reported `running`. After the synthetic `pagehide` event, the context suspended as intended.
- Save/resume proxy coverage confirmed `localStorage` save payloads with `lastSaveResult.reason: "pagehide"`.
- The Bluetooth-controller row uses a mocked standard Gamepad API object; actual iPhone + 8BitDo pairing remains pending.

## Remaining Gate

Before shipping this mobile branch, run the physical matrix above on actual devices and replace `Pending hardware` with measured values. The pass criteria remain:

- 60 FPS overworld / 30 FPS minimum under stress on low-end Android.
- Input latency below 50ms.
- Audio starts within 100ms of first tap and resumes after interruption.
- Save/resume works after backgrounding.
- No fractional zoom, scroll, browser zoom, or notch clipping.
- Touch controls and Bluetooth controller input do not regress desktop keyboard play.
