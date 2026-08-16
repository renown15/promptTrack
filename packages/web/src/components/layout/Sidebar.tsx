import { authApi } from "@/api/endpoints/auth";
import { ollamaApi } from "@/api/endpoints/ollama";
import { ProjectTree } from "@/components/layout/ProjectTree";
import "@/components/layout/Sidebar.css";
import { useCreateCollection } from "@/hooks/useCollections";
import { useAuthStore } from "@/stores/authStore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function Sidebar() {
  const { refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createCollection = useCreateCollection();
  const [newProjectName, setNewProjectName] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);

  const { data: llmEnabled = true } = useQuery({
    queryKey: ["llm-enabled"],
    queryFn: () => ollamaApi.getLlmEnabled(),
  });

  const toggleLlm = useMutation({
    mutationFn: (enabled: boolean) => ollamaApi.setLlmEnabled(enabled),
    onSuccess: (enabled) => {
      queryClient.setQueryData(["llm-enabled"], enabled);
    },
  });

  const handleLogout = async () => {
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => null);
    }
    logout();
    navigate("/login");
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    try {
      await createCollection.mutateAsync({ name: newProjectName.trim() });
      // Remove all collection-related cache entries
      queryClient.removeQueries({ queryKey: ["collections"] });
      // Force refetch
      await queryClient.refetchQueries({ queryKey: ["collections", "tree"] });
    } catch (error) {
      console.error("Failed to create collection:", error);
    }
    setNewProjectName("");
    setShowNewProject(false);
  };

  return (
    <aside className="sidebar">
      <span className="sidebar__brand">PromptTrack</span>

      <div className="sidebar__section-header">
        <span className="sidebar__section-label">Collections</span>
        <button
          className="sidebar__add-btn"
          onClick={() => setShowNewProject((v) => !v)}
          title="New collection"
        >
          +
        </button>
      </div>

      {showNewProject && (
        <form className="sidebar__new-project" onSubmit={handleCreateProject}>
          <input
            className="sidebar__new-project-input"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setNewProjectName("");
                setShowNewProject(false);
              }
            }}
            placeholder="Collection name"
            autoFocus
          />
          <button type="submit" className="sidebar__new-project-submit">
            Add
          </button>
          <button
            type="button"
            className="sidebar__new-project-cancel"
            onClick={() => {
              setNewProjectName("");
              setShowNewProject(false);
            }}
            aria-label="Cancel"
          >
            ✕
          </button>
        </form>
      )}

      <nav className="sidebar__nav">
        <ProjectTree />
      </nav>

      <div className="sidebar__footer">
        <button
          className={`sidebar__llm-toggle sidebar__llm-toggle--${llmEnabled ? "on" : "off"}`}
          onClick={() => toggleLlm.mutate(!llmEnabled)}
          title={llmEnabled ? "Pause LLM analysis" : "Resume LLM analysis"}
        >
          <span className="sidebar__llm-toggle-dot" />
          LLM {llmEnabled ? "on" : "off"}
        </button>
        <button className="sidebar__logout" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
