import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthGuard } from "@/components/features/auth/AuthGuard";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { PromptsPage } from "@/pages/PromptsPage";
import { PromptDetailPage } from "@/pages/PromptDetailPage";
import { PromptNewPage } from "@/pages/PromptNewPage";
import { ChainsPage } from "@/pages/ChainsPage";
import { ChainDetailPage } from "@/pages/ChainDetailPage";
import { ProjectPage } from "@/pages/ProjectPage";
import { AgentInsightPage } from "@/pages/AgentInsightPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            element={
              <AuthGuard>
                <AppShell />
              </AuthGuard>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/prompts" element={<PromptsPage />} />
            <Route path="/prompts/new" element={<PromptNewPage />} />
            <Route path="/prompts/:id" element={<PromptDetailPage />} />
            <Route path="/collections/:id" element={<ProjectPage />} />
            <Route
              path="/collections/:id/insights"
              element={<AgentInsightPage />}
            />
            <Route path="/chains" element={<ChainsPage />} />
            <Route path="/chains/:id" element={<ChainDetailPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
