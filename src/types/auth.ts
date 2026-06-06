export type UserRole = "ADMIN" | "CUSTOMER";

export interface AuthTokenResponse {
  accessToken: string;
  tokenType: string;
}

export interface UserProfile {
  id: number;
  email: string;
  role: UserRole;
  phone: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  phone: string;
}
