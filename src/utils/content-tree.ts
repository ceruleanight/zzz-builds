import fs from 'node:fs';
import path from 'node:path';
import { normalizeVersion, readJSONFile } from './content';

export type ContentCharacter = {
  element: string;
  rarity: string;
  character: string;
  characterPath: string;
  metadataPath: string;
};

/**
 * Fails loudly when the same agent exists in two attribute folders.
 *
 * This usually happens after extracting a newer copy of the project over an
 * older one: files that were moved are not removed, so the old folder stays
 * behind and the agent shows up twice.
 */
function assertNoDuplicateCharacters(contentPath: string) {
  const seen = new Map<string, string[]>();

  for (const element of fs.readdirSync(contentPath, { withFileTypes: true })) {
    if (!element.isDirectory() || element.name === 'site') continue;

    const elementPath = path.join(contentPath, element.name);

    for (const rarity of fs.readdirSync(elementPath, { withFileTypes: true })) {
      if (!rarity.isDirectory()) continue;

      const rarityPath = path.join(elementPath, rarity.name);

      for (const character of fs.readdirSync(rarityPath, {
        withFileTypes: true,
      })) {
        const characterPath = path.join(rarityPath, character.name);

        if (
          !character.isDirectory() ||
          !fs.existsSync(path.join(characterPath, 'metadata.json'))
        ) {
          continue;
        }

        seen.set(character.name, [
          ...(seen.get(character.name) ?? []),
          characterPath,
        ]);
      }
    }
  }

  const duplicates = [...seen.entries()].filter(
    ([, paths]) => paths.length > 1,
  );

  if (duplicates.length > 0) {
    throw new Error(
      [
        'Agents exist in more than one content folder. Delete the old copy of each:',
        ...duplicates.map(
          ([name, paths]) => `  ${name}:\n    ${paths.join('\n    ')}`,
        ),
      ].join('\n'),
    );
  }
}

export function getContentCharacters(
  contentPath = path.resolve('src/content'),
  includeWip = false,
): ContentCharacter[] {
  if (!fs.existsSync(contentPath)) return [];

  assertNoDuplicateCharacters(contentPath);

  return fs
    .readdirSync(contentPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'site')
    .flatMap((element) =>
      fs
        .readdirSync(path.join(contentPath, element.name), {
          withFileTypes: true,
        })
        .filter((entry) => entry.isDirectory())
        .flatMap((rarity) =>
          fs
            .readdirSync(path.join(contentPath, element.name, rarity.name), {
              withFileTypes: true,
            })
            .filter((entry) => entry.isDirectory())
            .flatMap((character) => {
              const characterPath = path.join(
                contentPath,
                element.name,
                rarity.name,
                character.name,
              );
              const metadataPath = path.join(characterPath, 'metadata.json');

              if (!fs.existsSync(metadataPath)) return [];

              const metadata = readJSONFile(metadataPath);
              const defaultLastUpdated = normalizeVersion(
                metadata?.last_updated,
              );
              const buildLastUpdatedValues = getCharacterBuilds(
                characterPath,
              ).map((build) => {
                const buildNotesPath = path.join(
                  build.path,
                  'build-notes.json',
                );
                const buildNotes = fs.existsSync(buildNotesPath)
                  ? readJSONFile(buildNotesPath)
                  : null;

                return (
                  normalizeVersion(buildNotes?.last_updated) ||
                  defaultLastUpdated
                );
              });
              const lastUpdatedValues =
                buildLastUpdatedValues.length > 0
                  ? buildLastUpdatedValues
                  : [defaultLastUpdated];
              const isWip = lastUpdatedValues.every(
                (lastUpdated) => lastUpdated.toUpperCase() === 'WIP',
              );

              return isWip && !includeWip
                ? []
                : [
                    {
                      element: element.name,
                      rarity: rarity.name,
                      character: character.name,
                      characterPath,
                      metadataPath,
                    },
                  ];
            }),
        ),
    );
}

export function getCharacterBuilds(characterPath: string) {
  return fs
    .readdirSync(characterPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      path: path.join(characterPath, entry.name),
    }));
}
