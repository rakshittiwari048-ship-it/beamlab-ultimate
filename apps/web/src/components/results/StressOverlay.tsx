/**
 * StressOverlay.tsx
 *
 * 3D Stress Visualization & Analysis Results Overlay
 *
 * Features:
 * - Heatmap coloring: Blue (0) → Green (0.5) → Red (1.0)
 * - Mode 1: Bending Moment Diagrams floating above beams
 * - Mode 2: Deflected Shape with semi-transparent ghost structure
 * - Scale Factor slider (1x to 100x) for exaggerated deflection
 *
 * Author: BeamLab Team
 */

import React, { useMemo, useState, useCallback, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface NodeResult {
  id: string;
  x: number;
  y: number;
  z: number;
  dx: number;  // Displacement X
  dy: number;  // Displacement Y
  dz: number;  // Displacement Z
}

export interface MemberResult {
  id: string;
  startNode: string;
  endNode: string;
  start: [number, number, number];
  end: [number, number, number];
  // 100-point diagram data
  shear_y_diagram: { x_vals: number[]; y_vals: number[] };
  moment_z_diagram: { x_vals: number[]; y_vals: number[] };
  axial_diagram?: { x_vals: number[]; y_vals: number[] };
  // Max values for color scaling
  max_shear_y: number;
  max_moment_z: number;
  max_stress?: number;
}

export interface AnalysisResults {
  nodes: NodeResult[];
  members: MemberResult[];
  max_displacement: number;
  max_moment: number;
  max_shear: number;
  max_stress?: number;
}

export type VisualizationMode = 'diagrams' | 'deflected' | 'stress' | 'none';
export type DiagramType = 'moment' | 'shear' | 'axial';

export interface StressOverlayProps {
  /** Analysis results from backend */
  results: AnalysisResults;
  
  /** Visualization mode */
  mode: VisualizationMode;
  
  /** Which diagram to show in 'diagrams' mode */
  diagramType?: DiagramType;
  
  /** Scale factor for deflected shape (1-100) */
  scaleFactor?: number;
  
  /** Whether to show the control panel */
  showControls?: boolean;
  
  /** Opacity for overlays */
  opacity?: number;
  
  /** Diagram height scale */
  diagramScale?: number;
  
  /** Callback when scale factor changes */
  onScaleFactorChange?: (scale: number) => void;
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

/**
 * Get stress color using a heatmap gradient.
 * 
 * Maps normalized value (0-1) to color:
 * - 0.0 → Blue (low stress / compression)
 * - 0.5 → Green (medium)
 * - 1.0 → Red (high stress / tension)
 * 
 * @param value - Normalized value between 0 and 1
 * @param maxValue - Maximum value for normalization (optional)
 * @returns THREE.Color
 */
export function getStressColor(value: number, maxValue: number = 1): THREE.Color {
  // Normalize to 0-1 range
  const normalized = Math.min(Math.max(value / maxValue, 0), 1);
  
  // Heatmap: Blue → Cyan → Green → Yellow → Red
  let r: number, g: number, b: number;
  
  if (normalized < 0.25) {
    // Blue to Cyan (0.0 - 0.25)
    const t = normalized / 0.25;
    r = 0;
    g = t;
    b = 1;
  } else if (normalized < 0.5) {
    // Cyan to Green (0.25 - 0.5)
    const t = (normalized - 0.25) / 0.25;
    r = 0;
    g = 1;
    b = 1 - t;
  } else if (normalized < 0.75) {
    // Green to Yellow (0.5 - 0.75)
    const t = (normalized - 0.5) / 0.25;
    r = t;
    g = 1;
    b = 0;
  } else {
    // Yellow to Red (0.75 - 1.0)
    const t = (normalized - 0.75) / 0.25;
    r = 1;
    g = 1 - t;
    b = 0;
  }
  
  return new THREE.Color(r, g, b);
}

/**
 * Get diverging color for moment/shear (positive/negative)
 * - Negative → Blue (hogging)
 * - Zero → White
 * - Positive → Red (sagging)
 */
export function getDivergingColor(value: number, maxAbsValue: number): THREE.Color {
  const normalized = value / maxAbsValue; // -1 to +1
  
  if (normalized >= 0) {
    // Positive: White to Red
    const t = Math.min(normalized, 1);
    return new THREE.Color(1, 1 - t * 0.8, 1 - t * 0.8);
  } else {
    // Negative: White to Blue
    const t = Math.min(Math.abs(normalized), 1);
    return new THREE.Color(1 - t * 0.8, 1 - t * 0.8, 1);
  }
}

/**
 * Create color gradient array for vertex colors
 */
export function createColorGradient(
  values: number[],
  maxAbsValue: number,
  diverging: boolean = true
): Float32Array {
  const colors = new Float32Array(values.length * 3);
  
  for (let i = 0; i < values.length; i++) {
    const color = diverging
      ? getDivergingColor(values[i], maxAbsValue)
      : getStressColor(Math.abs(values[i]), maxAbsValue);
    
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  
  return colors;
}

// ============================================================================
// DIAGRAM MESH COMPONENT
// ============================================================================

interface DiagramMeshProps {
  member: MemberResult;
  diagramType: DiagramType;
  maxValue: number;
  scale: number;
  opacity: number;
}

const DiagramMesh: React.FC<DiagramMeshProps> = ({
  member,
  diagramType,
  maxValue,
  scale,
  opacity,
}) => {
  // Select the right diagram data
  const diagramData = useMemo(() => {
    switch (diagramType) {
      case 'moment':
        return member.moment_z_diagram;
      case 'shear':
        return member.shear_y_diagram;
      case 'axial':
        return member.axial_diagram;
      default:
        return member.moment_z_diagram;
    }
  }, [member, diagramType]);
  
  if (!diagramData || !diagramData.x_vals.length) return null;
  
  const { x_vals, y_vals } = diagramData;
  
  // Calculate beam direction and up vector
  const beamStart = new THREE.Vector3(...member.start);
  const beamEnd = new THREE.Vector3(...member.end);
  const beamVector = beamEnd.clone().sub(beamStart);
  const beamLength = beamVector.length();
  const beamDirection = beamVector.clone().normalize();
  
  // Up direction for diagram extrusion
  const upVector = useMemo(() => {
    if (Math.abs(beamDirection.y) > 0.9) {
      return new THREE.Vector3(0, 0, 1);
    }
    return new THREE.Vector3(0, 1, 0);
  }, [beamDirection]);
  
  // Offset to separate diagram from beam
  const offsetDistance = 0.15;
  const offset = upVector.clone().multiplyScalar(offsetDistance);
  
  // Create geometry
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    
    const maxAbsY = Math.max(...y_vals.map(Math.abs), 0.001);
    const effectiveMax = maxValue || maxAbsY;
    
    for (let i = 0; i < x_vals.length; i++) {
      // Normalize x position to beam length
      const t = x_vals[i] / x_vals[x_vals.length - 1];
      
      // Position along beam (with offset)
      const basePos = beamStart.clone()
        .add(beamDirection.clone().multiplyScalar(beamLength * t))
        .add(offset);
      
      // Scale value for display
      const scaledValue = (y_vals[i] / effectiveMax) * scale;
      
      // Top position (extruded by value)
      const topPos = basePos.clone().add(
        upVector.clone().multiplyScalar(scaledValue)
      );
      
      // Add vertices: bottom and top
      positions.push(basePos.x, basePos.y, basePos.z);
      positions.push(topPos.x, topPos.y, topPos.z);
      
      // Colors
      const color = getDivergingColor(y_vals[i], effectiveMax);
      colors.push(0.95, 0.95, 0.95); // Bottom: light gray
      colors.push(color.r, color.g, color.b); // Top: colored
    }
    
    // Create triangles
    for (let i = 0; i < x_vals.length - 1; i++) {
      const bl = i * 2;
      const tl = i * 2 + 1;
      const br = (i + 1) * 2;
      const tr = (i + 1) * 2 + 1;
      
      indices.push(bl, tl, tr);
      indices.push(bl, tr, br);
    }
    
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    
    return geo;
  }, [x_vals, y_vals, beamStart, beamDirection, beamLength, upVector, offset, scale, maxValue]);
  
  // Create outline curve
  const outlinePoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const maxAbsY = Math.max(...y_vals.map(Math.abs), 0.001);
    const effectiveMax = maxValue || maxAbsY;
    
    for (let i = 0; i < x_vals.length; i++) {
      const t = x_vals[i] / x_vals[x_vals.length - 1];
      const basePos = beamStart.clone()
        .add(beamDirection.clone().multiplyScalar(beamLength * t))
        .add(offset);
      
      const scaledValue = (y_vals[i] / effectiveMax) * scale;
      const topPos = basePos.clone().add(
        upVector.clone().multiplyScalar(scaledValue)
      );
      
      points.push(topPos);
    }
    
    return points;
  }, [x_vals, y_vals, beamStart, beamDirection, beamLength, upVector, offset, scale, maxValue]);
  
  const outlineGeometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(outlinePoints);
  }, [outlinePoints]);
  
  return (
    <group name={`diagram-${member.id}-${diagramType}`}>
      {/* Filled diagram mesh */}
      <mesh geometry={geometry}>
        <meshStandardMaterial
          vertexColors
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      
      {/* Outline curve */}
      <line geometry={outlineGeometry}>
        <lineBasicMaterial color="#333333" linewidth={2} />
      </line>
      
      {/* Zero line (baseline) */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={new Float32Array([
              beamStart.x + offset.x, beamStart.y + offset.y, beamStart.z + offset.z,
              beamEnd.x + offset.x, beamEnd.y + offset.y, beamEnd.z + offset.z,
            ])}
            count={2}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#888888" linewidth={1} />
      </line>
    </group>
  );
};

// ============================================================================
// DEFLECTED SHAPE COMPONENT
// ============================================================================

interface DeflectedShapeProps {
  originalNodes: NodeResult[];
  members: MemberResult[];
  scaleFactor: number;
  opacity: number;
  color?: string;
}

const DeflectedShape: React.FC<DeflectedShapeProps> = ({
  originalNodes,
  members,
  scaleFactor,
  opacity,
  color = '#FF6B00',
}) => {
  // Create displaced node positions
  const displacedNodes = useMemo(() => {
    const nodeMap = new Map<string, THREE.Vector3>();
    
    for (const node of originalNodes) {
      const displaced = new THREE.Vector3(
        node.x + node.dx * scaleFactor,
        node.y + node.dy * scaleFactor,
        node.z + node.dz * scaleFactor
      );
      nodeMap.set(node.id, displaced);
    }
    
    return nodeMap;
  }, [originalNodes, scaleFactor]);
  
  // Create line geometry for all displaced members
  const memberLines = useMemo(() => {
    const lines: { start: THREE.Vector3; end: THREE.Vector3; id: string }[] = [];
    
    for (const member of members) {
      const startNode = displacedNodes.get(member.startNode);
      const endNode = displacedNodes.get(member.endNode);
      
      if (startNode && endNode) {
        lines.push({
          id: member.id,
          start: startNode.clone(),
          end: endNode.clone(),
        });
      }
    }
    
    return lines;
  }, [members, displacedNodes]);
  
  // Animation pulse (optional subtle animation)
  const meshRef = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const pulse = Math.sin(clock.getElapsedTime() * 2) * 0.02 + 1;
      // Optional: subtle pulsing effect
      // meshRef.current.scale.setScalar(pulse);
    }
  });
  
  return (
    <group ref={meshRef} name="deflected-shape">
      {/* Displaced members as thick lines */}
      {memberLines.map((line) => (
        <line key={`deflected-${line.id}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={new Float32Array([
                line.start.x, line.start.y, line.start.z,
                line.end.x, line.end.y, line.end.z,
              ])}
              count={2}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial 
            color={color} 
            linewidth={3}
            transparent
            opacity={opacity}
          />
        </line>
      ))}
      
      {/* Displaced member tubes (thicker representation) */}
      {memberLines.map((line) => {
        const direction = line.end.clone().sub(line.start);
        const length = direction.length();
        const midpoint = line.start.clone().add(line.end).multiplyScalar(0.5);
        
        // Calculate rotation to align with member
        const up = new THREE.Vector3(0, 1, 0);
        const axis = new THREE.Vector3().crossVectors(up, direction.normalize());
        const angle = Math.acos(up.dot(direction.normalize()));
        
        return (
          <mesh
            key={`deflected-tube-${line.id}`}
            position={midpoint}
            rotation={new THREE.Euler().setFromQuaternion(
              new THREE.Quaternion().setFromAxisAngle(axis.normalize(), angle)
            )}
          >
            <cylinderGeometry args={[0.05, 0.05, length, 8]} />
            <meshStandardMaterial
              color={color}
              transparent
              opacity={opacity}
              emissive={color}
              emissiveIntensity={0.3}
            />
          </mesh>
        );
      })}
      
      {/* Displaced nodes as spheres */}
      {Array.from(displacedNodes.entries()).map(([nodeId, position]) => (
        <mesh key={`deflected-node-${nodeId}`} position={position}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={opacity}
            emissive={color}
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
      
      {/* Displacement vectors (optional) */}
      {originalNodes.filter(n => 
        Math.abs(n.dx) > 0.0001 || Math.abs(n.dy) > 0.0001 || Math.abs(n.dz) > 0.0001
      ).map((node) => {
        const originalPos = new THREE.Vector3(node.x, node.y, node.z);
        const displacedPos = displacedNodes.get(node.id);
        
        if (!displacedPos) return null;
        
        return (
          <line key={`displacement-vector-${node.id}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                array={new Float32Array([
                  originalPos.x, originalPos.y, originalPos.z,
                  displacedPos.x, displacedPos.y, displacedPos.z,
                ])}
                count={2}
                itemSize={3}
              />
            </bufferGeometry>
            <lineDashedMaterial
              color="#FFFF00"
              dashSize={0.1}
              gapSize={0.05}
              transparent
              opacity={0.6}
            />
          </line>
        );
      })}
    </group>
  );
};

// ============================================================================
// STRESS HEATMAP OVERLAY
// ============================================================================

interface StressHeatmapProps {
  members: MemberResult[];
  maxStress: number;
  opacity: number;
}

const StressHeatmap: React.FC<StressHeatmapProps> = ({
  members,
  maxStress,
  opacity,
}) => {
  return (
    <group name="stress-heatmap">
      {members.map((member) => {
        const start = new THREE.Vector3(...member.start);
        const end = new THREE.Vector3(...member.end);
        const direction = end.clone().sub(start);
        const length = direction.length();
        const midpoint = start.clone().add(end).multiplyScalar(0.5);
        
        // Calculate stress ratio
        const stress = member.max_stress || Math.max(
          Math.abs(member.max_moment_z),
          Math.abs(member.max_shear_y)
        );
        const stressRatio = stress / (maxStress || 1);
        const color = getStressColor(stressRatio, 1);
        
        // Calculate rotation
        const up = new THREE.Vector3(0, 1, 0);
        const axis = new THREE.Vector3().crossVectors(up, direction.normalize());
        const angle = Math.acos(Math.min(Math.max(up.dot(direction.normalize()), -1), 1));
        
        return (
          <mesh
            key={`stress-${member.id}`}
            position={midpoint}
            rotation={new THREE.Euler().setFromQuaternion(
              new THREE.Quaternion().setFromAxisAngle(axis.length() > 0.001 ? axis.normalize() : new THREE.Vector3(1, 0, 0), angle)
            )}
          >
            <cylinderGeometry args={[0.08, 0.08, length, 12]} />
            <meshStandardMaterial
              color={color}
              transparent
              opacity={opacity}
              emissive={color}
              emissiveIntensity={0.2}
            />
          </mesh>
        );
      })}
    </group>
  );
};

// ============================================================================
// CONTROL PANEL
// ============================================================================

interface ControlPanelProps {
  mode: VisualizationMode;
  diagramType: DiagramType;
  scaleFactor: number;
  onModeChange: (mode: VisualizationMode) => void;
  onDiagramTypeChange: (type: DiagramType) => void;
  onScaleFactorChange: (scale: number) => void;
  maxDisplacement: number;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  mode,
  diagramType,
  scaleFactor,
  onModeChange,
  onDiagramTypeChange,
  onScaleFactorChange,
  maxDisplacement,
}) => {
  return (
    <Html position={[-5, 5, 0]} style={{ pointerEvents: 'auto' }}>
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          minWidth: '220px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '13px',
        }}
      >
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#1a1a1a' }}>
          📊 Visualization
        </h3>
        
        {/* Mode Selector */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', color: '#666', fontSize: '11px' }}>
            Display Mode
          </label>
          <select
            value={mode}
            onChange={(e) => onModeChange(e.target.value as VisualizationMode)}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <option value="none">None</option>
            <option value="diagrams">📈 Diagrams (BMD/SFD)</option>
            <option value="deflected">🏗️ Deflected Shape</option>
            <option value="stress">🌡️ Stress Heatmap</option>
          </select>
        </div>
        
        {/* Diagram Type (only in diagrams mode) */}
        {mode === 'diagrams' && (
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: '#666', fontSize: '11px' }}>
              Diagram Type
            </label>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['moment', 'shear', 'axial'] as DiagramType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => onDiagramTypeChange(type)}
                  style={{
                    flex: 1,
                    padding: '6px',
                    borderRadius: '4px',
                    border: diagramType === type ? '2px solid #2962ff' : '1px solid #ddd',
                    background: diagramType === type ? '#e3f2fd' : '#fff',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: diagramType === type ? 600 : 400,
                  }}
                >
                  {type === 'moment' ? 'M' : type === 'shear' ? 'V' : 'N'}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Scale Factor Slider (only in deflected mode) */}
        {mode === 'deflected' && (
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: '#666', fontSize: '11px' }}>
              Scale Factor: {scaleFactor}x
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={scaleFactor}
              onChange={(e) => onScaleFactorChange(parseInt(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#999' }}>
              <span>1x</span>
              <span>100x</span>
            </div>
          </div>
        )}
        
        {/* Max Displacement Info */}
        {mode === 'deflected' && (
          <div style={{
            padding: '8px',
            background: '#fff3e0',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#e65100',
          }}>
            Max δ: {(maxDisplacement * 1000).toFixed(2)} mm
            <br />
            Scaled: {(maxDisplacement * scaleFactor * 1000).toFixed(2)} mm
          </div>
        )}
        
        {/* Color Legend */}
        {(mode === 'diagrams' || mode === 'stress') && (
          <div style={{ marginTop: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: '#666', fontSize: '11px' }}>
              Color Legend
            </label>
            <div
              style={{
                height: '12px',
                borderRadius: '4px',
                background: mode === 'stress'
                  ? 'linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)'
                  : 'linear-gradient(to right, #3366ff, #ffffff, #ff3333)',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#666', marginTop: '2px' }}>
              <span>{mode === 'stress' ? 'Low' : '(-)'}</span>
              <span>{mode === 'stress' ? 'High' : '(+)'}</span>
            </div>
          </div>
        )}
      </div>
    </Html>
  );
};

// ============================================================================
// MAIN STRESS OVERLAY COMPONENT
// ============================================================================

export const StressOverlay: React.FC<StressOverlayProps> = ({
  results,
  mode: initialMode = 'diagrams',
  diagramType: initialDiagramType = 'moment',
  scaleFactor: initialScaleFactor = 10,
  showControls = true,
  opacity = 0.7,
  diagramScale = 1.5,
  onScaleFactorChange,
}) => {
  // Internal state
  const [mode, setMode] = useState<VisualizationMode>(initialMode);
  const [diagramType, setDiagramType] = useState<DiagramType>(initialDiagramType);
  const [scaleFactor, setScaleFactor] = useState(initialScaleFactor);
  
  // Callbacks
  const handleScaleFactorChange = useCallback((scale: number) => {
    setScaleFactor(scale);
    onScaleFactorChange?.(scale);
  }, [onScaleFactorChange]);
  
  // Calculate max values for scaling
  const maxMoment = useMemo(() => {
    return Math.max(
      ...results.members.map(m => Math.abs(m.max_moment_z || 0)),
      0.001
    );
  }, [results.members]);
  
  const maxShear = useMemo(() => {
    return Math.max(
      ...results.members.map(m => Math.abs(m.max_shear_y || 0)),
      0.001
    );
  }, [results.members]);
  
  const maxValue = useMemo(() => {
    switch (diagramType) {
      case 'moment': return maxMoment;
      case 'shear': return maxShear;
      default: return maxMoment;
    }
  }, [diagramType, maxMoment, maxShear]);
  
  if (!results || !results.members.length) {
    return null;
  }
  
  return (
    <group name="stress-overlay">
      {/* Control Panel */}
      {showControls && (
        <ControlPanel
          mode={mode}
          diagramType={diagramType}
          scaleFactor={scaleFactor}
          onModeChange={setMode}
          onDiagramTypeChange={setDiagramType}
          onScaleFactorChange={handleScaleFactorChange}
          maxDisplacement={results.max_displacement}
        />
      )}
      
      {/* Mode 1: Diagrams (BMD/SFD/Axial) */}
      {mode === 'diagrams' && (
        <group name="diagrams-overlay">
          {results.members.map((member) => (
            <DiagramMesh
              key={`diagram-${member.id}`}
              member={member}
              diagramType={diagramType}
              maxValue={maxValue}
              scale={diagramScale}
              opacity={opacity}
            />
          ))}
        </group>
      )}
      
      {/* Mode 2: Deflected Shape */}
      {mode === 'deflected' && results.nodes && (
        <DeflectedShape
          originalNodes={results.nodes}
          members={results.members}
          scaleFactor={scaleFactor}
          opacity={opacity}
          color="#FF6B00"
        />
      )}
      
      {/* Mode 3: Stress Heatmap */}
      {mode === 'stress' && (
        <StressHeatmap
          members={results.members}
          maxStress={results.max_stress || results.max_moment}
          opacity={opacity}
        />
      )}
    </group>
  );
};

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export {
  DiagramMesh,
  DeflectedShape,
  StressHeatmap,
  ControlPanel,
  getDivergingColor,
  createColorGradient,
};

export default StressOverlay;
