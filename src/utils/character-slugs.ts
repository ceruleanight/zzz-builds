type CharacterSlugParts = {
  character: string;
  element?: string;
};

/**
 * Every Zenless Zone Zero agent has exactly one content folder, so the public
 * slug is the folder name.
 */
export function getPublicCharacterSlug({ character }: CharacterSlugParts) {
  return character;
}

/**
 * Converts a public URL slug back into the content folder lookup parts.
 */
export function parsePublicCharacterSlug(slug: string): CharacterSlugParts {
  return { character: slug.toLowerCase() };
}

/**
 * Builds the display name that matches a public character slug.
 */
export function getPublicCharacterName(
  locale: any,
  { character }: CharacterSlugParts,
) {
  return locale?.character?.[character] ?? character;
}

/**
 * Builds the name shown in agent lists, matching how the agent appears in game.
 * Falls back to the full name when no short name is defined.
 */
export function getShortCharacterName(
  locale: any,
  { character, element }: CharacterSlugParts,
) {
  return (
    locale?.characterShort?.[character] ??
    getPublicCharacterName(locale, { character, element })
  );
}
