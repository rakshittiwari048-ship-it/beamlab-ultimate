import { create } from 'zustand';

/**
 * Selection Store - Manages selected nodes and members
 * 
 * Provides optimized selection state for highlighting and interaction:
 * - Set-based storage for O(1) lookups
 * - Multi-selection support
 * - Separate node and member selection
 * - Integration with renderers for visual feedback
 */

export interface SelectionState {
  selectedNodeIds: Set<string>;
  selectedMemberIds: Set<string>;
  hoveredNodeId: string | null;
  hoveredMemberId: string | null;

  // Node selection
  selectNode: (id: string, addToSelection?: boolean) => void;
  toggleNode: (id: string) => void;
  deselectNode: (id: string) => void;
  clearNodeSelection: () => void;
  isNodeSelected: (id: string) => boolean;

  // Member selection
  selectMember: (id: string, addToSelection?: boolean) => void;
  toggleMember: (id: string) => void;
  deselectMember: (id: string) => void;
  clearMemberSelection: () => void;
  isMemberSelected: (id: string) => boolean;

  // Hover state
  setHoveredNode: (id: string | null) => void;
  setHoveredMember: (id: string | null) => void;

  // Clear all
  clearAll: () => void;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedNodeIds: new Set(),
  selectedMemberIds: new Set(),
  hoveredNodeId: null,
  hoveredMemberId: null,

  // Node selection
  selectNode: (id: string, addToSelection = false) => {
    set((state) => {
      const newSelectedNodeIds = addToSelection
        ? new Set(state.selectedNodeIds).add(id)
        : new Set([id]);
      
      return {
        selectedNodeIds: newSelectedNodeIds,
        selectedMemberIds: addToSelection ? state.selectedMemberIds : new Set(),
      };
    });
  },

  toggleNode: (id: string) => {
    set((state) => {
      const newSelectedNodeIds = new Set(state.selectedNodeIds);
      if (newSelectedNodeIds.has(id)) {
        newSelectedNodeIds.delete(id);
      } else {
        newSelectedNodeIds.add(id);
      }
      return { selectedNodeIds: newSelectedNodeIds };
    });
  },

  deselectNode: (id: string) => {
    set((state) => {
      const newSelectedNodeIds = new Set(state.selectedNodeIds);
      newSelectedNodeIds.delete(id);
      return { selectedNodeIds: newSelectedNodeIds };
    });
  },

  clearNodeSelection: () => {
    set({ selectedNodeIds: new Set() });
  },

  isNodeSelected: (id: string) => {
    return get().selectedNodeIds.has(id);
  },

  // Member selection
  selectMember: (id: string, addToSelection = false) => {
    set((state) => {
      const newSelectedMemberIds = addToSelection
        ? new Set(state.selectedMemberIds).add(id)
        : new Set([id]);
      
      return {
        selectedMemberIds: newSelectedMemberIds,
        selectedNodeIds: addToSelection ? state.selectedNodeIds : new Set(),
      };
    });
  },

  toggleMember: (id: string) => {
    set((state) => {
      const newSelectedMemberIds = new Set(state.selectedMemberIds);
      if (newSelectedMemberIds.has(id)) {
        newSelectedMemberIds.delete(id);
      } else {
        newSelectedMemberIds.add(id);
      }
      return { selectedMemberIds: newSelectedMemberIds };
    });
  },

  deselectMember: (id: string) => {
    set((state) => {
      const newSelectedMemberIds = new Set(state.selectedMemberIds);
      newSelectedMemberIds.delete(id);
      return { selectedMemberIds: newSelectedMemberIds };
    });
  },

  clearMemberSelection: () => {
    set({ selectedMemberIds: new Set() });
  },

  isMemberSelected: (id: string) => {
    return get().selectedMemberIds.has(id);
  },

  // Hover state
  setHoveredNode: (id: string | null) => {
    set({ hoveredNodeId: id });
  },

  setHoveredMember: (id: string | null) => {
    set({ hoveredMemberId: id });
  },

  // Clear all
  clearAll: () => {
    set({
      selectedNodeIds: new Set(),
      selectedMemberIds: new Set(),
      hoveredNodeId: null,
      hoveredMemberId: null,
    });
  },
}));
