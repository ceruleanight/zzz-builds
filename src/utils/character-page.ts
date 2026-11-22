import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import {
    getPublicCharacterName,
    parsePublicCharacterSlug,
} from './character-slugs';
import { resolveCharacterImageUrl } from './character-assets';
import {
    findCharacterPath,
    loadJSON,
    normalizeVersion,
    readJSONFile,
    toTitleCase,
} from './content';
import { getLocale, t } from './i18n';
import { collectNotes, collectSectionNotes, collectStatNotes } from './notes';
import { TranslationHelper } from './translator';
import type { WEnginePassiveText } from './wengine-passive';

type CharacterPathParam = string | string[] | undefined;

type CharacterPageDataOptions = {
    lang?: string;
    characterPath: CharacterPathParam;
    contentBase?: string;
};

type BuildContext = {
    buildPath: string;
    buildName: string;
    defaultLastUpdated: string;
    specialty: string;
    lang: string;
    locale: any;
    translator: TranslationHelper;
    discSetData: Record<string, any>;
};

type WEngineTranslationContext = {
    wengineData: Record<string, SharedWEngineData>;
    specialty: string;
    sourceFile: string;
    translator: TranslationHelper;
};

/**
 * Localized editorial note used by build-notes.json.
 *
 * English is required because it is the fallback when the requested language
 * is missing. Any other language key is allowed, for example fr, es, it, or ru.
 */
type LocalizedBuildNote = {
    en: string;
    [lang: string]: string;
};

type BuildCalculationCredit = {
    author?: string;
    link?: string;
    detail?: string;
};

/**
 * Resolves the expected path for a build-level JSON file.
 *
 * @param buildPath Absolute path to a build directory.
 * @param fileName JSON file name.
 * @returns Absolute file path.
 */
const fileInBuild = (buildPath: string, fileName: string) =>
    path.join(buildPath, fileName);

const wengineDataPath = path.resolve('src/data/wengines');
const discSetDataPath = path.resolve(
    'src/data/discs/disc_sets.json',
);

/**
 * Renders Markdown text to HTML.
 *
 * @param value Markdown source text.
 * @returns Rendered HTML string.
 */
const renderMarkdown = (value: string) => marked.parse(value, { breaks: true }) as string;

/**
 * Loads the shared disc set database used by popovers and validation.
 */
function loadDiscSetData() {
    if (!fs.existsSync(discSetDataPath)) {
        throw new Error(
            'No shared disc set data found at src/data/discs/disc_sets.json',
        );
    }

    return readJSONFile(discSetDataPath);
}

/**
 * Loads shared wengine data for the current character wengine type.
 */
function loadWEngineData(specialty: string) {
    const filePath = path.join(wengineDataPath, `${specialty}.json`);

    if (!fs.existsSync(filePath)) {
        throw new Error(
            `No shared wengine data found for wengine type "${specialty}"`,
        );
    }

    return readJSONFile(filePath);
}

/**
 * Loads every shared wengine entry so inline wengine popovers can resolve IDs.
 */
function loadAllWEngineData() {
    return fs
        .readdirSync(wengineDataPath)
        .filter((fileName) => fileName.endsWith('.json'))
        .reduce<Record<string, SharedWEngineData>>((wengineData, fileName) => {
            const typeData = readJSONFile(path.join(wengineDataPath, fileName));
            const typeSpecialty = fileName.replace(/\.json$/, '');

            for (const [id, data] of Object.entries<any>(typeData)) {
                wengineData[id] = { ...data, specialty: typeSpecialty };
            }

            return wengineData;
        }, {});
}

type SharedWEngineData = {
    specialty?: string;
    rarity: number;
    source?: string;
    passive?: WEnginePassiveText;
    substat?: string;
    level_1?: {
        base_attack?: number;
        substat_value?: string;
        level_max?: {
            base_attack?: number;
            substat_value?: string;
        };
    };
};

/**
 * Reads and validates the rarity for one wengine recommendation.
 */
function getWEngineRarity(
    wengineData: Record<string, SharedWEngineData>,
    wengineId: string,
    specialty: string,
    sourceFile: string,
) {
    const rarity = wengineData[wengineId]?.rarity;

    if (!rarity) {
        throw new Error(
            `Missing rarity for wengine "${wengineId}" in src/data/wengines/${specialty}.json (source: ${sourceFile})`,
        );
    }

    return rarity;
}

/**
 * Reads and validates the shared data for one wengine recommendation.
 */
function getWEngineInfo(
    wengineData: Record<string, SharedWEngineData>,
    wengineId: string,
    specialty: string,
    sourceFile: string,
) {
    const data = wengineData[wengineId];

    if (!data) {
        throw new Error(
            `Missing shared data for wengine "${wengineId}" in src/data/wengines/${specialty}.json (source: ${sourceFile})`,
        );
    }

    return data;
}

/**
 * Normalizes legacy string wengine entries into object entries.
 */
function normalizeWEngineItem(item: any) {
    return typeof item === 'string' ? { name: item } : item;
}

/**
 * Translates one wengine item while preserving ranking metadata.
 */
function translateWEngineItem(item: any, context: WEngineTranslationContext) {
    const { wengineData, specialty, sourceFile, translator } = context;
    const normalizedItem = normalizeWEngineItem(item);
    const id = translator.resolveAlias('wengine', normalizedItem.name);
    const wengineInfo = getWEngineInfo(wengineData, id, specialty, sourceFile);

    // A W-Engine from another specialty only gives its stats; its passive
    // does not work. Flag it in the item's note so readers see why.
    const isStatStick =
        Boolean(wengineInfo?.specialty) && wengineInfo.specialty !== specialty;
    const statStickNote = 'Stat stick: this is an off-specialty W-Engine, so only its stats apply and its passive does not work.';
    const note = isStatStick
        ? {
            ...(normalizedItem.note ?? {}),
            en: [statStickNote, normalizedItem.note?.en]
                .filter(Boolean)
                .join(' '),
        }
        : normalizedItem.note;

    return {
        ...normalizedItem,
        ...(note ? { note } : {}),
        id,
        rarity: getWEngineRarity(wengineData, id, specialty, sourceFile),
        info: wengineInfo,
        name: translator.translate('wengine', id, sourceFile),
    };
}

/**
 * Translates ranked and conditional wengine recommendations.
 */
function translateWEngineRecommendations(
    wengines: any,
    context: WEngineTranslationContext,
) {
    return {
        ...wengines,
        wengines: wengines.wengines.map((position: { items: any[] }) => ({
            ...position,
            items: position.items.map((item) => translateWEngineItem(item, context)),
        })),
        conditional: wengines.conditional?.map((item: any) =>
            translateWEngineItem(item, context),
        ),
    };
}

/**
 * Converts Astro's catch-all character param into the stable character slug.
 *
 * Astro may provide `[...character]` as an array, so nested path segments are
 * joined before content lookup.
 */
function normalizeCharacterParam(characterPath: CharacterPathParam) {
    return Array.isArray(characterPath) ? characterPath.join('/') : characterPath;
}

/**
 * Translates a stat ID from either a raw string item or an object item.
 *
 * Stat JSON supports both "er" and `{ "name": "er", ... }` forms.
 */
function translateStatValue(locale: any, value: any, sourceFile: string) {
    return t(
        locale,
        'stat',
        typeof value === 'string' ? value : value.name,
        sourceFile,
        false,
    );
}

/**
 * Normalizes one stat entry into an object with a translated display name.
 */
function translateStatItem(
    locale: any,
    item: any,
    sourceFile: string,
    translator?: TranslationHelper,
) {
    return typeof item === 'string'
        ? { name: translateStatValue(locale, item, sourceFile) }
        : {
            ...item,
            name:
                typeof item.name === 'string' && item.name.includes('[[')
                    ? (translator?.translateNoteText(item.name, sourceFile) ??
                        item.name)
                    : translateStatValue(locale, item, sourceFile),
        };
}

/**
 * Normalizes one substat priority row.
 *
 * A row may be a single stat, or an alternative group shaped as
 * `{ "items": ["atk%", "em"] }`. The first item keeps the rank number and
 * later items render as approximate alternatives.
 */
function translateSubstatPriorityItem(
    locale: any,
    item: any,
    sourceFile: string,
    translator: TranslationHelper,
) {
    if (item && Array.isArray(item.items)) {
        return {
            ...item,
            items: item.items.map((stat: any) =>
                translateStatItem(locale, stat, sourceFile, translator),
            ),
        };
    }

    return translateStatItem(locale, item, sourceFile, translator);
}

/**
 * Translates an disc set ID, falling back to stat translations for pseudo-sets.
 */
function translateDiscSetName(
    translator: TranslationHelper,
    locale: any,
    id: string,
    sourceFile: string,
) {
    const discName = t(locale, 'disc', id, sourceFile, false);

    if (discName !== id) {
        return discName;
    }

    return translator.translate('stat', id, sourceFile);
}

/**
 * Normalizes one disc set item with translated text and shared set info.
 */
function translateDiscSetItem(
    translator: TranslationHelper,
    locale: any,
    item: any,
    sourceFile: string,
    discSetData: Record<string, any>,
) {
    const id = translator.resolveAlias('disc', item.name);

    return {
        ...item,
        id,
        name: translateDiscSetName(translator, locale, id, sourceFile),
        info: discSetData[id],
    };
}

/**
 * Translates every disc set item inside one recommendation group.
 */
function translateDiscSetGroup(
    translator: TranslationHelper,
    locale: any,
    group: any,
    sourceFile: string,
    discSetData: Record<string, any>,
) {
    return {
        ...group,
        items: Array.isArray(group.items)
            ? group.items.map((item: any) =>
                translateDiscSetItem(
                    translator,
                    locale,
                    item,
                    sourceFile,
                    discSetData,
                ),
            )
            : group.items,
        choices: Array.isArray(group.choices)
            ? group.choices.map((choice: any) => ({
                ...choice,
                items: (choice.items ?? []).map((item: any) =>
                    translateDiscSetItem(
                        translator,
                        locale,
                        item,
                        sourceFile,
                        discSetData,
                    ),
                ),
            }))
            : group.choices,
    };
}

/**
 * Translates ranked and conditional disc set recommendations.
 */
function translateDiscSetRecommendations(
    discSets: any,
    translator: TranslationHelper,
    locale: any,
    sourceFile: string,
    discSetData: Record<string, any>,
) {
    const translateRanks = (ranks: any[] = []) =>
        ranks.map((rank: { groups: any[] }) => ({
            ...rank,
            groups: rank.groups.map((group: any) =>
                translateDiscSetGroup(
                    translator,
                    locale,
                    group,
                    sourceFile,
                    discSetData,
                ),
            ),
        }));
    const translateConditional = (entries: any[] = []) =>
        entries
            .flatMap((entry: any) => entry.groups ?? [entry])
            .map((group: any) =>
                translateDiscSetGroup(
                    translator,
                    locale,
                    group,
                    sourceFile,
                    discSetData,
                ),
            );

    return {
        ...discSets,
        // 4-piece sets and their conditional alternatives.
        disc_sets: translateRanks(discSets.disc_sets),
        conditional: translateConditional(discSets.conditional),
        // 2-piece sets that fill the remaining two slots.
        two_piece_sets: translateRanks(discSets.two_piece_sets),
        two_piece_conditional: translateConditional(
            discSets.two_piece_conditional,
        ),
    };
}

/**
 * Translates one talent priority item while preserving legacy display strings.
 */
function translateTalentItem(
    translator: TranslationHelper,
    item: any,
    sourceFile: string,
) {
    if (typeof item?.name !== 'string') return item;

    if (item.name.includes('[[')) {
        return {
            ...item,
            name: translator.translateNoteText(item.name, sourceFile),
        };
    }

    // Lowercase slug names are treated as i18n IDs. Existing display strings
    // such as "Normal Attack" remain valid legacy content.
    if (/^[a-z0-9-]+$/.test(item.name)) {
        return {
            ...item,
            name: translator.translate('ability', item.name, sourceFile),
        };
    }

    return item;
}

/**
 * Flattens ranked and conditional disc groups for note collection.
 */
function getDiscSetNoteGroups(discSets: any) {
    return [
        ...(discSets.disc_sets ?? []).flatMap((rank: any) => rank.groups),
        ...(discSets.conditional ?? []),
        ...(discSets.two_piece_sets ?? []).flatMap((rank: any) => rank.groups),
        ...(discSets.two_piece_conditional ?? []),
    ];
}

/**
 * Translates every talent priority group for a build.
 */
function translateTalentPriorities(
    talents: any,
    translator: TranslationHelper,
    sourceFile: string,
) {
    return {
        ...talents,
        talents: talents.talents.map((priority: { items: any[] }) => ({
            ...priority,
            items: priority.items.map((item) =>
                translateTalentItem(translator, item, sourceFile),
            ),
        })),
    };
}

/**
 * Translates all disc main stat slots while preserving their slot groups.
 */
function translateMainStats(
    locale: any,
    mainstats: any,
    sourceFile: string,
    translator: TranslationHelper,
) {
    return {
        disc4: mainstats.main_stats.disc4.map((item: any) =>
            translateStatItem(locale, item, sourceFile, translator),
        ),
        disc5: mainstats.main_stats.disc5.map((item: any) =>
            translateStatItem(locale, item, sourceFile, translator),
        ),
        disc6: mainstats.main_stats.disc6.map((item: any) =>
            translateStatItem(locale, item, sourceFile, translator),
        ),
    };
}

/**
 * Collects notes from disc slots 4, 5 and 6 into one main-stat note list.
 */
function collectMainStatNotes(
    mainStats: any,
    sourceFile: string,
    lang: string,
    translator: TranslationHelper,
) {
    return collectStatNotes(
        ['disc4', 'disc5', 'disc6'].flatMap((slot) => mainStats[slot]),
        (stat: { name: string }) => stat.name,
        sourceFile,
        lang,
        translator,
    );
}

function formatWEngineNoteName(
    wengine: { id?: string; info?: any; name: string },
    sourceFile: string,
    translator: TranslationHelper,
) {
    return wengine.id && wengine.info
        ? translator.translateNoteText(`[[wengine:${wengine.id}]]`, sourceFile, {
            wenginePopovers: true,
        })
        : wengine.name;
}

function formatDiscSetNoteName(
    disc: { id?: string; info?: any; name: string; pieces: number },
    sourceFile: string,
    translator: TranslationHelper,
) {
    const name =
        disc.id && disc.info
            ? translator.translateNoteText(`[[set:${disc.id}]]`, sourceFile, {
                discPopovers: true,
            })
            : disc.name;

    return `${name} (${disc.pieces})`;
}

/**
 * Localizes and renders build-level editorial notes.
 *
 * Expected shape:
 * `{ "notes": [{ "en": "...", "fr": "...", "es": "..." }] }`
 *
 * Each note must include `en`; the requested language falls back to English.
 * Note text may contain inline translation tokens and Markdown.
 */
function buildLocalizedNotes(
    buildNoteData: any,
    sourceFile: string,
    lang: string,
    translator: TranslationHelper,
) {
    if (!buildNoteData) return null;

    const notes: LocalizedBuildNote[] = Array.isArray(buildNoteData.notes)
        ? buildNoteData.notes
        : [];

    /**
     * Localizes inline tokens inside one calculation credit detail.
     */
    const localizeCreditDetail = (credit: BuildCalculationCredit) =>
        credit?.detail
            ? {
                ...credit,
                detail: translator.translateNoteText(credit.detail, sourceFile, {
                    wenginePopovers: true,
                    discPopovers: true,
                    rotationPopovers: true,
                }),
            }
            : credit;

    /**
     * Handles both single and multi-author calculation credit fields.
     */
    const localizeCreditDetails = (
        value: BuildCalculationCredit | BuildCalculationCredit[] | undefined,
    ) => {
        if (Array.isArray(value)) {
            return value.map(localizeCreditDetail);
        }

        return value ? localizeCreditDetail(value) : value;
    };

    return {
        ...buildNoteData,
        tips: (buildNoteData.tips ?? []).map((tip: {
            title: LocalizedBuildNote;
            content: LocalizedBuildNote;
        }) => {
            if (typeof tip?.title?.en !== 'string' || typeof tip?.content?.en !== 'string') {
                throw new Error(`Build tip requires English title and content (source: ${sourceFile})`);
            }

            return {
                title: translator.translateNoteText(tip.title[lang] ?? tip.title.en, sourceFile),
                content: renderMarkdown(
                    translator.translateNoteText(tip.content[lang] ?? tip.content.en, sourceFile, {
                        wenginePopovers: true,
                        discPopovers: true,
                        rotationPopovers: true,
                    }),
                ),
            };
        }),
        disc: localizeCreditDetails(buildNoteData.disc),
        discs: localizeCreditDetails(buildNoteData.discs),
        wengines: localizeCreditDetails(buildNoteData.wengines),
        talent: localizeCreditDetails(buildNoteData.talent),
        talents: localizeCreditDetails(buildNoteData.talents),
        global: localizeCreditDetails(buildNoteData.global),
        notes: notes.map((note) => {
            if (note.en === undefined) {
                throw new Error(
                    `Build note is missing required English text (source: ${sourceFile})`,
                );
            }

            return renderMarkdown(
                translator.translateNoteText(note[lang] ?? note.en, sourceFile, {
                    wenginePopovers: true,
                    discPopovers: true,
                    rotationPopovers: true,
                }),
            );
        }),
    };
}

/**
 * Loads and normalizes one build folder for rendering.
 *
 * This keeps file-system content, i18n IDs, localized notes, Markdown, and
 * warning collection out of the Astro route and away from presentation
 * components.
 */
function loadBuildData({
    buildPath,
    buildName,
    defaultLastUpdated,
    specialty,
    lang,
    locale,
    translator,
    discSetData,
}: BuildContext) {
    const wenginesFile = fileInBuild(buildPath, 'wengines.json');
    const discSetsFile = fileInBuild(buildPath, 'discs-sets.json');
    const discMainstatsFile = fileInBuild(
        buildPath,
        'discs-mainstats.json',
    );
    const discSubstatsFile = fileInBuild(
        buildPath,
        'discs-substats.json',
    );
    const talentsFile = fileInBuild(buildPath, 'talents.json');
    const buildNotesFile = fileInBuild(buildPath, 'build-notes.json');

    const rawWEngines = loadJSON(buildPath, 'wengines.json');
    const wengines = rawWEngines
        ? translateWEngineRecommendations(rawWEngines, {
            // Agents can equip W-Engines of any specialty (off-specialty ones
            // only provide their stats), so resolve IDs across every file.
            wengineData: (loadWEngineData(specialty), loadAllWEngineData()),
            specialty,
            sourceFile: wenginesFile,
            translator,
        })
        : null;

    const rawDiscSets = loadJSON(buildPath, 'discs-sets.json');
    const rawDiscMainstats = loadJSON(buildPath, 'discs-mainstats.json');
    const rawDiscSubstats = loadJSON(buildPath, 'discs-substats.json');

    const discs = {
        sets: rawDiscSets
            ? translateDiscSetRecommendations(
                rawDiscSets,
                translator,
                locale,
                discSetsFile,
                discSetData,
            )
            : null,
        mainstats: rawDiscMainstats,
        substats: rawDiscSubstats,
    };

    if (discs.mainstats) {
        discs.mainstats.main_stats = translateMainStats(
            locale,
            discs.mainstats,
            discMainstatsFile,
            translator,
        );
    }

    if (discs.substats) {
        discs.substats.substats_priority =
            discs.substats.substats_priority.map((item: any) =>
                translateSubstatPriorityItem(
                    locale,
                    item,
                    discSubstatsFile,
                    translator,
                ),
            );
    }

    const rawTalents = loadJSON(buildPath, 'talents.json');
    const talents = rawTalents
        ? translateTalentPriorities(rawTalents, translator, talentsFile)
        : null;

    const notes = {
        wengines: {
            global: collectSectionNotes(wengines, wenginesFile, lang, translator),
            items: collectNotes(
                wengines
                    ? [
                        ...wengines.wengines,
                        ...(wengines.conditional ? [{ items: wengines.conditional }] : []),
                    ]
                    : [],
                (wengine: { id?: string; info?: any; name: string }) =>
                    formatWEngineNoteName(wengine, wenginesFile, translator),
                wenginesFile,
                lang,
                translator,
            ),
        },
        discs: {
            global: [
                ...collectSectionNotes(
                    discs.sets,
                    discSetsFile,
                    lang,
                    translator,
                ),
                ...collectSectionNotes(
                    discs.mainstats,
                    discMainstatsFile,
                    lang,
                    translator,
                ),
                ...collectSectionNotes(
                    discs.substats,
                    discSubstatsFile,
                    lang,
                    translator,
                ),
            ],
            sets: collectNotes(
                discs.sets ? getDiscSetNoteGroups(discs.sets) : [],
                (disc: { id?: string; info?: any; name: string; pieces: number }) =>
                    formatDiscSetNoteName(disc, discSetsFile, translator),
                discSetsFile,
                lang,
                translator,
            ),
            mainstats: discs.mainstats
                ? collectMainStatNotes(
                    discs.mainstats.main_stats,
                    discMainstatsFile,
                    lang,
                    translator,
                )
                : [],
            substats: discs.substats
                ? collectStatNotes(
                    discs.substats.substats_priority,
                    (stat: { name: any }) => stat.name,
                    discSubstatsFile,
                    lang,
                    translator,
                )
                : [],
        },
        talents: {
            global: collectSectionNotes(talents, talentsFile, lang, translator),
            items: collectNotes(
                talents?.talents ?? [],
                (talent: { name: any }) => talent.name,
                talentsFile,
                lang,
                translator,
            ),
        },
    };

    const buildNoteDataInBuild = fs.existsSync(buildNotesFile)
        ? readJSONFile(buildNotesFile)
        : null;
    const buildNoteData =
        buildNoteDataInBuild ?? loadJSON(buildPath, 'build-notes.json');
    const rawBuildName =
        buildNoteData?.name?.[lang] ?? buildNoteData?.name?.en ?? buildName;
    const lastUpdated =
        normalizeVersion(buildNoteDataInBuild?.last_updated) || defaultLastUpdated;

    // Build cards only deal with display-ready data and pre-rendered note HTML.
    return {
        name: translator.translateNoteText(rawBuildName, buildNotesFile),
        isBest: buildNoteData?.best === true,
        isWip: lastUpdated.toUpperCase() === 'WIP',
        lastUpdated,
        slug: buildName,
        wengines,
        discs,
        talents,
        notes,
        buildNote: buildLocalizedNotes(
            buildNoteData,
            buildNotesFile,
            lang,
            translator,
        ),
    };
}

/**
 * Builds all server-side data needed by the character page route.
 *
 * Resolves the character folder, loads metadata, normalizes every build, and
 * returns accumulated translation warnings so the page can forward them to the
 * browser console.
 */
export function getCharacterPageData({
    lang,
    characterPath,
    contentBase = path.resolve('src/content'),
}: CharacterPageDataOptions) {
    const character = normalizeCharacterParam(characterPath);

    if (!character) {
        throw new Error('Character parameter is required');
    }

    const currentLang = lang ?? 'en';
    const locale = getLocale(currentLang);
    const wengineData = loadAllWEngineData();
    const discSetData = loadDiscSetData();
    const translator = new TranslationHelper(
        locale,
        wengineData,
        currentLang,
        discSetData,
    );
    const characterSlug = character.toLowerCase();
    const slugParts = parsePublicCharacterSlug(characterSlug);
    const contentSlug = slugParts.character;
    const foundPath = findCharacterPath(contentBase, characterSlug);

    if (!foundPath) {
        throw new Error('Character not found');
    }

    // Each child directory is treated as one playable build/role.
    const buildNames = fs
        .readdirSync(foundPath.path)
        .filter((fileName) =>
            fs.statSync(path.join(foundPath.path, fileName)).isDirectory(),
        );

    const translatedCharacterName = translator.translate(
        'character',
        contentSlug,
        'metadata.json',
    );

    const metadata = loadJSON(foundPath.path, 'metadata.json');
    const defaultLastUpdated = normalizeVersion(metadata.last_updated);
    const assetContext = {
        element: foundPath.element,
        rarity: foundPath.rarity,
        character: contentSlug,
        characterPath: foundPath.path,
    };
    const metadataWithAssets = {
        ...metadata,
        image: resolveCharacterImageUrl(assetContext, 'image', metadata),
        portrait: resolveCharacterImageUrl(assetContext, 'portrait', metadata),
    };
    const builds = buildNames.map((buildName) =>
        loadBuildData({
            buildPath: path.join(foundPath.path, buildName),
            buildName,
            defaultLastUpdated,
            specialty: metadata.specialty,
            lang: currentLang,
            locale,
            translator,
            discSetData,
        }),
    );

    if (
        builds.length > 0
            ? builds.every((build) => build.isWip)
            : defaultLastUpdated.toUpperCase() === 'WIP'
    ) {
        throw new Error('Character not found');
    }

    return {
        characterSlug,
        characterName: slugParts.element
            ? getPublicCharacterName(locale, slugParts)
            : translatedCharacterName !== contentSlug
                ? translatedCharacterName
                : toTitleCase(contentSlug),
        metadata: metadataWithAssets,
        // Variants (Frost, Auric Ink, Honed Edge) get their own page colour.
        element: metadata?.attribute_variant ?? foundPath.element,
        baseElement: foundPath.element,
        rarity: foundPath.rarity,
        lang: currentLang,
        locale,
        builds,
        warnings: translator.getWarnings(),
    };
}
