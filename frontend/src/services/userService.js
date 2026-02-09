import api from "../api/axios";

// USERS
export const getUsers = () => api.get("/users");
export const getUserById = (id) => api.get(`/users/${id}`);
export const createUser = (data) => api.post("/users", data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);

// FAVOURITES
export const addFavourite = (idUser, idTrail) => api.post("/users/favourites", { idUser, idTrail });
export const removeFavourite = (idUser, idTrail) => api.delete(`/users/${idUser}/favourites/${idTrail}`);
export const getFavourites = (idUser) => api.get(`/users/favourites/${idUser}`);
