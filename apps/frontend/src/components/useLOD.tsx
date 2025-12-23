import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { PerspectiveCamera } from 'three';

/**
 * LODManager - Level of Detail manager for extreme scales
 * 
 * Dynamically adjusts rendering quality based on camera distance:
 * - Close (< 50 units): Full detail (8x8 spheres, 6-segment cylinders)
 * - Medium (50-150 units): Reduced detail (6x6 spheres, 4-segment cylinders)
 * - Far (> 150 units): Minimal detail (4x4 spheres, 3-segment cylinders)
 * 
 * This hook can be used by renderers to adjust geometry complexity
 */

export type LODLevel = 'close' | 'medium' | 'far';

export interface LODSettings {
  level: LODLevel;
  nodeSphereSegments: number;
  memberCylinderSegments: number;
  nodeRadius: number;
  memberRadius: number;
}

export const useLOD = (): LODSettings => {
  const { camera } = useThree();
  const [lodLevel, setLodLevel] = useState<LODLevel>('close');
  const lastUpdateTimeRef = useRef(0);

  useFrame((state) => {
    // Update LOD level every 500ms (avoid constant recalculation)
    const now = state.clock.elapsedTime;
    if (now - lastUpdateTimeRef.current < 0.5) return;
    lastUpdateTimeRef.current = now;

    // Calculate average distance from camera to origin
    const cam = camera as PerspectiveCamera;
    const distance = cam.position.length();

    // Determine LOD level based on distance
    let newLevel: LODLevel = 'close';
    if (distance > 150) {
      newLevel = 'far';
    } else if (distance > 50) {
      newLevel = 'medium';
    }

    // Only update if level changed
    if (newLevel !== lodLevel) {
      setLodLevel(newLevel);
    }
  });

  // Return appropriate settings for current LOD level
  switch (lodLevel) {
    case 'far':
      return {
        level: 'far',
        nodeSphereSegments: 4, // 4x4 = 16 segments
        memberCylinderSegments: 3,
        nodeRadius: 0.15, // Slightly smaller for far view
        memberRadius: 0.04,
      };
    case 'medium':
      return {
        level: 'medium',
        nodeSphereSegments: 6, // 6x6 = 36 segments
        memberCylinderSegments: 4,
        nodeRadius: 0.18,
        memberRadius: 0.045,
      };
    case 'close':
    default:
      return {
        level: 'close',
        nodeSphereSegments: 8, // 8x8 = 64 segments
        memberCylinderSegments: 6,
        nodeRadius: 0.2,
        memberRadius: 0.05,
      };
  }
};

/**
 * LODDebugger - Visual feedback for current LOD level
 * 
 * Shows a small indicator in the viewport with current LOD status
 */
export const LODDebugger = () => {
  const lod = useLOD();

  const getColor = () => {
    switch (lod.level) {
      case 'far': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'close': return 'bg-green-500';
    }
  };

  return (
    <div className="absolute bottom-4 left-4 bg-gray-900/90 text-white px-3 py-2 rounded-lg shadow-lg backdrop-blur-sm text-xs">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${getColor()}`} />
        <span className="font-mono">
          LOD: {lod.level.toUpperCase()} 
          <span className="text-gray-400 ml-2">
            ({lod.nodeSphereSegments}×{lod.nodeSphereSegments} spheres)
          </span>
        </span>
      </div>
    </div>
  );
};
