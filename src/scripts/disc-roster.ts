/**
 * Drive Disc sets page: applies the choices made on the My agents page.
 *
 * The owned agents and their plans (sets + main stats) come from
 * localStorage. They drive:
 * - `data-roster` on each set card ("needed" / "unneeded"), which the shared
 *   card filter reads through the form's `roster` select;
 * - the per-set panel: one merged list per Disc 4/5/6 slot with the stats the
 *   user picked, their rank (1 = most recommended) and the agents wanting it.
 *
 * Agents without a stored plan use their default (first recommendations).
 */

import {
    OWNED_KEY,
    PLANS_KEY,
    readOwned,
    readPlans,
    resolvePlan,
    sanitizePlan,
    type Plan,
    type Plans,
} from './roster-store';

type OwnedUsage = {
    characterId: string;
    characterName: string;
    characterRarity: string;
    href: string;
    isWip: boolean;
    pieces: 2 | 4;
    slots: {
        key: string;
        label: string;
        stats: { id: string; label: string; rank: number }[];
    }[];
    substats: { id: string; label: string; rank: number }[];
};

type StatRow = {
    stat: string;
    bestRank: number;
    agents: Map<string, { name: string; rank: number }>;
};
export {};

/** Sort/display value for stats the build does not recommend. */
const UNRANKED = 999;

const MODE_KEY = 'zzz-builds:disc-stat-mode';
const FILTER_KEY = 'zzz-builds:disc-roster-filter';
const NAMES_KEY = 'zzz-builds:disc-hide-names';
const RANKED_KEY = 'zzz-builds:disc-hide-ranked';

const panel = document.querySelector<HTMLElement>('[data-roster-panel]');
const form = document.querySelector<HTMLFormElement>('[data-disc-filters]');

if (panel && form) {
    const countEl = panel.querySelector<HTMLElement>('[data-roster-count]');
    const cards = Array.from(
        document.querySelectorAll<HTMLElement>('[data-disc-card]'),
    );
    const knownIds = new Set((panel.dataset.knownIds ?? '').split(' ').filter(Boolean));
    const msg = (key: string) => panel.dataset[key] ?? '';
    const modeEl = panel.querySelector<HTMLSelectElement>('[data-roster-mode]');
    const rosterSelect = form.elements.namedItem('roster');
    const hideNamesEl = panel.querySelector<HTMLInputElement>('[data-roster-hide-names]');
    const hideRankedEl = panel.querySelector<HTMLInputElement>('[data-roster-hide-ranked]');
    const viewButtons = Array.from(
        document.querySelectorAll<HTMLButtonElement>('[data-roster-view]'),
    );
    let allSubstats: { id: string; label: string }[] = [];
    try {
        const parsed = JSON.parse(panel.dataset.allSubstats ?? '[]');
        if (Array.isArray(parsed)) allSubstats = parsed;
    } catch {
        allSubstats = [];
    }
    const usageCache = new Map<HTMLElement, OwnedUsage[]>();

    let defaults: Record<string, Plan> = {};
    try {
        const parsed = JSON.parse(panel.dataset.defaults ?? '{}');
        for (const [id, value] of Object.entries(parsed)) {
            const plan = sanitizePlan(value);
            if (plan) defaults[id] = plan;
        }
    } catch {
        defaults = {};
    }

    let owned = new Set<string>();
    let plans: Plans = {};

    const readStored = (key: string) => {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    };
    const writeStored = (key: string, value: string) => {
        try {
            localStorage.setItem(key, value);
        } catch {
            // Persistence is optional.
        }
    };

    const syncViews = () => {
        const current = rosterSelect instanceof HTMLSelectElement ? rosterSelect.value : '';
        viewButtons.forEach((button) =>
            button.setAttribute(
                'aria-pressed',
                String((button.dataset.rosterView ?? '') === current),
            ),
        );
    };

    const getUsage = (section: HTMLElement) => {
        let usage = usageCache.get(section);
        if (!usage) {
            try {
                usage = JSON.parse(section.dataset.usageJson ?? '[]') as OwnedUsage[];
            } catch {
                usage = [];
            }
            usageCache.set(section, usage);
        }
        return usage;
    };

    const el = (tag: string, className: string, text?: string) => {
        const node = document.createElement(tag);
        node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    };

    /**
     * The usages of one set that count: the agent is owned and chose this set
     * with this piece count. Stats are cut down to the ones the agent picked.
     */
    const getPlanned = (card: HTMLElement, section: HTMLElement): OwnedUsage[] => {
        const setId = card.dataset.id ?? '';

        return getUsage(section)
            .filter((item) => owned.has(item.characterId))
            .filter((item) =>
                resolvePlan(item.characterId, plans, defaults).sets.includes(
                    `${setId}:${item.pieces}`,
                ),
            )
            .map((item) => {
                const plan = resolvePlan(item.characterId, plans, defaults);

                return {
                    ...item,
                    slots: item.slots
                        .map((slot) => ({
                            ...slot,
                            stats: slot.stats.filter((stat) =>
                                (plan.stats[slot.key] ?? []).includes(stat.id),
                            ),
                        }))
                        .filter((slot) => slot.stats.length > 0),
                };
            });
    };

    /** Fills one card's panel: agent list plus merged per-slot stat rows. */
    const renderPanel = (card: HTMLElement, section: HTMLElement, usage: OwnedUsage[]) => {
        const topOnly = modeEl?.value === 'top';
        const hideNames = hideNamesEl?.checked === true;
        const emptyEl = section.querySelector<HTMLElement>('[data-owned-empty]');
        const agentsEl = section.querySelector<HTMLElement>('[data-owned-agents]');
        const slotsEl = section.querySelector<HTMLElement>('[data-owned-slots]');
        const substatsEl = section.querySelector<HTMLElement>('[data-owned-substats]');

        substatsEl?.replaceChildren();
        section.hidden = false;
        section.classList.toggle('is-unneeded', usage.length === 0);
        if (!emptyEl || !agentsEl || !slotsEl) return;

        slotsEl.replaceChildren();
        agentsEl.replaceChildren();
        emptyEl.hidden = usage.length > 0;
        agentsEl.hidden = usage.length === 0 || hideNames;
        emptyEl.textContent = owned.size === 0 ? msg('msgNoAgents') : msg('msgNotNeeded');
        if (usage.length === 0) return;

        // Agents, once each, with the piece counts they use this set for.
        const pieceLabel = (pieces: number) =>
            pieces === 4 ? msg('labelFour') : msg('labelTwo');
        const agents = new Map<string, { usage: OwnedUsage; pieces: number[] }>();
        usage.forEach((item) => {
            const entry = agents.get(item.characterId);
            if (entry) entry.pieces.push(item.pieces);
            else agents.set(item.characterId, { usage: item, pieces: [item.pieces] });
        });
        if (!hideNames)
            [...agents.values()].forEach(({ usage: item, pieces }, index) => {
                if (index > 0) agentsEl.append(', ');
                const link = el('a', 'disc-set-owned-agent', item.characterName);
                link.setAttribute('href', item.href);
                agentsEl.append(
                    link,
                    el(
                        'span',
                        'disc-set-owned-piece',
                        [...new Set(pieces)].sort().reverse().map(pieceLabel).join(' + '),
                    ),
                );
            });

        // Merge stats per slot: one row per distinct stat.
        const slotOrder: { key: string; label: string }[] = [];
        const merged = new Map<string, Map<string, StatRow>>();

        usage.forEach((item) => {
            item.slots.forEach((slot) => {
                if (!merged.has(slot.key)) {
                    merged.set(slot.key, new Map());
                    slotOrder.push({ key: slot.key, label: slot.label });
                }
                const rows = merged.get(slot.key)!;
                const stats = topOnly ? slot.stats.slice(0, 1) : slot.stats;

                stats.forEach(({ label: stat, rank: rawRank }) => {
                    // Rank 0 = picked by the user but not recommended: sorts last.
                    const rank = rawRank > 0 ? rawRank : UNRANKED;
                    const row = rows.get(stat) ?? {
                        stat,
                        bestRank: rank,
                        agents: new Map(),
                    };
                    const known = row.agents.get(item.characterId);
                    if (!known || rank < known.rank) {
                        row.agents.set(item.characterId, { name: item.characterName, rank });
                    }
                    row.bestRank = Math.min(row.bestRank, rank);
                    rows.set(stat, row);
                });
            });
        });

        slotOrder
            .sort((a, b) => a.key.localeCompare(b.key))
            .forEach(({ key, label }) => {
                const slotEl = el('div', 'disc-set-owned-slot');
                slotEl.append(el('h4', 'disc-set-owned-slot-title', label));

                [...(merged.get(key)?.values() ?? [])]
                    .sort(
                        (a, b) =>
                            a.bestRank - b.bestRank ||
                            b.agents.size - a.agents.size ||
                            a.stat.localeCompare(b.stat),
                    )
                    .forEach((row) => {
                        const rowEl = el('div', 'disc-set-owned-row');
                        const who = [...row.agents.values()]
                            .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
                            .map((agent) => (agent.rank > 1 && agent.rank !== UNRANKED
                                    ? `${agent.name} #${agent.rank}`
                                    : agent.name))
                            .join(', ');

                        rowEl.append(
                            el(
                                'span',
                                'disc-set-owned-rank',
                                row.bestRank === UNRANKED ? '–' : String(row.bestRank),
                            ),
                            el('span', 'disc-set-owned-stat', row.stat),
                        );
                        if (!hideNames) rowEl.append(el('span', 'disc-set-owned-who', who));
                        slotEl.append(rowEl);
                    });

                slotsEl.append(slotEl);
            });

        if (substatsEl) renderSubstats(substatsEl, usage, hideNames);
    };

    /**
     * Substats under the main stats: one row per substat any owning agent
     * wants (best priority first), then the substats nobody wants.
     */
    const renderSubstats = (
        container: HTMLElement,
        usage: OwnedUsage[],
        hideNames: boolean,
    ) => {
        const rows = new Map<string, StatRow>();

        usage.forEach((item) => {
            (item.substats ?? []).forEach(({ id, label, rank }) => {
                const row = rows.get(id) ?? {
                    stat: label,
                    bestRank: rank,
                    agents: new Map(),
                };
                const known = row.agents.get(item.characterId);
                if (!known || rank < known.rank) {
                    row.agents.set(item.characterId, { name: item.characterName, rank });
                }
                row.bestRank = Math.min(row.bestRank, rank);
                rows.set(id, row);
            });
        });

        const keepEl = el('div', 'disc-set-owned-slot');
        keepEl.append(el('h4', 'disc-set-owned-slot-title', msg('labelKeepSubstats')));

        [...rows.values()]
            .sort(
                (a, b) =>
                    a.bestRank - b.bestRank ||
                    b.agents.size - a.agents.size ||
                    a.stat.localeCompare(b.stat),
            )
            .forEach((row) => {
                const rowEl = el('div', 'disc-set-owned-row');
                const who = [...row.agents.values()]
                    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
                    .map((agent) => (agent.rank > 1 ? `${agent.name} #${agent.rank}` : agent.name))
                    .join(', ');

                rowEl.append(
                    el('span', 'disc-set-owned-rank', String(row.bestRank)),
                    el('span', 'disc-set-owned-stat', row.stat),
                );
                if (!hideNames) rowEl.append(el('span', 'disc-set-owned-who', who));
                keepEl.append(rowEl);
            });

        const unneededEl = el('div', 'disc-set-owned-slot is-unneeded-substats');
        unneededEl.append(el('h4', 'disc-set-owned-slot-title', msg('labelUnneededSubstats')));

        const unneeded = allSubstats.filter((stat) => !rows.has(stat.id));
        if (unneeded.length === 0) {
            unneededEl.append(el('p', 'disc-set-owned-substat-none', msg('msgNoUnneededSubstats')));
        } else {
            const chips = el('div', 'disc-set-owned-chips');
            unneeded.forEach((stat) => chips.append(el('span', 'disc-set-owned-chip', stat.label)));
            unneededEl.append(chips);
        }

        if (rows.size > 0) container.append(keepEl);
        container.append(unneededEl);
    };

    const load = () => {
        owned = new Set(readOwned().filter((id) => knownIds.has(id)));
        plans = readPlans();
        panel.dataset.ownedIds = [...owned].join(' ');
    };

    const render = () => {
        if (countEl) countEl.textContent = String(owned.size);

        cards.forEach((card) => {
            const section = card.querySelector<HTMLElement>('[data-owned-panel]');
            if (!section) return;

            const usage = getPlanned(card, section);
            card.dataset.roster = usage.length > 0 ? 'needed' : 'unneeded';
            card.dataset.selectedCharacterIds = [
                ...new Set(usage.map((item) => item.characterId)),
            ].join(' ');
            renderPanel(card, section, usage);
        });

        // Keep / Remove counts (independent of the active view).
        const needed = cards.filter((card) => card.dataset.roster === 'needed').length;
        const counts: Record<string, number> = {
            '': cards.length,
            needed,
            unneeded: cards.length - needed,
        };
        viewButtons.forEach((button) => {
            const countEl = button.querySelector<HTMLElement>('[data-roster-view-count]');
            if (countEl) countEl.textContent = `(${counts[button.dataset.rosterView ?? ''] ?? 0})`;
        });
        syncViews();

        // Re-run the shared card filter so the roster select takes effect.
        form.dispatchEvent(new Event('input', { bubbles: true }));
    };

    // Keep other open tabs in sync with the My agents page.
    window.addEventListener('storage', (event) => {
        if (event.key !== OWNED_KEY && event.key !== PLANS_KEY) return;
        load();
        render();
    });

    const savedMode = readStored(MODE_KEY);
    if (modeEl && (savedMode === 'all' || savedMode === 'top')) modeEl.value = savedMode;
    modeEl?.addEventListener('change', () => {
        writeStored(MODE_KEY, modeEl.value);
        render();
    });

    const savedNames = readStored(NAMES_KEY);
    if (hideNamesEl) hideNamesEl.checked = savedNames === '1';
    hideNamesEl?.addEventListener('change', () => {
        writeStored(NAMES_KEY, hideNamesEl.checked ? '1' : '0');
        render();
    });

    // Hides the "4-Piece ranked on" / "2-Piece ranked on" lists on every card.
    const applyHideRanked = () => {
        document.body.toggleAttribute('data-hide-ranked', hideRankedEl?.checked === true);
    };
    if (hideRankedEl) hideRankedEl.checked = readStored(RANKED_KEY) === '1';
    hideRankedEl?.addEventListener('change', () => {
        writeStored(RANKED_KEY, hideRankedEl.checked ? '1' : '0');
        applyHideRanked();
    });
    applyHideRanked();

    viewButtons.forEach((button) =>
        button.addEventListener('click', () => {
            if (!(rosterSelect instanceof HTMLSelectElement)) return;
            rosterSelect.value = button.dataset.rosterView ?? '';
            writeStored(FILTER_KEY, rosterSelect.value);
            syncViews();
            form.dispatchEvent(new Event('input', { bubbles: true }));
        }),
    );

    if (rosterSelect instanceof HTMLSelectElement) {
        const savedFilter = readStored(FILTER_KEY);
        if (
            savedFilter !== null &&
            [...rosterSelect.options].some((option) => option.value === savedFilter)
        ) {
            rosterSelect.value = savedFilter;
        }
        rosterSelect.addEventListener('change', () =>
            writeStored(FILTER_KEY, rosterSelect.value),
        );
    }

    load();
    render();
}
