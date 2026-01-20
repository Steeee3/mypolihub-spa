import { templateFetch } from "./template.js"

export async function renderHeader(userData) {
    const header = await templateFetch("/templates/header.html");
    const mainContainer = document.getElementById("mainContainer");
    mainContainer.prepend(header);

    const hello = document.getElementById("helloName");
    if (hello) hello.textContent = `Ciao ${userData.name} 👋`;

    const heroPill = document.getElementById("heroPillText");
    if (heroPill) heroPill.textContent = `Dashboard ${userData.role}`;

    const verbaliBtn = document.getElementById("verbaliBtn");
    if (verbaliBtn) verbaliBtn.hidden = (userData.role !== "PROFESSOR");
}