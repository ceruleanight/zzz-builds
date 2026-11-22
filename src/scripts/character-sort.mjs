const compareText = (left, right) => left.localeCompare(right);
const versionNumber = (version) => {
  const match = String(version ?? '').match(/^\s*(\d+)\.(\d+)/);

  if (!match) {
    return Number.NEGATIVE_INFINITY;
  }

  return Number(match[1]) * 100 + Number(match[2]);
};
const compareVersionNewest = (left, right) =>
  versionNumber(right) - versionNumber(left);
const value = (card, name) => card.dataset[name] ?? '';

export function compareCharacterCards(left, right, sort) {
  const byName = compareText(value(left, 'name'), value(right, 'name'));

  if (sort === 'name') return byName;
  if (sort === 'rarity') {
    return (
      Number(value(right, 'rarity')) - Number(value(left, 'rarity')) || byName
    );
  }
  if (sort === 'release') {
    // Newest release date first. The exact date separates the two banner
    // phases of the same version; the version is only a fallback.
    return (
      value(right, 'releaseDate').localeCompare(value(left, 'releaseDate')) ||
      compareVersionNewest(
        value(left, 'versionReleased'),
        value(right, 'versionReleased'),
      ) ||
      byName
    );
  }
  if (sort === 'updated') {
    return (
      compareVersionNewest(
        value(left, 'lastUpdated'),
        value(right, 'lastUpdated'),
      ) || byName
    );
  }

  const property = sort === 'specialty' ? 'specialty' : 'element';
  return compareText(value(left, property), value(right, property)) || byName;
}
