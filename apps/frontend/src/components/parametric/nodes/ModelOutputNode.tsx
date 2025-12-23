/**
 * ModelOutputNode.tsx
 * 
 * Terminal node that converts geometry to structural model format.
 * Output is compatible with useModelStore.
 */

import React from 'react';
import type { NodeProps } from 'reactflow';
import type { OutputNodeData } from '../types';
import { NodeContainer, InputHandle } from './BaseNode';

// Icon
const OutputIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

interface ModelOutputNodeProps extends NodeProps<OutputNodeData> {}

export const ModelOutputNode: React.FC<ModelOutputNodeProps> = ({ data, selected }) => {
  return (
    <NodeContainer
      category="output"
      label={data.label || 'Model Output'}
      icon={<OutputIcon />}
      selected={selected}
    >
      {/* Input */}
      <InputHandle id="geometry" label="Geometry" handleColor="bg-blue-400" />

      {/* Preview */}
      {data.nodeCount !== undefined && data.memberCount !== undefined && (
        <div className="space-y-1 rounded bg-black/30 p-2">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400">Nodes:</span>
            <span className="font-mono text-white">{data.nodeCount}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400">Members:</span>
            <span className="font-mono text-white">{data.memberCount}</span>
          </div>
        </div>
      )}

      {/* Status */}
      <div
        className={`rounded px-2 py-1 text-center text-xs font-semibold ${
          data.isValid
            ? 'bg-emerald-900/50 text-emerald-400'
            : 'bg-zinc-800 text-zinc-500'
        }`}
      >
        {data.isValid ? '✓ Ready to Apply' : 'Awaiting Geometry'}
      </div>

      {/* Apply button */}
      {data.isValid && data.onApply && (
        <button
          onClick={data.onApply}
          className="w-full rounded bg-rose-600 py-1.5 text-sm font-semibold text-white 
                     transition-colors hover:bg-rose-500"
        >
          Apply to Model
        </button>
      )}
    </NodeContainer>
  );
};

export default ModelOutputNode;
