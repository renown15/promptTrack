import { create } from "zustand";
import { persist } from "zustand/middleware";

type SidebarState = {
  collapsedProjects: Set<string>;
  collapsedChains: Set<string>;
  toggleProject: (id: string) => void;
  toggleChain: (id: string) => void;
  isProjectCollapsed: (id: string) => boolean;
  isChainCollapsed: (id: string) => boolean;
};

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      collapsedProjects: new Set<string>(),
      collapsedChains: new Set<string>(),
      toggleProject: (id) => {
        set((state) => {
          const next = new Set(state.collapsedProjects);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return { collapsedProjects: next };
        });
      },
      toggleChain: (id) => {
        set((state) => {
          const next = new Set(state.collapsedChains);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return { collapsedChains: next };
        });
      },
      isProjectCollapsed: (id) => get().collapsedProjects.has(id),
      isChainCollapsed: (id) => get().collapsedChains.has(id),
    }),
    {
      name: "sidebar-storage",
      partialize: (state) => ({
        collapsedProjects: [...state.collapsedProjects],
        collapsedChains: [...state.collapsedChains],
      }),
      merge: (persisted, current) => {
        const p = persisted as {
          collapsedProjects?: string[];
          collapsedChains?: string[];
        };
        return {
          ...current,
          collapsedProjects: new Set<string>(p.collapsedProjects ?? []),
          collapsedChains: new Set<string>(p.collapsedChains ?? []),
        };
      },
    }
  )
);
