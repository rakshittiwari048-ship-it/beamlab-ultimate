import type { FC } from 'react';
import { useState, useCallback } from 'react';
import { useViewportStore, type ViewportType } from '../store/viewport';
import { NodesRenderer } from './3d/NodesRenderer';
import { MembersRenderer } from './3d/MembersRenderer';
import { SupportRenderer } from './3d/SupportRenderer';
import { LoadRenderer } from './3d/LoadRenderer';
import { ReactionRenderer } from './3d/ReactionRenderer';
import { DiagramRenderer } from './3d/DiagramRenderer';
import { InteractionManager, useInteractionState } from './InteractionManager';
import { useModelStore, generateNodeId } from '../store/model';
import { useDrawBeamTool } from '../hooks/useDrawBeamTool';
import { DrawBeamGhostLine } from './DrawBeamGhostLine';
import { Vector3 } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Tool } from './ToolSelector';

// Load dialog state type
type LoadDialogType = 'point' | 'udl' | 'uvl' | 'point-member';

/**
 * SceneContent - Shared 3D scene content for all viewports
 * 
 * This component renders the actual 3D geometry, grid, axes, etc.
 * It receives the viewportType to customize rendering per view if needed.
 * 
 * Uses optimized InstancedMesh renderers for high performance.
 * Conditionally enables tools based on activeTool prop.
 */
interface SceneContentProps {
  viewportType: ViewportType;
  activeTool: Tool;
}

export const SceneContent: FC<SceneContentProps> = ({ viewportType, activeTool }) => {
  const showGrid = useViewportStore((state) => state.showGrid);
  const showAxis = useViewportStore((state) => state.showAxis);
  const addNode = useModelStore((state) => state.addNode);
  const addSupport = useModelStore((state) => state.addSupport);
  const removeSupport = useModelStore((state) => state.removeSupport);
  const supports = useModelStore((state) => state.supports);
  const addLoadCase = useModelStore((state) => state.addLoadCase);
  const addLoad = useModelStore((state) => state.addLoad);
  const loadCases = useModelStore((state) => state.loadCases);
  const activeLoadCaseId = useModelStore((state) => state.activeLoadCaseId);
  const setActiveLoadCase = useModelStore((state) => state.setActiveLoadCase);
  const nodes = useModelStore((state) => state.getAllNodes());
  const members = useModelStore((state) => state.getAllMembers());
  const displacementScale = useModelStore((state) => state.displacementScale);
  const solverResult = useModelStore((state) => state.solverResult);
  const analysisResults = useModelStore((state) => state.analysisResults);
  const designUtilization = useModelStore((state) => state.designUtilization);
  const selectedMemberIds = useModelStore((state) => state.selectedMemberIds);
  
  // Diagram visualization state
  const [showDiagrams, setShowDiagrams] = useState(false);
  const [diagramType, setDiagramType] = useState<'MZ' | 'FY'>('MZ');
  const [diagramScale, setDiagramScale] = useState(0.1);
  
  // State for node load dialog
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [loadDialogNodeId, setLoadDialogNodeId] = useState<string | null>(null);
  const [loadDialogPosition, setLoadDialogPosition] = useState<{ x: number; y: number; z: number } | null>(null);
  const [loadFy, setLoadFy] = useState(-10);
  
  // State for member load dialog
  const [memberLoadDialogOpen, setMemberLoadDialogOpen] = useState(false);
  const [memberLoadDialogMemberId, setMemberLoadDialogMemberId] = useState<string | null>(null);
  const [memberLoadDialogPosition, setMemberLoadDialogPosition] = useState<{ x: number; y: number; z: number } | null>(null);
  const [memberLoadType, setMemberLoadType] = useState<LoadDialogType>('udl');
  const [memberLoadWy, setMemberLoadWy] = useState(-5); // UDL intensity
  const [memberLoadWyStart, setMemberLoadWyStart] = useState(-5); // UVL start
  const [memberLoadWyEnd, setMemberLoadWyEnd] = useState(0); // UVL end (triangular)
  
  // Interaction state for future member creation workflow
  useInteractionState();

  // DrawBeamTool for member creation - only active when tool is 'beam'
  const beamTool = useDrawBeamTool('W12x26');
  const { raycaster, pointer, camera } = useThree();

  // Check if beam tool is currently active and in drawing mode
  const isBeamToolActive = activeTool === 'beam';
  const isDrawingBeam = isBeamToolActive && beamTool.state === 'WAITING_FOR_SECOND_POINT';

  // Ensure a default load case exists
  const ensureLoadCase = useCallback(() => {
    if (loadCases.length === 0) {
      const newLoadCase = {
        id: 'lc-1',
        name: 'Dead Load',
        loads: [],
      };
      addLoadCase(newLoadCase);
      setActiveLoadCase('lc-1');
      return 'lc-1';
    }
    if (!activeLoadCaseId && loadCases.length > 0) {
      setActiveLoadCase(loadCases[0].id);
      return loadCases[0].id;
    }
    return activeLoadCaseId;
  }, [loadCases, activeLoadCaseId, addLoadCase, setActiveLoadCase]);

  // Handle node click for support/load tools
  const handleNodeClickForTools = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (activeTool === 'support') {
      // Toggle support: if exists, cycle through types or remove
      const existingSupport = supports.get(nodeId);
      if (!existingSupport) {
        addSupport(nodeId, 'pinned');
        console.log(`Added pinned support at node ${nodeId}`);
      } else if (existingSupport === 'pinned') {
        addSupport(nodeId, 'fixed');
        console.log(`Changed to fixed support at node ${nodeId}`);
      } else {
        removeSupport(nodeId);
        console.log(`Removed support from node ${nodeId}`);
      }
    } else if (activeTool === 'load') {
      // Open load dialog
      ensureLoadCase();
      setLoadDialogNodeId(nodeId);
      setLoadDialogPosition({ x: node.x, y: node.y, z: node.z });
      setLoadDialogOpen(true);
    } else if (activeTool === 'beam') {
      // Beam tool - use beam tool handler
      beamTool.handleNodeClick(nodeId, new Vector3(node.x, node.y, node.z));
    }
  }, [activeTool, nodes, supports, addSupport, removeSupport, ensureLoadCase, beamTool]);

  // Handle load dialog submit
  const handleLoadSubmit = useCallback(() => {
    if (!loadDialogNodeId) return;
    
    const loadId = `load-${Date.now()}`;
    addLoad({
      id: loadId,
      type: 'point',
      nodeId: loadDialogNodeId,
      fx: 0,
      fy: loadFy,
      fz: 0,
    });
    console.log(`Added point load (Fy=${loadFy} kN) at node ${loadDialogNodeId}`);
    
    setLoadDialogOpen(false);
    setLoadDialogNodeId(null);
    setLoadDialogPosition(null);
  }, [loadDialogNodeId, loadFy, addLoad]);

  // Handle member click for load tool
  const handleMemberClickForTools = useCallback((memberId: string) => {
    if (activeTool !== 'load') return;
    
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    
    // Get member midpoint for dialog position
    const startNode = nodes.find(n => n.id === member.startNodeId);
    const endNode = nodes.find(n => n.id === member.endNodeId);
    if (!startNode || !endNode) return;
    
    const midpoint = {
      x: (startNode.x + endNode.x) / 2,
      y: (startNode.y + endNode.y) / 2,
      z: (startNode.z + endNode.z) / 2,
    };
    
    ensureLoadCase();
    setMemberLoadDialogMemberId(memberId);
    setMemberLoadDialogPosition(midpoint);
    setMemberLoadDialogOpen(true);
  }, [activeTool, members, nodes, ensureLoadCase]);

  // Handle member load dialog submit
  const handleMemberLoadSubmit = useCallback(() => {
    if (!memberLoadDialogMemberId) return;
    
    const loadId = `load-${Date.now()}`;
    
    if (memberLoadType === 'udl') {
      addLoad({
        id: loadId,
        type: 'udl',
        memberId: memberLoadDialogMemberId,
        startPos: 0,
        endPos: 1,
        wx: 0,
        wy: memberLoadWy,
        wz: 0,
      });
      console.log(`Added UDL (wy=${memberLoadWy} kN/m) on member ${memberLoadDialogMemberId}`);
    } else if (memberLoadType === 'uvl') {
      addLoad({
        id: loadId,
        type: 'uvl',
        memberId: memberLoadDialogMemberId,
        startPos: 0,
        endPos: 1,
        wxStart: 0,
        wyStart: memberLoadWyStart,
        wzStart: 0,
        wxEnd: 0,
        wyEnd: memberLoadWyEnd,
        wzEnd: 0,
      });
      console.log(`Added UVL (wyStart=${memberLoadWyStart}, wyEnd=${memberLoadWyEnd} kN/m) on member ${memberLoadDialogMemberId}`);
    }
    
    setMemberLoadDialogOpen(false);
    setMemberLoadDialogMemberId(null);
    setMemberLoadDialogPosition(null);
  }, [memberLoadDialogMemberId, memberLoadType, memberLoadWy, memberLoadWyStart, memberLoadWyEnd, addLoad]);

  // Update ghost line position when in beam drawing mode
  useFrame(() => {
    if (isDrawingBeam) {
      raycaster.setFromCamera(pointer, camera);
      
      // Raycast to horizontal plane at y=0
      const planeNormal = new Vector3(0, 1, 0);
      const planePoint = new Vector3(0, 0, 0);
      const ray = raycaster.ray;
      
      // Calculate t parameter for ray-plane intersection
      const denom = planeNormal.dot(ray.direction);
      if (Math.abs(denom) > 0.0001) {
        const diff = new Vector3().subVectors(planePoint, ray.origin);
        const t = diff.dot(planeNormal) / denom;
        
        if (t >= 0) {
          const intersection = new Vector3();
          ray.at(t, intersection);
          beamTool.updateGhostPosition(intersection);
        }
      }
    }
  });

  // Handle pointer down - tool-specific behavior
  const handlePointerDown = (x: number, y: number, z: number) => {
    if (activeTool === 'node') {
      // Node creation tool - create node on click
      const nodeId = generateNodeId();
      addNode({ id: nodeId, x, y, z });
      console.log(`Created node at (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
    }
    // Other tools can be added here (support, load, etc.)
  };

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-10, -10, -5]} intensity={0.3} />

      {/* Grid Helper - conditional by viewport */}
      {showGrid && (
        <gridHelper
          args={[50, 50, 0x444444, 0x222222]}
          rotation={viewportType === 'FRONT' ? [Math.PI / 2, 0, 0] : undefined}
        />
      )}

      {/* Axis Helper */}
      {showAxis && <axesHelper args={[5]} />}

      {/* Interaction Manager - Handles raycasting and ghost cursor */}
      {/* Only enabled for node tool OR when beam tool is idle */}
      <InteractionManager
        enabled={activeTool === 'node' || (isBeamToolActive && beamTool.state === 'IDLE')}
        viewportType={viewportType}
        gridStep={1.0}
        showCursor={activeTool === 'node'}
        onPointerDown={handlePointerDown}
      />

      {/* DrawBeam Ghost Line - Shows beam being drawn (only when beam tool active) */}
      {isBeamToolActive && (
        <DrawBeamGhostLine
          state={beamTool.state}
          startPosition={beamTool.startPosition}
          ghostEndPosition={beamTool.ghostEndPosition}
          color="#10b981"
          opacity={0.7}
          showNodes={true}
        />
      )}

      {/* Render Nodes - Optimized with InstancedMesh */}
      {/* Base (undeformed) nodes in blue */}
      <NodesRenderer
        onNodeClick={(activeTool === 'beam' || activeTool === 'support' || activeTool === 'load') 
          ? handleNodeClickForTools 
          : undefined
        }
        renderDeformed={false}
      />

      {/* Deformed shape overlay in red (non-interactive) */}
      {solverResult && (
        <group>
          <NodesRenderer
            onNodeClick={undefined}
            deflectionScale={displacementScale}
            renderDeformed={true}
          />
        </group>
      )}

      {/* Render Members - Optimized with InstancedMesh */}
      {/* Pass click handler when load tool is active */}
      <MembersRenderer
        onMemberClick={activeTool === 'load' ? handleMemberClickForTools : undefined}
        colorMode={designUtilization && designUtilization.size > 0 ? 'UTILIZATION' : 'DEFAULT'}
        utilizationByMember={designUtilization}
      />

      {/* Render Supports (Fixed = Cube, Pinned = Pyramid) */}
      <SupportRenderer />

      {/* Render Loads (Point loads as arrows) */}
      <LoadRenderer />

      {/* Render Support Reactions (after analysis) */}
      <ReactionRenderer />

      {/* Render Bending Moment / Shear Force Diagrams (for selected members) */}
      {showDiagrams && analysisResults && Array.from(selectedMemberIds).map(memberId => (
        <DiagramRenderer
          key={`${memberId}-${diagramType}`}
          memberId={memberId}
          type={diagramType}
          scale={diagramScale}
        />
      ))}

      {/* Load Input Dialog (for node loads) */}
      {loadDialogOpen && loadDialogPosition && (
        <Html position={[loadDialogPosition.x, loadDialogPosition.y + 1, loadDialogPosition.z]}>
          <div className="bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-600 min-w-[200px]">
            <h3 className="text-white font-bold mb-3">Add Point Load</h3>
            <div className="mb-3">
              <label className="text-gray-400 text-sm block mb-1">Fy (kN) - Vertical</label>
              <input
                type="number"
                value={loadFy}
                onChange={(e) => setLoadFy(parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
                placeholder="-10 (downward)"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleLoadSubmit}
                className="flex-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500"
              >
                Apply
              </button>
              <button
                onClick={() => {
                  setLoadDialogOpen(false);
                  setLoadDialogNodeId(null);
                }}
                className="flex-1 px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </Html>
      )}

      {/* Member Load Dialog (for UDL/UVL) */}
      {memberLoadDialogOpen && memberLoadDialogPosition && (
        <Html position={[memberLoadDialogPosition.x, memberLoadDialogPosition.y + 1, memberLoadDialogPosition.z]}>
          <div className="bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-600 min-w-[250px]">
            <h3 className="text-white font-bold mb-3">Add Member Load</h3>
            
            {/* Load Type Selector */}
            <div className="mb-3">
              <label className="text-gray-400 text-sm block mb-1">Load Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setMemberLoadType('udl')}
                  className={`flex-1 px-2 py-1 rounded text-sm ${memberLoadType === 'udl' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                >
                  UDL
                </button>
                <button
                  onClick={() => setMemberLoadType('uvl')}
                  className={`flex-1 px-2 py-1 rounded text-sm ${memberLoadType === 'uvl' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                >
                  UVL
                </button>
              </div>
            </div>
            
            {/* UDL Input */}
            {memberLoadType === 'udl' && (
              <div className="mb-3">
                <label className="text-gray-400 text-sm block mb-1">wy (kN/m) - Intensity</label>
                <input
                  type="number"
                  value={memberLoadWy}
                  onChange={(e) => setMemberLoadWy(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
                  placeholder="-5 (downward)"
                />
              </div>
            )}
            
            {/* UVL Inputs */}
            {memberLoadType === 'uvl' && (
              <>
                <div className="mb-2">
                  <label className="text-gray-400 text-sm block mb-1">wy at Start (kN/m)</label>
                  <input
                    type="number"
                    value={memberLoadWyStart}
                    onChange={(e) => setMemberLoadWyStart(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
                    placeholder="-5"
                  />
                </div>
                <div className="mb-3">
                  <label className="text-gray-400 text-sm block mb-1">wy at End (kN/m)</label>
                  <input
                    type="number"
                    value={memberLoadWyEnd}
                    onChange={(e) => setMemberLoadWyEnd(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
                    placeholder="0 (triangular)"
                  />
                </div>
              </>
            )}
            
            <div className="flex gap-2">
              <button
                onClick={handleMemberLoadSubmit}
                className="flex-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500"
              >
                Apply
              </button>
              <button
                onClick={() => {
                  setMemberLoadDialogOpen(false);
                  setMemberLoadDialogMemberId(null);
                }}
                className="flex-1 px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </Html>
      )}

      {/* Reference Cube for orientation */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#10b981" wireframe />
      </mesh>

      {/* Diagram Controls Overlay (bottom-right) */}
      {analysisResults && selectedMemberIds.size > 0 && (
        <Html position={[0, 0, 0]} center style={{ pointerEvents: 'none' }}>
          <div style={{ 
            position: 'fixed', 
            bottom: '20px', 
            right: '20px', 
            pointerEvents: 'auto',
            backgroundColor: 'rgba(31, 41, 55, 0.95)',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(75, 85, 99, 0.5)',
            minWidth: '200px'
          }}>
            <div style={{ color: 'white', fontSize: '12px', marginBottom: '8px', fontWeight: 'bold' }}>
              Diagrams ({selectedMemberIds.size} member{selectedMemberIds.size > 1 ? 's' : ''})
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <input 
                type="checkbox" 
                checked={showDiagrams}
                onChange={(e) => setShowDiagrams(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label style={{ color: '#d1d5db', fontSize: '11px', cursor: 'pointer' }} onClick={() => setShowDiagrams(!showDiagrams)}>
                Show Diagrams
              </label>
            </div>
            {showDiagrams && (
              <>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                  <button
                    onClick={() => setDiagramType('MZ')}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      fontSize: '10px',
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: diagramType === 'MZ' ? '#3b82f6' : '#4b5563',
                      color: 'white'
                    }}
                  >
                    Mz
                  </button>
                  <button
                    onClick={() => setDiagramType('FY')}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      fontSize: '10px',
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: diagramType === 'FY' ? '#8b5cf6' : '#4b5563',
                      color: 'white'
                    }}
                  >
                    Fy
                  </button>
                </div>
                <div style={{ color: '#9ca3af', fontSize: '10px', marginBottom: '4px' }}>
                  Scale: {diagramScale.toFixed(2)}
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.5"
                  step="0.01"
                  value={diagramScale}
                  onChange={(e) => setDiagramScale(parseFloat(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </>
            )}
          </div>
        </Html>
      )}
    </>
  );
};
