/**
 * Masonry layout for the Drive Disc sets grid.
 *
 * Cards have very different heights (usage chips, My agents stats, ...). A
 * plain grid pads short cards to the height of the tallest card in the row.
 * Here each card keeps its natural height and spans as many 4px grid rows as
 * it needs, so the next card in the same column slides up beneath it.
 * Order stays left to right, and filtering/sorting keep working because
 * hidden cards simply measure 0.
 */

const ROW_UNIT = 4; // Must match `grid-auto-rows` in disc-sets.css.

const grid = document.querySelector<HTMLElement>('[data-disc-grid]');

if (grid) {
    const gap = parseFloat(getComputedStyle(grid).columnGap) || 12;
    const cards = Array.from(
        grid.querySelectorAll<HTMLElement>('[data-disc-card]'),
    );
    let frame = 0;

    const layout = () => {
        frame = 0;
        cards.forEach((card) => {
            const height = card.getBoundingClientRect().height;
            if (height <= 0) return;
            card.style.gridRowEnd = `span ${Math.ceil((height + gap) / ROW_UNIT)}`;
        });
    };
    const schedule = () => {
        if (!frame) frame = requestAnimationFrame(layout);
    };

    grid.setAttribute('data-masonry', '');

    // Fires on first paint and whenever a card changes size (stats rendered,
    // window resized, card shown by a filter).
    const observer = new ResizeObserver(schedule);
    cards.forEach((card) => observer.observe(card));
    window.addEventListener('load', schedule);
    schedule();
}
