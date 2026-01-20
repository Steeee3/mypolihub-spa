import { getUserData } from "../../services/userDataApi.js";
import { getProfessorCourses, getStudentCourses } from "../../services/coursesApi.js";
import {
    getExamsForCourse,
    getExamsWhereStudentIsRegistered,
    registerToExam,
} from "../../services/examsApi.js";

import { templateFetch } from "../../common/template.js";
import { renderHeader } from "../../common/header.js";

import { Role } from "../../utils/Role.js";
import { escapeHtml, formatDateIT, formatTimeIT } from "../../utils/utils.js";

// -----------------------------
// Entry point
// -----------------------------

export async function renderHome({ root = document.getElementById("app") } = {}) {
    const user = await getUserData();

    await mountHome(root);
    await renderHeader(user);

    const courses = await loadCoursesForRole(user.role);

    renderHomeStats(courses);
    renderCourseCards(courses, user.role);
    bindCourseSearchAndSort();
}

// -----------------------------
// Mounting
// -----------------------------

async function mountHome(root) {
    root.appendChild(await templateFetch("/templates/home.html"));
}

// -----------------------------
// Data loading
// -----------------------------

async function loadCoursesForRole(role) {
    return isProfessor(role)
        ? await getProfessorCourses("desc")
        : await getStudentCourses();
}

// -----------------------------
// Stats rendering
// -----------------------------

function renderHomeStats(courses) {
    const totals = computeCourseTotals(courses);

    updateStatsText(totals);
    updateEmptyCoursesNote(totals.totalCourses);
}

function computeCourseTotals(courses) {
    return {
        totalCourses: courses.length,
        totalCfu: courses.reduce((sum, c) => sum + c.cfu, 0),
    };
}

function updateStatsText({ totalCourses, totalCfu }) {
    setText("statTotalCourses", totalCourses);
    setText("pillTotalCourses", `Totali: ${totalCourses}`);
    setText("sideTotalCourses", totalCourses);

    setText("statTotalCfu", totalCfu);
    setText("sideTotalCfu", totalCfu);
}

function updateEmptyCoursesNote(totalCourses) {
    const note = document.getElementById("emptyCoursesNote");
    if (note) note.hidden = totalCourses !== 0;
}

// -----------------------------
// Courses rendering
// -----------------------------

function renderCourseCards(courses, role) {
    const container = getCoursesContainer();
    const template = document.getElementById("courseCardTpl");

    for (const course of courses) {
        const card = cloneTemplateFirstChild(template);
        container.appendChild(card);

        renderCourseCard(card, course);
        renderCourseMajors(card, course);
        bindCourseCardEvents(card, course.id, role);
    }
}

function getCoursesContainer() {
    // Support both SPA + old MVC ids (whichever is in the template)
    return document.getElementById("coursesGrid")
        || document.getElementById("courses");
}

function renderCourseCard(card, course) {
    card.id = `course-${course.id}`;

    renderCourseMainFields(card, course);
    renderCourseSecondaryFields(card, course);
    updateCourseSearchDataset(card, course);
}

function renderCourseMainFields(card, course) {
    card.querySelector(".course-name").textContent = course.name;
    card.querySelector(".course-cfu").textContent = `${course.cfu} CFU`;
    card.querySelector(".course-semester").textContent = `${course.semester} SEMESTRE`;
}

function renderCourseSecondaryFields(card, course) {
    const professorName = formatProfessorName(course.professor);
    const studentsCount = String(course.students.length);

    card.querySelector(".course-prof").textContent = professorName;
    card.querySelector(".course-students").textContent = studentsCount;

    card.querySelector(".course-prof-2").textContent = professorName;
    card.querySelector(".course-semester-2").textContent = course.semester;
    card.querySelector(".course-students-2").textContent = studentsCount;
}

function formatProfessorName(professor) {
    return `${professor.name} ${professor.surname}`;
}

function renderCourseMajors(card, course) {
    const container = card.querySelector(".course-majors");
    if (!container) return;

    container.innerHTML = course.majors
        .map((m) => buildMajorLine(m))
        .join("");
}

function buildMajorLine(major) {
    const name = escapeHtml(major.name);
    const level = escapeHtml(major.degreeLevel.name);

    return `<div><span>${name}</span> · <span>${level}</span></div>`;
}

function updateCourseSearchDataset(card, course) {
    const professorName = formatProfessorName(course.professor);
    const majorsText = buildMajorsSearchText(course.majors);

    card.dataset.name = normalize(course.name);
    card.dataset.cfu = String(course.cfu ?? 0);
    card.dataset.prof = normalize(professorName);
    card.dataset.major = normalize(majorsText);
}

function buildMajorsSearchText(majors) {
    return (majors || [])
        .map(m => `${m?.name ?? ""} ${m?.degreeLevel?.name ?? ""}`.trim())
        .join(" ");
}

// -----------------------------
// Courses search + sort
// -----------------------------

function bindCourseSearchAndSort() {
    const container = getCoursesContainer();
    if (!container) return;

    const cards = Array.from(container.querySelectorAll(".course-card"));
    if (cards.length === 0) return;

    const searchInput = document.getElementById("courseSearch");
    const sortSelect = document.getElementById("courseSort");
    const pill = document.getElementById("visibleCountPill");

    const ui = {
        container,
        cards,
        searchInput,
        sortSelect,
        pill,
    };

    const apply = () => applyCourseFilterAndSort(ui);

    if (searchInput) searchInput.addEventListener("input", apply);
    if (sortSelect) sortSelect.addEventListener("change", apply);

    apply();
}

function applyCourseFilterAndSort(ui) {
    filterCourses(ui);
    sortVisibleCourses(ui);
    updateVisibleCountPill(ui);
}

function filterCourses({ cards, searchInput }) {
    const query = normalize(searchInput ? searchInput.value : "");

    for (const card of cards) {
        const haystack = [
            card.dataset.name,
            card.dataset.major,
            card.dataset.prof,
        ].join(" ");

        card.style.display = haystack.includes(query) ? "" : "none";
    }
}

function sortVisibleCourses({ container, cards, sortSelect }) {
    const mode = sortSelect ? sortSelect.value : "nameDesc";

    const visible = cards.filter(c => c.style.display !== "none");

    visible.sort((a, b) => compareCourseCards(a, b, mode));
    visible.forEach(el => container.appendChild(el));
}

function compareCourseCards(a, b, mode) {
    const an = a.dataset.name || "";
    const bn = b.dataset.name || "";
    const ac = parseInt(a.dataset.cfu || "0", 10);
    const bc = parseInt(b.dataset.cfu || "0", 10);

    if (mode === "nameAsc") return an.localeCompare(bn);
    if (mode === "nameDesc") return bn.localeCompare(an);
    if (mode === "cfuAsc") return ac - bc;
    if (mode === "cfuDesc") return bc - ac;

    return 0;
}

function updateVisibleCountPill({ cards, pill }) {
    if (!pill) return;
    const count = cards.filter(c => c.style.display !== "none").length;
    pill.textContent = `Visibili: ${count}`;
}

// -----------------------------
// Course interactions
// -----------------------------

function bindCourseCardEvents(card, courseId, role) {
    const details = card.querySelector(".course-details");
    const openButton = card.querySelector(".open-exams");

    openButton.addEventListener("click", async () => {
        await toggleCourseExams(card, courseId, role);

        if (details) details.open = true;

        focusCourseCard(card, courseId);
    });
}

function focusCourseCard(card, courseId) {
    history.replaceState(
        null,
        "",
        `#home?courseId=${encodeURIComponent(courseId)}#course-${courseId}`
    );

    document.querySelectorAll(".course-card.is-selected")
        .forEach((el) => el.classList.remove("is-selected"));

    card.classList.add("is-selected");
    card.scrollIntoView({ behavior: "smooth", block: "start" });

    card.setAttribute("tabindex", "-1");
    card.focus({ preventScroll: true });
}

// -----------------------------
// Exams rendering
// -----------------------------

async function toggleCourseExams(card, courseId, role) {
    const ui = getExamPanelElements(card);

    if (isExamPanelOpen(ui)) {
        closeExamPanel(ui);
        return;
    }

    await openAndRenderExamPanel(ui, courseId, role);
}

function getExamPanelElements(card) {
    return {
        block: card.querySelector(".exam-block"),
        list: card.querySelector(".exam-list"),
        empty: card.querySelector(".exam-empty"),
        count: card.querySelector(".exam-count"),
    };
}

function isExamPanelOpen(ui) {
    return !ui.block.hidden;
}

function closeExamPanel(ui) {
    ui.block.hidden = true;
}

async function openAndRenderExamPanel(ui, courseId, role) {
    const exams = await getExamsForCourse(courseId);

    ui.block.hidden = false;
    ui.list.innerHTML = "";
    ui.count.textContent = String(exams.length);

    if (exams.length === 0) {
        ui.empty.hidden = false;
        return;
    }

    ui.empty.hidden = true;

    const registeredExamIds = await loadRegisteredExamIds(role, courseId);
    const rowTemplate = await templateFetch("/templates/home/exams.html");

    for (const exam of exams) {
        const row = rowTemplate.cloneNode(true);
        renderExamRow(row, exam, role, courseId, registeredExamIds);
        ui.list.appendChild(row);
    }
}

async function loadRegisteredExamIds(role, courseId) {
    return isStudent(role)
        ? await getExamsWhereStudentIsRegistered(courseId)
        : [];
}

function renderExamRow(row, exam, role, courseId, registeredExamIds) {
    renderExamDateTime(row, exam.date);
    renderExamLink(row, exam.id, role);
    renderExamActions(row, { role, courseId, examId: exam.id, registeredExamIds });
}

function renderExamDateTime(row, date) {
    row.querySelector(".exam-date").textContent = formatDateIT(date);
    row.querySelector(".exam-time").textContent = formatTimeIT(date);
}

function renderExamLink(row, examId, role) {
    const link = row.querySelector(".exam-item");
    link.href = isProfessor(role)
        ? `#iscritti?examId=${encodeURIComponent(examId)}`
        : `#esito?examId=${encodeURIComponent(examId)}`;
}

// -----------------------------
// Exam actions
// -----------------------------

function renderExamActions(row, ctx) {
    const actionsEl = row.querySelector(".exam-actions");
    if (!actionsEl) return;

    if (!isStudent(ctx.role)) {
        actionsEl.innerHTML = "";
        return;
    }

    if (ctx.registeredExamIds.includes(ctx.examId)) {
        renderRegisteredBadge(actionsEl);
        return;
    }

    renderRegisterButton(actionsEl, ctx);
}

function renderRegisteredBadge(container) {
    container.innerHTML = `<span class="pill pill-ok"><span class="ok-ico"></span> Iscritto</span>`;
}

function renderRegisterButton(container, { examId, courseId, registeredExamIds }) {
    container.innerHTML = `<button type="button" class="btn btn-accent btn-mini">Iscriviti</button>`;

    const button = container.querySelector("button");
    button.addEventListener("click", async () => {
        setRegisterButtonLoading(button);

        try {
            await registerToExam(examId, courseId);

            registeredExamIds.push(examId);
            renderRegisteredBadge(container);
        } catch (err) {
            console.error(err);
            resetRegisterButton(button);
            alert(err.message || "Errore durante l'iscrizione");
        }
    });
}

function setRegisterButtonLoading(button) {
    button.disabled = true;
    button.textContent = "Iscrizione...";
}

function resetRegisterButton(button) {
    button.disabled = false;
    button.textContent = "Iscriviti";
}

// -----------------------------
// Small utilities
// -----------------------------

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
}

function cloneTemplateFirstChild(templateEl) {
    return templateEl.content.firstElementChild.cloneNode(true);
}

function normalize(value) {
    return String(value ?? "").toLowerCase().trim();
}

function isProfessor(role) {
    return role === Role.PROFESSOR || role === "PROFESSOR";
}

function isStudent(role) {
    return role === Role.STUDENT || role === "STUDENT";
}
