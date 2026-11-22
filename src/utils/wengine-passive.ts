export type WEnginePassiveValue = number | number[];

type LocalizedPassiveText = {
  en: string;
  [lang: string]: string | undefined;
};

export type WEnginePassiveText = string | LocalizedPassiveText;

type WEngineRefinementData = {
  passive?: WEnginePassiveText;
  r1?: WEnginePassiveValue[];
  r2?: WEnginePassiveValue[];
  r3?: WEnginePassiveValue[];
  r4?: WEnginePassiveValue[];
  r5?: WEnginePassiveValue[];
};

const REFINEMENT_KEYS = ['r1', 'r2', 'r3', 'r4', 'r5'] as const;

/**
 * Wraps one passive value so popovers can style substituted numbers.
 */
function formatPassiveValue(value: WEnginePassiveValue | undefined) {
	const text = Array.isArray(value) ? value.join('/') : String(value ?? '');

	return `<span class="wengine-popover-passive-value">${text}</span>`;
}

/**
 * Selects the localized passive template with English fallback.
 */
function getPassiveText(passive: WEnginePassiveText | undefined, lang = 'en') {
  if (typeof passive === 'string') {
    return passive;
  }

  return passive?.[lang] ?? passive?.en ?? '';
}

/**
 * Extracts a valid refinement number from content values like `1` or `R1`.
 */
function parseRefinement(refinement?: number | string) {
  const match = String(refinement ?? '').match(/[1-5]/);
  return match ? Number(match[0]) : null;
}

/**
 * Builds a compact all-refinement value string for one placeholder.
 */
function getCombinedValue(info: WEngineRefinementData, valueIndex: number) {
  const values = REFINEMENT_KEYS.map((key) => info[key]?.[valueIndex]);
  const separator = values.some(Array.isArray) ? ' / ' : '/';

  return values
    .map((value) =>
      Array.isArray(value)
        ? `(${formatPassiveValue(value)})`
        : formatPassiveValue(value),
    )
    .join(separator);
}

/**
 * Replaces passive placeholders with either one refinement's values or all
 * refinement values when no specific refinement is available.
 */
export function formatWEnginePassive(
  info: WEngineRefinementData,
  refinement?: number | string,
  lang = 'en',
) {
  const passive = getPassiveText(info.passive, lang);
  const selectedRefinement = parseRefinement(refinement);
  let valueIndex = 0;

  return passive.replace(/\{\{value\}\}/g, () => {
    const index = valueIndex;
    valueIndex += 1;

    if (selectedRefinement) {
      const refinementKey = `r${selectedRefinement}` as (typeof REFINEMENT_KEYS)[number];
      return formatPassiveValue(info[refinementKey]?.[index]);
    }

    return getCombinedValue(info, index);
  });
}
