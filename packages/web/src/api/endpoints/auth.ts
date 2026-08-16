import { apiClient } from "@/api/client";
import type {
  RegisterInput,
  LoginInput,
  TokenResponse,
} from "@prompttrack/shared";

export const authApi = {
  register: async (data: RegisterInput): Promise<TokenResponse> => {
    const response = await apiClient.post<TokenResponse>(
      "/auth/register",
      data
    );
    return response.data;
  },

  login: async (data: LoginInput): Promise<TokenResponse> => {
    const response = await apiClient.post<TokenResponse>("/auth/login", data);
    return response.data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post("/auth/logout", { refreshToken });
  },
};
