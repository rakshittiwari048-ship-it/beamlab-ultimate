import { useRef, useLayoutEffect, useMemo } from 'react';
import { InstancedMesh, Matrix4, Vector3, Color } from 'three';
import { useModelStore, selectAllNodes } from '../../store/model';
import { useSelectionStore } from '../../store/selection';
import { ThreeEvent } from '@react-three/fiber';

/**
 * NodesRenderer - High-performance node rendering using InstancedMesh
 * 
 * Optimized for 10,000+ nodes:
 * - Single draw call via InstancedMesh
 * - Reduced geometry complexity (8x8 segments vs 16x16)
 * - Frustum culling enabled
 * - Reused vectors to minimize garbage collection
 * - Uses useLayoutEffect for synchronous updates
 * - Selection and hover support with color feedback
 */

interface NodesRendererProps {
  onNodeClick?: (nodeId: string) => void;
  deflectionScale?: number; // Default 100x exaggeration for deformed shape visualization
  renderDeformed?: boolean;  // If true, render deformed (red); if false, render original (blue)
}

export const NodesRenderer = ({ 
  onNodeClick, 
  deflectionScale = 100,
  renderDeformed = false 
}: NodesRendererProps = {}) => {
  const meshRef = useRef<InstancedMesh>(null);
  const nodes = useModelStore(selectAllNodes);
  const solverResult = useModelStore((state) => state.solverResult);
  const selectedNodeIds = useSelectionStore((state) => state.selectedNodeIds);
  const hoveredNodeId = useSelectionStore((state) => state.hoveredNodeId);
  const selectNode = useSelectionStore((state) => state.selectNode);
  const toggleNode = useSelectionStore((state) => state.toggleNode);
  const setHoveredNode = useSelectionStore((state) => state.setHoveredNode);

  // Reuse vectors to reduce garbage collection
  const matrix = useMemo(() => new Matrix4(), []);
  const position = useMemo(() => new Vector3(), []);
  const color = useMemo(() => new Color(), []);

  // Update instance matrices whenever nodes change
  useLayoutEffect(() => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;
    const nodeCount = nodes.length;

    // Update instance count
    mesh.count = nodeCount;

    // Batch update all instance matrices and colors
    for (let i = 0; i < nodeCount; i++) {
      const node = nodes[i];
      const isSelected = selectedNodeIds.has(node.id);
      const isHovered = hoveredNodeId === node.id;

      // Update position
      const disp = solverResult?.nodalDisplacements?.get(node.id);
      if (renderDeformed && disp) {
        // Deformed configuration: apply displacement scaled
        position.set(
          node.x + disp.dx * deflectionScale,
          node.y + disp.dy * deflectionScale,
          node.z + disp.dz * deflectionScale
        );
      } else {
        // Original (undeformed) configuration
        position.set(node.x, node.y, node.z);
      }
      matrix.makeTranslation(position.x, position.y, position.z);
      mesh.setMatrixAt(i, matrix);

      // Update color based on state and render mode
      if (isSelected) {
        color.set('#ff00ff'); // Hot pink for selected
      } else if (isHovered) {
        color.set('#60a5fa'); // Light blue for hover
      } else if (renderDeformed) {
        color.set('#ef4444'); // Red for deformed shape
      } else {
        color.set('#3b82f6'); // Default blue for original
      }
      mesh.setColorAt(i, color);
    }

    // Mark instance matrix and color as needing update
    if (nodeCount > 0) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
    
    // Enable frustum culling for better performance
    mesh.frustumCulled = true;
  }, [nodes, selectedNodeIds, hoveredNodeId, solverResult, deflectionScale, renderDeformed, matrix, position, color]);

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined) {
      const node = nodes[e.instanceId];
      if (node) {
        setHoveredNode(node.id);
      }
    }
  };

  const handlePointerOut = () => {
    setHoveredNode(null);
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined) {
      const node = nodes[e.instanceId];
      if (node) {
        // Call external callback if provided
        if (onNodeClick) {
          onNodeClick(node.id);
        } else {
          // Default behavior: selection
          // Shift = toggle selection, else replace selection
          if (e.shiftKey) {
            toggleNode(node.id);
          } else {
            selectNode(node.id, false);
          }
        }
      }
    }
  };

  return (
    <instancedMesh 
      ref={meshRef} 
      args={[undefined, undefined, Math.max(1, nodes.length)]}
      frustumCulled={true}
      visible={nodes.length > 0}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      {/* Increased sphere size for better visibility and clarity */}
      <sphereGeometry args={[0.35, 16, 16]} />
      <meshStandardMaterial 
        color={renderDeformed ? '#ef4444' : '#3b82f6'}
        emissive={renderDeformed ? '#991b1b' : '#1e40af'}
        emissiveIntensity={0.3}
      />
    </instancedMesh>
  );
};
