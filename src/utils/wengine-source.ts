const DEFAULT_WENGINE_SOURCE = 'Unspecified';

// W-Engines that can be obtained without a limited Signal Search banner.
const FREE_WENGINE_SOURCES = new Set(['Craftable', 'Shop', 'Battle Pass', 'Event']);

export function getWEngineSource(source?: string) {
  return source || DEFAULT_WENGINE_SOURCE;
}

export function isFreeWEngineSource(source?: string) {
  return FREE_WENGINE_SOURCES.has(source ?? '');
}
