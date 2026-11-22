type CharacterAssetKind = 'image' | 'portrait';

type CharacterAssetContext = {
  element: string;
  rarity: string;
  character: string;
};

const assetFileNames: Record<CharacterAssetKind, string> = {
  image: 'splash_art.webp',
  portrait: 'portrait.webp',
};

// Optional local images. A file at
// src/assets/character-assets/<attribute>/<rank>/<agent>/portrait.webp wins.
// Otherwise the `portrait` / `image` URL in metadata.json is hotlinked. With
// neither, the UI renders a text placeholder.
const localImages = import.meta.glob<string>(
  '/src/assets/character-assets/**/*.webp',
  { eager: true, import: 'default', query: '?url' },
);

export function resolveCharacterImageUrl(
  context: CharacterAssetContext,
  kind: CharacterAssetKind,
  metadata?: { portrait?: unknown; image?: unknown },
): string {
  const localPath = [
    '/src/assets/character-assets',
    context.element,
    context.rarity,
    context.character,
    assetFileNames[kind],
  ].join('/');

  if (localImages[localPath]) return localImages[localPath];

  // When `image` and `portrait` point at the same file, reuse the local portrait.
  if (
    kind === 'image' &&
    typeof metadata?.image === 'string' &&
    metadata.image === metadata.portrait
  ) {
    const portraitPath = [
      '/src/assets/character-assets',
      context.element,
      context.rarity,
      context.character,
      assetFileNames.portrait,
    ].join('/');

    if (localImages[portraitPath]) return localImages[portraitPath];
  }

  const remote = kind === 'image' ? metadata?.image : metadata?.portrait;

  return typeof remote === 'string' && /^https:\/\//.test(remote)
    ? remote
    : '';
}
