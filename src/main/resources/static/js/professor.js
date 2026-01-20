import { renderHome } from "./features/professor/home.js";

document.addEventListener("DOMContentLoaded", async () => {
  const root = document.getElementById("app");
  await renderHome({ root });
});
