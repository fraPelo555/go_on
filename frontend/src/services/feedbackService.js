import api from "../api/axios";

// FEEDBACKS
export const getFeedbacks = (filter = {}) => api.get("/feedbacks", { params: filter });
export const getFeedbackById = (id) => api.get(`/feedbacks/${id}`);
export const createFeedback = (data) => api.post("/feedbacks", data);
export const updateFeedback = (id, data) => api.put(`/feedbacks/${id}`, data);
export const deleteFeedback = (id) => api.delete(`/feedbacks/${id}`);

// FILTERED
export const getTrailFeedbacks = (idTrail) => api.get(`/feedbacks/trail/${idTrail}`);
export const getUserFeedbacks = (idUser) => api.get(`/feedbacks/user/${idUser}`);
