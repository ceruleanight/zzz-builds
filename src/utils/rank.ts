/**
 * Zenless Zone Zero uses letter ranks instead of stars. Content folders and
 * data files keep the numeric values 5 (S), 4 (A) and 3 (B).
 */
export function rankLabel(rarity: number | string) {
  const value = Number(rarity);

  if (value >= 5) return 'S';
  if (value === 4) return 'A';

  return 'B';
}
