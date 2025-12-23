/**
 * DiagramOverlay.tsx
 *
 * 3D Bending Moment Diagram (BMD) and Shear Force Diagram (SFD) Overlay
 *
 * Features:
 * - Filled curve mesh that extrudes based on moment/shear values
 * - Color gradient: Red (positive/sagging) ↔ Blue (negative/hogging)
 * - Semi-transparent (0.6 opacity) to see beam underneath
 * - Interactive "Scanner" tool with hover tooltip and cursor line
 * - Smooth interpolation using 100 data points from backend
 *
 * Author: BeamLab Team
 */

import React, { useRef, useState, useMemo, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Vector3, Shape, ExtrudeGeometry, BufferGeometry, Float32BufferAttribute } from 'three';

// ============================================================================
// TYPES
// ============================================================================

export interface DiagramData {
  x_vals: number[];
  y_vals: number[];
}

export interface DiagramOverlayProps {
  /** Beam start position [x, y, z] */
  beamStart: [number, number, number];
  
  /** Beam end position [x, y, z] */
  beamEnd: [number, number, number];
  
  /** Diagram data from backend (100 points) */
  diagramData: DiagramData;
  
  /** Type of diagram to display */
  diagramType: 'moment' | 'shear';
  
  /** Whether the diagram is visible */
  visible?: boolean;
  
  /** Scale factor for diagram height (default: 0.01 for moment, 0.02 for shear) */
  scaleFactor?: number;
  
  /** Maximum diagram height in meters (default: 2) */
  maxHeight?: number;
  
  /** Opacity of the diagram fill (default: 0.6) */
  opacity?: number;
  
  /** Whether to show the scanner tooltip on hover */
  showScanner?: boolean;
  
  /** Unit label for the values (default: "kNm" for moment, "kN" for shear) */
  unit?: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Interpolate color between blue (negative) and red (positive)
 */
const getValueColor = (value: number, maxAbsValue: number): THREE.Color => {
  const normalized = value / maxAbsValue; // -1 to +1
  
  if (normalized >= 0) {
    // Positive: Red (sagging moment / positive shear)
    // Interpolate from white to red based on magnitude
    const intensity = Math.abs(normalized);
    return new THREE.Color(1, 1 - intensity * 0.7, 1 - intensity * 0.7);
  } else {
    // Negative: Blue (hogging moment / negative shear)
    const intensity = Math.abs(normalized);
    return new THREE.Color(1 - intensity * 0.7, 1 - intensity * 0.7, 1);
  }
};

/**
 * Create gradient colors for vertices
 */
const createVertexColors = (
  yVals: number[],
  numVertices: number
): Float32Array => {
  const colors = new Float32Array(numVertices * 3);
  const maxAbsValue = Math.max(...yVals.map(Math.abs), 0.001);
  
  for (let i = 0; i < yVals.length; i++) {
    const color = getValueColor(yVals[i], maxAbsValue);
    
    // Each point creates 2 vertices (top and bottom of the filled area)
    const baseIndex = i * 6; // 2 vertices × 3 components
    
    // Top vertex (actual value)
    colors[baseIndex] = color.r;
    colors[baseIndex + 1] = color.g;
    colors[baseIndex + 2] = color.b;
    
    // Bottom vertex (baseline - neutral color)
    colors[baseIndex + 3] = 0.9;
    colors[baseIndex + 4] = 0.9;
    colors[baseIndex + 5] = 0.9;
  }
  
  return colors;
};

/**
 * Linear interpolation to find value at specific x position
 */
const interpolateValue = (
  x: number,
  xVals: number[],
  yVals: number[]
): number => {
  if (xVals.length === 0) return 0;
  if (x <= xVals[0]) return yVals[0];
  if (x >= xVals[xVals.length - 1]) return yVals[yVals.length - 1];
  
  // Find the segment containing x
  for (let i = 0; i < xVals.length - 1; i++) {
    if (x >= xVals[i] && x <= xVals[i + 1]) {
      const t = (x - xVals[i]) / (xVals[i + 1] - xVals[i]);
      return yVals[i] + t * (yVals[i + 1] - yVals[i]);
    }
  }
  
  return yVals[yVals.length - 1];
};

// ============================================================================
// FILLED DIAGRAM MESH COMPONENT
// ============================================================================

interface FilledDiagramProps {
  beamStart: [number, number, number];
  beamEnd: [number, number, number];
  xVals: number[];
  yVals: number[];
  scaleFactor: number;
  maxHeight: number;
  opacity: number;
  diagramType: 'moment' | 'shear';
}

const FilledDiagram: React.FC<FilledDiagramProps> = ({
  beamStart,
  beamEnd,
  xVals,
  yVals,
  scaleFactor,
  maxHeight,
  opacity,
  diagramType,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Calculate beam direction and length
  const beamVector = useMemo(() => {
    return new Vector3(
      beamEnd[0] - beamStart[0],
      beamEnd[1] - beamStart[1],
      beamEnd[2] - beamStart[2]
    );
  }, [beamStart, beamEnd]);
  
  const beamLength = useMemo(() => beamVector.length(), [beamVector]);
  const beamDirection = useMemo(() => beamVector.clone().normalize(), [beamVector]);
  
  // Calculate perpendicular direction for diagram extrusion (up in Y for horizontal beams)
  const upDirection = useMemo(() => {
    // For horizontal beams, extrude upward in Y
    // For vertical beams, extrude in Z
    if (Math.abs(beamDirection.y) > 0.9) {
      return new Vector3(0, 0, 1);
    }
    return new Vector3(0, 1, 0);
  }, [beamDirection]);
  
  // Create the filled diagram geometry
  const geometry = useMemo(() => {
    if (xVals.length < 2) return null;
    
    const positions: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];
    
    const maxAbsValue = Math.max(...yVals.map(Math.abs), 0.001);
    
    // Clamp and scale values
    const scaledYVals = yVals.map(v => {
      const scaled = v * scaleFactor;
      return Math.sign(scaled) * Math.min(Math.abs(scaled), maxHeight);
    });
    
    // Create vertices for each point
    for (let i = 0; i < xVals.length; i++) {
      // Normalize x position to beam length
      const t = xVals[i] / xVals[xVals.length - 1];
      
      // Position along beam
      const basePos = new Vector3(
        beamStart[0] + beamDirection.x * beamLength * t,
        beamStart[1] + beamDirection.y * beamLength * t,
        beamStart[2] + beamDirection.z * beamLength * t
      );
      
      // Bottom vertex (on the beam)
      positions.push(basePos.x, basePos.y, basePos.z);
      
      // Top vertex (extruded by scaled value)
      const topPos = basePos.clone().add(
        upDirection.clone().multiplyScalar(scaledYVals[i])
      );
      positions.push(topPos.x, topPos.y, topPos.z);
      
      // Colors based on value
      const color = getValueColor(yVals[i], maxAbsValue);
      
      // Bottom vertex color (lighter)
      colors.push(0.95, 0.95, 0.95);
      
      // Top vertex color (gradient based on value)
      colors.push(color.r, color.g, color.b);
    }
    
    // Create triangles (two triangles per segment)
    for (let i = 0; i < xVals.length - 1; i++) {
      const bottomLeft = i * 2;
      const topLeft = i * 2 + 1;
      const bottomRight = (i + 1) * 2;
      const topRight = (i + 1) * 2 + 1;
      
      // Triangle 1: bottomLeft, topLeft, topRight
      indices.push(bottomLeft, topLeft, topRight);
      
      // Triangle 2: bottomLeft, topRight, bottomRight
      indices.push(bottomLeft, topRight, bottomRight);
    }
    
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    
    return geo;
  }, [xVals, yVals, beamStart, beamDirection, beamLength, upDirection, scaleFactor, maxHeight]);
  
  if (!geometry) return null;
  
  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        vertexColors
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};

// ============================================================================
// OUTLINE CURVE COMPONENT
// ============================================================================

interface DiagramOutlineProps {
  beamStart: [number, number, number];
  beamEnd: [number, number, number];
  xVals: number[];
  yVals: number[];
  scaleFactor: number;
  maxHeight: number;
}

const DiagramOutline: React.FC<DiagramOutlineProps> = ({
  beamStart,
  beamEnd,
  xVals,
  yVals,
  scaleFactor,
  maxHeight,
}) => {
  const lineRef = useRef<THREE.Line>(null);
  
  const beamVector = useMemo(() => {
    return new Vector3(
      beamEnd[0] - beamStart[0],
      beamEnd[1] - beamStart[1],
      beamEnd[2] - beamStart[2]
    );
  }, [beamStart, beamEnd]);
  
  const beamLength = beamVector.length();
  const beamDirection = beamVector.clone().normalize();
  
  const upDirection = useMemo(() => {
    if (Math.abs(beamDirection.y) > 0.9) {
      return new Vector3(0, 0, 1);
    }
    return new Vector3(0, 1, 0);
  }, [beamDirection]);
  
  const points = useMemo(() => {
    const pts: Vector3[] = [];
    const maxAbsValue = Math.max(...yVals.map(Math.abs), 0.001);
    
    for (let i = 0; i < xVals.length; i++) {
      const t = xVals[i] / xVals[xVals.length - 1];
      
      const basePos = new Vector3(
        beamStart[0] + beamDirection.x * beamLength * t,
        beamStart[1] + beamDirection.y * beamLength * t,
        beamStart[2] + beamDirection.z * beamLength * t
      );
      
      let scaledY = yVals[i] * scaleFactor;
      scaledY = Math.sign(scaledY) * Math.min(Math.abs(scaledY), maxHeight);
      
      const topPos = basePos.clone().add(upDirection.clone().multiplyScalar(scaledY));
      pts.push(topPos);
    }
    
    return pts;
  }, [xVals, yVals, beamStart, beamDirection, beamLength, upDirection, scaleFactor, maxHeight]);
  
  const geometry = useMemo(() => {
    const geo = new BufferGeometry().setFromPoints(points);
    return geo;
  }, [points]);
  
  return (
    <line ref={lineRef} geometry={geometry}>
      <lineBasicMaterial color="#333333" linewidth={2} />
    </line>
  );
};

// ============================================================================
// SCANNER CURSOR (Vertical Line + Tooltip)
// ============================================================================

interface ScannerCursorProps {
  beamStart: [number, number, number];
  beamEnd: [number, number, number];
  xPosition: number;  // Position along beam (0 to beam length)
  value: number;      // Interpolated value at this position
  diagramType: 'moment' | 'shear';
  unit: string;
  scaleFactor: number;
  maxHeight: number;
  visible: boolean;
}

const ScannerCursor: React.FC<ScannerCursorProps> = ({
  beamStart,
  beamEnd,
  xPosition,
  value,
  diagramType,
  unit,
  scaleFactor,
  maxHeight,
  visible,
}) => {
  const beamVector = useMemo(() => {
    return new Vector3(
      beamEnd[0] - beamStart[0],
      beamEnd[1] - beamStart[1],
      beamEnd[2] - beamStart[2]
    );
  }, [beamStart, beamEnd]);
  
  const beamLength = beamVector.length();
  const beamDirection = beamVector.clone().normalize();
  const beamStartPoint = useMemo(() => xVals[0] || 0, []);
  const beamEndPoint = useMemo(() => xVals[xVals.length - 1] || beamLength, [beamLength]);
  
  // Normalized position (0 to 1)
  const t = xPosition / beamLength;
  
  // Position along beam
  const basePosition = useMemo(() => {
    return new Vector3(
      beamStart[0] + beamDirection.x * beamLength * t,
      beamStart[1] + beamDirection.y * beamLength * t,
      beamStart[2] + beamDirection.z * beamLength * t
    );
  }, [beamStart, beamDirection, beamLength, t]);
  
  // Scaled value height
  let scaledValue = value * scaleFactor;
  scaledValue = Math.sign(scaledValue) * Math.min(Math.abs(scaledValue), maxHeight);
  
  // Top position for tooltip
  const topPosition = useMemo(() => {
    const up = Math.abs(beamDirection.y) > 0.9 
      ? new Vector3(0, 0, 1) 
      : new Vector3(0, 1, 0);
    return basePosition.clone().add(up.multiplyScalar(scaledValue + 0.5));
  }, [basePosition, scaledValue, beamDirection]);
  
  if (!visible) return null;
  
  return (
    <group>
      {/* Vertical cursor line */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={new Float32Array([
              basePosition.x, basePosition.y - 0.5, basePosition.z,
              topPosition.x, topPosition.y + 0.5, topPosition.z,
            ])}
            count={2}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" linewidth={2} />
      </line>
      
      {/* Small sphere at value point */}
      <mesh position={[topPosition.x, topPosition.y - 0.5, topPosition.z]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      
      {/* Floating tooltip */}
      <Html
        position={[topPosition.x, topPosition.y + 0.3, topPosition.z]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.85)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <div style={{ marginBottom: '4px', opacity: 0.7 }}>
            📍 x: <strong>{xPosition.toFixed(2)}m</strong>
          </div>
          <div style={{ 
            color: value >= 0 ? '#ff6b6b' : '#4dabf7',
            fontWeight: 'bold',
            fontSize: '14px'
          }}>
            {diagramType === 'moment' ? '📐' : '⚡'} {diagramType}: {value.toFixed(2)} {unit}
          </div>
        </div>
      </Html>
    </group>
  );
};

// ============================================================================
// MAIN DIAGRAM OVERLAY COMPONENT
// ============================================================================

export const DiagramOverlay: React.FC<DiagramOverlayProps> = ({
  beamStart,
  beamEnd,
  diagramData,
  diagramType,
  visible = true,
  scaleFactor,
  maxHeight = 2,
  opacity = 0.6,
  showScanner = true,
  unit,
}) => {
  const { camera, raycaster, gl } = useThree();
  
  // State for scanner
  const [scannerPosition, setScannerPosition] = useState<number | null>(null);
  const [scannerValue, setScannerValue] = useState<number>(0);
  const [isHovering, setIsHovering] = useState(false);
  
  const mouse = useRef(new THREE.Vector2());
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  
  // Extract data
  const { x_vals: xVals, y_vals: yVals } = diagramData;
  
  // Default scale factor based on diagram type
  const effectiveScaleFactor = scaleFactor ?? (diagramType === 'moment' ? 0.01 : 0.02);
  
  // Default unit based on diagram type
  const effectiveUnit = unit ?? (diagramType === 'moment' ? 'kNm' : 'kN');
  
  // Calculate beam properties
  const beamVector = useMemo(() => {
    return new Vector3(
      beamEnd[0] - beamStart[0],
      beamEnd[1] - beamStart[1],
      beamEnd[2] - beamStart[2]
    );
  }, [beamStart, beamEnd]);
  
  const beamLength = beamVector.length();
  const beamDirection = beamVector.clone().normalize();
  
  // Handle mouse move for scanner
  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (!showScanner || !visible) return;
    
    const canvas = gl.domElement;
    const rect = canvas.getBoundingClientRect();
    
    mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Raycast to ground plane
    raycaster.setFromCamera(mouse.current, camera);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(groundPlane, intersection);
    
    if (intersection) {
      // Project intersection onto beam axis
      const beamStartVec = new Vector3(...beamStart);
      const toIntersection = intersection.clone().sub(beamStartVec);
      const projectionLength = toIntersection.dot(beamDirection);
      
      // Check if within beam bounds
      if (projectionLength >= 0 && projectionLength <= beamLength) {
        // Check distance from beam axis
        const projectedPoint = beamStartVec.clone().add(
          beamDirection.clone().multiplyScalar(projectionLength)
        );
        const distanceFromBeam = intersection.distanceTo(projectedPoint);
        
        // Only show scanner if close to beam (within 2 meters)
        if (distanceFromBeam < 2) {
          setIsHovering(true);
          setScannerPosition(projectionLength);
          
          // Interpolate value at this position
          // Map projection length to xVals range
          const beamXRange = xVals[xVals.length - 1] - xVals[0];
          const xAtPosition = xVals[0] + (projectionLength / beamLength) * beamXRange;
          const value = interpolateValue(xAtPosition, xVals, yVals);
          setScannerValue(value);
        } else {
          setIsHovering(false);
        }
      } else {
        setIsHovering(false);
      }
    }
  }, [showScanner, visible, gl, camera, raycaster, beamStart, beamDirection, beamLength, xVals, yVals]);
  
  // Set up event listeners
  React.useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener('pointermove', handlePointerMove);
    
    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove);
    };
  }, [gl, handlePointerMove]);
  
  if (!visible || xVals.length < 2) return null;
  
  return (
    <group name={`diagram-overlay-${diagramType}`}>
      {/* Filled diagram area */}
      <FilledDiagram
        beamStart={beamStart}
        beamEnd={beamEnd}
        xVals={xVals}
        yVals={yVals}
        scaleFactor={effectiveScaleFactor}
        maxHeight={maxHeight}
        opacity={opacity}
        diagramType={diagramType}
      />
      
      {/* Outline curve */}
      <DiagramOutline
        beamStart={beamStart}
        beamEnd={beamEnd}
        xVals={xVals}
        yVals={yVals}
        scaleFactor={effectiveScaleFactor}
        maxHeight={maxHeight}
      />
      
      {/* Scanner cursor */}
      {showScanner && scannerPosition !== null && (
        <ScannerCursor
          beamStart={beamStart}
          beamEnd={beamEnd}
          xPosition={scannerPosition}
          value={scannerValue}
          diagramType={diagramType}
          unit={effectiveUnit}
          scaleFactor={effectiveScaleFactor}
          maxHeight={maxHeight}
          visible={isHovering}
        />
      )}
      
      {/* Baseline (zero line) */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={new Float32Array([
              beamStart[0], beamStart[1], beamStart[2],
              beamEnd[0], beamEnd[1], beamEnd[2],
            ])}
            count={2}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#666666" linewidth={1} transparent opacity={0.5} />
      </line>
    </group>
  );
};

// ============================================================================
// CONVENIENCE WRAPPER FOR MULTIPLE DIAGRAMS
// ============================================================================

export interface AnalysisResultsOverlayProps {
  beamStart: [number, number, number];
  beamEnd: [number, number, number];
  shearDiagram?: DiagramData;
  momentDiagram?: DiagramData;
  showShear?: boolean;
  showMoment?: boolean;
  shearOffset?: number;  // Vertical offset for shear diagram
}

export const AnalysisResultsOverlay: React.FC<AnalysisResultsOverlayProps> = ({
  beamStart,
  beamEnd,
  shearDiagram,
  momentDiagram,
  showShear = true,
  showMoment = true,
  shearOffset = 3,
}) => {
  // Offset shear diagram below the beam
  const shearBeamStart: [number, number, number] = [
    beamStart[0],
    beamStart[1] - shearOffset,
    beamStart[2],
  ];
  const shearBeamEnd: [number, number, number] = [
    beamEnd[0],
    beamEnd[1] - shearOffset,
    beamEnd[2],
  ];
  
  return (
    <group name="analysis-results-overlay">
      {/* Bending Moment Diagram (above beam) */}
      {showMoment && momentDiagram && (
        <DiagramOverlay
          beamStart={beamStart}
          beamEnd={beamEnd}
          diagramData={momentDiagram}
          diagramType="moment"
          scaleFactor={0.01}
          opacity={0.6}
        />
      )}
      
      {/* Shear Force Diagram (below beam) */}
      {showShear && shearDiagram && (
        <DiagramOverlay
          beamStart={shearBeamStart}
          beamEnd={shearBeamEnd}
          diagramData={shearDiagram}
          diagramType="shear"
          scaleFactor={0.02}
          opacity={0.5}
        />
      )}
    </group>
  );
};

export default DiagramOverlay;
