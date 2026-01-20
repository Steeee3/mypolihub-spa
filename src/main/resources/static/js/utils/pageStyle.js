export function ensurePageStyle(id, href) {
    let link = document.getElementById(id);

    if (!link) {
        link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        document.head.appendChild(link);
    }

    if (link.href !== new URL(href, location.origin).href) {
        link.href = href;
    }
}

export function removePageStyle(id) {
    document.getElementById(id)?.remove();
}