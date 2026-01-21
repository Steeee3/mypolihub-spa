import { getUserData } from "../../services/userDataApi.js";
import { templateFetch } from "../../common/template.js";
import { renderHeader } from "../../common/header.js";
import { ensurePageStyle } from "../../utils/pageStyle.js";

import {
    getAllExamRegistrations,
    editRegistrationResult,
    editAllRegistrationResults,
    publishExamResults,
    finalizeExamResults,
} from "../../services/examsApi.js";

import { getAllValidResults } from "../../services/resultApi.js";

import {
    bindSortingHeaders,
    sortBySpec,
    createResultRankById,
    createStatusRankByKey,
    getResultRank,
    getStatusRank,
} from "../../utils/sortingTable.js";

import {
    normalize,
    cloneTemplateFirstChild,
    setText,
    setTextIn
} from "../../utils/domUtils.js";
import { formatMajor } from "../../utils/formatters.js";

/**
 * ISCRITTI PAGE — file sections overview
 *
 ** - Entry point
 *   Bootstraps the page: validates examId from query, mounts template + header,
 *   initializes state, loads data, renders UI, and binds sorting + bulk/multi-insert actions.
 *
 ** - State + UI
 *   Central page state (examId, current sort, edit row tracking, loaded data, sorting context,
 *   multi-insert modal state) and a single place to collect all DOM element references.
 *
 ** - Load + render
 *   Fetches registrations + valid results in parallel, builds sorting context, refreshes
 *   multi-insert rows, and renders the page (or empty/error state).
 *
 ** - Sorting
 *   Creates ranking maps for result/status ordering, binds sortable table headers,
 *   and defines how each column value is extracted for sorting (including custom ranks).
 *
 ** - Rows rendering
 *   Renders the main table rows, sets result/status datasets for sorting, and
 *   conditionally renders the inline edit form row when a student is in edit mode.
 *
 ** - Mutations
 *   Handles saving a single student’s result, updates the local registrations list,
 *   refreshes multi-insert eligibility, and re-renders the table/UI.
 *
 ** - Bulk actions
 *   Binds “Publish” and “Finalize” actions: publishes results and reloads,
 *   or finalizes and navigates to the generated report.
 *
 ** - Multi insert
 *   Manages the modal for batch inserting results: open/close behavior, rendering the modal table,
 *   tracking selected values, enabling/disabling the send button, submitting the payload,
 *   and syncing the main table after successful updates.
 *
 ** - Business rules (front)
 *   UI-side rules that gate editing (e.g., editable only when status is “non inserito” or “inserito”).
 *
 ** - Small utilities
 *   Helpers for formatting the major string, generic error handling, and small UI builders (buttons).
 */


// -----------------------------
// Entry point
// -----------------------------

export async function renderIscritti({ root = document.getElementById("app"), query } = {}) {
    ensurePageStyle("iscritti-css", "/css/iscritti.css");

    const examId = Number(query?.examId);
    if (!Number.isFinite(examId)) {
        location.hash = "#home";
        return;
    }

    const user = await getUserData();

    root.innerHTML = "";
    root.appendChild(await templateFetch("/templates/professor/iscritti.html"));
    await renderHeader(user);

    const state = createPageState(examId);

    await loadAndRender(state);
    bindSorting(state);
    bindBulkActions(state);
    bindMultiInsert(state);
}

// -----------------------------
// State + UI
// -----------------------------

function createPageState(examId) {
    return {
        examId,
        sort: { key: "student.number", dir: "asc" },
        editStudentNumber: null,

        data: { registrations: [], results: [] },
        sorting: createSortingContext([]),

        multi: {
            open: false,
            rows: [],
            valuesByRegistrationId: new Map(),
            sending: false,
        },

        ui: getUi(),
    };
}

function getUi() {
    return {
        totalPill: document.getElementById("registrationsTotalPill"),
        bulkActions: document.getElementById("bulkActions"),
        btnPublish: document.getElementById("btnPublish"),
        btnFinalize: document.getElementById("btnFinalize"),
        btnMultiInsert: document.getElementById("btnMultiInsert"),

        pageError: document.getElementById("pageError"),
        pageErrorText: document.getElementById("pageErrorText"),

        emptyNote: document.getElementById("emptyRegistrationsNote"),
        tableWrap: document.getElementById("tableWrap"),
        tbody: document.getElementById("registrationsBody"),

        rowTpl: document.getElementById("registrationRowTpl"),
        editTpl: document.getElementById("editRowTpl"),

        multiModal: document.getElementById("multiModal"),
        btnMultiCancel: document.getElementById("btnMultiCancel"),
        btnMultiSend: document.getElementById("btnMultiSend"),
        multiRowsPill: document.getElementById("multiRowsPill"),

        multiError: document.getElementById("multiError"),
        multiErrorText: document.getElementById("multiErrorText"),

        multiEmpty: document.getElementById("multiEmpty"),
        multiTableWrap: document.getElementById("multiTableWrap"),
        multiTbody: document.getElementById("multiTbody"),
        multiRowTpl: document.getElementById("multiRowTpl"),
    };
}

// -----------------------------
// Load + render
// -----------------------------

async function loadAndRender(state) {
    try {
        hideError(state);

        const [registrations, results] = await Promise.all([
            getAllExamRegistrations(state.examId),
            getAllValidResults(),
        ]);

        state.data.registrations = registrations || [];
        state.data.results = results || [];
        state.sorting = createSortingContext(state.data.results);

        refreshMultiRows(state);

        renderPage(state);
    } catch (err) {
        showError(state, err?.message || "Errore nel caricamento iscritti");
        state.data.registrations = [];
        state.multi.rows = [];
        renderEmpty(state);
        updateMultiButtonState(state);
    }
}

function renderPage(state) {
    const regs = state.data.registrations;

    setText(state.ui.totalPill, `Totali: ${regs.length}`);
    state.ui.bulkActions.hidden = regs.length === 0;

    if (regs.length === 0) {
        renderEmpty(state);
        return;
    }

    state.ui.emptyNote.hidden = true;
    state.ui.tableWrap.hidden = false;

    renderTable(state);

    updateMultiButtonState(state);
}

function renderEmpty(state) {
    state.ui.tableWrap.hidden = true;
    state.ui.emptyNote.hidden = false;
    state.ui.bulkActions.hidden = true;
    setText(state.ui.totalPill, "Totali: 0");

    updateMultiButtonState(state);
}

function renderTable(state) {
    const sorted = sortRegistrations(state.data.registrations, state.sort, state.sorting);

    state.ui.tbody.innerHTML = "";

    for (const reg of sorted) {
        renderRegistrationRow(state, reg);

        if (state.editStudentNumber === reg.student.number && canEditRegistration(reg)) {
            renderEditRow(state, reg);
        }
    }
}

// -----------------------------
// Sorting
// -----------------------------

function createSortingContext(validResults) {
    return {
        resultRankById: createResultRankById(validResults),
        statusRankByKey: createStatusRankByKey(),
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

function getSortValueIscritti(r, key, sorting) {
    if (key === "student.number") return Number(r?.student?.number) || 0;
    if (key === "student.surname") return r?.student?.surname || "";
    if (key === "student.name") return r?.student?.name || "";
    if (key === "student.email") return r?.student?.email || "";
    if (key === "student.major") return formatMajor(r?.student?.major);

    if (key === "result") return getResultRank(r?.result, sorting.resultRankById, normalize);
    if (key === "status") return getStatusRank(r?.status, sorting.statusRankByKey, normalize);

    return "";
}

function sortRegistrations(registrations, sort, sorting) {
    return sortBySpec(
        registrations,
        sort,
        (r, key) => getSortValueIscritti(r, key, sorting),
        (a, b) => (Number(a?.student?.number) || 0) - (Number(b?.student?.number) || 0)
    );
}

// -----------------------------
// Rows rendering
// -----------------------------

function renderRegistrationRow(state, r) {
    const row = cloneTemplateFirstChild(state.ui.rowTpl);

    setTextIn(row, ".reg-student-number", r.student.number);
    setTextIn(row, ".reg-student-surname", r.student.surname);
    setTextIn(row, ".reg-student-name", r.student.name);
    setTextIn(row, ".reg-student-email", r.student.email);
    setTextIn(row, ".reg-student-major", r.student.major ? formatMajor(r.student.major) : "—");

    const resultValue = String(r.result?.value || "").trim();
    const resultEl = row.querySelector(".reg-result");
    setText(resultEl, resultValue ? r.result.value : "—");
    resultEl.dataset.result = normalize(resultValue);
    resultEl.classList.toggle("is-empty", !resultValue);

    const statusEl = row.querySelector(".reg-status");
    setText(statusEl, r.status || "—");
    statusEl.dataset.status = normalize(r.status || "");

    renderRowActions(state, row.querySelector(".reg-actions"), r);

    state.ui.tbody.appendChild(row);
}

function renderRowActions(state, actionsEl, r) {
    actionsEl.innerHTML = "";

    const editing = state.editStudentNumber === r.student.number;
    const editable = canEditRegistration(r);

    if (editing) {
        actionsEl.appendChild(
            buildButton("Chiudi", "btn btn-sm btn-ghost", () => {
                state.editStudentNumber = null;
                renderTable(state);
            })
        );
        return;
    }

    if (!editable) {
        const muted = document.createElement("span");
        muted.className = "muted";
        setText(muted, "—");
        actionsEl.appendChild(muted);
        return;
    }

    const edit = buildButton("MODIFICA", "btn btn-accent btn-sm", () => {
        state.editStudentNumber = r.student.number;
        renderTable(state);
    });
    edit.innerHTML = `<span class="icon"></span> MODIFICA`;

    actionsEl.appendChild(edit);
}

function renderEditRow(state, r) {
    const row = cloneTemplateFirstChild(state.ui.editTpl);

    setTextIn(row, "[data-edit-sub]", `${r.student.number} · ${r.student.surname} ${r.student.name} · ${r.student.email}`);

    setTextIn(row, "[data-edit-name]", r.student.name);
    setTextIn(row, "[data-edit-surname]", r.student.surname);
    setTextIn(row, "[data-edit-email]", r.student.email);
    setTextIn(row, "[data-edit-major]", formatMajorFull(r.student.major));

    const select = row.querySelector("[data-edit-select]");
    fillResultsSelect(select, state.data.results, r.result?.id);

    row.querySelector("[data-edit-form]").addEventListener("submit", async (e) => {
        e.preventDefault();
        await onSaveResult(state, r.id, Number(select.value));
    });

    row.querySelector("[data-edit-cancel]").addEventListener("click", () => {
        state.editStudentNumber = null;
        renderTable(state);
    });

    state.ui.tbody.appendChild(row);
}

function fillResultsSelect(select, results, selectedId) {
    select.innerHTML = "";
    for (const res of results || []) {
        const opt = document.createElement("option");
        opt.value = String(res.id);
        setText(opt, res.value);

        if (selectedId != null && res.id === selectedId) opt.selected = true;
        select.appendChild(opt);
    }
}

// -----------------------------
// Mutations
// -----------------------------

async function onSaveResult(state, registrationId, resultId) {
    try {
        hideError(state);

        const updated = await editRegistrationResult(registrationId, resultId);

        const idx = state.data.registrations.findIndex((x) => x.id === registrationId);
        if (idx !== -1) state.data.registrations[idx] = updated;

        state.editStudentNumber = null;

        refreshMultiRows(state);

        renderTable(state);
        updateMultiButtonState(state);
    } catch (err) {
        showError(state, err?.message || "Errore durante il salvataggio");
    }
}

// -----------------------------
// Bulk actions
// -----------------------------

function bindBulkActions(state) {
    state.ui.btnPublish?.addEventListener("click", async () => {
        try {
            hideError(state);
            await publishExamResults(state.examId);
            await loadAndRender(state);
        } catch (err) {
            showError(state, err?.message || "Errore durante la pubblicazione");
        }
    });

    state.ui.btnFinalize?.addEventListener("click", async () => {
        try {
            hideError(state);
            const { reportId } = await finalizeExamResults(state.examId);
            location.hash = `#reports?reportId=${encodeURIComponent(reportId)}`;
        } catch (err) {
            showError(state, err?.message || "Errore durante la verbalizzazione");
        }
    });
}

// -----------------------------
// Multi insert
// -----------------------------

function bindMultiInsert(state) {
    state.ui.btnMultiInsert?.addEventListener("click", () => openMultiModal(state));

    state.ui.btnMultiCancel?.addEventListener("click", () => closeMultiModal(state));

    state.ui.multiModal?.addEventListener("click", (e) => {
        if (e.target === state.ui.multiModal) closeMultiModal(state);
    });

    window.addEventListener("keydown", (e) => {
        if (!state.multi.open) return;
        if (e.key === "Escape") closeMultiModal(state);
    });

    state.ui.btnMultiSend?.addEventListener("click", async () => {
        await submitMulti(state);
    });
}

function updateMultiButtonState(state) {
    const btn = state.ui.btnMultiInsert;
    if (!btn) return;

    const hasRows = state.multi.rows.length > 0;

    btn.hidden = !hasRows;

    if (btn.hidden) {
        btn.disabled = true;
        btn.title = "";
        return;
    }

    btn.disabled = false;
    btn.title = "Inserimento multiplo voti per righe in stato 'non inserito'";
}

function openMultiModal(state) {
    state.multi.open = true;
    hideMultiError(state);

    refreshMultiRows(state);

    state.multi.valuesByRegistrationId.clear();
    renderMultiModal(state);

    state.ui.multiModal.hidden = false;
    document.body.classList.add("modal-open");
    updateMultiSendButtonState(state);
}

function closeMultiModal(state) {
    state.multi.open = false;
    hideMultiError(state);

    state.ui.multiModal.hidden = true;
    document.body.classList.remove("modal-open");
    state.multi.sending = false;
    updateMultiSendButtonState(state);
}

function renderMultiModal(state) {
    const rows = state.multi.rows;

    setText(state.ui.multiRowsPill, `Righe: ${rows.length}`);

    if (rows.length === 0) {
        state.ui.multiEmpty.hidden = false;
        state.ui.multiTableWrap.hidden = true;
        return;
    }

    state.ui.multiEmpty.hidden = true;
    state.ui.multiTableWrap.hidden = false;

    const sorted = [...rows].sort(
        (a, b) => (Number(a.student.number) || 0) - (Number(b.student.number) || 0)
    );

    state.ui.multiTbody.innerHTML = "";

    for (const r of sorted) {
        const tr = cloneTemplateFirstChild(state.ui.multiRowTpl);

        setTextIn(tr, ".mm-number", r.student.number);
        setTextIn(tr, ".mm-surname", r.student.surname || "—");
        setTextIn(tr, ".mm-name", r.student.name || "—");
        setTextIn(tr, ".mm-email", r.student.email || "—");
        setTextIn(tr, ".mm-major", r.student.major ? formatMajor(r.student.major) : "—");

        const cell = tr.querySelector(".mm-vote");
        const sel = buildBulkSelect(state, r.id);
        cell.appendChild(sel);

        state.ui.multiTbody.appendChild(tr);
    }
}

function buildBulkSelect(state, registrationId) {
    const sel = document.createElement("select");
    sel.className = "bulk-select";
    sel.name = `bulk-result-${registrationId}`;

    const opt0 = document.createElement("option");
    opt0.value = "";
    setText(opt0, "<vuoto>");
    sel.appendChild(opt0);

    for (const res of state.data.results || []) {
        const opt = document.createElement("option");
        opt.value = String(res.id);
        setText(opt, res.value);
        sel.appendChild(opt);
    }

    sel.addEventListener("change", () => {
        state.multi.valuesByRegistrationId.set(registrationId, sel.value);
        updateMultiSendButtonState(state);
    });

    return sel;
}

function updateMultiSendButtonState(state) {
    const btn = state.ui.btnMultiSend;
    if (!btn) return;

    const count = countValidMultiSelections(state);

    btn.disabled = state.multi.sending;
    setText(btn, state.multi.sending ? "Invio..." : "Invia");
    btn.title = count === 0 ? "Seleziona almeno un voto valido" : "";
}

function countValidMultiSelections(state) {
    let n = 0;
    for (const [, value] of state.multi.valuesByRegistrationId.entries()) {
        const rid = Number(value);
        if (Number.isFinite(rid) && rid > 0) n++;
    }
    return n;
}

function buildBulkPayload(state) {
    const payload = [];

    for (const [registrationId, resultIdStr] of state.multi.valuesByRegistrationId.entries()) {
        const regId = Number(registrationId);
        const resultId = Number(resultIdStr);

        if (!Number.isFinite(regId)) continue;
        if (!Number.isFinite(resultId)) continue;
        if (resultId <= 0) continue;

        payload.push({ registrationId: regId, resultId });
    }

    return payload;
}

async function submitMulti(state) {
    try {
        hideMultiError(state);

        const payload = buildBulkPayload(state);
        if (payload.length === 0) {
            showMultiError(state, "Seleziona almeno un voto valido da inviare.");
            updateMultiSendButtonState(state);
            return;
        }

        state.multi.sending = true;
        updateMultiSendButtonState(state);

        const updatedRegs = await editAllRegistrationResults(payload);

        const byId = new Map((updatedRegs || []).map((r) => [r.id, r]));
        state.data.registrations = state.data.registrations.map((r) => byId.get(r.id) || r);

        closeMultiModal(state);

        refreshMultiRows(state);

        renderPage(state);
        updateMultiButtonState(state);
    } catch (err) {
        state.multi.sending = false;
        updateMultiSendButtonState(state);
        showMultiError(state, err?.message || "Errore durante l'invio dei voti");
    }
}

function refreshMultiRows(state) {
    state.multi.rows = getNonInseritoRows(state.data.registrations);
    pruneMultiSelections(state);
}

function pruneMultiSelections(state) {
    const aliveIds = new Set(state.multi.rows.map((r) => r.id));
    for (const k of state.multi.valuesByRegistrationId.keys()) {
        if (!aliveIds.has(k)) state.multi.valuesByRegistrationId.delete(k);
    }
}

function getNonInseritoRows(registrations) {
    return (registrations || []).filter((r) => normalize(r?.status || "") === "non inserito");
}

function showMultiError(state, message) {
    state.ui.multiError.hidden = false;
    setText(state.ui.multiErrorText, message);
}

function hideMultiError(state) {
    state.ui.multiError.hidden = true;
    setText(state.ui.multiErrorText, "");
}

// -----------------------------
// Business rules (front)
// -----------------------------

function canEditRegistration(r) {
    const s = normalize(r.status || "");
    return s === "non inserito" || s === "inserito";
}

// -----------------------------
// Small utilities
// -----------------------------

function formatMajorFull(major) {
    if (!major) return "—";
    const base = formatMajor(major) || "—";
    const years = major.degreeLevel?.yearsOfStudy;
    return years ? `${base} (${years} anni)` : base;
}

function showError(state, message) {
    state.ui.pageError.hidden = false;
    setText(state.ui.pageErrorText, message);
}

function hideError(state) {
    state.ui.pageError.hidden = true;
    setText(state.ui.pageErrorText, "");
}

function buildButton(text, className, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = className;
    setText(btn, text);
    btn.addEventListener("click", onClick);
    return btn;
}
