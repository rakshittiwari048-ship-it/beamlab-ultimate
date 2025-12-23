/**
 * ParametricDesignPage.tsx
 * 
 * Full-page parametric design interface with split pane layout.
 * Top: 3D Preview, Bottom: Graph Editor
 */

// @ts-nocheck
import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Layers,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
} from 'lucide-react';

import { ParametricEditor } from './ParametricEditor';
import { useParametricStore } from './useParametricStore';

// ============================================================================
// 3D PREVIEW COMPONENT (placeholder - integrate with Three.js viewport)
// ============================================================================

interface Preview3DProps {
  nodes: Array<{ id: string; x: number; y: number; z: number }>;
  members: Array<{ id: string; startNodeId: string; endNodeId: string }>;
}

const Preview3D: React.FC<Preview3DProps> = ({ nodes, members }) => {
  // This would integrate with your existing Three.js setup
  // For now, show a simple SVG preview

  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500">
        <div className="text-center">
          <Layers className="mx-auto mb-2 h-12 w-12 opacity-30" />
          <p>No geometry generated</p>
          <p className="text-sm">Build your parametric model below</p>
        </div>
      </div>
    );
  }

  // Calculate bounds
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const padding = 50;
  const width = maxX - minX + padding * 2 || 200;
  const height = maxY - minY + padding * 2 || 200;

  // Transform to SVG coordinates
  const scale = Math.min(400 / width, 300 / height);
  const transform = (pt: { x: number; y: number }) => ({
    x: (pt.x - minX + padding) * scale,
    y: (maxY - pt.y + padding) * scale, // Flip Y for SVG
  });

  // Create node lookup
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="flex h-full items-center justify-center bg-zinc-900/50">
      <svg
        viewBox={`0 0 ${width * scale} ${height * scale}`}
        className="max-h-full max-w-full"
        style={{ maxWidth: '600px', maxHeight: '400px' }}
      >
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="#374151"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Members */}
        {members.map((member) => {
          const start = nodeMap.get(member.startNodeId);
          const end = nodeMap.get(member.endNodeId);
          if (!start || !end) return null;
          
          const p1 = transform(start);
          const p2 = transform(end);
          
          return (
            <line
              key={member.id}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke="#6366f1"
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const p = transform(node);
          return (
            <circle
              key={node.id}
              cx={p.x}
              cy={p.y}
              r="4"
              fill="#22c55e"
              stroke="#fff"
              strokeWidth="1"
            />
          );
        })}
      </svg>

      {/* Stats overlay */}
      <div className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-1 text-xs text-white">
        {nodes.length} nodes · {members.length} members
      </div>
    </div>
  );
};

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export const ParametricDesignPage: React.FC = () => {
  const [splitRatio, setSplitRatio] = useState(0.4); // 40% preview, 60% editor
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const { lastOutput } = useParametricStore();

  const nodes = lastOutput?.nodes || [];
  const members = lastOutput?.members || [];

  // Handle split resize
  const handleResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = e.currentTarget.closest('.split-container');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    
    const onMove = (moveEvent: MouseEvent) => {
      const ratio = (moveEvent.clientY - rect.top) / rect.height;
      setSplitRatio(Math.max(0.2, Math.min(0.8, ratio)));
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  return (
    <div className="split-container flex h-screen flex-col bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-2">
        <div className="flex items-center gap-3">
          <Layers className="h-5 w-5 text-indigo-400" />
          <h1 className="text-lg font-semibold text-white">Parametric Design</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPreviewVisible(!isPreviewVisible)}
            className="flex items-center gap-1 rounded px-2 py-1 text-sm text-zinc-400 
                       hover:bg-zinc-800 hover:text-white"
          >
            {isPreviewVisible ? (
              <>
                <EyeOff className="h-4 w-4" />
                <span className="hidden sm:inline">Hide Preview</span>
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Show Preview</span>
              </>
            )}
          </button>
          
          <button
            onClick={() => setSplitRatio(0.5)}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            title="Reset split"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Split Pane Container */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 3D Preview (Top) */}
        {isPreviewVisible && (
          <motion.div
            className="relative border-b border-zinc-700 bg-zinc-950"
            style={{ height: `${splitRatio * 100}%` }}
            layout
          >
            <Preview3D nodes={nodes} members={members} />
            
            {/* Expand/Collapse buttons */}
            <div className="absolute right-2 top-2 flex gap-1">
              <button
                onClick={() => setSplitRatio(0.7)}
                className="rounded bg-zinc-800/80 p-1 text-zinc-400 hover:text-white"
                title="Expand preview"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => setSplitRatio(0.3)}
                className="rounded bg-zinc-800/80 p-1 text-zinc-400 hover:text-white"
                title="Collapse preview"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Resize Handle */}
        {isPreviewVisible && (
          <div
            className="group flex h-2 cursor-row-resize items-center justify-center 
                       bg-zinc-800 hover:bg-zinc-700"
            onMouseDown={handleResize}
          >
            <div className="h-0.5 w-12 rounded-full bg-zinc-600 group-hover:bg-zinc-500" />
          </div>
        )}

        {/* Graph Editor (Bottom) */}
        <div 
          className="flex-1 overflow-hidden"
          style={isPreviewVisible ? { height: `${(1 - splitRatio) * 100}%` } : undefined}
        >
          <ParametricEditor
            onApplyToModel={(output) => {
              // TODO: Integrate with useModelStore
              console.log('Apply to model:', output);
              // Example: 
              // modelStore.importParametricModel(output);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ParametricDesignPage;
