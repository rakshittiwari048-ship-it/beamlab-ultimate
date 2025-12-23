import type { FC } from 'react';
import { useRef, useMemo } from 'react';
import type { Mesh, Vector3 } from 'three';
import * as THREE from 'three';
import type { Element, Node } from '@beamlab/types';
import { useEditorStore } from '../../store/editorStore';

interface BeamMeshProps {
  element: Element;
  startNode: Node;
  endNode: Node;
  isSelected: boolean;
}

export const BeamMesh: FC<BeamMeshProps> = ({
  element,
  startNode,
  endNode,
  isSelected,
}) => {
  const meshRef = useRef<Mesh>(null);
  const selectElement = useEditorStore((state) => state.selectElement);
  const activeTool = useEditorStore((state) => state.activeTool);

  const { position, quaternion, length } = useMemo(() => {
    const start = new THREE.Vector3(
      startNode.position.x,
      startNode.position.y,
      startNode.position.z
    );
    const end = new THREE.Vector3(
      endNode.position.x,
      endNode.position.y,
      endNode.position.z
    );

    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    const position = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

    // Calculate rotation quaternion
    const axis = new THREE.Vector3(1, 0, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      axis,
      direction.clone().normalize()
    );

    return {
      position: position as Vector3,
      quaternion,
      length,
    };
  }, [startNode, endNode]);

  const handleClick = (event: MouseEvent): void => {
    event.stopPropagation();
    if (activeTool === 'select') {
      selectElement(element.id, event.shiftKey);
    }
  };

  const color = isSelected ? '#3b82f6' : '#6b7280';
  const radius = 0.08;

  return (
    <mesh
      ref={meshRef}
      position={position}
      quaternion={quaternion}
      onClick={handleClick as never}
    >
      <cylinderGeometry args={[radius, radius, length, 16]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
};
