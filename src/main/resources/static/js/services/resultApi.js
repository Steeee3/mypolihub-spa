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

export async function getResultByExamId(examId) {
    return await apiFetch(`/api/student/result?examId=${encodeURIComponent(examId)}`);
}

export async function declineResult(examId) {
    await apiFetch(
        `/api/student/result/${encodeURIComponent(examId)}/decline`,
        {
            method: "PATCH"
        }
    );
}