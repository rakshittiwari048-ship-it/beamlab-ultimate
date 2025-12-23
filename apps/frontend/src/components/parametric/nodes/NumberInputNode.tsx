/**
 * NumberInputNode.tsx
 * 
 * Simple numeric input node.
 * Outputs a single number value.
 */

import React, { useCallback } from 'react';
import type { NodeProps } from 'reactflow';
import type { NumberInputData } from '../types';
import { NodeContainer, OutputHandle, NumberField } from './BaseNode';

// Icon
const NumberIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
  </svg>
);

interface NumberInputNodeProps extends NodeProps<NumberInputData> {}

export const NumberInputNode: React.FC<NumberInputNodeProps> = ({ data, selected }) => {
  const handleChange = useCallback(
    (value: number) => {
      if (data.onUpdate) {
        data.onUpdate({ value });
      }
    },
    [data]
  );

  return (
    <NodeContainer
      category="input"
      label={data.label || 'Number'}
      icon={<NumberIcon />}
      selected={selected}
    >
      <NumberField
        label="Value"
        value={data.value}
        onChange={handleChange}
        min={data.min}
        max={data.max}
        step={data.step}
      />

      <OutputHandle id="value" label="Value" handleColor="bg-emerald-400" />
    </NodeContainer>
  );
};

export default NumberInputNode;
