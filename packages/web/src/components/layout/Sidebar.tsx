import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { authApi } from "@/api/endpoints/auth";
import "@/components/layout/Sidebar.css";

const NAV_ITEMS = [
  { to: "/prompts", label: "Prompts" },
  { to: "/chains", label: "Chains" },
  { to: "/search", label: "Search" },
];

export function Sidebar() {
  const { refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => null);
    }
    logout();
    navigate("/login");
  };

  return (
    <aside className="sidebar">
      <span className="sidebar__brand">PromptTrack</span>
      <nav className="sidebar__nav">
        {NAV_ITEMS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar__link${isActive ? " sidebar__link--active" : ""}`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar__footer">
        <button className="sidebar__logout" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
