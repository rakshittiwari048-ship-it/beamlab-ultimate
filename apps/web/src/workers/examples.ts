// @ts-nocheck
/**
 * SolverWorker Usage Examples
 * 
 * This file demonstrates how to use the SolverWorker for offloading
 * heavy structural analysis computations to a Web Worker.
 */

import { SolverWorkerClient, solveInWorker } from './useSolverWorker';
import type { SolverNode, SolverMember, SolverSupport, NodalLoad } from '@beamlab/analysis-engine';

// ============================================================================
// EXAMPLE 1: Simple One-Off Solve
// ============================================================================

export async function simpleExample() {
  // Define model data
  const nodes: SolverNode[] = [
    { id: 'n1', x: 0, y: 0, z: 0 },
    { id: 'n2', x: 5, y: 0, z: 0 },
    { id: 'n3', x: 10, y: 0, z: 0 },
  ];

  const members: SolverMember[] = [
    {
      id: 'm1',
      startNodeId: 'n1',
      endNodeId: 'n2',
      E: 200e9,    // Steel: 200 GPa
      A: 0.01,     // 100 cm²
      Iy: 0.0001,  // I-beam moment of inertia
      Iz: 0.0001,
      G: 80e9,     // Shear modulus
      J: 0.00015,  // Torsional constant
    },
    {
      id: 'm2',
      startNodeId: 'n2',
      endNodeId: 'n3',
      E: 200e9,
      A: 0.01,
      Iy: 0.0001,
      Iz: 0.0001,
      G: 80e9,
      J: 0.00015,
    },
  ];

  const supports: SolverSupport[] = [
    {
      nodeId: 'n1',
      dx: true,
      dy: true,
      dz: true,
      rx: true,
      ry: true,
      rz: true,
    },
    {
      nodeId: 'n3',
      dx: false,
      dy: true,
      dz: true,
      rx: false,
      ry: false,
      rz: false,
    },
  ];

  const loads: NodalLoad[] = [
    {
      nodeId: 'n2',
      fy: -10000, // 10 kN downward
    },
  ];

  // Solve with progress tracking
  const result = await solveInWorker(
    { nodes, members, supports, loads },
    {
      onProgress: (data) => {
        console.log(`[${data.stage}] ${data.progress}% - ${data.message}`);
      },
    }
  );

  console.log('Solution:', result.result);
  console.log('Max displacement:', Math.max(...result.displacements.map(Math.abs)));
  console.log('Timing:', result.result.timing);
}

// ============================================================================
// EXAMPLE 2: Reusable Worker Client
// ============================================================================

export async function reusableWorkerExample() {
  // Create worker client
  const workerClient = new SolverWorkerClient({
    onProgress: (data) => {
      console.log(`Progress: ${data.progress}% - ${data.message}`);
    },
  });

  try {
    // Solve multiple cases without recreating worker
    for (let i = 0; i < 3; i++) {
      console.log(`\n--- Solving Case ${i + 1} ---`);
      
      const result = await workerClient.solve({
        nodes: generateNodes(10 * (i + 1)),
        members: generateMembers(10 * (i + 1)),
        supports: generateSupports(),
        loads: generateLoads(i),
      });

      console.log(`Case ${i + 1} completed in ${result.result.timing.total}ms`);
      console.log(`Solver type: ${result.result.solverType}`);
      
      if (result.result.matrixStats) {
        console.log('Matrix stats:', result.result.matrixStats);
      }
    }
  } finally {
    // Always terminate worker when done
    workerClient.terminate();
  }
}

// ============================================================================
// EXAMPLE 3: Large System with Transferable Objects
// ============================================================================

export async function largeSystemExample() {
  console.log('Solving large system (1000 nodes)...\n');

  // Generate large model
  const numNodes = 1000;
  const nodes = generateNodes(numNodes);
  const members = generateMembers(numNodes - 1);
  const supports = generateSupports();
  const loads = generateLoads(Math.floor(numNodes / 2));

  console.log(`Model: ${nodes.length} nodes, ${members.length} members`);
  console.log(`DOFs: ${nodes.length * 6}`);

  const result = await solveInWorker(
    {
      nodes,
      members,
      supports,
      loads,
      config: {
        forceSparse: true, // Force sparse solver for large systems
        tolerance: 1e-8,
        maxIterations: 2000,
      },
    },
    {
      onProgress: (data) => {
        // Update UI progress bar
        updateProgressBar(data.progress, data.message);
      },
    }
  );

  console.log('\n--- Results ---');
  console.log('Timing:');
  console.log(`  Assembly: ${result.result.timing.assembly.toFixed(1)}ms`);
  console.log(`  Solve: ${result.result.timing.solve.toFixed(1)}ms`);
  console.log(`  Total: ${result.result.timing.total.toFixed(1)}ms`);

  if (result.result.cgInfo) {
    console.log('\nCG Info:');
    console.log(`  Iterations: ${result.result.cgInfo.iterations}`);
    console.log(`  Converged: ${result.result.cgInfo.converged}`);
    console.log(`  Residual: ${result.result.cgInfo.residualNorm.toExponential(2)}`);
  }

  if (result.result.matrixStats) {
    console.log('\nMatrix Stats:');
    console.log(`  Size: ${result.result.matrixStats.size}`);
    console.log(`  Non-zeros: ${result.result.matrixStats.nnz}`);
    console.log(`  Density: ${(result.result.matrixStats.density * 100).toFixed(2)}%`);
    console.log(`  Memory saved: ${result.result.matrixStats.memorySavedMB.toFixed(1)} MB`);
  }

  // Access zero-copy transferred data
  console.log(`\nDisplacements array size: ${result.displacements.length}`);
  console.log(`Max displacement: ${Math.max(...result.displacements.map(Math.abs)).toExponential(2)}`);
}

// ============================================================================
// HELPER FUNCTIONS (FOR EXAMPLES)
// ============================================================================

function generateNodes(count: number): SolverNode[] {
  const nodes: SolverNode[] = [];
  for (let i = 0; i < count; i++) {
    nodes.push({
      id: `n${i}`,
      x: i * 2,
      y: 0,
      z: 0,
    });
  }
  return nodes;
}

function generateMembers(count: number): SolverMember[] {
  const members: SolverMember[] = [];
  for (let i = 0; i < count; i++) {
    members.push({
      id: `m${i}`,
      startNodeId: `n${i}`,
      endNodeId: `n${i + 1}`,
      E: 200e9,
      A: 0.01,
      Iy: 0.0001,
      Iz: 0.0001,
      G: 80e9,
      J: 0.00015,
    });
  }
  return members;
}

function generateSupports(): SolverSupport[] {
  return [
    {
      nodeId: 'n0',
      dx: true,
      dy: true,
      dz: true,
      rx: true,
      ry: true,
      rz: true,
    },
  ];
}

function generateLoads(nodeIndex: number): NodalLoad[] {
  return [
    {
      nodeId: `n${nodeIndex}`,
      fy: -10000,
    },
  ];
}

function updateProgressBar(progress: number, message: string): void {
  // Mock progress bar update
  const bar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
  process.stdout.write(`\r[${bar}] ${progress}% - ${message}`);
  
  if (progress === 100) {
    process.stdout.write('\n');
  }
}

// ============================================================================
// RUN EXAMPLES
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('=== SolverWorker Examples ===\n');
  
  // Run examples sequentially
  (async () => {
    console.log('Example 1: Simple solve\n');
    await simpleExample();
    
    console.log('\n\nExample 2: Reusable worker\n');
    await reusableWorkerExample();
    
    console.log('\n\nExample 3: Large system\n');
    await largeSystemExample();
    
    console.log('\n\nAll examples completed!');
  })().catch(console.error);
}
