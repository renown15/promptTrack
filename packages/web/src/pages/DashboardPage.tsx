import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import "@/pages/DashboardPage.css";

export function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  return (
    <div className="dashboard">
      <h1 className="dashboard__title">
        Welcome{user?.name ? `, ${user.name}` : ""}
      </h1>
      <p className="dashboard__subtitle">
        Manage your prompts, build chains, and search semantically.
      </p>
      <div className="dashboard__actions">
        <button className="dashboard__btn" onClick={() => navigate("/prompts")}>
          Go to Prompts
        </button>
        <button className="dashboard__btn" onClick={() => navigate("/chains")}>
          Go to Chains
        </button>
      </div>
    </div>
  );
}
