
Rendering & Pixel-Perfect Contract
Ruby Rule: The FRUS Quest renders at a fixed internal resolution and scales up
by whole-number device-pixel multiples only. This document is the source of truth for
keeping the art crisp. If you touch the renderer, scaling, CSS, or any moving
sprite, follow this contract.

The contract, in one line
One game pixel must map to exactly deviceZoom whole device

pixels — no fractional physical-pixel scaling, ever.

Internal resolution: GAME_WIDTH × GAME_HEIGHT = 256 × 240 (see src/game/constants.ts).

Tile size: 16 px (TILE_SIZE in src/game/questArchitecture.ts).

Scaling: device-pixel integer-only. The runtime picks the largest whole-number deviceZoom that fits the viewport. CSS zoom may equal deviceZoom / round(devicePixelRatio) on high-DPR phones.

Why this matters
Pixel art looks soft/blurry whenever a 16 px tile lands on fractional device pixels. The three classic causes — and how we avoid them:

Canvas2D upscaling. Use WebGL. gameConfig.type is Phaser.AUTO so WebGL nearest-neighbor is used when available. (Do not revert to Phaser.CANVAS.)

Non-integer device zoom. Never combine a fixed zoom with Phaser.Scale.FIT; FIT can rescale to fractional physical pixels. We use Phaser.Scale.NONE and compute an integer deviceZoom ourselves.

High-DPR scaling. Phaser keeps its fixed logical backing buffer and the CSS size is GAME_* × (deviceZoom / round(dpr)), so the browser maps every game pixel to exactly deviceZoom physical pixels without interpolation. Do not resize the WebGL backing canvas after startup.

Required configuration
src/game/config.ts
type: Phaser.AUTO

pixelArt: true, antialias: false, antialiasGL: false, roundPixels: true

render: { pixelArt, antialias:false, antialiasGL:false, roundPixels:true, powerPreference:"high-performance" }

scale: { mode: Phaser.Scale.NONE, autoCenter: CENTER_BOTH, width: GAME_WIDTH, height: GAME_HEIGHT, zoom: 1 }

No fixed zoom: 3. Zoom is computed at runtime.

Runtime integer zoom (src/systems/pixelPerfect.ts)
computeIntegerZoom(viewW, viewH) = max(1, floor(min(viewW/GAME_WIDTH, viewH/GAME_HEIGHT)))

computeDeviceIntegerZoom(viewW, viewH, dpr) = max(1, floor(min((viewW*dpr)/GAME_WIDTH, (viewH*dpr)/GAME_HEIGHT)))

applyIntegerZoom(game):
cssZoom = deviceZoom / round(devicePixelRatio)

game.scale.setZoom(cssZoom) only when the value changed

canvas CSS size = GAME_WIDTH*cssZoom × GAME_HEIGHT*cssZoom

canvas backing size remains GAME_WIDTH × GAME_HEIGHT (owned by Phaser)


Call it on boot and on window resize / orientationchange (wired in src/main.ts).

CSS (src/styles/pixel.css)
#game-shell { width:auto; height:auto; max-width:100vw; max-height:100dvh; } (JS owns final sizing; do not hard-code 768×720.)

#game-shell canvas { image-rendering: pixelated; image-rendering: crisp-edges; }

Sub-pixel discipline (moving things)
Camera-follow and entity motion are the usual source of edge "shimmer":

Set cameras.main.roundPixels = true in BootScene and any scene that creates its own camera.

Round rendered positions every frame with snapPixel() / setPixelPosition() from src/systems/pixelPerfect.ts (Player, enemies, NPCs, and src/systems/smoothMovement.ts).

Keep the camera-follow target on whole pixels; smooth in sub-pixel space internally but render snapped.

Source-art hygiene
Author all sprites/atlases at 1×. Never ship pre-scaled 2× PNGs that get downsampled.

All textures use Phaser.Textures.FilterMode.NEAREST (set after load in BootScene).

Atlas frame coordinates in src/game/snesAtlas.ts must be integers.

In-game UI text should use a bitmap pixel font, not a web/canvas font (canvas fonts always anti-alias and will look soft at integer zoom).

Verifying ("pixel proof")
Use the pixelProofVisible flag / RenderDebugScene to confirm:

A 1px checkerboard renders as crisp alternating pixels (no gray bleed).

A single-texel test sprite at the origin stays sharp.

The on-screen readout shows: devicePixelRatio, CSS zoom, integer deviceZoom target, canvas CSS size, and logical backing size — and that 1 game px == deviceZoom device px.

window.rubyRuleMobileMetrics exposes computedZoom, integerZoomTarget, integerZoom, dpr, canvasCss*, canvasBacking*, and scaleGuardAdjustments for the same checks at runtime.

Checklist before merging render/art changes
Renderer is Phaser.AUTO (WebGL preferred).

CSS zoom × rounded DPR is an integer at every tested viewport size and DPR.

Canvas backing remains GAME size; CSS size = GAME size × deviceZoom / round(dpr).

cameras.main.roundPixels === true.

Moving entities render on whole pixels.

All textures NEAREST-filtered; source art is 1×.

Pixel-proof overlay shows no blur.
