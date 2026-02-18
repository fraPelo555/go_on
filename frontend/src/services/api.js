import axios from "../api/axios";

const api = axios.create({
  baseURL: "https://go-on-backend.onrender.com/"
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
