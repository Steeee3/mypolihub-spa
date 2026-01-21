let csrf = null;

export async function initCsrf() {
    if (csrf) return csrf;

    const res = await fetch("/api/csrf", { credentials: "same-origin" });
    if (!res.ok) throw new Error("CSRF non disponibile");
    csrf = await res.json();

    return csrf;
}

export async function apiFetch(url, options = {}) {
    const method = (options.method || "GET").toUpperCase();

    const headers = new Headers(options.headers || {});
    headers.set("Accept", "application/json");

    // CSRF
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        const { headerName, token } = await initCsrf();
        headers.set(headerName, token);

        if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
            headers.set("Content-Type", "application/json");
        }
    }

    const res = await fetch(url, {
        ...options,
        method,
        headers,
        credentials: "same-origin",
    });

    const contentType = res.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
        ? await res.json().catch(() => null)
        : await res.text().catch(() => null);

    const messageFrom = (p) => (p && typeof p === "object" ? p.message : p) || "Errore server";

    if (res.status === 401) {
        window.location.href = "/login";
        return;
    }

    if (!res.ok) {
        throw new Error(messageFrom(payload));
    }

    return payload;
}