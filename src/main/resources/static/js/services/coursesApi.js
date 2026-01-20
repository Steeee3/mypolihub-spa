import { apiFetch } from "../common/api.js";

export async function getProfessorCourses({ sortDir = "desc" } = {}) {
    return apiFetch(`/api/professor/courses?sortDir=${encodeURIComponent(sortDir)}`);
}

export async function getStudentCourses() {
    return apiFetch("/api/student/courses");
}