import { FC } from 'react';
import { Vector3 } from 'three';
import { useDrawBeamTool } from '../hooks/useDrawBeamTool';
import { DrawBeamGhostLine } from './DrawBeamGhostLine';
import { useModelStore } from '../store/model';

/**
 * DrawBeamToolDemo - Demonstration of beam drawing functionality
 * 
 * Shows how to integrate the DrawBeamTool state machine with:
 * - Node click handling
 * - Ghost line preview
 * - Mouse position updates
 * - State display
 * 
 * This component serves as both a demo and a reference implementation.
 * 
 * Usage:
 * ```tsx
 * <Canvas>
 *   <DrawBeamToolDemo />
 * </Canvas>
 * ```
 */
export const DrawBeamToolDemo: FC = () => {
  const beamTool = useDrawBeamTool('W12x26');
  const nodes = useModelStore((state) => state.getAllNodes());

  // Handle node clicks
  const handleNodeClick = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      const position = new Vector3(node.x, node.y, node.z);
      beamTool.handleNodeClick(nodeId, position);
    }
  };

  return (
    <>
      {/* Ghost Line Preview */}
      <DrawBeamGhostLine
        state={beamTool.state}
        startPosition={beamTool.startPosition}
        ghostEndPosition={beamTool.ghostEndPosition}
        color="#10b981"
        opacity={0.6}
        showNodes={true}
      />

      {/* UI Overlay - State Display */}
      <div className="absolute top-20 left-4 bg-gray-900/90 text-white p-3 rounded-lg shadow-lg">
        <div className="text-xs font-semibold mb-2">Draw Beam Tool</div>
        <div className="space-y-1 text-xs font-mono">
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">State:</span>
            <span className={beamTool.state === 'WAITING_FOR_SECOND_POINT' ? 'text-green-400' : 'text-gray-400'}>
              {beamTool.state}
            </span>
          </div>
          
          {beamTool.startNodeId && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Start Node:</span>
              <span className="text-blue-400">{beamTool.startNodeId.slice(0, 8)}...</span>
            </div>
          )}

          {beamTool.startPosition && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Position:</span>
              <span className="text-gray-300">
                ({beamTool.startPosition.x.toFixed(1)}, {beamTool.startPosition.y.toFixed(1)}, {beamTool.startPosition.z.toFixed(1)})
              </span>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
          {beamTool.state === 'IDLE' ? (
            <div>Click a node to start drawing</div>
          ) : (
            <div>
              <div>Click second node to complete</div>
              <div className="mt-1">Press Escape to cancel</div>
            </div>
          )}
        </div>
      </div>

      {/* Example: Render clickable nodes (in real app, this would be in NodesRenderer) */}
      {/* This is just for demo purposes */}
      {nodes.map((node) => (
        <mesh
          key={node.id}
          position={[node.x, node.y, node.z]}
          onClick={() => handleNodeClick(node.id)}
        >
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshStandardMaterial
            color={beamTool.startNodeId === node.id ? '#10b981' : '#3b82f6'}
          />
        </mesh>
      ))}
    </>
  );
};

/**
 * SimpleBeamToolExample - Minimal example of DrawBeamTool usage
 */
export const SimpleBeamToolExample: FC = () => {
  const beamTool = useDrawBeamTool();

  return (
    <>
      {/* Just the ghost line - integrate with your existing scene */}
      <DrawBeamGhostLine
        state={beamTool.state}
        startPosition={beamTool.startPosition}
        ghostEndPosition={beamTool.ghostEndPosition}
      />
      
      {/* Use beamTool.handleNodeClick() in your node click handlers */}
    </>
  );
};
