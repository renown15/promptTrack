import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";
import { TasksFAB } from "@/components/features/tasks/TasksFAB";
import "@/components/layout/AppShell.css";

export function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-shell__main">
        <TopNav />
        <main className="app-shell__content">
          <Outlet />
        </main>
      </div>
      <TasksFAB />
    </div>
  );
}
