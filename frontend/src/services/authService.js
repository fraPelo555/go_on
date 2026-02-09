import api from "../api/axios";

export const login = (credentials) =>
  api.post("/auth/login", credentials);
