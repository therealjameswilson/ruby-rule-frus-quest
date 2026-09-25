# Clearance station furniture

Three original sprites generated with the built-in `image_gen` tool. The full prompts are in `prompts.json`; the PNG files are the unchanged generated originals with transparent alpha.

- `human-review-v1.png`: walnut desk, green leather blotter, folders, stamp and banker's lamp.
- `release-standard-v1.png`: slanted legal reference console with reading light and red books.
- `equity-ledger-v1.png`: tabbed ledger, paper trays, pen and drawer desk.

The runtime copies live in `public/assets/art-pack/clearance-stations/`. Packaging uses WebP at 464 pixels wide (eight source pixels per logical pixel), quality 90 with alpha quality 100. No content was retouched. The originals are outside the public directory and are not downloaded by the game.

Reproduce each runtime image using:

```sh
cwebp -quiet -resize 464 0 -q 90 -alpha_q 100 -m 6 art/clearance-stations/human-review-v1.png -o public/assets/art-pack/clearance-stations/human-review-v1.webp
```

The scene preserves the 58-pixel station width, interaction locations, collision geometry and dynamic completion lamps. On a missing new texture, the previously loaded generic research desk remains available as a fallback.
