import path from 'path';
import { getWipNoteItems } from './build-usage';
import { getAllBuildMainStatSlots, type MainStatSlot } from './build-stats';
import {
  loadJSON,
  normalizeVersion,
  readJSONFile,
  toTitleCase,
} from './content';
import { getCharacterBuilds, getContentCharacters } from './content-tree';
import {
  getPublicCharacterSlug,
  getShortCharacterName,
} from './character-slugs';
import {
  canonicalDiscSetId,
  getDiscSetGroups,
  getDiscSetItems,
  normalizeDiscSetItemId,
} from './disc-set-items';
import { getLocale, t } from './i18n';
import { resolveDiscAssetImage } from './item-assets';
import { localizedPath } from './paths';
import { TranslationHelper } from './translator';

export type PlanSetOption = {
  /** `<set id>:<pieces>`; the key stored in the user's plan. */
  key: string;
  setId: string;
  pieces: 2 | 4;
  name: string;
  image: string;
  /** 1 = first recommendation. Undefined for conditional / WIP entries. */
  rank?: number;
  isWip: boolean;
};

/** What a user has chosen for one agent. */
export type AgentPlan = {
  sets: string[];
  stats: Record<string, string[]>;
};

export type AgentPlanEntry = {
  id: string;
  name: string;
  rarity: string;
  element: string;
  elementLabel: string;
  /** Specialty id (attack, stun, ...) and its label; the agent "type". */
  specialty: string;
  specialtyLabel: string;
  /** ISO date; the version is only a fallback when it is missing. */
  releaseDate: string;
  versionReleased: string;
  href: string;
  buildLabel: string;
  sets: PlanSetOption[];
  slots: MainStatSlot[];
  /** First recommendation for every choice; used until the user picks. */
  defaults: AgentPlan;
};

type DiscSetInfo = { image?: string };

/**
 * Collects the set options of one build for one piece count, in
 * recommendation order, without duplicates.
 */
function collectSetOptions(
  data: any,
  buildNotes: any,
  pieces: 2 | 4,
  discData: Record<string, DiscSetInfo>,
  locale: any,
): PlanSetOption[] {
  const rankedKey = pieces === 4 ? 'disc_sets' : 'two_piece_sets';
  const conditionalKey = pieces === 4 ? 'conditional' : 'two_piece_conditional';
  const seen = new Set<string>();
  const options: PlanSetOption[] = [];

  const add = (id: string | null, rank: number | undefined, isWip: boolean) => {
    if (!id || !discData[id] || seen.has(id)) return;

    seen.add(id);
    options.push({
      key: `${id}:${pieces}`,
      setId: id,
      pieces,
      name: t(locale, 'disc', id, undefined, false),
      image: resolveDiscAssetImage(id, discData[id].image),
      rank,
      isWip,
    });
  };

  getDiscSetGroups(data, rankedKey, conditionalKey).forEach(({ group, rank }) =>
    getDiscSetItems(group)
      .filter((item) => Number(item?.pieces) === pieces)
      .forEach((item) => add(normalizeDiscSetItemId(item), rank, false)),
  );

  // Sets the build only flags as work in progress. Kept last, never a default.
  if (pieces === 4) {
    getWipNoteItems(buildNotes, 'disc', 'set', canonicalDiscSetId).forEach(
      ({ id }) => add(id, undefined, true),
    );
  }

  return options;
}

/**
 * Builds the planner data for every agent: the sets and main stats its best
 * build recommends, and the default choice (the first recommendation).
 *
 * The same source feeds the Drive Disc sets page, so both pages agree on
 * which sets and stats exist.
 */
export function getAgentPlanData(lang = 'en'): AgentPlanEntry[] {
  const locale = getLocale(lang);
  const translator = new TranslationHelper(locale, {}, lang);
  const discData = readJSONFile(
    path.resolve('src/data/discs/disc_sets.json'),
  ) as Record<string, DiscSetInfo>;

  return getContentCharacters()
    .map((character): AgentPlanEntry | null => {
      const builds = getCharacterBuilds(character.characterPath);
      const build = builds.find(
        (item) => loadJSON(item.path, 'build-notes.json')?.best === true,
      );

      if (!build) return null;

      const id = getPublicCharacterSlug(character);
      const metadata = readJSONFile(character.metadataPath) ?? {};
      const specialty = String(metadata.specialty ?? '');
      const buildNotes = loadJSON(build.path, 'build-notes.json');
      const setsData = loadJSON(build.path, 'discs-sets.json');
      const sets = [
        ...collectSetOptions(setsData, buildNotes, 4, discData, locale),
        ...collectSetOptions(setsData, buildNotes, 2, discData, locale),
      ];
      // All main stats per slot, the build's recommendations first.
      const slots = getAllBuildMainStatSlots(locale, translator, build.path);
      const firstSet = (pieces: 2 | 4) =>
        sets.find((set) => set.pieces === pieces && !set.isWip)?.key;

      return {
        id,
        name: getShortCharacterName(locale, character),
        rarity: character.rarity,
        element: character.element,
        elementLabel: t(locale, 'element', character.element, undefined, false),
        specialty,
        specialtyLabel: specialty
          ? t(locale, 'ui', specialty, undefined, false)
          : '',
        releaseDate:
          typeof metadata.release_date === 'string' ? metadata.release_date : '',
        versionReleased: normalizeVersion(metadata.version_released),
        href: `${localizedPath(lang, id)}?build=${encodeURIComponent(build.name)}`,
        buildLabel: translator.translateNoteText(
          buildNotes?.name?.[lang] ??
            buildNotes?.name?.en ??
            toTitleCase(build.name),
        ),
        sets,
        slots,
        defaults: {
          sets: [firstSet(4), firstSet(2)].filter(
            (key): key is string => !!key,
          ),
          stats: Object.fromEntries(
            slots.map((slot) => [
              slot.key,
              slot.stats
                .filter((s) => s.rank > 0)
                .slice(0, 1)
                .map((s) => s.id),
            ]),
          ),
        },
      };
    })
    .filter((entry): entry is AgentPlanEntry => entry !== null)
    .sort(
      (a, b) =>
        a.elementLabel.localeCompare(b.elementLabel) ||
        Number(b.rarity) - Number(a.rarity) ||
        a.name.localeCompare(b.name),
    );
}
