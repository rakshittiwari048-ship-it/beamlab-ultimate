import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { temporal } from 'zundo';
import { Solver, type SolverResult, type NodalLoad, type SolverSupport, type SolverMember } from '../../../../packages/analysis-engine/src/Solver';
import { MatrixUtils } from '../../../../packages/analysis-engine/src/MatrixUtils';
import { calculateMemberFyMz, type MemberForcesOutput } from '../../../../packages/analysis-engine/src/MemberForcesCalculator';
import { checkMember, type DesignCheckResult, type MemberForces as SteelMemberForces } from '../../../../packages/analysis-engine/src/SteelDesignEngine';
import type { Material as DesignMaterial, Section as DesignSection } from '@beamlab/types';
import { useSectionsStore } from './sections';

// ============================================================================
// INTERFACES
// ============================================================================

export interface Node {
  id: string;
  x: number;
  y: number;
  z: number;
  notes?: string; // Optional user notes
}

export interface Member {
  id: string;
  startNodeId: string;
  endNodeId: string;
  sectionId: string;
  materialId?: string;
}

export type MaterialType = 'steel' | 'concrete' | 'rcc' | 'timber' | 'other';

export interface Material {
  id: string;
  name: string;
  type: MaterialType;
  grade?: string; // e.g., Fe250, M25
  elasticModulus: number; // Pa
  shearModulus: number; // Pa
  density: number; // kg/m^3
  yieldStrength?: number; // Pa (for steel/rebar)
  compressiveStrength?: number; // Pa (for concrete)
  rebarYieldStrength?: number; // Pa (for RCC)
}

// Support Types
export type SupportType = 'fixed' | 'pinned';

export interface Support {
  nodeId: string;
  type: SupportType;
}

// Load Types
export type LoadType = 'point' | 'udl' | 'uvl' | 'moment' | 'point-member';

// Point load at a node
export interface PointLoad {
  id: string;
  type: 'point';
  nodeId: string;
  fx: number;  // Force in X direction (kN)
  fy: number;  // Force in Y direction (kN)
  fz: number;  // Force in Z direction (kN)
}

// Point load on a member (at a specific position)
export interface PointMemberLoad {
  id: string;
  type: 'point-member';
  memberId: string;
  position: number;  // Position along member (0 to 1, where 0=start, 1=end)
  fx: number;  // Force in X direction (kN)
  fy: number;  // Force in Y direction (kN)
  fz: number;  // Force in Z direction (kN)
}

// UDL - Uniformly Distributed Load (constant intensity along member)
export interface UDLLoad {
  id: string;
  type: 'udl';
  memberId: string;
  startPos: number;  // Start position (0 to 1), default 0
  endPos: number;    // End position (0 to 1), default 1
  wx: number;  // Load intensity in X (kN/m)
  wy: number;  // Load intensity in Y (kN/m)
  wz: number;  // Load intensity in Z (kN/m)
}

// UVL - Uniformly Varying Load (triangular/trapezoidal)
export interface UVLLoad {
  id: string;
  type: 'uvl';
  memberId: string;
  startPos: number;  // Start position (0 to 1)
  endPos: number;    // End position (0 to 1)
  wxStart: number;   // Load intensity at start in X (kN/m)
  wyStart: number;   // Load intensity at start in Y (kN/m)
  wzStart: number;   // Load intensity at start in Z (kN/m)
  wxEnd: number;     // Load intensity at end in X (kN/m)
  wyEnd: number;     // Load intensity at end in Y (kN/m)
  wzEnd: number;     // Load intensity at end in Z (kN/m)
}

// Legacy distributed load (kept for compatibility)
export interface DistributedLoad {
  id: string;
  type: 'distributed';
  memberId: string;
  wx: number;  // Load intensity in X (kN/m)
  wy: number;  // Load intensity in Y (kN/m)
  wz: number;  // Load intensity in Z (kN/m)
}

export interface MomentLoad {
  id: string;
  type: 'moment';
  nodeId: string;
  mx: number;  // Moment about X axis (kN-m)
  my: number;  // Moment about Y axis (kN-m)
  mz: number;  // Moment about Z axis (kN-m)
}

export type Load = PointLoad | PointMemberLoad | UDLLoad | UVLLoad | DistributedLoad | MomentLoad;

export interface LoadCase {
  id: string;
  name: string;
  loads: Load[];
}

export interface LoadCombination {
  id: string;
  name: string;
  description?: string;
  factors: Record<string, number>; // Map of loadCaseId -> factor
}

// ============================================================================
// ANALYSIS RESULT INTERFACE
// ============================================================================

export interface MemberEndForces {
  // Local end forces at i-end (start) and j-end (end)
  Nx_i: number; Vy_i: number; Vz_i: number; T_i: number; My_i: number; Mz_i: number;
  Nx_j: number; Vy_j: number; Vz_j: number; T_j: number; My_j: number; Mz_j: number;
}

export interface MemberDiagramPoint { x: number; Mz: number; Fy: number }

export interface AnalysisResult {
  // Per-member local end forces (kN, kN·m)
  memberEndForces: Map<string, MemberEndForces>;
  // Per-member internal force diagrams along span (local axes)
  memberDiagrams: Map<string, MemberDiagramPoint[]>;
}

// Design results (per-member utilization and governing check)
export type DesignResult = DesignCheckResult;

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface ModelState {
  // Core Data - Using Maps for O(1) lookups
  nodes: Map<string, Node>;
  members: Map<string, Member>;
  materials: Map<string, Material>;
  defaultMaterialId: string | null;
  
  // Supports - Map nodeId to SupportType
  supports: Map<string, SupportType>;
  
  // Load Cases
  loadCases: LoadCase[];
  activeLoadCaseId: string | null;
  
  // Load Combinations
  loadCombinations: LoadCombination[];
  
  // Selection State
  selectedNodeIds: Set<string>;
  selectedMemberIds: Set<string>;

  // Analysis Results
  solverResult: SolverResult | null;
  analysisResults: AnalysisResult | null;
  designResults: Map<string, DesignResult>;
  designUtilization: Map<string, number>;
  isAnalyzing: boolean;
  displacementScale: number;
  analysisError: string | null;
}

// ============================================================================
// ACTIONS INTERFACE
// ============================================================================

interface ModelActions {
  // Node Actions
  addNode: (node: Node) => void;
  removeNode: (id: string) => void;
  updateNodePosition: (id: string, pos: { x: number; y: number; z: number }) => void;
  
  // Member Actions
  addMember: (member: Member) => void;
  removeMember: (id: string) => void;
  updateMember: (id: string, updates: Partial<Omit<Member, 'id'>>) => void;
  
  // Support Actions
  addSupport: (nodeId: string, type: SupportType) => void;
  removeSupport: (nodeId: string) => void;
  updateSupport: (nodeId: string, type: SupportType) => void;
  
  // Load Case Actions
  addLoadCase: (loadCase: LoadCase) => void;
  removeLoadCase: (id: string) => void;
  setActiveLoadCase: (id: string | null) => void;
  
  // Load Combination Actions
  addLoadCombination: (combination: LoadCombination) => void;
  removeLoadCombination: (id: string) => void;
  setLoadCombinations: (combinations: LoadCombination[]) => void;
  getAllLoadCombinations: () => LoadCombination[];
  
  // Load Actions (within active load case)
  addLoad: (load: Load) => void;
  removeLoad: (loadId: string) => void;
  updateLoad: (loadId: string, updates: Partial<Load>) => void;
  
  // Selection Actions
  selectNode: (id: string, multiSelect?: boolean) => void;
  selectMember: (id: string, multiSelect?: boolean) => void;
  clearSelection: () => void;
  
  // Utility Actions
  clear: () => void;
  getNode: (id: string) => Node | undefined;
  getMember: (id: string) => Member | undefined;
  getAllNodes: () => Node[];
  getAllMembers: () => Member[];
  getAllSupports: () => Support[];
  getActiveLoadCase: () => LoadCase | undefined;

  // Analysis Actions
  runAnalysis: () => Promise<void>;
  clearAnalysis: () => void;
  setAnalysisResults: (results: AnalysisResult) => void;
  setDesignResults: (results: Map<string, DesignResult>, utilization: Map<string, number>) => void;
  addMaterial: (material: Material) => void;
  updateMaterial: (id: string, updates: Partial<Material>) => void;
  setDefaultMaterial: (id: string) => void;
  getMaterial: (id: string) => Material | undefined;
  getAllMaterials: () => Material[];
  setDisplacementScale: (scale: number) => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const createDefaultMaterials = (): Map<string, Material> => {
  const materials: Material[] = [
    {
      id: 'steel-fe250',
      name: 'Steel Fe250',
      type: 'steel',
      grade: 'Fe250',
      elasticModulus: 200e9,
      shearModulus: 79.3e9,
      density: 7850,
      yieldStrength: 250e6,
    },
    {
      id: 'steel-fe500',
      name: 'Steel Fe500',
      type: 'steel',
      grade: 'Fe500',
      elasticModulus: 200e9,
      shearModulus: 79.3e9,
      density: 7850,
      yieldStrength: 500e6,
    },
    {
      id: 'concrete-m25',
      name: 'Concrete M25',
      type: 'concrete',
      grade: 'M25',
      elasticModulus: 28e9, // Approx per IS 456 (5000*sqrt(fck) MPa)
      shearModulus: 11e9,
      density: 2450,
      compressiveStrength: 25e6,
    },
    {
      id: 'rcc-m30-fe500',
      name: 'RCC M30 + Fe500',
      type: 'rcc',
      grade: 'M30/Fe500',
      elasticModulus: 30e9,
      shearModulus: 12e9,
      density: 2500,
      compressiveStrength: 30e6,
      rebarYieldStrength: 500e6,
    },
    {
      id: 'timber-sal',
      name: 'Timber (Sal wood)',
      type: 'timber',
      grade: 'Sal',
      elasticModulus: 10e9,
      shearModulus: 1e9,
      density: 650,
      compressiveStrength: 8e6,
    },
  ];

  return new Map(materials.map((m) => [m.id, m]));
};

const initialState: ModelState = {
  nodes: new Map(),
  members: new Map(),
  materials: createDefaultMaterials(),
  defaultMaterialId: 'steel-fe250',
  supports: new Map(),
  loadCases: [],
  activeLoadCaseId: null,
  loadCombinations: [],
  selectedNodeIds: new Set(),
  selectedMemberIds: new Set(),
  solverResult: null,
  analysisResults: null,
  designResults: new Map(),
  designUtilization: new Map(),
  isAnalyzing: false,
  displacementScale: 1,
  analysisError: null,
};

// ============================================================================
// HELPER: Convert Maps/Sets to plain objects for Redux DevTools
// ============================================================================

// This helper is available for debugging if needed
// const serializeState = (state: ModelState) => ({
//   nodes: Object.fromEntries(state.nodes),
//   members: Object.fromEntries(state.members),
//   selectedNodeIds: Array.from(state.selectedNodeIds),
//   selectedMemberIds: Array.from(state.selectedMemberIds),
// });

// ============================================================================
// STORE CREATION
// ============================================================================

export const useModelStore = create<ModelState & ModelActions>()(
  // DevTools middleware with serialization for Maps/Sets
  devtools(
    // Temporal middleware for Undo/Redo
    temporal(
      (set, get) => ({
        ...initialState,

        // ===================================================================
        // NODE ACTIONS
        // ===================================================================

        addNode: (node: Node) => {
          set((state) => {
            const newNodes = new Map(state.nodes);
            newNodes.set(node.id, node);
            return { nodes: newNodes };
          });
        },

        removeNode: (id: string) => {
          set((state) => {
            const newNodes = new Map(state.nodes);
            const newMembers = new Map(state.members);
            const newSelectedNodeIds = new Set(state.selectedNodeIds);

            // Remove the node
            newNodes.delete(id);
            
            // Remove any members connected to this node
            for (const [memberId, member] of Array.from(newMembers.entries())) {
              if (member.startNodeId === id || member.endNodeId === id) {
                newMembers.delete(memberId);
              }
            }
            
            // Remove from selection
            newSelectedNodeIds.delete(id);

            return {
              nodes: newNodes,
              members: newMembers,
              selectedNodeIds: newSelectedNodeIds,
            };
          });
        },

        updateNodePosition: (id: string, pos: { x: number; y: number; z: number }) => {
          set((state) => {
            const node = state.nodes.get(id);
            if (!node) return state;

            const newNodes = new Map(state.nodes);
            newNodes.set(id, { ...node, ...pos });
            return { nodes: newNodes };
          });
        },

        // ===================================================================
        // MEMBER ACTIONS
        // ===================================================================

        addMember: (member: Member) => {
          set((state) => {
            // Validate that both nodes exist
            if (!state.nodes.has(member.startNodeId) || !state.nodes.has(member.endNodeId)) {
              console.warn(`Cannot add member ${member.id}: one or both nodes don't exist`);
              return state;
            }

            const materialId = member.materialId
              ?? state.defaultMaterialId
              ?? Array.from(state.materials.keys())[0];

            const newMembers = new Map(state.members);
            newMembers.set(member.id, { ...member, materialId });
            return { members: newMembers };
          });
        },

        removeMember: (id: string) => {
          set((state) => {
            const newMembers = new Map(state.members);
            const newSelectedMemberIds = new Set(state.selectedMemberIds);

            newMembers.delete(id);
            newSelectedMemberIds.delete(id);

            return {
              members: newMembers,
              selectedMemberIds: newSelectedMemberIds,
            };
          });
        },

        updateMember: (id: string, updates: Partial<Omit<Member, 'id'>>) => {
          set((state) => {
            const member = state.members.get(id);
            if (!member) return state;

            const newMembers = new Map(state.members);
            newMembers.set(id, { ...member, ...updates });
            return { members: newMembers };
          });
        },

        // ===================================================================
        // SUPPORT ACTIONS
        // ===================================================================

        addSupport: (nodeId: string, type: SupportType) => {
          set((state) => {
            if (!state.nodes.has(nodeId)) {
              console.warn(`Cannot add support: node ${nodeId} doesn't exist`);
              return state;
            }
            const newSupports = new Map(state.supports);
            newSupports.set(nodeId, type);
            return { supports: newSupports };
          });
        },

        removeSupport: (nodeId: string) => {
          set((state) => {
            const newSupports = new Map(state.supports);
            newSupports.delete(nodeId);
            return { supports: newSupports };
          });
        },

        updateSupport: (nodeId: string, type: SupportType) => {
          set((state) => {
            if (!state.supports.has(nodeId)) return state;
            const newSupports = new Map(state.supports);
            newSupports.set(nodeId, type);
            return { supports: newSupports };
          });
        },

        // ===================================================================
        // MATERIAL ACTIONS
        // ===================================================================

        addMaterial: (material) => {
          set((state) => {
            const materials = new Map(state.materials);
            materials.set(material.id, material);
            return { materials };
          });
        },

        updateMaterial: (id, updates) => {
          set((state) => {
            const materials = new Map(state.materials);
            const existing = materials.get(id);
            if (!existing) return { materials };
            materials.set(id, { ...existing, ...updates });
            return { materials };
          });
        },

        setDefaultMaterial: (id) => {
          set((state) => ({ defaultMaterialId: state.materials.has(id) ? id : state.defaultMaterialId }));
        },

        getMaterial: (id) => {
          return get().materials.get(id);
        },

        getAllMaterials: () => {
          return Array.from(get().materials.values());
        },

        // ===================================================================
        // LOAD CASE ACTIONS
        // ===================================================================

        addLoadCase: (loadCase: LoadCase) => {
          set((state) => ({
            loadCases: [...state.loadCases, loadCase],
            activeLoadCaseId: state.activeLoadCaseId || loadCase.id,
          }));
        },

        removeLoadCase: (id: string) => {
          set((state) => {
            const newLoadCases = state.loadCases.filter(lc => lc.id !== id);
            const newActiveId = state.activeLoadCaseId === id 
              ? (newLoadCases.length > 0 ? newLoadCases[0].id : null)
              : state.activeLoadCaseId;
            return { loadCases: newLoadCases, activeLoadCaseId: newActiveId };
          });
        },

        setActiveLoadCase: (id: string | null) => {
          set({ activeLoadCaseId: id });
        },

        // ===================================================================
        // LOAD COMBINATION ACTIONS
        // ===================================================================

        addLoadCombination: (combination: LoadCombination) => {
          set((state) => ({
            loadCombinations: [...state.loadCombinations, combination],
          }));
        },

        removeLoadCombination: (id: string) => {
          set((state) => ({
            loadCombinations: state.loadCombinations.filter(lc => lc.id !== id),
          }));
        },

        setLoadCombinations: (combinations: LoadCombination[]) => {
          set({ loadCombinations: combinations });
        },

        getAllLoadCombinations: () => {
          return get().loadCombinations;
        },

        // ===================================================================
        // LOAD ACTIONS (within active load case)
        // ===================================================================

        addLoad: (load: Load) => {
          set((state) => {
            if (!state.activeLoadCaseId) {
              console.warn('Cannot add load: no active load case');
              return state;
            }
            const newLoadCases = state.loadCases.map(lc => {
              if (lc.id === state.activeLoadCaseId) {
                return { ...lc, loads: [...lc.loads, load] };
              }
              return lc;
            });
            return { loadCases: newLoadCases };
          });
        },

        removeLoad: (loadId: string) => {
          set((state) => {
            if (!state.activeLoadCaseId) return state;
            const newLoadCases = state.loadCases.map(lc => {
              if (lc.id === state.activeLoadCaseId) {
                return { ...lc, loads: lc.loads.filter(l => l.id !== loadId) };
              }
              return lc;
            });
            return { loadCases: newLoadCases };
          });
        },

        updateLoad: (loadId: string, updates: Partial<Load>) => {
          set((state) => {
            if (!state.activeLoadCaseId) return state;
            const newLoadCases = state.loadCases.map(lc => {
              if (lc.id === state.activeLoadCaseId) {
                return {
                  ...lc,
                  loads: lc.loads.map(l => 
                    l.id === loadId ? { ...l, ...updates } as Load : l
                  ),
                };
              }
              return lc;
            });
            return { loadCases: newLoadCases };
          });
        },

        // ===================================================================
        // SELECTION ACTIONS
        // ===================================================================

        selectNode: (id: string, multiSelect = false) => {
          set((state) => {
            const newSelectedNodeIds = multiSelect
              ? new Set(state.selectedNodeIds).add(id)
              : new Set([id]);
            
            return {
              selectedNodeIds: newSelectedNodeIds,
              selectedMemberIds: new Set(), // Clear member selection
            };
          });
        },

        selectMember: (id: string, multiSelect = false) => {
          set((state) => {
            const newSelectedMemberIds = multiSelect
              ? new Set(state.selectedMemberIds).add(id)
              : new Set([id]);
            
            return {
              selectedMemberIds: newSelectedMemberIds,
              selectedNodeIds: new Set(), // Clear node selection
            };
          });
        },

        clearSelection: () => {
          set({
            selectedNodeIds: new Set(),
            selectedMemberIds: new Set(),
          });
        },

        // ===================================================================
        // ANALYSIS ACTIONS
        // ===================================================================

        runAnalysis: async () => {
          const state = get();
          const activeLoadCase = state.getActiveLoadCase() ?? state.loadCases[0];
          if (!activeLoadCase) {
            console.warn('No load case available. Add a load case first.');
            return;
          }

          // Validate structure size
          const numNodes = state.nodes.size;
          const numDOFs = numNodes * 6;
          
          // Warn for very large structures
          if (numDOFs > 3000) {
            const proceed = confirm(
              `Large structure detected (${numNodes} nodes, ${numDOFs} DOFs).\n` +
              `Analysis may take 30-60 seconds and use significant memory.\n` +
              `Continue?`
            );
            if (!proceed) {
              return;
            }
          }
          
          // Hard limit to prevent browser crashes
          if (numDOFs > 6000) {
            alert(
              `Structure too large (${numNodes} nodes, ${numDOFs} DOFs).\n` +
              `Maximum supported: 1000 nodes (6000 DOFs).\n` +
              `Please reduce structure size or contact support for enterprise solutions.`
            );
            return;
          }

          set({ isAnalyzing: true, analysisError: null });

          try {
            // Nodes
            const solverNodes = Array.from(state.nodes.values()).map((node) => ({
              id: node.id,
              x: node.x,
              y: node.y,
              z: node.z,
            }));

            // Sections / properties
            const sectionsState = useSectionsStore.getState();
            const defaultSection = sectionsState.getDefaultSection();

            const solverMembers = Array.from(state.members.values()).map((member) => {
              const section = sectionsState.getSectionById(member.sectionId) || defaultSection;
              const material = state.materials.get(member.materialId ?? state.defaultMaterialId ?? '')
                || state.materials.values().next().value;

              // Convert from mm² / mm⁴ to m² / m⁴
              const area = (section?.area ?? defaultSection.area) * 1e-6;
              const iy = (section?.Iyy ?? section?.Ixx ?? defaultSection.Iyy) * 1e-12;
              const iz = (section?.Ixx ?? section?.Iyy ?? defaultSection.Ixx) * 1e-12;

              return {
                id: member.id,
                startNodeId: member.startNodeId,
                endNodeId: member.endNodeId,
                E: material?.elasticModulus ?? 200e9,
                A: area,
                Iy: iy,
                Iz: iz,
                G: material?.shearModulus ?? 80e9,
                J: Math.min(iy, iz),
                beta: 0,
              } satisfies SolverMember;
            });

            // Supports
            const solverSupports: SolverSupport[] = Array.from(state.supports.entries()).map(
              ([nodeId, type]) => ({
                nodeId,
                dx: true,
                dy: true,
                dz: true,
                rx: type === 'fixed',
                ry: type === 'fixed',
                rz: type === 'fixed',
              })
            );

            // Loads (nodes + member loads)
            const solverLoads: NodalLoad[] = [];

            const addNodalLoad = (nodeId: string, fx = 0, fy = 0, fz = 0) => {
              solverLoads.push({ nodeId, fx, fy, fz });
            };

            const getNodeCoords = (nodeId: string) => {
              const n = state.nodes.get(nodeId);
              if (!n) return null;
              return { x: n.x, y: n.y, z: n.z };
            };

            const memberLength = (memberId: string) => {
              const m = state.members.get(memberId);
              if (!m) return 0;
              const a = getNodeCoords(m.startNodeId);
              const b = getNodeCoords(m.endNodeId);
              if (!a || !b) return 0;
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const dz = b.z - a.z;
              return Math.sqrt(dx * dx + dy * dy + dz * dz);
            };

            const distributeUDL = (memberId: string, startPos: number, endPos: number, wx: number, wy: number, wz: number) => {
              const m = state.members.get(memberId);
              if (!m) return;
              const L = memberLength(memberId);
              if (L <= 0) return;
              const span = Math.max(0, Math.min(1, endPos) - Math.max(0, startPos));
              if (span <= 0) return;
              const effL = span * L;
              // Total load per axis
              const Fx = wx * effL;
              const Fy = wy * effL;
              const Fz = wz * effL;
              // Simple equally distributed to end nodes
              addNodalLoad(m.startNodeId, Fx * 0.5, Fy * 0.5, Fz * 0.5);
              addNodalLoad(m.endNodeId, Fx * 0.5, Fy * 0.5, Fz * 0.5);
            };

            const distributeUVL = (memberId: string, startPos: number, endPos: number, wx0: number, wy0: number, wz0: number, wx1: number, wy1: number, wz1: number) => {
              const m = state.members.get(memberId);
              if (!m) return;
              const L = memberLength(memberId);
              if (L <= 0) return;
              const span = Math.max(0, Math.min(1, endPos) - Math.max(0, startPos));
              if (span <= 0) return;
              const effL = span * L;
              const totalFx = ((wx0 + wx1) / 2) * effL;
              const totalFy = ((wy0 + wy1) / 2) * effL;
              const totalFz = ((wz0 + wz1) / 2) * effL;
              const xbarFx = (wx0 + 2 * wx1) / (wx0 + wx1 || 1e-9) * (effL / 3);
              const xbarFy = (wy0 + 2 * wy1) / (wy0 + wy1 || 1e-9) * (effL / 3);
              const xbarFz = (wz0 + 2 * wz1) / (wz0 + wz1 || 1e-9) * (effL / 3);
              const split = (total: number, xbar: number) => ({
                start: total * (1 - xbar / effL),
                end: total * (xbar / effL),
              });
              const fxSplit = split(totalFx, Math.abs(xbarFx));
              const fySplit = split(totalFy, Math.abs(xbarFy));
              const fzSplit = split(totalFz, Math.abs(xbarFz));
              addNodalLoad(m.startNodeId, fxSplit.start, fySplit.start, fzSplit.start);
              addNodalLoad(m.endNodeId, fxSplit.end, fySplit.end, fzSplit.end);
            };

            const distributePointMember = (memberId: string, pos: number, fx: number, fy: number, fz: number) => {
              const m = state.members.get(memberId);
              if (!m) return;
              const a = Math.max(0, Math.min(1, pos));
              addNodalLoad(m.startNodeId, fx * (1 - a), fy * (1 - a), fz * (1 - a));
              addNodalLoad(m.endNodeId, fx * a, fy * a, fz * a);
            };

            for (const load of activeLoadCase.loads) {
              if (load.type === 'point') {
                addNodalLoad(load.nodeId, load.fx, load.fy, load.fz);
              } else if (load.type === 'distributed') {
                distributeUDL(load.memberId, 0, 1, load.wx, load.wy, load.wz);
              } else if (load.type === 'udl') {
                distributeUDL(load.memberId, load.startPos, load.endPos, load.wx, load.wy, load.wz);
              } else if (load.type === 'uvl') {
                distributeUVL(load.memberId, load.startPos, load.endPos, load.wxStart, load.wyStart, load.wzStart, load.wxEnd, load.wyEnd, load.wzEnd);
              } else if (load.type === 'point-member') {
                distributePointMember(load.memberId, load.position, load.fx, load.fy, load.fz);
              }
            }

            const solver = new Solver({
              nodes: solverNodes,
              members: solverMembers,
              supports: solverSupports,
            });

            const result = solver.solve(solverLoads, solverSupports);

            // -----------------------------------------------------------------
            // Post-process: Per-member end forces and internal diagrams (Mz/Fy)
            // -----------------------------------------------------------------
            // Build node index map consistent with solverNodes order
            const nodeIndexMap = new Map<string, number>();
            solverNodes.forEach((n, idx) => nodeIndexMap.set(n.id, idx));
            const uGlobal = result.displacements; // length = numNodes * 6

            // Helpers
            const multiply12 = (k: number[][], u: number[]): number[] => {
              const n = 12;
              const out = new Array(n).fill(0);
              for (let i = 0; i < n; i++) {
                let sum = 0;
                const row = k[i];
                for (let j = 0; j < n; j++) {
                  sum += (row?.[j] ?? 0) * (u?.[j] ?? 0);
                }
                out[i] = sum;
              }
              return out;
            };

            // Build quick lookup for node coordinates
            const nodeCoord = new Map<string, { x: number; y: number; z: number }>();
            for (const n of solverNodes) nodeCoord.set(n.id, { x: n.x, y: n.y, z: n.z });

            // Aggregate member loads into simple local-Y profile (approx.)
            const activeLoads = activeLoadCase.loads;
            
            const memberEndForces = new Map<string, MemberEndForces>();
            const memberDiagrams = new Map<string, MemberDiagramPoint[]>();

            // Helpers for design checks
            const toDesignMaterial = (mat?: Material | null): DesignMaterial | null => {
              if (!mat) return null;
              return {
                id: mat.id,
                name: mat.name,
                elasticModulus: mat.elasticModulus,
                shearModulus: mat.shearModulus,
                poissonRatio: 0.3,
                density: mat.density,
                yieldStrength: mat.yieldStrength,
                ultimateStrength: mat.rebarYieldStrength ?? mat.yieldStrength,
              } satisfies DesignMaterial;
            };

            const toDesignSection = (sectionId: string): DesignSection => {
              const sec = sectionsState.getSectionById(sectionId) || defaultSection;
              const area_m2 = (sec?.area ?? defaultSection.area) * 1e-6;
              const iy_mm4 = sec?.Iyy ?? sec?.Ixx ?? defaultSection.Iyy;
              const iz_mm4 = sec?.Ixx ?? sec?.Iyy ?? defaultSection.Ixx;
              const depth_m = (sec?.depth ?? defaultSection.depth) * 1e-3;
              const width_m = (sec?.flangeWidth ?? sec?.depth ?? defaultSection.flangeWidth) * 1e-3;
              const sectionModY = depth_m > 0 ? (iy_mm4 * 1e-12) / (Math.max(depth_m, 1e-6) / 2) : undefined;
              const sectionModZ = width_m > 0 ? (iz_mm4 * 1e-12) / (Math.max(width_m, 1e-6) / 2) : undefined;

              return {
                id: sec?.id || 'section',
                name: sec?.name || sec?.id || 'Section',
                type: 'i-beam',
                properties: {
                  area: Math.max(area_m2, 1e-9),
                  momentOfInertiaY: Math.max((iy_mm4 ?? defaultSection.Iyy) * 1e-12, 1e-12),
                  momentOfInertiaZ: Math.max((iz_mm4 ?? defaultSection.Ixx) * 1e-12, 1e-12),
                  torsionalConstant: Math.max(1e-9, Math.min((iy_mm4 ?? defaultSection.Iyy), (iz_mm4 ?? defaultSection.Ixx)) * 1e-12 * 0.1),
                  sectionModulusY: sectionModY,
                  sectionModulusZ: sectionModZ,
                },
                dimensions: {
                  depth: depth_m,
                  flangeWidth: width_m,
                },
              } satisfies DesignSection;
            };

            for (const m of solverMembers) {
              const a = nodeCoord.get(m.startNodeId);
              const b = nodeCoord.get(m.endNodeId);
              if (!a || !b) continue;

              // Geometry and transformations
              const L = MatrixUtils.getMemberLength(a, b);
              if (L <= 1e-10) continue;
              const R = MatrixUtils.getRotationMatrix(a, b, m.beta ?? 0);
              const T = MatrixUtils.getTransformationMatrix(R).toArray() as number[][];
              const kLocalMat = MatrixUtils.getLocalStiffnessMatrix(m.E, m.Iy, m.Iz, m.A, L, m.G, m.J).toArray() as number[][];

              // Extract member's global displacement vector [12]
              const iIdx = (nodeIndexMap.get(m.startNodeId) ?? 0) * 6;
              const jIdx = (nodeIndexMap.get(m.endNodeId) ?? 0) * 6;
              const uMemberGlobal: number[] = new Array(12).fill(0);
              for (let d = 0; d < 6; d++) {
                uMemberGlobal[d] = uGlobal[iIdx + d] ?? 0;
                uMemberGlobal[6 + d] = uGlobal[jIdx + d] ?? 0;
              }

              // u_local = T^T * u_global
              const uLocal: number[] = new Array(12).fill(0);
              for (let i = 0; i < 12; i++) {
                let sum = 0;
                for (let j = 0; j < 12; j++) {
                  sum += (T[j]?.[i] ?? 0) * (uMemberGlobal[j] ?? 0);
                }
                uLocal[i] = sum;
              }

              // End forces in local axes: Fe = k_local * u_local
              const Fe = multiply12(kLocalMat, uLocal);

              // Save end forces of interest
              memberEndForces.set(m.id, {
                Nx_i: Fe[0], Vy_i: Fe[1], Vz_i: Fe[2], T_i: Fe[3], My_i: Fe[4], Mz_i: Fe[5],
                Nx_j: Fe[6], Vy_j: Fe[7], Vz_j: Fe[8], T_j: Fe[9], My_j: Fe[10], Mz_j: Fe[11],
              });

              // Build simple load profile in local Y (only full-span UDL/UVL and point-member loads supported here)
              let udlY: number | undefined;
              let uvlY: { wStart: number; wEnd: number } | undefined;
              const pointLoadsY: Array<{ x: number; Py: number }> = [];

              for (const load of activeLoads) {
                if (load.type === 'udl' && load.memberId === m.id) {
                  if (Math.abs(load.startPos) < 1e-6 && Math.abs(load.endPos - 1) < 1e-6) {
                    // Convert global wy sign: assume negative = downward
                    const wy = load.wy ?? 0;
                    udlY = (udlY ?? 0) + Math.max(0, -wy);
                  }
                } else if (load.type === 'uvl' && load.memberId === m.id) {
                  if (Math.abs(load.startPos) < 1e-6 && Math.abs(load.endPos - 1) < 1e-6) {
                    const wy0 = load.wyStart ?? 0;
                    const wy1 = load.wyEnd ?? 0;
                    const wStart = Math.max(0, -wy0);
                    const wEnd = Math.max(0, -wy1);
                    if (!uvlY) uvlY = { wStart: 0, wEnd: 0 };
                    uvlY.wStart += wStart;
                    uvlY.wEnd += wEnd;
                  }
                } else if (load.type === 'point-member' && load.memberId === m.id) {
                  const fy = load.fy ?? 0;
                  const Py = Math.max(0, -fy);
                  pointLoadsY.push({ x: Math.max(0, Math.min(1, load.position)) * L, Py });
                }
              }

              const loadsProfile = (udlY || uvlY || pointLoadsY.length)
                ? { udlY, uvlY, pointLoadsY }
                : undefined;

              // Calculate diagram arrays (Mz and Fy along member)
              const diagram = calculateMemberFyMz(kLocalMat, uLocal, L, loadsProfile, 20) as MemberForcesOutput[];
              memberDiagrams.set(m.id, diagram.map(p => ({ x: p.x, Mz: p.Mz, Fy: p.Fy })));
            }

            // Run steel design checks and utilization map
            const designResults = new Map<string, DesignResult>();
            const designUtilization = new Map<string, number>();

            for (const m of solverMembers) {
              const ef = memberEndForces.get(m.id);
              const baseMember = state.members.get(m.id);
              if (!ef || !baseMember) continue;

              const material = state.materials.get(baseMember.materialId ?? state.defaultMaterialId ?? '')
                || state.materials.values().next().value;

              const L = memberLength(m.id);
              if (L <= 1e-9) continue;

              const PuCandidates = [ef.Nx_i, ef.Nx_j];
              const Pu = PuCandidates.reduce((best, val) => (Math.abs(val) > Math.abs(best) ? val : best), 0);
              const Mux = Math.max(Math.abs(ef.My_i ?? 0), Math.abs(ef.My_j ?? 0));
              const Muy = Math.max(Math.abs(ef.Mz_i ?? 0), Math.abs(ef.Mz_j ?? 0));

              const designSection = toDesignSection(baseMember.sectionId);
              const designMat = toDesignMaterial(material);

              if (material?.type === 'steel' && designMat) {
                const check = checkMember(
                  { length: Math.max(L, 1e-6), kFactor: 1.0, Lb: L },
                  { Pu, Mux, Muy } satisfies SteelMemberForces,
                  designSection,
                  designMat
                );
                designResults.set(m.id, check);
                designUtilization.set(m.id, check.utilization);
              } else {
                // Placeholder for non-steel materials (RCC/Concrete/Timber)
                const note = material?.type === 'rcc'
                  ? 'RCC design requires grade and reinforcement details; not yet implemented'
                  : `Design check not implemented for material type ${material?.type ?? 'unknown'}`;
                designResults.set(m.id, {
                  utilization: 0,
                  governingEquation: note,
                  components: {},
                });
                designUtilization.set(m.id, 0);
              }
            }

            set({ 
              solverResult: result, 
              analysisResults: { memberEndForces, memberDiagrams },
              designResults,
              designUtilization,
              isAnalyzing: false, 
              analysisError: null 
            });
          } catch (error) {
            console.error('Analysis failed', error);
            
            let errorMessage = 'Analysis failed';
            
            if (error instanceof Error) {
              if (error.message.includes('singular') || error.message.includes('unstable')) {
                errorMessage = 'Structure is unstable or improperly constrained. Add supports or check member connections.';
              } else if (error.message.includes('mechanism')) {
                errorMessage = 'Structure is a mechanism (not rigid). Add more supports or members.';
              } else if (error.message.includes('memory') || error.message.includes('Maximum call stack')) {
                errorMessage = 'Out of memory. Structure is too large. Reduce number of nodes/members.';
              } else if (error.message.includes('timeout')) {
                errorMessage = 'Analysis timed out. Structure is too complex.';
              } else {
                errorMessage = error.message;
              }
            }
            
            set({
              isAnalyzing: false,
              solverResult: null,
              analysisError: errorMessage,
            });
            
            // Show user-friendly alert
            alert(`Analysis Error: ${errorMessage}`);
          }
        },

        clearAnalysis: () => {
          set({ solverResult: null, analysisResults: null, designResults: new Map(), designUtilization: new Map() });
        },

        setAnalysisResults: (results: AnalysisResult) => {
          set({ analysisResults: results });
        },

        setDesignResults: (results: Map<string, DesignResult>, utilization: Map<string, number>) => {
          set({ designResults: results, designUtilization: utilization });
        },

        setDisplacementScale: (scale: number) => {
          set({ displacementScale: scale });
        },

        // ===================================================================
        // UTILITY ACTIONS
        // ===================================================================

        clear: () => {
          resetIdCounters();
          set(initialState);
        },

        getNode: (id: string) => {
          return get().nodes.get(id);
        },

        getMember: (id: string) => {
          return get().members.get(id);
        },

        getAllNodes: () => {
          return Array.from(get().nodes.values());
        },

        getAllMembers: () => {
          return Array.from(get().members.values());
        },

        getAllSupports: () => {
          const supports = get().supports;
          return Array.from(supports.entries()).map(([nodeId, type]) => ({
            nodeId,
            type,
          }));
        },

        getActiveLoadCase: () => {
          const state = get();
          if (!state.activeLoadCaseId) return undefined;
          return state.loadCases.find(lc => lc.id === state.activeLoadCaseId);
        },
      }),
      {
        // Temporal (undo/redo) configuration
        partialize: (state) => {
          // Only track nodes and members in history (not selection)
          return {
            nodes: state.nodes,
            members: state.members,
          };
        },
        limit: 50, // Keep last 50 states in history
        equality: (a, b) => {
          // Custom equality check for Maps
          if (a.nodes.size !== b.nodes.size || a.members.size !== b.members.size) {
            return false;
          }
          return true;
        },
      }
    ),
    {
      // DevTools configuration
      name: 'ModelStore',
      serialize: {
        options: {
          map: true, // Enable Map serialization
          set: true, // Enable Set serialization
        },
      },
    }
  )
);

// ============================================================================
// TEMPORAL STORE FOR UNDO/REDO
// ============================================================================

// Access the temporal store directly
export const useTemporalStore = useModelStore.temporal;

// ============================================================================
// SELECTORS (for optimized re-renders)
// ============================================================================

// Get all nodes as array
export const selectAllNodes = (state: ModelState & ModelActions) => state.getAllNodes();

// Get all members as array
export const selectAllMembers = (state: ModelState & ModelActions) => state.getAllMembers();

// Get selected nodes
export const selectSelectedNodes = (state: ModelState & ModelActions) =>
  Array.from(state.selectedNodeIds)
    .map((id) => state.nodes.get(id))
    .filter((node): node is Node => node !== undefined);

// Get selected members
export const selectSelectedMembers = (state: ModelState & ModelActions) =>
  Array.from(state.selectedMemberIds)
    .map((id) => state.members.get(id))
    .filter((member): member is Member => member !== undefined);

// Get all supports as array
export const selectAllSupports = (state: ModelState & ModelActions) => state.getAllSupports();

// Get support by node id
export const selectSupportByNodeId = (nodeId: string) => (state: ModelState & ModelActions) =>
  state.supports.get(nodeId);

// Get active load case
export const selectActiveLoadCase = (state: ModelState & ModelActions) => state.getActiveLoadCase();

// Get all load cases
export const selectAllLoadCases = (state: ModelState & ModelActions) => state.loadCases;

// Get loads from active load case
export const selectActiveLoads = (state: ModelState & ModelActions) => {
  const activeCase = state.getActiveLoadCase();
  return activeCase?.loads || [];
};

// Get node by id
export const selectNodeById = (id: string) => (state: ModelState & ModelActions) =>
  state.nodes.get(id);

// Get member by id
export const selectMemberById = (id: string) => (state: ModelState & ModelActions) =>
  state.members.get(id);

// Get members connected to a node
export const selectMembersByNodeId = (nodeId: string) => (state: ModelState & ModelActions) =>
  Array.from(state.members.values()).filter(
    (member) => member.startNodeId === nodeId || member.endNodeId === nodeId
  );

// ============================================================================
// HOOKS FOR UNDO/REDO
// ============================================================================

export const useUndo = () => {
  const { undo, pastStates } = useModelStore.temporal.getState();
  const canUndo = pastStates.length > 0;
  return { undo, canUndo };
};

export const useRedo = () => {
  const { redo, futureStates } = useModelStore.temporal.getState();
  const canRedo = futureStates.length > 0;
  return { redo, canRedo };
};

export const useClear = () => {
  return useModelStore.temporal.getState().clear;
};

// ============================================================================
// UTILITY: Generate unique IDs
// ============================================================================

// Counter for sequential IDs
let nodeCounter = 0;
let memberCounter = 0;

/**
 * Generate human-readable node IDs (1, 2, 3...)
 */
export const generateNodeId = () => {
  nodeCounter += 1;
  return `${nodeCounter}`;
};

/**
 * Generate human-readable member IDs (M1, M2, M3...)
 */
export const generateMemberId = () => {
  memberCounter += 1;
  return `M${memberCounter}`;
};

/**
 * Reset ID counters (useful for clearing the model)
 */
const resetIdCounters = () => {
  nodeCounter = 0;
  memberCounter = 0;
};
export const generateLoadCaseId = () => `loadcase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
export const generateLoadId = () => `load_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/*
// In a component:
import { useModelStore, useUndo, useRedo, generateNodeId, generateMemberId } from './store/model';

function MyComponent() {
  const addNode = useModelStore((state) => state.addNode);
  const addMember = useModelStore((state) => state.addMember);
  const nodes = useModelStore(selectAllNodes);
  const { undo, canUndo } = useUndo();
  const { redo, canRedo } = useRedo();

  const handleAddNode = () => {
    addNode({
      id: generateNodeId(),
      x: 0,
      y: 0,
      z: 0,
    });
  };

  const handleAddMember = (startId: string, endId: string) => {
    addMember({
      id: generateMemberId(),
      startNodeId: startId,
      endNodeId: endId,
      sectionId: 'section_1',
    });
  };

  return (
    <div>
      <button onClick={handleAddNode}>Add Node</button>
      <button onClick={undo} disabled={!canUndo}>Undo</button>
      <button onClick={redo} disabled={!canRedo}>Redo</button>
      <p>Nodes: {nodes.length}</p>
    </div>
  );
}
*/
