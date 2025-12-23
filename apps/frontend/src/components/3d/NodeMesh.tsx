import type { FC } from 'react';
import { useRef } from 'react';
import { Sphere } from '@react-three/drei';
import type { Mesh } from 'three';
import type { Node } from '@beamlab/types';
import { useEditorStore } from '../../store/editorStore';
import { useVibration } from '../useVibration';

interface NodeMeshProps {
  node: Node;
  isSelected: boolean;
}

export const NodeMesh: FC<NodeMeshProps> = ({ node, isSelected }) => {
  const meshRef = useRef<Mesh>(null);
  const selectNode = useEditorStore((state) => state.selectNode);
  const activeTool = useEditorStore((state) => state.activeTool);

  // Apply modal vibration to node position
  useVibration(node.id, node.position, meshRef);

  const handleClick = (event: MouseEvent): void => {
    event.stopPropagation();
    if (activeTool === 'select') {
      selectNode(node.id, event.shiftKey);
    }
  };

  const hasConstraints = Object.values(node.constraints).some((v) => v);
  const color = isSelected ? '#3b82f6' : hasConstraints ? '#ef4444' : '#10b981';

  return (
    <Sphere
      ref={meshRef}
      position={[node.position.x, node.position.y, node.position.z]}
      args={[0.15, 16, 16]}
      onClick={handleClick as never}
    >
      <meshStandardMaterial color={color} />
    </Sphere>
  );
};
