import api from "./api";

/* =========================
   REPORTS
   ========================= */

// Crea report per trail [Auth]
export const createReport = (idTrail, data) =>
  api.post(`/reports/${idTrail}`, data);

// Tutti i report [Auth + Admin]
export const getAllReports = () =>
  api.get("/reports/all");

// Report singolo [Auth]
export const getReportById = (id) =>
  api.get(`/reports/${id}`);

// Modifica report [Self | Admin]
export const updateReport = (id, data) =>
  api.put(`/reports/${id}`, data);

// Elimina report [Self | Admin]
export const deleteReport = (id) =>
  api.delete(`/reports/${id}`);

// Tutti i report di un trail [Auth]
export const getTrailReports = (idTrail) =>
  api.get(`/reports/all/trail/${idTrail}`);

// Tutti i report di un utente [Self | Admin]
export const getUserReports = (idUser) =>
  api.get(`/reports/all/user/${idUser}`);
