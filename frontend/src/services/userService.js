import api from "./api";

/* =========================
   USERS
   ========================= */

// Creazione utente (ritorna JWT)
export const createUser = (data) =>
  api.post("/users", data);

// Tutti gli utenti [Admin]
export const getUsers = () =>
  api.get("/users/all");

// Utente singolo [Self | Admin]
export const getUserById = (id) =>
  api.get(`/users/${id}`);

// Aggiorna utente [Self | Admin]
export const updateUser = (id, data) =>
  api.put(`/users/${id}`, data);

// Elimina utente [Self | Admin]
export const deleteUser = (id) =>
  api.delete(`/users/${id}`);

/* =========================
   FAVOURITES
   ========================= */

// Aggiungi preferito [Self | Admin]
export const addFavourite = (idUser, idTrail) =>
  api.post(`/users/${idUser}/favourites/${idTrail}`);

// Rimuovi preferito [Self | Admin]
export const removeFavourite = (idUser, idTrail) =>
  api.delete(`/users/${idUser}/favourites/${idTrail}`);

// Lista preferiti [Self | Admin]
export const getFavourites = (idUser) =>
  api.get(`/users/favourites/${idUser}`);
