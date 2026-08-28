import axios from "axios";
import { clearAuthToken, getAuthToken } from "./auth-token";

export const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token on 401 Unauthorized
      clearAuthToken();

      if (typeof window !== "undefined") {
        const isLoginRequest = error.config?.url?.includes("/auth/login");
        const isLoginPage = window.location.pathname === "/login";

        // Prevent redirect loop and allow login page to display bad credentials error
        if (!isLoginRequest && !isLoginPage) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);
