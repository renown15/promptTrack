import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fsApi } from "@/api/endpoints/fs";
import "@/components/features/collections/DirPicker.css";

type Props = {
  onSelect: (path: string) => void;
  onClose: () => void;
};

export function DirPicker({ onSelect, onClose }: Props) {
  const [currentPath, setCurrentPath] = useState<string | undefined>(undefined);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["fs", currentPath],
    queryFn: () => fsApi.browse(currentPath),
  });

  function handleSelect() {
    if (data) onSelect(data.path);
  }

  return (
    <div className="dir-picker__overlay" onClick={onClose}>
      <div
        className="dir-picker"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Pick directory"
      >
        <div className="dir-picker__header">
          <span className="dir-picker__title">Select directory</span>
          <button
            className="dir-picker__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="dir-picker__path">{data?.path ?? "Loading…"}</div>

        <div className="dir-picker__list">
          {isLoading && <div className="dir-picker__loading">Loading…</div>}
          {isError && (
            <div className="dir-picker__error">Could not read directory</div>
          )}

          {data?.parent !== null && data?.parent !== undefined && (
            <button
              className="dir-picker__entry dir-picker__entry--up"
              onClick={() => setCurrentPath(data.parent ?? undefined)}
            >
              <span className="dir-picker__entry-icon">↑</span>
              <span className="dir-picker__entry-name">..</span>
            </button>
          )}

          {data?.entries.map((entry) => (
            <button
              key={entry.path}
              className="dir-picker__entry"
              onClick={() => setCurrentPath(entry.path)}
            >
              <span className="dir-picker__entry-icon">📁</span>
              <span className="dir-picker__entry-name">{entry.name}</span>
            </button>
          ))}

          {data && data.entries.length === 0 && data.parent !== null && (
            <div className="dir-picker__empty">No subdirectories</div>
          )}
        </div>

        <div className="dir-picker__footer">
          <button className="dir-picker__cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="dir-picker__select"
            onClick={handleSelect}
            disabled={!data}
          >
            Select this folder
          </button>
        </div>
      </div>
    </div>
  );
}
