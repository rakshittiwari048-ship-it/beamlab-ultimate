/**
 * LineConnectorNode.tsx
 * 
 * Connects points with lines using various patterns.
 * Outputs line indices for structural members.
 */

import React from 'react';
import type { NodeProps } from 'reactflow';
import type { LineConnectorData } from '../types';
import { NodeContainer, InputHandle, OutputHandle, SelectField } from './BaseNode';

// Icon
const LineIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l16 16M4 20l16-16" />
    <circle cx="4" cy="4" r="2" fill="currentColor" />
    <circle cx="20" cy="20" r="2" fill="currentColor" />
    <circle cx="4" cy="20" r="2" fill="currentColor" />
    <circle cx="20" cy="4" r="2" fill="currentColor" />
  </svg>
);

interface LineConnectorNodeProps extends NodeProps<LineConnectorData> {}

export const LineConnectorNode: React.FC<LineConnectorNodeProps> = ({ data, selected }) => {
  const handleChange = (updates: Partial<LineConnectorData>) => {
    if (data.onUpdate) {
      data.onUpdate(updates);
    }
  };

  return (
    <NodeContainer
      category="geometry"
      label={data.label || 'Line Connector'}
      icon={<LineIcon />}
      selected={selected}
    >
      {/* Input */}
      <div className="border-b border-zinc-700 pb-2">
        <InputHandle id="points" label="Points" handleColor="bg-blue-400" />
      </div>

      {/* Connection mode */}
      <SelectField
        label="Mode"
        value={data.mode}
        onChange={(mode) => handleChange({ mode: mode as LineConnectorData['mode'] })}
        options={[
          { value: 'chain', label: 'Chain' },
          { value: 'pairs', label: 'Pairs' },
          { value: 'complete', label: 'Complete' },
        ]}
      />

      {/* Mode descriptions */}
      <div className="rounded bg-black/20 px-2 py-1">
        <p className="text-xs text-zinc-500">
          {data.mode === 'chain' && '0→1→2→3...'}
          {data.mode === 'pairs' && '(0,1), (2,3), (4,5)...'}
          {data.mode === 'complete' && 'All-to-all connections'}
        </p>
      </div>

      {/* Outputs */}
      <div className="space-y-1 border-t border-zinc-700 pt-2">
        <OutputHandle id="lines" label="Lines" handleColor="bg-cyan-400" />
        <OutputHandle id="geometry" label="Geometry" handleColor="bg-blue-400" />
      </div>
    </NodeContainer>
  );
};

export default LineConnectorNode;
