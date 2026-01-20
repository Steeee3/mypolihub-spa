import { apiFetch } from "../common/api.js";

export async function getExamsForCourse(courseId) {
    return apiFetch(`/api/exams?courseId=${encodeURIComponent(courseId)}`);
}

export async function getExamsWhereStudentIsRegistered(courseId) {
    return apiFetch(`/api/student/exams/registered?courseId=${encodeURIComponent(courseId)}`);
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