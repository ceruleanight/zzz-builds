import { rankLabel } from './rank';
import { formatMissingTranslationWarning, t } from './i18n';
import translationAliases from '../data/translation-aliases.json';
import {
    formatWEnginePassive,
    type WEnginePassiveText,
    type WEnginePassiveValue,
} from './wengine-passive';
import { getWEngineSource } from './wengine-source';
import {
    resolveDiscAssetUrl,
    resolveWEngineAssetUrlById,
} from './item-assets';

type TranslationCategory =
    | 'disc'
    | 'wengine'
    | 'character'
    | 'stat'
    | 'element'
    | 'ability'
    | 'note';
type InlineTranslationCategory = TranslationCategory | 'set';

const CATEGORIES: TranslationCategory[] = [
    'disc',
    'wengine',
    'character',
    'stat',
    'element',
    'ability',
    'note'
];

type SharedWEngineData = {
    rarity: number;
    source?: string;
    passive?: WEnginePassiveText;
    r1?: WEnginePassiveValue[];
    r2?: WEnginePassiveValue[];
    r3?: WEnginePassiveValue[];
    r4?: WEnginePassiveValue[];
    r5?: WEnginePassiveValue[];
    substat?: string;
    base_stat?: string;
    level_max?: {
        base_attack?: number;
        substat_value?: string;
    };
    level_1?: {
        base_attack?: number;
        substat_value?: string;
    };
};

type LocalizedDiscEffect = {
    en?: string;
    [lang: string]: string | undefined;
};

type SharedDiscSetData = {
    rarity: number;
    '1p'?: LocalizedDiscEffect;
    '2p'?: LocalizedDiscEffect;
    '4p'?: LocalizedDiscEffect;
};

type TranslateNoteTextOptions = {
    wenginePopovers?: boolean;
    discPopovers?: boolean;
    rotationPopovers?: boolean;
};

type TranslationAliasCategory = Partial<
    Record<InlineTranslationCategory, Record<string, string>>
>;

const aliases = translationAliases as TranslationAliasCategory;

const INLINE_TRANSLATION_TOKEN_PATTERN =
    /\[\[(?:(set|wengine|character|stat|element|ability|note):)?([a-z0-9%/-]+)(?:\|([^\]\n]+))?\]\]/g;
const ROTATION_POPOVER_INTRO_ID = 'Rotation notation intro';
const ROTATION_POPOVER_NUMBER_INTRO_ID = 'Rotation notation number intro';
const ROTATION_POPOVER_EXAMPLE_ID = 'Rotation notation example';
const ROTATION_POPOVER_ACTION_ROWS = [
    { key: 'A', valueId: 'Rotation notation A' },
    { key: 'E', valueId: 'Rotation notation E' },
    { key: 'Q', valueId: 'Rotation notation Q' },
    { key: 'C', valueId: 'Rotation notation C' },
    { key: 'D', valueId: 'Rotation notation D' },
    { key: 'S', valueId: 'Rotation notation S' },
    { key: '(text)', valueId: 'Rotation notation text' },
] as const;
const ROTATION_POPOVER_NUMBER_ROWS = [
    { key: 'A#', valueId: 'Rotation notation A#' },
    { key: '#[combo]', valueId: 'Rotation notation #[combo]' },
] as const;

/**
 * Escapes dynamic text before inserting it into generated popover HTML.
 */
function escapeHtml(value: unknown) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatLineBreakHtml(value: unknown) {
    return escapeHtml(value).replace(/&lt;br\s*\/?&gt;/gi, '<br>');
}

/**
 * Formats wengine stat values as level 1 / max when both are available.
 */
function formatWEngineStatValue(
    level1Value?: number | string,
    levelMaxValue?: number | string,
) {
    if (level1Value === undefined || level1Value === null || level1Value === '') {
    // Only the level 60 value is sourced for W-Engines, so show it alone.
    return levelMaxValue === undefined || levelMaxValue === null
      ? ''
      : String(levelMaxValue);
  }

    if (
        levelMaxValue === undefined ||
        levelMaxValue === null ||
        levelMaxValue === ''
    ) {
        return String(level1Value);
    }

    return `${level1Value} / ${levelMaxValue}`;
}

/**
 * Translates a wengine source enum while falling back to the stored value.
 */
function translateWEngineSource(locale: any, source?: string) {
    const sourceName = getWEngineSource(source);
    const translationKey = `WEngine source ${sourceName}`;
    const translatedSource = t(locale, 'ui', translationKey, undefined, false);

    return translatedSource === translationKey ? sourceName : translatedSource;
}

/**
 * Helper class for translating structured content IDs and inline note references.
 *
 * Supports:
 * - translating disc set/wengine/character/stat/element IDs
 * - parsing inline note syntax like [[wengine:amos-bow]]
 * - tracking missing translation warnings
 */
export class TranslationHelper {
    // Collected missing translation warnings.
    private warnings: string[] = [];

    // Used to prevent duplicate warnings.
    private warningSet = new Set<string>();

    /**
     * Creates a new translation helper instance.
     *
     * @param locale Current locale object returned by getLocale().
     * @param wengineDataById Shared wengine data keyed by wengine translation ID.
     */
    constructor(
        private locale: any,
        private wengineDataById: Record<string, SharedWEngineData> = {},
        private lang = 'en',
        private discSetDataById: Record<string, SharedDiscSetData> = {},
    ) { }

    /**
     * Translates a content ID from a specific category.
     *
     * If the locale-specific translation is missing, a warning is stored while
     * the shared i18n helper falls back to English when available.
     * TODO: remove cuz i dont use the warnings anymore
     * @param category Translation category.
     * @param id Translation ID.
     * @param sourceFile Optional source file path for debugging.
     * @returns Localized string, English fallback, or original ID if unresolved.
     */
    translate(category: TranslationCategory, id: string, sourceFile?: string) {

        return t(this.locale, category, id, sourceFile);
    }

    /**
     * Parses and translates inline note references.
     *
     * Supported syntax:
     * - [[wengine:amos-bow]]
     * - [[set:viridescent-venerer]]
     * - [[character:furina]]
     * - [[stat:er]]
     * - [[element:melt]]
     * - [[ability:burst]]
     * - [[note:er-req]]
     * - [[some-id]] (automatic category lookup)
     * - [[wengine:the-catch|custom visible text]]
     *
     * Unknown IDs are left unchanged and logged as warnings.
     *
     * @param text Raw note text.
     * @param sourceFile Optional source file path for debugging.
     * @returns Note text with translated inline references.
     */
    translateNoteText(
        text: string,
        sourceFile?: string,
        options: TranslateNoteTextOptions = {},
    ) {
        const translatedText = text.replace(
            INLINE_TRANSLATION_TOKEN_PATTERN,
            (
                match,
                category: InlineTranslationCategory | undefined,
                id: string,
                label: string | undefined,
            ) => {
                const translation = this.translateInlineId(
                    id,
                    category,
                    sourceFile,
                    options,
                    label,
                );

                return translation ?? match;
            },
        );

        return options.rotationPopovers
            ? this.renderRotationPopovers(translatedText)
            : translatedText;
    }

    /**
     * Replaces rotation notation markers with inline popovers.
     *
     * Contributors can write `{rot:N2C}` or `{rot:Q > N2 E}` in note text. The
     * notation inside the marker remains visible, and the popover always shows
     * the localized rotation legend.
     */
    private renderRotationPopovers(text: string) {
        return text.replace(/\{rot:([^}\n]+)\}/g, (match, notation: string) => {
            const trimmedNotation = notation.trim();

            return trimmedNotation
                ? this.renderRotationPopover(trimmedNotation)
                : match;
        });
    }

    /**
     * Builds the inline HTML for one rotation notation popover.
     */
    private renderRotationPopover(notation: string) {
        const cardHtml = [
            '<span class="rotation-popover-intro">',
            escapeHtml(
                t(this.locale, 'ui', ROTATION_POPOVER_INTRO_ID, undefined, false),
            ),
            '</span>',
            '<span class="rotation-popover-legend">',
            this.renderRotationPopoverRows(ROTATION_POPOVER_ACTION_ROWS),
            '</span>',
            '<span class="rotation-popover-note">',
            escapeHtml(
                t(
                    this.locale,
                    'ui',
                    ROTATION_POPOVER_NUMBER_INTRO_ID,
                    undefined,
                    false,
                ),
            ),
            '</span>',
            '<span class="rotation-popover-legend">',
            this.renderRotationPopoverRows(ROTATION_POPOVER_NUMBER_ROWS),
            '</span>',
            '<span class="rotation-popover-note">',
            escapeHtml(
                t(this.locale, 'ui', ROTATION_POPOVER_EXAMPLE_ID, undefined, false),
            ),
            '</span>',
        ].join('');

        return [
            '<span class="info-popover rotation-popover" data-info-popover-card-class="rotation-popover-card" data-info-popover-html="',
            escapeHtml(cardHtml),
            '">',
            '<button class="info-popover-trigger rotation-popover-trigger" type="button" aria-expanded="false">',
            escapeHtml(notation),
            '</button>',
            '</span>',
        ].join('');
    }

    /**
     * Builds the formatted key/value rows used inside the rotation legend.
     */
    private renderRotationPopoverRows(
        rows: readonly { key: string; valueId: string }[],
    ) {
        return rows
            .map((row) =>
                [
                    '<span class="rotation-popover-row">',
                    '<strong class="rotation-popover-key">',
                    escapeHtml(row.key),
                    '</strong>',
                    ' = ',
                    escapeHtml(t(this.locale, 'ui', row.valueId, undefined, false)),
                    '</span>',
                ].join(''),
            )
            .join('');
    }

    /**
     * Translates an inline note ID.
     *
     * If a category is provided, only that category is checked.
     * Otherwise, all known categories are searched.
     *
     * @param id Translation ID found inside an inline note reference.
     * @param category Optional translation category.
     * @param sourceFile Optional source file path for debugging.
     * @param label Optional text to show instead of the localized dictionary value.
     * @returns Localized or fallback string, or null if no translation exists.
     */
    private translateInlineId(
        id: string,
        category?: InlineTranslationCategory,
        sourceFile?: string,
        options: TranslateNoteTextOptions = {},
        label?: string,
    ) {
        const displayLabel = label?.trim();

        if (category) {
            const translationCategory = this.toTranslationCategory(category);
            const canonicalId = this.resolveAlias(translationCategory, id);
            const translation = t(this.locale, translationCategory, canonicalId, sourceFile);

            if (translation === canonicalId) {
                return null;
            }

            const displayName = displayLabel || translation;

            if (translationCategory === 'wengine' && options.wenginePopovers) {
                return this.renderWEnginePopover(canonicalId, translation, displayName);
            }

            if (translationCategory === 'disc' && options.discPopovers) {
                return this.renderDiscPopover(
                    canonicalId,
                    translation,
                    displayName,
                );
            }

            return displayLabel ? escapeHtml(displayLabel) : translation;
        }

        return this.findTranslationInAnyCategory(id, sourceFile, displayLabel);
    }

    /**
     * Maps inline token category aliases to real translation dictionaries.
     */
    private toTranslationCategory(category: InlineTranslationCategory) {
        return category === 'set' ? 'disc' : category;
    }

    /**
     * Resolves a short alias into its canonical translation ID.
     */
    resolveAlias(category: TranslationCategory, id: string) {
        const aliasCategory = category === 'disc' ? 'set' : category;

        return aliases[aliasCategory]?.[id] ?? id;
    }

    /**
     * Builds the inline HTML for a wengine translation token popover.
     */
    private renderWEnginePopover(id: string, name: string, label = name) {
        const info = this.wengineDataById[id];

        if (!info) {
            return escapeHtml(label);
        }

        const baseAttackValue = formatWEngineStatValue(
            info.level_1?.base_attack,
            info.level_max?.base_attack,
        );
        const substatValue = formatWEngineStatValue(
            info.level_1?.substat_value,
            info.level_max?.substat_value,
        );
        const refinements = [1, 2, 3, 4, 5] as const;
        const refinementButtons = refinements
            .map((refinement) =>
                [
                    '<button class="wengine-popover-refinement-button" type="button" data-refinement="r',
                    refinement,
                    '" aria-pressed="',
                    refinement === 1 ? 'true' : 'false',
                    '">S',
                    refinement,
                    '</button>',
                ].join(''),
            )
            .join('');
        const passivePanels = refinements
            .map((refinement) =>
                [
                    '<span class="wengine-popover-passive-refinement" data-refinement-panel="r',
                    refinement,
                    '"',
                    refinement === 1 ? '' : ' hidden',
                    '>',
                    formatWEnginePassive(info, refinement, this.lang),
                    '</span>',
                ].join(''),
            )
            .join('');
        const substatName = info.substat
            ? t(this.locale, 'stat', info.substat, undefined, false)
            : '';
        const substatRow = substatName
            ? [
                '<span class="info-popover-stat"><span>',
                escapeHtml(substatName),
                '</span><strong>',
                escapeHtml(substatValue),
                '</strong></span>',
            ].join('')
            : '';
        const sourceName = translateWEngineSource(this.locale, info.source);
        const sourceFooter = sourceName
            ? [
                '<span class="wengine-popover-source"><span>',
                escapeHtml(t(this.locale, 'ui', 'Source', undefined, false)),
                '</span><strong>',
                escapeHtml(sourceName),
                '</strong></span>',
            ].join('')
            : '';
        const imageUrl = resolveWEngineAssetUrlById(id);
        const imageMarkup = imageUrl
            ? [
                '<span class="info-popover-image wengine-popover-image"><img src="',
                escapeHtml(imageUrl),
                '" alt="" loading="lazy" decoding="async"></span>',
            ].join('')
            : '';
        const cardHtml = [
            '<span class="info-popover-header',
            imageUrl ? ' has-image' : '',
            '">',
            imageMarkup,
            '<span class="info-popover-name">',
            escapeHtml(name),
            '</span>',
            '<span class="info-popover-rarity">',
            escapeHtml(rankLabel(info.rarity)),
            '</span>',
            '</span>',
            '<span class="info-popover-stat"><span>Base ',
            info.base_stat === 'def' ? 'DEF' : 'ATK',
            '</span><strong>',
            escapeHtml(baseAttackValue),
            '</strong></span>',
            substatRow,
            '<span class="wengine-popover-refinement">',
            refinementButtons,
            '</span>',
            '<span class="wengine-popover-passive">',
            passivePanels,
            '</span>',
            sourceFooter,
        ].join('');

        return [
            '<span class="info-popover wengine-popover" data-info-popover-html="',
            escapeHtml(cardHtml),
            '">',
            '<button class="info-popover-trigger" type="button" aria-expanded="false">',
            escapeHtml(label),
            '</button>',
            '</span>',
        ].join('');
    }

    /**
     * Selects a localized disc set effect with English fallback.
     */
    private getLocalizedDiscEffect(effect?: LocalizedDiscEffect) {
        if (!effect) return '';

        return effect[this.lang] ?? effect.en ?? '';
    }

    /**
     * Builds the inline HTML for an disc set translation token popover.
     */
    private renderDiscPopover(id: string, name: string, label = name) {
        const info = this.discSetDataById[id];

        if (!info) {
            return escapeHtml(label);
        }

        const effectRows = [
            { label: '1P', value: this.getLocalizedDiscEffect(info['1p']) },
            { label: '2P', value: this.getLocalizedDiscEffect(info['2p']) },
            { label: '4P', value: this.getLocalizedDiscEffect(info['4p']) },
        ].filter((row) => row.value);
        const imageUrl = resolveDiscAssetUrl(id);
        const imageMarkup = imageUrl
            ? [
                '<span class="info-popover-image disc-popover-image"><img src="',
                escapeHtml(imageUrl),
                '" alt="" loading="lazy" decoding="async"></span>',
            ].join('')
            : '';
        const cardHtml = [
            '<span class="info-popover-header',
            imageUrl ? ' has-image' : '',
            '">',
            imageMarkup,
            '<span class="info-popover-name">',
            escapeHtml(name),
            '</span>',
            '<span class="info-popover-rarity">',
            escapeHtml(rankLabel(info.rarity)),
            '</span>',
            '</span>',
            effectRows
                .map((row) =>
                    [
                        '<span class="info-popover-stat disc-popover-effect"><span>',
                        escapeHtml(row.label),
                        '</span><strong>',
                        formatLineBreakHtml(row.value),
                        '</strong></span>',
                    ].join(''),
                )
                .join(''),
        ].join('');

        return [
            '<span class="info-popover disc-popover" data-info-popover-card-class="disc-popover-card" data-info-popover-html="',
            escapeHtml(cardHtml),
            '">',
            '<button class="info-popover-trigger disc-popover-trigger" type="button" aria-expanded="false">',
            escapeHtml(label),
            '</button>',
            '</span>',
        ].join('');
    }

    /**
     * Searches every known translation category for a matching ID.
     *
     * Used by inline note references without an explicit category,
     * such as [[er]] or [[melt]].
     *
     * @param id Translation ID to search for.
     * @param sourceFile Optional source file path for debugging.
     * @param label Optional text to show instead of the localized dictionary value.
     * @returns Localized or fallback string, or null if no category contains it.
     */
    private findTranslationInAnyCategory(
        id: string,
        sourceFile?: string,
        label?: string,
    ) {
        for (const category of CATEGORIES) {
            const canonicalId = this.resolveAlias(category, id);
            // Fallback hits are valid display text, but the missing locale still matters.
            const hasLocalizedTranslation =
                this.locale?.[category]?.[canonicalId] !== undefined;
            const translation = t(
                this.locale,
                category,
                canonicalId,
                sourceFile,
                false,
            );

            if (translation !== canonicalId) {
                return label ? escapeHtml(label) : translation;
            }
        }


        return null;
    }

    /**
     * Stores a warning if it has not already been added.
     *
     * @param warning Warning message to store.
     */
    private addWarning(warning: string) {
        if (!this.warningSet.has(warning)) {
            this.warningSet.add(warning);
            this.warnings.push(warning);
        }
    }

    /**
     * Returns all collected translation warnings.
     *
     * @returns Array of warning strings.
     */
    getWarnings() {
        return this.warnings;
    }
}
