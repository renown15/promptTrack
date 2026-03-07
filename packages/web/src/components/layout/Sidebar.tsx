import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { authApi } from "@/api/endpoints/auth";
import { useCreateCollection } from "@/hooks/useCollections";
import { useQueryClient } from "@tanstack/react-query";
import { ProjectTree } from "@/components/layout/ProjectTree";
import "@/components/layout/Sidebar.css";

export function Sidebar() {
  const { refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createCollection = useCreateCollection();
  const [newProjectName, setNewProjectName] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);

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
    await createCollection.mutateAsync({ name: newProjectName.trim() });
    queryClient.invalidateQueries({ queryKey: ["collections", "tree"] });
    setNewProjectName("");
    setShowNewProject(false);
  };

  return (
    <aside className="sidebar">
      <span className="sidebar__brand">PromptTrack</span>

      <div className="sidebar__section-header">
        <span className="sidebar__section-label">Projects</span>
        <button
          className="sidebar__add-btn"
          onClick={() => setShowNewProject((v) => !v)}
          title="New project"
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
            placeholder="Project name"
            autoFocus
          />
          <button type="submit" className="sidebar__new-project-submit">
            Add
          </button>
        </form>
      )}

      <nav className="sidebar__nav">
        <ProjectTree />
      </nav>

      <div className="sidebar__divider" />

      <nav className="sidebar__bottom-nav">
        <NavLink
          to="/prompts"
          className={({ isActive }) =>
            `sidebar__link${isActive ? " sidebar__link--active" : ""}`
          }
        >
          All Prompts
        </NavLink>
        <NavLink
          to="/chains"
          className={({ isActive }) =>
            `sidebar__link${isActive ? " sidebar__link--active" : ""}`
          }
        >
          All Chains
        </NavLink>
      </nav>

      <div className="sidebar__footer">
        <button className="sidebar__logout" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
