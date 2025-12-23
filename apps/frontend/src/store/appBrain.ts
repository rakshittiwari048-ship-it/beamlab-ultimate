import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { 
  Project, 
  StructuralModel, 
  AnalysisResult,
  Node as StructuralNode,
  Element,
  LoadCase,
  Support
} from '@beamlab/types';
import { StructuralAnalyzer } from '@beamlab/analysis-engine';

// Core Application State
interface ApplicationState {
  // Project Management
  currentProject: Project | null;
  projects: Project[];
  
  // Model State
  model: StructuralModel | null;
  selectedNodes: string[];
  selectedElements: string[];
  
  // Analysis State
  analysisResults: AnalysisResult[];
  isAnalyzing: boolean;
  analysisError: string | null;
  
  // UI State
  viewMode: '3D' | '2D' | 'TABLE';
  editMode: 'SELECT' | 'NODE' | 'ELEMENT' | 'LOAD' | 'SUPPORT';
  showGrid: boolean;
  showAxis: boolean;
  
  // History for Undo/Redo
  history: StructuralModel[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
}

// Core Application Actions
interface ApplicationActions {
  // Project Actions
  setCurrentProject: (project: Project | null) => void;
  createProject: (name: string, description?: string) => void;
  updateProject: (updates: Partial<Project>) => void;
  loadProject: (projectId: string) => Promise<void>;
  saveProject: () => Promise<void>;
  
  // Model Building Actions
  addNode: (node: Omit<StructuralNode, 'id'>) => void;
  updateNode: (nodeId: string, updates: Partial<StructuralNode>) => void;
  deleteNode: (nodeId: string) => void;
  
  addElement: (element: Omit<Element, 'id'>) => void;
  updateElement: (elementId: string, updates: Partial<Element>) => void;
  deleteElement: (elementId: string) => void;
  
  addLoadCase: (loadCase: Omit<LoadCase, 'id'>) => void;
  updateLoadCase: (loadCaseId: string, updates: Partial<LoadCase>) => void;
  deleteLoadCase: (loadCaseId: string) => void;
  
  addSupport: (support: Support) => void;
  updateSupport: (nodeId: string, updates: Partial<Support>) => void;
  deleteSupport: (nodeId: string) => void;
  
  // Selection Actions
  selectNode: (nodeId: string, multiSelect?: boolean) => void;
  selectElement: (elementId: string, multiSelect?: boolean) => void;
  clearSelection: () => void;
  
  // Analysis Actions
  runAnalysis: (loadCaseIds?: string[]) => Promise<void>;
  clearAnalysisResults: () => void;
  
  // History Actions
  undo: () => void;
  redo: () => void;
  addToHistory: () => void;
  
  // UI Actions
  setViewMode: (mode: '3D' | '2D' | 'TABLE') => void;
  setEditMode: (mode: 'SELECT' | 'NODE' | 'ELEMENT' | 'LOAD' | 'SUPPORT') => void;
  toggleGrid: () => void;
  toggleAxis: () => void;
  
  // Utility Actions
  reset: () => void;
  importModel: (model: StructuralModel) => void;
  exportModel: () => StructuralModel | null;
}

// Initial State
const initialState: ApplicationState = {
  currentProject: null,
  projects: [],
  model: null,
  selectedNodes: [],
  selectedElements: [],
  analysisResults: [],
  isAnalyzing: false,
  analysisError: null,
  viewMode: '3D',
  editMode: 'SELECT',
  showGrid: true,
  showAxis: true,
  history: [],
  historyIndex: -1,
  canUndo: false,
  canRedo: false,
};

// The Brain - Central Application Store
export const useAppBrain = create<ApplicationState & ApplicationActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Project Management
        setCurrentProject: (project) => {
          set({ currentProject: project, model: project?.model || null });
        },

        createProject: (name, description) => {
          const newProject: Project = {
            id: crypto.randomUUID(),
            name,
            description,
            model: {
              id: crypto.randomUUID(),
              name: `${name} - Model`,
              unitSystem: 'metric',
              nodes: [],
              elements: [],
              materials: [],
              sections: [],
              loadCases: [],
              supports: [],
              loadCombinations: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          set({ currentProject: newProject, model: newProject.model });
        },

        updateProject: (updates) => {
          const current = get().currentProject;
          if (!current) return;
          
          const updated = { 
            ...current, 
            ...updates, 
            updatedAt: new Date() 
          };
          set({ currentProject: updated });
        },

        loadProject: async (projectId) => {
          try {
            const response = await fetch(`/api/projects/${projectId}`);
            if (!response.ok) throw new Error('Failed to load project');
            const project = await response.json();
            set({ currentProject: project, model: project.model });
          } catch (error) {
            console.error('Error loading project:', error);
          }
        },

        saveProject: async () => {
          const { currentProject, model } = get();
          if (!currentProject || !model) return;

          try {
            const updated = { ...currentProject, model, updatedAt: new Date() };
            const response = await fetch(`/api/projects/${currentProject.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updated),
            });
            if (!response.ok) throw new Error('Failed to save project');
            set({ currentProject: updated });
          } catch (error) {
            console.error('Error saving project:', error);
          }
        },

        // Node Management
        addNode: (nodeData) => {
          const model = get().model;
          if (!model) return;

          const newNode: StructuralNode = {
            id: crypto.randomUUID(),
            ...nodeData,
          };

          set({
            model: {
              ...model,
              nodes: [...model.nodes, newNode],
              updatedAt: new Date(),
            },
          });
          get().addToHistory();
        },

        updateNode: (nodeId, updates) => {
          const model = get().model;
          if (!model) return;

          set({
            model: {
              ...model,
              nodes: model.nodes.map(node =>
                node.id === nodeId ? { ...node, ...updates } : node
              ),
              updatedAt: new Date(),
            },
          });
          get().addToHistory();
        },

        deleteNode: (nodeId) => {
          const model = get().model;
          if (!model) return;

          // Remove node and any elements connected to it
          set({
            model: {
              ...model,
              nodes: model.nodes.filter(n => n.id !== nodeId),
              elements: model.elements.filter(
                e => e.startNodeId !== nodeId && e.endNodeId !== nodeId
              ),
              supports: model.supports.filter(s => s.nodeId !== nodeId),
              updatedAt: new Date(),
            },
            selectedNodes: get().selectedNodes.filter(id => id !== nodeId),
          });
          get().addToHistory();
        },

        // Element Management
        addElement: (elementData) => {
          const model = get().model;
          if (!model) return;

          const newElement: Element = {
            id: crypto.randomUUID(),
            ...elementData,
          };

          set({
            model: {
              ...model,
              elements: [...model.elements, newElement],
              updatedAt: new Date(),
            },
          });
          get().addToHistory();
        },

        updateElement: (elementId, updates) => {
          const model = get().model;
          if (!model) return;

          set({
            model: {
              ...model,
              elements: model.elements.map(element =>
                element.id === elementId ? { ...element, ...updates } : element
              ),
              updatedAt: new Date(),
            },
          });
          get().addToHistory();
        },

        deleteElement: (elementId) => {
          const model = get().model;
          if (!model) return;

          set({
            model: {
              ...model,
              elements: model.elements.filter(e => e.id !== elementId),
              updatedAt: new Date(),
            },
            selectedElements: get().selectedElements.filter(id => id !== elementId),
          });
          get().addToHistory();
        },

        // Load Case Management
        addLoadCase: (loadCaseData) => {
          const model = get().model;
          if (!model) return;

          const newLoadCase: LoadCase = {
            id: crypto.randomUUID(),
            ...loadCaseData,
          };

          set({
            model: {
              ...model,
              loadCases: [...model.loadCases, newLoadCase],
              updatedAt: new Date(),
            },
          });
        },

        updateLoadCase: (loadCaseId, updates) => {
          const model = get().model;
          if (!model) return;

          set({
            model: {
              ...model,
              loadCases: model.loadCases.map(lc =>
                lc.id === loadCaseId ? { ...lc, ...updates } : lc
              ),
              updatedAt: new Date(),
            },
          });
        },

        deleteLoadCase: (loadCaseId) => {
          const model = get().model;
          if (!model) return;

          set({
            model: {
              ...model,
              loadCases: model.loadCases.filter(lc => lc.id !== loadCaseId),
              updatedAt: new Date(),
            },
          });
        },

        // Support Management
        addSupport: (support) => {
          const model = get().model;
          if (!model) return;

          set({
            model: {
              ...model,
              supports: [...model.supports, support],
              updatedAt: new Date(),
            },
          });
          get().addToHistory();
        },

        updateSupport: (nodeId, updates) => {
          const model = get().model;
          if (!model) return;

          set({
            model: {
              ...model,
              supports: model.supports.map(s =>
                s.nodeId === nodeId
                  ? { ...s, ...updates }
                  : s
              ),
              updatedAt: new Date(),
            },
          });
          get().addToHistory();
        },

        deleteSupport: (nodeId) => {
          const model = get().model;
          if (!model) return;

          set({
            model: {
              ...model,
              supports: model.supports.filter(s => s.nodeId !== nodeId),
              updatedAt: new Date(),
            },
          });
          get().addToHistory();
        },

        // Selection Management
        selectNode: (nodeId, multiSelect = false) => {
          set({
            selectedNodes: multiSelect
              ? [...get().selectedNodes, nodeId]
              : [nodeId],
          });
        },

        selectElement: (elementId, multiSelect = false) => {
          set({
            selectedElements: multiSelect
              ? [...get().selectedElements, elementId]
              : [elementId],
          });
        },

        clearSelection: () => {
          set({ selectedNodes: [], selectedElements: [] });
        },

        // Analysis
        runAnalysis: async (loadCaseIds) => {
          const { model } = get();
          if (!model) return;

          set({ isAnalyzing: true, analysisError: null });

          try {
            const analyzer = new StructuralAnalyzer(model);
            const casesToAnalyze = loadCaseIds || model.loadCases.map(lc => lc.id);
            const results: AnalysisResult[] = [];

            for (const loadCaseId of casesToAnalyze) {
              const result = analyzer.solve(loadCaseId);
              results.push(result);
            }

            set({ analysisResults: results, isAnalyzing: false });
          } catch (error) {
            set({
              analysisError: error instanceof Error ? error.message : 'Analysis failed',
              isAnalyzing: false,
            });
          }
        },

        clearAnalysisResults: () => {
          set({ analysisResults: [], analysisError: null });
        },

        // History Management
        addToHistory: () => {
          const { model, history, historyIndex } = get();
          if (!model) return;

          const newHistory = history.slice(0, historyIndex + 1);
          newHistory.push(JSON.parse(JSON.stringify(model)));

          set({
            history: newHistory,
            historyIndex: newHistory.length - 1,
            canUndo: true,
            canRedo: false,
          });
        },

        undo: () => {
          const { history, historyIndex } = get();
          if (historyIndex <= 0) return;

          const newIndex = historyIndex - 1;
          set({
            model: JSON.parse(JSON.stringify(history[newIndex])),
            historyIndex: newIndex,
            canUndo: newIndex > 0,
            canRedo: true,
          });
        },

        redo: () => {
          const { history, historyIndex } = get();
          if (historyIndex >= history.length - 1) return;

          const newIndex = historyIndex + 1;
          set({
            model: JSON.parse(JSON.stringify(history[newIndex])),
            historyIndex: newIndex,
            canUndo: true,
            canRedo: newIndex < history.length - 1,
          });
        },

        // UI State
        setViewMode: (mode) => set({ viewMode: mode }),
        setEditMode: (mode) => set({ editMode: mode }),
        toggleGrid: () => set({ showGrid: !get().showGrid }),
        toggleAxis: () => set({ showAxis: !get().showAxis }),

        // Utility
        reset: () => set(initialState),
        
        importModel: (model) => {
          set({ model, history: [model], historyIndex: 0 });
        },

        exportModel: () => get().model,
      }),
      {
        name: 'beamlab-storage',
        partialize: (state) => ({
          currentProject: state.currentProject,
          viewMode: state.viewMode,
          showGrid: state.showGrid,
          showAxis: state.showAxis,
        }),
      }
    )
  )
);

// Selectors for optimized access
export const selectModel = (state: ApplicationState & ApplicationActions) => state.model;
export const selectCurrentProject = (state: ApplicationState & ApplicationActions) => state.currentProject;
export const selectSelectedNodes = (state: ApplicationState & ApplicationActions) => state.selectedNodes;
export const selectSelectedElements = (state: ApplicationState & ApplicationActions) => state.selectedElements;
export const selectAnalysisResults = (state: ApplicationState & ApplicationActions) => state.analysisResults;
export const selectIsAnalyzing = (state: ApplicationState & ApplicationActions) => state.isAnalyzing;
export const selectEditMode = (state: ApplicationState & ApplicationActions) => state.editMode;
