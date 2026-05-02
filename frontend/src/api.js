import axios from "axios";

// Create a new axios instance
const api = axios.create({
  // We set the baseURL to '/' because the Vite proxy
  // is already handling the redirect to http://localhost:4000
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
