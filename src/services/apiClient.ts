import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { ApiErrorResponse } from "@/types/api";
import useAuthStore from "@/store/useAuthStore";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
  headers: {
    "Content-Type": "application/json",
  },
});

// Single source of truth: always read token from Zustand store
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    // ── Preserve cancellation errors ─────────────────────────────────────────
    // When TanStack Query aborts a request (e.g. on component unmount or
    // navigation), axios throws a CanceledError. We MUST let it propagate
    // as-is so TQ can recognise it as a cancellation and NOT transition the
    // query to error state. Swallowing it here would cause ERROR state +
    // spurious retries on every navigation, eventually leaving the query
    // stuck with isFetching=true and no data.
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    const axiosError = error as AxiosError<ApiErrorResponse>;

    // 401 with a valid token present → token expired/invalid
    // Clearing the store also clears the cookie (via logout action),
    // which causes the middleware to redirect on the next navigation.
    // Do NOT use window.location here — let the middleware handle the redirect.
    if (axiosError.response?.status === 401) {
      const { token, logout } = useAuthStore.getState();
      if (token) {
        logout();
      }
    }

    const responseData = axiosError.response?.data as Partial<ApiErrorResponse> | undefined;
    const normalized: ApiErrorResponse = {
      code: responseData?.code ?? axiosError.response?.status ?? 500,
      message:
        responseData?.message ||
        axiosError.message ||
        "An unexpected error occurred.",
    };
    return Promise.reject(normalized);
  }
);

export default apiClient;
