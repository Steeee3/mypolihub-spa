import { getUserData } from "../../services/userDataApi.js";
import { templateFetch } from "../../common/template.js";
import { renderHeader } from "../../common/header.js";
import { ensurePageStyle } from "../../utils/pageStyle.js";

import { getReportById } from "../../services/reportsApi.js";
import { getAllValidResults } from "../../services/resultApi.js";

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

    state.ui.totalPill && (state.ui.totalPill.textContent = `Totali: ${regs.length}`);

    if (regs.length === 0) {
        renderEmptyTable(state);
        return;
    }

    renderTable(state);
    renderSortIndicators(state);
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
    if (state.ui.titleEl) state.ui.titleEl.textContent = `Verbale #${state.reportId}`;

    if (state.ui.verbalizedCountPill) {
        state.ui.verbalizedCountPill.textContent = `Appelli verbalizzati: ${count}`;
    }

    if (state.ui.createdPill) {
        state.ui.createdPill.hidden = !report?.timestamp;
        state.ui.createdPill.textContent = report?.timestamp
            ? `Creato: ${formatDateTime(report.timestamp)}`
            : "Creato: —";
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

    setTextById(state.ui.courseName, course?.name || "—");
    setTextById(state.ui.courseCfu, course?.cfu != null ? String(course.cfu) : "—");

    renderMajorsBadges(state, course?.majors);

    setTextById(state.ui.examDate, report?.exam?.date ? formatDateTime(report.exam.date) : "—");
    setTextById(state.ui.rowsCount, String(rowsCount));
    setTextById(state.ui.createdAt, report?.timestamp ? formatDateTime(report.timestamp) : "—");
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
        badge.textContent = `${m?.name || "—"} · ${m?.degreeLevel?.name || "—"}`;
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
    resultSpan.textContent = resultValue.length ? resultValue : "—";
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
    el.textContent = text;
    return el;
}

// -----------------------------
// Sorting (like iscritti)
// -----------------------------

function bindSorting(state) {
    const headers = document.querySelectorAll("th.is-sortable");

    headers.forEach((th) => {
        const key = th.dataset.sortKey;
        const btn = th.querySelector("button.th-link");
        if (!btn || !key) return;

        btn.addEventListener("click", () => {
            toggleSort(state, key);
            renderTable(state);
            renderSortIndicators(state);
        });
    });
}

function toggleSort(state, key) {
    if (state.sort.key === key) {
        state.sort.dir = state.sort.dir === "asc" ? "desc" : "asc";
        return;
    }
    state.sort.key = key;
    state.sort.dir = "asc";
}

function renderSortIndicators(state) {
    const headers = document.querySelectorAll("th.is-sortable");

    headers.forEach((th) => {
        const key = th.dataset.sortKey;
        const ico = th.querySelector(".sort-ico");

        th.classList.remove("is-active");
        ico?.classList.remove("asc", "desc");

        if (key !== state.sort.key) return;

        th.classList.add("is-active");
        ico?.classList.add(state.sort.dir === "asc" ? "asc" : "desc");
    });
}

function sortRegistrations(registrations, sort, sorting) {
    const dir = sort.dir === "desc" ? -1 : 1;

    return [...(registrations || [])].sort((a, b) => {
        const va = getSortValue(a, sort.key, sorting);
        const vb = getSortValue(b, sort.key, sorting);

        const cmp = compareValues(va, vb) * dir;
        if (cmp !== 0) return cmp;

        const na = Number(a?.student?.number) || 0;
        const nb = Number(b?.student?.number) || 0;
        return na - nb;
    });
}

function getSortValue(r, key, sorting) {
    if (key === "student.number") return Number(r?.student?.number) || 0;
    if (key === "student.surname") return r?.student?.surname || "";
    if (key === "student.name") return r?.student?.name || "";
    if (key === "student.email") return r?.student?.email || "";
    if (key === "student.major") return formatMajor(r?.student?.major);

    if (key === "result") return getResultRank(r?.result, sorting);

    return "";
}

function compareValues(a, b) {
    if (typeof a === "number" && typeof b === "number") return a - b;
    return String(a).localeCompare(String(b), "it", { sensitivity: "base" });
}

function createSortingContext(validResults) {
    return {
        resultRankById: buildResultRankById(validResults),
    };
}

function buildResultRankById(results) {
    const map = new Map();
    let rank = 1;

    for (const res of results || []) {
        if (res?.id == null) continue;
        map.set(Number(res.id), rank++);
    }
    return map;
}

function getResultRank(result, sorting) {
    if (!result) return 0;

    const rawValue = String(result.value || "").trim();
    const isEmptyValue = rawValue.length === 0 || normalize(rawValue) === "<vuoto>";
    if (isEmptyValue) return 0;

    const id = result.id != null ? Number(result.id) : null;
    if (id == null) return Number.MAX_SAFE_INTEGER;

    const rank = sorting.resultRankById.get(id);
    return rank != null ? rank : Number.MAX_SAFE_INTEGER;
}

// -----------------------------
// Errors
// -----------------------------

function showError(state, message) {
    if (!state.ui.pageError || !state.ui.pageErrorText) return;
    state.ui.pageError.hidden = false;
    state.ui.pageErrorText.textContent = message;
}

function hideError(state) {
    if (!state.ui.pageError || !state.ui.pageErrorText) return;
    state.ui.pageError.hidden = true;
    state.ui.pageErrorText.textContent = "";
}

// -----------------------------
// Small utilities
// -----------------------------

function setTextById(el, value) {
    if (!el) return;
    el.textContent = String(value);
}

function normalize(s) {
    return String(s || "").toLowerCase().trim();
}

function formatMajor(major) {
    if (!major) return "";
    const name = major.name || "";
    const level = major.degreeLevel?.name || "";
    return `${name} · ${level}`.trim();
}

function formatDateTime(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(d);
}
