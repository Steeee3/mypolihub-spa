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
import { setCourseCardDataset, bindCourseSearchAndSort } from "../../utils/courseSearchSort.js";
import { cloneTemplateFirstChild, setTextIn } from "../../utils/domUtils.js";
import { formatDate, formatTime } from "../../utils/formatters.js";
import { escapeHtml } from "../../utils/utils.js";

/**
 * HOME PAGE — file sections overview
 *
 ** - Entry point
 *   Public `renderHome()` function:
 *   mounts the template, renders the header, loads courses (based on user role),
 *   renders stats + course cards, then enables search/sort.
 *
 ** - Mounting
 *   Injects the Home HTML template into the given root element (templateFetch).
 *
 ** - Data loading
 *   Fetches the course list from the backend depending on the role
 *
 ** - Stats rendering
 *   Computes and updates page statistics (total courses, total CFU),
 *   and toggles the empty-state note if needed.
 *
 ** - Courses rendering
 *   Creates and fills course cards from the template, renders majors,
 *   and sets searchable/sortable dataset fields on each card.
 *
 ** - Courses search + sort
 *   Binds the shared search/sort utility (`bindCourseSearchAndSort`) to
 *   the Home UI (input/select) and updates the “visible courses” pill.
 *
 ** - Course interactions
 *   Handles user interactions on a course card (open exams button, selection,
 *   URL update, scrolling/focus).
 *
 ** - Exams rendering
 *   Loads and renders the exam panel for a course (show/hide),
 *   including registered state resolution for students.
 *
 ** - Exam actions
 *   Renders student-only actions (register button / “registered” badge)
 *   and performs the registration call.
 *
 ** - Small utilities
 *   Role checks and small helper functions used across the file.
 */

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
    bindHomeCourseSearchAndSort();
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
    setTextIn(document, "#statTotalCourses", totalCourses);
    setTextIn(document, "#pillTotalCourses", `Totali: ${totalCourses}`);
    setTextIn(document, "#sideTotalCourses", totalCourses);

    setTextIn(document, "#statTotalCfu", totalCfu);
    setTextIn(document, "#sideTotalCfu", totalCfu);
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
    return document.getElementById("coursesGrid")
        || document.getElementById("courses");
}

function renderCourseCard(card, course) {
    card.id = `course-${course.id}`;

    renderCourseMainFields(card, course);
    renderCourseSecondaryFields(card, course);

    const professorName = formatProfessorName(course.professor);
    const majors = (course.majors || [])
        .map(m => `${m?.name ?? ""} ${m?.degreeLevel?.name ?? ""}`.trim())
        .join(" ");

    setCourseCardDataset(card, {
        name: course.name,
        cfu: course.cfu,
        professorText: professorName,
        majorsText: majors,
    });
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
    if (!professor) return "—";
    const name = professor.name || "";
    const surname = professor.surname || "";
    const full = `${name} ${surname}`.trim();
    return full.length ? full : "—";
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

// -----------------------------
// Courses search + sort
// -----------------------------

function bindHomeCourseSearchAndSort() {
    const container = getCoursesContainer();
    if (!container) return;

    const cards = Array.from(container.querySelectorAll(".course-card"));
    if (cards.length === 0) return;

    bindCourseSearchAndSort({
        container,
        cards,
        searchInput: document.getElementById("courseSearch"),
        sortSelect: document.getElementById("courseSort"),
        defaultSort: "nameDesc",
        onUpdate: ({ visible }) => {
            const pill = document.getElementById("visibleCountPill");
            if (pill) pill.textContent = `Visibili: ${visible}`;
        },
    });
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
    row.querySelector(".exam-date").textContent = formatDate(date);
    row.querySelector(".exam-time").textContent = formatTime(date);
}

function renderExamLink(row, examId, role) {
    const link = row.querySelector(".exam-item");
    link.href = isProfessor(role)
        ? `#iscritti?examId=${encodeURIComponent(examId)}`
        : `#result?examId=${encodeURIComponent(examId)}`;
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

function isProfessor(role) {
    return role === Role.PROFESSOR || role === "PROFESSOR";
}

function isStudent(role) {
    return role === Role.STUDENT || role === "STUDENT";
}
