// @ts-nocheck
/**
 * ExecutionEngine.ts
 * 
 * Graph execution engine with topological sort.
 * Evaluates the parametric graph from inputs to outputs.
 */

import type { Node, Edge } from 'reactflow';
import type {
  ParametricNodeData,
  Point3D,
  ModelNode,
  ModelMember,
  ParametricModelOutput,
  ExecutionResult,
  NumberInputData,
  SliderInputData,
  VectorInputData,
  PointGeneratorData,
  LineConnectorData,
  FrameRepeaterData,
  MathOperationData,
} from './types';

// ============================================================================
// TOPOLOGICAL SORT
// ============================================================================

interface GraphNode {
  id: string;
  data: ParametricNodeData;
  inputs: Map<string, { nodeId: string; outputId: string }>;
}

/**
 * Perform topological sort on the graph
 * Returns nodes in execution order (inputs first, outputs last)
 */
export function topologicalSort(
  nodes: Node<ParametricNodeData>[],
  edges: Edge[]
): string[] {
  // Build adjacency list
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  // Initialize
  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  // Build graph from edges
  for (const edge of edges) {
    const targets = adjacency.get(edge.source) || [];
    targets.push(edge.target);
    adjacency.set(edge.source, targets);

    const degree = inDegree.get(edge.target) || 0;
    inDegree.set(edge.target, degree + 1);
  }

  // Kahn's algorithm
  const queue: string[] = [];
  const result: string[] = [];

  // Start with nodes that have no incoming edges (inputs)
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    result.push(nodeId);

    const neighbors = adjacency.get(nodeId) || [];
    for (const neighbor of neighbors) {
      const degree = inDegree.get(neighbor)! - 1;
      inDegree.set(neighbor, degree);

      if (degree === 0) {
        queue.push(neighbor);
      }
    }
  }

  // Check for cycles
  if (result.length !== nodes.length) {
    throw new Error('Graph contains a cycle - cannot execute');
  }

  return result;
}

// ============================================================================
// NODE EXECUTORS
// ============================================================================

type NodeExecutor = (
  data: ParametricNodeData,
  inputs: Record<string, unknown>
) => ExecutionResult;

const executors: Record<string, NodeExecutor> = {
  // Number Input - outputs its value
  numberInput: (data) => {
    const d = data as NumberInputData;
    return {
      success: true,
      outputs: { value: d.value },
    };
  },

  // Slider Input - outputs its value
  sliderInput: (data) => {
    const d = data as SliderInputData;
    return {
      success: true,
      outputs: { value: d.value },
    };
  },

  // Vector Input - outputs point and individual components
  vectorInput: (data) => {
    const d = data as VectorInputData;
    return {
      success: true,
      outputs: {
        point: { x: d.x, y: d.y, z: d.z },
        x: d.x,
        y: d.y,
        z: d.z,
      },
    };
  },

  // Point Generator - generates points in patterns
  pointGenerator: (data, inputs) => {
    const d = data as PointGeneratorData;
    const origin = (inputs.origin as Point3D) || { x: 0, y: 0, z: 0 };
    const countX = (inputs.countX as number) || 1;
    const countY = (inputs.countY as number) || 1;
    const countZ = (inputs.countZ as number) || 1;
    const spacingX = (inputs.spacingX as number) || 1;
    const spacingY = (inputs.spacingY as number) || 1;
    const spacingZ = (inputs.spacingZ as number) || 1;

    const points: Point3D[] = [];
    let id = 0;

    for (let iz = 0; iz < countZ; iz++) {
      for (let iy = 0; iy < countY; iy++) {
        for (let ix = 0; ix < countX; ix++) {
          points.push({
            id: `pt_${id++}`,
            x: origin.x + ix * spacingX,
            y: origin.y + iy * spacingY,
            z: origin.z + iz * spacingZ,
          });
        }
      }
    }

    return {
      success: true,
      outputs: { points },
    };
  },

  // Line Connector - connects points with lines
  lineConnector: (data, inputs) => {
    const d = data as LineConnectorData;
    const points = (inputs.points as Point3D[]) || [];

    if (points.length < 2) {
      return {
        success: false,
        outputs: {},
        error: 'Need at least 2 points to create lines',
      };
    }

    const lines: [number, number][] = [];
    const mode = d.mode || 'chain';

    switch (mode) {
      case 'chain':
        // Connect consecutive points
        for (let i = 0; i < points.length - 1; i++) {
          lines.push([i, i + 1]);
        }
        break;

      case 'pairs':
        // Connect pairs (0-1, 2-3, 4-5, ...)
        for (let i = 0; i < points.length - 1; i += 2) {
          lines.push([i, i + 1]);
        }
        break;

      case 'complete':
        // Connect all points to all others
        for (let i = 0; i < points.length; i++) {
          for (let j = i + 1; j < points.length; j++) {
            lines.push([i, j]);
          }
        }
        break;
    }

    return {
      success: true,
      outputs: {
        lines,
        geometry: { points, lines },
      },
    };
  },

  // Frame Repeater - repeats geometry along an axis
  frameRepeater: (data, inputs) => {
    const d = data as FrameRepeaterData;
    const geometry = inputs.geometry as { points: Point3D[]; lines: [number, number][] } | undefined;
    const count = (inputs.count as number) || 1;
    const spacing = (inputs.spacing as number) || 1;
    const axis = d.axis || 'x';

    if (!geometry || !geometry.points) {
      return {
        success: false,
        outputs: {},
        error: 'No geometry input',
      };
    }

    const allPoints: Point3D[] = [];
    const allLines: [number, number][] = [];

    for (let i = 0; i < count; i++) {
      const offset = i * spacing;
      const pointOffset = allPoints.length;

      // Copy and offset points
      for (const pt of geometry.points) {
        const newPt: Point3D = { ...pt, id: `${pt.id}_${i}` };
        switch (axis) {
          case 'x':
            newPt.x += offset;
            break;
          case 'y':
            newPt.y += offset;
            break;
          case 'z':
            newPt.z += offset;
            break;
        }
        allPoints.push(newPt);
      }

      // Copy lines with offset indices
      for (const [a, b] of geometry.lines) {
        allLines.push([a + pointOffset, b + pointOffset]);
      }

      // Connect to previous frame
      if (i > 0) {
        const prevOffset = pointOffset - geometry.points.length;
        for (let j = 0; j < geometry.points.length; j++) {
          allLines.push([prevOffset + j, pointOffset + j]);
        }
      }
    }

    return {
      success: true,
      outputs: {
        geometry: { points: allPoints, lines: allLines },
      },
    };
  },

  // Math Operation - performs arithmetic
  mathOperation: (data, inputs) => {
    const d = data as MathOperationData;
    const a = (inputs.a as number) || 0;
    const b = (inputs.b as number) || 0;

    let result: number;
    switch (d.operation) {
      case 'add':
        result = a + b;
        break;
      case 'subtract':
        result = a - b;
        break;
      case 'multiply':
        result = a * b;
        break;
      case 'divide':
        result = b !== 0 ? a / b : 0;
        break;
      case 'power':
        result = Math.pow(a, b);
        break;
      case 'sqrt':
        result = Math.sqrt(a);
        break;
      default:
        result = 0;
    }

    return {
      success: true,
      outputs: { result },
    };
  },

  // Transform - transforms geometry
  transform: (_data, inputs) => {
    const geometry = inputs.geometry as { points: Point3D[]; lines: [number, number][] } | undefined;
    const translation = (inputs.translation as Point3D) || { x: 0, y: 0, z: 0 };
    const scale = (inputs.scale as number) || 1;

    if (!geometry) {
      return {
        success: false,
        outputs: {},
        error: 'No geometry input',
      };
    }

    const transformedPoints = geometry.points.map((pt) => ({
      ...pt,
      x: pt.x * scale + translation.x,
      y: pt.y * scale + translation.y,
      z: pt.z * scale + translation.z,
    }));

    return {
      success: true,
      outputs: {
        geometry: { points: transformedPoints, lines: geometry.lines },
      },
    };
  },

  // Model Output - converts to structural model format
  modelOutput: (_data, inputs) => {
    const geometry = inputs.geometry as { points: Point3D[]; lines: [number, number][] } | undefined;

    if (!geometry) {
      return {
        success: false,
        outputs: {},
        error: 'No geometry input',
      };
    }

    // Convert to model format
    const nodes: ModelNode[] = geometry.points.map((pt, i) => ({
      id: pt.id || `node_${i}`,
      x: pt.x,
      y: pt.y,
      z: pt.z,
      label: `N${i + 1}`,
    }));

    const members: ModelMember[] = geometry.lines.map(([a, b], i) => ({
      id: `member_${i}`,
      startNodeId: nodes[a].id,
      endNodeId: nodes[b].id,
    }));

    return {
      success: true,
      outputs: { nodes, members },
    };
  },
};

// ============================================================================
// EXECUTION ENGINE
// ============================================================================

export class ExecutionEngine {
  private nodeOutputs = new Map<string, Record<string, unknown>>();
  private nodeErrors = new Map<string, string>();

  /**
   * Execute the entire graph
   */
  execute(
    nodes: Node<ParametricNodeData>[],
    edges: Edge[]
  ): ParametricModelOutput | null {
    this.nodeOutputs.clear();
    this.nodeErrors.clear();

    try {
      // Get execution order
      const order = topologicalSort(nodes, edges);

      // Build input mapping for each node
      const inputMap = this.buildInputMap(edges);

      // Execute nodes in order
      for (const nodeId of order) {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) continue;

        // Gather inputs from connected nodes
        const nodeInputs = inputMap.get(nodeId) || [];
        const inputs: Record<string, unknown> = {};

        for (const { sourceId, sourceHandle, targetHandle } of nodeInputs) {
          const sourceOutputs = this.nodeOutputs.get(sourceId);
          if (sourceOutputs && sourceHandle) {
            inputs[targetHandle] = sourceOutputs[sourceHandle];
          }
        }

        // Execute the node
        const executor = executors[(node.data as ParametricNodeData).type];
        if (!executor) {
          this.nodeErrors.set(nodeId, `Unknown node type: ${(node.data as ParametricNodeData).type}`);
          continue;
        }

        const result = executor(node.data, inputs);

        if (result.success) {
          this.nodeOutputs.set(nodeId, result.outputs);
        } else {
          this.nodeErrors.set(nodeId, result.error || 'Execution failed');
        }
      }

      // Find output node and return results
      const outputNode = nodes.find(
        (n) => (n.data as ParametricNodeData).type === 'modelOutput'
      );

      if (outputNode) {
        const outputs = this.nodeOutputs.get(outputNode.id);
        if (outputs) {
          return {
            nodes: (outputs.nodes as ModelNode[]) || [],
            members: (outputs.members as ModelMember[]) || [],
            metadata: {
              generatedAt: new Date().toISOString(),
              nodeCount: ((outputs.nodes as ModelNode[]) || []).length,
              memberCount: ((outputs.members as ModelMember[]) || []).length,
            },
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Graph execution failed:', error);
      return null;
    }
  }

  /**
   * Get outputs for a specific node
   */
  getNodeOutputs(nodeId: string): Record<string, unknown> | undefined {
    return this.nodeOutputs.get(nodeId);
  }

  /**
   * Get error for a specific node
   */
  getNodeError(nodeId: string): string | undefined {
    return this.nodeErrors.get(nodeId);
  }

  /**
   * Build input mapping from edges
   */
  private buildInputMap(
    edges: Edge[]
  ): Map<string, Array<{ sourceId: string; sourceHandle: string; targetHandle: string }>> {
    const map = new Map<string, Array<{ sourceId: string; sourceHandle: string; targetHandle: string }>>();

    for (const edge of edges) {
      const inputs = map.get(edge.target) || [];
      inputs.push({
        sourceId: edge.source,
        sourceHandle: edge.sourceHandle || 'value',
        targetHandle: edge.targetHandle || 'value',
      });
      map.set(edge.target, inputs);
    }

    return map;
  }
}

// Singleton instance
let engineInstance: ExecutionEngine | null = null;

export function getExecutionEngine(): ExecutionEngine {
  if (!engineInstance) {
    engineInstance = new ExecutionEngine();
  }
  return engineInstance;
}
