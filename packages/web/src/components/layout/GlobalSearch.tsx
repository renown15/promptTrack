import { useState, useRef } from "react";
import { useNavigate, useMatch } from "react-router-dom";
import { usePrompts, usePromptSearchDetails } from "@/hooks/usePrompts";
import { useInsightFilesCache } from "@/hooks/useInsights";
import "@/components/layout/GlobalSearch.css";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getLatestContent(prompt: {
  versions: { content: string; createdAt: string }[];
}) {
  if (prompt.versions.length === 0) return null;
  const sorted = [...prompt.versions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return sorted[0]!.content;
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const insightMatch = useMatch("/collections/:id/insights");
  const isInsightMode = !!insightMatch;
  const insightCollectionId = insightMatch?.params.id ?? "";

  // Prompt search
  const { data: prompts } = usePrompts();
  const q = query.trim().toLowerCase();
  const matchedPrompts =
    !isInsightMode && q.length >= 1
      ? (prompts ?? [])
          .filter(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              p.description?.toLowerCase().includes(q)
          )
          .slice(0, 8)
      : [];
  const matchedIds = matchedPrompts.map((p) => p.id);
  const { data: details } = usePromptSearchDetails(matchedIds);
  const detailsMap = new Map((details ?? []).map((d) => [d.id, d]));

  // File search
  const { data: insightState } = useInsightFilesCache(insightCollectionId);
  const matchedFiles =
    isInsightMode && q.length >= 1
      ? (insightState?.files ?? [])
          .filter(
            (f) =>
              f.name.toLowerCase().includes(q) ||
              f.relativePath.toLowerCase().includes(q)
          )
          .slice(0, 10)
      : [];

  function handleSelectPrompt(id: string) {
    setQuery("");
    setOpen(false);
    navigate(`/prompts/${id}`);
  }

  function handleSelectFile(relativePath: string) {
    setQuery("");
    setOpen(false);
    navigate(
      `/collections/${insightCollectionId}/insights?file=${encodeURIComponent(relativePath)}`
    );
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setQuery("");
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  const hasResults = isInsightMode
    ? matchedFiles.length > 0
    : matchedPrompts.length > 0;
  const isEmpty = q.length >= 1 && !hasResults;

  return (
    <div className="global-search">
      <div className="global-search__input-wrap">
        <span className="global-search__icon">⌕</span>
        <input
          ref={inputRef}
          className="global-search__input"
          placeholder={isInsightMode ? "Search files…" : "Search prompts…"}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <button
            className="global-search__clear"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            tabIndex={-1}
          >
            ✕
          </button>
        )}
      </div>

      {open && isInsightMode && matchedFiles.length > 0 && (
        <ul className="global-search__dropdown">
          {matchedFiles.map((f) => (
            <li key={f.relativePath}>
              <button
                className="global-search__result"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelectFile(f.relativePath)}
              >
                <div className="global-search__result-header">
                  <span className="global-search__result-name">{f.name}</span>
                  <span className="global-search__result-filetype">
                    {f.fileType}
                  </span>
                </div>
                <div className="global-search__result-filepath">
                  {f.relativePath}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !isInsightMode && matchedPrompts.length > 0 && (
        <ul className="global-search__dropdown">
          {matchedPrompts.map((p) => {
            const detail = detailsMap.get(p.id);
            const content = detail ? getLatestContent(detail) : null;
            const chains = detail?.chains ?? [];
            return (
              <li key={p.id}>
                <button
                  className="global-search__result"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectPrompt(p.id)}
                >
                  <div className="global-search__result-header">
                    <span className="global-search__result-name">{p.name}</span>
                    <span
                      className={`global-search__result-env global-search__result-env--${p.environment}`}
                    >
                      {p.environment}
                    </span>
                    <span className="global-search__result-date">
                      {formatDate(p.createdAt)}
                    </span>
                  </div>
                  {content && (
                    <div className="global-search__result-preview">
                      {content.slice(0, 150)}
                      {content.length > 150 ? "…" : ""}
                    </div>
                  )}
                  {chains.length > 0 && (
                    <div className="global-search__result-chains">
                      {chains.map((c) => (
                        <span
                          key={c.id}
                          className="global-search__result-chain-tag"
                        >
                          {c.name}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {open && isEmpty && (
        <div className="global-search__empty">
          No {isInsightMode ? "files" : "prompts"} found
        </div>
      )}
    </div>
  );
}
