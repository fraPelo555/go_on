import api from "./api";

/* =========================
   TRAILS
   ========================= */

// Lista trail con filtri
export const getTrails = (filters = {}) =>
  api.get("/trails", { params: filters });

// Trail singolo
export const getTrailById = (id) =>
  api.get(`/trails/${id}`);

// Creazione trail [Auth + Admin]
export const createTrail = (formData) =>
  api.post("/trails", formData);

// Aggiornamento trail [Auth + Admin]
export const updateTrail = (id, data) =>
  api.put(`/trails/${id}`, data);

// Upload / sostituzione GPX [Auth + Admin]
export const uploadGPX = (id, formData) =>
  api.put(`/trails/${id}/gpx`, formData);

// Eliminazione trail [Auth + Admin]
export const deleteTrail = (id) =>
  api.delete(`/trails/${id}`);

// Download GPX
export const downloadGPX = (id) =>
  api.get(`/trails/${id}/gpx`, { responseType: "blob" });

// Trail vicini
export const getNearbyTrails = (lat, lon, radius) =>
  api.get("/trails/near", {
    params: { lat, lon, radius }
  });
