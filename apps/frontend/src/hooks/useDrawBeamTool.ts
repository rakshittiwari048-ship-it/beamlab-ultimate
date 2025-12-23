import { useState, useCallback, useEffect } from 'react';
import { Vector3 } from 'three';
import { useModelStore, generateMemberId } from '../store/model';

/**
 * DrawBeamTool - State machine for two-point beam/member placement
 * 
 * State Machine:
 * IDLE -> (click node) -> WAITING_FOR_SECOND_POINT -> (click node) -> IDLE
 * 
 * Features:
 * - Click first node to start
 * - Ghost line preview from start to mouse cursor
 * - Click second node to create member
 * - Automatic state reset
 * 
 * Usage:
 * ```tsx
 * const beamTool = useDrawBeamTool();
 * 
 * // In your component
 * <DrawBeamGhostLine {...beamTool} />
 * 
 * // On node click
 * beamTool.handleNodeClick(nodeId, position);
 * ```
 */

export type DrawBeamState = 'IDLE' | 'WAITING_FOR_SECOND_POINT';

export interface DrawBeamToolState {
  state: DrawBeamState;
  startNodeId: string | null;
  startPosition: Vector3 | null;
  ghostEndPosition: Vector3 | null;
}

export interface DrawBeamToolActions {
  handleNodeClick: (nodeId: string, position: Vector3) => void;
  updateGhostPosition: (position: Vector3) => void;
  cancel: () => void;
  reset: () => void;
}

export type DrawBeamTool = DrawBeamToolState & DrawBeamToolActions;

/**
 * useDrawBeamTool - Hook for managing beam drawing state machine
 * 
 * @param sectionId - Default section ID for created members
 * @returns DrawBeamTool object with state and actions
 */
export const useDrawBeamTool = (sectionId: string = 'W12x26'): DrawBeamTool => {
  const [state, setState] = useState<DrawBeamState>('IDLE');
  const [startNodeId, setStartNodeId] = useState<string | null>(null);
  const [startPosition, setStartPosition] = useState<Vector3 | null>(null);
  const [ghostEndPosition, setGhostEndPosition] = useState<Vector3 | null>(null);

  const addMember = useModelStore((state) => state.addMember);

  /**
   * Handle node click - Main state machine logic
   */
  const handleNodeClick = useCallback((nodeId: string, position: Vector3) => {
    if (state === 'IDLE') {
      // First click: Store start node and transition to WAITING_FOR_SECOND_POINT
      console.log(`[DrawBeamTool] Selected start node: ${nodeId}`);
      setStartNodeId(nodeId);
      setStartPosition(position.clone());
      setState('WAITING_FOR_SECOND_POINT');
      
    } else if (state === 'WAITING_FOR_SECOND_POINT' && startNodeId) {
      // Second click: Create member and reset to IDLE
      
      // Prevent self-connection
      if (nodeId === startNodeId) {
        console.warn('[DrawBeamTool] Cannot connect node to itself');
        return;
      }

      // Create the member
      const memberId = generateMemberId();
      addMember({
        id: memberId,
        startNodeId: startNodeId,
        endNodeId: nodeId,
        sectionId: sectionId,
      });

      console.log(`[DrawBeamTool] Created member ${memberId}: ${startNodeId} -> ${nodeId}`);

      // Reset to IDLE
      setStartNodeId(null);
      setStartPosition(null);
      setGhostEndPosition(null);
      setState('IDLE');
    }
  }, [state, startNodeId, addMember, sectionId]);

  /**
   * Update ghost line end position (called on mouse move)
   */
  const updateGhostPosition = useCallback((position: Vector3) => {
    if (state === 'WAITING_FOR_SECOND_POINT') {
      setGhostEndPosition(position.clone());
    }
  }, [state]);

  /**
   * Cancel current operation and return to IDLE
   */
  const cancel = useCallback(() => {
    console.log('[DrawBeamTool] Cancelled');
    setStartNodeId(null);
    setStartPosition(null);
    setGhostEndPosition(null);
    setState('IDLE');
  }, []);

  /**
   * Reset tool (alias for cancel)
   */
  const reset = cancel;

  // Cancel on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state === 'WAITING_FOR_SECOND_POINT') {
        cancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, cancel]);

  return {
    state,
    startNodeId,
    startPosition,
    ghostEndPosition,
    handleNodeClick,
    updateGhostPosition,
    cancel,
    reset,
  };
};
