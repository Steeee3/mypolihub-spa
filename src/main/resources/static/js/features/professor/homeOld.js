// src/main/resources/static/js/pages/home/home.js
import { apiFetch } from "../../common/api.js";
import { getUserData } from "../../services/userDataApi.js";
import { templateFetch } from "../../common/template.js";
import { getProfessorCourses, getStudentCourses } from "../../services/coursesApi.js";
import { getExamsForCourse } from "../../services/examsApi.js";

export async function renderHome({ root = document.getElementById("app") } = {}) {
    // 1) carico template html (file separato)
    const html = await templateFetch("/templates/home.html");
    root.appendChild(html);

    // 2) prendo info utente
    const me = await getUserData();
    await fillHeader(me);

    // 3) prendo corsi in base al ruolo
    const courses = await loadCoursesForRole(me.role);

    // 4) render corsi + stats
    fillStats(courses);
    renderCoursesGrid(courses, me.role);
}

/*
 * -----------------------------
 * Data loading
 * ----------------------------- 
 */

async function loadCoursesForRole(role) {
    if (role === "PROFESSOR") {
        return getProfessorCourses({ sortDir: "desc" });
    }
    return getStudentCourses(); // già desc come da specifica
}

/* -----------------------------
 * Header / UI
 * ----------------------------- */

async function fillHeader(userData) {
    const header = await templateFetch("/templates/header.html");
    const mainContent = document.getElementById("mainContainer");
    mainContent.prepend(header);

    const hello = document.getElementById("helloName");
    if (hello) hello.textContent = `Ciao ${userData.name} 👋`;

    const heroPill = document.getElementById("heroPillText");
    if (heroPill) heroPill.textContent = `Dashboard ${userData.role}`;

    const verbaliBtn = document.getElementById("verbaliBtn");
    if (verbaliBtn) verbaliBtn.hidden = (userData.role !== "PROFESSOR");
}

function fillStats(courses) {
    const total = Array.isArray(courses) ? courses.length : 0;
    const sumCfu = (courses || []).reduce((acc, c) => acc + (Number(c.cfu) || 0), 0);

    setText("statTotalCourses", total);
    setText("pillTotalCourses", `Totali: ${total}`);
    setText("sideTotalCourses", total);

    setText("statTotalCfu", sumCfu);
    setText("sideTotalCfu", sumCfu);

    // empty note
    const empty = document.getElementById("emptyCoursesNote");
    if (empty) empty.hidden = total !== 0;
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
}

function focusCourseCard(card, courseId) {
    history.replaceState(null, "", `#home?courseId=${encodeURIComponent(courseId)}#course-${courseId}`);

    document.querySelectorAll(".course-card.is-selected")
        .forEach(el => el.classList.remove("is-selected"));
    card.classList.add("is-selected");

    card.scrollIntoView({ behavior: "smooth", block: "start" });

    card.setAttribute("tabindex", "-1");
    card.focus({ preventScroll: true });
}

/* -----------------------------
 * Render courses
 * ----------------------------- */

function renderCoursesGrid(courses, role) {
    const grid = document.getElementById("courses");
    const tpl = document.getElementById("courseCardTpl");

    if (!grid || !tpl) return;

    grid.innerHTML = ""; // pulizia

    for (const c of (courses || [])) {
        const card = tpl.content.firstElementChild.cloneNode(true);

        card.id = `course-${c.id}`;

        // ---- testo base (head)
        card.querySelector(".course-name").textContent = c.name ?? "—";
        card.querySelector(".course-cfu").textContent = `${c.cfu ?? 0} CFU`;
        card.querySelector(".course-semester").textContent = c.semester ? `${c.semester} SEMESTRE` : "—";

        const profName = c.professor ? `${c.professor.name} ${c.professor.surname}` : "—";
        card.querySelector(".course-prof").textContent = profName;

        const studentsCount = c.studentsCount ?? (c.students ? c.students.length : 0);
        card.querySelector(".course-students").textContent = String(studentsCount);

        // ---- details duplicati
        card.querySelector(".course-prof-2").textContent = profName;
        card.querySelector(".course-semester-2").textContent = c.semester ? `${c.semester} SEMESTRE` : "—";
        card.querySelector(".course-students-2").textContent = String(studentsCount);

        // majors (Percorso)
        fillMajors(card.querySelector(".course-majors"), c);

        // ---- bind click: Visualizza Appelli
        const details = card.querySelector(".course-details");
        const btn = card.querySelector(".open-exams");
        btn.addEventListener("click", async () => {
            await onOpenExams(card, c.id, role);

            if (details) details.open = true;

            focusCourseCard(card, c.id);
        });

        // salva courseId su card (utile)
        card.dataset.courseId = String(c.id);

        grid.appendChild(card);
    }
}

function fillMajors(container, course) {
    if (!container) return;

    const majors = course.majors || [];
    if (!majors.length) {
        container.textContent = "—";
        return;
    }

    container.innerHTML = majors.map(m => {
        const name = m?.name ?? "—";
        const level = m?.degreeLevel?.name ?? "—";
        const year = (m?.yearOfStudy != null) ? `${m.yearOfStudy} Anno` : "—";
        return `<div><span>${escapeHtml(name)}</span> · <span>${escapeHtml(level)}</span><br><span class="major-year">${escapeHtml(year)}</span></div>`;
    }).join("");
}

function escapeHtml(s) {
    return String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/* -----------------------------
 * Exams behavior
 * ----------------------------- */

async function onOpenExams(card, courseId, role) {
    const block = card.querySelector(".exam-block");
    const list = card.querySelector(".exam-list");
    const empty = card.querySelector(".exam-empty");
    const count = card.querySelector(".exam-count");

    if (!block || !list || !empty || !count) return;

    if (!block.hidden) {
        block.hidden = true;
        return;
    }

    const exams = await getExamsForCourse(courseId);

    block.hidden = false;
    list.innerHTML = "";
    count.textContent = String(exams.length);

    if (exams.length == 0) {
        empty.hidden = false;
        return;
    }
    empty.hidden = true;

    const examTemplate = await templateFetch("/templates/home/exams.html");
    for (const e of exams) {
        const row = examTemplate.cloneNode(true);

        row.querySelector(".exam-date").textContent = formatDateIT(e.date);
        row.querySelector(".exam-time").textContent = formatTimeIT(e.date);

        // link alla pagina successiva (hash routing SPA)
        const a = row.querySelector(".exam-item");
        if (role === "PROFESSOR") {
            a.href = `#iscritti?examId=${encodeURIComponent(e.id)}`;
        } else {
            a.href = `#esito?examId=${encodeURIComponent(e.id)}`;
        }

        list.appendChild(row);
    }
}

function formatDateIT(iso) {
    // iso tipo "2026-01-19T10:30:00" o simile
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

function formatTimeIT(iso) {
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${min}`;
}
