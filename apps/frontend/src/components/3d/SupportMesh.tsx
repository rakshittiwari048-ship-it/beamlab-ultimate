import type { FC } from 'react';
import { useMemo } from 'react';
import type { Support, Node } from '@beamlab/types';
import * as THREE from 'three';

interface SupportMeshProps {
  support: Support;
  node: Node;
}

export const SupportMesh: FC<SupportMeshProps> = ({ support, node }) => {
  const geometry = useMemo(() => {
    switch (support.type) {
      case 'fixed':
        return <FixedSupport />;
      case 'pinned':
        return <PinnedSupport />;
      case 'roller':
        return <RollerSupport />;
      default:
        return null;
    }
  }, [support.type]);

  return (
    <group position={[node.position.x, node.position.y, node.position.z]}>
      {geometry}
    </group>
  );
};

const FixedSupport: FC = () => {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    // Triangle base
    pts.push(new THREE.Vector3(0, 0, 0));
    pts.push(new THREE.Vector3(-0.3, -0.3, 0));
    pts.push(new THREE.Vector3(0.3, -0.3, 0));
    pts.push(new THREE.Vector3(0, 0, 0));
    // Hatch marks
    for (let i = -0.25; i <= 0.25; i += 0.1) {
      pts.push(new THREE.Vector3(i, -0.3, 0));
      pts.push(new THREE.Vector3(i - 0.05, -0.4, 0));
    }
    return pts;
  }, []);

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(points.flatMap((p) => [p.x, p.y, p.z]))}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#ef4444" linewidth={2} />
    </line>
  );
};

const PinnedSupport: FC = () => {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    // Triangle
    pts.push(new THREE.Vector3(0, 0, 0));
    pts.push(new THREE.Vector3(-0.25, -0.3, 0));
    pts.push(new THREE.Vector3(0.25, -0.3, 0));
    pts.push(new THREE.Vector3(0, 0, 0));
    // Base line
    pts.push(new THREE.Vector3(-0.3, -0.3, 0));
    pts.push(new THREE.Vector3(0.3, -0.3, 0));
    return pts;
  }, []);

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(points.flatMap((p) => [p.x, p.y, p.z]))}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#f59e0b" linewidth={2} />
    </line>
  );
};

const RollerSupport: FC = () => {
  return (
    <group>
      {/* Triangle */}
      <mesh position={[0, -0.15, 0]}>
        <coneGeometry args={[0.2, 0.3, 3]} />
        <meshStandardMaterial color="#10b981" />
      </mesh>
      {/* Rollers */}
      <mesh position={[-0.15, -0.35, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#10b981" />
      </mesh>
      <mesh position={[0.15, -0.35, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#10b981" />
      </mesh>
    </group>
  );
};
