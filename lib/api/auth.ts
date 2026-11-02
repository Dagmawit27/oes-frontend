import { apiClient } from "./client";
import { ApiResponse, LoginResponseData, User } from "@/types/auth";

export const authApi = {
  async login(email: string, password: string): Promise<ApiResponse<LoginResponseData>> {
    const response = await apiClient.post<ApiResponse<LoginResponseData>>("/auth/login", {
      email,
      password,
    });
    return response.data;
  },

  async getCurrentUser(): Promise<ApiResponse<User>> {
    const response = await apiClient.get<ApiResponse<User>>("/auth/me");
    return response.data;
  },

  async refresh(refreshToken?: string): Promise<ApiResponse<LoginResponseData>> {
    const response = await apiClient.post<ApiResponse<LoginResponseData>>("/auth/refresh", {
      refreshToken,
    });
    return response.data;
  },

  async logout(refreshToken?: string): Promise<ApiResponse<void>> {
    const response = await apiClient.post<ApiResponse<void>>("/auth/logout", {
      refreshToken,
    });
    return response.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    const response = await apiClient.post<ApiResponse<void>>("/auth/change-password", {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
};
