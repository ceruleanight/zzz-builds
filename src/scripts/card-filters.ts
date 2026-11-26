import { compareCharacterCards } from './character-sort.mjs';

type FilterKind = 'character' | 'wengine' | 'disc';
const sortStorageKeys = {
    character: 'zzz-builds:character-sort',
    wengine: 'zzz-builds:wengine-sort',
    disc: 'zzz-builds:disc-sort',
} as const;
const highPriorityImageCount = 4;

const selectors = {
    character: {
        form: '[data-character-filters]',
        card: '[data-character-card]',
        count: '[data-character-count]',
        empty: '[data-character-empty]',
    },
    wengine: {
        form: '[data-wengine-filters]',
        card: '[data-wengine-card]',
        count: '[data-wengine-count]',
        empty: '[data-wengine-empty]',
    },
    disc: {
        form: '[data-disc-filters]',
        card: '[data-disc-card]',
        count: '[data-disc-count]',
        empty: '[data-disc-empty]',
    },
} as const;

const kind = (Object.keys(selectors) as FilterKind[]).find((candidate) =>
    document.querySelector(selectors[candidate].form),
);

const cardValue = (card: HTMLElement, name: string) => card.dataset[name] ?? '';

function compareCatalogCards(
    left: HTMLElement,
    right: HTMLElement,
    sort: string,
) {
    const byName = cardValue(left, 'name').localeCompare(cardValue(right, 'name'));

    if (sort === 'release') {
        return (
            Number.parseFloat(cardValue(right, 'versionReleased')) -
            Number.parseFloat(cardValue(left, 'versionReleased')) || byName
        );
    }

    return byName;
}

if (kind) {
    const selector = selectors[kind];
    const form = document.querySelector<HTMLFormElement>(selector.form);
    const cards = Array.from(
        document.querySelectorAll<HTMLElement>(selector.card),
    );
    const count = document.querySelector<HTMLElement>(selector.count);
    const empty = document.querySelector<HTMLElement>(selector.empty);
    const searchInput = form?.elements.namedItem('search');
    const sortSelect = form?.elements.namedItem('sort');
    const sortStorageKey = sortStorageKeys[kind];
    const rosterPanel = document.querySelector<HTMLElement>('[data-roster-panel]');
    const discSetInputs = Array.from(
        form?.querySelectorAll<HTMLInputElement>('input[name="discSet"]') ?? [],
    );
    const discSetCount = form?.querySelector<HTMLElement>(
        '[data-disc-set-selection-count]',
    );
    const selectAllDiscSets = form?.querySelector<HTMLButtonElement>(
        '[data-disc-set-select-all]',
    );
    const clearAllDiscSets = form?.querySelector<HTMLButtonElement>(
        '[data-disc-set-clear-all]',
    );
    let characterIndex: { id: string; name: string }[] = [];

    try {
        const parsed = JSON.parse(rosterPanel?.dataset.characterIndex ?? '[]');
        if (Array.isArray(parsed)) characterIndex = parsed;
    } catch {
        characterIndex = [];
    }

    const matchesCharacter = (card: HTMLElement, value: string) => {
        const query = value.trim().toLowerCase();
        if (!query) return true;

        const matches = characterIndex.filter((character) =>
            character.name.toLowerCase().includes(query),
        );
        if (matches.length === 0) {
            return (card.dataset.characterNames ?? '').toLowerCase().includes(query);
        }

        const ownedIds = new Set(
            (rosterPanel?.dataset.ownedIds ?? '').split(' ').filter(Boolean),
        );
        const selectedIds = new Set(
            (card.dataset.selectedCharacterIds ?? '').split(' ').filter(Boolean),
        );
        const possibleIds = new Set(
            (card.dataset.usageIds ?? '').split(' ').filter(Boolean),
        );

        return matches.some(({ id }) =>
            ownedIds.has(id) ? selectedIds.has(id) : possibleIds.has(id),
        );
    };

    if (searchInput instanceof HTMLInputElement) {
        const searchParam = new URLSearchParams(window.location.search).get('search');
        if (searchParam !== null) {
            const matchingCard = cards.find((card) => card.dataset.id === searchParam);
            searchInput.value = matchingCard?.dataset.name ?? searchParam;
        }
    }

    const getElementYPosition = (element: HTMLElement) => {
        let currentElement: HTMLElement | null = element;
        let elementYPosition = 0;

        while (currentElement) {
            elementYPosition += currentElement.offsetTop;
            currentElement = currentElement.offsetParent as HTMLElement | null;
        }

        return elementYPosition;
    };

    const updateVisibleImageLoading = () => {
        const orderedCards = cards[0]?.parentElement
            ? Array.from(
                cards[0].parentElement.querySelectorAll<HTMLElement>(selector.card),
            )
            : cards;
        let highPriorityCount = 0;

        orderedCards.forEach((card) => {
            const image = card.querySelector<HTMLImageElement>('img');
            if (!image) return;

            const isAboveFold =
                !card.hidden && getElementYPosition(image) <= window.innerHeight;

            image.setAttribute('loading', isAboveFold ? 'eager' : 'lazy');
            if (isAboveFold && highPriorityCount < highPriorityImageCount) {
                image.setAttribute('fetchpriority', 'high');
                highPriorityCount += 1;
            } else {
                image.removeAttribute('fetchpriority');
            }
        });
    };

    if (sortSelect instanceof HTMLSelectElement) {
        try {
            const savedSort = localStorage.getItem(sortStorageKey);
            if (
                savedSort &&
                [...sortSelect.options].some((option) => option.value === savedSort)
            ) {
                sortSelect.value = savedSort;
            }
        } catch {
            // Storage can be unavailable in private or restricted browser contexts.
        }

        sortSelect.addEventListener('change', () => {
            try {
                localStorage.setItem(sortStorageKey, sortSelect.value);
            } catch {
                // Sorting still works for the current visit without persistence.
            }
        });
    }

    const applyFilters = () => {
        if (!form) return;

        const formData = new FormData(form);
        const selectedDiscSets = new Set(
            formData.getAll('discSet').map(String),
        );
        const values = Object.fromEntries(
            [...formData.entries()].filter(([name]) => name !== 'discSet'),
        );
        const search = String(values.search ?? '')
            .trim()
            .toLowerCase();
        const selectedDiscSetCount = selectedDiscSets.size;

        discSetInputs.forEach((input) => {
            input
                .closest('.disc-set-selection-option')
                ?.classList.toggle('is-selected', input.checked);
        });
        if (discSetCount) {
            discSetCount.textContent = `${selectedDiscSetCount} / ${discSetInputs.length} ${discSetCount.dataset.labelSelected ?? ''}`;
        }
        if (selectAllDiscSets) {
            selectAllDiscSets.disabled = selectedDiscSetCount === discSetInputs.length;
        }
        if (clearAllDiscSets) {
            clearAllDiscSets.disabled = selectedDiscSetCount === 0;
        }

        let visibleCount = 0;

        if (sortSelect instanceof HTMLSelectElement) {
            const sort = String(values.sort ?? sortSelect.value);

            cards[0]?.parentElement?.append(
                ...[...cards].sort((left, right) =>
                    kind === 'character'
                        ? compareCharacterCards(left, right, sort)
                        : compareCatalogCards(left, right, sort),
                ),
            );
        }

        cards.forEach((card) => {
            const matches = Object.entries(values).every(([name, value]) => {
                const selected = String(value);
                if (!selected || name === 'search' || name === 'sort') return true;

                if (name === 'character') {
                    return matchesCharacter(card, selected);
                }

                const key = name === 'updated' ? 'recentUpdated' : name;
                const cardValue = card.dataset[key] ?? '';
                return name === 'tagGroups'
                    ? cardValue.split(' ').includes(selected)
                    : cardValue === selected;
            });
            const visible =
                matches &&
                (!discSetInputs.length || selectedDiscSets.has(card.dataset.id ?? '')) &&
                (!search || (card.dataset.name?.toLowerCase().includes(search) ||
                    card.dataset.fullName?.toLowerCase().includes(search)));

            card.hidden = !visible;
            if (visible) visibleCount += 1;
        });

        if (count) {
            count.textContent = `${visibleCount} ${count.dataset.resultsLabel ?? ''}`;
        }
        if (empty) empty.hidden = visibleCount > 0;
        updateVisibleImageLoading();
    };

    form?.addEventListener('change', applyFilters);
    form?.addEventListener('input', applyFilters);
    form?.addEventListener('submit', (event) => event.preventDefault());
    selectAllDiscSets?.addEventListener('click', () => {
        discSetInputs.forEach((input) => {
            input.checked = true;
        });
        form?.dispatchEvent(new Event('input', { bubbles: true }));
    });
    clearAllDiscSets?.addEventListener('click', () => {
        discSetInputs.forEach((input) => {
            input.checked = false;
        });
        form?.dispatchEvent(new Event('input', { bubbles: true }));
    });
    if (sortSelect instanceof HTMLSelectElement) {
        sortSelect.addEventListener('change', applyFilters);
    }
    window.addEventListener('resize', updateVisibleImageLoading);
    applyFilters();
}

document
    .querySelector<HTMLElement>('[data-wengine-browser]')
    ?.addEventListener('click', (event) => {
        const button =
            event.target instanceof Element
                ? event.target.closest<HTMLButtonElement>('[data-wengine-refinement]')
                : null;
        const refinement = button?.dataset.wengineRefinement;
        const card = button?.closest<HTMLElement>('[data-wengine-card]');
        if (!button || !refinement || !card) return;

        card
            .querySelectorAll<HTMLElement>('[data-wengine-refinement]')
            .forEach((item) =>
                item.setAttribute(
                    'aria-pressed',
                    String(item.dataset.wengineRefinement === refinement),
                ),
            );
        card
            .querySelectorAll<HTMLElement>('[data-wengine-refinement-panel]')
            .forEach((panel) => {
                panel.hidden = panel.dataset.wengineRefinementPanel !== refinement;
            });
    });
