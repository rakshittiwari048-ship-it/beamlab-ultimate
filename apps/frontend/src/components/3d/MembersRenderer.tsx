import { useRef, useLayoutEffect, useMemo, useCallback } from 'react';
import { 
  InstancedMesh, 
  Matrix4, 
  Vector3, 
  Quaternion, 
  Color, 
  Shape, 
  ExtrudeGeometry,
  BufferGeometry
} from 'three';
import { useModelStore, selectAllMembers, selectAllNodes, Member } from '../../store/model';
import { useSelectionStore } from '../../store/selection';
import { useSectionsStore, Section, getScaledSectionDimensions } from '../../store/sections';
import { ThreeEvent } from '@react-three/fiber';
import { getGeometryLOD, getCylinderSegments, type GeometryLOD } from '../../utils/performanceConfig';

/**
 * alignVector - Align beam local axes to target direction while keeping roll consistent.
 * Local axes we want after alignment:
 *   - Y: along member direction
 *   - Z: as close to world up (0,1,0) as possible (depth/web direction)
 *   - X: completes right-handed system (flange direction, horizontal)
 */
const alignVector = (quaternion: Quaternion, direction: Vector3, _up: Vector3): void => {
  const dir = new Vector3().copy(direction).normalize();
  const worldUp = new Vector3(0, 1, 0);

  // If almost vertical, choose a stable right vector
  const isVertical = Math.abs(dir.dot(worldUp)) > 0.999;
  const right = new Vector3();
  if (isVertical) {
    // Use global X as reference to avoid degeneracy
    right.set(1, 0, 0).cross(dir).normalize();
    // If still degenerate (unlikely), fall back to global Z
    if (right.lengthSq() < 1e-6) {
      right.set(0, 0, 1).cross(dir).normalize();
    }
  } else {
    right.crossVectors(dir, worldUp).normalize();
  }

  // Actual up (depth direction) is perpendicular to direction and right
  const actualUp = new Vector3().crossVectors(right, dir).normalize();

  // Build rotation matrix from basis (X=right, Y=dir, Z=actualUp)
  const m = new Matrix4().makeBasis(right, dir, actualUp);
  quaternion.setFromRotationMatrix(m);
};

/**
 * Create an I-beam cross-section geometry
 * 
 * Cross-section is created in the X-Y plane:
 * - X axis: flange width direction (horizontal)
 * - Y axis: depth direction (vertical height of I-beam)
 * 
 * For a horizontal beam along X-axis:
 * - Depth should be vertical (along global Y)
 * - Flanges should be horizontal (parallel to XZ plane)
 */
function createIBeamCrossSection(
  depth: number,
  flangeWidth: number,
  flangeThickness: number,
  webThickness: number
): Shape {
  const shape = new Shape();
  
  // Create I-beam profile in X-Z plane (for extrusion along Y)
  // X = flange width direction, Z = depth direction
  const halfDepth = depth / 2;
  const halfFlange = flangeWidth / 2;
  const halfWeb = webThickness / 2;
  
  // Start at bottom-left of bottom flange
  shape.moveTo(-halfFlange, -halfDepth);
  // Bottom flange - bottom edge
  shape.lineTo(halfFlange, -halfDepth);
  // Right side of bottom flange
  shape.lineTo(halfFlange, -halfDepth + flangeThickness);
  // Step in to web (right side)
  shape.lineTo(halfWeb, -halfDepth + flangeThickness);
  // Web right side going up
  shape.lineTo(halfWeb, halfDepth - flangeThickness);
  // Step out to top flange (right side)
  shape.lineTo(halfFlange, halfDepth - flangeThickness);
  // Top flange - right side going up
  shape.lineTo(halfFlange, halfDepth);
  // Top flange - top edge
  shape.lineTo(-halfFlange, halfDepth);
  // Top flange - left side going down
  shape.lineTo(-halfFlange, halfDepth - flangeThickness);
  // Step in to web (left side)
  shape.lineTo(-halfWeb, halfDepth - flangeThickness);
  // Web left side going down
  shape.lineTo(-halfWeb, -halfDepth + flangeThickness);
  // Step out to bottom flange (left side)
  shape.lineTo(-halfFlange, -halfDepth + flangeThickness);
  // Close path
  shape.lineTo(-halfFlange, -halfDepth);
  
  return shape;
}

/**
 * Create extruded I-beam geometry for a beam of unit length
 * 
 * The geometry is created with:
 * - Local Y-axis: beam axis (length direction) - for scaling
 * - Local Z-axis: depth direction (should point up for horizontal beams)
 * - Local X-axis: flange width direction (should be horizontal for horizontal beams)
 * 
 * The alignVector function will orient the beam such that:
 * - Local Y aligns with member direction
 * - Local Z points as close to world-up as possible (making depth vertical)
 * - Local X stays horizontal (keeping flanges level)
 */
function createIBeamGeometry(section: Section, scaleFactor: number = 10): BufferGeometry {
  const dims = getScaledSectionDimensions(section, scaleFactor);
  
  // Create cross-section in X-Y plane (flange width along X, depth along Y)
  const shape = createIBeamCrossSection(
    dims.depth,
    dims.flangeWidth,
    dims.flangeThickness,
    dims.webThickness
  );
  
  const extrudeSettings = {
    steps: 1,
    depth: 1,  // Unit length, will be scaled by member length
    bevelEnabled: false,
  };
  
  // ExtrudeGeometry extrudes the shape along the Z-axis
  // Initial state after extrude:
  //   - X: flange width direction
  //   - Y: depth direction (from shape)
  //   - Z: beam length (extrusion direction)
  const geometry = new ExtrudeGeometry(shape, extrudeSettings);
  
  // Rotate -90° about X to make beam axis along Y (for scaling with member length)
  // After this rotation:
  //   - X: flange width (unchanged)
  //   - Y: beam length (was Z)
  //   - Z: -depth (was Y, now inverted)
  geometry.rotateX(-Math.PI / 2);
  
  // The depth is now along -Z. When alignVector makes Z point up (world Y),
  // the depth will be correctly vertical with flanges horizontal.
  // No additional rotation needed here.
  
  // Center the geometry at origin (beam goes from -0.5 to +0.5 along Y)
  geometry.translate(0, -0.5, 0);
  
  return geometry;
}

// ============================================================================
// SECTION GROUP RENDERER - Renders all members of a specific section
// ============================================================================

interface SectionGroupProps {
  sectionId: string;
  members: Member[];
  nodeMap: Map<string, { x: number; y: number; z: number }>;
  selectedMemberIds: Set<string>;
  hoveredMemberId: string | null;
  onPointerMove: (memberId: string) => void;
  onPointerOut: () => void;
  onClick: (memberId: string, shiftKey: boolean) => void;
  geometryLOD: GeometryLOD;
  colorMode: 'DEFAULT' | 'UTILIZATION';
  utilizationByMember?: Map<string, number> | Record<string, number>;
}

function SectionGroup({
  sectionId,
  members,
  nodeMap,
  selectedMemberIds,
  hoveredMemberId,
  onPointerMove,
  onPointerOut,
  onClick,
  geometryLOD,
  colorMode,
  utilizationByMember,
}: SectionGroupProps) {
  const meshRef = useRef<InstancedMesh>(null);
  
  // Get section from store
  const getSectionById = useSectionsStore((state) => state.getSectionById);
  const getDefaultSection = useSectionsStore((state) => state.getDefaultSection);
  
  const section = useMemo(() => {
    return getSectionById(sectionId) || getDefaultSection();
  }, [sectionId, getSectionById, getDefaultSection]);
  
  // Create geometry for this section based on LOD
  const geometry = useMemo(() => {
    if (geometryLOD === 'ibeam' && section) {
      return createIBeamGeometry(section, 10);
    }
    return null;
  }, [geometryLOD, section]);
  
  // Get cylinder segments for non-I-beam geometries
  const cylinderSegments = useMemo(() => {
    return getCylinderSegments(geometryLOD);
  }, [geometryLOD]);
  
  // Reusable objects for matrix calculations
  const matrix = useMemo(() => new Matrix4(), []);
  const position = useMemo(() => new Vector3(), []);
  const scale = useMemo(() => new Vector3(1, 1, 1), []);
  const quaternion = useMemo(() => new Quaternion(), []);
  const start = useMemo(() => new Vector3(), []);
  const end = useMemo(() => new Vector3(), []);
  const direction = useMemo(() => new Vector3(), []);
  const up = useMemo(() => new Vector3(0, 1, 0), []);
  const color = useMemo(() => new Color(), []);

  // Utilization color helper
  const getUtilColor = useCallback((ratio: number | undefined) => {
    if (ratio === undefined || Number.isNaN(ratio)) return '#8b5cf6';
    if (ratio < 0.5) return '#10b981';       // green (safe)
    if (ratio < 0.9) return '#f59e0b';       // yellow (warning)
    if (ratio <= 1.0) return '#f97316';      // orange (critical)
    return '#ef4444';                         // red (failed)
  }, []);

  const getRatio = useCallback((memberId: string): number | undefined => {
    if (!utilizationByMember) return undefined;
    if (utilizationByMember instanceof Map) return utilizationByMember.get(memberId);
    return (utilizationByMember as Record<string, number>)[memberId];
  }, [utilizationByMember]);
  
  // Update instance matrices
  useLayoutEffect(() => {
    if (!meshRef.current) return;
    
    const mesh = meshRef.current;
    mesh.count = members.length;
    
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      const isSelected = selectedMemberIds.has(member.id);
      const isHovered = hoveredMemberId === member.id;
      
      const startNode = nodeMap.get(member.startNodeId);
      const endNode = nodeMap.get(member.endNodeId);
      
      if (!startNode || !endNode) {
        matrix.identity();
        mesh.setMatrixAt(i, matrix);
        continue;
      }
      
      start.set(startNode.x, startNode.y, startNode.z);
      end.set(endNode.x, endNode.y, endNode.z);
      position.lerpVectors(start, end, 0.5);
      
      direction.subVectors(end, start);
      const length = direction.length();
      direction.normalize();
      
      scale.set(1, length, 1);
      alignVector(quaternion, direction, up);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(i, matrix);
      
      if (isSelected) {
        color.set('#ff00ff');
      } else if (isHovered) {
        color.set('#60a5fa');
      } else if (colorMode === 'UTILIZATION') {
        color.set(getUtilColor(getRatio(member.id)));
      } else {
        color.set('#8b5cf6');
      }
      mesh.setColorAt(i, color);
    }
    
    if (members.length > 0) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
  }, [members, nodeMap, selectedMemberIds, hoveredMemberId, matrix, position, scale, quaternion, start, end, direction, up, color, colorMode, getRatio, getUtilColor]);
  
  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && members[e.instanceId]) {
      onPointerMove(members[e.instanceId].id);
    }
  }, [members, onPointerMove]);
  
  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && members[e.instanceId]) {
      onClick(members[e.instanceId].id, e.shiftKey);
    }
  }, [members, onClick]);
  
  if (members.length === 0) return null;
  
  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, members.length]}
      frustumCulled={true}
      onPointerMove={handlePointerMove}
      onPointerOut={onPointerOut}
      onClick={handleClick}
    >
      {geometryLOD === 'ibeam' && geometry ? (
        <primitive object={geometry} attach="geometry" />
      ) : (
        <cylinderGeometry args={[0.05, 0.05, 1, cylinderSegments]} />
      )}
      <meshStandardMaterial color="#8b5cf6" />
    </instancedMesh>
  );
}

// ============================================================================
// MEMBERS RENDERER - Groups members by section and renders each group
// ============================================================================

interface MembersRendererProps {
  useIBeam?: boolean;
  onMemberClick?: (memberId: string) => void;
  colorMode?: 'DEFAULT' | 'UTILIZATION';
  utilizationByMember?: Map<string, number> | Record<string, number>;
}

export const MembersRenderer = ({ useIBeam = true, onMemberClick, colorMode = 'DEFAULT', utilizationByMember }: MembersRendererProps) => {
  const members = useModelStore(selectAllMembers);
  const nodes = useModelStore(selectAllNodes);
  
  // Auto-detect LOD based on structure size
  const geometryLOD = useMemo(() => {
    // If useIBeam is explicitly false, use simplest cylinder
    if (useIBeam === false) return 'cylinder-6';
    // Otherwise, auto-detect based on member count
    return getGeometryLOD(members.length);
  }, [members.length, useIBeam]);
  const selectedMemberIds = useSelectionStore((state) => state.selectedMemberIds);
  const hoveredMemberId = useSelectionStore((state) => state.hoveredMemberId);
  const selectMember = useSelectionStore((state) => state.selectMember);
  const toggleMember = useSelectionStore((state) => state.toggleMember);
  const setHoveredMember = useSelectionStore((state) => state.setHoveredMember);
  
  // Create node map for O(1) lookups
  const nodeMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number; z: number }>();
    nodes.forEach(node => map.set(node.id, node));
    return map;
  }, [nodes]);
  
  // Group members by their sectionId
  const membersBySection = useMemo(() => {
    const groups = new Map<string, Member[]>();
    
    for (const member of members) {
      const sectionId = member.sectionId || 'ISMB300';
      if (!groups.has(sectionId)) {
        groups.set(sectionId, []);
      }
      groups.get(sectionId)!.push(member);
    }
    
    return groups;
  }, [members]);
  
  // Event handlers
  const handlePointerMove = useCallback((memberId: string) => {
    setHoveredMember(memberId);
  }, [setHoveredMember]);
  
  const handlePointerOut = useCallback(() => {
    setHoveredMember(null);
  }, [setHoveredMember]);
  
  const handleClick = useCallback((memberId: string, shiftKey: boolean) => {
    // If external handler provided, use it
    if (onMemberClick) {
      onMemberClick(memberId);
      return;
    }
    // Default selection behavior
    if (shiftKey) {
      toggleMember(memberId);
    } else {
      selectMember(memberId, false);
    }
  }, [selectMember, toggleMember, onMemberClick]);
  
  // Render a SectionGroup for each unique section
  return (
    <>
      {Array.from(membersBySection.entries()).map(([sectionId, sectionMembers]) => (
        <SectionGroup
          key={sectionId}
          sectionId={sectionId}
          members={sectionMembers}
          nodeMap={nodeMap}
          selectedMemberIds={selectedMemberIds}
          hoveredMemberId={hoveredMemberId}
          onPointerMove={handlePointerMove}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
          geometryLOD={geometryLOD}
          colorMode={colorMode}
          utilizationByMember={utilizationByMember}
        />
      ))}
    </>
  );
};
