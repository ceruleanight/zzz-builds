# Content guide

Everything shown for an agent lives in one folder:

```txt
src/content/<attribute>/<rank>/<agent>/metadata.json
src/content/<attribute>/<rank>/<agent>/<build>/
```

- `<attribute>`: `physical`, `fire`, `ice`, `electric`, `ether`, `wind`, `lumiflux`. Variants such as Frost, Auric Ink and Honed Edge live under their base attribute (`ice`, `ether`, `physical`)
- `<rank>`: `5` for S-rank, `4` for A-rank (the site shows them as S and A)
- `<agent>`: the URL slug, for example `miyabi`

Working copies of every file are in `content-guides/json-base/`. The Phoenix
Reffaella build (`src/content/fire/5/phoenix/anomaly`) is a complete example
that includes both a 4-piece and a 2-piece disc ranking.

## metadata.json

```json
{
  "specialty": "anomaly",
  "last_updated": "3.3",
  "version_released": "3.3",
  "release_date": "2026-10-21",
  "faction": "Krampus Compliance Authority",
  "portrait": "https://...",
  "image": "https://..."
}
```

- `specialty`: `attack`, `stun`, `anomaly`, `support`, `defense`, `rupture` or
  `armorer`. Agents can equip W-Engines of any specialty; one from another
  specialty only gives its stats, so the site adds a "Stat stick" note to it
  automatically.
- `last_updated`: game version of the build, or `WIP`. An agent whose builds
  are all `WIP` shows as a disabled card on the home page.
- `release_date` (`YYYY-MM-DD`): used by the "Release date" sort, newest first. `version_released` is only the fallback.
- `version_released`: the game version the agent was released in.
- `portrait` / `image` (optional): https URLs for the home card and the agent
  page header. A local file at
  `src/assets/character-assets/<attribute>/<rank>/<agent>/portrait.webp` (or
  `splash_art.webp`) is used first if it exists. With neither, a letter
  placeholder is shown.

## Build files

Each build folder (for example `anomaly`) holds these files. Every file is optional.

| File | Content |
| --- | --- |
| `build-notes.json` | `name`, `best` (true for the build used in "ranked on" lists), `notes`, optional `last_updated` override |
| `wengines.json` | Ranked W-Engines. Each rank is `{ "items": [...] }`. An item is an id or `{ "name", "refinement", "note" }` |
| `discs-sets.json` | Two separate rankings, like Star Rail relics: `disc_sets` for the 4-piece set and `two_piece_sets` for the 2-piece set that fills the other two slots. Each has an optional conditional list (`conditional`, `two_piece_conditional`). Items use `{ "name", "pieces": 4 or 2, "note" }`. Several groups in one rank are shown as equal alternatives (marked with a wavy equals sign). When a source recommends one option and lists others, put the recommended option in rank 1 and the rest in rank 2 |
| `discs-mainstats.json` | `main_stats` with `disc4`, `disc5`, `disc6` arrays of stat ids |
| `discs-substats.json` | `substats_priority`, ordered. Use `{ "items": [...] }` for equal priority |
| `talents.json` | Skill priority using ids `basic`, `chain`, `special`, `dodge`, `assist`. Core Skill is always levelled first, so it is not listed |

Stat ids come from `src/i18n/en/stats.json` (`cr`, `cd`, `atk%`, `ap`, `am`,
`pen`, `er`, `impact`, `ice-dmg`, ...). A slash such as `cr/cd` is a joint entry.

## Inline tokens in notes

`[[character:miyabi]]`, `[[wengine:hailstorm-shrine]]`,
`[[set:branch-and-blade-song]]`, `[[stat:cr]]`, `[[element:frost]]`,
`[[note:id]]`. To list viable items that still lack calculations, add a note
that starts with `## [[note:wip-wengine]]` or `## [[note:wip-disc]]` followed
by a list of tokens. Those agents then show as `WIP` chips on the W-Engine and
Drive Disc pages.

## Shared data

- `src/data/wengines/<specialty>.json`: one entry per W-Engine (rank in
  `rarity`: 5 = S, 4 = A, 3 = B), `passive` text with `{{value}}`, `r1` to `r5`
  values per superimposition, `substat` (advanced stat id) and `level_max`.
- `src/data/discs/disc_sets.json`: 2-piece and 4-piece effects plus filter `tags`.
- Display names live in `src/i18n/en/*.json`. Add a new agent, W-Engine or disc
  set to the matching file or its name will fall back to the id.
