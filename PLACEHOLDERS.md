# Placeholders and gaps

Everything that could not be sourced is listed here, with the file to edit. Data was gathered on 3 to 4 November 2026 (game version 3.3).

## 1. Agent builds

All 62 agents have builds. To publish a new agent, add a build folder next to its `metadata.json` (copy `content-guides/json-base/`) and set `last_updated` to a version number. An agent without a build folder shows as WIP.

## 2. Gaps inside the finished builds

No build has team compositions, a rotation or calculation links. Core Skill is not listed in any skill priority because it is always levelled first. Skill priority symbols (`>`, `=`, `>>`) were reconstructed from source text where the source lost its icons. Following your screenshot, Assist is placed above Dodge in Roxy, Claret and Ye Shunguang, and Prydwen's Miyabi order agrees. Phoenix's skill order (Basic, Chain, Assist, Special, Dodge) matches both your screenshot and Prydwen. 

- **Hoshimi Miyabi** (`src/content/ice/5/miyabi/dps`, Prydwen, updated 20 Oct 2026, plus earlier Icy Veins notes): complete, including the 2-piece list. The combined 2-piece ranking groups Prydwen's per-set partner lists into three ranks that Prydwen itself does not rank. The Prydwen team lists and rotation are summarised in notes only; there is no teams section.
- **Phoenix Reffaella** (`src/content/fire/5/phoenix/anomaly`, Prydwen, updated 20 Oct 2026): complete. The Prydwen team list and Shiyu Defense / Deadly Assault usage figures are not used, because the site has no teams section and the team members are shown as images. The 2-piece list has only Phaethon's Melody because Prydwen names it as the recommendation for all three 4-piece sets.
- **Claret** (`src/content/electric/5/claret/armorer`, Prydwen): complete. Candlelit Scheme was added from the Game8 page you supplied. The S3 and S4 values on that page were "TBD", so they follow the standard progression used by other W-Engines (CRIT Rate 10.4 and 11.6%, DMG 19.5 and 21.8%).
- **Remielle Dan** (`src/content/lumiflux/5/remielle/anomaly`, Prydwen, updated 20 Oct 2026): complete. Prydwen lists her faction as "Unknown Faction"; `metadata.json` still has the roster source's faction.
- **Velina Airgid** (`src/content/wind/5/velina/anomaly`, Prydwen): complete. Kaboom the Cannon is included as an Energy Regen stat stick. Her 2-piece list shows Swing Jazz and Moonlight Lullaby as Prydwen's recommended pair.
- **Yixuan** (`src/content/ether/5/yixuan/rupture`, Prydwen, updated 20 Oct 2026): complete.
- **Alice Thymefield** (`src/content/physical/5/alice/anomaly`, Prydwen, updated 20 Oct 2026): complete. The page repeats Fusion Compiler (full stacks and 1.8 stacks); both figures are in one note.
- **Astra Yao** (`src/content/ether/5/astra-yao/anomaly` and `crit`, Prydwen, updated 20 Oct 2026): two builds that differ only in substats (Anomaly Proficiency versus CRIT). Only the Anomaly build is flagged `best`, so only it counts in the "ranked on" lists. Her W-Engines are all Support W-Engines.
- **Aria** (`src/content/ether/5/aria/anomaly`, Prydwen, updated 20 Oct 2026): complete. Her 2-piece list merges Prydwen's separate lists for her two 4-piece sets, with pairing notes.
- **Soldier 0 - Anby** (`src/content/electric/5/soldier-0-anby/dps`, Prydwen, updated 20 Oct 2026): complete.
- **Anton** (`src/content/electric/4/anton/dps`, Prydwen, updated 20 Oct 2026): complete. A-rank agent.
- **Anby** (`src/content/electric/4/anby/stun`, Prydwen, updated 20 Oct 2026): complete. A-rank agent. W-Engine notes quote Prydwen's damage and Daze percentages together because the page shows two values.
- **Cissia** (`src/content/electric/5/cissia/dps`, Prydwen, updated 20 Oct 2026): complete.
- **Burnice** (`src/content/fire/5/burnice/anomaly`, Prydwen, updated 20 Oct 2026): complete.
- **Starlight Billy** (`src/content/physical/5/starlight-billy/rupture`, Prydwen): complete. Steel Cushion is included as an off-specialty stat stick.
- **Banyue** (`src/content/fire/5/banyue/rupture`, Prydwen, updated 20 Oct 2026): complete.
- **Billy Kid** (`src/content/physical/4/billy/attack`, Prydwen, updated 20 Oct 2026): complete. A-rank agent.
- **Ben Bigger** (`src/content/fire/4/ben/defense`, Prydwen): complete. Cloudcleave Radiance, Hailstorm Shrine, Severed Innocence and Heartstring Nocturne are included as off-specialty stat sticks. Their notes are short because the Prydwen commentary was not captured.
- **Caesar King** (`src/content/physical/5/caesar/anomaly` and `crit`, Prydwen, updated 20 Oct 2026): two builds that differ only in substats (Anomaly Proficiency versus CRIT). Only the Anomaly build is flagged `best`.
- **Dialyn** (`src/content/physical/5/dialyn/stun`, Prydwen, updated 20 Oct 2026): complete.
- **Norma** (`src/content/fire/5/norma/stun`, Prydwen, updated 20 Oct 2026): complete. The W-Engine notes quote damage and Daze percentages.
- **Corin** (`src/content/physical/4/corin/attack`, Prydwen, updated 20 Oct 2026): complete. A-rank agent.
- **Severian Lowell** (`src/content/wind/5/severian/attack`, Prydwen, patch 3.3): **new agent added to the roster.** His attribute, specialty and portrait are from Prydwen and the image repo, his faction is "Unknown" (Prydwen) and his full name is from the roster source. The build is complete.
- **Generated builds (Pyrois, Pulchra, Promeia, Piper, Pan Yinhu, Orphie & Magus, Nicole, Nekomata, Soldier 11, Sigrid, Seth, Seed, Roxy, Rina, Qingyi):** these 15 were produced by reading the structured parts of the Prydwen pages directly: W-Engine order and percentages, 4-piece and 2-piece disc sets with Prydwen's recommended partners, Disc 4/5/6 main stats, substats, skill priority, target stats, the calculation team and the synergy list. Their notes are therefore short and factual (target stats, a partner list, calculation team, and "About X%" for each W-Engine and 4-piece set). Prydwen's written commentary per W-Engine, disc set and partner was not included. Roxy and Promeia were rebuilt this way and replace their earlier hand-written notes (Icy Veins and GenshinBuilds). Each build's `last_updated` is Prydwen's own build patch.
- Target stats notes copy Prydwen's own wording for conditions, for example "(Optional)" or "(Most Important Stat)", and a few read slightly awkwardly (for example Pulchra's "Choose One Option 1 ...").
- Partner lists name agents only; where Prydwen's synergy entry is about a non-roster name it is skipped.
- **Ellen Joe** (`src/content/ice/5/ellen/attack`, Prydwen): complete.
- **Evelyn Chevalier** (`src/content/fire/5/evelyn/attack`, Prydwen): complete except **no 2-piece sets**: the page lists three 4-piece sets without 2-piece partners.
- **Grace Howard** (`src/content/electric/5/grace/anomaly`, Prydwen): complete.
- **Asaba Harumasa** (`src/content/electric/5/harumasa/attack`, Prydwen): complete. Hormone Punk and Astral Voice are shown as one recommended 2-piece pair for Thunder Metal, as the page groups them.
- **Hugo Vlad** (`src/content/ice/5/hugo/attack`, Prydwen): complete. W-Engine notes quote damage and Daze percentages.
- **Jane Doe** (`src/content/physical/5/jane-doe/anomaly`, Prydwen): complete.
- **Nangong Yu** (`src/content/ether/5/nangong-yu/stun`, Prydwen): complete. W-Engine notes quote damage and Daze percentages.
- **Komano Manato** (`src/content/fire/4/manato/rupture`, Prydwen): complete. A-rank agent. The page repeats Grill O'Wisp at S5 and S1; they are merged into one entry.
- **Von Lycaon** (`src/content/ice/5/lycaon/stun`, Prydwen): complete.
- **Luciana de Montefio** (`src/content/fire/4/lucy/support`, Prydwen): complete except **no ATK targets**: the page lists them per Special level without numbers, and no W-Engine percentages (the page has none). A-rank agent.
- **Lucia Elowen** (`src/content/ether/5/lucia/support`, Prydwen): complete. No W-Engine percentages on the page.
- **Lighter** (`src/content/fire/5/lighter/stun`, Prydwen): complete. W-Engine notes quote damage and Daze percentages.
- **Koleda Belobog** (`src/content/fire/5/koleda/stun`, Prydwen): complete. Hellfire Gears appears at S5 and S1 on the page; they are merged into one entry with both figures.
- **Ju Fufu** (`src/content/fire/5/ju-fufu/stun`, Prydwen): complete.
- **Ye Shunguang** (`src/content/physical/5/ye-shunguang/dps`, Prydwen, updated 20 Oct 2026): complete. Prydwen's Brimstone entry appears twice (S5 and S1); they are merged into one entry with both figures in the note.

- **Last updated version:** each Prydwen-sourced agent uses Prydwen's own "last build update" patch in `last_updated`. Roxy (Icy Veins) and Promeia (GenshinBuilds) keep the patch of their source.
- **Not used from Prydwen:** team lists, Shiyu Defense and Deadly Assault usage figures and kit text, because the site has no teams section and team members appear as images.

## 3. Images

- **Agents (62 of 62):** portraits are bundled locally in `src/assets/character-assets/<attribute>/<rank>/<agent>/portrait.webp` (512 px, from `Gaiiiaaa-GH/ZZZdle-Assets`). The `portrait` and `image` URLs in each `metadata.json` are only a fallback; a local file wins. When `image` equals `portrait`, the local portrait is reused for both.
- **W-Engines (102 of 102) and Drive Disc sets (30 of 30):** bundled locally in `src/assets/item-assets/wengines/<specialty>/<id>.webp` (128 px) and `src/assets/item-assets/discs/<id>.webp` (100 px). They came from the Prydwen pages you supplied. They are smaller than the 400 px icons used before, so they look softer when enlarged.
- **Attribute icons:** the 10 icons in `public/icons/elements/` come from `Gaiiiaaa-GH/ZZZdle-Assets` and are bundled locally. Frost, Auric Ink, Honed Edge and Lumiflux agents use their own icon and page colour (`attribute_variant` in `metadata.json`). Those colours are taken from the dominant colour of each icon.
- **Rank and specialty icons:** `public/icons/rank/` (S, A) and `public/icons/specialties/` (Stun, Anomaly, Attack, Defense, Support, Armorer) are the icons you supplied. The Rupture icon was not among them (the Stun icon was sent twice), so it comes from the `ZZZdle-Assets` repo, resized to match. Replace `public/icons/specialties/rupture.png` if you have the original.
- The image repos only collect art that belongs to HoYoverse. Check their notices if you plan to redistribute.

## 4. W-Engines (`src/data/wengines/*.json`)

- All 102 W-Engines (rarity, specialty, passive text and values, Base ATK or DEF and advanced stat at level 60) come from the Prydwen W-Engines page you supplied (updated 10 Nov 2026). Specialties are now confirmed by that page: Neon Fantasies is Stun and Tremor Trigram Vessel is Defense. Incarcerating Grip (Attack, S) is new.
- Passive names (for example "Energetic Strike") are kept from the earlier Icy Veins data where it had one. The Prydwen page has no passive names, so newer W-Engines such as Plume of Rebirth and Incarcerating Grip have none.
- Two values on the Prydwen page look wrong and the earlier values were kept: [Magnetic Storm] Bravo (page shows 356 Base ATK and 0 Anomaly Proficiency; kept 475 and 60) and [Vortex] Hatchet (page shows 16% Energy Regen; kept 40%).
- **Candlelit Scheme** (A-rank Armorer W-Engine, Spooky Funhouse Tales event) comes from the Game8 page you supplied. Its image is the 400 px `candlelight-scheme` icon from the image repo, larger than the other bundled icons. Its S3 and S4 values were "TBD" on that page and follow the standard progression.
- Agents can equip W-Engines of any specialty. An off-specialty W-Engine only gives its stats and its passive does not work, so the site adds a "Stat stick" note to those entries automatically.
- Only level 60 stats exist. `level_1` is not set.
- `source` is set only for Electro-Lip Gloss (Battle Pass), Rainforest Gourmet and Weeping Gemini (Craftable). All others show "Not specified".
- `version_released` is not set for any W-Engine.
- Slice of Time lists four separate value groups; they are shown as `a | b | c | d` per superimposition, as on Prydwen.

## 5. Drive Disc sets (`src/data/discs/disc_sets.json`)

- The 30 sets, their 2-piece and 4-piece effects and rarity (all S) come from the Prydwen Drive Disk Sets page you supplied (updated 9 Sep 2026). 13 effect texts changed compared to the earlier data.
- `tags` (used by the filters) were assigned by hand from each set's effect, not sourced.
- `version_released` is not set for any set.

## 6. Roster

- Roster is complete up to Severian Lowell (3.3, released 11 November 2026). Kafka and Robin (3.4 collaboration) are unconfirmed.
- Attributes follow the base attribute only: Frost agents are under `ice`, Auric Ink under `ether` and Honed Edge under `physical`. The variant is kept as `attribute_variant` in each `metadata.json` and is not shown on the site. Lumiflux (Remielle Dan) is the only separate attribute folder.
- `version_released` and `faction` come from one third-party list (METAMMO). Not cross-checked. Severian's faction (Metropolitan Order Division) was supplied by you.
- `release_date` in each `metadata.json` comes from the Game8 "New and Upcoming Characters" table. The 15 launch agents are all dated 2024-07-04 (launch day), which is not in that table. The "Release date" sort uses this date, newest first, so agents from the same version are ordered by banner phase.
- Display names follow that list (for example `Nekomiya Mana`, `Alexandrina Sebastiane`). Edit `src/i18n/en/characters.json` to change them.

## 7. Site text

- `src/content/site/faq.json` and `privacy-policy.json` are short generic text. Replace with your own.
- `src/content/site/credits.json` lists the sources used. Add your own contributors.
- `src/content/site/changelog.json` has two entries. The first group version controls the "Recently updated" filter, so keep it equal to the `last_updated` of the newest build (now `3.3`).
- `src/data/translation-aliases.json` is empty. `src/i18n/en/notes.json` only has the two WIP headings.

## 8. Project-level decisions

- English only. The i18n structure is kept, but the other languages were dropped.
- Removed from the Genshin base: the feedback form and page, the `api/` folder, the project-sync script and the asset-download script.
- Disc substats use `pen-flat` (Flat PEN). Prydwen's "PEN" substat is the flat stat; PEN Ratio is a Disc 5 main stat only. Earlier builds used `pen` in substats by mistake and were corrected.
- Rank is stored as numbers (5 = S, 4 = A, 3 = B) and shown as letters.
- Deployment: set `SITE` and `BASE` in the build command (see README).
- Not used as a source: a Joytify W-Engine table that listed wrong signature engines.

## 9. Data sources

- Release dates: Game8 "New and Upcoming Characters"; Candlelit Scheme: Game8 W-Engine guide supplied by you
- Roster: METAMMO "Zenless Zone Zero Characters: All Agents List" (20 October 2026)
- Drive Discs and W-Engines: Prydwen pages supplied by you (W-Engines updated 10 Nov 2026, Drive Disk Sets 9 Sep 2026)
- Builds: Prydwen (Miyabi, Phoenix, Alice, Yixuan, Velina, Remielle, Ye Shunguang, Astra Yao, Aria, Soldier 0 - Anby, Anton, Anby, Cissia, Burnice, Starlight Billy and Banyue, user supplied); Icy Veins guides (Roxy, Claret); GenshinBuilds ZZZ pages (Promeia, Plume of Rebirth). Notes are paraphrased.
- Images: Prydwen pages supplied by you (W-Engines and Drive Discs), Gaiiiaaa-GH/ZZZdle-Assets (agent portraits and attribute icons)
