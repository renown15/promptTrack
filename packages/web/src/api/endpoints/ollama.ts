import { apiClient } from "@/api/client";
import { useAuthStore } from "@/stores/authStore";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3051/api";

export interface OllamaConfigDTO {
  id: string;
  endpoint: string;
  model: string;
  metrics: Record<string, boolean>;
  defaultMetrics: MetricDefinition[];
}

export interface MetricDefinition {
  name: string;
  label: string;
  description: string;
}

export interface ModelStatusDTO {
  name: string;
  label: string;
  sizeGb: number;
  rank: number;
  installed: boolean;
  isCurrent: boolean;
  isBetter: boolean;
}

export interface RecommendedModelsDTO {
  models: ModelStatusDTO[];
  currentModel: string;
}

export type PullProgressChunk = {
  status: string;
  progress?: number;
  done?: boolean;
  error?: string;
};

export const ollamaApi = {
  getConfig: async (): Promise<OllamaConfigDTO> => {
    const r = await apiClient.get<OllamaConfigDTO>("/settings/ollama");
    return r.data;
  },

  updateConfig: async (
    data: Omit<OllamaConfigDTO, "id" | "defaultMetrics">
  ): Promise<OllamaConfigDTO> => {
    const r = await apiClient.put<OllamaConfigDTO>("/settings/ollama", data);
    return r.data;
  },

  testConnection: async (endpoint: string): Promise<boolean> => {
    const r = await apiClient.post<{ ok: boolean }>("/settings/ollama/test", {
      endpoint,
    });
    return r.data.ok;
  },

  listModels: async (endpoint: string): Promise<string[]> => {
    const r = await apiClient.get<{ models: string[] }>(
      `/settings/ollama/models?endpoint=${encodeURIComponent(endpoint)}`
    );
    return r.data.models;
  },

  getRecommended: async (): Promise<RecommendedModelsDTO> => {
    const r = await apiClient.get<RecommendedModelsDTO>(
      "/settings/ollama/recommended"
    );
    return r.data;
  },

  pullModel: async (
    model: string,
    onProgress: (chunk: PullProgressChunk) => void
  ): Promise<void> => {
    const token = useAuthStore.getState().accessToken;
    const res = await fetch(`${API_BASE}/settings/ollama/pull`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ model }),
    });
    if (!res.ok) throw new Error(`Pull failed: ${res.status}`);
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const events = buf.split("\n\n");
      buf = events.pop() ?? "";
      for (const event of events) {
        const dataLine = event.split("\n").find((l) => l.startsWith("data: "));
        if (!dataLine) continue;
        try {
          onProgress(JSON.parse(dataLine.slice(6)) as PullProgressChunk);
        } catch {
          /* ignore malformed */
        }
      }
    }
  },
};
