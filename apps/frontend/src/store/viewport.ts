import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ============================================================================
// TYPES
// ============================================================================

export type ViewportLayout = 'SINGLE' | 'QUAD';

export type ViewportType = '3D' | 'TOP' | 'FRONT' | 'RIGHT';

export interface ViewportConfig {
  type: ViewportType;
  label: string;
  enabled: boolean;
  camera: {
    type: 'perspective' | 'orthographic';
    position: [number, number, number];
    rotation?: [number, number, number];
    zoom: number;
  };
  controls: {
    enableRotate: boolean;
    enablePan: boolean;
    enableZoom: boolean;
  };
}

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface ViewportState {
  // Layout
  layout: ViewportLayout;
  activeViewport: ViewportType;
  
  // Viewport configurations
  viewports: Record<ViewportType, ViewportConfig>;
  
  // Display options
  showGrid: boolean;
  showAxis: boolean;
  showLabels: boolean;
  
  // Synchronization
  syncRotation: boolean;
  syncZoom: boolean;
}

// ============================================================================
// ACTIONS INTERFACE
// ============================================================================

interface ViewportActions {
  // Layout management
  setLayout: (layout: ViewportLayout) => void;
  setActiveViewport: (viewport: ViewportType) => void;
  
  // Viewport configuration
  updateViewport: (type: ViewportType, config: Partial<ViewportConfig>) => void;
  resetViewport: (type: ViewportType) => void;
  resetAllViewports: () => void;
  
  // Display toggles
  toggleGrid: () => void;
  toggleAxis: () => void;
  toggleLabels: () => void;
  
  // Synchronization
  toggleSyncRotation: () => void;
  toggleSyncZoom: () => void;
}

// ============================================================================
// DEFAULT VIEWPORT CONFIGURATIONS
// ============================================================================

const defaultViewports: Record<ViewportType, ViewportConfig> = {
  '3D': {
    type: '3D',
    label: '3D Perspective',
    enabled: true,
    camera: {
      type: 'perspective',
      position: [10, 10, 10],
      zoom: 1,
    },
    controls: {
      enableRotate: true,
      enablePan: true,
      enableZoom: true,
    },
  },
  'TOP': {
    type: 'TOP',
    label: 'Top View',
    enabled: true,
    camera: {
      type: 'orthographic',
      position: [0, 20, 0],
      rotation: [-Math.PI / 2, 0, 0],
      zoom: 1,
    },
    controls: {
      enableRotate: false,
      enablePan: true,
      enableZoom: true,
    },
  },
  'FRONT': {
    type: 'FRONT',
    label: 'Front View',
    enabled: true,
    camera: {
      type: 'orthographic',
      position: [0, 0, 20],
      rotation: [0, 0, 0],
      zoom: 1,
    },
    controls: {
      enableRotate: false,
      enablePan: true,
      enableZoom: true,
    },
  },
  'RIGHT': {
    type: 'RIGHT',
    label: 'Right View',
    enabled: true,
    camera: {
      type: 'orthographic',
      position: [20, 0, 0],
      rotation: [0, Math.PI / 2, 0],
      zoom: 1,
    },
    controls: {
      enableRotate: false,
      enablePan: true,
      enableZoom: true,
    },
  },
};

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: ViewportState = {
  layout: 'SINGLE',
  activeViewport: '3D',
  viewports: defaultViewports,
  showGrid: true,
  showAxis: true,
  showLabels: true,
  syncRotation: false,
  syncZoom: false,
};

// ============================================================================
// STORE CREATION
// ============================================================================

export const useViewportStore = create<ViewportState & ViewportActions>()(
  devtools(
    (set) => ({
      ...initialState,

      // Layout management
      setLayout: (layout) => {
        set({ layout });
      },

      setActiveViewport: (viewport) => {
        set({ activeViewport: viewport });
      },

      // Viewport configuration
      updateViewport: (type, config) => {
        set((state) => ({
          viewports: {
            ...state.viewports,
            [type]: {
              ...state.viewports[type],
              ...config,
            },
          },
        }));
      },

      resetViewport: (type) => {
        set((state) => ({
          viewports: {
            ...state.viewports,
            [type]: defaultViewports[type],
          },
        }));
      },

      resetAllViewports: () => {
        set({ viewports: defaultViewports });
      },

      // Display toggles
      toggleGrid: () => {
        set((state) => ({ showGrid: !state.showGrid }));
      },

      toggleAxis: () => {
        set((state) => ({ showAxis: !state.showAxis }));
      },

      toggleLabels: () => {
        set((state) => ({ showLabels: !state.showLabels }));
      },

      // Synchronization
      toggleSyncRotation: () => {
        set((state) => ({ syncRotation: !state.syncRotation }));
      },

      toggleSyncZoom: () => {
        set((state) => ({ syncZoom: !state.syncZoom }));
      },
    }),
    { name: 'ViewportStore' }
  )
);

// ============================================================================
// SELECTORS
// ============================================================================

export const selectLayout = (state: ViewportState & ViewportActions) => state.layout;
export const selectActiveViewport = (state: ViewportState & ViewportActions) => state.activeViewport;
export const selectViewport = (type: ViewportType) => (state: ViewportState & ViewportActions) =>
  state.viewports[type];
export const selectShowGrid = (state: ViewportState & ViewportActions) => state.showGrid;
export const selectShowAxis = (state: ViewportState & ViewportActions) => state.showAxis;
