import { z } from 'zod';

// ============================================================================
// BASIC TYPES
// ============================================================================

export const Vector3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export type Vector3 = z.infer<typeof Vector3Schema>;

export const UnitSystemSchema = z.enum(['metric', 'imperial']);
export type UnitSystem = z.infer<typeof UnitSystemSchema>;

// ============================================================================
// NODE TYPES
// ============================================================================

export const NodeSchema = z.object({
  id: z.string().uuid(),
  position: Vector3Schema,
  constraints: z.object({
    x: z.boolean(), // Translation in X
    y: z.boolean(), // Translation in Y
    z: z.boolean(), // Translation in Z
    rx: z.boolean(), // Rotation about X
    ry: z.boolean(), // Rotation about Y
    rz: z.boolean(), // Rotation about Z
  }),
  label: z.string().optional(),
  notes: z.string().optional(), // User-defined notes for the node
});

export type Node = z.infer<typeof NodeSchema>;

export const SupportTypeSchema = z.enum(['fixed', 'pinned', 'roller', 'spring']);
export type SupportType = z.infer<typeof SupportTypeSchema>;

export const SupportSchema = z.object({
  nodeId: z.string().uuid(),
  type: SupportTypeSchema,
  springStiffness: z.object({
    kx: z.number().optional(),
    ky: z.number().optional(),
    kz: z.number().optional(),
    krx: z.number().optional(),
    kry: z.number().optional(),
    krz: z.number().optional(),
  }).optional(),
});

export type Support = z.infer<typeof SupportSchema>;

// ============================================================================
// MATERIAL TYPES
// ============================================================================

export const MaterialSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  elasticModulus: z.number().positive(), // E (Pa or psi)
  shearModulus: z.number().positive(), // G (Pa or psi)
  poissonRatio: z.number().min(0).max(0.5), // ν
  density: z.number().positive(), // ρ (kg/m³ or lb/ft³)
  yieldStrength: z.number().positive().optional(), // fy
  ultimateStrength: z.number().positive().optional(), // fu
});

export type Material = z.infer<typeof MaterialSchema>;

// ============================================================================
// SECTION TYPES
// ============================================================================

export const SectionTypeSchema = z.enum([
  'rectangular',
  'circular',
  'i-beam',
  'channel',
  'angle',
  'tube',
  'custom',
]);

export type SectionType = z.infer<typeof SectionTypeSchema>;

export const SectionPropertiesSchema = z.object({
  area: z.number().positive(), // A (m² or in²)
  momentOfInertiaY: z.number().positive(), // Iy (m⁴ or in⁴)
  momentOfInertiaZ: z.number().positive(), // Iz (m⁴ or in⁴)
  torsionalConstant: z.number().positive(), // J (m⁴ or in⁴)
  sectionModulusY: z.number().positive().optional(), // Sy
  sectionModulusZ: z.number().positive().optional(), // Sz
});

export type SectionProperties = z.infer<typeof SectionPropertiesSchema>;

export const SectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: SectionTypeSchema,
  properties: SectionPropertiesSchema,
  dimensions: z.record(z.string(), z.number()).optional(),
});

export type Section = z.infer<typeof SectionSchema>;

// ============================================================================
// ELEMENT TYPES
// ============================================================================

export const ElementTypeSchema = z.enum(['beam', 'truss', 'frame']);
export type ElementType = z.infer<typeof ElementTypeSchema>;

export const ElementSchema = z.object({
  id: z.string().uuid(),
  type: ElementTypeSchema,
  startNodeId: z.string().uuid(),
  endNodeId: z.string().uuid(),
  materialId: z.string().uuid(),
  sectionId: z.string().uuid(),
  localYAxis: Vector3Schema.optional(), // For orientation
  releases: z.object({
    startMomentY: z.boolean().optional(),
    startMomentZ: z.boolean().optional(),
    endMomentY: z.boolean().optional(),
    endMomentZ: z.boolean().optional(),
  }).optional(),
  label: z.string().optional(),
});

export type Element = z.infer<typeof ElementSchema>;

// ============================================================================
// LOAD TYPES
// ============================================================================

export const LoadTypeSchema = z.enum([
  'point',
  'distributed',
  'moment',
  'temperature',
]);

export type LoadType = z.infer<typeof LoadTypeSchema>;

export const PointLoadSchema = z.object({
  id: z.string().uuid(),
  type: z.literal('point'),
  nodeId: z.string().uuid(),
  force: Vector3Schema,
  moment: Vector3Schema.optional(),
});

export type PointLoad = z.infer<typeof PointLoadSchema>;

export const DistributedLoadSchema = z.object({
  id: z.string().uuid(),
  type: z.literal('distributed'),
  elementId: z.string().uuid(),
  direction: z.enum(['x', 'y', 'z', 'local-x', 'local-y', 'local-z']),
  startMagnitude: z.number(),
  endMagnitude: z.number(),
  startPosition: z.number().min(0).max(1), // Relative position (0-1)
  endPosition: z.number().min(0).max(1),
});

export type DistributedLoad = z.infer<typeof DistributedLoadSchema>;

export const MomentLoadSchema = z.object({
  id: z.string().uuid(),
  type: z.literal('moment'),
  nodeId: z.string().uuid(),
  moment: Vector3Schema,
});

export type MomentLoad = z.infer<typeof MomentLoadSchema>;

export const LoadSchema = z.discriminatedUnion('type', [
  PointLoadSchema,
  DistributedLoadSchema,
  MomentLoadSchema,
]);

export type Load = z.infer<typeof LoadSchema>;

// ============================================================================
// LOAD CASE & COMBINATION
// ============================================================================

export const LoadCaseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  loads: z.array(LoadSchema),
});

export type LoadCase = z.infer<typeof LoadCaseSchema>;

export const LoadCombinationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  factors: z.array(z.object({
    loadCaseId: z.string().uuid(),
    factor: z.number(),
  })),
});

export type LoadCombination = z.infer<typeof LoadCombinationSchema>;

// ============================================================================
// ANALYSIS RESULTS
// ============================================================================

export const NodalDisplacementSchema = z.object({
  nodeId: z.string().uuid(),
  displacement: Vector3Schema,
  rotation: Vector3Schema,
});

export type NodalDisplacement = z.infer<typeof NodalDisplacementSchema>;

export const MemberForceSchema = z.object({
  elementId: z.string().uuid(),
  startForces: z.object({
    axial: z.number(),
    shearY: z.number(),
    shearZ: z.number(),
    torsion: z.number(),
    momentY: z.number(),
    momentZ: z.number(),
  }),
  endForces: z.object({
    axial: z.number(),
    shearY: z.number(),
    shearZ: z.number(),
    torsion: z.number(),
    momentY: z.number(),
    momentZ: z.number(),
  }),
});

export type MemberForce = z.infer<typeof MemberForceSchema>;

export const ReactionSchema = z.object({
  nodeId: z.string().uuid(),
  force: Vector3Schema,
  moment: Vector3Schema,
});

export type Reaction = z.infer<typeof ReactionSchema>;

export const AnalysisResultSchema = z.object({
  loadCaseId: z.string().uuid(),
  displacements: z.array(NodalDisplacementSchema),
  memberForces: z.array(MemberForceSchema),
  reactions: z.array(ReactionSchema),
  maxDisplacement: z.number(),
  maxStress: z.number().optional(),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

// ============================================================================
// PROJECT / MODEL
// ============================================================================

export const StructuralModelSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  unitSystem: UnitSystemSchema,
  nodes: z.array(NodeSchema),
  elements: z.array(ElementSchema),
  supports: z.array(SupportSchema),
  materials: z.array(MaterialSchema),
  sections: z.array(SectionSchema),
  loadCases: z.array(LoadCaseSchema),
  loadCombinations: z.array(LoadCombinationSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type StructuralModel = z.infer<typeof StructuralModelSchema>;

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  model: StructuralModelSchema,
  results: z.array(AnalysisResultSchema).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Project = z.infer<typeof ProjectSchema>;

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export const CreateProjectRequestSchema = ProjectSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;

export const UpdateProjectRequestSchema = ProjectSchema.partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>;

export const AnalyzeModelRequestSchema = z.object({
  modelId: z.string().uuid(),
  loadCaseIds: z.array(z.string().uuid()).optional(),
  loadCombinationIds: z.array(z.string().uuid()).optional(),
});

export type AnalyzeModelRequest = z.infer<typeof AnalyzeModelRequestSchema>;

// ============================================================================
// EXPORT
// ============================================================================

export * from 'zod';
