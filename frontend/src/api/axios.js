import axios from "axios";

const api = axios.create({
  baseURL: "https://go-on-backend.onrender.com/"
});

export default api;
