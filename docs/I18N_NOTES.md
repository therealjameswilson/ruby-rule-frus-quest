# Localization (i18n) Notes

This document explains the key structure used by the localization string files in
`src/data/i18n/`.

## Files

- `src/data/i18n/es.json` — Spanish (Español)
- `src/data/i18n/fr.json` — French (Français)

Both files share an identical, nested key structure. English source strings were
extracted from the existing scene and game-data code under `src/scenes/` and
`src/game/`; no scene code was modified. These files are a translation catalog and
are not yet wired into the runtime — a future change can load and look up keys via a
small helper (e.g. `t("hud.confirm")`).

## Key structure

Keys are grouped into a flat set of top-level namespaces that map to the UI surface
where the string appears. Each namespace holds `dotless.camelCase` leaf keys.

| Namespace          | Source | Purpose |
| ------------------ | ------ | ------- |
| `hud`              | `src/scenes/UIScene.ts` | On-screen HUD prompts, action hints, tool labels |
| `title`            | `src/scenes/TitleScene.ts` | Title screen labels, menu route names, start prompts |
| `tapToStart`       | `src/scenes/TapToStartScene.ts` | Audio-unlock / continue-or-new-game screen |
| `warning`          | `src/scenes/WarningScene.ts` | Fictional DANN-E disclaimer screen |
| `characterCreate`  | `src/scenes/CharacterCreateScene.ts` | Role-selection screen labels and prompts |
| `guide`            | `src/scenes/GuideScene.ts` | Archive Cavern tutorial dungeon text |
| `codex`            | `src/scenes/CodexScene.ts` | Field codex UI and progress counters |
| `office`           | `src/scenes/OfficeScene.ts` | Office hub interactable/NPC labels |
| `ending.true`      | `src/scenes/TrueEndingScene.ts` | True (certified) ending copy |
| `ending.bad`       | `src/scenes/BadEndingScene.ts` | Bad (concealed defect) ending copy |
| `mission`          | `src/game/mission.ts` | Mission statement, goal banners, quest loop |
| `roles`            | `src/game/constants.ts` | FRUS production roles (name/ability/detail) |
| `items`            | `src/game/constants.ts` | Inventory items (name/desc/detail) |
| `controls`         | `src/game/constants.ts` | Full control-scheme help string |

### Nested entries

Namespaces for structured records (`roles`, `items`, `ending`) use a second level of
grouping so related fields stay together, for example:

```json
"items": {
  "citationStamp": {
    "name": "Sello de cita",
    "desc": "Abre los cierres de notas de fuente",
    "detail": "Procedencia verificada"
  }
}
```

## Placeholders

Some strings contain runtime placeholders written as `{name}` in single curly
braces. These MUST be preserved verbatim in every translation, including the exact
token name, so the runtime interpolation still matches. Known placeholders:

- `{item}`, `{tool}`, `{label}` — HUD interaction/tool targets
- `{displayName}` — the player's chosen name
- `{unlocked}`, `{total}`, `{category}` — codex progress counters
- `{count}`, `{completed}` — ending progress counters
- `{scene}`, `{documentPoints}` — save-slot summary
- `{mark}` — checkbox glyph for the "skip warning" toggle

## Formatting conventions

- Files are valid JSON, UTF-8 encoded, two-space indented.
- Top-level namespaces and leaf keys are sorted alphabetically for readable diffs.
- Literal newlines inside a label are kept as `\n` (the game renders multi-line
  labels at 8-bit scale); the escape is preserved across languages.
- Strings shown in ALL CAPS in-game are kept upper-cased in translation to match the
  retro NES presentation.

## FRUS terminology

Domain terms are kept consistent and professional across both languages:

- **FRUS** and **DANN-E** are proper nouns and are left untranslated.
- **Foreign Relations of the United States** is rendered descriptively
  (es: *Relaciones Exteriores*, fr: *Relations Étrangères*) only where it appears as
  display art; the FRUS acronym itself is never localized.
- **Kellogg standards**, **ClassNet**, **NARA**, **OpenNet**, **buckram**, and
  **HISTORY.STATE.GOV** are preserved as-is.
- Editorial/production roles (Compiler, Editor, Proofreader, Declassification
  Coordinator, Source Note Specialist) are translated with their standard
  professional equivalents.

## Adding a new language

1. Copy `es.json` to `<lang>.json`.
2. Translate every leaf value, leaving keys and `{placeholders}` untouched.
3. Keep keys alphabetically sorted and the file valid JSON.
