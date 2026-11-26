import path from 'path';
import {
  getBestBuildUsage,
  getWipNoteItems,
  type BuildUsage,
} from './build-usage';
import { loadJSON, readJSONFile, toTitleCase } from './content';
import { getContentCharacters } from './content-tree';
import {
  getPublicCharacterSlug,
  getShortCharacterName,
} from './character-slugs';
import { getLocale, t } from './i18n';
import { TranslationHelper } from './translator';
import { resolveDiscAssetImage } from './item-assets';
import {
  canonicalDiscSetId,
  getDiscSetGroups,
  getDiscSetItems,
  normalizeDiscSetItemId,
} from './disc-set-items';
import { getAgentPlanData } from './agent-plans';
import {
  getAllBuildMainStatSlots,
  getAllSubstats,
  getBuildMainStatSlots,
  getBuildSubstats,
  statName,
} from './build-stats';

const bonusKeys = ['1p', '2p', '4p'] as const;

type LabelRef = readonly [string, string];

const tagOptionGroups = [
  {
    label: ['ui', 'Stat'],
    options: [
      { id: 'atk', label: ['stat', 'atk%'], tags: ['atk'] },
      { id: 'hp', label: ['stat', 'hp%'], tags: ['hp'] },
      { id: 'def', label: ['stat', 'def%'], tags: ['def'] },
      { id: 'crit', label: ['stat', 'cr'], tags: ['crit'] },
      { id: 'anomaly', label: ['stat', 'ap'], tags: ['anomaly-stat'] },
      { id: 'er', label: ['stat', 'er'], tags: ['er'] },
      { id: 'impact', label: ['stat', 'impact'], tags: ['impact'] },
    ],
  },
  {
    label: ['ui', 'Damage Type'],
    options: [
      { id: 'physical', label: ['stat', 'physical-dmg'], tags: ['physical'] },
      { id: 'fire', label: ['stat', 'fire-dmg'], tags: ['fire'] },
      { id: 'ice', label: ['stat', 'ice-dmg'], tags: ['ice'] },
      { id: 'electric', label: ['stat', 'electric-dmg'], tags: ['electric'] },
      { id: 'ether', label: ['stat', 'ether-dmg'], tags: ['ether'] },
      { id: 'wind', label: ['stat', 'wind-dmg'], tags: ['wind'] },
    ],
  },
  {
    label: ['ui', 'Playstyle'],
    options: [
      { id: 'anomaly', label: ['ui', 'Anomaly'], tags: ['anomaly'] },
      { id: 'stun', label: ['ui', 'Stun'], tags: ['stun'] },
      { id: 'support', label: ['ui', 'Support'], tags: ['support'] },
      { id: 'defense', label: ['ui', 'Defense'], tags: ['defense'] },
      { id: 'rupture', label: ['ui', 'Rupture'], tags: ['rupture'] },
      { id: 'attack', label: ['ui', 'Attack'], tags: ['attack'] },
    ],
  },
] as const satisfies readonly {
  label: LabelRef;
  options: readonly {
    id: string;
    label: LabelRef;
    tags: readonly string[];
  }[];
}[];

type TagOption = { id: string; tags: readonly string[] };

const tagGroups: TagOption[] = tagOptionGroups.flatMap(
  (group): TagOption[] => [...group.options],
);

/**
 * Localized bonus text as stored in `disc_sets.json`.
 *
 * English is treated as the fallback language when a requested locale is
 * missing from a bonus entry.
 */
type LocalizedDiscEffect = {
  en?: string;
  [lang: string]: string | undefined;
};

/**
 * Raw disc set record loaded from the shared disc data file.
 */
type DiscSetData = {
  rarity: number;
  version_released?: string;
  image?: string;
  tags?: string[];
  '1p'?: LocalizedDiscEffect;
  '2p'?: LocalizedDiscEffect;
  '4p'?: LocalizedDiscEffect;
};

function getDiscSetTagGroups(tags: string[]) {
  const tagSet = new Set(tags);

  return tagGroups
    .filter((group) => group.tags.some((tag) => tagSet.has(tag)))
    .map((group) => group.id);
}

/**
 * Builds a reverse index of disc sets mentioned as 4-piece options.
 *
 * Only builds marked `best: true` are scanned. Both ranked set rows and
 * conditional set groups are included because the disc page labels this as
 * a 4-piece mention, not a ranking position.
 *
 * @param locale Locale dictionary bundle used for character display names.
 * @param lang Active language code used for character links.
 * @returns Disc set IDs mapped to characters that mention them as 4-piece.
 */
function getDiscSetUsage(
  locale: any,
  lang: string,
  pieces: 2 | 4,
  rankedKey: 'disc_sets' | 'two_piece_sets',
  conditionalKey: 'conditional' | 'two_piece_conditional',
) {
  return getBestBuildUsage(locale, lang, (buildPath, buildNotes) => {
    const data = loadJSON(buildPath, 'discs-sets.json');
    const groups = getDiscSetGroups(data, rankedKey, conditionalKey);

    return [
      ...groups.flatMap(({ group, rank }) =>
        getDiscSetItems(group)
          .filter((item) => Number(item?.pieces) === pieces)
          .map((item) => ({ id: normalizeDiscSetItemId(item), rank })),
      ),
      ...(pieces === 4
        ? getWipNoteItems(
            buildNotes,
            'disc',
            'set',
            canonicalDiscSetId,
          )
        : []),
    ];
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Returns the display name of the build a usage chip links to.
 */
function getUsageBuildName(
  lang: string,
  translator: TranslationHelper,
  usage: BuildUsage,
) {
  const buildNotes = loadJSON(usage.buildPath, 'build-notes.json');

  return translator.translateNoteText(
    buildNotes?.name?.[lang] ?? buildNotes?.name?.en ?? toTitleCase(usage.buildName),
  );
}

function getUsageSlots(
  locale: any,
  translator: TranslationHelper,
  usage: BuildUsage,
) {
  return getBuildMainStatSlots(locale, translator, usage.buildPath);
}

/**
 * Builds the hover card for one character chip: the main stats for the three
 * disc slots that vary (Discs 4, 5 and 6) and the substat priority,
 * taken from the build the chip links to.
 */
function renderUsagePopoverHtml(locale: any, lang: string, usage: BuildUsage) {
  const translator = new TranslationHelper(locale, {}, lang);
  const mainStats = loadJSON(usage.buildPath, 'discs-mainstats.json')?.main_stats;
  const substats = loadJSON(usage.buildPath, 'discs-substats.json')?.substats_priority;

  if (!mainStats && !substats) return '';

  const buildName = getUsageBuildName(lang, translator, usage);

  const slotRows = getUsageSlots(locale, translator, usage)
    .map(
      ({ label, value }) =>
        `<div class="usage-popover-row"><span class="usage-popover-slot">${escapeHtml(
          label,
        )}</span><span class="usage-popover-value">${escapeHtml(value)}</span></div>`,
    )
    .join('');

  const substatChips = (substats ?? [])
    .map((entry: any, index: number) => {
      const items = Array.isArray(entry?.items) ? entry.items : [entry];
      const names = items
        .map((item: any) => statName(locale, translator, item))
        .filter(Boolean);

      return names.length
        ? `<span class="usage-popover-sub"><strong>${index + 1}</strong>${escapeHtml(
            names.join(' \u2248 '),
          )}</span>`
        : '';
    })
    .join('');

  return [
    `<span class="usage-popover-header"><span class="usage-popover-name">${escapeHtml(
      usage.characterName,
    )}</span><span class="usage-popover-build">${escapeHtml(buildName)}</span></span>`,
    slotRows
      ? `<span class="usage-popover-section"><span class="usage-popover-title">${escapeHtml(
          t(locale, 'ui', 'Main Stats', undefined, false),
        )}</span>${slotRows}</span>`
      : '',
    substatChips
      ? `<span class="usage-popover-section"><span class="usage-popover-title">${escapeHtml(
          t(locale, 'ui', 'Substats', undefined, false),
        )}</span><span class="usage-popover-subs">${substatChips}</span></span>`
      : '',
  ].join('');
}

/**
 * Loads and localizes every disc set for the browser grid.
 *
 * The returned entries keep both display data and filter data together so the
 * Astro component can render cards without reaching back into the raw JSON.
 *
 * @param locale Locale dictionary bundle used for set names.
 * @param lang Active language code used for bonus descriptions.
 * @returns Localized disc set card entries.
 */
function getDiscSetEntries(
  locale: any,
  lang: string,
  fourPieceUsageBySet: Map<string, BuildUsage[]>,
  twoPieceUsageBySet: Map<string, BuildUsage[]>,
) {
  const filePath = path.resolve('src/data/discs/disc_sets.json');
  const discData = readJSONFile(filePath) as Record<
    string,
    DiscSetData
  >;

  const translator = new TranslationHelper(locale, {}, lang);
  const toOwnedUsage = (usage: BuildUsage, pieces: 2 | 4) => ({
    characterId: usage.characterId,
    characterName: usage.characterName,
    characterRarity: usage.characterRarity,
    href: usage.href,
    isWip: usage.isWip ?? false,
    pieces,
    // All selectable main stats, so stats a user picked on the My agents page
    // that the build does not recommend (rank 0) still show up here.
    slots: getAllBuildMainStatSlots(locale, translator, usage.buildPath).map(
      ({ key, label, stats }) => ({ key, label, stats }),
    ),
    substats: getBuildSubstats(locale, translator, usage.buildPath),
  });

  return Object.entries(discData).map(([id, info]) => {
    const fourPiece = fourPieceUsageBySet.get(id) ?? [];
    const twoPiece = twoPieceUsageBySet.get(id) ?? [];
    const bonuses = bonusKeys
      .map((key) => ({
        id: key,
        label: key.toUpperCase(),
        html: info[key]?.[lang] ?? info[key]?.en ?? '',
      }))
      .filter((bonus) => bonus.html);

    return {
      id,
      image: resolveDiscAssetImage(id, info.image),
      name: t(locale, 'disc', id, undefined, false),
      rarity: info.rarity,
      versionReleased: info.version_released ?? '',
      bonuses,
      tags: info.tags ?? [],
      tagGroups: getDiscSetTagGroups(info.tags ?? []),
      fourPieceUsage: fourPiece.map((usage) => ({
        ...usage,
        popoverHtml: renderUsagePopoverHtml(locale, lang, usage),
      })),
      twoPieceUsage: twoPiece.map((usage) => ({
        ...usage,
        popoverHtml: renderUsagePopoverHtml(locale, lang, usage),
      })),
      usageIds: [
        ...new Set([...fourPiece, ...twoPiece].map((usage) => usage.characterId)),
      ],
      ownedUsage: [
        ...fourPiece.map((usage) => toOwnedUsage(usage, 4)),
        ...twoPiece.map((usage) => toOwnedUsage(usage, 2)),
      ],
    };
  });
}

/**
 * Builds the localized disc set browser data used by the disc sets page.
 *
 * @param lang Requested language code. Defaults to English.
 * @returns Locale, sorted disc sets, and filter option data.
 */
export function getDiscSetBrowserData(lang = 'en') {
  const locale = getLocale(lang);
  const fourPieceUsageBySet = getDiscSetUsage(
    locale,
    lang,
    4,
    'disc_sets',
    'conditional',
  );
  const twoPieceUsageBySet = getDiscSetUsage(
    locale,
    lang,
    2,
    'two_piece_sets',
    'two_piece_conditional',
  );
  const discSets = getDiscSetEntries(
    locale,
    lang,
    fourPieceUsageBySet,
    twoPieceUsageBySet,
  ).sort((a, b) => a.name.localeCompare(b.name));
  const rarities = [
    ...new Set(discSets.map((discSet) => discSet.rarity)),
  ].sort((a, b) => a - b);
  const visibleTagOptionGroups = tagOptionGroups
    .map((group) => ({
      label: t(locale, group.label[0], group.label[1], undefined, false),
      options: group.options
        .filter((option) =>
          discSets.some((discSet) =>
            discSet.tagGroups.includes(option.id),
          ),
        )
        .map((option) => ({
          id: option.id,
          label: t(locale, option.label[0], option.label[1], undefined, false),
        })),
    }))
    .filter((group) => group.options.length > 0);

  const characters = getContentCharacters()
    .map((character) => ({
      id: getPublicCharacterSlug(character),
      name: getShortCharacterName(locale, character),
      rarity: character.rarity,
      element: character.element,
      elementLabel: t(locale, 'element', character.element, undefined, false),
    }))
    .sort(
      (a, b) =>
        a.elementLabel.localeCompare(b.elementLabel) ||
        Number(b.rarity) - Number(a.rarity) ||
        a.name.localeCompare(b.name),
    );

  const agentDefaults = Object.fromEntries(
    getAgentPlanData(lang).map((agent) => [agent.id, agent.defaults]),
  );

  return {
    agentDefaults,
    allSubstats: getAllSubstats(locale),
    characters,
    discSets,
    lang,
    locale,
    rarities,
    tagOptionGroups: visibleTagOptionGroups,
  };
}
