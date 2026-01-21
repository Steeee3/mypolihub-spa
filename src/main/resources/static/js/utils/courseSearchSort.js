import { normalize } from "./domUtils.js";

export function setCourseCardDataset(card, { name, cfu, professorText, majorsText }) {
    card.dataset.name = normalize(name || "");
    card.dataset.cfu = String(cfu ?? 0);
    card.dataset.prof = normalize(professorText || "");
    card.dataset.major = normalize(majorsText || "");
}

export function bindCourseSearchAndSort({
    container,
    cards,
    searchInput,
    sortSelect,
    defaultSort = "nameDesc",
    onUpdate,
}) {
    if (!container) return;
    if (!Array.isArray(cards) || cards.length === 0) return;

    const ui = { container, cards, searchInput, sortSelect };

    const apply = () => {
        filterCourseCards(ui);
        sortVisibleCourseCards(ui, defaultSort);
        onUpdate?.({
            total: cards.length,
            visible: cards.filter(c => c.style.display !== "none").length,
            cards,
            container,
        });
    };

    searchInput?.addEventListener("input", apply);
    sortSelect?.addEventListener("change", apply);

    apply();
}

function filterCourseCards({ cards, searchInput }) {
    const q = normalize(searchInput?.value || "");

    for (const card of cards) {
        const haystack = [card.dataset.name, card.dataset.prof, card.dataset.major].join(" ");
        card.style.display = haystack.includes(q) ? "" : "none";
    }
}

function sortVisibleCourseCards({ container, cards, sortSelect }, fallbackMode) {
    const mode = sortSelect?.value || fallbackMode;
    const visible = cards.filter(c => c.style.display !== "none");

    visible.sort((a, b) => compareCourseCards(a, b, mode));
    visible.forEach(el => container.appendChild(el));
}

function compareCourseCards(a, b, mode) {
    const an = a.dataset.name || "";
    const bn = b.dataset.name || "";
    const ac = parseInt(a.dataset.cfu || "0", 10);
    const bc = parseInt(b.dataset.cfu || "0", 10);

    if (mode === "nameAsc") return an.localeCompare(bn);
    if (mode === "nameDesc") return bn.localeCompare(an);
    if (mode === "cfuAsc") return ac - bc;
    if (mode === "cfuDesc") return bc - ac;
    return 0;
}