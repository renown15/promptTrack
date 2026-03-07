import { NavLink } from "react-router-dom";
import { useProjectTree } from "@/hooks/useCollections";
import { useSidebarStore } from "@/stores/sidebarStore";
import type { ChainSummaryDTO, PromptSummaryDTO } from "@prompttrack/shared";
import "@/components/layout/ProjectTree.css";

function PromptLink({ prompt }: { prompt: PromptSummaryDTO }) {
  return (
    <NavLink
      to={`/prompts/${prompt.id}`}
      className={({ isActive }) =>
        `project-tree__item project-tree__item--prompt${isActive ? " project-tree__item--active" : ""}`
      }
    >
      <span className="project-tree__icon">&#128196;</span>
      {prompt.name}
    </NavLink>
  );
}

function ChainNode({ chain }: { chain: ChainSummaryDTO }) {
  const { isChainCollapsed, toggleChain } = useSidebarStore();
  const collapsed = isChainCollapsed(chain.id);

  return (
    <div className="project-tree__chain-group">
      <div className="project-tree__chain-row">
        <button
          className="project-tree__toggle"
          onClick={() => toggleChain(chain.id)}
          aria-label={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "▶" : "▼"}
        </button>
        <NavLink
          to={`/chains/${chain.id}`}
          className={({ isActive }) =>
            `project-tree__item project-tree__item--chain${isActive ? " project-tree__item--active" : ""}`
          }
        >
          <span className="project-tree__icon">&#128279;</span>
          {chain.name}
        </NavLink>
      </div>
      {!collapsed && chain.prompts.length > 0 && (
        <div className="project-tree__chain-prompts">
          {chain.prompts.map((p) => (
            <NavLink
              key={p.id}
              to={`/prompts/${p.id}`}
              className={({ isActive }) =>
                `project-tree__item project-tree__item--child-prompt${isActive ? " project-tree__item--active" : ""}`
              }
            >
              <span className="project-tree__icon">&#128196;</span>
              {p.name}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectSection({
  id,
  name,
  prompts,
  chains,
}: {
  id: string;
  name: string;
  prompts: PromptSummaryDTO[];
  chains: ChainSummaryDTO[];
}) {
  const { isProjectCollapsed, toggleProject } = useSidebarStore();
  const collapsed = isProjectCollapsed(id);

  return (
    <div className="project-tree__project">
      <button
        className="project-tree__project-header"
        onClick={() => toggleProject(id)}
      >
        <span className="project-tree__project-toggle">
          {collapsed ? "▶" : "▼"}
        </span>
        <span className="project-tree__icon">&#128193;</span>
        {name}
      </button>
      {!collapsed && (
        <div className="project-tree__project-children">
          {prompts.map((p) => (
            <PromptLink key={p.id} prompt={p} />
          ))}
          {chains.map((c) => (
            <ChainNode key={c.id} chain={c} />
          ))}
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

  const hasUngrouped =
    data.ungrouped.prompts.length > 0 || data.ungrouped.chains.length > 0;

  return (
    <div className="project-tree">
      {data.collections.map((c) => (
        <ProjectSection
          key={c.id}
          id={c.id}
          name={c.name}
          prompts={c.prompts}
          chains={c.chains}
        />
      ))}
      {hasUngrouped && (
        <div className="project-tree__ungrouped">
          <span className="project-tree__ungrouped-label">Ungrouped</span>
          {data.ungrouped.prompts.map((p) => (
            <PromptLink key={p.id} prompt={p} />
          ))}
          {data.ungrouped.chains.map((c) => (
            <ChainNode key={c.id} chain={c} />
          ))}
        </div>
      )}
    </div>
  );
}
