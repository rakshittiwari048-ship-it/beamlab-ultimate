/**
 * nodeDefinitions.ts
 * 
 * Definitions for all available parametric nodes
 */

import type { NodeDefinition } from './types';

// ============================================================================
// INPUT NODES
// ============================================================================

export const numberInputNode: NodeDefinition = {
  type: 'numberInput',
  label: 'Number',
  category: 'input',
  description: 'A numeric input value',
  inputs: [],
  outputs: [
    { id: 'value', label: 'Value', type: 'number' }
  ],
  defaultData: {
    type: 'numberInput',
    label: 'Number',
    category: 'input',
    value: 0,
    min: -1000,
    max: 1000,
    step: 1,
  }
};

export const sliderInputNode: NodeDefinition = {
  type: 'sliderInput',
  label: 'Slider',
  category: 'input',
  description: 'A slider input with range',
  inputs: [],
  outputs: [
    { id: 'value', label: 'Value', type: 'number' }
  ],
  defaultData: {
    type: 'sliderInput',
    label: 'Slider',
    category: 'input',
    value: 50,
    min: 0,
    max: 100,
    step: 1,
  }
};

export const vectorInputNode: NodeDefinition = {
  type: 'vectorInput',
  label: 'Vector',
  category: 'input',
  description: 'A 3D vector input (X, Y, Z)',
  inputs: [],
  outputs: [
    { id: 'point', label: 'Point', type: 'point' },
    { id: 'x', label: 'X', type: 'number' },
    { id: 'y', label: 'Y', type: 'number' },
    { id: 'z', label: 'Z', type: 'number' }
  ],
  defaultData: {
    type: 'vectorInput',
    label: 'Vector',
    category: 'input',
    x: 0,
    y: 0,
    z: 0,
  }
};

// ============================================================================
// GEOMETRY NODES
// ============================================================================

export const pointGeneratorNode: NodeDefinition = {
  type: 'pointGenerator',
  label: 'Point Generator',
  category: 'geometry',
  description: 'Generate points in various patterns',
  inputs: [
    { id: 'origin', label: 'Origin', type: 'point' },
    { id: 'countX', label: 'Count X', type: 'number' },
    { id: 'countY', label: 'Count Y', type: 'number' },
    { id: 'countZ', label: 'Count Z', type: 'number' },
    { id: 'spacingX', label: 'Spacing X', type: 'number' },
    { id: 'spacingY', label: 'Spacing Y', type: 'number' },
    { id: 'spacingZ', label: 'Spacing Z', type: 'number' },
  ],
  outputs: [
    { id: 'points', label: 'Points', type: 'points' }
  ],
  defaultData: {
    type: 'pointGenerator',
    label: 'Point Generator',
    category: 'geometry',
    mode: 'grid',
  }
};

export const lineConnectorNode: NodeDefinition = {
  type: 'lineConnector',
  label: 'Line Connector',
  category: 'geometry',
  description: 'Connect points with lines',
  inputs: [
    { id: 'points', label: 'Points', type: 'points', required: true },
    { id: 'mode', label: 'Mode', type: 'any' },
  ],
  outputs: [
    { id: 'lines', label: 'Lines', type: 'lines' },
    { id: 'geometry', label: 'Geometry', type: 'geometry' }
  ],
  defaultData: {
    type: 'lineConnector',
    label: 'Line Connector',
    category: 'geometry',
    mode: 'chain',
  }
};

// ============================================================================
// PATTERN NODES
// ============================================================================

export const frameRepeaterNode: NodeDefinition = {
  type: 'frameRepeater',
  label: 'Frame Repeater',
  category: 'pattern',
  description: 'Repeat a frame pattern along an axis',
  inputs: [
    { id: 'geometry', label: 'Base Geometry', type: 'geometry', required: true },
    { id: 'count', label: 'Count', type: 'number', required: true },
    { id: 'spacing', label: 'Spacing', type: 'number', required: true },
    { id: 'axis', label: 'Axis', type: 'any' },
  ],
  outputs: [
    { id: 'geometry', label: 'Geometry', type: 'geometry' }
  ],
  defaultData: {
    type: 'frameRepeater',
    label: 'Frame Repeater',
    category: 'pattern',
    axis: 'x',
  }
};

// ============================================================================
// TRANSFORM NODES
// ============================================================================

export const transformNode: NodeDefinition = {
  type: 'transform',
  label: 'Transform',
  category: 'transform',
  description: 'Transform geometry (translate, rotate, scale)',
  inputs: [
    { id: 'geometry', label: 'Geometry', type: 'geometry', required: true },
    { id: 'translation', label: 'Translation', type: 'point' },
    { id: 'rotation', label: 'Rotation', type: 'point' },
    { id: 'scale', label: 'Scale', type: 'number' },
  ],
  outputs: [
    { id: 'geometry', label: 'Geometry', type: 'geometry' }
  ],
  defaultData: {
    type: 'transform',
    label: 'Transform',
    category: 'transform',
    mode: 'translate',
  }
};

export const mathOperationNode: NodeDefinition = {
  type: 'mathOperation',
  label: 'Math',
  category: 'transform',
  description: 'Perform math operations',
  inputs: [
    { id: 'a', label: 'A', type: 'number', required: true },
    { id: 'b', label: 'B', type: 'number' },
  ],
  outputs: [
    { id: 'result', label: 'Result', type: 'number' }
  ],
  defaultData: {
    type: 'mathOperation',
    label: 'Math',
    category: 'transform',
    operation: 'add',
  }
};

// ============================================================================
// OUTPUT NODES
// ============================================================================

export const modelOutputNode: NodeDefinition = {
  type: 'modelOutput',
  label: 'Model Output',
  category: 'output',
  description: 'Output to structural model',
  inputs: [
    { id: 'geometry', label: 'Geometry', type: 'geometry', required: true },
  ],
  outputs: [],
  defaultData: {
    type: 'modelOutput',
    label: 'Model Output',
    category: 'output',
  }
};

// ============================================================================
// NODE REGISTRY
// ============================================================================

export const nodeDefinitions: Record<string, NodeDefinition> = {
  numberInput: numberInputNode,
  sliderInput: sliderInputNode,
  vectorInput: vectorInputNode,
  pointGenerator: pointGeneratorNode,
  lineConnector: lineConnectorNode,
  frameRepeater: frameRepeaterNode,
  transform: transformNode,
  mathOperation: mathOperationNode,
  modelOutput: modelOutputNode,
};

export const nodesByCategory = {
  input: [numberInputNode, sliderInputNode, vectorInputNode],
  geometry: [pointGeneratorNode, lineConnectorNode],
  transform: [transformNode, mathOperationNode],
  pattern: [frameRepeaterNode],
  output: [modelOutputNode],
};
