import { apiFetch } from "../common/api.js";

export async function getAllReportsByCourseId(courseId) {
    return await apiFetch(`/api/professor/reports?courseId=${encodeURIComponent(courseId)}`);
}

export async function getReportById(reportId) {
    return await apiFetch(`/api/professor/report?reportId=${encodeURIComponent(reportId)}`);
}