import path from 'path';
import translationAliases from '../data/translation-aliases.json';
import {
  getBestBuildUsage,
  getWipNoteItems,
  type BuildUsage,
} from './build-usage';
import { loadJSON, readJSONFile } from './content';
import { getLocale, t } from './i18n';
import { resolveWEngineAssetImage } from './item-assets';
import {
  formatWEnginePassive,
  type WEnginePassiveText,
  type WEnginePassiveValue,
} from './wengine-passive';
import { getWEngineSource } from './wengine-source';

/**
 * WEngine type files that make up the shared wengine data source.
 */
const specialties = [
  'attack',
  'stun',
  'anomaly',
  'support',
  'defense',
  'rupture',
  'armorer',
] as const;

/**
 * Refinement levels rendered as selectable passive descriptions.
 */
const refinements = [1, 2, 3, 4, 5] as const;

/**
 * Translation aliases relevant to canonicalizing wengine recommendation IDs.
 */
type TranslationAliasCategory = Partial<
  Record<'wengine', Record<string, string>>
>;

/**
 * Shared alias lookup used to resolve legacy wengine IDs before indexing usage.
 */
const aliases = translationAliases as TranslationAliasCategory;

/**
 * Raw wengine record loaded from a type-specific wengine JSON file.
 */
type SharedWEngineData = {
  rarity: number;
  source?: string;
  version_released?: string;
  passive?: WEnginePassiveText;
  r1?: WEnginePassiveValue[];
  r2?: WEnginePassiveValue[];
  r3?: WEnginePassiveValue[];
  r4?: WEnginePassiveValue[];
  r5?: WEnginePassiveValue[];
  substat?: string;
  base_stat?: string;
  image?: string;
  level_1?: {
    base_attack?: number;
    substat_value?: string;
  };
  level_max?: {
    base_attack?: number;
    substat_value?: string;
  };
};

/**
 * Translates a wengine acquisition source with normalized source fallback.
 *
 * @param locale Locale dictionary bundle used for UI source labels.
 * @param source Raw wengine source value from the data file.
 * @returns Localized source label, or the normalized source name.
 */
function translateWEngineSource(locale: any, source?: string) {
  const normalizedSource = getWEngineSource(source);
  const sourceTranslationKey = `WEngine source ${normalizedSource}`;
  const translatedSource = t(
    locale,
    'ui',
    sourceTranslationKey,
    undefined,
    false,
  );

  return translatedSource && translatedSource !== sourceTranslationKey
    ? translatedSource
    : normalizedSource;
}

/**
 * Extracts and canonicalizes the wengine ID from one recommendation item.
 *
 * Recommendation files support both legacy string entries and object entries
 * with a `name` field, so this keeps the ranking index aligned with the
 * character page loader.
 *
 * @param item Raw wengine recommendation item from a `wengines.json` ranking.
 * @returns Canonical wengine ID, or null when the item is not usable.
 */
function normalizeWEngineItemId(item: any) {
  const wengineId = typeof item === 'string' ? item : item?.name;

  if (typeof wengineId !== 'string' || !wengineId.trim()) {
    return null;
  }

  return aliases.wengine?.[wengineId] ?? wengineId;
}

/**
 * Builds a reverse index of wengines that appear in best-role ranking lists.
 *
 * Only builds marked `best: true` and their ordered `wengines` ranking groups
 * are counted. Conditional options and wengine IDs that only appear inside note
 * text are intentionally skipped.
 *
 * @param locale Locale dictionary bundle used for character display names.
 * @param lang Active language code used for character links.
 * @returns WEngine IDs mapped to the characters that rank them.
 */
function getWEngineRankingUsage(locale: any, lang: string) {
  return getBestBuildUsage(locale, lang, (buildPath, buildNotes) => [
    ...(loadJSON(buildPath, 'wengines.json')?.wengines ?? []).flatMap(
      (group: any, index: number) =>
        (group.items ?? []).map((item: any) => ({
          id: normalizeWEngineItemId(item),
          rank: index + 1,
        })),
    ),
    ...getWipNoteItems(
      buildNotes,
      'wengine',
      'wengine',
      (id) => aliases.wengine?.[id] ?? id,
    ),
  ]);
}

/**
 * Loads, localizes, and flattens every wengine entry across all wengine types.
 *
 * The returned objects include display labels, table values, filter metadata,
 * and pre-rendered passive HTML for each refinement level.
 *
 * @param locale Locale dictionary bundle used for names and labels.
 * @param lang Active language code used for passive text formatting.
 * @param rankingUsageByWEngine Character usage index keyed by wengine ID.
 * @returns Localized wengine card entries.
 */
function getWEngineEntries(
  locale: any,
  lang: string,
  rankingUsageByWEngine: Map<string, BuildUsage[]>,
) {
  const wengineDataPath = path.resolve('src/data/wengines');

  return specialties.flatMap((type) => {
    const filePath = path.join(wengineDataPath, `${type}.json`);
    const typeData = readJSONFile(filePath) as Record<string, SharedWEngineData>;
    const typeLabel = t(locale, 'ui', type, undefined, false);

    return Object.entries(typeData).map(([id, info]) => {
      const substatName = info.substat
        ? t(locale, 'stat', info.substat, undefined, false)
        : '';

      return {
        id,
        image: resolveWEngineAssetImage(type, id),
        name: t(locale, 'wengine', id, undefined, false),
        rarity: info.rarity,
        source: getWEngineSource(info.source),
        type,
        typeLabel,
        versionReleased: info.version_released ?? '',
        sourceName: translateWEngineSource(locale, info.source),
        rankingUsage: rankingUsageByWEngine.get(id) ?? [],
        substat: info.substat ?? '',
        substatName,
        baseStat: info.base_stat ?? 'atk',
        level1BaseAttack: String(info.level_1?.base_attack ?? ''),
        levelMaxBaseAttack: String(info.level_max?.base_attack ?? ''),
        level1Substat: String(info.level_1?.substat_value ?? ''),
        levelMaxSubstat: String(info.level_max?.substat_value ?? ''),
        passivePanels: info.passive
          ? refinements.map((refinement) => ({
              refinement,
              html: formatWEnginePassive(info, refinement, lang),
            }))
          : [],
      };
    });
  });
}

/**
 * Builds the localized wengine browser data used by the wengines page.
 *
 * @param lang Requested language code. Defaults to English.
 * @returns Locale, sorted wengines, and filter option data.
 */
export function getWEngineBrowserData(lang = 'en') {
  const locale = getLocale(lang);
  const rankingUsageByWEngine = getWEngineRankingUsage(locale, lang);
  const wengines = getWEngineEntries(locale, lang, rankingUsageByWEngine).sort(
    (a, b) => a.name.localeCompare(b.name),
  );
  const substats = [...new Set(wengines.map((wengine) => wengine.substat))]
    .filter(Boolean)
    .map((id) => ({
      id,
      label: t(locale, 'stat', id, undefined, false),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const sources = [...new Set(wengines.map((wengine) => wengine.source))]
    .map((id) => ({ id, label: translateWEngineSource(locale, id) }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const rarities = [...new Set(wengines.map((wengine) => wengine.rarity))].sort(
    (a, b) => a - b,
  );

  return {
    lang,
    locale,
    rarities,
    sources,
    substats,
    wengines,
    specialties: specialties.map((type) => ({
      id: type,
      label: t(locale, 'ui', type, undefined, false),
    })),
  };
}
