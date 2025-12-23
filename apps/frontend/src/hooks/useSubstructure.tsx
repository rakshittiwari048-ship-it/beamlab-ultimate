// @ts-nocheck
/**
 * useSubstructure.tsx
 * 
 * React hook for managing substructures and super elements.
 * Provides UI-friendly interface for:
 * - Selecting member groups
 * - Creating super elements via static condensation
 * - Managing super element library
 * - Integrating with global analysis
 */

import { useState, useCallback, useMemo, createContext, useContext, type ReactNode } from 'react';
import type {
  SubstructureManager,
  SubstructureNode,
  SubstructureMember,
  SuperElement,
  CreateSuperElementInput,
} from '@beamlab/analysis-engine';

// ============================================================================
// TYPES
// ============================================================================

export interface SubstructureSelection {
  nodeIds: Set<string>;
  memberIds: Set<string>;
  boundaryNodeIds: string[];
  name: string;
}

export interface SubstructureState {
  /** Currently selected nodes */
  selectedNodeIds: Set<string>;
  /** Currently selected members */
  selectedMemberIds: Set<string>;
  /** Identified boundary nodes for current selection */
  boundaryNodeIds: string[];
  /** All created super elements */
  superElements: SuperElement[];
  /** Is processing a condensation */
  isCondensing: boolean;
  /** Last error message */
  error: string | null;
  /** Processing progress (0-100) */
  progress: number;
}

export interface SubstructureActions {
  /** Select a node */
  selectNode: (nodeId: string) => void;
  /** Deselect a node */
  deselectNode: (nodeId: string) => void;
  /** Toggle node selection */
  toggleNode: (nodeId: string) => void;
  /** Select a member */
  selectMember: (memberId: string) => void;
  /** Deselect a member */
  deselectMember: (memberId: string) => void;
  /** Toggle member selection */
  toggleMember: (memberId: string) => void;
  /** Select all nodes of selected members */
  selectNodesOfSelectedMembers: () => void;
  /** Clear all selections */
  clearSelection: () => void;
  /** Set boundary nodes manually */
  setBoundaryNodes: (nodeIds: string[]) => void;
  /** Auto-detect boundary nodes */
  autoDetectBoundaryNodes: () => void;
  /** Create super element from current selection */
  createSuperElement: (name: string) => Promise<SuperElement | null>;
  /** Remove a super element */
  removeSuperElement: (id: string) => void;
  /** Clear all super elements */
  clearAllSuperElements: () => void;
  /** Export super element to JSON */
  exportSuperElement: (id: string) => string | null;
  /** Import super element from JSON */
  importSuperElement: (json: string) => SuperElement | null;
}

export interface SubstructureContext {
  state: SubstructureState;
  actions: SubstructureActions;
  manager: SubstructureManager | null;
}

// ============================================================================
// CONTEXT
// ============================================================================

const SubstructureContext = createContext<SubstructureContext | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface SubstructureProviderProps {
  children: ReactNode;
  /** SubstructureManager instance */
  manager: SubstructureManager;
  /** All nodes in the model */
  nodes: SubstructureNode[];
  /** All members in the model */
  members: SubstructureMember[];
}

export function SubstructureProvider({
  children,
  manager,
  nodes,
  members,
}: SubstructureProviderProps) {
  // State
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [boundaryNodeIds, setBoundaryNodeIds] = useState<string[]>([]);
  const [superElements, setSuperElements] = useState<SuperElement[]>([]);
  const [isCondensing, setIsCondensing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Create maps for quick lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, SubstructureNode>();
    nodes.forEach(n => map.set(n.id, n));
    return map;
  }, [nodes]);

  const memberMap = useMemo(() => {
    const map = new Map<string, SubstructureMember>();
    members.forEach(m => map.set(m.id, m));
    return map;
  }, [members]);

  // Get selected nodes/members as arrays
  const selectedNodes = useMemo(() => {
    return Array.from(selectedNodeIds)
      .map(id => nodeMap.get(id))
      .filter((n): n is SubstructureNode => n !== undefined);
  }, [selectedNodeIds, nodeMap]);

  const selectedMembers = useMemo(() => {
    return Array.from(selectedMemberIds)
      .map(id => memberMap.get(id))
      .filter((m): m is SubstructureMember => m !== undefined);
  }, [selectedMemberIds, memberMap]);

  // Actions
  const selectNode = useCallback((nodeId: string) => {
    setSelectedNodeIds(prev => new Set([...prev, nodeId]));
  }, []);

  const deselectNode = useCallback((nodeId: string) => {
    setSelectedNodeIds(prev => {
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
  }, []);

  const toggleNode = useCallback((nodeId: string) => {
    setSelectedNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const selectMember = useCallback((memberId: string) => {
    setSelectedMemberIds(prev => new Set([...prev, memberId]));
  }, []);

  const deselectMember = useCallback((memberId: string) => {
    setSelectedMemberIds(prev => {
      const next = new Set(prev);
      next.delete(memberId);
      return next;
    });
  }, []);

  const toggleMember = useCallback((memberId: string) => {
    setSelectedMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  }, []);

  const selectNodesOfSelectedMembers = useCallback(() => {
    const nodeIds = new Set<string>();
    
    for (const memberId of selectedMemberIds) {
      const member = memberMap.get(memberId);
      if (member) {
        nodeIds.add(member.startNodeId);
        nodeIds.add(member.endNodeId);
      }
    }
    
    setSelectedNodeIds(prev => new Set([...prev, ...nodeIds]));
  }, [selectedMemberIds, memberMap]);

  const clearSelection = useCallback(() => {
    setSelectedNodeIds(new Set());
    setSelectedMemberIds(new Set());
    setBoundaryNodeIds([]);
    setError(null);
  }, []);

  const setBoundaryNodesAction = useCallback((nodeIds: string[]) => {
    setBoundaryNodeIds(nodeIds);
  }, []);

  const autoDetectBoundaryNodes = useCallback(() => {
    // Import static method dynamically to avoid circular dependency
    const detected = findBoundaryNodes(
      selectedMemberIds,
      selectedNodes,
      members
    );
    setBoundaryNodeIds(detected);
  }, [selectedMemberIds, selectedNodes, members]);

  const createSuperElementAction = useCallback(async (name: string): Promise<SuperElement | null> => {
    if (!manager) {
      setError('SubstructureManager not initialized');
      return null;
    }

    if (selectedNodes.length < 2) {
      setError('Select at least 2 nodes');
      return null;
    }

    if (selectedMembers.length < 1) {
      setError('Select at least 1 member');
      return null;
    }

    if (boundaryNodeIds.length < 1) {
      setError('Specify at least 1 boundary node');
      return null;
    }

    setIsCondensing(true);
    setProgress(0);
    setError(null);

    try {
      // Simulate progress for user feedback
      setProgress(10);

      const input: CreateSuperElementInput = {
        id: `super-${Date.now()}`,
        name,
        nodes: selectedNodes,
        members: selectedMembers,
        boundaryNodeIds,
      };

      setProgress(30);

      // Create super element (this does the actual condensation)
      const superElement = manager.createSuperElement(input);

      setProgress(90);

      // Add to list
      setSuperElements(prev => [...prev, superElement]);

      // Clear selection
      clearSelection();

      setProgress(100);

      return superElement;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create super element';
      setError(message);
      console.error('[useSubstructure] Error:', err);
      return null;
    } finally {
      setIsCondensing(false);
    }
  }, [manager, selectedNodes, selectedMembers, boundaryNodeIds, clearSelection]);

  const removeSuperElementAction = useCallback((id: string) => {
    if (manager) {
      manager.removeSuperElement(id);
    }
    setSuperElements(prev => prev.filter(el => el.id !== id));
  }, [manager]);

  const clearAllSuperElements = useCallback(() => {
    if (manager) {
      manager.clear();
    }
    setSuperElements([]);
  }, [manager]);

  const exportSuperElementAction = useCallback((id: string): string | null => {
    const element = superElements.find(el => el.id === id);
    if (!element) return null;
    
    return JSON.stringify({
      ...element,
      createdAt: element.createdAt.toISOString(),
    }, null, 2);
  }, [superElements]);

  const importSuperElementAction = useCallback((json: string): SuperElement | null => {
    try {
      const data = JSON.parse(json);
      const element: SuperElement = {
        ...data,
        createdAt: new Date(data.createdAt),
      };
      
      // Add to manager if present
      if (manager) {
        // Manually add to manager's internal map via re-creation
        // This is a workaround since we don't have direct access
        const existing = manager.getSuperElement(element.id);
        if (!existing) {
          // Store reference
          setSuperElements(prev => [...prev, element]);
        }
      }
      
      return element;
    } catch (err) {
      setError('Failed to import super element');
      return null;
    }
  }, [manager]);

  // Build context value
  const state: SubstructureState = {
    selectedNodeIds,
    selectedMemberIds,
    boundaryNodeIds,
    superElements,
    isCondensing,
    error,
    progress,
  };

  const actions: SubstructureActions = {
    selectNode,
    deselectNode,
    toggleNode,
    selectMember,
    deselectMember,
    toggleMember,
    selectNodesOfSelectedMembers,
    clearSelection,
    setBoundaryNodes: setBoundaryNodesAction,
    autoDetectBoundaryNodes,
    createSuperElement: createSuperElementAction,
    removeSuperElement: removeSuperElementAction,
    clearAllSuperElements,
    exportSuperElement: exportSuperElementAction,
    importSuperElement: importSuperElementAction,
  };

  const contextValue: SubstructureContext = {
    state,
    actions,
    manager,
  };

  return (
    <SubstructureContext.Provider value={contextValue}>
      {children}
    </SubstructureContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Use the substructure context
 */
export function useSubstructure(): SubstructureContext {
  const context = useContext(SubstructureContext);
  
  if (!context) {
    throw new Error('useSubstructure must be used within a SubstructureProvider');
  }
  
  return context;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Find boundary nodes that connect to members outside the selection
 */
function findBoundaryNodes(
  selectedMemberIds: Set<string>,
  selectedNodes: SubstructureNode[],
  allMembers: SubstructureMember[]
): string[] {
  const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
  const boundaryNodeIds = new Set<string>();

  // Find nodes that have connections outside the selection
  for (const member of allMembers) {
    const startInSelection = selectedNodeIds.has(member.startNodeId);
    const endInSelection = selectedNodeIds.has(member.endNodeId);
    const memberInSelection = selectedMemberIds.has(member.id);

    if (!memberInSelection) {
      // External member - nodes connecting to it are boundary nodes
      if (startInSelection) boundaryNodeIds.add(member.startNodeId);
      if (endInSelection) boundaryNodeIds.add(member.endNodeId);
    }
  }

  // If no external connections, use extreme nodes
  if (boundaryNodeIds.size === 0 && selectedNodes.length >= 2) {
    // Find nodes at extreme positions
    let minX = Infinity, maxX = -Infinity;
    let minNode: SubstructureNode | null = null;
    let maxNode: SubstructureNode | null = null;

    for (const node of selectedNodes) {
      if (node.x < minX) {
        minX = node.x;
        minNode = node;
      }
      if (node.x > maxX) {
        maxX = node.x;
        maxNode = node;
      }
    }

    if (minNode) boundaryNodeIds.add(minNode.id);
    if (maxNode && maxNode.id !== minNode?.id) boundaryNodeIds.add(maxNode.id);
  }

  return Array.from(boundaryNodeIds);
}

/**
 * Calculate statistics for a selection
 */
export function calculateSelectionStats(
  selectedNodes: SubstructureNode[],
  selectedMembers: SubstructureMember[],
  boundaryNodeIds: string[]
): {
  numNodes: number;
  numMembers: number;
  numInternalNodes: number;
  numBoundaryNodes: number;
  originalDOFs: number;
  condensedDOFs: number;
  reductionPercent: number;
} {
  const numNodes = selectedNodes.length;
  const numMembers = selectedMembers.length;
  const numBoundaryNodes = boundaryNodeIds.length;
  const numInternalNodes = numNodes - numBoundaryNodes;
  
  const originalDOFs = numNodes * 6;
  const condensedDOFs = numBoundaryNodes * 6;
  const reductionPercent = originalDOFs > 0 
    ? ((originalDOFs - condensedDOFs) / originalDOFs) * 100 
    : 0;

  return {
    numNodes,
    numMembers,
    numInternalNodes,
    numBoundaryNodes,
    originalDOFs,
    condensedDOFs,
    reductionPercent,
  };
}
