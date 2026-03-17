import { apiClient } from "@/api/client";

export interface TasksResponse {
  content: string;
}

export const tasksApi = {
  get: async (): Promise<TasksResponse> => {
    const res = await apiClient.get<TasksResponse>("/tasks");
    return res.data;
  },
};
