import api from "./api";

/* =========================
   FEEDBACKS
   ========================= */

// Crea feedback (1 per user/trail) [Self]
export const createFeedback = (idTrail, data) =>
  api.post(`/feedbacks/${idTrail}`, data);

// Tutti i feedback [Admin]
export const getAllFeedbacks = () =>
  api.get("/feedbacks/all");

// Feedback singolo [Auth]
export const getFeedbackById = (id) =>
  api.get(`/feedbacks/${id}`);

// Aggiorna feedback [Self | Admin]
export const updateFeedback = (id, data) =>
  api.put(`/feedbacks/${id}`, data);

// Elimina feedback [Self | Admin]
export const deleteFeedback = (id) =>
  api.delete(`/feedbacks/${id}`);

// Feedback di un trail [Auth]
export const getTrailFeedbacks = (idTrail) =>
  api.get(`/feedbacks/all/trail/${idTrail}`);

// Feedback di un utente [Self | Admin]
export const getUserFeedbacks = (idUser) =>
  api.get(`/feedbacks/all/user/${idUser}`);
