import { useMemo, useRef } from 'react';
import { Vector3, Group, BufferGeometry, Float32BufferAttribute } from 'three';
import { useModelStore, selectActiveLoads, selectAllNodes, selectAllMembers, PointLoad, PointMemberLoad, UDLLoad, UVLLoad, DistributedLoad } from '../../store/model';

// ============================================================================
// LOAD RENDERER
// ============================================================================

/**
 * LoadRenderer - Renders load conditions in 3D
 * 
 * Supported Load Types:
 * - Point Load (at node): Arrow pointing in force direction
 * - Point Load (on member): Arrow at specific position along member
 * - UDL (Uniformly Distributed): Uniform arrows + filled area
 * - UVL (Uniformly Varying): Triangular/trapezoidal arrows + filled area
 * - Moment: Curved arrow (future)
 */

// Colors
const POINT_LOAD_COLOR = '#ef4444';     // Red - point loads
const UDL_COLOR = '#3b82f6';            // Blue - UDL
const UVL_COLOR = '#8b5cf6';            // Purple - UVL

// Sizing
const ARROW_HEAD_LENGTH = 0.12;
const ARROW_HEAD_WIDTH = 0.06;
const BASE_ARROW_LENGTH = 0.4;
const LOAD_SCALE = 0.05;  // Scale factor for load magnitude to arrow length
const NUM_UDL_ARROWS = 6;  // Number of arrows for UDL visualization
const NUM_UVL_ARROWS = 8;  // Number of arrows for UVL visualization

// ============================================================================
// POINT LOAD AT NODE
// ============================================================================

interface PointLoadArrowProps {
  load: PointLoad;
  nodePosition: { x: number; y: number; z: number };
}

function PointLoadArrow({ load, nodePosition }: PointLoadArrowProps) {
  const groupRef = useRef<Group>(null);
  
  const { direction, magnitude, origin, arrowLength } = useMemo(() => {
    const forceVector = new Vector3(load.fx, load.fy, load.fz);
    const mag = forceVector.length();
    
    if (mag === 0) {
      return { direction: new Vector3(0, -1, 0), magnitude: 0, origin: new Vector3(), arrowLength: 0 };
    }
    
    const dir = forceVector.clone().normalize();
    const len = BASE_ARROW_LENGTH + mag * LOAD_SCALE;
    
    // Arrow starts away from the node and points toward it
    const startPoint = new Vector3(
      nodePosition.x - dir.x * len,
      nodePosition.y - dir.y * len,
      nodePosition.z - dir.z * len
    );
    
    return { direction: dir, magnitude: mag, origin: startPoint, arrowLength: len };
  }, [load, nodePosition]);
  
  if (magnitude === 0) return null;
  
  return (
    <group ref={groupRef}>
      <arrowHelper args={[direction, origin, arrowLength, POINT_LOAD_COLOR, ARROW_HEAD_LENGTH, ARROW_HEAD_WIDTH]} />
    </group>
  );
}

// ============================================================================
// POINT LOAD ON MEMBER
// ============================================================================

interface PointMemberLoadArrowProps {
  load: PointMemberLoad;
  startPosition: { x: number; y: number; z: number };
  endPosition: { x: number; y: number; z: number };
}

function PointMemberLoadArrow({ load, startPosition, endPosition }: PointMemberLoadArrowProps) {
  const { direction, magnitude, origin, arrowLength } = useMemo(() => {
    const forceVector = new Vector3(load.fx, load.fy, load.fz);
    const mag = forceVector.length();
    
    if (mag === 0) {
      return { direction: new Vector3(0, -1, 0), magnitude: 0, origin: new Vector3(), arrowLength: 0 };
    }
    
    const dir = forceVector.clone().normalize();
    const len = BASE_ARROW_LENGTH + mag * LOAD_SCALE;
    
    // Calculate point on member
    const t = Math.max(0, Math.min(1, load.position));
    const pointOnMember = new Vector3(
      startPosition.x + t * (endPosition.x - startPosition.x),
      startPosition.y + t * (endPosition.y - startPosition.y),
      startPosition.z + t * (endPosition.z - startPosition.z)
    );
    
    const startPoint = new Vector3(
      pointOnMember.x - dir.x * len,
      pointOnMember.y - dir.y * len,
      pointOnMember.z - dir.z * len
    );
    
    return { direction: dir, magnitude: mag, origin: startPoint, arrowLength: len };
  }, [load, startPosition, endPosition]);
  
  if (magnitude === 0) return null;
  
  return (
    <group>
      <arrowHelper args={[direction, origin, arrowLength, POINT_LOAD_COLOR, ARROW_HEAD_LENGTH, ARROW_HEAD_WIDTH]} />
      {/* Small sphere at load application point */}
      <mesh position={[
        startPosition.x + load.position * (endPosition.x - startPosition.x),
        startPosition.y + load.position * (endPosition.y - startPosition.y),
        startPosition.z + load.position * (endPosition.z - startPosition.z)
      ]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color={POINT_LOAD_COLOR} />
      </mesh>
    </group>
  );
}

// ============================================================================
// UDL - UNIFORMLY DISTRIBUTED LOAD
// ============================================================================

interface UDLLoadRendererProps {
  load: UDLLoad;
  startPosition: { x: number; y: number; z: number };
  endPosition: { x: number; y: number; z: number };
}

function UDLLoadRenderer({ load, startPosition, endPosition }: UDLLoadRendererProps) {
  const { arrows, loadAreaGeometry } = useMemo(() => {
    const forceVector = new Vector3(load.wx, load.wy, load.wz);
    const mag = forceVector.length();
    
    if (mag === 0) return { arrows: [], loadAreaGeometry: null };
    
    const dir = forceVector.clone().normalize();
    const arrowLength = BASE_ARROW_LENGTH * 0.6 + mag * LOAD_SCALE * 0.3;
    
    const startT = Math.max(0, Math.min(1, load.startPos));
    const endT = Math.max(0, Math.min(1, load.endPos));
    
    const arrowData: { origin: Vector3; direction: Vector3; length: number }[] = [];
    const loadAreaVertices: number[] = [];
    
    for (let i = 0; i <= NUM_UDL_ARROWS; i++) {
      const t = startT + (i / NUM_UDL_ARROWS) * (endT - startT);
      const pointOnMember = new Vector3(
        startPosition.x + t * (endPosition.x - startPosition.x),
        startPosition.y + t * (endPosition.y - startPosition.y),
        startPosition.z + t * (endPosition.z - startPosition.z)
      );
      
      const startPoint = new Vector3(
        pointOnMember.x - dir.x * arrowLength,
        pointOnMember.y - dir.y * arrowLength,
        pointOnMember.z - dir.z * arrowLength
      );
      
      arrowData.push({ origin: startPoint, direction: dir.clone(), length: arrowLength });
      
      // Add vertices for load area visualization
      loadAreaVertices.push(pointOnMember.x, pointOnMember.y, pointOnMember.z);
      loadAreaVertices.push(startPoint.x, startPoint.y, startPoint.z);
    }
    
    // Create geometry for filled area
    const geometry = new BufferGeometry();
    const vertices: number[] = [];
    
    for (let i = 0; i < NUM_UDL_ARROWS; i++) {
      const idx = i * 2;
      // Triangle 1
      vertices.push(loadAreaVertices[idx * 3], loadAreaVertices[idx * 3 + 1], loadAreaVertices[idx * 3 + 2]);
      vertices.push(loadAreaVertices[(idx + 1) * 3], loadAreaVertices[(idx + 1) * 3 + 1], loadAreaVertices[(idx + 1) * 3 + 2]);
      vertices.push(loadAreaVertices[(idx + 2) * 3], loadAreaVertices[(idx + 2) * 3 + 1], loadAreaVertices[(idx + 2) * 3 + 2]);
      // Triangle 2
      vertices.push(loadAreaVertices[(idx + 1) * 3], loadAreaVertices[(idx + 1) * 3 + 1], loadAreaVertices[(idx + 1) * 3 + 2]);
      vertices.push(loadAreaVertices[(idx + 3) * 3], loadAreaVertices[(idx + 3) * 3 + 1], loadAreaVertices[(idx + 3) * 3 + 2]);
      vertices.push(loadAreaVertices[(idx + 2) * 3], loadAreaVertices[(idx + 2) * 3 + 1], loadAreaVertices[(idx + 2) * 3 + 2]);
    }
    
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    
    return { arrows: arrowData, loadAreaGeometry: geometry };
  }, [load, startPosition, endPosition]);
  
  if (arrows.length === 0) return null;
  
  return (
    <group>
      {/* Filled area */}
      {loadAreaGeometry && (
        <mesh geometry={loadAreaGeometry}>
          <meshBasicMaterial color={UDL_COLOR} transparent opacity={0.3} side={2} />
        </mesh>
      )}
      {/* Arrows */}
      {arrows.map((arrow, index) => (
        <arrowHelper
          key={index}
          args={[arrow.direction, arrow.origin, arrow.length, UDL_COLOR, ARROW_HEAD_LENGTH * 0.6, ARROW_HEAD_WIDTH * 0.6]}
        />
      ))}
      {/* Top line connecting arrows */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={arrows.length}
            array={new Float32Array(arrows.flatMap(a => [a.origin.x, a.origin.y, a.origin.z]))}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={UDL_COLOR} linewidth={2} />
      </line>
    </group>
  );
}

// ============================================================================
// UVL - UNIFORMLY VARYING LOAD (Triangular/Trapezoidal)
// ============================================================================

interface UVLLoadRendererProps {
  load: UVLLoad;
  startPosition: { x: number; y: number; z: number };
  endPosition: { x: number; y: number; z: number };
}

function UVLLoadRenderer({ load, startPosition, endPosition }: UVLLoadRendererProps) {
  const { arrows, loadAreaGeometry } = useMemo(() => {
    const startT = Math.max(0, Math.min(1, load.startPos));
    const endT = Math.max(0, Math.min(1, load.endPos));
    
    const arrowData: { origin: Vector3; direction: Vector3; length: number; pointOnMember: Vector3 }[] = [];
    const loadAreaVertices: number[] = [];
    
    for (let i = 0; i <= NUM_UVL_ARROWS; i++) {
      const localT = i / NUM_UVL_ARROWS;
      const t = startT + localT * (endT - startT);
      
      // Interpolate load intensity
      const wx = load.wxStart + localT * (load.wxEnd - load.wxStart);
      const wy = load.wyStart + localT * (load.wyEnd - load.wyStart);
      const wz = load.wzStart + localT * (load.wzEnd - load.wzStart);
      
      const forceVector = new Vector3(wx, wy, wz);
      const mag = forceVector.length();
      
      const pointOnMember = new Vector3(
        startPosition.x + t * (endPosition.x - startPosition.x),
        startPosition.y + t * (endPosition.y - startPosition.y),
        startPosition.z + t * (endPosition.z - startPosition.z)
      );
      
      if (mag > 0.001) {
        const dir = forceVector.clone().normalize();
        const arrowLength = BASE_ARROW_LENGTH * 0.5 + mag * LOAD_SCALE * 0.3;
        
        const startPoint = new Vector3(
          pointOnMember.x - dir.x * arrowLength,
          pointOnMember.y - dir.y * arrowLength,
          pointOnMember.z - dir.z * arrowLength
        );
        
        arrowData.push({ 
          origin: startPoint, 
          direction: dir.clone(), 
          length: arrowLength,
          pointOnMember: pointOnMember.clone()
        });
        
        loadAreaVertices.push(pointOnMember.x, pointOnMember.y, pointOnMember.z);
        loadAreaVertices.push(startPoint.x, startPoint.y, startPoint.z);
      } else {
        // Zero load - still add point on member for area
        loadAreaVertices.push(pointOnMember.x, pointOnMember.y, pointOnMember.z);
        loadAreaVertices.push(pointOnMember.x, pointOnMember.y, pointOnMember.z);
      }
    }
    
    // Create geometry for filled area (triangular/trapezoidal shape)
    const geometry = new BufferGeometry();
    const vertices: number[] = [];
    
    for (let i = 0; i < NUM_UVL_ARROWS; i++) {
      const idx = i * 2;
      // Triangle 1
      vertices.push(loadAreaVertices[idx * 3], loadAreaVertices[idx * 3 + 1], loadAreaVertices[idx * 3 + 2]);
      vertices.push(loadAreaVertices[(idx + 1) * 3], loadAreaVertices[(idx + 1) * 3 + 1], loadAreaVertices[(idx + 1) * 3 + 2]);
      vertices.push(loadAreaVertices[(idx + 2) * 3], loadAreaVertices[(idx + 2) * 3 + 1], loadAreaVertices[(idx + 2) * 3 + 2]);
      // Triangle 2
      vertices.push(loadAreaVertices[(idx + 1) * 3], loadAreaVertices[(idx + 1) * 3 + 1], loadAreaVertices[(idx + 1) * 3 + 2]);
      vertices.push(loadAreaVertices[(idx + 3) * 3], loadAreaVertices[(idx + 3) * 3 + 1], loadAreaVertices[(idx + 3) * 3 + 2]);
      vertices.push(loadAreaVertices[(idx + 2) * 3], loadAreaVertices[(idx + 2) * 3 + 1], loadAreaVertices[(idx + 2) * 3 + 2]);
    }
    
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    
    return { arrows: arrowData, loadAreaGeometry: geometry };
  }, [load, startPosition, endPosition]);
  
  if (arrows.length === 0) return null;
  
  return (
    <group>
      {/* Filled area (triangular/trapezoidal) */}
      {loadAreaGeometry && (
        <mesh geometry={loadAreaGeometry}>
          <meshBasicMaterial color={UVL_COLOR} transparent opacity={0.3} side={2} />
        </mesh>
      )}
      {/* Arrows with varying lengths */}
      {arrows.map((arrow, index) => (
        <arrowHelper
          key={index}
          args={[arrow.direction, arrow.origin, arrow.length, UVL_COLOR, ARROW_HEAD_LENGTH * 0.5, ARROW_HEAD_WIDTH * 0.5]}
        />
      ))}
      {/* Outline connecting arrow tips */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={arrows.length}
            array={new Float32Array(arrows.flatMap(a => [a.origin.x, a.origin.y, a.origin.z]))}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={UVL_COLOR} linewidth={2} />
      </line>
    </group>
  );
}

// ============================================================================
// LEGACY DISTRIBUTED LOAD (for backward compatibility)
// ============================================================================

interface DistributedLoadArrowsProps {
  load: DistributedLoad;
  startPosition: { x: number; y: number; z: number };
  endPosition: { x: number; y: number; z: number };
}

function DistributedLoadArrows({ load, startPosition, endPosition }: DistributedLoadArrowsProps) {
  // Convert to UDL format and render
  const udlLoad: UDLLoad = {
    id: load.id,
    type: 'udl',
    memberId: load.memberId,
    startPos: 0,
    endPos: 1,
    wx: load.wx,
    wy: load.wy,
    wz: load.wz,
  };
  
  return <UDLLoadRenderer load={udlLoad} startPosition={startPosition} endPosition={endPosition} />;
}

// ============================================================================
// MAIN LOAD RENDERER
// ============================================================================

export const LoadRenderer = () => {
  const loads = useModelStore(selectActiveLoads);
  const nodes = useModelStore(selectAllNodes);
  const members = useModelStore(selectAllMembers);
  
  // Create lookup maps
  const nodeMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number; z: number }>();
    nodes.forEach(node => map.set(node.id, node));
    return map;
  }, [nodes]);
  
  const memberMap = useMemo(() => {
    const map = new Map<string, { startNodeId: string; endNodeId: string }>();
    members.forEach(member => map.set(member.id, member));
    return map;
  }, [members]);
  
  if (loads.length === 0) return null;
  
  return (
    <group name="loads">
      {loads.map(load => {
        // Point load at node
        if (load.type === 'point') {
          const nodePosition = nodeMap.get(load.nodeId);
          if (!nodePosition) return null;
          return <PointLoadArrow key={load.id} load={load} nodePosition={nodePosition} />;
        }
        
        // Point load on member
        if (load.type === 'point-member') {
          const member = memberMap.get(load.memberId);
          if (!member) return null;
          const startPos = nodeMap.get(member.startNodeId);
          const endPos = nodeMap.get(member.endNodeId);
          if (!startPos || !endPos) return null;
          return <PointMemberLoadArrow key={load.id} load={load} startPosition={startPos} endPosition={endPos} />;
        }
        
        // UDL - Uniformly Distributed Load
        if (load.type === 'udl') {
          const member = memberMap.get(load.memberId);
          if (!member) return null;
          const startPos = nodeMap.get(member.startNodeId);
          const endPos = nodeMap.get(member.endNodeId);
          if (!startPos || !endPos) return null;
          return <UDLLoadRenderer key={load.id} load={load} startPosition={startPos} endPosition={endPos} />;
        }
        
        // UVL - Uniformly Varying Load
        if (load.type === 'uvl') {
          const member = memberMap.get(load.memberId);
          if (!member) return null;
          const startPos = nodeMap.get(member.startNodeId);
          const endPos = nodeMap.get(member.endNodeId);
          if (!startPos || !endPos) return null;
          return <UVLLoadRenderer key={load.id} load={load} startPosition={startPos} endPosition={endPos} />;
        }
        
        // Legacy distributed load
        if (load.type === 'distributed') {
          const member = memberMap.get(load.memberId);
          if (!member) return null;
          const startPos = nodeMap.get(member.startNodeId);
          const endPos = nodeMap.get(member.endNodeId);
          if (!startPos || !endPos) return null;
          return <DistributedLoadArrows key={load.id} load={load} startPosition={startPos} endPosition={endPos} />;
        }
        
        // Moment loads - future implementation
        return null;
      })}
    </group>
  );
};

export default LoadRenderer;
