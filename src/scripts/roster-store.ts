/**
 * Browser storage shared by the My agents page and the Drive Disc sets page.
 *
 * Two values are kept in localStorage:
 * - the ids of the agents the user owns;
 * - one plan per agent: the sets and the Disc 4/5/6 main stats the user
 *   intends to use. A plan is only stored once it exists; until then the
 *   page falls back to the agent's default (its first recommendations).
 */

export type Plan = {
    /** `<set id>:<pieces>` keys. */
    sets: string[];
    /** Raw stat keys per slot (`disc4`, `disc5`, `disc6`). */
    stats: Record<string, string[]>;
};

export type Plans = Record<string, Plan>;

export const OWNED_KEY = 'zzz-builds:owned-characters';
export const PLANS_KEY = 'zzz-builds:agent-plans';

const isStringArray = (value: unknown): value is string[] =>
    Array.isArray(value) && value.every((item) => typeof item === 'string');

export const emptyPlan = (): Plan => ({ sets: [], stats: {} });

export const clonePlan = (plan: Plan): Plan => ({
    sets: [...plan.sets],
    stats: Object.fromEntries(
        Object.entries(plan.stats).map(([slot, stats]) => [slot, [...stats]]),
    ),
});

/** Returns a plan only when it has the expected shape. */
export const sanitizePlan = (value: unknown): Plan | null => {
    const raw = value as Partial<Plan> | null;

    if (!raw || typeof raw !== 'object' || !isStringArray(raw.sets)) return null;
    if (!raw.stats || typeof raw.stats !== 'object') return null;

    const stats: Record<string, string[]> = {};
    for (const [slot, list] of Object.entries(raw.stats)) {
        if (isStringArray(list)) stats[slot] = [...list];
    }

    return { sets: [...raw.sets], stats };
};

export const readOwned = (): string[] => {
    try {
        const parsed = JSON.parse(localStorage.getItem(OWNED_KEY) ?? '[]');
        return Array.isArray(parsed)
            ? parsed.filter((id): id is string => typeof id === 'string')
            : [];
    } catch {
        return [];
    }
};

export const writeOwned = (ids: Iterable<string>) => {
    try {
        localStorage.setItem(OWNED_KEY, JSON.stringify([...ids]));
    } catch {
        // The selection still works for this visit without persistence.
    }
};

export const readPlans = (): Plans => {
    try {
        const parsed = JSON.parse(localStorage.getItem(PLANS_KEY) ?? '{}');
        const plans: Plans = {};

        if (parsed && typeof parsed === 'object') {
            for (const [id, value] of Object.entries(parsed)) {
                const plan = sanitizePlan(value);
                if (plan) plans[id] = plan;
            }
        }

        return plans;
    } catch {
        return {};
    }
};

export const writePlans = (plans: Plans) => {
    try {
        localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
    } catch {
        // The plans still work for this visit without persistence.
    }
};

/** The stored plan, else the agent's default, else nothing. */
export const resolvePlan = (
    id: string,
    plans: Plans,
    defaults: Record<string, Plan>,
): Plan => plans[id] ?? defaults[id] ?? emptyPlan();
