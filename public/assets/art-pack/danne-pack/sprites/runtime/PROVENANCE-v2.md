# Replacement enemy sheets — 2026-09-24

Original game artwork generated with OpenAI image generation. Generated alpha preserved during resampling. Earlier damaged runtime sheets retained as unused originals.

- redactor-drone-v2.png: source exec-115c9a44-43c5-4540-b11c-225e3595f5af.png, resampled to 940x688. Steel-blue hovering robot, brass fittings, ruby lens and stamping mechanism. Four-by-four sheet: front hover, back hover, left profile, attack.
- censorship-wraith-v2.png: source exec-0de1b26f-9b59-4f95-85f0-e753d0dbbe51.png, resampled to 860x828. Indigo paper robes, gold eyes, burgundy sash, cream archival documents. Four-by-four sheet: front hover, back hover, left profile, attack.

Runtime texture keys, frame dimensions, animation ranges and gameplay collision remain unchanged.

## DANN-E combat forms

- danne-boss-forms-v2.png: original generated four-form armor sheet, based on the game's existing DANN-E identity (silver dome, red eyes, dark armor). Source exec-ab0c0eb5-d699-404e-a4b2-c6a8881d3999.png; transparent-background edit exec-73eb19ca-f3cb-412b-a445-1d1daebea589.png. The first export's background was removed through image generation, preserving opaque dark armor. Prepared at 512x768 with generated alpha preserved; alpha audit confirmed 160,078 fully transparent pixels and 188,509 nearly opaque pixels.
- Four rows: Colossus, Swarm, Cloud, Ascendant. Each row contains four front-facing idle poses. Frame128x192, drawn at one-quarter legacy scale to retain32x48 logical frame dimensions. Only final-boss combat uses this sheet; existing portrait/gallery and ordinary DANN-E variants retain their original assets.

Sprite preparation used source row boundaries0/384/768/1136/1536 (at1024x1536), fitting each cell proportionally into128x192. The Cloud/Ascendant boundary differs from a uniform grid to keep the arch out of Cloud frames.
