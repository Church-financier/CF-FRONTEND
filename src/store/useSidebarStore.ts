import { create } from 'zustand';

interface SidebarState {
  /** True while the off-canvas sidebar is visible on small screens. */
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * The dashboard layout renders the sidebar, while each page renders its own
 * header. Keeping the drawer state in a store lets the header's menu button
 * open the sidebar without threading props through the layout tree.
 */
export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));
