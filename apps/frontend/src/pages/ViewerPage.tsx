/**
 * ViewerPage.tsx
 *
 * Complete 3D viewer with sidebar for bank problems
 * Integrates:
 * - ModelingSidebar with 50 bank problems
 * - StructuralCanvas with enhanced Three.js rendering
 * - Member selection and property display
 */

import React, { useState, useCallback } from 'react';
import { StructuralCanvas, type StructuralMember, type StructuralNode } from '../components/viewer/StructuralCanvas';
import { ModelingSidebar } from '../components/sidebar/ModelingSidebar';
import { type StructuralModel } from '../services/factoryService';

// ============================================================================
// Types
// ============================================================================

interface ModelState {
  members: StructuralMember[];
  nodes: StructuralNode[];
}

// ============================================================================
// ViewerPage Component
// ============================================================================

export const ViewerPage: React.FC = () => {
  const [modelState, setModelState] = useState<ModelState>({
    members: [],
    nodes: [],
  });

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);

  // Convert factory model to canvas format
  const handleModelLoad = useCallback((factoryModel: StructuralModel) => {
    console.log('[ViewerPage] Loading model:', factoryModel);

    // Convert nodes
    const nodes: StructuralNode[] = factoryModel.nodes.map((n) => ({
      id: n.id,
      position: [n.x, n.y, n.z],
      support: false,
      label: n.id,
    }));

    // Convert members
    const members: StructuralMember[] = factoryModel.members.map((m) => {
      const startNode = factoryModel.nodes.find((n) => n.id === m.startNodeId);
      const endNode = factoryModel.nodes.find((n) => n.id === m.endNodeId);

      return {
        id: m.id,
        startNode: startNode ? [startNode.x, startNode.y, startNode.z] : [0, 0, 0],
        endNode: endNode ? [endNode.x, endNode.y, endNode.z] : [0, 0, 0],
        section: {
          name: m.section || 'Default',
          area: 1000,
          Ixx: 1e6,
          Iyy: 1e6,
        },
      };
    });

    setModelState({ members, nodes });
    setSelectedMemberId(null);
    setHoveredMemberId(null);

    console.log('[ViewerPage] Model converted:', { nodes, members });
  }, []);

  // Get selected member details
  const selectedMember = modelState.members.find(
    (m: StructuralMember) => m.id === selectedMemberId
  );
  const hoveredMember = modelState.members.find(
    (m: StructuralMember) => m.id === hoveredMemberId
  );

  return (
    <div className="flex h-screen bg-zinc-900">
      {/* Left Sidebar - Bank Problems */}
      <div className="w-80 border-r border-zinc-800 flex flex-col">
        <ModelingSidebar onModelLoad={handleModelLoad} />
      </div>

      {/* Center - 3D Canvas */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <StructuralCanvas
          members={modelState.members}
          nodes={modelState.nodes}
          selectedMemberId={selectedMemberId}
          onMemberHover={setHoveredMemberId}
          onMemberSelect={setSelectedMemberId}
        />

        {/* Top Info Bar */}
        <div className="absolute top-4 left-4 bg-zinc-900/90 border border-zinc-700 rounded px-4 py-2 text-xs text-zinc-300">
          <p>
            <span className="text-blue-400">Members:</span> {modelState.members.length}
            <span className="mx-4">|</span>
            <span className="text-blue-400">Nodes:</span> {modelState.nodes.length}
          </p>
        </div>

        {/* Hover Info */}
        {hoveredMember && (
          <div className="absolute top-20 left-4 bg-cyan-900/90 border border-cyan-500 rounded px-4 py-3 text-xs text-cyan-100 max-w-sm">
            <p className="font-semibold text-cyan-300">Hovering: {hoveredMember.id}</p>
            <p className="text-cyan-200 text-xs mt-1">
              {hoveredMember.startNode.map((v: number) => v.toFixed(1)).join(', ')} →{' '}
              {hoveredMember.endNode.map((v: number) => v.toFixed(1)).join(', ')}
            </p>
          </div>
        )}
      </div>

      {/* Right Panel - Member Details */}
      {selectedMember && (
        <div className="w-80 border-l border-zinc-800 bg-zinc-800/50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-zinc-700 bg-zinc-800">
            <h2 className="text-sm font-semibold text-white">Member Details</h2>
            <p className="text-xs text-blue-400 mt-1">{selectedMember.id}</p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {/* Section */}
            <div className="bg-zinc-700/30 rounded px-3 py-2">
              <p className="text-xs font-semibold text-zinc-300">Section</p>
              <p className="text-sm text-white mt-2">{selectedMember.section?.name || 'N/A'}</p>
            </div>

            {/* Start Coordinates */}
            <div className="bg-zinc-700/30 rounded px-3 py-2">
              <p className="text-xs font-semibold text-zinc-300">Start Node</p>
              <div className="text-xs text-zinc-200 mt-2 font-mono space-y-1">
                <p>
                  X: <span className="text-blue-300">{selectedMember.startNode[0].toFixed(2)}</span>
                </p>
                <p>
                  Y: <span className="text-blue-300">{selectedMember.startNode[1].toFixed(2)}</span>
                </p>
                <p>
                  Z: <span className="text-blue-300">{selectedMember.startNode[2].toFixed(2)}</span>
                </p>
              </div>
            </div>

            {/* End Coordinates */}
            <div className="bg-zinc-700/30 rounded px-3 py-2">
              <p className="text-xs font-semibold text-zinc-300">End Node</p>
              <div className="text-xs text-zinc-200 mt-2 font-mono space-y-1">
                <p>
                  X: <span className="text-blue-300">{selectedMember.endNode[0].toFixed(2)}</span>
                </p>
                <p>
                  Y: <span className="text-blue-300">{selectedMember.endNode[1].toFixed(2)}</span>
                </p>
                <p>
                  Z: <span className="text-blue-300">{selectedMember.endNode[2].toFixed(2)}</span>
                </p>
              </div>
            </div>

            {/* Length */}
            <div className="bg-zinc-700/30 rounded px-3 py-2">
              <p className="text-xs font-semibold text-zinc-300">Member Length</p>
              <p className="text-sm text-white mt-2">
                {(() => {
                  const dx = selectedMember.endNode[0] - selectedMember.startNode[0];
                  const dy = selectedMember.endNode[1] - selectedMember.startNode[1];
                  const dz = selectedMember.endNode[2] - selectedMember.startNode[2];
                  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
                  return length.toFixed(2) + ' m';
                })()}
              </p>
            </div>

            {/* Section Properties */}
            {selectedMember.section && (
              <div className="bg-zinc-700/30 rounded px-3 py-2">
                <p className="text-xs font-semibold text-zinc-300">Section Properties</p>
                <div className="text-xs text-zinc-200 mt-2 space-y-1">
                  <p>
                    Area: <span className="text-blue-300">{selectedMember.section.area.toFixed(0)}</span> mm²
                  </p>
                  <p>
                    I<sub>xx</sub>: <span className="text-blue-300">{selectedMember.section.Ixx.toFixed(0)}</span> mm⁴
                  </p>
                  <p>
                    I<sub>yy</sub>: <span className="text-blue-300">{selectedMember.section.Iyy.toFixed(0)}</span> mm⁴
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-zinc-700 bg-zinc-900/50">
            <button
              onClick={() => setSelectedMemberId(null)}
              className="w-full px-3 py-2 text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-white rounded transition-colors"
            >
              Deselect
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
