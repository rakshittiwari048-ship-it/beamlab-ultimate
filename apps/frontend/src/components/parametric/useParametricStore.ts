/**
 * useParametricStore.ts
 * 
 * Zustand store for parametric graph state management.
 * Manages nodes, edges, execution, and integration with model store.
 */

// @ts-nocheck
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Node, Edge, Connection } from 'reactflow';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
} from 'reactflow';

import type { ParametricNodeData, ParametricModelOutput } from './types';
import { ExecutionEngine } from './ExecutionEngine';
import { nodeDefinitions } from './nodeDefinitions';

// ============================================================================
// TYPES
// ============================================================================

interface ParametricState {
  // Graph state
  nodes: Node<ParametricNodeData>[];
  edges: Edge[];
  
  // Execution
  isExecuting: boolean;
  lastOutput: ParametricModelOutput | null;
  executionErrors: Map<string, string>;
  
  // UI state
  selectedNodeId: string | null;
  isPanelOpen: boolean;
  
  // Actions
  addNode: (type: string, position: { x: number; y: number }) => void;
  deleteNode: (nodeId: string) => void;
  updateNodeData: (nodeId: string, data: Partial<ParametricNodeData>) => void;
  
  onNodesChange: (changes: NodeChange<ParametricNodeData>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  
  execute: () => ParametricModelOutput | null;
  clearGraph: () => void;
  
  setSelectedNode: (nodeId: string | null) => void;
  togglePanel: () => void;
  
  // Templates
  loadTemplate: (template: 'portal-frame' | 'truss' | 'grid') => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

let nodeIdCounter = 0;

function generateNodeId(): string {
  return `node_${Date.now()}_${++nodeIdCounter}`;
}

function createNode(
  type: string,
  position: { x: number; y: number },
  storeUpdate: (nodeId: string, data: Partial<ParametricNodeData>) => void
): Node<ParametricNodeData> {
  const definition = nodeDefinitions[type as keyof typeof nodeDefinitions];
  const nodeId = generateNodeId();
  
  // Build base data with proper typing
  const baseData = {
    type: type as ParametricNodeData['type'],
    label: definition?.label || type,
    onUpdate: (updates: Partial<ParametricNodeData>) => storeUpdate(nodeId, updates),
    ...(definition?.defaultData || {}),
  } as ParametricNodeData;
  
  return {
    id: nodeId,
    type,
    position,
    data: baseData,
  };
}

// ============================================================================
// TEMPLATE GENERATORS
// ============================================================================

function generatePortalFrameTemplate(
  storeUpdate: (nodeId: string, data: Partial<ParametricNodeData>) => void
): { nodes: Node<ParametricNodeData>[]; edges: Edge[] } {
  const nodes: Node<ParametricNodeData>[] = [];
  const edges: Edge[] = [];
  
  // Height input
  const heightNode = createNode('numberInput', { x: 50, y: 50 }, storeUpdate);
  heightNode.data = { ...heightNode.data, label: 'Height', value: 6 };
  nodes.push(heightNode);
  
  // Width input
  const widthNode = createNode('numberInput', { x: 50, y: 150 }, storeUpdate);
  widthNode.data = { ...widthNode.data, label: 'Width', value: 9 };
  nodes.push(widthNode);
  
  // Point generator
  const pointNode = createNode('pointGenerator', { x: 300, y: 100 }, storeUpdate);
  nodes.push(pointNode);
  
  // Line connector
  const lineNode = createNode('lineConnector', { x: 550, y: 100 }, storeUpdate);
  nodes.push(lineNode);
  
  // Frame repeater
  const frameNode = createNode('frameRepeater', { x: 800, y: 100 }, storeUpdate);
  nodes.push(frameNode);
  
  // Output
  const outputNode = createNode('modelOutput', { x: 1050, y: 100 }, storeUpdate);
  nodes.push(outputNode);
  
  // Connect nodes
  edges.push(
    { id: 'e1', source: heightNode.id, sourceHandle: 'value', target: pointNode.id, targetHandle: 'countY' },
    { id: 'e2', source: widthNode.id, sourceHandle: 'value', target: pointNode.id, targetHandle: 'spacingX' },
    { id: 'e3', source: pointNode.id, sourceHandle: 'points', target: lineNode.id, targetHandle: 'points' },
    { id: 'e4', source: lineNode.id, sourceHandle: 'geometry', target: frameNode.id, targetHandle: 'geometry' },
    { id: 'e5', source: frameNode.id, sourceHandle: 'geometry', target: outputNode.id, targetHandle: 'geometry' },
  );
  
  return { nodes, edges };
}

function generateTrussTemplate(
  storeUpdate: (nodeId: string, data: Partial<ParametricNodeData>) => void
): { nodes: Node<ParametricNodeData>[]; edges: Edge[] } {
  const nodes: Node<ParametricNodeData>[] = [];
  const edges: Edge[] = [];
  
  // Span input
  const spanNode = createNode('numberInput', { x: 50, y: 50 }, storeUpdate);
  spanNode.data = { ...spanNode.data, label: 'Span', value: 12 };
  nodes.push(spanNode);
  
  // Divisions input
  const divsNode = createNode('numberInput', { x: 50, y: 150 }, storeUpdate);
  divsNode.data = { ...divsNode.data, label: 'Divisions', value: 6 };
  nodes.push(divsNode);
  
  // Point generator
  const pointNode = createNode('pointGenerator', { x: 300, y: 100 }, storeUpdate);
  nodes.push(pointNode);
  
  // Line connector (complete for truss diagonals)
  const lineNode = createNode('lineConnector', { x: 550, y: 100 }, storeUpdate);
  lineNode.data = { ...lineNode.data, mode: 'complete' };
  nodes.push(lineNode);
  
  // Output
  const outputNode = createNode('modelOutput', { x: 800, y: 100 }, storeUpdate);
  nodes.push(outputNode);
  
  edges.push(
    { id: 'e1', source: spanNode.id, sourceHandle: 'value', target: pointNode.id, targetHandle: 'spacingX' },
    { id: 'e2', source: divsNode.id, sourceHandle: 'value', target: pointNode.id, targetHandle: 'countX' },
    { id: 'e3', source: pointNode.id, sourceHandle: 'points', target: lineNode.id, targetHandle: 'points' },
    { id: 'e4', source: lineNode.id, sourceHandle: 'geometry', target: outputNode.id, targetHandle: 'geometry' },
  );
  
  return { nodes, edges };
}

function generateGridTemplate(
  storeUpdate: (nodeId: string, data: Partial<ParametricNodeData>) => void
): { nodes: Node<ParametricNodeData>[]; edges: Edge[] } {
  const nodes: Node<ParametricNodeData>[] = [];
  const edges: Edge[] = [];
  
  // Grid X
  const gridXNode = createNode('numberInput', { x: 50, y: 50 }, storeUpdate);
  gridXNode.data = { ...gridXNode.data, label: 'Grid X', value: 4 };
  nodes.push(gridXNode);
  
  // Grid Y
  const gridYNode = createNode('numberInput', { x: 50, y: 150 }, storeUpdate);
  gridYNode.data = { ...gridYNode.data, label: 'Grid Y', value: 4 };
  nodes.push(gridYNode);
  
  // Spacing
  const spacingNode = createNode('numberInput', { x: 50, y: 250 }, storeUpdate);
  spacingNode.data = { ...spacingNode.data, label: 'Spacing', value: 6 };
  nodes.push(spacingNode);
  
  // Point generator
  const pointNode = createNode('pointGenerator', { x: 300, y: 150 }, storeUpdate);
  nodes.push(pointNode);
  
  // Line connector
  const lineNode = createNode('lineConnector', { x: 550, y: 150 }, storeUpdate);
  nodes.push(lineNode);
  
  // Output
  const outputNode = createNode('modelOutput', { x: 800, y: 150 }, storeUpdate);
  nodes.push(outputNode);
  
  edges.push(
    { id: 'e1', source: gridXNode.id, sourceHandle: 'value', target: pointNode.id, targetHandle: 'countX' },
    { id: 'e2', source: gridYNode.id, sourceHandle: 'value', target: pointNode.id, targetHandle: 'countY' },
    { id: 'e3', source: spacingNode.id, sourceHandle: 'value', target: pointNode.id, targetHandle: 'spacingX' },
    { id: 'e4', source: pointNode.id, sourceHandle: 'points', target: lineNode.id, targetHandle: 'points' },
    { id: 'e5', source: lineNode.id, sourceHandle: 'geometry', target: outputNode.id, targetHandle: 'geometry' },
  );
  
  return { nodes, edges };
}

// ============================================================================
// STORE
// ============================================================================

export const useParametricStore = create<ParametricState>()(
  persist(
    (set, get) => ({
      // Initial state
      nodes: [],
      edges: [],
      isExecuting: false,
      lastOutput: null,
      executionErrors: new Map(),
      selectedNodeId: null,
      isPanelOpen: true,
      
      // Add a new node
      addNode: (type, position) => {
        const { updateNodeData } = get();
        const newNode = createNode(type, position, updateNodeData);
        
        set((state) => ({
          nodes: [...state.nodes, newNode],
        }));
      },
      
      // Delete a node
      deleteNode: (nodeId) => {
        set((state) => ({
          nodes: state.nodes.filter((n) => n.id !== nodeId),
          edges: state.edges.filter(
            (e) => e.source !== nodeId && e.target !== nodeId
          ),
          selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        }));
      },
      
      // Update node data
      updateNodeData: (nodeId, data) => {
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === nodeId
              ? { ...node, data: { ...node.data, ...data } }
              : node
          ),
        }));
        
        // Auto-execute on changes
        setTimeout(() => get().execute(), 0);
      },
      
      // ReactFlow handlers
      onNodesChange: (changes) => {
        set((state) => ({
          nodes: applyNodeChanges(changes, state.nodes),
        }));
      },
      
      onEdgesChange: (changes) => {
        set((state) => ({
          edges: applyEdgeChanges(changes, state.edges),
        }));
      },
      
      onConnect: (connection) => {
        set((state) => ({
          edges: addEdge(
            {
              ...connection,
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#6366f1', strokeWidth: 2 },
            },
            state.edges
          ),
        }));
        
        // Execute after connection
        setTimeout(() => get().execute(), 0);
      },
      
      // Execute the graph
      execute: () => {
        const { nodes, edges } = get();
        
        if (nodes.length === 0) {
          set({ lastOutput: null });
          return null;
        }
        
        set({ isExecuting: true, executionErrors: new Map() });
        
        try {
          const engine = new ExecutionEngine();
          const output = engine.execute(nodes, edges);
          
          // Collect errors
          const errors = new Map<string, string>();
          for (const node of nodes) {
            const error = engine.getNodeError(node.id);
            if (error) {
              errors.set(node.id, error);
            }
          }
          
          set({
            isExecuting: false,
            lastOutput: output,
            executionErrors: errors,
          });
          
          return output;
        } catch (error) {
          set({
            isExecuting: false,
            executionErrors: new Map([['global', String(error)]]),
          });
          return null;
        }
      },
      
      // Clear the graph
      clearGraph: () => {
        set({
          nodes: [],
          edges: [],
          lastOutput: null,
          executionErrors: new Map(),
          selectedNodeId: null,
        });
      },
      
      // Selection
      setSelectedNode: (nodeId) => {
        set({ selectedNodeId: nodeId });
      },
      
      // Panel toggle
      togglePanel: () => {
        set((state) => ({ isPanelOpen: !state.isPanelOpen }));
      },
      
      // Load template
      loadTemplate: (template) => {
        const { updateNodeData, clearGraph } = get();
        clearGraph();
        
        let generated: { nodes: Node<ParametricNodeData>[]; edges: Edge[] };
        
        switch (template) {
          case 'portal-frame':
            generated = generatePortalFrameTemplate(updateNodeData);
            break;
          case 'truss':
            generated = generateTrussTemplate(updateNodeData);
            break;
          case 'grid':
            generated = generateGridTemplate(updateNodeData);
            break;
          default:
            return;
        }
        
        set({
          nodes: generated.nodes,
          edges: generated.edges,
        });
        
        // Execute after loading
        setTimeout(() => get().execute(), 100);
      },
    }),
    {
      name: 'beamlab-parametric',
      partialize: (state) => ({
        nodes: state.nodes.map((n) => ({
          ...n,
          data: { ...n.data, onUpdate: undefined, onApply: undefined },
        })),
        edges: state.edges,
        isPanelOpen: state.isPanelOpen,
      }),
    }
  )
);
