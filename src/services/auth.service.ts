import apiClient from "./apiClient";
import { ApiResponse } from "@/types/api";
import {
  AuthTokenResponse,
  LoginCredentials,
  RegisterData,
  UserProfile,
} from "@/types/auth";

const AuthService = {
  async login(credentials: LoginCredentials): Promise<AuthTokenResponse> {
    const res = await apiClient.post<ApiResponse<AuthTokenResponse>>(
      "/api/v1/auth/login",
      { email: credentials.email, password: credentials.password }
    );
    return res.data.data;
  },

  async register(data: RegisterData): Promise<AuthTokenResponse> {
    const res = await apiClient.post<ApiResponse<AuthTokenResponse>>(
      "/api/v1/auth/register",
      { email: data.email, password: data.password }
    );
    return res.data.data;
  },

  // Accepts an explicit token so the caller can fetch the profile immediately
  // after login/register — before the token is committed to the store.
  async getMe(token: string): Promise<UserProfile> {
    const res = await apiClient.get<ApiResponse<UserProfile>>(
      "/api/v1/auth/me",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data.data;
  },
};

export default AuthService;
