import {
  getShortCharacterName,
  getPublicCharacterSlug,
} from './character-slugs';
import { loadJSON } from './content';
import { getCharacterBuilds, getContentCharacters } from './content-tree';
import { localizedPath } from './paths';

export type BuildUsage = {
  characterName: string;
  characterRarity: string;
  href: string;
  isWip?: boolean;
  rank?: number;
  /** Folder name of the build this chip links to. */
  buildName: string;
  /** Absolute path of that build folder, used to read its stat recommendations. */
  buildPath: string;
};

type BuildUsageItem = {
  id: string | null;
  isWip?: boolean;
  rank?: number;
};

function collectStrings(value: any): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(collectStrings);
  }

  return [];
}

export function getWipNoteItems(
  buildNotes: any,
  noteKind: 'wengine' | 'disc',
  itemKind: 'wengine' | 'set',
  normalizeId: (id: string) => string,
): BuildUsageItem[] {
  const heading = `## [[note:wip-${noteKind}]]`;

  return collectStrings(buildNotes)
    .filter((note) => note.replaceAll('\r\n', '\n').startsWith(heading))
    .flatMap((note) =>
      [...note.matchAll(new RegExp(String.raw`\[\[${itemKind}:([^|\]]+)`, 'g'))]
        .map((match) => ({
          id: normalizeId(match[1].trim()),
          isWip: true,
        })),
    );
}

export function getBestBuildUsage(
  locale: any,
  lang: string,
  getItems: (buildPath: string, buildNotes: any) => BuildUsageItem[],
) {
  const usageByItem = new Map<string, BuildUsage[]>();

  for (const character of getContentCharacters()) {
    const characterName = getShortCharacterName(locale, character);
    const characterHref = localizedPath(
      lang,
      getPublicCharacterSlug(character),
    );

    for (const build of getCharacterBuilds(character.characterPath)) {
      const buildNotes = loadJSON(build.path, 'build-notes.json');

      if (buildNotes?.best !== true) continue;

      const href = `${characterHref}?build=${encodeURIComponent(build.name)}`;

      for (const { id, isWip, rank } of getItems(build.path, buildNotes)) {
        if (!id) continue;

        const usage = usageByItem.get(id) ?? [];
        const existing = usage.find((item) =>
          item.href.startsWith(`${characterHref}?`),
        );

        if (!existing) {
          usage.push({
            characterName,
            characterRarity: character.rarity,
            href,
            isWip,
            rank,
            buildName: build.name,
            buildPath: build.path,
          });
        } else if (existing.isWip && !isWip) {
          Object.assign(existing, {
            href,
            isWip,
            rank,
            buildName: build.name,
            buildPath: build.path,
          });
        } else if (
          existing.isWip === isWip &&
          rank !== undefined &&
          (existing.rank === undefined || rank < existing.rank)
        ) {
          Object.assign(existing, {
            href,
            rank,
            buildName: build.name,
            buildPath: build.path,
          });
        }

        usageByItem.set(id, usage);
      }
    }
  }

  for (const usage of usageByItem.values()) {
    usage.sort(
      (a, b) =>
        Number(!!a.isWip) - Number(!!b.isWip) ||
        a.characterName.localeCompare(b.characterName),
    );
  }

  return usageByItem;
}
