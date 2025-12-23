/**
 * Overlays.tsx
 *
 * HTML Overlays for 3D Canvas
 * - Node Labels with LOD (Level of Detail)
 * - Load Value Labels
 * - ViewCube (absolute positioned overlay)
 *
 * Uses @react-three/drei Html component for 3D-positioned overlays
 */

import { useMemo, useState, useCallback, type ReactNode } from 'react';
import { Html } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import { clsx } from 'clsx';
import * as THREE from 'three';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Node3D {
  id: string | number;
  x: number;
  y: number;
  z: number;
  label?: string;
}

export interface Load3D {
  id: string | number;
  nodeId: string | number;
  x: number;
  y: number;
  z: number;
  magnitude: number;
  unit?: string;
  type: 'point' | 'moment' | 'distributed';
  direction: [number, number, number];
}

export interface NodeLabelsProps {
  /** Array of nodes to label */
  nodes: Node3D[];
  /** Whether labels are visible */
  visible?: boolean;
  /** Maximum distance from camera to show labels */
  maxDistance?: number;
  /** Minimum distance factor for scaling */
  distanceFactor?: number;
  /** Custom class name for label */
  className?: string;
  /** Click handler for node label */
  onNodeClick?: (nodeId: string | number) => void;
}

export interface LoadLabelsProps {
  /** Array of loads to label */
  loads: Load3D[];
  /** Whether labels are visible */
  visible?: boolean;
  /** Custom class name for label */
  className?: string;
}

export interface ViewCubeProps {
  /** Size of the ViewCube in pixels */
  size?: number;
  /** On face click handler */
  onFaceClick?: (face: ViewCubeFace) => void;
  /** Custom class name */
  className?: string;
}

export type ViewCubeFace =
  | 'front'
  | 'back'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'iso';

// ============================================================================
// NODE LABELS COMPONENT
// ============================================================================

/**
 * Renders 3D-positioned node labels with LOD (Level of Detail).
 * Labels automatically hide when camera is too far from the node.
 */
export function NodeLabels({
  nodes,
  visible = true,
  maxDistance = 50,
  distanceFactor = 10,
  className,
  onNodeClick,
}: NodeLabelsProps) {
  if (!visible || nodes.length === 0) return null;

  return (
    <group name="node-labels">
      {nodes.map((node) => (
        <NodeLabel
          key={node.id}
          node={node}
          maxDistance={maxDistance}
          distanceFactor={distanceFactor}
          className={className}
          onClick={onNodeClick}
        />
      ))}
    </group>
  );
}

/**
 * Individual node label with distance-based visibility.
 */
function NodeLabel({
  node,
  maxDistance,
  distanceFactor,
  className,
  onClick,
}: {
  node: Node3D;
  maxDistance: number;
  distanceFactor: number;
  className?: string;
  onClick?: (nodeId: string | number) => void;
}) {
  const [isVisible, setIsVisible] = useState(true);
  const { camera } = useThree();

  // Check distance on each frame for LOD
  useFrame(() => {
    const nodePosition = new THREE.Vector3(node.x, node.y, node.z);
    const distance = camera.position.distanceTo(nodePosition);
    setIsVisible(distance <= maxDistance);
  });

  if (!isVisible) return null;

  return (
    <Html
      position={[node.x, node.y, node.z]}
      center
      distanceFactor={distanceFactor}
      zIndexRange={[100, 0]}
      occlude="blending"
      sprite
    >
      <button
        onClick={() => onClick?.(node.id)}
        className={clsx(
          // Base styles
          'px-1.5 py-0.5 rounded text-[10px] font-mono font-medium',
          'bg-blue-600 text-white',
          'border border-blue-400',
          'shadow-sm shadow-black/20',
          'cursor-pointer hover:bg-blue-500 transition-colors',
          'select-none whitespace-nowrap',
          // Prevent text selection on double click
          'pointer-events-auto',
          className
        )}
      >
        {node.label || `N${node.id}`}
      </button>
    </Html>
  );
}

// ============================================================================
// LOAD LABELS COMPONENT
// ============================================================================

/**
 * Renders load magnitude labels next to load arrows.
 */
export function LoadLabels({
  loads,
  visible = true,
  className,
}: LoadLabelsProps) {
  if (!visible || loads.length === 0) return null;

  return (
    <group name="load-labels">
      {loads.map((load) => (
        <LoadLabel key={load.id} load={load} className={className} />
      ))}
    </group>
  );
}

/**
 * Individual load value label.
 */
function LoadLabel({
  load,
  className,
}: {
  load: Load3D;
  className?: string;
}) {
  // Offset the label slightly in the load direction
  const offset = useMemo(() => {
    const dir = new THREE.Vector3(...load.direction).normalize();
    return dir.multiplyScalar(0.5);
  }, [load.direction]);

  // Format magnitude with unit
  const displayValue = useMemo(() => {
    const unit = load.unit || 'kN';
    const magnitude = Math.abs(load.magnitude);

    // Format large/small numbers appropriately
    if (magnitude >= 1000) {
      return `${(magnitude / 1000).toFixed(1)}M${unit.replace('k', '')}`;
    } else if (magnitude < 0.01) {
      return `${(magnitude * 1000).toFixed(1)}${unit.replace('k', '')}`;
    } else if (magnitude >= 100) {
      return `${magnitude.toFixed(0)}${unit}`;
    } else {
      return `${magnitude.toFixed(1)}${unit}`;
    }
  }, [load.magnitude, load.unit]);

  return (
    <Html
      position={[
        load.x + offset.x,
        load.y + offset.y,
        load.z + offset.z,
      ]}
      center
      distanceFactor={8}
      zIndexRange={[90, 0]}
      sprite
    >
      <div
        className={clsx(
          // Specified styles
          'bg-black/80 text-white text-[10px] px-1 rounded backdrop-blur-sm',
          // Additional styles
          'font-mono font-medium whitespace-nowrap',
          'border border-white/10',
          'shadow-lg shadow-black/30',
          'pointer-events-none select-none',
          className
        )}
      >
        {displayValue}
      </div>
    </Html>
  );
}

// ============================================================================
// VIEWCUBE COMPONENT (Absolute Overlay)
// ============================================================================

/**
 * Interactive ViewCube overlay positioned in the top-right corner.
 * This is NOT inside the 3D scene, but overlaid on top using CSS.
 */
export function ViewCube({
  size = 80,
  onFaceClick,
  className,
}: ViewCubeProps) {
  const [hoveredFace, setHoveredFace] = useState<ViewCubeFace | null>(null);

  const handleFaceClick = useCallback(
    (face: ViewCubeFace) => {
      onFaceClick?.(face);
    },
    [onFaceClick]
  );

  // Face configurations
  const faces: Array<{
    id: ViewCubeFace;
    label: string;
    transform: string;
  }> = [
    { id: 'front', label: 'FRONT', transform: 'translateZ(20px)' },
    { id: 'back', label: 'BACK', transform: 'rotateY(180deg) translateZ(20px)' },
    { id: 'left', label: 'LEFT', transform: 'rotateY(-90deg) translateZ(20px)' },
    { id: 'right', label: 'RIGHT', transform: 'rotateY(90deg) translateZ(20px)' },
    { id: 'top', label: 'TOP', transform: 'rotateX(90deg) translateZ(20px)' },
    { id: 'bottom', label: 'BOT', transform: 'rotateX(-90deg) translateZ(20px)' },
  ];

  return (
    <div
      className={clsx(
        'absolute top-4 right-4 z-50',
        'select-none',
        className
      )}
      style={{ width: size, height: size }}
    >
      {/* 3D Cube Container */}
      <div
        className="relative w-full h-full"
        style={{
          perspective: '200px',
          perspectiveOrigin: 'center center',
        }}
      >
        {/* Rotating Cube */}
        <div
          className="absolute inset-0 transition-transform duration-300"
          style={{
            transformStyle: 'preserve-3d',
            transform: 'rotateX(-20deg) rotateY(-30deg)',
          }}
        >
          {faces.map((face) => (
            <button
              key={face.id}
              onClick={() => handleFaceClick(face.id)}
              onMouseEnter={() => setHoveredFace(face.id)}
              onMouseLeave={() => setHoveredFace(null)}
              className={clsx(
                'absolute w-10 h-10 -ml-5 -mt-5',
                'left-1/2 top-1/2',
                'flex items-center justify-center',
                'text-[8px] font-bold tracking-wider',
                'border border-zinc-600',
                'transition-colors duration-150',
                'cursor-pointer',
                hoveredFace === face.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800/90 text-zinc-300 hover:bg-zinc-700'
              )}
              style={{
                transform: face.transform,
                backfaceVisibility: 'hidden',
              }}
            >
              {face.label}
            </button>
          ))}
        </div>
      </div>

      {/* Axis Labels */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[9px] font-bold">
        <span className="text-red-500">X</span>
        <span className="text-green-500">Y</span>
        <span className="text-blue-500">Z</span>
      </div>

      {/* Isometric View Button */}
      <button
        onClick={() => handleFaceClick('iso')}
        className={clsx(
          'absolute -top-2 -right-2',
          'w-6 h-6 rounded-full',
          'bg-zinc-800 hover:bg-blue-600',
          'border border-zinc-600',
          'flex items-center justify-center',
          'text-[8px] font-bold text-zinc-300 hover:text-white',
          'transition-colors duration-150',
          'cursor-pointer'
        )}
        title="Isometric View"
      >
        3D
      </button>
    </div>
  );
}

// ============================================================================
// COMBINED CANVAS OVERLAYS
// ============================================================================

export interface CanvasOverlaysProps {
  /** Nodes to display labels for */
  nodes?: Node3D[];
  /** Loads to display values for */
  loads?: Load3D[];
  /** Show node labels */
  showNodeLabels?: boolean;
  /** Show load labels */
  showLoadLabels?: boolean;
  /** Show ViewCube */
  showViewCube?: boolean;
  /** Node click handler */
  onNodeClick?: (nodeId: string | number) => void;
  /** ViewCube face click handler */
  onViewCubeFaceClick?: (face: ViewCubeFace) => void;
  /** Maximum distance for node label visibility */
  nodeLabelMaxDistance?: number;
}

/**
 * Combined overlay component that renders all overlay types.
 * Use inside a Canvas for 3D overlays, and place ViewCube outside.
 */
export function CanvasOverlays({
  nodes = [],
  loads = [],
  showNodeLabels = true,
  showLoadLabels = true,
  onNodeClick,
  nodeLabelMaxDistance = 50,
}: Omit<CanvasOverlaysProps, 'showViewCube' | 'onViewCubeFaceClick'>) {
  return (
    <>
      <NodeLabels
        nodes={nodes}
        visible={showNodeLabels}
        maxDistance={nodeLabelMaxDistance}
        onNodeClick={onNodeClick}
      />
      <LoadLabels loads={loads} visible={showLoadLabels} />
    </>
  );
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
// In your 3D Canvas component:

import { Canvas } from '@react-three/fiber';
import { CanvasOverlays, ViewCube, Node3D, Load3D } from './Overlays';

function Scene() {
  const nodes: Node3D[] = [
    { id: 1, x: 0, y: 0, z: 0 },
    { id: 2, x: 5, y: 0, z: 0 },
    { id: 3, x: 5, y: 3, z: 0 },
  ];

  const loads: Load3D[] = [
    {
      id: 1,
      nodeId: 2,
      x: 5,
      y: 0,
      z: 0,
      magnitude: 10,
      unit: 'kN',
      type: 'point',
      direction: [0, -1, 0],
    },
  ];

  const handleViewCubeFaceClick = (face: ViewCubeFace) => {
    // Set camera position based on face
    switch (face) {
      case 'front':
        camera.position.set(0, 0, 10);
        break;
      case 'top':
        camera.position.set(0, 10, 0);
        break;
      case 'iso':
        camera.position.set(10, 10, 10);
        break;
      // etc.
    }
    camera.lookAt(0, 0, 0);
  };

  return (
    <div className="relative w-full h-full">
      <Canvas>
        <ambientLight />
        
        // 3D objects...
        
        // Overlays (inside Canvas for 3D positioning)
        <CanvasOverlays
          nodes={nodes}
          loads={loads}
          showNodeLabels={true}
          showLoadLabels={true}
          onNodeClick={(id) => console.log('Node clicked:', id)}
        />
      </Canvas>

      // ViewCube is outside Canvas, positioned absolutely
      <ViewCube onFaceClick={handleViewCubeFaceClick} />
    </div>
  );
}
*/
