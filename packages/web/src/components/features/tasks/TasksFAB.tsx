import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { tasksApi } from "@/api/endpoints/tasks";
import { MarkdownViewer } from "@/components/features/collections/MarkdownViewer";
import "@/components/features/tasks/TasksFAB.css";

const IDLE_MARKER = "## Status: idle";

function TaskIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
}

export function TasksFAB() {
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["tasks"],
    queryFn: tasksApi.get,
    refetchInterval: open ? 5000 : false,
    staleTime: 0,
  });

  const content = data?.content ?? "";
  const isActive = content.length > 0 && !content.includes(IDLE_MARKER);

  return (
    <div className="tasks-fab">
      {open && (
        <div className="tasks-fab__panel">
          <div className="tasks-fab__panel-header">
            <span className="tasks-fab__panel-title">Claude Tasks</span>
            <button
              className="tasks-fab__panel-close"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="tasks-fab__panel-body">
            <MarkdownViewer content={content} />
          </div>
        </div>
      )}
      <button
        className={`tasks-fab__btn${isActive ? " tasks-fab__btn--active" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Claude tasks"
        title="Claude Tasks"
      >
        <TaskIcon />
      </button>
    </div>
  );
}
