// @ts-nocheck
/**
 * uiStore.ts
 *
 * Umbrella State Manager for BeamLab using Zustand
 * Manages application-wide UI state with category-based organization:
 * - MODELING: Draw beams, add nodes, modify geometry
 * - PROPERTIES: Configure sections, materials, constraints
 * - LOADING: Define load cases and constraints
 * - ANALYSIS: Run analysis and view results
 * - DESIGN: Design and optimize structure
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** The Umbrellas: Five major workflow categories */
export type Category = 'MODELING' | 'PROPERTIES' | 'LOADING' | 'ANALYSIS' | 'DESIGN';

/** Available interaction/drawing tools within categories */
export type ActiveTool =
  | 'DRAW_BEAM'
  | 'DRAW_NODE'
  | 'ADD_WIND'
  | 'ADD_LOAD'
  | 'ADD_SUPPORT'
  | null;

/** Sidebar collapse/expand state */
export type SidebarMode = 'EXPANDED' | 'COLLAPSED';

// ============================================================================
// STATE INTERFACE
// ============================================================================

/** Member properties for structural elements */
export interface MemberProperties {
  sectionDatabase: 'EU' | 'US' | 'UK';
  sectionSize: string;
  area: number;       // mm²
  Iy: number;         // mm⁴ (Major axis moment of inertia)
  Iz: number;         // mm⁴ (Minor axis moment of inertia)
  material: string;
  E: number;          // MPa (Young's modulus)
  Fy: number;         // MPa (Yield strength)
}

/** Member data structure */
export interface Member {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  properties: MemberProperties;
}

export interface UIState {
  // ─────────────────────────────────────────────────────────────────────────
  // State Properties
  // ─────────────────────────────────────────────────────────────────────────

  /** Currently active category (umbrella) */
  activeCategory: Category;

  /** Sidebar visibility mode */
  sidebarMode: SidebarMode;

  /** Currently active tool (null when no tool is active) */
  activeTool: ActiveTool;

  /** Whether analysis results are available */
  hasAnalysisResults: boolean;

  /** Validation status: are nodes connected? */
  isGeometryValid: boolean;

  /** Currently selected member ID for property editing */
  selectedMemberId: string | null;

  /** All members in the structure */
  members: Member[];

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Switch to a different category.
   *
   * Implements "One-by-One" logic:
   * - Leaving MODELING: automatically set activeTool to null
   * - Entering ANALYSIS: trigger validation check
   * - Entering DESIGN: ensure analysis results exist; alert user if not
   */
  setCategory: (category: Category) => void;

  /**
   * Set the active tool (or null to deactivate).
   */
  setActiveTool: (tool: ActiveTool) => void;

  /**
   * Toggle sidebar between EXPANDED and COLLAPSED.
   */
  toggleSidebar: () => void;

  /**
   * Explicitly set sidebar mode.
   */
  setSidebarMode: (mode: SidebarMode) => void;

  /**
   * Update validation status (are nodes connected?).
   */
  setGeometryValid: (valid: boolean) => void;

  /**
   * Update whether analysis results are available.
   */
  setHasAnalysisResults: (has: boolean) => void;

  /**
   * Reset UI state to defaults.
   */
  resetUI: () => void;

  /**
   * Select a member for property editing.
   */
  setSelectedMember: (memberId: string | null) => void;

  /**
   * Add a new member to the structure.
   */
  addMember: (member: { start: [number, number, number]; end: [number, number, number] }) => void;

  /**
   * Update member properties (live update for PropertyInspector).
   */
  updateMember: (memberId: string, properties: Partial<MemberProperties>) => void;

  /**
   * Delete a member from the structure.
   */
  deleteMember: (memberId: string) => void;

  /**
   * Get currently selected member.
   */
  getSelectedMember: () => Member | null;
}

// ============================================================================
// DEFAULT STATE
// ============================================================================

const DEFAULT_STATE = {
  activeCategory: 'MODELING' as Category,
  sidebarMode: 'EXPANDED' as SidebarMode,
  activeTool: null as ActiveTool,
  hasAnalysisResults: false,
  isGeometryValid: false,
};

// ============================================================================
// STORE CREATION
// ============================================================================

export const useUIStore = create<UIState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial State
      ...DEFAULT_STATE,

      // ─────────────────────────────────────────────────────────────────────
      // Actions
      // ─────────────────────────────────────────────────────────────────────

      /**
       * setCategory: The core "One-by-One" logic
       *
       * Umbrella switching with automated side effects:
       * 1. Leaving MODELING → set activeTool to null (stop drawing)
       * 2. Entering ANALYSIS → validate geometry (are nodes connected?)
       * 3. Entering DESIGN → check analysis results; alert if missing
       */
      setCategory: (category: Category) => {
        const state = get();
        const previousCategory = state.activeCategory;

        // ───────────────────────────────────────────────────────────────
        // LEAVING MODELING: Stop active drawing/interaction tools
        // ───────────────────────────────────────────────────────────────
        let nextActiveTool: ActiveTool = state.activeTool;
        if (previousCategory === 'MODELING' && category !== 'MODELING') {
          nextActiveTool = null;
        }

        // ───────────────────────────────────────────────────────────────
        // ENTERING ANALYSIS: Validate geometry (check node connectivity)
        // ───────────────────────────────────────────────────────────────
        let nextGeometryValid = state.isGeometryValid;
        if (category === 'ANALYSIS' && previousCategory !== 'ANALYSIS') {
          // Trigger validation: check if nodes are connected
          // In a real app, call a validation service/function here
          console.log('[ANALYSIS] Validating geometry...');
          // For now, we'll keep the current validation state
          // In production, you'd call: nextGeometryValid = validateNodeConnectivity();
        }

        // ───────────────────────────────────────────────────────────────
        // ENTERING DESIGN: Ensure analysis results exist
        // ───────────────────────────────────────────────────────────────
        if (category === 'DESIGN' && previousCategory !== 'DESIGN') {
          if (!state.hasAnalysisResults) {
            // Alert user and prevent switching (or allow with warning)
            console.warn('[DESIGN] Analysis results missing!');
            alert('Please Run Analysis First');
            // Optionally, prevent the switch:
            // return;
          }
        }

        // Apply the state update with the computed values
        set(
          {
            activeCategory: category,
            activeTool: nextActiveTool,
            isGeometryValid: nextGeometryValid,
          },
          false,
          `setCategory/${category}`
        );
      },

      setActiveTool: (tool: ActiveTool) => {
        set({ activeTool: tool }, false, `setActiveTool/${tool}`);
      },

      toggleSidebar: () => {
        const state = get();
        const newMode: SidebarMode =
          state.sidebarMode === 'EXPANDED' ? 'COLLAPSED' : 'EXPANDED';
        set({ sidebarMode: newMode }, false, `toggleSidebar/${newMode}`);
      },

      setSidebarMode: (mode: SidebarMode) => {
        set({ sidebarMode: mode }, false, `setSidebarMode/${mode}`);
      },

      setGeometryValid: (valid: boolean) => {
        set({ isGeometryValid: valid }, false, `setGeometryValid/${valid}`);
      },

      setHasAnalysisResults: (has: boolean) => {
        set({ hasAnalysisResults: has }, false, `setHasAnalysisResults/${has}`);
      },

      resetUI: () => {
        set(DEFAULT_STATE, false, 'resetUI');
      },

      // ─────────────────────────────────────────────────────────────────────
      // Member Management Actions
      // ─────────────────────────────────────────────────────────────────────

      selectedMemberId: null,
      members: [],

      setSelectedMember: (memberId: string | null) => {
        set({ selectedMemberId: memberId }, false, `setSelectedMember/${memberId}`);
      },

      addMember: (member: { start: [number, number, number]; end: [number, number, number] }) => {
        const state = get();
        const id = `member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Default properties for new members
        const defaultProperties: MemberProperties = {
          sectionDatabase: 'EU',
          sectionSize: 'IPE 200',
          area: 2850,         // mm² for IPE 200
          Iy: 19430000,       // mm⁴
          Iz: 1420000,        // mm⁴
          material: 'Steel S275',
          E: 210000,          // MPa
          Fy: 275,            // MPa
        };

        const newMember: Member = {
          id,
          start: member.start,
          end: member.end,
          properties: defaultProperties,
        };

        set(
          { members: [...state.members, newMember], selectedMemberId: id },
          false,
          `addMember/${id}`
        );
      },

      updateMember: (memberId: string, properties: Partial<MemberProperties>) => {
        const state = get();
        const updatedMembers = state.members.map((m) =>
          m.id === memberId
            ? { ...m, properties: { ...m.properties, ...properties } }
            : m
        );
        set({ members: updatedMembers }, false, `updateMember/${memberId}`);
      },

      deleteMember: (memberId: string) => {
        const state = get();
        const updatedMembers = state.members.filter((m) => m.id !== memberId);
        const nextSelectedId = state.selectedMemberId === memberId ? null : state.selectedMemberId;
        set(
          { members: updatedMembers, selectedMemberId: nextSelectedId },
          false,
          `deleteMember/${memberId}`
        );
      },

      getSelectedMember: () => {
        const state = get();
        if (!state.selectedMemberId) return null;
        return state.members.find((m) => m.id === state.selectedMemberId) || null;
      },
    })),
    {
      name: 'ui-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// ============================================================================
// SELECTORS (for optimized re-renders)
// ============================================================================

/** Select the active category */
export const selectActiveCategory = (state: UIState) => state.activeCategory;

/** Select the active tool */
export const selectActiveTool = (state: UIState) => state.activeTool;

/** Select the sidebar mode */
export const selectSidebarMode = (state: UIState) => state.sidebarMode;

/** Select validation/analysis status */
export const selectAnalysisStatus = (state: UIState) => ({
  isGeometryValid: state.isGeometryValid,
  hasAnalysisResults: state.hasAnalysisResults,
});

/** Check if a specific category is active */
export const selectIsCategoryActive = (category: Category) => (state: UIState) =>
  state.activeCategory === category;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get available tools for a given category.
 * Drives what buttons appear in the ribbon/toolbar.
 */
export const getToolsForCategory = (category: Category): ActiveTool[] => {
  switch (category) {
    case 'MODELING':
      return ['DRAW_BEAM', 'DRAW_NODE', 'ADD_SUPPORT'];
    case 'PROPERTIES':
      return [];
    case 'LOADING':
      return ['ADD_LOAD', 'ADD_WIND'];
    case 'ANALYSIS':
      return [];
    case 'DESIGN':
      return [];
    default:
      return [];
  }
};

/**
 * Get the primary action button label for the ribbon based on active category.
 */
export const getPrimaryActionForCategory = (
  category: Category
): { label: string; action: string } => {
  switch (category) {
    case 'MODELING':
      return { label: 'Draw Beam', action: 'DRAW_BEAM' };
    case 'PROPERTIES':
      return { label: 'Configure', action: 'CONFIGURE' };
    case 'LOADING':
      return { label: 'Add Load', action: 'ADD_LOAD' };
    case 'ANALYSIS':
      return { label: 'Run Analysis', action: 'RUN_ANALYSIS' };
    case 'DESIGN':
      return { label: 'Run Design', action: 'RUN_DESIGN' };
    default:
      return { label: 'Select', action: 'SELECT' };
  }
};

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

// Example 1: Category Navigation in Ribbon
// 
// function Ribbon() {
//   const activeCategory = useUIStore(selectActiveCategory);
//   const setCategory = useUIStore((state) => state.setCategory);
//
//   return (
//     <div>
//       <button onClick={() => setCategory('MODELING')}>MODELING</button>
//       <button onClick={() => setCategory('PROPERTIES')}>PROPERTIES</button>
//       <button onClick={() => setCategory('LOADING')}>LOADING</button>
//       <button onClick={() => setCategory('ANALYSIS')}>ANALYSIS</button>
//       <button onClick={() => setCategory('DESIGN')}>DESIGN</button>
//     </div>
//   );
// }

// Example 2: Tool Activation in MODELING
//
// function ModelingToolbar() {
//   const activeCategory = useUIStore(selectActiveCategory);
//   const activeTool = useUIStore(selectActiveTool);
//   const setActiveTool = useUIStore((state) => state.setActiveTool);
//
//   if (activeCategory !== 'MODELING') return null;
//
//   return (
//     <button onClick={() => setActiveTool('DRAW_BEAM')}>
//       {activeTool === 'DRAW_BEAM' ? '[ACTIVE]' : ''} Draw Beam
//     </button>
//   );
// }

// Example 3: Validation Check in ANALYSIS
//
// function AnalysisPanel() {
//   const { isGeometryValid } = useUIStore(selectAnalysisStatus);
//
//   if (!isGeometryValid) {
//     return <div>⚠️ Please check node connectivity</div>;
//   }
//   return <button>Run Analysis</button>;
// }

// Example 4: Design Guard in DESIGN
//
// function DesignPanel() {
//   const { hasAnalysisResults } = useUIStore(selectAnalysisStatus);
//
//   if (!hasAnalysisResults) {
//     return <div>❌ Please Run Analysis First</div>;
//   }
//   return <button>Run Design</button>;
// }

// Example 5: Sidebar Toggle
//
// function SidebarToggle() {
//   const toggleSidebar = useUIStore((state) => state.toggleSidebar);
//   const sidebarMode = useUIStore(selectSidebarMode);
//
//   return (
//     <button onClick={toggleSidebar}>
//       {sidebarMode === 'EXPANDED' ? 'Collapse' : 'Expand'}
//     </button>
//   );
// }

