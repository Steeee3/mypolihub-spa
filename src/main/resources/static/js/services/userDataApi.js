import { apiFetch } from "../common/api.js";

export async function getUserData() {
    return await apiFetch("/api/me");
}