import axios from "axios";
import { redirectToSsoLogin } from "@/lib/auth-urls";

export const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isLoginRequest = error.config?.url?.includes("/auth/login");

      // Let the local login form show bad-credential errors; everything else
      // means there is no valid SSO session.
      if (!isLoginRequest) {
        redirectToSsoLogin();
      }
    }
    return Promise.reject(error);
  }
);
