/**
 * PenToolExample.tsx
 *
 * Complete example showing how to integrate the InteractionLayer (Pen Tool)
 * with the StructuralCanvas for drawing structural members.
 */

import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  Grid,
  ContactShadows,
  GizmoHelper,
  GizmoViewport,
  PerspectiveCamera,
  OrbitControls,
} from '@react-three/drei';
import InteractionLayer from './InteractionLayer';
import { StructuralMember, StructuralNode } from './StructuralCanvas';

// ============================================================================
// EXAMPLE COMPONENT
// ============================================================================

export const PenToolExample: React.FC = () => {
  // ──────────────────────────────────────────────────────────────────────────
  // STATE MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────────
  
  const [members, setMembers] = useState<StructuralMember[]>([]);
  const [nodes, setNodes] = useState<StructuralNode[]>([]);
  const [isPenToolActive, setIsPenToolActive] = useState(true);

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Handler when a new member is drawn
   */
  const handleAddMember = (memberData: {
    start: [number, number, number];
    end: [number, number, number];
  }) => {
    const newMemberId = `member-${Date.now()}`;
    const startNodeId = `node-${Date.now()}-start`;
    const endNodeId = `node-${Date.now()}-end`;

    // Check if nodes already exist at these positions
    const existingStartNode = nodes.find(
      (n) =>
        Math.abs(n.position[0] - memberData.start[0]) < 0.01 &&
        Math.abs(n.position[1] - memberData.start[1]) < 0.01 &&
        Math.abs(n.position[2] - memberData.start[2]) < 0.01
    );

    const existingEndNode = nodes.find(
      (n) =>
        Math.abs(n.position[0] - memberData.end[0]) < 0.01 &&
        Math.abs(n.position[1] - memberData.end[1]) < 0.01 &&
        Math.abs(n.position[2] - memberData.end[2]) < 0.01
    );

    // Add nodes if they don't exist
    const newNodes: StructuralNode[] = [];
    
    if (!existingStartNode) {
      newNodes.push({
        id: startNodeId,
        position: memberData.start,
        label: `N${nodes.length + newNodes.length + 1}`,
      });
    }

    if (!existingEndNode) {
      newNodes.push({
        id: endNodeId,
        position: memberData.end,
        label: `N${nodes.length + newNodes.length + 1}`,
      });
    }

    if (newNodes.length > 0) {
      setNodes((prev) => [...prev, ...newNodes]);
    }

    // Add the new member
    const newMember: StructuralMember = {
      id: newMemberId,
      startNode: memberData.start,
      endNode: memberData.end,
      section: {
        name: 'W10x49',
        area: 14.4,
        Ixx: 272,
        Iyy: 93.4,
      },
    };

    setMembers((prev) => [...prev, newMember]);
    
    console.log('✅ Member added:', newMember);
    console.log('📊 Total members:', members.length + 1);
  };

  /**
   * Clear all members and nodes
   */
  const handleClearAll = () => {
    setMembers([]);
    setNodes([]);
  };

  /**
   * Export current structure to JSON
   */
  const handleExport = () => {
    const data = {
      members,
      nodes,
      timestamp: new Date().toISOString(),
    };
    console.log('📤 Exported structure:', data);
    
    // Download as JSON file
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `structure-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────
  
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* ================================================================== */}
      {/* TOOLBAR */}
      {/* ================================================================== */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          zIndex: 100,
          background: 'rgba(30, 30, 30, 0.9)',
          padding: '20px',
          borderRadius: '12px',
          color: 'white',
          fontFamily: 'Inter, system-ui, sans-serif',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
          🖊️ Pen Tool Controls
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Toggle Pen Tool */}
          <button
            onClick={() => setIsPenToolActive(!isPenToolActive)}
            style={{
              padding: '10px 16px',
              background: isPenToolActive ? '#00aa00' : '#666',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
          >
            {isPenToolActive ? '✅ Pen Tool Active' : '⏸️ Pen Tool Paused'}
          </button>

          {/* Clear All */}
          <button
            onClick={handleClearAll}
            disabled={members.length === 0}
            style={{
              padding: '10px 16px',
              background: members.length > 0 ? '#ff4444' : '#333',
              color: members.length > 0 ? 'white' : '#666',
              border: 'none',
              borderRadius: '6px',
              cursor: members.length > 0 ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            🗑️ Clear All ({members.length})
          </button>

          {/* Export */}
          <button
            onClick={handleExport}
            disabled={members.length === 0}
            style={{
              padding: '10px 16px',
              background: members.length > 0 ? '#0088ff' : '#333',
              color: members.length > 0 ? 'white' : '#666',
              border: 'none',
              borderRadius: '6px',
              cursor: members.length > 0 ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            💾 Export JSON
          </button>
        </div>

        {/* Stats */}
        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '6px',
            fontSize: '13px',
          }}
        >
          <div>Members: <strong>{members.length}</strong></div>
          <div>Nodes: <strong>{nodes.length}</strong></div>
        </div>

        {/* Instructions */}
        <div
          style={{
            marginTop: '16px',
            fontSize: '12px',
            lineHeight: '1.6',
            opacity: 0.8,
          }}
        >
          <div><strong>Click</strong> - Place node</div>
          <div><strong>Right-click/ESC</strong> - Cancel</div>
          <div><strong>Red ring</strong> - Snap to node</div>
          <div><strong>Grid snap</strong> - 0.5m intervals</div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* 3D CANVAS */}
      {/* ================================================================== */}
      <Canvas
        camera={{
          position: [15, 15, 15],
          fov: 50,
          near: 0.1,
          far: 1000,
        }}
        dpr={[1, 2]}
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 20, 10]} intensity={0.8} />
        <pointLight position={[-10, 10, -10]} intensity={0.3} />

        {/* Camera */}
        <PerspectiveCamera makeDefault position={[15, 15, 15]} fov={50} />

        {/* Scene */}
        <group>
          {/* Grid */}
          <Grid
            args={[100, 100]}
            cellSize={0.5} // Match snap grid
            cellColor="#3a3a3a"
            sectionSize={5}
            sectionColor="#606060"
            fadeDistance={50}
            fadeStrength={1}
            infiniteGrid
          />

          {/* Contact Shadows */}
          <ContactShadows
            position={[0, 0, 0]}
            scale={50}
            blur={2}
            far={10}
            opacity={0.3}
          />

          {/* Render Existing Members */}
          {members.map((member) => (
            <MemberLine key={member.id} member={member} />
          ))}

          {/* Render Existing Nodes */}
          {nodes.map((node) => (
            <NodeSphere key={node.id} node={node} />
          ))}

          {/* PEN TOOL INTERACTION LAYER */}
          <InteractionLayer
            existingNodes={nodes}
            onAddMember={handleAddMember}
            isActive={isPenToolActive}
            gridSnapSize={0.5}
            nodeSnapThreshold={0.2}
          />

          {/* Gizmo */}
          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewport axisHeadScale={1} />
          </GizmoHelper>
        </group>

        {/* Controls */}
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.05}
          minDistance={5}
          maxDistance={100}
        />
      </Canvas>
    </div>
  );
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/** Render a structural member as a line */
const MemberLine: React.FC<{ member: StructuralMember }> = ({ member }) => {
  const points = [
    new THREE.Vector3(...member.startNode),
    new THREE.Vector3(...member.endNode),
  ];

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(
            points.flatMap((p) => [p.x, p.y, p.z])
          )}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#cccccc" linewidth={2} />
    </line>
  );
};

/** Render a node as a small sphere */
const NodeSphere: React.FC<{ node: StructuralNode }> = ({ node }) => {
  return (
    <mesh position={node.position}>
      <sphereGeometry args={[0.12, 16, 16]} />
      <meshStandardMaterial 
        color="#4488ff" 
        emissive="#2244aa"
        emissiveIntensity={0.3}
      />
    </mesh>
  );
};

// ============================================================================
// EXPORT
// ============================================================================

export default PenToolExample;
