import api from "../api/axios";

// REPORTS
export const getReports = () => api.get("/reports");
export const getReportById = (id) => api.get(`/reports/${id}`);
export const createReport = (data) => api.post("/reports", data);
export const deleteReport = (id) => api.delete(`/reports/${id}`);

// FILTERED
export const getTrailReports = (idTrail) => api.get(`/reports/trail/${idTrail}`);
export const getUserReports = (idUser) => api.get(`/reports/user/${idUser}`);
