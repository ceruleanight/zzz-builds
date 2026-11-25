import translationAliases from '../data/translation-aliases.json';

/**
 * Translation aliases relevant to canonicalizing disc set recommendation IDs.
 */
type TranslationAliasCategory = Partial<Record<'set', Record<string, string>>>;

const aliases = translationAliases as TranslationAliasCategory;

/**
 * Maps a set ID written in a build file to its canonical disc set ID.
 */
export function canonicalDiscSetId(id: string) {
  return aliases.set?.[id] ?? id;
}

/**
 * Extracts a canonical set ID from one disc recommendation item.
 *
 * @param item Raw disc set item from `discs-sets.json`.
 * @returns Canonical disc set ID, or null when the item is unusable.
 */
export function normalizeDiscSetItemId(item: any) {
  const setId = item?.name;

  if (typeof setId !== 'string' || !setId.trim()) {
    return null;
  }

  return canonicalDiscSetId(setId);
}

/**
 * Returns every direct item list attached to one disc recommendation group.
 *
 * Groups can hold a plain `items` list, nested `choices`, or both.
 *
 * @param group Raw disc recommendation group.
 * @returns Flat list of raw disc set items.
 */
export function getDiscSetItems(group: any) {
  const items = Array.isArray(group?.items) ? group.items : [];
  const choiceItems = Array.isArray(group?.choices)
    ? group.choices.flatMap((choice: any) =>
        Array.isArray(choice?.items) ? choice.items : [],
      )
    : [];

  return [...items, ...choiceItems];
}

/**
 * Flattens the ranked and conditional recommendation lists of one build into
 * `{ group, rank }` pairs. Ranked entries carry their 1-based position;
 * conditional entries have no rank.
 */
export function getDiscSetGroups(
  data: any,
  rankedKey: 'disc_sets' | 'two_piece_sets',
  conditionalKey: 'conditional' | 'two_piece_conditional',
): { group: any; rank?: number }[] {
  return [
    ...(data?.[rankedKey]?.flatMap((entry: any, index: number) =>
      (entry.groups ?? []).map((group: any) => ({
        group,
        rank: index + 1,
      })),
    ) ?? []),
    ...(data?.[conditionalKey]?.flatMap((entry: any) =>
      (entry.groups ?? [entry]).map((group: any) => ({ group })),
    ) ?? []),
  ];
}
