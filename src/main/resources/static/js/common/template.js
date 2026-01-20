export async function templateFetch(url) {
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) throw new Error(`Template non trovato: ${url}`);
    const html = await res.text();

    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.cloneNode(true);
}
