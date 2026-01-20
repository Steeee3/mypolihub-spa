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

    state.ui.totalPill.textContent = `Totali: ${regs.length}`;
    state.ui.bulkActions.hidden = regs.length === 0;

    if (regs.length === 0) {
        renderEmpty(state);
        return;
    }

    state.ui.emptyNote.hidden = true;
    state.ui.tableWrap.hidden = false;

    renderTable(state);
    renderSortIndicators(state);

    updateMultiButtonState(state);
}

function renderEmpty(state) {
    state.ui.tableWrap.hidden = true;
    state.ui.emptyNote.hidden = false;
    state.ui.bulkActions.hidden = true;
    state.ui.totalPill.textContent = "Totali: 0";

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
// Sorting (SPEC)
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

    return [...registrations].sort((a, b) => {
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
    if (key === "status") return getStatusRank(r?.status, sorting);

    return "";
}

function compareValues(a, b) {
    if (typeof a === "number" && typeof b === "number") return a - b;
    return String(a).localeCompare(String(b), "it", { sensitivity: "base" });
}

// -----------------------------
// SPEC ranking: Result + Status
// -----------------------------

function createSortingContext(validResults) {
    return {
        resultRankById: buildResultRankById(validResults),
        statusRankByKey: buildStatusRankByKey(),
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

function buildStatusRankByKey() {
    const order = ["non inserito", "inserito", "pubblicato", "rifiutato", "verbalizzato"];
    const map = new Map();
    order.forEach((s, idx) => map.set(s, idx));
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

function getStatusRank(status, sorting) {
    const key = normalize(status || "");
    if (!key) return Number.MAX_SAFE_INTEGER;

    const rank = sorting.statusRankByKey.get(key);
    return rank != null ? rank : Number.MAX_SAFE_INTEGER;
}

// -----------------------------
// Rows rendering (main table)
// -----------------------------

function renderRegistrationRow(state, r) {
    const row = cloneTemplate(state.ui.rowTpl);

    row.querySelector(".reg-student-number").textContent = r.student.number;
    row.querySelector(".reg-student-surname").textContent = r.student.surname;
    row.querySelector(".reg-student-name").textContent = r.student.name;
    row.querySelector(".reg-student-email").textContent = r.student.email;
    row.querySelector(".reg-student-major").textContent = r.student.major ? formatMajor(r.student.major) : "—";

    const resultValue = String(r.result?.value || "").trim();
    const resultEl = row.querySelector(".reg-result");
    resultEl.textContent = resultValue ? r.result.value : "—";
    resultEl.dataset.result = normalize(resultValue);
    resultEl.classList.toggle("is-empty", !resultValue);

    const statusEl = row.querySelector(".reg-status");
    statusEl.textContent = r.status || "—";
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
        muted.textContent = "—";
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
    const row = cloneTemplate(state.ui.editTpl);

    row.querySelector("[data-edit-sub]").textContent =
        `${r.student.number} · ${r.student.surname} ${r.student.name} · ${r.student.email}`;

    row.querySelector("[data-edit-name]").textContent = r.student.name;
    row.querySelector("[data-edit-surname]").textContent = r.student.surname;
    row.querySelector("[data-edit-email]").textContent = r.student.email;
    row.querySelector("[data-edit-major]").textContent = formatMajorFull(r.student.major);

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
        opt.textContent = res.value;
        if (selectedId != null && res.id === selectedId) opt.selected = true;
        select.appendChild(opt);
    }
}

// -----------------------------
// Mutations (single row)
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
        renderSortIndicators(state);
        updateMultiButtonState(state);
    } catch (err) {
        showError(state, err?.message || "Errore durante il salvataggio");
    }
}

// -----------------------------
// Bulk actions (publish/finalize)
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
// Multi insert (MODAL + BULK PATCH)
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

    state.ui.multiRowsPill.textContent = `Righe: ${rows.length}`;

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
        const tr = cloneTemplate(state.ui.multiRowTpl);

        tr.querySelector(".mm-number").textContent = r.student.number;
        tr.querySelector(".mm-surname").textContent = r.student.surname || "—";
        tr.querySelector(".mm-name").textContent = r.student.name || "—";
        tr.querySelector(".mm-email").textContent = r.student.email || "—";
        tr.querySelector(".mm-major").textContent = r.student.major ? formatMajor(r.student.major) : "—";

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
    opt0.textContent = "<vuoto>";
    sel.appendChild(opt0);

    for (const res of state.data.results || []) {
        const opt = document.createElement("option");
        opt.value = String(res.id);
        opt.textContent = res.value;
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
    btn.textContent = state.multi.sending ? "Invio..." : "Invia";
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
        renderSortIndicators(state);
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
    state.ui.multiErrorText.textContent = message;
}

function hideMultiError(state) {
    state.ui.multiError.hidden = true;
    state.ui.multiErrorText.textContent = "";
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

function cloneTemplate(tpl) {
    return tpl.content.firstElementChild.cloneNode(true);
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

function formatMajorFull(major) {
    if (!major) return "—";
    const name = major.name || "—";
    const level = major.degreeLevel?.name || "—";
    const years = major.degreeLevel?.yearsOfStudy;
    return years ? `${name} · ${level} (${years} anni)` : `${name} · ${level}`;
}

function showError(state, message) {
    state.ui.pageError.hidden = false;
    state.ui.pageErrorText.textContent = message;
}

function hideError(state) {
    state.ui.pageError.hidden = true;
    state.ui.pageErrorText.textContent = "";
}

function buildButton(text, className, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = className;
    btn.textContent = text;
    btn.addEventListener("click", onClick);
    return btn;
}
