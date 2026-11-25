/**
 * My agents page: pick the agents you own, then for each one the Drive Disc
 * sets and the Disc 4/5/6 main stats you plan to use.
 *
 * Every agent card is rendered at build time and only shown while its agent
 * is selected; this script toggles visibility and the pressed state of the
 * set / stat buttons. The Drive Disc sets page reads the same storage.
 */

import {
    OWNED_KEY,
    PLANS_KEY,
    clonePlan,
    emptyPlan,
    readOwned,
    readPlans,
    sanitizePlan,
    writeOwned,
    writePlans,
    type Plan,
    type Plans,
} from './roster-store';
import { compareCharacterCards } from './character-sort.mjs';

export {};

const EXPORT_APP = 'zzz-builds';

const root = document.querySelector<HTMLElement>('[data-agent-planner]');
const panel = root?.querySelector<HTMLDetailsElement>('[data-roster-panel]');

if (root && panel) {
    const toggles = Array.from(
        panel.querySelectorAll<HTMLButtonElement>('[data-roster-toggle]'),
    );
    const groups = Array.from(
        panel.querySelectorAll<HTMLElement>('[data-roster-group]'),
    );
    const cards = Array.from(
        root.querySelectorAll<HTMLElement>('[data-agent-card]'),
    );
    const gridEl = root.querySelector<HTMLElement>('[data-agent-grid]');
    const sortEl = root.querySelector<HTMLSelectElement>('[data-agent-sort]');
    const emptyEl = root.querySelector<HTMLElement>('[data-agent-empty]');
    const countEl = panel.querySelector<HTMLElement>('[data-roster-count]');
    const statusEl = panel.querySelector<HTMLElement>('[data-roster-status]');
    const textEl = panel.querySelector<HTMLTextAreaElement>('[data-roster-text]');
    const searchEl = panel.querySelector<HTMLInputElement>('[data-roster-search]');
    const fileEl = panel.querySelector<HTMLInputElement>('[data-roster-file]');
    const msg = (key: string) => panel.dataset[key] ?? '';
    const knownIds = new Set(toggles.map((toggle) => toggle.dataset.id ?? ''));

    // What each card offers; anything stored outside of this is dropped.
    const defaults: Record<string, Plan> = {};
    const valid = new Map<string, { sets: Set<string>; stats: Map<string, Set<string>> }>();

    cards.forEach((card) => {
        const id = card.dataset.id ?? '';
        let parsed: Plan | null = null;
        try {
            parsed = sanitizePlan(JSON.parse(card.dataset.defaults ?? ''));
        } catch {
            parsed = null;
        }
        defaults[id] = parsed ?? emptyPlan();

        const stats = new Map<string, Set<string>>();
        card.querySelectorAll<HTMLElement>('[data-plan-stat]').forEach((button) => {
            const slot = button.dataset.slot ?? '';
            if (!stats.has(slot)) stats.set(slot, new Set());
            stats.get(slot)!.add(button.dataset.stat ?? '');
        });
        valid.set(id, {
            sets: new Set(
                Array.from(card.querySelectorAll<HTMLElement>('[data-plan-set]')).map(
                    (button) => button.dataset.key ?? '',
                ),
            ),
            stats,
        });
    });

    /** Drops choices the agent no longer offers. */
    const cleanPlan = (id: string, plan: Plan): Plan => {
        const options = valid.get(id);
        if (!options) return emptyPlan();

        return {
            sets: plan.sets.filter((key) => options.sets.has(key)),
            stats: Object.fromEntries(
                [...options.stats.entries()].map(([slot, allowed]) => [
                    slot,
                    (plan.stats[slot] ?? []).filter((stat) => allowed.has(stat)),
                ]),
            ),
        };
    };

    let owned = new Set<string>();
    let plans: Plans = {};

    /** Every owned agent gets a stored plan, starting from its defaults. */
    const ensurePlans = () => {
        let changed = false;
        owned.forEach((id) => {
            if (!plans[id]) {
                plans[id] = clonePlan(defaults[id] ?? emptyPlan());
                changed = true;
            }
        });
        return changed;
    };

    const load = () => {
        owned = new Set(readOwned().filter((id) => knownIds.has(id)));
        plans = readPlans();
        if (ensurePlans()) writePlans(plans);
    };

    const setStatus = (text: string) => {
        if (statusEl) statusEl.textContent = text;
    };

    const render = () => {
        toggles.forEach((toggle) =>
            toggle.setAttribute('aria-pressed', String(owned.has(toggle.dataset.id ?? ''))),
        );
        if (countEl) countEl.textContent = String(owned.size);
        if (emptyEl) emptyEl.hidden = owned.size > 0;

        cards.forEach((card) => {
            const id = card.dataset.id ?? '';
            const isOwned = owned.has(id);
            card.hidden = !isOwned;
            if (!isOwned) return;

            const plan = plans[id] ?? emptyPlan();
            card.querySelectorAll<HTMLElement>('[data-plan-set]').forEach((button) =>
                button.setAttribute(
                    'aria-pressed',
                    String(plan.sets.includes(button.dataset.key ?? '')),
                ),
            );
            card.querySelectorAll<HTMLElement>('[data-plan-stat]').forEach((button) =>
                button.setAttribute(
                    'aria-pressed',
                    String(
                        (plan.stats[button.dataset.slot ?? ''] ?? []).includes(
                            button.dataset.stat ?? '',
                        ),
                    ),
                ),
            );
        });
    };

    /** Reorders the cards (hidden ones too, so they are in place when shown). */
    const applySort = () => {
        if (!gridEl || !sortEl) return;
        [...cards]
            .sort((left, right) => compareCharacterCards(left, right, sortEl.value))
            .forEach((card) => gridEl.append(card));
    };

    sortEl?.addEventListener('change', applySort);

    const update = () => {
        ensurePlans();
        writeOwned(owned);
        writePlans(plans);
        render();
    };

    const toggleIn = (list: string[], value: string) =>
        list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

    toggles.forEach((toggle) =>
        toggle.addEventListener('click', () => {
            const id = toggle.dataset.id ?? '';
            if (owned.has(id)) owned.delete(id);
            else owned.add(id);
            setStatus('');
            update();
        }),
    );

    // Choices on the agent cards (one listener for all of them).
    root.addEventListener('click', (event) => {
        const target = event.target as HTMLElement | null;
        const card = target?.closest<HTMLElement>('[data-agent-card]');
        if (!target || !card) return;

        const id = card.dataset.id ?? '';
        const plan = plans[id] ?? clonePlan(defaults[id] ?? emptyPlan());

        const setButton = target.closest<HTMLElement>('[data-plan-set]');
        const statButton = target.closest<HTMLElement>('[data-plan-stat]');

        if (setButton) {
            plan.sets = toggleIn(plan.sets, setButton.dataset.key ?? '');
        } else if (statButton) {
            const slot = statButton.dataset.slot ?? '';
            plan.stats[slot] = toggleIn(plan.stats[slot] ?? [], statButton.dataset.stat ?? '');
        } else if (target.closest('[data-plan-reset]')) {
            plans[id] = clonePlan(defaults[id] ?? emptyPlan());
            update();
            return;
        } else {
            return;
        }

        plans[id] = plan;
        update();
    });

    panel.querySelector('[data-roster-all]')?.addEventListener('click', () => {
        toggles.forEach((toggle) => {
            if (!toggle.hidden) owned.add(toggle.dataset.id ?? '');
        });
        update();
    });

    panel.querySelector('[data-roster-clear]')?.addEventListener('click', () => {
        owned.clear();
        setStatus('');
        update();
    });

    searchEl?.addEventListener('input', () => {
        const query = searchEl.value.trim().toLowerCase();
        toggles.forEach((toggle) => {
            toggle.hidden = !!query && !(toggle.dataset.name ?? '').includes(query);
        });
        groups.forEach((group) => {
            group.hidden = ![...group.querySelectorAll<HTMLElement>('[data-roster-toggle]')].some(
                (toggle) => !toggle.hidden,
            );
        });
    });

    // ---- Export / import -------------------------------------------------

    const serialize = () => {
        const ids = [...owned].sort();
        return JSON.stringify({
            app: EXPORT_APP,
            version: 2,
            owned: ids,
            plans: Object.fromEntries(ids.map((id) => [id, plans[id]])),
        });
    };

    /**
     * Accepts the export object, a bare array, or a comma/space/newline list.
     * Older exports (version 1) hold agents only; their plans start at the
     * defaults.
     */
    const parseImport = (raw: string): { ids: string[]; plans: Record<string, unknown> } | null => {
        const text = raw.trim();
        if (!text) return null;

        try {
            const parsed = JSON.parse(text);
            const list = Array.isArray(parsed) ? parsed : parsed?.owned;
            if (!Array.isArray(list)) return null;

            return {
                ids: list.filter((item): item is string => typeof item === 'string'),
                plans:
                    parsed?.plans && typeof parsed.plans === 'object' ? parsed.plans : {},
            };
        } catch {
            return {
                ids: text
                    .split(/[\s,;]+/)
                    .map((item) => item.trim().toLowerCase())
                    .filter(Boolean),
                plans: {},
            };
        }
    };

    const applyImport = (raw: string) => {
        const parsed = parseImport(raw);
        if (!parsed || parsed.ids.length === 0) {
            setStatus(msg('msgInvalid'));
            return;
        }

        const next = new Set<string>();
        let ignored = 0;
        parsed.ids.forEach((entry) => {
            const id = entry.trim().toLowerCase();
            if (!knownIds.has(id)) {
                ignored += 1;
                return;
            }
            next.add(id);

            const imported = sanitizePlan(parsed.plans[id]);
            if (imported) plans[id] = cleanPlan(id, imported);
        });

        owned = next;
        update();

        const messages = [msg('msgImported').replace('{count}', String(next.size))];
        if (ignored > 0) messages.push(msg('msgIgnored').replace('{count}', String(ignored)));
        setStatus(messages.join(' '));
    };

    panel.querySelector('[data-roster-copy]')?.addEventListener('click', async () => {
        const text = serialize();
        if (textEl) textEl.value = text;

        try {
            await navigator.clipboard.writeText(text);
            setStatus(msg('msgCopied'));
        } catch {
            textEl?.select();
            setStatus(msg('msgCopyFailed'));
        }
    });

    panel.querySelector('[data-roster-download]')?.addEventListener('click', () => {
        const url = URL.createObjectURL(new Blob([serialize()], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'zzz-owned-agents.json';
        document.body.append(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    });

    panel
        .querySelector('[data-roster-import]')
        ?.addEventListener('click', () => applyImport(textEl?.value ?? ''));

    fileEl?.addEventListener('change', async () => {
        const file = fileEl.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            if (textEl) textEl.value = text;
            applyImport(text);
        } catch {
            setStatus(msg('msgInvalid'));
        } finally {
            fileEl.value = '';
        }
    });

    // Keep other open tabs in sync.
    window.addEventListener('storage', (event) => {
        if (event.key !== OWNED_KEY && event.key !== PLANS_KEY) return;
        load();
        render();
    });

    load();
    render();
    applySort();
}
