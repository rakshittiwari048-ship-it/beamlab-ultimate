/**
 * StructuralCanvas.tsx
 *
 * Enhanced Three.js Canvas for Engineering Applications
 * Features:
 * - Infinite grid with fade distance
 * - Contact shadows for depth perception
 * - Gizmo helper for orientation
 * - Member highlighting on hover (Cyan)
 * - Member selection with blue color
 * - Raycast-based interaction
 */

import React, { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import {
  Grid,
  ContactShadows,
  GizmoHelper,
  GizmoViewport,
  PerspectiveCamera,
  OrbitControls,
} from '@react-three/drei';
import { Group, Mesh } from 'three';
import * as THREE from 'three';

// ============================================================================
// Types
// ============================================================================

export interface StructuralMember {
  id: string;
  startNode: [number, number, number];
  endNode: [number, number, number];
  section?: {
    name: string;
    area: number;
    Ixx: number;
    Iyy: number;
  };
}

export interface StructuralNode {
  id: string;
  position: [number, number, number];
  support?: boolean;
  label?: string;
}

export interface StructuralCanvasProps {
  /** Array of structural members to render */
  members?: StructuralMember[];
  /** Array of nodes to render */
  nodes?: StructuralNode[];
  /** Callback when member is hovered */
  onMemberHover?: (memberId: string | null) => void;
  /** Callback when member is selected */
  onMemberSelect?: (memberId: string) => void;
  /** Currently selected member ID */
  selectedMemberId?: string | null;
  /** Callback when canvas is ready */
  onCanvasReady?: () => void;
}

// ============================================================================
// Scene Content Component (inside Canvas)
// ============================================================================

interface SceneContentProps {
  members: StructuralMember[];
  nodes: StructuralNode[];
  onMemberHover?: (memberId: string | null) => void;
  onMemberSelect?: (memberId: string) => void;
  selectedMemberId?: string | null;
}

const SceneContent: React.FC<SceneContentProps> = ({
  members,
  nodes,
  onMemberHover,
  onMemberSelect,
  selectedMemberId,
}) => {
  const groupRef = useRef<Group>(null);
  const { camera, raycaster, mouse } = useThree();
  const memberMeshesRef = useRef<Map<string, Mesh>>(new Map());
  const hoveredMemberId = useRef<string | null>(null);

  // Handle mouse move for raycasting
  const handlePointerMove = (e: PointerEvent) => {
    const canvas = (e.target as HTMLElement);
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (!groupRef.current) return;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(groupRef.current.children, true);

    let currentHovered: string | null = null;

    if (intersects.length > 0) {
      const hovered = intersects[0].object as any;
      if (hovered.userData?.memberId) {
        currentHovered = hovered.userData.memberId;
      }
    }

    // Update hover state if changed
    if (currentHovered !== hoveredMemberId.current) {
      // Reset previous hovered member
      if (hoveredMemberId.current) {
        const prevMesh = memberMeshesRef.current.get(hoveredMemberId.current);
        if (prevMesh) {
          const isSelected = hoveredMemberId.current === selectedMemberId;
          (prevMesh.material as THREE.LineBasicMaterial).color.set(
            isSelected ? 0x0088ff : 0xcccccc
          );
        }
      }

      // Set new hovered member
      if (currentHovered) {
        const mesh = memberMeshesRef.current.get(currentHovered);
        if (mesh) {
          (mesh.material as THREE.LineBasicMaterial).color.set(0x00ffff); // Cyan
        }
      }

      hoveredMemberId.current = currentHovered;
      onMemberHover?.(currentHovered);
    }
  };

  // Handle click for selection
  const handleClick = (e: PointerEvent) => {
    const canvas = (e.target as HTMLElement);
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (!groupRef.current) return;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(groupRef.current.children, true);

    if (intersects.length > 0) {
      const clicked = intersects[0].object as any;
      if (clicked.userData?.memberId) {
        onMemberSelect?.(clicked.userData.memberId);
      }
    }
  };

  // Add event listeners on mount
  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('pointermove', handlePointerMove as any);
      canvas.addEventListener('click', handleClick as any);

      return () => {
        canvas.removeEventListener('pointermove', handlePointerMove as any);
        canvas.removeEventListener('click', handleClick as any);
      };
    }
    return undefined;
  }, [camera, selectedMemberId]);

  // Update colors when selection changes
  useEffect(() => {
    memberMeshesRef.current.forEach((mesh, memberId) => {
      const isSelected = memberId === selectedMemberId;
      const isHovered = memberId === hoveredMemberId.current;

      if (isHovered) {
        (mesh.material as THREE.LineBasicMaterial).color.set(0x00ffff); // Cyan
      } else if (isSelected) {
        (mesh.material as THREE.LineBasicMaterial).color.set(0x0088ff); // Blue
      } else {
        (mesh.material as THREE.LineBasicMaterial).color.set(0xcccccc); // Gray
      }
    });
  }, [selectedMemberId]);

  return (
    <group ref={groupRef}>
      {/* Grid with infinite appearance */}
      <Grid
        args={[100, 100]}
        cellSize={1}
        cellColor="#4a4a4a"
        sectionSize={10}
        sectionColor="#707070"
        fadeDistance={80}
        fadeStrength={1}
        infiniteGrid
      />

      {/* Contact Shadows for depth perception */}
      <ContactShadows
        position={[0, 0, 0]}
        scale={100}
        blur={2}
        far={20}
        opacity={0.4}
      />

      {/* Render Members (Beams) */}
      {members.map((member) => (
        <MemberGeometry
          key={member.id}
          member={member}
          isSelected={member.id === selectedMemberId}
          meshRef={(mesh) => {
            if (mesh) {
              memberMeshesRef.current.set(member.id, mesh);
            }
          }}
        />
      ))}

      {/* Render Nodes */}
      {nodes.map((node) => (
        <NodeGeometry key={node.id} node={node} />
      ))}

      {/* Gizmo for Orientation */}
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport axisHeadScale={1.1} />
      </GizmoHelper>
    </group>
  );
};

// ============================================================================
// Member Geometry Component
// ============================================================================

interface MemberGeometryProps {
  member: StructuralMember;
  isSelected: boolean;
  meshRef: (mesh: Mesh | null) => void;
}

const MemberGeometry: React.FC<MemberGeometryProps> = ({
  member,
  isSelected,
}) => {
  const startPos = member.startNode;
  const endPos = member.endNode;

  const points = [
    new THREE.Vector3(startPos[0], startPos[1], startPos[2]),
    new THREE.Vector3(endPos[0], endPos[1], endPos[2]),
  ];

  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  const color = isSelected ? 0x0088ff : 0xcccccc; // Blue if selected, Gray otherwise

  return (
    <group userData={{ memberId: member.id }}>
      <primitive object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ 
        color, 
        linewidth: 2, 
        transparent: true, 
        opacity: 0.8 
      }))} />
    </group>
  );
};

// ============================================================================
// Node Geometry Component
// ============================================================================

interface NodeGeometryProps {
  node: StructuralNode;
}

const NodeGeometry: React.FC<NodeGeometryProps> = ({ node }) => {
  const position = node.position;

  return (
    <group position={position}>
      {/* Node sphere */}
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial
          color={node.support ? 0xff6b6b : 0x888888}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>

      {/* Node label (optional) */}
      {node.label && (
        <sprite position={[0, 0.3, 0]}>
          <spriteMaterial
            map={(() => {
              const canvas = document.createElement('canvas');
              canvas.width = 256;
              canvas.height = 128;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(0, 0, 256, 128);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 32px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(node.label, 128, 64);
              }
              const texture = new THREE.CanvasTexture(canvas);
              texture.needsUpdate = true;
              return texture;
            })()}
            sizeAttenuation={true}
          />
        </sprite>
      )}
    </group>
  );
};

// ============================================================================
// Main StructuralCanvas Component
// ============================================================================

export const StructuralCanvas: React.FC<StructuralCanvasProps> = ({
  members = [],
  nodes = [],
  onMemberHover,
  onMemberSelect,
  selectedMemberId,
  onCanvasReady,
}) => {
  return (
    <Canvas
      camera={{
        position: [20, 20, 20],
        fov: 50,
        near: 0.1,
        far: 10000,
      }}
      dpr={[1, 2]}
      performance={{ current: 1 }}
      onCreated={() => onCanvasReady?.()}
    >
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <pointLight position={[-10, 10, -10]} intensity={0.4} />

      {/* Camera */}
      <PerspectiveCamera makeDefault position={[20, 20, 20]} fov={50} />

      {/* Scene Content */}
      <SceneContent
        members={members}
        nodes={nodes}
        onMemberHover={onMemberHover}
        onMemberSelect={onMemberSelect}
        selectedMemberId={selectedMemberId}
      />

      {/* Controls */}
      <OrbitControls
        makeDefault
        autoRotate={false}
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={200}
      />
    </Canvas>
  );
};

// ============================================================================
// Wrapper Component (for easy usage outside Canvas)
// ============================================================================

export const StructuralCanvasContainer: React.FC<StructuralCanvasProps> = (props) => {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <StructuralCanvas {...props} />
    </div>
  );
};
