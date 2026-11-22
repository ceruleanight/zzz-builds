export type AssetImage = string;

const specialties = [
  'attack',
  'stun',
  'anomaly',
  'support',
  'defense',
  'rupture',
  'armorer',
] as const;

// Optional local images. Local files win; otherwise the `image` URL stored in
// src/data/wengines/<specialty>.json or src/data/discs/disc_sets.json is
// hotlinked. With neither, an empty string is returned and the UI shows a
// placeholder.
const itemUrls = import.meta.glob<string>('/src/assets/item-assets/**/*.webp', {
  eager: true,
  import: 'default',
  query: '?url',
});

function assetUrl(...parts: string[]) {
  return itemUrls[['/src/assets/item-assets', ...parts].join('/')] ?? '';
}

function remoteUrl(remote?: string) {
  return typeof remote === 'string' && /^https:\/\//.test(remote)
    ? remote
    : '';
}

export function resolveWEngineAssetImage(
  type: string,
  id: string,
  remote?: string,
) {
  return assetUrl('wengines', type, `${id}.webp`) || remoteUrl(remote);
}

export function resolveWEngineAssetUrlById(id: string, remote?: string) {
  const type = specialties.find((specialty) =>
    assetUrl('wengines', specialty, `${id}.webp`),
  );

  return type ? assetUrl('wengines', type, `${id}.webp`) : remoteUrl(remote);
}

export function resolveDiscAssetImage(id: string, remote?: string) {
  return assetUrl('discs', `${id}.webp`) || remoteUrl(remote);
}

export function resolveDiscAssetUrl(id: string, remote?: string) {
  return resolveDiscAssetImage(id, remote);
}
