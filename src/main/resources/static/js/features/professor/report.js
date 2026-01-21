import { getUserData } from "../../services/userDataApi.js";
import { templateFetch } from "../../common/template.js";
import { renderHeader } from "../../common/header.js";
import { ensurePageStyle } from "../../utils/pageStyle.js";

import { getReportById } from "../../services/reportsApi.js";
import { getAllValidResults } from "../../services/resultApi.js";

import {
    bindSortingHeaders,
    sortBySpec,
    createResultRankById,
    getResultRank,
} from "../../utils/sortingTable.js";

import {
    normalize,
    setText
} from "../../utils/domUtils.js";
import { formatDateTime, formatMajor } from "../../utils/formatters.js";

/**
 * VERBALE PAGE — file sections overview
 *
 ** - Entry point
 *   Bootstraps the page: validates reportId from query, mounts template + header,
 *   creates state, loads data, renders UI, and binds table sorting.
 *
 ** - State + UI
 *   Central page state (reportId, user, current sort, loaded report/registrations/results,
 *   sorting context) and a single place to collect all DOM element references.
 *
 ** - Load + render
 *   Fetches the report and valid results in parallel, prepares registrations list + sorting ranks,
 *   then renders either the full page or the empty/error state.
 *
 ** - Page rendering
 *   Renders top header info (title, created timestamp, back-to-exam link),
 *   renders summary/info cards (course + exam + counts), renders majors badges,
 *   and renders the registrations table (or empty table view).
 *
 ** - Sort
 *   Builds the sorting context (result ranking), binds sortable headers,
 *   defines sortable values per column, and applies sortBySpec with a stable fallback.
 *
 ** - Errors
 *   Small helpers to show/hide the page-level error banner/message.
 */


// -----------------------------
// Entry point
// -----------------------------

export async function renderReport({ root = document.getElementById("app"), query } = {}) {
    ensurePageStyle("reports-css", "/css/reports.css");
    ensurePageStyle("iscritti-css", "/css/iscritti.css");

    const reportId = Number(query?.reportId);
    if (!Number.isFinite(reportId)) {
        location.hash = "#reports";
        return;
    }

    const user = await getUserData();

    root.innerHTML = "";
    root.appendChild(await templateFetch("/templates/professor/report.html"));
    await renderHeader(user);

    const state = createPageState(reportId, user);

    await loadAndRender(state);
    bindSorting(state);
}

// -----------------------------
// State + UI
// -----------------------------

function createPageState(reportId, user) {
    return {
        reportId,
        user,

        sort: { key: "student.number", dir: "asc" },
        data: {
            report: null,
            registrations: [],
            results: [],
        },
        sorting: createSortingContext([]),
        ui: getUi(),
    };
}

function getUi() {
    return {
        pageError: document.getElementById("pageError"),
        pageErrorText: document.getElementById("pageErrorText"),

        titleEl: document.getElementById("reportTitle"),
        verbalizedCountPill: document.getElementById("verbalizedCountPill"),
        createdPill: document.getElementById("createdPill"),
        backToExamLink: document.getElementById("backToExamLink"),

        reportInfoCard: document.getElementById("reportInfoCard"),

        courseName: document.getElementById("courseName"),
        courseCfu: document.getElementById("courseCfu"),
        courseMajors: document.getElementById("courseMajors"),
        courseMajorsEmpty: document.getElementById("courseMajorsEmpty"),

        examDate: document.getElementById("examDate"),
        rowsCount: document.getElementById("rowsCount"),
        createdAt: document.getElementById("createdAt"),

        tableCard: document.getElementById("tableCard"),
        totalPill: document.getElementById("registrationsTotalPill"),
        emptyNote: document.getElementById("emptyRegistrationsNote"),
        tableWrap: document.getElementById("tableWrap"),
        tbody: document.getElementById("registrationsBody"),
    };
}

// -----------------------------
// Load + render
// -----------------------------

async function loadAndRender(state) {
    try {
        hideError(state);

        const [report, results] = await Promise.all([
            getReportById(state.reportId),
            getAllValidResults(),
        ]);

        state.data.report = report;
        state.data.registrations = (report?.registrations || []);
        state.data.results = results || [];
        state.sorting = createSortingContext(state.data.results);

        renderPage(state);
    } catch (err) {
        showError(state, err?.message || "Errore nel caricamento del verbale");
        state.data.report = null;
        state.data.registrations = [];
        renderEmpty(state);
    }
}

function renderPage(state) {
    const report = state.data.report;
    const regs = state.data.registrations;

    if (!report) {
        renderEmpty(state);
        return;
    }

    if (state.ui.reportInfoCard) state.ui.reportInfoCard.hidden = false;
    if (state.ui.tableCard) state.ui.tableCard.hidden = false;

    renderHeaderInfo(state, report, regs.length);
    renderInfoCards(state, report, regs.length);

    state.ui.totalPill && (setText(state.ui.totalPill, `Totali: ${regs.length}`));

    if (regs.length === 0) {
        renderEmptyTable(state);
        return;
    }

    renderTable(state);
}

function renderEmpty(state) {
    if (state.ui.reportInfoCard) state.ui.reportInfoCard.hidden = true;
    if (state.ui.tableCard) state.ui.tableCard.hidden = true;
}

function renderEmptyTable(state) {
    if (state.ui.tableWrap) state.ui.tableWrap.hidden = true;
    if (state.ui.emptyNote) state.ui.emptyNote.hidden = false;
}

function renderHeaderInfo(state, report, count) {
    setText(state.ui.titleEl, `Verbale #${state.reportId}`);
    setText(state.ui.verbalizedCountPill, `Appelli verbalizzati: ${count}`);

    if (state.ui.createdPill) {
        state.ui.createdPill.hidden = !report?.timestamp;
        setText(state.ui.createdPill, report?.timestamp
            ? `Creato: ${formatDateTime(report.timestamp)}`
            : "Creato: —");
    }

    const examId = report?.exam?.id;
    if (state.ui.backToExamLink) {
        state.ui.backToExamLink.hidden = !Number.isFinite(Number(examId));
        state.ui.backToExamLink.href = Number.isFinite(Number(examId))
            ? `#iscritti?examId=${encodeURIComponent(examId)}`
            : "#reports";
    }
}

function renderInfoCards(state, report, rowsCount) {
    const course = report?.exam?.course;

    setText(state.ui.courseName, course?.name || "—");
    setText(state.ui.courseCfu, course?.cfu != null ? String(course.cfu) : "—");

    renderMajorsBadges(state, course?.majors);

    setText(state.ui.examDate, report?.exam?.date ? formatDateTime(report.exam.date) : "—");
    setText(state.ui.rowsCount, String(rowsCount));
    setText(state.ui.createdAt, report?.timestamp ? formatDateTime(report.timestamp) : "—");
}

function renderMajorsBadges(state, majors) {
    const box = state.ui.courseMajors;
    const empty = state.ui.courseMajorsEmpty;

    if (!box) return;

    box.innerHTML = "";

    if (!Array.isArray(majors) || majors.length === 0) {
        if (empty) empty.hidden = false;
        return;
    }

    if (empty) empty.hidden = true;

    for (const m of majors) {
        const badge = document.createElement("span");
        badge.className = "badge badge-soft";
        setText(badge, `${m?.name || "—"} · ${m?.degreeLevel?.name || "—"}`);
        box.appendChild(badge);
    }
}

function renderTable(state) {
    const regs = sortRegistrations(state.data.registrations, state.sort, state.sorting);

    if (state.ui.emptyNote) state.ui.emptyNote.hidden = true;
    if (state.ui.tableWrap) state.ui.tableWrap.hidden = false;

    if (state.ui.tbody) state.ui.tbody.innerHTML = "";

    for (const r of regs) {
        if (!state.ui.tbody) break;
        state.ui.tbody.appendChild(buildRow(r));
    }
}

function buildRow(r) {
    const tr = document.createElement("tr");

    const number = td("mono", String(r?.student?.number ?? ""));
    const surname = td("", String(r?.student?.surname ?? ""));
    const name = td("", String(r?.student?.name ?? ""));
    const email = td("mono", String(r?.student?.email ?? ""));

    const majorText = r?.student?.major
        ? `${r.student.major.name} · ${r.student.major.degreeLevel?.name || "—"}`
        : "—";
    const major = td("major-cell", majorText);

    const resultValue = String(r?.result?.value || "").trim();
    const resultTd = document.createElement("td");
    const resultSpan = document.createElement("span");
    resultSpan.className = "tag tag-result";
    resultSpan.classList.toggle("is-empty", resultValue.length === 0);
    resultSpan.dataset.result = normalize(resultValue);
    setText(resultSpan, resultValue.length ? resultValue : "—");
    resultTd.appendChild(resultSpan);

    tr.appendChild(number);
    tr.appendChild(surname);
    tr.appendChild(name);
    tr.appendChild(email);
    tr.appendChild(major);
    tr.appendChild(resultTd);

    return tr;
}

function td(className, text) {
    const el = document.createElement("td");
    if (className) el.className = className;
    setText(el, text);
    return el;
}

// -----------------------------
// Sort
// -----------------------------

function createSortingContext(validResults) {
    return {
        resultRankById: createResultRankById(validResults),
    };
}

function bindSorting(state) {
    bindSortingHeaders({
        root: document,
        sort: state.sort,
        onChange: () => {
            renderTable(state);
        },
    });
}

function getSortValueReport(r, key, sorting) {
    if (key === "student.number") return Number(r?.student?.number) || 0;
    if (key === "student.surname") return r?.student?.surname || "";
    if (key === "student.name") return r?.student?.name || "";
    if (key === "student.email") return r?.student?.email || "";
    if (key === "student.major") return formatMajor(r?.student?.major);

    if (key === "result") return getResultRank(r?.result, sorting.resultRankById, normalize);

    return "";
}

function sortRegistrations(registrations, sort, sorting) {
    return sortBySpec(
        registrations,
        sort,
        (r, key) => getSortValueReport(r, key, sorting),
        (a, b) => (Number(a?.student?.number) || 0) - (Number(b?.student?.number) || 0)
    );
}

// -----------------------------
// Errors
// -----------------------------

function showError(state, message) {
    if (!state.ui.pageError || !state.ui.pageErrorText) return;
    state.ui.pageError.hidden = false;
    setText(state.ui.pageErrorText, message);
}

function hideError(state) {
    if (!state.ui.pageError || !state.ui.pageErrorText) return;
    state.ui.pageError.hidden = true;
    setText(state.ui.pageErrorText, "");
}