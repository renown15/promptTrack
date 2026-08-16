import { AuthGuard } from "@/components/features/auth/AuthGuard";
import { AppShell } from "@/components/layout/AppShell";
import { AgentInsightPage } from "@/pages/AgentInsightPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { ChainDetailPage } from "@/pages/ChainDetailPage";
import { ChainsPage } from "@/pages/ChainsPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { LoginPage } from "@/pages/LoginPage";
import { ProjectPage } from "@/pages/ProjectPage";
import { PromptDetailPage } from "@/pages/PromptDetailPage";
import { PromptNewPage } from "@/pages/PromptNewPage";
import { PromptsPage } from "@/pages/PromptsPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

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
            <Route
              path="/collections/:id/analytics"
              element={<AnalyticsPage />}
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
