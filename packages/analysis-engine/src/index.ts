import * as math from 'mathjs';
import type {
  Vector3,
  Node,
  Element,
  Material,
  Section,
  StructuralModel,
  AnalysisResult,
  NodalDisplacement,
  MemberForce,
  Reaction,
} from '@beamlab/types';

// Export MatrixUtils
export { MatrixUtils, type NodeCoord } from './MatrixUtils';

// Export Solver
export { 
  Solver, 
  type SolverNode, 
  type SolverMember, 
  type SolverSupport, 
  type SolverConfig,
  type NodalLoad,
  type SolverResult 
} from './Solver';

// Export Sparse Matrix Solver
export {
  SparseMatrixBuilder,
  SparseSolver,
  createSparseSolver,
  conjugateGradient,
  biCGSTAB,
  csrMatVec,
  csrGetDiagonal,
  csrExtractSubmatrix,
  type CSRMatrix,
  type SparseStats,
  type CGOptions,
  type CGResult,
  type SparseSolverConfig,
  type SparseSolverResult,
} from './math';

// Export MemberForcesCalculator
export {
  calculateMemberFyMz,
  type MemberForcesOutput,
  type MemberLoadProfile,
} from './MemberForcesCalculator';

// ============================================================================
// DESIGN MODULES - IS CODES
// ============================================================================

// IS 800:2007 Steel Design
export {
  IS800Designer,
  designSteelMemberIS800,
  type MemberForces as IS800MemberForces,
  type SectionProps as IS800SectionProps,
  type Material as IS800Material,
  type MemberGeometry as IS800MemberGeometry,
  type DesignResult as IS800DesignResult,
} from './design/steel/IS800Designer';

// IS 456:2000 Concrete Beam Design
export {
  IS456BeamDesigner,
  designRCBeamIS456,
  type BeamGeometry,
  type BeamForces,
  type ConcreteGrade,
  type SteelGrade,
  type FlexureDesignResult,
  type ShearDesignResult,
  type BeamDesignResult,
} from './design/concrete/IS456BeamDesigner';

// IS 456:2000 Concrete Column Design
export {
  IS456ColumnDesigner,
  designRCColumnIS456,
  type ColumnGeometry,
  type ColumnForces,
  type ColumnDesignResult,
} from './design/concrete/IS456ColumnDesigner';

// ============================================================================
// LOADING MODULES - IS CODES
// ============================================================================

// IS 875 Part 3 - Wind Load
export {
  IS875WindGenerator,
  generateWindLoadIS875,
  type SiteData as WindSiteData,
  type BuildingData as WindBuildingData,
  type WindResult,
} from './loading/IS875WindGenerator';

// IS 1893 Part 1 - Seismic Load
export {
  IS1893SeismicGenerator,
  generateSeismicLoadIS1893,
  calcDesignBaseShear,
  RESPONSE_REDUCTION_FACTORS,
  type SeismicSiteData,
  type BuildingGeometry as SeismicBuildingGeometry,
  type MassDistribution,
  type SeismicResult,
  type StoryForce,
} from './loading/IS1893SeismicGenerator';

// ============================================================================
// SUSTAINABILITY MODULE
// ============================================================================

export {
  CarbonCalculator,
  calculateEmbodiedCarbon,
  getSustainabilityRating,
  CarbonFactors,
  type MaterialQuantity,
  type MemberCarbonData,
  type CarbonSummary,
  type SustainabilityRating,
  type BenchmarkComparison,
  type StructuralMember as CarbonStructuralMember,
  type CarbonCalculatorOptions,
} from './sustainability';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function vectorLength(v: Vector3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function vectorSubtract(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function vectorAdd(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function vectorScale(v: Vector3, scalar: number): Vector3 {
  return { x: v.x * scalar, y: v.y * scalar, z: v.z * scalar };
}

export function vectorNormalize(v: Vector3): Vector3 {
  const length = vectorLength(v);
  if (length === 0) return { x: 0, y: 0, z: 0 };
  return vectorScale(v, 1 / length);
}

export function vectorDot(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function vectorCross(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

// ============================================================================
// ELEMENT TRANSFORMATION
// ============================================================================

export class ElementTransformation {
  private _element: Element;
  private _startNode: Node;
  private _endNode: Node;
  private length: number;
  private localX: Vector3;
  private localY: Vector3;
  private localZ: Vector3;

  constructor(element: Element, startNode: Node, endNode: Node) {
    this._element = element;
    this._startNode = startNode;
    this._endNode = endNode;

    // Calculate element length and local axes
    const dx = vectorSubtract(endNode.position, startNode.position);
    this.length = vectorLength(dx);
    this.localX = vectorNormalize(dx);

    // Determine local Y axis
    if (element.localYAxis) {
      this.localY = vectorNormalize(element.localYAxis);
    } else {
      // Default: use global Z if element is not vertical
      const globalZ: Vector3 = { x: 0, y: 0, z: 1 };
      const dot = Math.abs(vectorDot(this.localX, globalZ));
      if (dot < 0.99) {
        const temp = vectorCross(this.localX, globalZ);
        this.localY = vectorNormalize(vectorCross(temp, this.localX));
      } else {
        // Element is vertical, use global Y
        const globalY: Vector3 = { x: 0, y: 1, z: 0 };
        const temp = vectorCross(this.localX, globalY);
        this.localY = vectorNormalize(vectorCross(temp, this.localX));
      }
    }

    this.localZ = vectorNormalize(vectorCross(this.localX, this.localY));
  }

  getLength(): number {
    return this.length;
  }

  getTransformationMatrix(): math.Matrix {
    const T = math.zeros(12, 12) as math.Matrix;
    const lambda = [
      [this.localX.x, this.localX.y, this.localX.z],
      [this.localY.x, this.localY.y, this.localY.z],
      [this.localZ.x, this.localZ.y, this.localZ.z],
    ];

    // Fill 12x12 transformation matrix with 4 3x3 blocks
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        for (let k = 0; k < 3; k++) {
          T.set([i * 3 + j, i * 3 + k], lambda[j][k]);
        }
      }
    }

    return T;
  }
}

// ============================================================================
// ELEMENT STIFFNESS MATRIX
// ============================================================================

export class StiffnessMatrixCalculator {
  static calculateLocalStiffness(
    _element: Element,
    material: Material,
    section: Section,
    length: number
  ): math.Matrix {
    const E = material.elasticModulus;
    const G = material.shearModulus;
    const A = section.properties.area;
    const Iy = section.properties.momentOfInertiaY;
    const Iz = section.properties.momentOfInertiaZ;
    const J = section.properties.torsionalConstant;
    const L = length;
    const L2 = L * L;
    const L3 = L2 * L;

    // Initialize 12x12 local stiffness matrix
    const k = math.zeros(12, 12) as math.Matrix;

    // Axial stiffness
    const EA_L = (E * A) / L;
    k.set([0, 0], EA_L);
    k.set([0, 6], -EA_L);
    k.set([6, 0], -EA_L);
    k.set([6, 6], EA_L);

    // Torsional stiffness
    const GJ_L = (G * J) / L;
    k.set([3, 3], GJ_L);
    k.set([3, 9], -GJ_L);
    k.set([9, 3], -GJ_L);
    k.set([9, 9], GJ_L);

    // Bending stiffness about local z-axis (in xy plane)
    const EIz_L3 = (E * Iz) / L3;
    const EIz_L2 = (E * Iz) / L2;
    const EIz_L = (E * Iz) / L;

    k.set([1, 1], 12 * EIz_L3);
    k.set([1, 5], 6 * EIz_L2);
    k.set([1, 7], -12 * EIz_L3);
    k.set([1, 11], 6 * EIz_L2);

    k.set([5, 1], 6 * EIz_L2);
    k.set([5, 5], 4 * EIz_L);
    k.set([5, 7], -6 * EIz_L2);
    k.set([5, 11], 2 * EIz_L);

    k.set([7, 1], -12 * EIz_L3);
    k.set([7, 5], -6 * EIz_L2);
    k.set([7, 7], 12 * EIz_L3);
    k.set([7, 11], -6 * EIz_L2);

    k.set([11, 1], 6 * EIz_L2);
    k.set([11, 5], 2 * EIz_L);
    k.set([11, 7], -6 * EIz_L2);
    k.set([11, 11], 4 * EIz_L);

    // Bending stiffness about local y-axis (in xz plane)
    const EIy_L3 = (E * Iy) / L3;
    const EIy_L2 = (E * Iy) / L2;
    const EIy_L = (E * Iy) / L;

    k.set([2, 2], 12 * EIy_L3);
    k.set([2, 4], -6 * EIy_L2);
    k.set([2, 8], -12 * EIy_L3);
    k.set([2, 10], -6 * EIy_L2);

    k.set([4, 2], -6 * EIy_L2);
    k.set([4, 4], 4 * EIy_L);
    k.set([4, 8], 6 * EIy_L2);
    k.set([4, 10], 2 * EIy_L);

    k.set([8, 2], -12 * EIy_L3);
    k.set([8, 4], 6 * EIy_L2);
    k.set([8, 8], 12 * EIy_L3);
    k.set([8, 10], 6 * EIy_L2);

    k.set([10, 2], -6 * EIy_L2);
    k.set([10, 4], 2 * EIy_L);
    k.set([10, 8], 6 * EIy_L2);
    k.set([10, 10], 4 * EIy_L);

    return k;
  }

  static transformToGlobal(
    localK: math.Matrix,
    T: math.Matrix
  ): math.Matrix {
    const Tt = math.transpose(T);
    return math.multiply(math.multiply(Tt, localK), T) as math.Matrix;
  }
}

// ============================================================================
// MAIN ANALYSIS ENGINE
// ============================================================================

export class StructuralAnalyzer {
  private model: StructuralModel;
  private nodeIndexMap: Map<string, number>;
  private dofCount: number;

  constructor(model: StructuralModel) {
    this.model = model;
    this.nodeIndexMap = new Map();
    this.dofCount = 0;
    this.buildNodeIndexMap();
  }

  private buildNodeIndexMap(): void {
    this.model.nodes.forEach((node, index) => {
      this.nodeIndexMap.set(node.id, index);
    });
    this.dofCount = this.model.nodes.length * 6; // 6 DOF per node
  }

  private getNodeById(nodeId: string): Node {
    const node = this.model.nodes.find((n) => n.id === nodeId);
    if (!node) {
      throw new Error(`Node with id ${nodeId} not found`);
    }
    return node;
  }

  private getMaterialById(materialId: string): Material {
    const material = this.model.materials.find((m) => m.id === materialId);
    if (!material) {
      throw new Error(`Material with id ${materialId} not found`);
    }
    return material;
  }

  private getSectionById(sectionId: string): Section {
    const section = this.model.sections.find((s) => s.id === sectionId);
    if (!section) {
      throw new Error(`Section with id ${sectionId} not found`);
    }
    return section;
  }

  assembleGlobalStiffnessMatrix(): math.Matrix {
    const K = math.zeros(this.dofCount, this.dofCount) as math.Matrix;

    for (const element of this.model.elements) {
      const startNode = this.getNodeById(element.startNodeId);
      const endNode = this.getNodeById(element.endNodeId);
      const material = this.getMaterialById(element.materialId);
      const section = this.getSectionById(element.sectionId);

      const transformation = new ElementTransformation(element, startNode, endNode);
      const length = transformation.getLength();

      // Calculate local stiffness matrix
      const kLocal = StiffnessMatrixCalculator.calculateLocalStiffness(
        element,
        material,
        section,
        length
      );

      // Transform to global coordinates
      const T = transformation.getTransformationMatrix();
      const kGlobal = StiffnessMatrixCalculator.transformToGlobal(kLocal, T);

      // Assemble into global matrix
      const startIndex = this.nodeIndexMap.get(element.startNodeId)! * 6;
      const endIndex = this.nodeIndexMap.get(element.endNodeId)! * 6;

      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
          // Start node block
          const valSS = K.get([startIndex + i, startIndex + j]) + kGlobal.get([i, j]);
          K.set([startIndex + i, startIndex + j], valSS);

          // Start-End block
          const valSE = K.get([startIndex + i, endIndex + j]) + kGlobal.get([i, j + 6]);
          K.set([startIndex + i, endIndex + j], valSE);

          // End-Start block
          const valES = K.get([endIndex + i, startIndex + j]) + kGlobal.get([i + 6, j]);
          K.set([endIndex + i, startIndex + j], valES);

          // End node block
          const valEE = K.get([endIndex + i, endIndex + j]) + kGlobal.get([i + 6, j + 6]);
          K.set([endIndex + i, endIndex + j], valEE);
        }
      }
    }

    return K;
  }

  assembleLoadVector(loadCaseId: string): math.Matrix {
    const F = math.zeros(this.dofCount, 1) as math.Matrix;
    const loadCase = this.model.loadCases.find((lc) => lc.id === loadCaseId);

    if (!loadCase) {
      throw new Error(`Load case with id ${loadCaseId} not found`);
    }

    for (const load of loadCase.loads) {
      if (load.type === 'point') {
        const nodeIndex = this.nodeIndexMap.get(load.nodeId)!;
        const startDof = nodeIndex * 6;

        F.set([startDof + 0, 0], F.get([startDof + 0, 0]) + load.force.x);
        F.set([startDof + 1, 0], F.get([startDof + 1, 0]) + load.force.y);
        F.set([startDof + 2, 0], F.get([startDof + 2, 0]) + load.force.z);

        if (load.moment) {
          F.set([startDof + 3, 0], F.get([startDof + 3, 0]) + load.moment.x);
          F.set([startDof + 4, 0], F.get([startDof + 4, 0]) + load.moment.y);
          F.set([startDof + 5, 0], F.get([startDof + 5, 0]) + load.moment.z);
        }
      } else if (load.type === 'moment') {
        const nodeIndex = this.nodeIndexMap.get(load.nodeId)!;
        const startDof = nodeIndex * 6;

        F.set([startDof + 3, 0], F.get([startDof + 3, 0]) + load.moment.x);
        F.set([startDof + 4, 0], F.get([startDof + 4, 0]) + load.moment.y);
        F.set([startDof + 5, 0], F.get([startDof + 5, 0]) + load.moment.z);
      }
      // TODO: Handle distributed loads - convert to equivalent nodal loads
    }

    return F;
  }

  applyBoundaryConditions(K: math.Matrix, F: math.Matrix): {
    Kmod: math.Matrix;
    Fmod: math.Matrix;
    constrainedDofs: Set<number>;
  } {
    const constrainedDofs = new Set<number>();

    // Identify constrained DOFs from supports
    for (const support of this.model.supports) {
      const nodeIndex = this.nodeIndexMap.get(support.nodeId)!;
      const startDof = nodeIndex * 6;

      if (support.type === 'fixed') {
        for (let i = 0; i < 6; i++) {
          constrainedDofs.add(startDof + i);
        }
      } else if (support.type === 'pinned') {
        constrainedDofs.add(startDof + 0); // x
        constrainedDofs.add(startDof + 1); // y
        constrainedDofs.add(startDof + 2); // z
      } else if (support.type === 'roller') {
        constrainedDofs.add(startDof + 1); // y (typically vertical)
      }
    }

    // Also check node constraints
    for (const node of this.model.nodes) {
      const nodeIndex = this.nodeIndexMap.get(node.id)!;
      const startDof = nodeIndex * 6;

      if (node.constraints.x) constrainedDofs.add(startDof + 0);
      if (node.constraints.y) constrainedDofs.add(startDof + 1);
      if (node.constraints.z) constrainedDofs.add(startDof + 2);
      if (node.constraints.rx) constrainedDofs.add(startDof + 3);
      if (node.constraints.ry) constrainedDofs.add(startDof + 4);
      if (node.constraints.rz) constrainedDofs.add(startDof + 5);
    }

    // Apply penalty method for boundary conditions
    const Kmod = math.clone(K);
    const Fmod = math.clone(F);
    const penalty = 1e15;

    for (const dof of constrainedDofs) {
      Kmod.set([dof, dof], Kmod.get([dof, dof]) + penalty);
    }

    return { Kmod, Fmod, constrainedDofs };
  }

  solve(loadCaseId: string): AnalysisResult {
    // Assemble global stiffness matrix
    const K = this.assembleGlobalStiffnessMatrix();

    // Assemble load vector
    const F = this.assembleLoadVector(loadCaseId);

    // Apply boundary conditions
    const { Kmod, Fmod } = this.applyBoundaryConditions(K, F);

    // Solve system: K * U = F
    const U = math.lusolve(Kmod, Fmod) as math.Matrix;

    // Extract results
    const displacements: NodalDisplacement[] = [];
    let maxDisplacement = 0;

    for (const node of this.model.nodes) {
      const nodeIndex = this.nodeIndexMap.get(node.id)!;
      const startDof = nodeIndex * 6;

      const displacement: Vector3 = {
        x: U.get([startDof + 0, 0]),
        y: U.get([startDof + 1, 0]),
        z: U.get([startDof + 2, 0]),
      };

      const rotation: Vector3 = {
        x: U.get([startDof + 3, 0]),
        y: U.get([startDof + 4, 0]),
        z: U.get([startDof + 5, 0]),
      };

      const dispMag = vectorLength(displacement);
      if (dispMag > maxDisplacement) {
        maxDisplacement = dispMag;
      }

      displacements.push({
        nodeId: node.id,
        displacement,
        rotation,
      });
    }

    // Calculate member forces
    const memberForces = this.calculateMemberForces(U);

    // Calculate reactions
    const reactions = this.calculateReactions(K, U);

    const result: AnalysisResult = {
      loadCaseId,
      displacements,
      memberForces,
      reactions,
      maxDisplacement,
    };

    return result;
  }

  private calculateMemberForces(U: math.Matrix): MemberForce[] {
    const memberForces: MemberForce[] = [];

    for (const element of this.model.elements) {
      const startNode = this.getNodeById(element.startNodeId);
      const endNode = this.getNodeById(element.endNodeId);
      const material = this.getMaterialById(element.materialId);
      const section = this.getSectionById(element.sectionId);

      const transformation = new ElementTransformation(element, startNode, endNode);
      const length = transformation.getLength();

      // Get element displacements in global coordinates
      const startIndex = this.nodeIndexMap.get(element.startNodeId)! * 6;
      const endIndex = this.nodeIndexMap.get(element.endNodeId)! * 6;

      const Ue = math.zeros(12, 1) as math.Matrix;
      for (let i = 0; i < 6; i++) {
        Ue.set([i, 0], U.get([startIndex + i, 0]));
        Ue.set([i + 6, 0], U.get([endIndex + i, 0]));
      }

      // Transform to local coordinates
      const T = transformation.getTransformationMatrix();
      const UeLocal = math.multiply(T, Ue) as math.Matrix;

      // Calculate local forces
      const kLocal = StiffnessMatrixCalculator.calculateLocalStiffness(
        element,
        material,
        section,
        length
      );
      const FLocal = math.multiply(kLocal, UeLocal) as math.Matrix;

      memberForces.push({
        elementId: element.id,
        startForces: {
          axial: FLocal.get([0, 0]),
          shearY: FLocal.get([1, 0]),
          shearZ: FLocal.get([2, 0]),
          torsion: FLocal.get([3, 0]),
          momentY: FLocal.get([4, 0]),
          momentZ: FLocal.get([5, 0]),
        },
        endForces: {
          axial: FLocal.get([6, 0]),
          shearY: FLocal.get([7, 0]),
          shearZ: FLocal.get([8, 0]),
          torsion: FLocal.get([9, 0]),
          momentY: FLocal.get([10, 0]),
          momentZ: FLocal.get([11, 0]),
        },
      });
    }

    return memberForces;
  }

  private calculateReactions(K: math.Matrix, U: math.Matrix): Reaction[] {
    const reactions: Reaction[] = [];
    const R = math.multiply(K, U) as math.Matrix;

    for (const support of this.model.supports) {
      const nodeIndex = this.nodeIndexMap.get(support.nodeId)!;
      const startDof = nodeIndex * 6;

      reactions.push({
        nodeId: support.nodeId,
        force: {
          x: R.get([startDof + 0, 0]),
          y: R.get([startDof + 1, 0]),
          z: R.get([startDof + 2, 0]),
        },
        moment: {
          x: R.get([startDof + 3, 0]),
          y: R.get([startDof + 4, 0]),
          z: R.get([startDof + 5, 0]),
        },
      });
    }

    return reactions;
  }
}

// ============================================================================
// SUBSTRUCTURING & SUPER ELEMENTS
// ============================================================================

// SubstructureManager - Static Condensation
export {
  SubstructureManager,
  createSubstructureManager,
  mergeSuperElements,
  serializeSuperElement,
  deserializeSuperElement,
  type SubstructureNode,
  type SubstructureMember,
  type CreateSuperElementInput,
  type SuperElement,
  type SuperElementResult,
  type SubstructureConfig,
  // Super Element Integration with Solver
  HybridSuperElementSolver,
  prepareModelWithSuperElements,
  exampleFloorTrussBuilding,
  type SuperElementAnalysisInput,
  type SuperElementAnalysisResult,
} from './features';

export * from '@beamlab/types';
