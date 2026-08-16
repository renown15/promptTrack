import "@/components/features/collections/DirectorySelector.css";
import { useState } from "react";

interface DirectoryNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: DirectoryNode[];
}

type Props = {
  directoryStructure: DirectoryNode;
  selectedDirectories: string[];
  onSelect: (directories: string[]) => void;
  onClose: () => void;
};

function DirectoryTree({
  node,
  selectedDirectories,
  onToggle,
}: {
  node: DirectoryNode;
  selectedDirectories: string[];
  onToggle: (path: string) => void;
}) {
  const isSelected = selectedDirectories.includes(node.path);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="directory-tree">
      <div className="directory-tree__item">
        <label className="directory-tree__label">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggle(node.path)}
            className="directory-tree__checkbox"
          />
          <span className="directory-tree__name">{node.name}</span>
        </label>
      </div>
      {hasChildren && isSelected && (
        <div className="directory-tree__children">
          {node.children?.map((child) => (
            <DirectoryTree
              key={child.path}
              node={child}
              selectedDirectories={selectedDirectories}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function DirectorySelector({
  directoryStructure,
  selectedDirectories,
  onSelect,
  onClose,
}: Props) {
  const [selected, setSelected] = useState<string[]>(selectedDirectories);

  const handleToggle = (path: string) => {
    setSelected((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const handleSave = () => {
    onSelect(selected.length === 0 ? ["."] : selected);
    onClose();
  };

  const handleSelectAll = () => {
    if (selected.length > 0) {
      setSelected([]);
    } else {
      const getAllPaths = (node: DirectoryNode): string[] => {
        const paths = [node.path];
        if (node.children) {
          node.children.forEach((child) => {
            paths.push(...getAllPaths(child));
          });
        }
        return paths;
      };
      setSelected(getAllPaths(directoryStructure).filter((p) => p !== "."));
    }
  };

  return (
    <div className="directory-selector-overlay" onClick={onClose}>
      <div className="directory-selector" onClick={(e) => e.stopPropagation()}>
        <div className="directory-selector__header">
          <h2 className="directory-selector__title">
            Select In-Scope Directories
          </h2>
          <button
            className="directory-selector__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="directory-selector__body">
          <div className="directory-selector__controls">
            <button
              className="directory-selector__select-all"
              onClick={handleSelectAll}
            >
              {selected.length > 0 ? "Clear All" : "Select All"}
            </button>
          </div>

          <div className="directory-selector__tree">
            <DirectoryTree
              node={directoryStructure}
              selectedDirectories={selected}
              onToggle={handleToggle}
            />
          </div>
        </div>

        <div className="directory-selector__footer">
          <button className="directory-selector__cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="directory-selector__save" onClick={handleSave}>
            Save Selection
          </button>
        </div>
      </div>
    </div>
  );
}
