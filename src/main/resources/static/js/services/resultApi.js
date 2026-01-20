import { apiFetch } from "../common/api.js";

// -----------------------------
// Cached reference data
// -----------------------------

let cachedValidResults = null;

export async function getAllValidResults() {
    if (cachedValidResults) return cachedValidResults;

    cachedValidResults = await apiFetch("/api/results/valid-only");
    return cachedValidResults;
}

export function clearValidResultsCache() {
    cachedValidResults = null;
}
