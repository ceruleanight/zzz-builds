import { loadJSON } from './content';
import { t } from './i18n';
import { TranslationHelper } from './translator';

const mainStatSlots = [
  { key: 'disc4', label: 'Disc 4' },
  { key: 'disc5', label: 'Disc 5' },
  { key: 'disc6', label: 'Disc 6' },
] as const;

export type MainStatOption = {
  /** Raw stat key from the build file. Language independent, safe to store. */
  id: string;
  label: string;
  /** 1 = most recommended. 0 = not recommended by the build (still selectable). */
  rank: number;
};

/** Every main stat the game allows on each variable disc slot. */
const selectableMainStats: Record<'disc4' | 'disc5' | 'disc6', string[]> = {
  disc4: ['atk%', 'hp%', 'def%', 'cr', 'cd', 'ap'],
  disc5: [
    'atk%',
    'hp%',
    'def%',
    'pen',
    'physical-dmg',
    'fire-dmg',
    'ice-dmg',
    'electric-dmg',
    'ether-dmg',
  ],
  disc6: ['atk%', 'hp%', 'def%', 'impact', 'am', 'er'],
};

export type MainStatSlot = {
  key: 'disc4' | 'disc5' | 'disc6';
  label: string;
  stats: MainStatOption[];
  value: string;
};

/**
 * Returns the raw, language independent key of a stat entry.
 */
export function statId(item: any) {
  const name = typeof item === 'string' ? item : item?.name;

  return typeof name === 'string' ? name : '';
}

/**
 * Reads a stat entry (a plain ID, `{ name }`, or a name containing inline
 * `[[stat:id]]` tokens) and returns its plain display text.
 */
export function statName(
  locale: any,
  translator: TranslationHelper,
  item: any,
) {
  const name = typeof item === 'string' ? item : item?.name;

  if (typeof name !== 'string') return '';

  return name.includes('[[')
    ? translator.translateNoteText(name)
    : t(locale, 'stat', name, undefined, false);
}

/**
 * Returns the recommended main stats for Discs 4, 5 and 6 of a build.
 * Slots without a recommendation are left out.
 */
export function getBuildMainStatSlots(
  locale: any,
  translator: TranslationHelper,
  buildPath: string,
): MainStatSlot[] {
  const mainStats = loadJSON(buildPath, 'discs-mainstats.json')?.main_stats;

  return mainStatSlots
    .map(({ key, label }) => {
      // Array order is the recommendation order, so index + 1 is the rank.
      const stats: MainStatOption[] = (mainStats?.[key] ?? [])
        .map((item: any, index: number) => ({
          id: statId(item),
          label: statName(locale, translator, item),
          rank: index + 1,
        }))
        .filter((stat: MainStatOption) => stat.id && stat.label);

      return {
        key,
        label: t(locale, 'ui', label, undefined, false),
        stats,
        value: stats.map((stat) => stat.label).join(' / '),
      };
    })
    .filter((slot) => slot.value);
}

/**
 * Like getBuildMainStatSlots, but every slot offers all main stats the game
 * allows. The build's recommendations come first, in recommendation order
 * (rank 1, 2, ...); the remaining stats follow with rank 0.
 * Slots are always returned, even when the build recommends nothing for them.
 */
export function getAllBuildMainStatSlots(
  locale: any,
  translator: TranslationHelper,
  buildPath: string,
): MainStatSlot[] {
  const recommended = new Map(
    getBuildMainStatSlots(locale, translator, buildPath).map((slot) => [
      slot.key,
      slot,
    ]),
  );

  return mainStatSlots.map(({ key, label }) => {
    const base = recommended.get(key);
    const ranked = base?.stats ?? [];
    const taken = new Set(ranked.map((stat) => stat.id));
    const extras: MainStatOption[] = selectableMainStats[key]
      .filter((id) => !taken.has(id))
      .map((id) => ({
        id,
        label: t(locale, 'stat', id, undefined, false),
        rank: 0,
      }))
      .filter((stat) => stat.label);

    return {
      key,
      label: t(locale, 'ui', label, undefined, false),
      stats: [...ranked, ...extras],
      value: base?.value ?? '',
    };
  });
}
