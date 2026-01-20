import { renderHome } from "./features/professor/home.js";
import { renderIscritti } from "./features/professor/iscritti.js";

const routes = {
  home: renderHome,
  iscritti: renderIscritti
};

export function startRouter({ root = document.getElementById("app") } = {}) {
  window.addEventListener("hashchange", () => navigate(root));
  navigate(root);
}

async function navigate(root) {
  const { name, query } = parseHash(location.hash);

  const render = routes[name] || routes.home;

  root.innerHTML = "";
  await render({ root, query });
}

function parseHash(hash) {
  const clean = (hash || "").replace(/^#/, "");
  const [name = "home", qs = ""] = clean.split("?");
  const query = Object.fromEntries(new URLSearchParams(qs).entries());
  return { name, query };
}

document.addEventListener("DOMContentLoaded", () => {
  startRouter({ root: document.getElementById("app") });
});
