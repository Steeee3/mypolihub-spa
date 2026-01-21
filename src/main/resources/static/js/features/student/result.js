import { getUserData } from "../../services/userDataApi.js";
import { templateFetch } from "../../common/template.js";
import { renderHeader } from "../../common/header.js";
import { ensurePageStyle } from "../../utils/pageStyle.js";

import { getResultByExamId, declineResult } from "../../services/resultApi.js";

import {
    normalize,
    setText
} from "../../utils/domUtils.js";
import { formatDateTime } from "../../utils/formatters.js";

/**
 * ESITO PAGE — file sections overview
 *
 ** - Entry point
 *   Initializes the page: applies CSS, validates examId from query, mounts template + header,
 *   creates state, loads data, renders UI, and binds the decline drag&drop workflow.
 *
 ** - State + UI
 *   Central state (examId, user, fetched payload fields, modal state) and a single getUi()
 *   that collects all DOM references used by the page.
 *
 ** - Load + render
 *   Calls getResultByExamId, stores payload into state (registration/isPublished/canBeDeclined/message),
 *   and renders either the "not published" view or the "published" view. Handles error fallback.
 *
 ** - Decline area (visibility + DnD text)
 *   Shows/hides the decline UI based on canBeDeclined and builds the short draggable label.
 *
 ** - Drag & drop + modal confirm
 *   Wires the drag source + trash dropzone interactions, opens a confirmation modal on drop,
 *   and handles confirm/cancel/escape/outside-click behaviors.
 *
 ** - Decline texts
 *   Builds user-facing strings for the draggable chip and the confirmation modal details line.
 *
 **- Tags rendering
 *   Renders status/result “tags” and attaches normalized values into data-* for styling/logic.
 *
 **- Errors + success
 *   Small helpers to show/hide page-level error and success banners/messages.
 *
 **- Small utilities
 *   Generic helpers (setHidden, student full-name formatting).
 */

// -----------------------------
// Entry point
// -----------------------------

export async function renderResult({ root = document.getElementById("app"), query } = {}) {
    ensurePageStyle("iscritti-css", "/css/iscritti.css");
    ensurePageStyle("result-css", "/css/result.css");

    const examId = Number(query?.examId);
    if (!Number.isFinite(examId)) {
        location.hash = "#home";
        return;
    }

    const user = await getUserData();

    root.innerHTML = "";
    root.appendChild(await templateFetch("/templates/student/result.html"));
    await renderHeader(user);

    const state = createPageState(examId, user);

    await loadAndRender(state);
    bindDeclineDnD(state);
}

// -----------------------------
// State + UI
// -----------------------------

function createPageState(examId, user) {
    return {
        examId,
        user,

        data: {
            registration: null,
            isPublished: false,
            canBeDeclined: false,
            message: "",
        },

        ui: getUi(),
        modal: { open: false },
    };
}

function getUi() {
    return {
        pageError: document.getElementById("pageError"),
        pageErrorText: document.getElementById("pageErrorText"),

        pageSuccess: document.getElementById("pageSuccess"),
        pageSuccessText: document.getElementById("pageSuccessText"),

        examIdPill: document.getElementById("examIdPill"),

        notPublishedNote: document.getElementById("notPublishedNote"),
        notPublishedTitle: document.getElementById("notPublishedTitle"),

        publishedWrap: document.getElementById("publishedWrap"),

        studentNumber: document.getElementById("studentNumber"),
        studentFullName: document.getElementById("studentFullName"),
        studentEmail: document.getElementById("studentEmail"),

        courseName: document.getElementById("courseName"),
        courseCfu: document.getElementById("courseCfu"),
        examDate: document.getElementById("examDate"),

        statusTag: document.getElementById("statusTag"),
        resultTag: document.getElementById("resultTag"),

        declineDragWrap: document.getElementById("declineDragWrap"),
        declineDraggable: document.getElementById("declineDraggable"),
        declineDraggableText: document.getElementById("declineDraggableText"),
        trashDropzone: document.getElementById("trashDropzone"),

        declineMuted: document.getElementById("declineMuted"),
        cannotDeclineNote: document.getElementById("cannotDeclineNote"),

        declineModal: document.getElementById("declineModal"),
        declineModalText: document.getElementById("declineModalText"),
        btnDeclineCancel: document.getElementById("btnDeclineCancel"),
        btnDeclineConfirm: document.getElementById("btnDeclineConfirm"),
    };
}

// -----------------------------
// Load + render
// -----------------------------

async function loadAndRender(state) {
    try {
        hideError(state);

        const payload = await getResultByExamId(state.examId);

        state.data.registration = payload?.registration ?? null;
        state.data.isPublished = Boolean(payload?.isPublished);
        state.data.canBeDeclined = Boolean(payload?.canBeDeclined);
        state.data.message = String(payload?.message || "");

        renderPage(state);
    } catch (err) {
        state.data.registration = null;
        state.data.isPublished = false;
        state.data.canBeDeclined = false;
        state.data.message = "";
        showError(state, err?.message || "Errore nel caricamento esito");
        renderPage(state);
    }
}

function renderPage(state) {
    setText(state.ui.examIdPill, `Appello: ${state.examId}`);

    if (!state.data.isPublished || !state.data.registration) {
        renderNotPublished(state);
        return;
    }

    renderPublished(state);
}

function renderNotPublished(state) {
    hideSuccess(state);

    const msg = state.data.message?.trim() || "Voto non ancora definito.";

    setHidden(state.ui.notPublishedNote, false);
    setText(state.ui.notPublishedTitle, msg);

    setHidden(state.ui.publishedWrap, true);

    setHidden(state.ui.declineDragWrap, true);
    setHidden(state.ui.declineMuted, true);
    setHidden(state.ui.cannotDeclineNote, true);
}

function renderPublished(state) {
    hideError(state);

    setHidden(state.ui.notPublishedNote, true);
    setHidden(state.ui.publishedWrap, false);

    const reg = state.data.registration;

    setText(state.ui.studentNumber, reg?.student?.number ?? "—");
    setText(state.ui.studentFullName, formatStudentName(reg?.student));
    setText(state.ui.studentEmail, reg?.student?.email ?? "—");

    setText(state.ui.courseName, reg?.exam?.course?.name ?? "—");
    setText(state.ui.courseCfu, reg?.exam?.course?.cfu != null ? String(reg.exam.course.cfu) : "—");
    setText(state.ui.examDate, reg?.exam?.date ? formatDateTime(reg.exam.date) : "—");

    renderStatusTag(state, reg?.status);
    renderResultTag(state, reg?.result?.value);

    renderDeclineArea(state);
    renderDeclineDraggableText(state);
}

// -----------------------------
// Decline area (visibility + DnD text)
// -----------------------------

function renderDeclineArea(state) {
    const canDecline = Boolean(state.data.canBeDeclined);

    setHidden(state.ui.declineDragWrap, !canDecline);
    setHidden(state.ui.declineMuted, canDecline);
    setHidden(state.ui.cannotDeclineNote, canDecline);

    setText(state.ui.declineMuted, "—");
}

function renderDeclineDraggableText(state) {
    if (!state.ui.declineDraggableText) return;
    setText(state.ui.declineDraggableText, buildDeclineDraggableText(state));
}

// -----------------------------
// Drag & drop + modal confirm
// -----------------------------

function bindDeclineDnD(state) {
    const dragEl = state.ui.declineDraggable;
    const trash = state.ui.trashDropzone;

    if (!dragEl || !trash) return;

    dragEl.addEventListener("dragstart", (e) => {
        if (!state.data.canBeDeclined) {
            e.preventDefault();
            return;
        }

        hideError(state);
        hideSuccess(state);

        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = "move";
            try {
                e.dataTransfer.setData("text/plain", "decline");
            } catch (_) { }
        }

        trash.classList.add("is-armed");
    });

    dragEl.addEventListener("dragend", () => {
        trash.classList.remove("is-armed", "is-over");
    });

    trash.addEventListener("dragover", (e) => {
        if (!state.data.canBeDeclined) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        trash.classList.add("is-over");
    });

    trash.addEventListener("dragleave", () => {
        trash.classList.remove("is-over");
    });

    trash.addEventListener("drop", (e) => {
        if (!state.data.canBeDeclined) return;
        e.preventDefault();

        trash.classList.remove("is-over");

        const text = buildDeclineModalText(state);
        openDeclineModal(state, text);
    });

    bindDeclineModal(state);
}

function bindDeclineModal(state) {
    const modal = state.ui.declineModal;
    const btnCancel = state.ui.btnDeclineCancel;
    const btnConfirm = state.ui.btnDeclineConfirm;

    if (!modal || !btnCancel || !btnConfirm) return;

    btnCancel.addEventListener("click", () => closeDeclineModal(state));

    btnConfirm.addEventListener("click", async () => {
        await confirmDecline(state);
    });

    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeDeclineModal(state);
    });

    window.addEventListener("keydown", (e) => {
        if (!state.modal.open) return;
        if (e.key === "Escape") closeDeclineModal(state);
    });
}

function openDeclineModal(state, text) {
    setText(state.ui.declineModalText, text);

    state.modal.open = true;
    setHidden(state.ui.declineModal, false);
    document.body.classList.add("modal-open");
}

function closeDeclineModal(state) {
    state.modal.open = false;
    setHidden(state.ui.declineModal, true);
    document.body.classList.remove("modal-open");
}

async function confirmDecline(state) {
    try {
        hideError(state);
        hideSuccess(state);

        await declineResult(state.examId);

        closeDeclineModal(state);
        showSuccess(state, "Voto rifiutato con successo");

        await loadAndRender(state);
    } catch (err) {
        closeDeclineModal(state);
        showError(state, err?.message || "Errore durante il rifiuto del voto");
    }
}

// -----------------------------
// Decline texts
// -----------------------------

function buildDeclineDraggableText(state) {
    const r = state.data.registration;

    const studentNum = r?.student?.number ?? "—";
    const courseName = r?.exam?.course?.name ?? "—";
    const vote = String(r?.result?.value || "").trim() || "—";

    return `${studentNum} · ${courseName} · Voto: ${vote}`;
}

function buildDeclineModalText(state) {
    const r = state.data.registration;

    const student = r?.student
        ? `${r.student.number} · ${(r.student.surname || "").trim()} ${(r.student.name || "").trim()}`.trim()
        : "Studente —";

    const course = r?.exam?.course?.name ? `Corso: ${r.exam.course.name}` : "Corso: —";
    const exam = r?.exam?.date ? `Appello: ${formatDateTime(r.exam.date)}` : "Appello: —";

    const result = String(r?.result?.value || "").trim();
    const resultText = result.length ? `Voto: ${result}` : "Voto: —";

    return `${student} | ${course} | ${exam} | ${resultText}`;
}

// -----------------------------
// Tags rendering
// -----------------------------

function renderStatusTag(state, status) {
    const el = state.ui.statusTag;
    if (!el) return;

    const s = String(status || "").trim();
    setText(el, s.length ? s : "—");
    el.dataset.status = normalize(s);
}

function renderResultTag(state, value) {
    const el = state.ui.resultTag;
    if (!el) return;

    const v = String(value || "").trim();
    setText(el, v.length ? v : "—");
    el.dataset.result = normalize(v);
    el.classList.toggle("is-empty", v.length === 0);
}

// -----------------------------
// Errors + success
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

function showSuccess(state, message) {
    if (!state.ui.pageSuccess || !state.ui.pageSuccessText) return;
    state.ui.pageSuccess.hidden = false;
    setText(state.ui.pageSuccessText, message);
}

function hideSuccess(state) {
    if (!state.ui.pageSuccess || !state.ui.pageSuccessText) return;
    state.ui.pageSuccess.hidden = true;
    setText(state.ui.pageSuccessText, "");
}

// -----------------------------
// Small utilities
// -----------------------------

function setHidden(el, hidden) {
    if (!el) return;
    el.hidden = Boolean(hidden);
}

function formatStudentName(student) {
    if (!student) return "—";
    const surname = student.surname || "";
    const name = student.name || "";
    const full = `${surname} ${name}`.trim();
    return full.length ? full : "—";
}
