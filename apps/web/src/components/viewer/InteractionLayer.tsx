/**
 * InteractionLayer.tsx
 *
 * Advanced 3D Drawing Tool for Structural Members
 * Features:
 * - State machine for continuous drawing workflow
 * - Real-time ghost preview with dashed lines
 * - Smart grid snapping (0.5m intervals)
 * - Node proximity snapping (0.2m threshold)
 * - Visual feedback (snap indicators, start nodes)
 * - Keyboard shortcuts (ESC to cancel, continuous chaining)
 */

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Line, Sphere, Ring } from '@react-three/drei';
import * as THREE from 'three';
import { Vector3, Raycaster, Plane } from 'three';

// ============================================================================
// TYPES
// ============================================================================

/** Drawing state machine */
type DrawingState = 'IDLE' | 'PLACING_START' | 'PLACING_END';

/** 3D coordinate tuple */
type Coordinate = [number, number, number];

export interface InteractionLayerProps {
  /** Existing nodes in the scene for snap detection */
  existingNodes?: Array<{ id: string; position: Coordinate }>;
  
  /** Callback when a new member is added */
  onAddMember?: (member: { start: Coordinate; end: Coordinate }) => void;
  
  /** Whether the pen tool is active */
  isActive?: boolean;
  
  /** Grid snap interval (default: 0.5m) */
  gridSnapSize?: number;
  
  /** Node snap threshold (default: 0.2m) */
  nodeSnapThreshold?: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Snap a value to the nearest grid interval
 * Example: snapToGrid(3.7, 0.5) => 3.5
 */
const snapToGrid = (value: number, gridSize: number): number => {
  return Math.round(value / gridSize) * gridSize;
};

/**
 * Snap a 3D position to the grid
 */
const snapPositionToGrid = (
  position: Vector3,
  gridSize: number
): Vector3 => {
  return new Vector3(
    snapToGrid(position.x, gridSize),
    snapToGrid(position.y, gridSize),
    snapToGrid(position.z, gridSize)
  );
};

/**
 * Check if cursor is near an existing node
 * Returns the node's position if within threshold, otherwise null
 */
const findNearbyNode = (
  cursorPos: Vector3,
  nodes: Array<{ position: Coordinate }>,
  threshold: number
): Vector3 | null => {
  for (const node of nodes) {
    const nodePos = new Vector3(...node.position);
    const distance = cursorPos.distanceTo(nodePos);
    
    if (distance < threshold) {
      return nodePos;
    }
  }
  return null;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const InteractionLayer: React.FC<InteractionLayerProps> = ({
  existingNodes = [],
  onAddMember,
  isActive = true,
  gridSnapSize = 0.5,
  nodeSnapThreshold = 0.2,
}) => {
  // ──────────────────────────────────────────────────────────────────────────
  // STATE MACHINE
  // ──────────────────────────────────────────────────────────────────────────
  
  const [drawingState, setDrawingState] = useState<DrawingState>('IDLE');
  const [startNode, setStartNode] = useState<Vector3 | null>(null);
  const [tempNode, setTempNode] = useState<Vector3 | null>(null);
  const [snappedToExistingNode, setSnappedToExistingNode] = useState(false);

  // ──────────────────────────────────────────────────────────────────────────
  // REFS & THREE.JS SETUP
  // ──────────────────────────────────────────────────────────────────────────
  
  const { camera, raycaster, gl, scene } = useThree();
  const groundPlane = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), []);
  const mouse = useRef(new THREE.Vector2());
  const intersectionPoint = useRef(new Vector3());

  // ──────────────────────────────────────────────────────────────────────────
  // MOUSE MOVEMENT HANDLER
  // ──────────────────────────────────────────────────────────────────────────
  
  const updateCursorPosition = (event: PointerEvent) => {
    if (!isActive) return;

    const canvas = gl.domElement;
    const rect = canvas.getBoundingClientRect();
    
    // Normalize mouse coordinates (-1 to +1)
    mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycast to ground plane (y = 0)
    raycaster.setFromCamera(mouse.current, camera);
    raycaster.ray.intersectPlane(groundPlane, intersectionPoint.current);

    if (intersectionPoint.current) {
      let finalPosition = intersectionPoint.current.clone();

      // Check if near an existing node (PRIORITY: snap to nodes first)
      const nearbyNode = findNearbyNode(
        finalPosition,
        existingNodes,
        nodeSnapThreshold
      );

      if (nearbyNode) {
        finalPosition = nearbyNode;
        setSnappedToExistingNode(true);
      } else {
        // Snap to grid if not near a node
        finalPosition = snapPositionToGrid(finalPosition, gridSnapSize);
        setSnappedToExistingNode(false);
      }

      setTempNode(finalPosition);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // CLICK HANDLER (STATE MACHINE TRANSITIONS)
  // ──────────────────────────────────────────────────────────────────────────
  
  const handleClick = (event: PointerEvent) => {
    if (!isActive || !tempNode) return;

    // Prevent clicks on UI elements
    if ((event.target as HTMLElement).tagName !== 'CANVAS') return;

    if (drawingState === 'IDLE' || drawingState === 'PLACING_START') {
      // CLICK 1: Set start node
      setStartNode(tempNode.clone());
      setDrawingState('PLACING_END');
      
    } else if (drawingState === 'PLACING_END' && startNode) {
      // CLICK 2: Set end node and create member
      const start: Coordinate = [startNode.x, startNode.y, startNode.z];
      const end: Coordinate = [tempNode.x, tempNode.y, tempNode.z];

      // Prevent zero-length members
      if (startNode.distanceTo(tempNode) < 0.01) {
        console.warn('Cannot create zero-length member');
        return;
      }

      // Trigger callback
      onAddMember?.({ start, end });

      // CONTINUOUS DRAWING CHAIN: reset to placing start for next segment
      setStartNode(null);
      setDrawingState('PLACING_START');
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RIGHT-CLICK / ESC HANDLER (CANCEL DRAWING)
  // ──────────────────────────────────────────────────────────────────────────
  
  const handleRightClick = (event: MouseEvent) => {
    if (!isActive) return;
    event.preventDefault();
    cancelDrawing();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isActive) return;
    
    if (event.key === 'Escape') {
      cancelDrawing();
    }
  };

  const cancelDrawing = () => {
    setDrawingState('IDLE');
    setStartNode(null);
    setTempNode(null);
    setSnappedToExistingNode(false);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // EVENT LISTENERS LIFECYCLE
  // ──────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    const canvas = gl.domElement;
    
    canvas.addEventListener('pointermove', updateCursorPosition);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('contextmenu', handleRightClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      canvas.removeEventListener('pointermove', updateCursorPosition);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('contextmenu', handleRightClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, drawingState, startNode, tempNode, existingNodes]);

  // ──────────────────────────────────────────────────────────────────────────
  // AUTO-ACTIVATE DRAWING ON MOUNT
  // ──────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    if (isActive && drawingState === 'IDLE') {
      setDrawingState('PLACING_START');
    }
  }, [isActive]);

  // ──────────────────────────────────────────────────────────────────────────
  // CLEANUP ON DEACTIVATION
  // ──────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    if (!isActive) {
      cancelDrawing();
    }
  }, [isActive]);

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER: VISUAL FEEDBACK
  // ──────────────────────────────────────────────────────────────────────────
  
  if (!isActive) return null;

  return (
    <group name="interaction-layer">
      {/* ===================================================================== */}
      {/* SNAP INDICATOR: Red ring when hovering over existing node */}
      {/* ===================================================================== */}
      {tempNode && snappedToExistingNode && (
        <Ring
          position={[tempNode.x, tempNode.y + 0.01, tempNode.z]}
          args={[0.15, 0.25, 32]} // inner radius, outer radius, segments
          rotation={[-Math.PI / 2, 0, 0]} // Flat on ground
        >
          <meshBasicMaterial color="#ff3333" transparent opacity={0.8} />
        </Ring>
      )}

      {/* ===================================================================== */}
      {/* START NODE INDICATOR: Small green sphere at first click */}
      {/* ===================================================================== */}
      {startNode && drawingState === 'PLACING_END' && (
        <Sphere
          position={[startNode.x, startNode.y, startNode.z]}
          args={[0.1, 16, 16]}
        >
          <meshStandardMaterial 
            color="#00ff00" 
            emissive="#00ff00"
            emissiveIntensity={0.5}
          />
        </Sphere>
      )}

      {/* ===================================================================== */}
      {/* CURSOR PREVIEW: Small white sphere following cursor */}
      {/* ===================================================================== */}
      {tempNode && (
        <Sphere
          position={[tempNode.x, tempNode.y, tempNode.z]}
          args={[0.08, 12, 12]}
        >
          <meshBasicMaterial 
            color={snappedToExistingNode ? '#ff3333' : '#ffffff'} 
            transparent 
            opacity={0.7}
          />
        </Sphere>
      )}

      {/* ===================================================================== */}
      {/* GHOST MEMBER: Dashed line showing preview of beam being drawn */}
      {/* ===================================================================== */}
      {drawingState === 'PLACING_END' && startNode && tempNode && (
        <GhostMember 
          start={startNode} 
          end={tempNode}
          isSnapped={snappedToExistingNode}
        />
      )}
    </group>
  );
};

// ============================================================================
// GHOST MEMBER COMPONENT (Dashed Preview Line)
// ============================================================================

interface GhostMemberProps {
  start: Vector3;
  end: Vector3;
  isSnapped: boolean;
}

const GhostMember: React.FC<GhostMemberProps> = ({ start, end, isSnapped }) => {
  const lineRef = useRef<THREE.Line>(null);

  // Animated dashing effect
  useFrame(({ clock }) => {
    if (lineRef.current && lineRef.current.material) {
      const material = lineRef.current.material as THREE.LineDashedMaterial;
      material.dashOffset = -clock.getElapsedTime() * 2; // Animate dash flow
    }
  });

  const points = useMemo(() => [start, end], [start, end]);

  return (
    <Line
      ref={lineRef}
      points={points}
      color={isSnapped ? '#ff6600' : '#00aaff'} // Orange if snapped, blue otherwise
      lineWidth={2}
      dashed
      dashSize={0.3}
      gapSize={0.15}
    />
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default InteractionLayer;
