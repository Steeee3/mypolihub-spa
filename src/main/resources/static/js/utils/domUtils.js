export function normalize(value) {
    return String(value ?? "").toLowerCase().trim();
}

export function cloneTemplateFirstChild(templateEl) {
    return templateEl.content.firstElementChild.cloneNode(true);
}

export function setText(el, value) {
    if (!el) return;
    el.textContent = String(value);
}

export function setTextIn(root, selector, value) {
    if (!root) return;
    const el = root.querySelector(selector);
    if (!el) return;
    el.textContent = String(value);
}