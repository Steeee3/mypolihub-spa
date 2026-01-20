import { apiFetch } from "../common/api.js";

export async function getExamsForCourse(courseId) {
    return await apiFetch(`/api/exams?courseId=${encodeURIComponent(courseId)}`);
}

export async function getExamsWhereStudentIsRegistered(courseId) {
    return await apiFetch(`/api/student/exams/registered?courseId=${encodeURIComponent(courseId)}`);
}

export async function registerToExam(examId, courseId) {
    await apiFetch(
        `/student/exam/${encodeURIComponent(examId)}/register`,
        {
            method: "POST",
            body: JSON.stringify(courseId)
        }
    )
}

// -----------------------------
// Read
// -----------------------------

export async function getAllExamRegistrations(examId) {
    return await apiFetch(`/api/professor/exam?examId=${encodeURIComponent(examId)}`);
}

// -----------------------------
// Mutations
// -----------------------------

export async function editRegistrationResult(registrationId, resultId) {
    return await apiFetch(
        `/api/professor/registrations/${encodeURIComponent(registrationId)}/result?resultId=${encodeURIComponent(resultId)}`,
        { method: "PATCH" }
    );
}

export async function publishExamResults(examId) {
    return await apiFetch(`/api/professor/exam/${encodeURIComponent(examId)}/publish`, {
        method: "POST",
    });
}

export async function finalizeExamResults(examId) {
    return await apiFetch(`/api/professor/exam/${encodeURIComponent(examId)}/finalize`, {
        method: "POST",
    });
}

export async function editAllRegistrationResults(updates) {
    return await apiFetch(
        "/api/professor/registrations/results",
        {
            method: "PATCH",
            body: JSON.stringify(updates)
        }
    );
}