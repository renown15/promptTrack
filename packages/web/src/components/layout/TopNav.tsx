import { useAuthStore } from "@/stores/authStore";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import "@/components/layout/TopNav.css";

export function TopNav() {
  const user = useAuthStore((s) => s.user);

  return (
    <header className="top-nav">
      <div className="top-nav__search">
        <GlobalSearch />
      </div>
      <div className="top-nav__right">
        {user && (
          <span className="top-nav__user">{user.name || user.email}</span>
        )}
      </div>
    </header>
  );
}
