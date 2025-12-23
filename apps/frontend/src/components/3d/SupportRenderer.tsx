import { useMemo } from 'react';
import { useModelStore, selectAllSupports, selectAllNodes, Support } from '../../store/model';

// ============================================================================
// SUPPORT RENDERER
// ============================================================================

/**
 * SupportRenderer - Renders support conditions at nodes
 * 
 * - Fixed Support: Rendered as a cube (full restraint)
 * - Pinned Support: Rendered as a pyramid/tetrahedron (rotational freedom)
 */

const SUPPORT_SIZE = 0.3;
const FIXED_COLOR = '#22c55e';   // Green
const PINNED_COLOR = '#f59e0b';  // Amber

interface FixedSupportProps {
  position: [number, number, number];
}

function FixedSupport({ position }: FixedSupportProps) {
  // Offset slightly below the node
  const adjustedPosition: [number, number, number] = [
    position[0],
    position[1] - SUPPORT_SIZE / 2,
    position[2],
  ];

  return (
    <mesh position={adjustedPosition}>
      <boxGeometry args={[SUPPORT_SIZE, SUPPORT_SIZE, SUPPORT_SIZE]} />
      <meshStandardMaterial color={FIXED_COLOR} />
    </mesh>
  );
}

interface PinnedSupportProps {
  position: [number, number, number];
}

function PinnedSupport({ position }: PinnedSupportProps) {
  // Pyramid pointing up with apex at node
  const adjustedPosition: [number, number, number] = [
    position[0],
    position[1] - SUPPORT_SIZE * 0.7,
    position[2],
  ];

  return (
    <mesh position={adjustedPosition}>
      <coneGeometry args={[SUPPORT_SIZE * 0.6, SUPPORT_SIZE, 4]} />
      <meshStandardMaterial color={PINNED_COLOR} />
    </mesh>
  );
}

interface SupportMeshProps {
  support: Support;
  nodePosition: { x: number; y: number; z: number };
}

function SupportMesh({ support, nodePosition }: SupportMeshProps) {
  const position: [number, number, number] = [
    nodePosition.x,
    nodePosition.y,
    nodePosition.z,
  ];

  if (support.type === 'fixed') {
    return <FixedSupport position={position} />;
  } else {
    return <PinnedSupport position={position} />;
  }
}

export const SupportRenderer = () => {
  const supports = useModelStore(selectAllSupports);
  const nodes = useModelStore(selectAllNodes);
  
  // Create node map for O(1) lookups
  const nodeMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number; z: number }>();
    nodes.forEach(node => map.set(node.id, node));
    return map;
  }, [nodes]);
  
  // Filter supports that have valid nodes
  const validSupports = useMemo(() => {
    return supports.filter(support => nodeMap.has(support.nodeId));
  }, [supports, nodeMap]);
  
  if (validSupports.length === 0) return null;
  
  return (
    <group name="supports">
      {validSupports.map(support => {
        const nodePosition = nodeMap.get(support.nodeId)!;
        return (
          <SupportMesh
            key={support.nodeId}
            support={support}
            nodePosition={nodePosition}
          />
        );
      })}
    </group>
  );
};

export default SupportRenderer;
