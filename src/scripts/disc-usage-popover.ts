/**
 * Hover card for the character chips under "ranked on" on the disc sets page.
 *
 * Each chip carries pre-rendered HTML in `data-usage-popover-html`. Hovering
 * or keyboard-focusing a chip shows it; touch input is ignored on the chip so a
 * tap still follows the link. On touch devices a separate preview button next
 * to the chip (`data-usage-preview`, shown via CSS only when hover is
 * unavailable) toggles the card instead.
 */
export {};

const card = document.createElement('div');
card.className = 'usage-popover-card';
card.setAttribute('popover', 'manual');
card.setAttribute('role', 'tooltip');
document.body.append(card);

let activeChip: HTMLElement | null = null;
let activeButton: HTMLElement | null = null;

const getChip = (target: EventTarget | null) =>
    target instanceof Element
        ? target.closest<HTMLElement>('[data-usage-popover-html]')
        : null;

const getPreviewButton = (target: EventTarget | null) =>
    target instanceof Element
        ? target.closest<HTMLElement>('[data-usage-preview]')
        : null;

const getChipForButton = (button: HTMLElement) =>
    button.parentElement?.querySelector<HTMLElement>(
        '[data-usage-popover-html]',
    ) ?? null;

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

function show(chip: HTMLElement, button: HTMLElement | null = null) {
    const html = chip.dataset.usagePopoverHtml;
    if (!html) return;

    activeButton?.setAttribute('aria-expanded', 'false');
    activeButton = button;
    activeButton?.setAttribute('aria-expanded', 'true');
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
    activeButton?.setAttribute('aria-expanded', 'false');
    activeChip = null;
    activeButton = null;
    if (card.matches(':popover-open')) card.hidePopover();
}

document.addEventListener('pointerover', (event) => {
    if ((event as PointerEvent).pointerType === 'touch') return;

    const chip = getChip(event.target);
    if (chip && chip !== activeChip) show(chip);
});

document.addEventListener('pointerout', (event) => {
    // Touch fires pointerout as soon as the finger lifts, which would close a
    // card opened with the preview button straight away.
    if ((event as PointerEvent).pointerType === 'touch') return;
    if (!activeChip) return;

    const next = event.relatedTarget;
    if (next instanceof Node && activeChip.contains(next)) return;

    hide();
});

document.addEventListener('click', (event) => {
    const button = getPreviewButton(event.target);
    if (!button) return;

    event.preventDefault();
    const chip = getChipForButton(button);
    if (!chip) return;

    if (activeButton === button) hide();
    else show(chip, button);
});

// Tapping anywhere else dismisses a card opened with a preview button. Taps on
// a preview button are left to its click handler so it can toggle.
document.addEventListener('pointerdown', (event) => {
    if (!activeButton || getPreviewButton(event.target)) return;
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
