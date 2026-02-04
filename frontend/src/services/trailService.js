import api from "../api/axios";

// TRAILS
export const getTrails = (filters = {}) => api.get("/trails", { params: filters });
export const getTrailById = (id) => api.get(`/trails/${id}`);
export const createTrail = (formData) => api.post("/trails", formData); // multer -> invia FormData
export const updateTrail = (id, data) => api.put(`/trails/${id}`, data);
export const deleteTrail = (id) => api.delete(`/trails/${id}`);
export const downloadGPX = (id) => api.get(`/trails/${id}/upload/gpx`, { responseType: 'blob' });
export const getNearbyTrails = (lat, lon, radius) =>
  api.get("/trails/near", { params: { lat, lon, radius } });
