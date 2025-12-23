import { create } from 'zustand';
import type {
  StructuralModel,
  Node,
  Element,
  Material,
  Section,
  Support,
  LoadCase,
  AnalysisResult,
} from '@beamlab/types';
import { v4 as uuidv4 } from 'uuid';

export type Tool =
  | 'select'
  | 'node'
  | 'beam'
  | 'support'
  | 'load'
  | 'delete';

// Modal shape vector for a node (translations only for visualization)
export interface ModalShape {
  dx: number;
  dy: number;
  dz: number;
}

export interface EditorState {
  // Model data
  model: StructuralModel;
  
  // Selection
  selectedNodeIds: Set<string>;
  selectedElementIds: Set<string>;
  
  // UI state
  activeTool: Tool;
  isAnalyzing: boolean;
  analysisResults: AnalysisResult[];

  // Dynamics / Modal visualization
  modalFrequenciesHz: number[];               // per-mode frequencies
  modalShapesByNode: Map<string, ModalShape[]>; // nodeId -> array of mode vectors (dx,dy,dz)
  activeModeIndex: number;                    // currently visualized mode (0-based)
  vibrationAmplitude: number;                 // scale factor for visualization (units of displacement)
  isVibrating: boolean;                       // play/pause state
  
  // Actions - Model manipulation
  addNode: (position: { x: number; y: number; z: number }) => void;
  updateNode: (id: string, updates: Partial<Node>) => void;
  deleteNode: (id: string) => void;
  
  addElement: (startNodeId: string, endNodeId: string) => void;
  updateElement: (id: string, updates: Partial<Element>) => void;
  deleteElement: (id: string) => void;
  
  addSupport: (support: Support) => void;
  updateSupport: (nodeId: string, updates: Partial<Support>) => void;
  deleteSupport: (nodeId: string) => void;
  
  addLoadCase: (loadCase: LoadCase) => void;
  
  addMaterial: (material: Material) => void;
  addSection: (section: Section) => void;
  
  // Actions - Selection
  selectNode: (id: string, multiSelect?: boolean) => void;
  selectElement: (id: string, multiSelect?: boolean) => void;
  clearSelection: () => void;
  
  // Actions - UI
  setActiveTool: (tool: Tool) => void;
  setAnalyzing: (isAnalyzing: boolean) => void;
  setAnalysisResults: (results: AnalysisResult[]) => void;

  // Actions - Dynamics
  setModalResults: (frequenciesHz: number[], shapesByNode: Map<string, ModalShape[]>) => void;
  setActiveModeIndex: (modeIndex: number) => void;
  setVibrationAmplitude: (amplitude: number) => void;
  setIsVibrating: (playing: boolean) => void;
  toggleVibration: () => void;
  
  // Actions - Model
  loadModel: (model: StructuralModel) => void;
  resetModel: () => void;
}

// Default materials library
const createDefaultMaterials = (): Material[] => [
  {
    id: uuidv4(),
    name: 'Steel A36',
    elasticModulus: 200e9, // 200 GPa
    shearModulus: 79.3e9,
    poissonRatio: 0.3,
    density: 7850, // kg/m³
    yieldStrength: 250e6,
    ultimateStrength: 400e6,
  },
  {
    id: uuidv4(),
    name: 'Concrete C30',
    elasticModulus: 30e9, // 30 GPa
    shearModulus: 12.5e9,
    poissonRatio: 0.2,
    density: 2400,
    yieldStrength: 30e6,
  },
];

// Default sections library
const createDefaultSections = (): Section[] => [
  {
    id: uuidv4(),
    name: 'IPE 200',
    type: 'i-beam',
    properties: {
      area: 2.85e-3, // m²
      momentOfInertiaY: 1.94e-5, // m⁴
      momentOfInertiaZ: 1.42e-7,
      torsionalConstant: 6.98e-9,
      sectionModulusY: 1.94e-4,
      sectionModulusZ: 2.85e-5,
    },
  },
  {
    id: uuidv4(),
    name: 'Rectangular 200x300',
    type: 'rectangular',
    properties: {
      area: 0.06, // 200mm x 300mm
      momentOfInertiaY: 4.5e-4,
      momentOfInertiaZ: 2.0e-4,
      torsionalConstant: 1.35e-4,
    },
    dimensions: {
      width: 0.2,
      height: 0.3,
    },
  },
];

const createInitialModel = (): StructuralModel => ({
  id: uuidv4(),
  name: 'New Model',
  unitSystem: 'metric',
  nodes: [],
  elements: [],
  supports: [],
  materials: createDefaultMaterials(),
  sections: createDefaultSections(),
  loadCases: [],
  loadCombinations: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const useEditorStore = create<EditorState>((set, get) => ({
  // Initial state
  model: createInitialModel(),
  selectedNodeIds: new Set(),
  selectedElementIds: new Set(),
  activeTool: 'select',
  isAnalyzing: false,
  analysisResults: [],
  modalFrequenciesHz: [],
  modalShapesByNode: new Map(),
  activeModeIndex: 0,
  vibrationAmplitude: 1,
  isVibrating: false,

  // Node operations
  addNode: (position) => {
    const node: Node = {
      id: uuidv4(),
      position,
      constraints: {
        x: false,
        y: false,
        z: false,
        rx: false,
        ry: false,
        rz: false,
      },
    };
    
    set((state) => ({
      model: {
        ...state.model,
        nodes: [...state.model.nodes, node],
        updatedAt: new Date(),
      },
    }));
  },

  updateNode: (id, updates) => {
    set((state) => ({
      model: {
        ...state.model,
        nodes: state.model.nodes.map((node) =>
          node.id === id ? { ...node, ...updates } : node
        ),
        updatedAt: new Date(),
      },
    }));
  },

  deleteNode: (id) => {
    set((state) => ({
      model: {
        ...state.model,
        nodes: state.model.nodes.filter((node) => node.id !== id),
        elements: state.model.elements.filter(
          (el) => el.startNodeId !== id && el.endNodeId !== id
        ),
        supports: state.model.supports.filter((sup) => sup.nodeId !== id),
        updatedAt: new Date(),
      },
      selectedNodeIds: new Set(
        Array.from(state.selectedNodeIds).filter((nid) => nid !== id)
      ),
    }));
  },

  // Element operations
  addElement: (startNodeId, endNodeId) => {
    const { model } = get();
    const defaultMaterial = model.materials[0];
    const defaultSection = model.sections[0];

    if (!defaultMaterial || !defaultSection) {
      console.error('No default material or section available');
      return;
    }

    const element: Element = {
      id: uuidv4(),
      type: 'beam',
      startNodeId,
      endNodeId,
      materialId: defaultMaterial.id,
      sectionId: defaultSection.id,
    };

    set((state) => ({
      model: {
        ...state.model,
        elements: [...state.model.elements, element],
        updatedAt: new Date(),
      },
    }));
  },

  updateElement: (id, updates) => {
    set((state) => ({
      model: {
        ...state.model,
        elements: state.model.elements.map((element) =>
          element.id === id ? { ...element, ...updates } : element
        ),
        updatedAt: new Date(),
      },
    }));
  },

  deleteElement: (id) => {
    set((state) => ({
      model: {
        ...state.model,
        elements: state.model.elements.filter((el) => el.id !== id),
        updatedAt: new Date(),
      },
      selectedElementIds: new Set(
        Array.from(state.selectedElementIds).filter((eid) => eid !== id)
      ),
    }));
  },

  // Support operations
  addSupport: (support) => {
    set((state) => ({
      model: {
        ...state.model,
        supports: [...state.model.supports, support],
        updatedAt: new Date(),
      },
    }));
  },

  updateSupport: (nodeId, updates) => {
    set((state) => ({
      model: {
        ...state.model,
        supports: state.model.supports.map((support) =>
          support.nodeId === nodeId ? { ...support, ...updates } : support
        ),
        updatedAt: new Date(),
      },
    }));
  },

  deleteSupport: (nodeId) => {
    set((state) => ({
      model: {
        ...state.model,
        supports: state.model.supports.filter((sup) => sup.nodeId !== nodeId),
        updatedAt: new Date(),
      },
    }));
  },

  // Load case operations
  addLoadCase: (loadCase) => {
    set((state) => ({
      model: {
        ...state.model,
        loadCases: [...state.model.loadCases, loadCase],
        updatedAt: new Date(),
      },
    }));
  },

  // Material and section operations
  addMaterial: (material) => {
    set((state) => ({
      model: {
        ...state.model,
        materials: [...state.model.materials, material],
        updatedAt: new Date(),
      },
    }));
  },

  addSection: (section) => {
    set((state) => ({
      model: {
        ...state.model,
        sections: [...state.model.sections, section],
        updatedAt: new Date(),
      },
    }));
  },

  // Selection operations
  selectNode: (id, multiSelect = false) => {
    set((state) => {
      const newSelection = new Set(multiSelect ? state.selectedNodeIds : []);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      return { selectedNodeIds: newSelection };
    });
  },

  selectElement: (id, multiSelect = false) => {
    set((state) => {
      const newSelection = new Set(multiSelect ? state.selectedElementIds : []);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      return { selectedElementIds: newSelection };
    });
  },

  clearSelection: () => {
    set({
      selectedNodeIds: new Set(),
      selectedElementIds: new Set(),
    });
  },

  // UI operations
  setActiveTool: (tool) => set({ activeTool: tool }),
  setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setAnalysisResults: (results) => set({ analysisResults: results }),

  // Dynamics actions
  setModalResults: (frequenciesHz, shapesByNode) => set({
    modalFrequenciesHz: frequenciesHz,
    modalShapesByNode: shapesByNode,
  }),

  setActiveModeIndex: (modeIndex) => set((state) => ({
    activeModeIndex: Math.max(0, Math.min(modeIndex, Math.max(0, state.modalFrequenciesHz.length - 1)))
  })),

  setVibrationAmplitude: (amplitude) => set({ vibrationAmplitude: Math.max(0, amplitude) }),

  setIsVibrating: (playing) => set({ isVibrating: playing }),

  toggleVibration: () => set((state) => ({ isVibrating: !state.isVibrating })),

  // Model operations
  loadModel: (model) => {
    set({
      model,
      selectedNodeIds: new Set(),
      selectedElementIds: new Set(),
      analysisResults: [],
    });
  },

  resetModel: () => {
    set({
      model: createInitialModel(),
      selectedNodeIds: new Set(),
      selectedElementIds: new Set(),
      analysisResults: [],
    });
  },
}));
