/**
 * uiStore.ts - Specialized UI store for the "Umbrella" Workflow
 * 
 * Manages:
 * - Active category (Modeling, Properties, Loading, Analysis, Design)
 * - Context-dependent active tool
 * - Sidebar visibility state
 * 
 * Key feature: setCategory automatically clears activeTool to prevent mode conflicts
 */

import { create } from 'zustand';

export enum WorkflowCategory {
  MODELING = 'MODELING',
  PROPERTIES = 'PROPERTIES',
  LOADING = 'LOADING',
  ANALYSIS = 'ANALYSIS',
  DESIGN = 'DESIGN',
}

interface UIStore {
  // State
  activeCategory: WorkflowCategory;
  activeTool: string | null;
  sidebarOpen: boolean;
  inspectorOpen: boolean;

  // Actions
  setCategory: (category: WorkflowCategory) => void;
  setActiveTool: (tool: string | null) => void;
  toggleSidebar: () => void;
  toggleInspector: () => void;

  // Selectors (computed properties)
  isModelingMode: () => boolean;
  isPropertiesMode: () => boolean;
  isLoadingMode: () => boolean;
  isAnalysisMode: () => boolean;
  isDesignMode: () => boolean;
  isResultMode: () => boolean; // true if ANALYSIS or DESIGN
}

export const useUIStore = create<UIStore>((set, get) => ({
  // Initial state
  activeCategory: WorkflowCategory.MODELING,
  activeTool: null,
  sidebarOpen: true,
  inspectorOpen: true,

  // Actions
  setCategory: (category: WorkflowCategory) => {
    set({
      activeCategory: category,
      activeTool: null, // Clear tool when changing category
    });
  },

  setActiveTool: (tool: string | null) => {
    set({ activeTool: tool });
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  toggleInspector: () => {
    set((state) => ({ inspectorOpen: !state.inspectorOpen }));
  },

  // Selectors
  isModelingMode: () => get().activeCategory === WorkflowCategory.MODELING,
  isPropertiesMode: () => get().activeCategory === WorkflowCategory.PROPERTIES,
  isLoadingMode: () => get().activeCategory === WorkflowCategory.LOADING,
  isAnalysisMode: () => get().activeCategory === WorkflowCategory.ANALYSIS,
  isDesignMode: () => get().activeCategory === WorkflowCategory.DESIGN,
  isResultMode: () => {
    const { activeCategory } = get();
    return activeCategory === WorkflowCategory.ANALYSIS || activeCategory === WorkflowCategory.DESIGN;
  },
}));
