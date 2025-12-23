# Substructuring & Super Elements

This module implements **Static Condensation** (Guyan Reduction) for creating **Super Elements** - a powerful technique to dramatically reduce the size of structural analysis problems.

## 🎯 Key Benefits

| Scenario | Original | With Super Elements | Reduction |
|----------|----------|---------------------|-----------|
| 10-story building with floor trusses | 10,000 DOFs | 1,000 DOFs | **90%** |
| Bridge with repetitive deck sections | 50,000 DOFs | 5,000 DOFs | **90%** |
| Stadium roof truss system | 100,000 DOFs | 8,000 DOFs | **92%** |

## 📖 Concept Overview

### What is Static Condensation?

Static condensation eliminates internal degrees of freedom (DOFs) while preserving the exact static behavior at boundary nodes. The key insight is:

```
For a substructure with internal (i) and master (m) DOFs:

K = | Kii  Kim |    F = | Fi |    u = | ui |
    | Kmi  Kmm |        | Fm |        | um |

The internal displacements can be expressed as:
ui = Kii⁻¹ · (Fi - Kim · um)

When Fi = 0 (no internal loads), this simplifies to:
ui = T · um   where T = -Kii⁻¹ · Kim

The condensed stiffness is:
K* = Kmm - Kmi · Kii⁻¹ · Kim
```

### What is a Super Element?

A super element is a single "matrix element" that represents an entire substructure. It contains:
- **Condensed stiffness matrix** (K*) - acts on boundary DOFs only
- **Transformation matrix** (T) - recovers internal displacements
- **Boundary node definitions** - connection points to the rest of the structure

## 🚀 Quick Start

### 1. Create a Super Element

```typescript
import { SubstructureManager } from '@beamlab/analysis-engine';

const manager = new SubstructureManager();

// Define the substructure
const superElement = manager.createSuperElement({
  id: 'roof-truss-1',
  name: 'Roof Truss Type A',
  nodes: [
    { id: 'n1', x: 0, y: 0, z: 5 },      // Boundary
    { id: 'n2', x: 2, y: 0, z: 6 },      // Internal
    { id: 'n3', x: 4, y: 0, z: 7 },      // Internal
    { id: 'n4', x: 6, y: 0, z: 6 },      // Internal
    { id: 'n5', x: 8, y: 0, z: 5 },      // Boundary
  ],
  members: [
    { id: 'm1', startNodeId: 'n1', endNodeId: 'n2', E: 200e9, A: 0.005, Iy: 1e-5, Iz: 1e-5 },
    { id: 'm2', startNodeId: 'n2', endNodeId: 'n3', E: 200e9, A: 0.005, Iy: 1e-5, Iz: 1e-5 },
    { id: 'm3', startNodeId: 'n3', endNodeId: 'n4', E: 200e9, A: 0.005, Iy: 1e-5, Iz: 1e-5 },
    { id: 'm4', startNodeId: 'n4', endNodeId: 'n5', E: 200e9, A: 0.005, Iy: 1e-5, Iz: 1e-5 },
    { id: 'm5', startNodeId: 'n1', endNodeId: 'n3', E: 200e9, A: 0.003, Iy: 5e-6, Iz: 5e-6 },
    { id: 'm6', startNodeId: 'n3', endNodeId: 'n5', E: 200e9, A: 0.003, Iy: 5e-6, Iz: 5e-6 },
  ],
  boundaryNodeIds: ['n1', 'n5'],  // Only these connect to the main structure
});

console.log(superElement.originalStats);
// {
//   numNodes: 5,
//   numMembers: 6,
//   numTotalDOFs: 30,
//   numInternalDOFs: 18,
//   numBoundaryDOFs: 12,
//   reductionRatio: 0.6  // 60% reduction
// }
```

### 2. Use in Global Analysis

```typescript
import { 
  HybridSuperElementSolver, 
  prepareModelWithSuperElements 
} from '@beamlab/analysis-engine';

// Your full model
const allNodes = [...];  // All nodes including internal truss nodes
const allMembers = [...];  // All members

// Define which members form substructures
const substructureSelections = [
  {
    name: 'Left-Truss',
    memberIds: ['t1-m1', 't1-m2', 't1-m3'],
    boundaryNodeIds: ['left-support', 'mid-point'],
  },
  {
    name: 'Right-Truss',
    memberIds: ['t2-m1', 't2-m2', 't2-m3'],
    boundaryNodeIds: ['mid-point', 'right-support'],
  },
];

// Prepare reduced model
const reducedModel = prepareModelWithSuperElements(
  allNodes,
  allMembers,
  supports,
  loads,
  substructureSelections
);

// Solve (much faster due to reduced size!)
const solver = new HybridSuperElementSolver();
const result = await solver.solve(reducedModel);

// Access results
console.log(result.nodalDisplacements);  // Boundary node displacements

// Recover internal displacements
for (const [seId, seResult] of result.superElementResults) {
  console.log(`Super Element ${seId}:`);
  console.log('  Internal displacements:', seResult.internalDisplacements);
}
```

### 3. React UI Integration

```tsx
import { SubstructureProvider, useSubstructure } from '@/hooks/useSubstructure';
import { SuperElementPanel } from '@/components/SuperElementPanel';
import { SubstructureManager } from '@beamlab/analysis-engine';

function App() {
  const manager = useMemo(() => new SubstructureManager(), []);
  
  return (
    <SubstructureProvider 
      manager={manager} 
      nodes={modelNodes} 
      members={modelMembers}
    >
      <ModelViewer />
      <SuperElementPanel />
    </SubstructureProvider>
  );
}

function ModelViewer() {
  const { state, actions } = useSubstructure();
  
  const handleMemberClick = (memberId: string) => {
    actions.toggleMember(memberId);
  };
  
  const handleCreateSuperElement = async () => {
    actions.autoDetectBoundaryNodes();
    const se = await actions.createSuperElement('My Truss');
    console.log('Created:', se);
  };
  
  return (
    // Your 3D viewer with selection highlighting
  );
}
```

## 📐 Mathematical Details

### Partitioned System

The substructure stiffness matrix is partitioned:

```
| Kii  Kim | | ui |   | Fi |
|          | |    | = |    |
| Kmi  Kmm | | um |   | Fm |
```

Where:
- `i` = internal (slave) DOFs to be eliminated
- `m` = master (boundary) DOFs to keep

### Static Condensation Process

1. **Partition matrices** by internal/boundary DOF indices
2. **Compute inverse** of internal stiffness: `Kii⁻¹`
3. **Condensed stiffness**: `K* = Kmm - Kmi · Kii⁻¹ · Kim`
4. **Transformation matrix**: `T = -Kii⁻¹ · Kim`

### Displacement Recovery

After solving the reduced system for `um`:

```
ui = T · um
```

This gives exact internal displacements (assuming no internal loads).

## 🏗️ Architecture

```
packages/analysis-engine/src/features/
├── SubstructureManager.ts      # Core condensation logic
├── SuperElementIntegration.ts  # Integration with solvers
└── index.ts                    # Exports

apps/frontend/src/
├── hooks/
│   └── useSubstructure.tsx     # React hook for UI state
└── components/
    └── SuperElementPanel.tsx   # Selection & creation UI
```

## 🔧 API Reference

### SubstructureManager

```typescript
class SubstructureManager {
  // Create a super element from a substructure
  createSuperElement(input: CreateSuperElementInput): SuperElement;
  
  // Recover internal displacements after solving
  recoverInternalDisplacements(
    superElement: SuperElement,
    boundaryDisplacements: number[]
  ): number[];
  
  // Get stored super element
  getSuperElement(id: string): SuperElement | undefined;
  
  // Get all super elements
  getAllSuperElements(): SuperElement[];
  
  // Remove a super element
  removeSuperElement(id: string): boolean;
  
  // Clear all
  clear(): void;
  
  // Statistics
  getStats(): { count, totalOriginalDOFs, totalCondensedDOFs, averageReduction };
  
  // Static utility
  static identifyBoundaryNodes(
    selectedMemberIds: Set<string>,
    allMembers: SubstructureMember[],
    selectedNodes: SubstructureNode[]
  ): string[];
}
```

### Types

```typescript
interface CreateSuperElementInput {
  id: string;
  nodes: SubstructureNode[];
  members: SubstructureMember[];
  boundaryNodeIds: string[];
  name?: string;
  retainedInternalNodeIds?: string[];  // Keep specific internal nodes
}

interface SuperElement {
  id: string;
  name: string;
  boundaryNodeIds: string[];
  boundaryNodes: SubstructureNode[];
  condensedK: number[][];        // Condensed stiffness matrix
  numBoundaryDOFs: number;
  originalStats: {
    numNodes: number;
    numMembers: number;
    numTotalDOFs: number;
    numInternalDOFs: number;
    numBoundaryDOFs: number;
    reductionRatio: number;      // e.g., 0.9 = 90% reduction
  };
  recovery: {
    T: number[][];               // Transformation matrix
    internalNodeIds: string[];
  };
  createdAt: Date;
}
```

## 📊 Performance Considerations

### When to Use Substructuring

✅ **Good candidates:**
- Repetitive substructures (floor trusses, roof panels)
- Complex subsystems that don't change (pre-engineered elements)
- Parts with many internal nodes but few connection points
- Reusable components analyzed once, used many times

❌ **Poor candidates:**
- Simple frames with few members
- Structures where every node needs results
- Problems where internal loads change frequently

### Memory vs. Time Trade-off

| Problem Size | Dense Solver | Sparse Solver | With Super Elements |
|--------------|--------------|---------------|---------------------|
| 1,000 DOFs   | Fast         | Fast          | Unnecessary         |
| 10,000 DOFs  | Slow         | Moderate      | **Fast**            |
| 100,000 DOFs | Out of memory| Slow          | **Moderate**        |

## 🧪 Testing

```typescript
import { SubstructureManager } from '@beamlab/analysis-engine';

describe('SubstructureManager', () => {
  it('creates super element with correct reduction', () => {
    const manager = new SubstructureManager();
    
    const se = manager.createSuperElement({
      id: 'test',
      nodes: [
        { id: 'n1', x: 0, y: 0, z: 0 },
        { id: 'n2', x: 1, y: 0, z: 0 },
        { id: 'n3', x: 2, y: 0, z: 0 },
      ],
      members: [
        { id: 'm1', startNodeId: 'n1', endNodeId: 'n2', E: 200e9, A: 0.01, Iy: 1e-4, Iz: 1e-4 },
        { id: 'm2', startNodeId: 'n2', endNodeId: 'n3', E: 200e9, A: 0.01, Iy: 1e-4, Iz: 1e-4 },
      ],
      boundaryNodeIds: ['n1', 'n3'],
    });
    
    expect(se.originalStats.numNodes).toBe(3);
    expect(se.originalStats.numTotalDOFs).toBe(18);
    expect(se.originalStats.numBoundaryDOFs).toBe(12);
    expect(se.originalStats.reductionRatio).toBeCloseTo(0.333, 2);
    expect(se.condensedK).toHaveLength(12);
    expect(se.recovery.T).toHaveLength(6);
  });
});
```

## 🔗 Related Documentation

- [PERFORMANCE_IMPROVEMENTS.md](../../../PERFORMANCE_IMPROVEMENTS.md) - Overall performance strategy
- [Solver.ts](../Solver.ts) - Base structural solver
- [SparseSolver.ts](../math/SparseSolver.ts) - Sparse matrix solver
- [MatrixUtils.ts](../MatrixUtils.ts) - Matrix operations

## 📚 References

1. Guyan, R.J. (1965). "Reduction of stiffness and mass matrices"
2. Cook, R.D. et al. (2001). "Concepts and Applications of Finite Element Analysis"
3. Przemieniecki, J.S. (1985). "Theory of Matrix Structural Analysis"
