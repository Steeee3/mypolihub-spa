import { getUserData } from "../../services/userDataApi.js";
import { templateFetch } from "../../common/template.js";
import { renderHeader } from "../../common/header.js";
import { ensurePageStyle } from "../../utils/pageStyle.js";

import { getProfessorCourses } from "../../services/coursesApi.js";
import { getAllReportsByCourseId } from "../../services/reportsApi.js";

import { setCourseCardDataset, bindCourseSearchAndSort } from "../../utils/courseSearchSort.js";
import {
    cloneTemplateFirstChild,
    setText,
    setTextIn
} from "../../utils/domUtils.js";
import { formatDate, formatTime, formatDateTime } from "../../utils/formatters.js";

/**
 * VERBALI PAGE — file sections overview
 *
 ** - Entry point
 *   Bootstraps the page: loads user + template, initializes state/UI, loads courses,
 *   renders the page, binds course search/sort, and optionally opens a course/report from URL query.
 *
 ** - State + UI
 *   Defines the page state (courses, cached reports, open/selected course, visible courses count)
 *   and collects all DOM references used across the module.
 *
 ** - Data loading
 *   Fetches professor courses and lazily loads reports for a course (with in-memory caching).
 *
 ** - Page rendering
 *   High-level rendering orchestration: stats + courses.
 *   Computes counters (total/visible courses, selected course reports) and handles empty states.
 *
 ** - Courses rendering
 *   Builds course cards from templates, fills main fields (name/cfu/semester/professor/majors),
 *   syncs selection/open states, and prepares each card dataset for search/sort.
 *
 ** - Courses search + sort
 *   Uses the shared courseSearchSort utilities to filter and sort course cards.
 *   Updates UI counters (visible/total) and toggles “no results” visibility.
 *
 ** - Course interactions
 *   Handles “Show reports / Close” actions per course, manages selection focus,
 *   URL updates + scroll, and keeps the card UI in sync with the state.
 *
 ** - Reports panel rendering
 *   Renders the reports list for the selected course (or the empty message),
 *   builds report rows from template and sets navigation links.
 *
 ** - Query handling
 *   Reads courseId/reportId from the router query and opens or redirects accordingly
 *   (supports deep-links to a specific report and auto-open of a course).
 *
 ** - Errors
 *   Centralized error display/hide logic for page-level failures.
 *
 ** - Small utilities
 *   Formatting helpers (role label, professor name, report line) and safe numeric parsing.
 */

// -----------------------------
// Entry point
// -----------------------------

export async function renderReports({ root = document.getElementById("app"), query } = {}) {
    ensurePageStyle("reports-css", "/css/reports.css");

    const user = await getUserData();

    root.innerHTML = "";
    root.appendChild(await templateFetch("/templates/professor/reports.html"));
    await renderHeader(user);

    const ui = getUi();
    const state = createState({ user, ui, query });

    await loadCourses(state);
    renderPage(state);

    bindReportsCourseSearchAndSort(state);

    await openFromQueryIfPresent(state);
}

// -----------------------------
// State + UI
// -----------------------------

function createState({ user, ui, query }) {
    return {
        user,
        ui,
        query: query || {},

        courses: [],
        reportsByCourseId: new Map(),
        openCourseIds: new Set(),
        selectedCourseId: null,
        visibleCourses: null,
    };
}

function getUi() {
    return {
        pageError: document.getElementById("pageError"),
        pageErrorText: document.getElementById("pageErrorText"),

        heroRoleText: document.getElementById("heroRoleText"),
        totalCoursesBadge: document.getElementById("totalCoursesBadge"),
        totalReportsBadge: document.getElementById("totalReportsBadge"),

        coursesPill: document.getElementById("coursesPill"),
        noCoursesNote: document.getElementById("noCoursesNote"),
        coursesGrid: document.getElementById("coursesGrid"),

        sideCoursesNum: document.getElementById("sideCoursesNum"),
        sideReportsNum: document.getElementById("sideReportsNum"),

        courseCardTpl: document.getElementById("courseCardTpl"),
        reportItemTpl: document.getElementById("reportItemTpl"),

        courseSearch: document.getElementById("courseSearch"),
        courseSort: document.getElementById("courseSort"),
    };
}

// -----------------------------
// Data loading
// -----------------------------

async function loadCourses(state) {
    try {
        hideError(state);

        const courses = await getProfessorCourses({ sortDir: "asc" });
        state.courses = Array.isArray(courses) ? courses : [];
    } catch (err) {
        state.courses = [];
        showError(state, err?.message || "Errore nel caricamento corsi");
    }
}

async function loadReportsForCourse(state, courseId) {
    if (state.reportsByCourseId.has(courseId)) {
        return state.reportsByCourseId.get(courseId);
    }

    const reports = await getAllReportsByCourseId(courseId);
    const list = Array.isArray(reports) ? reports : [];
    state.reportsByCourseId.set(courseId, list);

    return list;
}

// -----------------------------
// Page rendering
// -----------------------------

function renderPage(state) {
    renderStats(state);
    renderCourseCards(state);
}

function renderStats(state) {
    const totalCourses = state.courses.length;
    const visibleCourses = state.visibleCourses ?? totalCourses;
    const selectedReports = getSelectedReportsCount(state);

    setText(state.ui.heroRoleText, buildHeroRoleText(state.user));

    setText(state.ui.totalCoursesBadge, String(totalCourses));
    
    setText(state.ui.coursesPill, `Corsi: ${visibleCourses}/${totalCourses}`);
    setText(state.ui.sideCoursesNum, String(visibleCourses));

    setText(state.ui.totalReportsBadge, String(selectedReports));
    setText(state.ui.sideReportsNum, String(selectedReports));

    const empty = totalCourses === 0;
    state.ui.noCoursesNote.hidden = !empty;
    state.ui.coursesGrid.hidden = empty;

    if (empty) state.ui.coursesGrid.innerHTML = "";
}

function getSelectedReportsCount(state) {
    if (state.selectedCourseId == null) return 0;
    const list = state.reportsByCourseId.get(state.selectedCourseId);
    return Array.isArray(list) ? list.length : 0;
}

// -----------------------------
// Courses rendering
// -----------------------------

function renderCourseCards(state) {
    const grid = state.ui.coursesGrid;
    grid.innerHTML = "";

    for (const course of state.courses) {
        const card = cloneTemplateFirstChild(state.ui.courseCardTpl);
        grid.appendChild(card);

        renderCourseCard(card, course);
        bindCourseCardEvents(state, card, course);

        syncCardSelectionState(state, card, Number(course.id));
        syncCardReportsState(state, card, Number(course.id));

        setReportsCourseDataset(card, course);
    }
}

function renderCourseCard(card, course) {
    const courseId = Number(course.id);

    card.id = `course-${courseId}`;
    card.dataset.courseId = String(courseId);

    setTextIn(card, "[data-course-name]", course.name || "—");
    setTextIn(card, "[data-course-cfu]", `${course.cfu ?? 0} CFU`);
    setTextIn(card, "[data-course-semester]", course.semester != null ? `${course.semester} SEMESTRE` : "—");

    const prof = formatProfessor(course.professor);
    setTextIn(card, "[data-course-professor]", prof);
    setTextIn(card, "[data-details-professor]", prof);

    renderMajors(card, course.majors);
}

function renderMajors(card, majors) {
    const row = card.querySelector("[data-details-majors-row]");
    const box = card.querySelector("[data-details-majors]");

    if (!row || !box) return;

    if (!Array.isArray(majors) || majors.length === 0) {
        row.hidden = true;
        box.innerHTML = "";
        return;
    }

    row.hidden = false;
    box.innerHTML = "";

    for (const m of majors) {
        const name = m?.name || "—";
        const level = m?.degreeLevel?.name || "—";

        const line = document.createElement("div");
        setText(line, `${name} · ${level}`);
        box.appendChild(line);
    }
}

// -----------------------------
// Courses search + sort
// -----------------------------

function setReportsCourseDataset(card, course) {
    const professorName = formatProfessor(course.professor);

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

function bindReportsCourseSearchAndSort(state) {
    const container = state.ui.coursesGrid;
    if (!container) return;

    const cards = Array.from(container.querySelectorAll("[data-course-card]"));
    if (cards.length === 0) return;

    bindCourseSearchAndSort({
        container,
        cards,
        searchInput: state.ui.courseSearch,
        sortSelect: state.ui.courseSort,
        defaultSort: "nameAsc",
        onUpdate: ({ total, visible }) => {
            state.visibleCourses = visible;

            setText(state.ui.coursesPill, `Corsi: ${visible}/${total}`);
            setText(state.ui.sideCoursesNum, String(visible));

            const emptyVisible = visible === 0;
            state.ui.noCoursesNote.hidden = !emptyVisible;
            state.ui.coursesGrid.hidden = emptyVisible;
        },
    });
}

// -----------------------------
// Course interactions
// -----------------------------

function bindCourseCardEvents(state, card, course) {
    const courseId = Number(course.id);

    const btnShow = card.querySelector("[data-btn-show]");
    const btnClose = card.querySelector("[data-btn-close]");
    const details = card.querySelector("[data-course-details]");

    if (btnShow) {
        btnShow.addEventListener("click", async () => {
            await toggleCourseReports(state, card, courseId);
            if (details) details.open = true;
            focusCourseCard(state, courseId);
        });
    }

    if (btnClose) {
        btnClose.addEventListener("click", () => {
            closeCourseReports(state, card, courseId);
            focusCourseCard(state, courseId);
        });
    }
}

async function toggleCourseReports(state, card, courseId) {
    if (state.openCourseIds.has(courseId)) {
        closeCourseReports(state, card, courseId);
        return;
    }
    await openCourseReports(state, card, courseId);
}

async function openCourseReports(state, card, courseId) {
    try {
        hideError(state);

        const reports = await loadReportsForCourse(state, courseId);

        state.openCourseIds.add(courseId);
        state.selectedCourseId = courseId;

        renderReportsPanel(card, state.ui.reportItemTpl, courseId, reports);
        syncCardReportsState(state, card, courseId);
        renderStats(state);
    } catch (err) {
        showError(state, err?.message || "Errore nel caricamento verbali");
        closeCourseReports(state, card, courseId);
    }
}

function closeCourseReports(state, card, courseId) {
    state.openCourseIds.delete(courseId);

    const hint = card.querySelector("[data-hint]");
    const area = card.querySelector("[data-reports-area]");
    const list = card.querySelector("[data-reports-list]");
    const noReports = card.querySelector("[data-no-reports]");

    if (hint) hint.hidden = false;
    if (area) area.hidden = true;
    if (list) list.innerHTML = "";
    if (noReports) noReports.hidden = true;

    syncCardReportsState(state, card, courseId);
    renderStats(state);
}

function focusCourseCard(state, courseId) {
    state.selectedCourseId = courseId;
    syncSelectionOnly(state, courseId);
    updateUrlAndScroll(courseId);
    renderStats(state);
}

function syncSelectionOnly(state, selectedCourseId) {
    const grid = state.ui.coursesGrid;
    if (!grid) return;

    grid.querySelectorAll("[data-course-card]").forEach((card) => {
        const id = Number(card.dataset.courseId);
        card.classList.toggle("is-selected", id === selectedCourseId);
    });
}

function syncCardSelectionState(state, card, courseId) {
    card.classList.toggle("is-selected", state.selectedCourseId != null && state.selectedCourseId === courseId);
}

function syncCardReportsState(state, card, courseId) {
    const isOpen = state.openCourseIds.has(courseId);
    const reports = state.reportsByCourseId.get(courseId) || [];
    const count = isOpen ? reports.length : 0;

    setTextIn(card, "[data-course-reports-count]", String(count));
    setTextIn(card, "[data-mini-pill]", String(count));

    const btnClose = card.querySelector("[data-btn-close]");
    if (btnClose) btnClose.hidden = !isOpen;
}

function updateUrlAndScroll(courseId) {
    history.replaceState(null, "", `#reports?courseId=${encodeURIComponent(courseId)}#course-${courseId}`);

    requestAnimationFrame(() => {
        const el = document.getElementById(`course-${courseId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
}

// -----------------------------
// Reports panel rendering
// -----------------------------

function renderReportsPanel(card, reportItemTpl, courseId, reports) {
    const hint = card.querySelector("[data-hint]");
    const area = card.querySelector("[data-reports-area]");
    const listEl = card.querySelector("[data-reports-list]");
    const noReportsEl = card.querySelector("[data-no-reports]");

    if (!hint || !area || !listEl || !noReportsEl) return;

    hint.hidden = true;
    area.hidden = false;
    listEl.innerHTML = "";

    if (!Array.isArray(reports) || reports.length === 0) {
        noReportsEl.hidden = false;
        return;
    }

    noReportsEl.hidden = true;

    for (const r of reports) {
        const item = cloneTemplateFirstChild(reportItemTpl);

        setTextIn(item, "[data-report-date]", formatReportLine(r?.exam?.date, r?.timestamp));
        setTextIn(item, "[data-report-time]", formatTime(r?.exam?.date));
        setTextIn(item, "[data-report-cta]", `Verbale #${r?.id ?? "—"}`);

        setReportHref(item, courseId, r?.id);

        listEl.appendChild(item);
    }
}

function setReportHref(itemRoot, courseId, reportId) {
    const rid = Number(reportId);
    if (!Number.isFinite(rid)) return;

    const href = `#report?reportId=${encodeURIComponent(rid)}`;

    if (itemRoot.matches?.("[data-report-link]")) {
        itemRoot.setAttribute("href", href);
        return;
    }

    const link = itemRoot.querySelector("[data-report-link]");
    if (link) link.setAttribute("href", href);
}

// -----------------------------
// Query handling
// -----------------------------

async function openFromQueryIfPresent(state) {
    const courseId = toFiniteNumber(state.query?.courseId);
    const reportId = toFiniteNumber(state.query?.reportId);

    if (reportId != null) {
        const extra = courseId != null ? `&courseId=${encodeURIComponent(courseId)}` : "";
        location.hash = `#report?reportId=${encodeURIComponent(reportId)}${extra}`;
        return;
    }

    if (courseId == null) return;
    if (!state.courses.some((c) => Number(c.id) === courseId)) return;

    const card = document.getElementById(`course-${courseId}`);
    if (!card) return;

    await openCourseReports(state, card, courseId);
    focusCourseCard(state, courseId);
}

// -----------------------------
// Errors
// -----------------------------

function showError(state, message) {
    state.ui.pageError.hidden = false;
    setText(state.ui.pageErrorText, message);
}

function hideError(state) {
    state.ui.pageError.hidden = true;
    setText(state.ui.pageErrorText, "");
}

// -----------------------------
// Small utilities
// -----------------------------

function buildHeroRoleText(user) {
    const role = user?.role ? String(user.role).trim() : "";
    return role ? `Dashboard ${role}` : "Dashboard";
}

function formatProfessor(p) {
    if (!p) return "—";
    const name = p.name || "";
    const surname = p.surname || "";
    const full = `${name} ${surname}`.trim();
    return full.length ? full : "—";
}

function formatReportLine(examDateIso, timestampIso) {
    const examPart = examDateIso ? `Appello del ${formatDate(examDateIso)}` : "Appello del —";
    const repPart = timestampIso ? `Verbale del ${formatDateTime(timestampIso)}` : "Verbale del —";
    return `${examPart} \\ ${repPart}`;
}

function toFiniteNumber(x) {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
}
