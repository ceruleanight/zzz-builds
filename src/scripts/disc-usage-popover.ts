/**
 * Hover card for the character chips under "ranked on" on the disc sets page.
 *
 * Each chip carries pre-rendered HTML in `data-usage-popover-html`. Hovering
 * or keyboard-focusing a chip shows it; touch input is ignored so a tap still
 * follows the link.
 */
export {};

const card = document.createElement('div');
card.className = 'usage-popover-card';
card.setAttribute('popover', 'manual');
card.setAttribute('role', 'tooltip');
document.body.append(card);

let activeChip: HTMLElement | null = null;

const getChip = (target: EventTarget | null) =>
    target instanceof Element
        ? target.closest<HTMLElement>('[data-usage-popover-html]')
        : null;

function position(chip: HTMLElement) {
    const chipRect = chip.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const edge = 8;
    const gap = 8;

    const left = Math.max(
        edge,
        Math.min(chipRect.left, window.innerWidth - cardRect.width - edge),
    );
    const below = chipRect.bottom + gap;
    const top =
        below + cardRect.height + edge <= window.innerHeight
            ? below
            : Math.max(edge, chipRect.top - gap - cardRect.height);

    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
}

function show(chip: HTMLElement) {
    const html = chip.dataset.usagePopoverHtml;
    if (!html) return;

    activeChip = chip;
    card.innerHTML = html;
    card.classList.remove('character-rarity-4', 'character-rarity-5');
    const rarity = chip.className.match(/character-rarity-(\d)/)?.[0];
    if (rarity) card.classList.add(rarity);
    chip.setAttribute('aria-describedby', 'usage-popover-card');
    card.id = 'usage-popover-card';

    if (!card.matches(':popover-open')) card.showPopover();
    position(chip);
}

function hide() {
    activeChip?.removeAttribute('aria-describedby');
    activeChip = null;
    if (card.matches(':popover-open')) card.hidePopover();
}

document.addEventListener('pointerover', (event) => {
    if ((event as PointerEvent).pointerType === 'touch') return;

    const chip = getChip(event.target);
    if (chip && chip !== activeChip) show(chip);
});

document.addEventListener('pointerout', (event) => {
    if (!activeChip) return;

    const next = event.relatedTarget;
    if (next instanceof Node && activeChip.contains(next)) return;

    hide();
});

document.addEventListener('focusin', (event) => {
    const chip = getChip(event.target);
    if (chip) show(chip);
});

document.addEventListener('focusout', () => hide());

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hide();
});

// Cards are filtered and re-sorted by card-filters.ts; scrolling or resizing
// would leave the card pointing at the wrong place, so close it.
window.addEventListener('scroll', hide, { passive: true, capture: true });
window.addEventListener('resize', hide);
