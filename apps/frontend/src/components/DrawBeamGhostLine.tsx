import { FC } from 'react';
import { Vector3, Quaternion } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { DrawBeamTool } from '../hooks/useDrawBeamTool';

/**
 * DrawBeamGhostLine - Visual preview of beam being drawn
 * 
 * Shows a semi-transparent line from the start node to the current cursor position
 * when in WAITING_FOR_SECOND_POINT state.
 * 
 * Features:
 * - Updates in real-time with cursor movement
 * - Shows start and end node previews
 * - Displays distance text
 * - Auto-rotates cylinder to align with direction
 * 
 * Usage:
 * ```tsx
 * const beamTool = useDrawBeamTool();
 * 
 * <DrawBeamGhostLine
 *   state={beamTool.state}
 *   startPosition={beamTool.startPosition}
 *   ghostEndPosition={beamTool.ghostEndPosition}
 * />
 * ```
 */

interface DrawBeamGhostLineProps {
  state: DrawBeamTool['state'];
  startPosition: DrawBeamTool['startPosition'];
  ghostEndPosition: DrawBeamTool['ghostEndPosition'];
  color?: string;
  opacity?: number;
  showNodes?: boolean;
  showDistance?: boolean;
}

export const DrawBeamGhostLine: FC<DrawBeamGhostLineProps> = ({
  state,
  startPosition,
  ghostEndPosition,
  color = '#10b981', // Green
  opacity = 0.6,
  showNodes = true,
  showDistance = false,
}) => {
  const { raycaster, pointer, camera } = useThree();

  // Update ghost end position on mouse move
  useFrame(() => {
    if (state === 'WAITING_FOR_SECOND_POINT' && startPosition) {
      // Raycast to get cursor position in 3D space
      raycaster.setFromCamera(pointer, camera);
      
      // Intersect with horizontal plane at y=0
      const plane = new Vector3(0, 1, 0); // Normal vector pointing up
      const planePoint = new Vector3(0, 0, 0); // Point on plane
      const intersection = new Vector3();
      
      // Calculate intersection
      const distance = raycaster.ray.distanceToPlane(
        new (window as any).THREE.Plane().setFromNormalAndCoplanarPoint(plane, planePoint)
      );
      
      if (distance !== null && distance >= 0) {
        raycaster.ray.at(distance, intersection);
        // Update is handled by parent component
      }
    }
  });

  // Don't render if not in drawing state
  if (state !== 'WAITING_FOR_SECOND_POINT' || !startPosition || !ghostEndPosition) {
    return null;
  }

  // Calculate midpoint and direction
  const midpoint = new Vector3().lerpVectors(startPosition, ghostEndPosition, 0.5);
  const direction = new Vector3().subVectors(ghostEndPosition, startPosition);
  const length = direction.length();

  // Don't render if length is too small
  if (length < 0.01) {
    return (
      <>
        {/* Just show start node */}
        {showNodes && (
          <mesh position={startPosition}>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshBasicMaterial color={color} transparent opacity={opacity} />
          </mesh>
        )}
      </>
    );
  }

  // Calculate rotation to align cylinder with direction
  direction.normalize();
  const quaternion = new Quaternion();
  quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction);

  return (
    <group>
      {/* Start Node Preview */}
      {showNodes && (
        <mesh position={startPosition}>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={opacity} />
          
          {/* Glow ring */}
          <mesh>
            <ringGeometry args={[0.3, 0.35, 32]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={opacity * 0.5}
              side={2} // DoubleSide
            />
          </mesh>
        </mesh>
      )}

      {/* Ghost Line (Cylinder) */}
      <mesh position={midpoint} quaternion={quaternion}>
        <cylinderGeometry args={[0.08, 0.08, length, 8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          depthTest={true}
        />
      </mesh>

      {/* End Node Preview */}
      {showNodes && (
        <mesh position={ghostEndPosition}>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={opacity * 0.8} />
        </mesh>
      )}

      {/* Distance Label (Optional) */}
      {showDistance && (
        <group position={midpoint}>
          {/* TODO: Add Text component for distance display */}
          {/* <Text fontSize={0.3} color={color}>
            {length.toFixed(2)} m
          </Text> */}
        </group>
      )}
    </group>
  );
};

/**
 * DrawBeamCursor - Shows where beam endpoint will snap
 * 
 * Highlights nodes when hovering over them during beam placement
 */
interface DrawBeamCursorProps {
  state: DrawBeamTool['state'];
  hoveredNodeId: string | null;
  nodePosition: Vector3 | null;
}

export const DrawBeamCursor: FC<DrawBeamCursorProps> = ({
  state,
  hoveredNodeId,
  nodePosition,
}) => {
  if (state !== 'WAITING_FOR_SECOND_POINT' || !hoveredNodeId || !nodePosition) {
    return null;
  }

  return (
    <group position={nodePosition}>
      {/* Pulsing ring to indicate snap target */}
      <mesh>
        <ringGeometry args={[0.35, 0.45, 32]} />
        <meshBasicMaterial
          color="#10b981"
          transparent
          opacity={0.8}
          side={2} // DoubleSide
        />
      </mesh>
      
      {/* Larger outer ring */}
      <mesh>
        <ringGeometry args={[0.5, 0.55, 32]} />
        <meshBasicMaterial
          color="#10b981"
          transparent
          opacity={0.4}
          side={2} // DoubleSide
        />
      </mesh>
    </group>
  );
};
