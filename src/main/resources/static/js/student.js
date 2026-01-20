import { renderHome } from "./features/professor/home.js";
import { renderResult } from "./features/student/result.js";

const routes = {
  home: renderHome,
  result: renderResult
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
