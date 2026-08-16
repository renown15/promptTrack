import "@/components/layout/ProjectTree.css";
import { useProjectTree } from "@/hooks/useCollections";
import { useSidebarStore } from "@/stores/sidebarStore";
import type { ChainSummaryDTO, PromptSummaryDTO } from "@prompttrack/shared";
import { NavLink } from "react-router-dom";

function PromptLink({ prompt }: { prompt: PromptSummaryDTO }) {
  return (
    <NavLink
      to={`/prompts/${prompt.id}`}
      className={({ isActive }) =>
        `project-tree__item${isActive ? " project-tree__item--active" : ""}`
      }
    >
      <span className="project-tree__icon">◻</span>
      {prompt.name}
    </NavLink>
  );
}

function ChainNode({ chain }: { chain: ChainSummaryDTO }) {
  return (
    <NavLink
      to={`/chains/${chain.id}`}
      className={({ isActive }) =>
        `project-tree__item project-tree__item--chain${isActive ? " project-tree__item--active" : ""}`
      }
    >
      <span className="project-tree__icon">⬡</span>
      {chain.name}
    </NavLink>
  );
}

function ProjectSection({
  id,
  name,
  directory,
  prompts,
  chains,
}: {
  id: string;
  name: string;
  directory: string | null;
  prompts: PromptSummaryDTO[];
  chains: ChainSummaryDTO[];
}) {
  const { isProjectCollapsed, toggleProject } = useSidebarStore();
  const collapsed = isProjectCollapsed(id);

  const isEmpty = prompts.length === 0 && chains.length === 0;

  return (
    <div className="project-tree__project">
      <div className="project-tree__project-header">
        <button
          className="project-tree__toggle"
          onClick={() => toggleProject(id)}
          aria-label={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "▶" : "▼"}
        </button>
        <NavLink
          to={`/collections/${id}`}
          className={({ isActive }) =>
            `project-tree__project-link${isActive ? " project-tree__item--active" : ""}`
          }
        >
          <span className="project-tree__icon project-tree__icon--folder">
            {collapsed ? "▷" : "▽"}
          </span>
          {name}
        </NavLink>
      </div>
      {!collapsed && (
        <div className="project-tree__project-children">
          {isEmpty && !directory && (
            <span className="project-tree__empty">Empty</span>
          )}
          {directory && (
            <>
              <NavLink
                to={`/collections/${id}/insights`}
                className={({ isActive }) =>
                  `project-tree__item project-tree__item--insight${isActive ? " project-tree__item--active" : ""}`
                }
              >
                <span className="project-tree__icon">◈</span>
                Agent Insight
              </NavLink>
              <NavLink
                to={`/collections/${id}/analytics`}
                className={({ isActive }) =>
                  `project-tree__item project-tree__item--insight${isActive ? " project-tree__item--active" : ""}`
                }
              >
                <span className="project-tree__icon">📊</span>
                Agent Analytics
              </NavLink>
            </>
          )}
          {prompts.length > 0 && (
            <div className="project-tree__group">
              <span className="project-tree__group-label">Input Prompts</span>
              {prompts.map((p) => (
                <PromptLink key={p.id} prompt={p} />
              ))}
            </div>
          )}
          {chains.length > 0 && (
            <div className="project-tree__group">
              <span className="project-tree__group-label">
                Agent Instructions
              </span>
              {chains.map((c) => (
                <ChainNode key={c.id} chain={c} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ProjectTree() {
  const { data, isLoading } = useProjectTree();

  if (isLoading) {
    return <div className="project-tree__loading">Loading...</div>;
  }

  if (!data) return null;

  return (
    <div className="project-tree">
      {data.collections.map((c) => (
        <ProjectSection
          key={c.id}
          id={c.id}
          name={c.name}
          directory={c.directory}
          prompts={c.prompts}
          chains={c.chains}
        />
      ))}
      <div className="project-tree__all-prompts">
        <NavLink
          to="/prompts"
          className={({ isActive }) =>
            `project-tree__item project-tree__item--all${isActive ? " project-tree__item--active" : ""}`
          }
        >
          <span className="project-tree__icon">≡</span>
          All Prompts
        </NavLink>
      </div>
    </div>
  );
}
