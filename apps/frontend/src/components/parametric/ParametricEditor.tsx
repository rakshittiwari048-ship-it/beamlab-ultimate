/**
 * ParametricEditor.tsx
 * 
 * Main visual scripting interface with split pane layout.
 * Graph Editor on bottom, 3D Preview on top.
 */

import React, { useCallback, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  type ReactFlowInstance,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Trash2,
  Download,
  Grid3X3,
  Box,
  Triangle,
  ChevronUp,
  ChevronDown,
  Layers,
} from 'lucide-react';

import { nodeTypes } from './nodes';
import { useParametricStore } from './useParametricStore';
import { nodesByCategory } from './nodeDefinitions';

// ============================================================================
// NODE PALETTE
// ============================================================================

interface NodePaletteProps {
  onAddNode: (type: string) => void;
}

const NodePalette: React.FC<NodePaletteProps> = ({ onAddNode }) => {
  const [expanded, setExpanded] = React.useState<string | null>('input');

  const categories = [
    { id: 'input', label: 'Input', icon: <Box className="h-4 w-4" />, color: 'emerald' },
    { id: 'geometry', label: 'Geometry', icon: <Grid3X3 className="h-4 w-4" />, color: 'blue' },
    { id: 'pattern', label: 'Pattern', icon: <Layers className="h-4 w-4" />, color: 'purple' },
    { id: 'transform', label: 'Transform', icon: <Triangle className="h-4 w-4" />, color: 'orange' },
    { id: 'output', label: 'Output', icon: <Download className="h-4 w-4" />, color: 'rose' },
  ];

  return (
    <div className="h-full w-48 overflow-y-auto border-r border-zinc-700 bg-zinc-900 p-2">
      <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-zinc-400">
        Nodes
      </h3>
      
      {categories.map((cat) => (
        <div key={cat.id} className="mb-1">
          <button
            onClick={() => setExpanded(expanded === cat.id ? null : cat.id)}
            className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm
                       text-zinc-300 hover:bg-zinc-800`}
          >
            {cat.icon}
            <span>{cat.label}</span>
            <ChevronDown
              className={`ml-auto h-3 w-3 transition-transform ${
                expanded === cat.id ? 'rotate-180' : ''
              }`}
            />
          </button>
          
          <AnimatePresence>
            {expanded === cat.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-0.5 py-1 pl-4">
                  {(nodesByCategory[cat.id as keyof typeof nodesByCategory] || []).map((node) => (
                    <button
                      key={node.type}
                      onClick={() => onAddNode(node.type)}
                      className="block w-full rounded px-2 py-1 text-left text-xs
                                 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    >
                      {node.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// TEMPLATE SELECTOR
// ============================================================================

interface TemplateSelectorProps {
  onSelect: (template: 'portal-frame' | 'truss' | 'grid') => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ onSelect }) => {
  const templates = [
    { id: 'portal-frame' as const, label: 'Portal Frame', icon: '🏗️' },
    { id: 'truss' as const, label: 'Truss', icon: '△' },
    { id: 'grid' as const, label: 'Grid', icon: '▦' },
  ];

  return (
    <div className="flex items-center gap-1">
      {templates.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-xs
                     text-zinc-300 hover:bg-zinc-700"
          title={`Load ${t.label} template`}
        >
          <span>{t.icon}</span>
          <span className="hidden sm:inline">{t.label}</span>
        </button>
      ))}
    </div>
  );
};

// ============================================================================
// OUTPUT PANEL
// ============================================================================

const OutputPanel: React.FC = () => {
  const { lastOutput, isExecuting, executionErrors } = useParametricStore();

  return (
    <div className="absolute right-2 top-2 w-48 rounded-lg border border-zinc-700 bg-zinc-900/95 p-3 backdrop-blur">
      <h4 className="mb-2 text-xs font-semibold uppercase text-zinc-400">
        Output
      </h4>
      
      {isExecuting ? (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-600 border-t-indigo-500" />
          Executing...
        </div>
      ) : lastOutput ? (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400">Nodes:</span>
            <span className="font-mono text-white">{lastOutput.nodes.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Members:</span>
            <span className="font-mono text-white">{lastOutput.members.length}</span>
          </div>
          {executionErrors.size > 0 && (
            <div className="rounded bg-red-900/50 px-2 py-1 text-xs text-red-300">
              {executionErrors.size} error(s)
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-zinc-500">No output yet</p>
      )}
    </div>
  );
};

// ============================================================================
// MAIN EDITOR
// ============================================================================

interface ParametricEditorProps {
  onApplyToModel?: (output: { nodes: any[]; members: any[] }) => void;
}

export const ParametricEditor: React.FC<ParametricEditorProps> = ({
  onApplyToModel,
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    clearGraph,
    execute,
    loadTemplate,
    lastOutput,
    isPanelOpen,
    togglePanel,
  } = useParametricStore();

  // Center position for new nodes
  const getNewNodePosition = useCallback(() => {
    if (reactFlowInstance.current && reactFlowWrapper.current) {
      const { width, height } = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.current.project({
        x: width / 2,
        y: height / 2,
      });
      return { x: position.x - 90, y: position.y - 50 };
    }
    return { x: 100, y: 100 };
  }, []);

  const handleAddNode = useCallback(
    (type: string) => {
      addNode(type, getNewNodePosition());
    },
    [addNode, getNewNodePosition]
  );

  const handleApply = useCallback(() => {
    if (lastOutput && onApplyToModel) {
      onApplyToModel(lastOutput);
    }
  }, [lastOutput, onApplyToModel]);

  return (
    <div className="flex h-full flex-col bg-zinc-950">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={togglePanel}
            className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            title={isPanelOpen ? 'Hide palette' : 'Show palette'}
          >
            {isPanelOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          
          <span className="text-sm font-semibold text-white">Parametric Editor</span>
          
          <TemplateSelector onSelect={loadTemplate} />
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => execute()}
            className="flex items-center gap-1 rounded bg-indigo-600 px-3 py-1.5 text-sm
                       font-medium text-white hover:bg-indigo-500"
          >
            <Play className="h-3.5 w-3.5" />
            Run
          </button>
          
          {lastOutput && onApplyToModel && (
            <button
              onClick={handleApply}
              className="flex items-center gap-1 rounded bg-emerald-600 px-3 py-1.5 text-sm
                         font-medium text-white hover:bg-emerald-500"
            >
              <Download className="h-3.5 w-3.5" />
              Apply
            </button>
          )}
          
          <button
            onClick={clearGraph}
            className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-red-400"
            title="Clear graph"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Node Palette */}
        <AnimatePresence>
          {isPanelOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 192, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <NodePalette onAddNode={handleAddNode} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Graph Editor */}
        <div ref={reactFlowWrapper} className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={(instance: ReactFlowInstance) => {
              reactFlowInstance.current = instance;
            }}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#6366f1', strokeWidth: 2 },
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#374151"
            />
            <Controls
              className="!bg-zinc-800 !border-zinc-700 [&>button]:!bg-zinc-800 
                         [&>button]:!border-zinc-700 [&>button]:!text-zinc-300"
            />
            <MiniMap
              className="!bg-zinc-900 !border-zinc-700"
              nodeColor="#6366f1"
              maskColor="rgba(0, 0, 0, 0.6)"
            />
            
            {/* Output panel overlay */}
            <Panel position="top-right">
              <OutputPanel />
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};

export default ParametricEditor;
