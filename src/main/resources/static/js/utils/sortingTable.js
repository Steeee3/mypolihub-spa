// -----------------------------
// UI binding
// -----------------------------

export function bindSortingHeaders({ root = document, sort, onChange } = {}) {
    const headers = root.querySelectorAll("th.is-sortable");

    headers.forEach((th) => {
        const key = th.dataset.sortKey;
        const btn = th.querySelector("button.th-link");
        if (!btn || !key) return;

        btn.addEventListener("click", () => {
            toggleSort(sort, key);
            if (typeof onChange === "function") onChange();
            renderSortIndicators({ root, sort });
        });
    });

    renderSortIndicators({ root, sort });
}

export function toggleSort(sort, key) {
    if (sort.key === key) {
        sort.dir = sort.dir === "asc" ? "desc" : "asc";
        return;
    }
    sort.key = key;
    sort.dir = "asc";
}

export function renderSortIndicators({ root = document, sort } = {}) {
    const headers = root.querySelectorAll("th.is-sortable");

    headers.forEach((th) => {
        const key = th.dataset.sortKey;
        const ico = th.querySelector(".sort-ico");

        th.classList.remove("is-active");
        ico?.classList.remove("asc", "desc");

        if (key !== sort.key) return;

        th.classList.add("is-active");
        ico?.classList.add(sort.dir === "asc" ? "asc" : "desc");
    });
}

// -----------------------------
// Generic sorter
// -----------------------------

export function sortBySpec(list, sort, getValue, tieBreaker) {
    const dir = sort.dir === "desc" ? -1 : 1;

    return [...(list || [])].sort((a, b) => {
        const va = getValue(a, sort.key);
        const vb = getValue(b, sort.key);

        const cmp = compareValues(va, vb) * dir;
        if (cmp !== 0) return cmp;

        if (typeof tieBreaker === "function") return tieBreaker(a, b);
        return 0;
    });
}

export function compareValues(a, b) {
    if (typeof a === "number" && typeof b === "number") return a - b;
    return String(a).localeCompare(String(b), "it", { sensitivity: "base" });
}

// -----------------------------
// Ranking helpers
// -----------------------------

export function createResultRankById(validResults) {
    const map = new Map();
    let rank = 1;

    for (const res of validResults || []) {
        if (res?.id == null) continue;
        map.set(Number(res.id), rank++);
    }
    return map;
}

export function getResultRank(result, resultRankById, normalizeFn) {
    if (!result) return 0;

    const rawValue = String(result.value || "").trim();
    const normalize = normalizeFn || defaultNormalize;

    const isEmptyValue = rawValue.length === 0 || normalize(rawValue) === "<vuoto>";
    if (isEmptyValue) return 0;

    const id = result.id != null ? Number(result.id) : null;
    if (id == null) return Number.MAX_SAFE_INTEGER;

    const rank = resultRankById.get(id);
    return rank != null ? rank : Number.MAX_SAFE_INTEGER;
}

export function createStatusRankByKey(order = ["non inserito", "inserito", "pubblicato", "rifiutato", "verbalizzato"]) {
    const map = new Map();
    order.forEach((s, idx) => map.set(s, idx));
    return map;
}

export function getStatusRank(status, statusRankByKey, normalizeFn) {
    const normalize = normalizeFn || defaultNormalize;
    const key = normalize(status || "");
    if (!key) return Number.MAX_SAFE_INTEGER;

    const rank = statusRankByKey.get(key);
    return rank != null ? rank : Number.MAX_SAFE_INTEGER;
}

function defaultNormalize(s) {
    return String(s || "").toLowerCase().trim();
}