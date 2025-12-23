import { FC, useCallback, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import type { Group, Mesh } from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { ViewportType } from '../store/viewport';

/**
 * InteractionManager - Handles 3D viewport interaction
 * 
 * Features:
 * - Raycasts against invisible interaction plane (orientation based on viewport)
 * - Snaps cursor to grid for precise placement
 * - Shows ghost cursor (semi-transparent sphere) at snapped position
 * - Dispatches coordinates to parent tool handler on click
 * - Supports TOP, FRONT, RIGHT, and 3D views
 * 
 * Usage:
 * ```tsx
 * <InteractionManager
 *   enabled={true}
 *   viewportType="TOP"
 *   gridStep={1.0}
 *   onPointerDown={(x, y, z) => {
 *     // Handle node/member creation
 *   }}
 * />
 * ```
 */

interface InteractionManagerProps {
  /** Enable/disable interaction */
  enabled?: boolean;
  /** Current viewport type (determines plane orientation) */
  viewportType?: ViewportType;
  /** Grid snap step size (default: 1.0) */
  gridStep?: number;
  /** Show ghost cursor */
  showCursor?: boolean;
  /** Cursor color */
  cursorColor?: string;
  /** Cursor opacity */
  cursorOpacity?: number;
  /** Callback when user clicks on the interaction plane */
  onPointerDown?: (x: number, y: number, z: number) => void;
}

/**
 * snapToGrid - Snaps a point to the nearest grid intersection
 * 
 * @param point - World space point to snap
 * @param step - Grid step size
 * @param viewportType - Current viewport type (determines which coordinate to keep fixed)
 * @returns Snapped point
 */
const snapToGridInto = (out: Vector3, point: Vector3, step: number = 1.0, viewportType: ViewportType = 'TOP'): Vector3 => {
  // Snap based on viewport orientation:
  // TOP: plane at y=0, snap x and z
  // FRONT: plane at z=0, snap x and y
  // RIGHT: plane at x=0, snap y and z
  // 3D: plane at y=0, snap x and z (same as TOP)
  
  switch (viewportType) {
    case 'FRONT':
      // Looking along Z-axis, plane at z=0
      out.set(
        Math.round(point.x / step) * step,
        Math.round(point.y / step) * step,
        0
      );
      break;
    case 'RIGHT':
      // Looking along X-axis, plane at x=0
      out.set(
        0,
        Math.round(point.y / step) * step,
        Math.round(point.z / step) * step
      );
      break;
    case 'TOP':
    case '3D':
    default:
      // Looking down at y=0 plane, snap x and z
      out.set(
        Math.round(point.x / step) * step,
        0,
        Math.round(point.z / step) * step
      );
      break;
  }
  return out;
};

/**
 * snapToGrid - Snaps a point to the nearest grid intersection
 */
const snapToGrid = (point: Vector3, step: number = 1.0, viewportType: ViewportType = 'TOP'): Vector3 => {
  return snapToGridInto(new Vector3(), point, step, viewportType);
};

export const InteractionManager: FC<InteractionManagerProps> = ({
  enabled = true,
  viewportType = 'TOP',
  gridStep = 1.0,
  showCursor = true,
  cursorColor = '#60a5fa',
  cursorOpacity = 0.5,
  onPointerDown,
}) => {
  // Access Three.js scene context
  const { raycaster, pointer, camera } = useThree();
  
  // Interaction plane mesh (invisible but raycastable)
  const planeRef = useRef<Mesh | null>(null);

  // Cursor state is only for show/hide toggling; position is driven via refs for perf.
  const [hasCursor, setHasCursor] = useState(false);
  const cursorGroupRef = useRef<Group | null>(null);

  // Reusable objects to minimize GC
  const intersectionPoint = useRef(new Vector3());
  const snappedPoint = useRef(new Vector3());
  
  // Update ghost cursor position every frame
  useFrame(() => {
    if (!enabled || !planeRef.current) {
      if (hasCursor) setHasCursor(false);
      return;
    }

    // Update raycaster from camera and pointer
    raycaster.setFromCamera(pointer, camera);

    // Raycast against the actual interaction plane mesh at y=0
    const hits = raycaster.intersectObject(planeRef.current, false);
    const hit = hits[0];
    if (!hit) {
      if (hasCursor) setHasCursor(false);
      return;
    }

    intersectionPoint.current.copy(hit.point);
    snapToGridInto(snappedPoint.current, intersectionPoint.current, gridStep, viewportType);

    // Move cursor group directly (no per-frame React state updates)
    if (cursorGroupRef.current) {
      cursorGroupRef.current.position.copy(snappedPoint.current);
    }

    if (!hasCursor) setHasCursor(true);
  });

  // Handle pointer down event
  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (!enabled || !onPointerDown) return;

      // Dispatch snapped coordinates to parent tool handler.
      // Snap from the actual click intersection point (avoids stale cursor coords).
      intersectionPoint.current.copy(e.point);
      snappedPoint.current.copy(snapToGrid(intersectionPoint.current, gridStep, viewportType));

      if (cursorGroupRef.current) {
        cursorGroupRef.current.position.copy(snappedPoint.current);
      }

      onPointerDown(snappedPoint.current.x, snappedPoint.current.y, snappedPoint.current.z);
    },
    [enabled, gridStep, viewportType, onPointerDown]
  );

  // Calculate plane rotation based on viewport
  const planeRotation: [number, number, number] = (() => {
    switch (viewportType) {
      case 'FRONT':
        // XY plane (perpendicular to Z-axis)
        return [0, 0, 0];
      case 'RIGHT':
        // YZ plane (perpendicular to X-axis)
        return [0, Math.PI / 2, 0];
      case 'TOP':
      case '3D':
      default:
        // XZ plane (perpendicular to Y-axis)
        return [-Math.PI / 2, 0, 0];
    }
  })();

  return (
    <group>
      {/* Invisible Interaction Plane */}
      <mesh
        ref={planeRef}
        rotation={planeRotation}
        position={[0, 0, 0]}
        onPointerDown={handlePointerDown}
      >
        {/* Large plane to catch all pointer events */}
        <planeGeometry args={[1000, 1000]} />
        {/* Must remain visible=true for R3F pointer events; make it visually invisible instead. */}
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Ghost Cursor */}
      {enabled && showCursor && hasCursor && (
        <group ref={cursorGroupRef}>
          <mesh>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshBasicMaterial
              color={cursorColor}
              transparent
              opacity={cursorOpacity}
              depthTest={true}
              depthWrite={false}
            />
          </mesh>

          {/* Cursor ring for better visibility */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.35, 0.4, 32]} />
            <meshBasicMaterial
              color={cursorColor}
              transparent
              opacity={cursorOpacity * 0.7}
              depthTest={true}
              depthWrite={false}
              side={2} // DoubleSide
            />
          </mesh>

          {/* Optional: Grid visual helper (follows the cursor group) */}
          <group>
            {/* X-axis indicator */}
            <mesh position={[gridStep / 2, 0.05, 0]}>
              <boxGeometry args={[gridStep, 0.02, 0.02]} />
              <meshBasicMaterial color="#ef4444" transparent opacity={0.3} />
            </mesh>

            {/* Z-axis indicator */}
            <mesh position={[0, 0.05, gridStep / 2]}>
              <boxGeometry args={[0.02, 0.02, gridStep]} />
              <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
};

/**
 * useInteractionState - Hook for managing interaction state in parent components
 * 
 * Example usage:
 * ```tsx
 * const { startPoint, setStartPoint, endPoint, setEndPoint, reset } = useInteractionState();
 * 
 * // When placing first node
 * setStartPoint(x, y, z);
 * 
 * // When placing second node (for member)
 * setEndPoint(x, y, z);
 * 
 * // Reset after creation
 * reset();
 * ```
 */
export const useInteractionState = () => {
  const [startPoint, setStartPoint] = useState<Vector3 | null>(null);
  const [endPoint, setEndPoint] = useState<Vector3 | null>(null);

  const reset = useCallback(() => {
    setStartPoint(null);
    setEndPoint(null);
  }, []);

  return {
    startPoint,
    setStartPoint: (x: number, y: number, z: number) => setStartPoint(new Vector3(x, y, z)),
    endPoint,
    setEndPoint: (x: number, y: number, z: number) => setEndPoint(new Vector3(x, y, z)),
    reset,
  };
};

/**
 * InteractionPreview - Shows temporary preview of what will be created
 * 
 * Usage:
 * ```tsx
 * <InteractionPreview
 *   startPoint={startPoint}
 *   endPoint={cursorPosition}
 *   mode="member" // or "node"
 * />
 * ```
 */
interface InteractionPreviewProps {
  startPoint: Vector3 | null;
  endPoint: Vector3 | null;
  mode: 'node' | 'member';
}

export const InteractionPreview: FC<InteractionPreviewProps> = ({
  startPoint,
  endPoint,
  mode,
}) => {
  if (!startPoint) return null;

  if (mode === 'node') {
    // Show single preview node
    return (
      <mesh position={startPoint}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.6} wireframe />
      </mesh>
    );
  }

  if (mode === 'member' && endPoint) {
    // Show preview line from start to end
    const midpoint = new Vector3().lerpVectors(startPoint, endPoint, 0.5);
    const direction = new Vector3().subVectors(endPoint, startPoint);
    const length = direction.length();
    
    if (length < 0.01) return null;

    return (
      <group>
        {/* Start node preview */}
        <mesh position={startPoint}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshBasicMaterial color="#10b981" transparent opacity={0.6} />
        </mesh>

        {/* Member line preview */}
        <mesh position={midpoint} rotation={[Math.PI / 2, 0, Math.atan2(direction.x, direction.z)]}>
          <cylinderGeometry args={[0.05, 0.05, length, 6]} />
          <meshBasicMaterial color="#10b981" transparent opacity={0.6} wireframe />
        </mesh>

        {/* End node preview */}
        <mesh position={endPoint}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshBasicMaterial color="#10b981" transparent opacity={0.6} />
        </mesh>
      </group>
    );
  }

  return null;
};
