// @ts-nocheck
/**
 * DxfImportService.ts
 * 
 * DXF File Import Service for BeamLab
 * 
 * Features:
 * - Parse DXF files using dxf-parser library
 * - Extract LINE, LWPOLYLINE, POLYLINE entities
 * - Convert to BeamLab node/member model
 * - Support for unit conversion (mm, m, inch, ft)
 * - Layer-based filtering and material assignment
 */

// ============================================================================
// INTERFACES
// ============================================================================

export interface DxfNode {
  id: string;
  x: number;
  y: number;
  z: number;
}

export interface DxfMember {
  id: string;
  startNodeId: string;
  endNodeId: string;
  layer: string;
  color?: number;
  lineType?: string;
}

export interface DxfImportOptions {
  /** Unit of DXF file (default: 'mm') */
  sourceUnit: 'mm' | 'm' | 'inch' | 'ft' | 'cm';
  /** Target unit for model (default: 'm') */
  targetUnit: 'mm' | 'm' | 'inch' | 'ft' | 'cm';
  /** Tolerance for merging close nodes (in source units) */
  nodeTolerance?: number;
  /** Layers to import (if empty, import all) */
  includeLayers?: string[];
  /** Layers to exclude */
  excludeLayers?: string[];
  /** Import polylines as continuous members */
  importPolylinesAsContinuous?: boolean;
  /** Z-value to use for 2D imports (default: 0) */
  defaultZ?: number;
}

export interface DxfImportResult {
  /** Imported nodes */
  nodes: DxfNode[];
  /** Imported members */
  members: DxfMember[];
  /** Layers found in file */
  layers: string[];
  /** Import statistics */
  stats: {
    totalEntities: number;
    importedLines: number;
    importedPolylines: number;
    mergedNodes: number;
    skippedEntities: number;
  };
  /** Any warnings during import */
  warnings: string[];
}

export interface DxfEntity {
  type: string;
  layer?: string;
  color?: number;
  lineType?: string;
  // LINE entity
  startPoint?: { x: number; y: number; z?: number };
  endPoint?: { x: number; y: number; z?: number };
  // LWPOLYLINE / POLYLINE entity
  vertices?: Array<{ x: number; y: number; z?: number }>;
  closed?: boolean;
}

export interface ParsedDxf {
  entities?: DxfEntity[];
  tables?: {
    layer?: {
      layers?: Record<string, { name: string; color?: number }>;
    };
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Unit conversion factors to meters */
const UNIT_TO_METERS: Record<string, number> = {
  'mm': 0.001,
  'cm': 0.01,
  'm': 1.0,
  'inch': 0.0254,
  'ft': 0.3048,
};

// ============================================================================
// DXF IMPORT SERVICE CLASS
// ============================================================================

export class DxfImportService {
  private options: DxfImportOptions;
  private nodes: Map<string, DxfNode>;
  private members: DxfMember[];
  private layers: Set<string>;
  private warnings: string[];
  private nodeIdCounter: number;
  private memberIdCounter: number;
  private stats: DxfImportResult['stats'];

  constructor(options: Partial<DxfImportOptions> = {}) {
    this.options = {
      sourceUnit: 'mm',
      targetUnit: 'm',
      nodeTolerance: 0.1,
      includeLayers: [],
      excludeLayers: [],
      importPolylinesAsContinuous: true,
      defaultZ: 0,
      ...options,
    };

    this.nodes = new Map();
    this.members = [];
    this.layers = new Set();
    this.warnings = [];
    this.nodeIdCounter = 1;
    this.memberIdCounter = 1;
    this.stats = {
      totalEntities: 0,
      importedLines: 0,
      importedPolylines: 0,
      mergedNodes: 0,
      skippedEntities: 0,
    };
  }

  // ==========================================================================
  // UNIT CONVERSION
  // ==========================================================================

  /**
   * Convert coordinate from source to target unit
   */
  private convertUnit(value: number): number {
    const { sourceUnit, targetUnit } = this.options;
    if (sourceUnit === targetUnit) return value;

    const toMeters = UNIT_TO_METERS[sourceUnit] || 1;
    const fromMeters = UNIT_TO_METERS[targetUnit] || 1;

    return (value * toMeters) / fromMeters;
  }

  // ==========================================================================
  // NODE MANAGEMENT
  // ==========================================================================

  /**
   * Generate unique key for node position
   */
  private getNodeKey(x: number, y: number, z: number): string {
    const tolerance = this.options.nodeTolerance || 0.1;
    const factor = 1 / tolerance;
    const rx = Math.round(x * factor);
    const ry = Math.round(y * factor);
    const rz = Math.round(z * factor);
    return `${rx},${ry},${rz}`;
  }

  /**
   * Find or create node at position
   */
  private findOrCreateNode(x: number, y: number, z: number): string {
    const cx = this.convertUnit(x);
    const cy = this.convertUnit(y);
    const cz = this.convertUnit(z);

    const key = this.getNodeKey(cx, cy, cz);

    if (this.nodes.has(key)) {
      this.stats.mergedNodes++;
      return this.nodes.get(key)!.id;
    }

    const nodeId = `N${this.nodeIdCounter++}`;
    this.nodes.set(key, {
      id: nodeId,
      x: cx,
      y: cy,
      z: cz,
    });

    return nodeId;
  }

  // ==========================================================================
  // LAYER FILTERING
  // ==========================================================================

  /**
   * Check if layer should be imported
   */
  private shouldImportLayer(layer: string): boolean {
    const { includeLayers, excludeLayers } = this.options;

    // Check exclusions first
    if (excludeLayers && excludeLayers.length > 0) {
      if (excludeLayers.includes(layer)) return false;
    }

    // Check inclusions
    if (includeLayers && includeLayers.length > 0) {
      return includeLayers.includes(layer);
    }

    return true;
  }

  // ==========================================================================
  // ENTITY PROCESSING
  // ==========================================================================

  /**
   * Process LINE entity
   */
  private processLine(entity: DxfEntity): void {
    const { startPoint, endPoint, layer = '0', color, lineType } = entity;

    if (!startPoint || !endPoint) {
      this.warnings.push('LINE entity missing start or end point');
      this.stats.skippedEntities++;
      return;
    }

    if (!this.shouldImportLayer(layer)) {
      this.stats.skippedEntities++;
      return;
    }

    this.layers.add(layer);

    const defaultZ = this.options.defaultZ || 0;
    const startNodeId = this.findOrCreateNode(
      startPoint.x,
      startPoint.y,
      startPoint.z ?? defaultZ
    );
    const endNodeId = this.findOrCreateNode(
      endPoint.x,
      endPoint.y,
      endPoint.z ?? defaultZ
    );

    // Skip zero-length members
    if (startNodeId === endNodeId) {
      this.warnings.push(`Skipped zero-length LINE on layer ${layer}`);
      this.stats.skippedEntities++;
      return;
    }

    const memberId = `M${this.memberIdCounter++}`;
    this.members.push({
      id: memberId,
      startNodeId,
      endNodeId,
      layer,
      color,
      lineType,
    });

    this.stats.importedLines++;
  }

  /**
   * Process LWPOLYLINE or POLYLINE entity
   */
  private processPolyline(entity: DxfEntity): void {
    const { vertices, layer = '0', color, lineType, closed } = entity;

    if (!vertices || vertices.length < 2) {
      this.warnings.push('POLYLINE entity with fewer than 2 vertices');
      this.stats.skippedEntities++;
      return;
    }

    if (!this.shouldImportLayer(layer)) {
      this.stats.skippedEntities++;
      return;
    }

    this.layers.add(layer);
    const defaultZ = this.options.defaultZ || 0;

    // Create nodes for all vertices
    const nodeIds: string[] = vertices.map((v) =>
      this.findOrCreateNode(v.x, v.y, v.z ?? defaultZ)
    );

    // Create members between consecutive vertices
    for (let i = 0; i < nodeIds.length - 1; i++) {
      const startNodeId = nodeIds[i];
      const endNodeId = nodeIds[i + 1];

      // Skip zero-length segments
      if (startNodeId === endNodeId) continue;

      const memberId = `M${this.memberIdCounter++}`;
      this.members.push({
        id: memberId,
        startNodeId,
        endNodeId,
        layer,
        color,
        lineType,
      });
    }

    // Close polyline if needed
    if (closed && nodeIds.length > 2) {
      const startNodeId = nodeIds[nodeIds.length - 1];
      const endNodeId = nodeIds[0];

      if (startNodeId !== endNodeId) {
        const memberId = `M${this.memberIdCounter++}`;
        this.members.push({
          id: memberId,
          startNodeId,
          endNodeId,
          layer,
          color,
          lineType,
        });
      }
    }

    this.stats.importedPolylines++;
  }

  /**
   * Process 3DFACE entity (for surface extraction)
   */
  private process3DFace(entity: DxfEntity): void {
    // 3DFACE has 4 corner points, create edges
    const corners = (entity as any).corners;
    if (!corners || corners.length < 3) {
      this.stats.skippedEntities++;
      return;
    }

    const layer = entity.layer || '0';
    if (!this.shouldImportLayer(layer)) {
      this.stats.skippedEntities++;
      return;
    }

    this.layers.add(layer);

    const nodeIds: string[] = corners.map((c: any) =>
      this.findOrCreateNode(c.x, c.y, c.z ?? 0)
    );

    // Create edge members
    for (let i = 0; i < nodeIds.length; i++) {
      const startNodeId = nodeIds[i];
      const endNodeId = nodeIds[(i + 1) % nodeIds.length];

      if (startNodeId !== endNodeId) {
        const memberId = `M${this.memberIdCounter++}`;
        this.members.push({
          id: memberId,
          startNodeId,
          endNodeId,
          layer,
        });
      }
    }
  }

  // ==========================================================================
  // MAIN IMPORT
  // ==========================================================================

  /**
   * Parse DXF content and extract geometry
   */
  async importFromString(dxfContent: string): Promise<DxfImportResult> {
    // Dynamic import of dxf-parser
    let DxfParser: any;
    try {
      const module = await import('dxf-parser');
      DxfParser = module.default || module;
    } catch (error) {
      throw new Error(
        'dxf-parser library not found. Please install it: npm install dxf-parser'
      );
    }

    const parser = new DxfParser();
    let dxf: ParsedDxf;

    try {
      dxf = parser.parseSync(dxfContent);
    } catch (error) {
      throw new Error(`Failed to parse DXF file: ${(error as Error).message}`);
    }

    if (!dxf || !dxf.entities) {
      throw new Error('DXF file contains no entities');
    }

    this.stats.totalEntities = dxf.entities.length;

    // Process each entity
    for (const entity of dxf.entities) {
      switch (entity.type) {
        case 'LINE':
          this.processLine(entity);
          break;

        case 'LWPOLYLINE':
        case 'POLYLINE':
          this.processPolyline(entity);
          break;

        case '3DFACE':
          this.process3DFace(entity);
          break;

        default:
          // Skip unsupported entity types
          this.stats.skippedEntities++;
      }
    }

    return {
      nodes: Array.from(this.nodes.values()),
      members: this.members,
      layers: Array.from(this.layers),
      stats: this.stats,
      warnings: this.warnings,
    };
  }

  /**
   * Import from File object (browser)
   */
  async importFromFile(file: File): Promise<DxfImportResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const result = await this.importFromString(content);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read DXF file'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Reset service state for new import
   */
  reset(): void {
    this.nodes = new Map();
    this.members = [];
    this.layers = new Set();
    this.warnings = [];
    this.nodeIdCounter = 1;
    this.memberIdCounter = 1;
    this.stats = {
      totalEntities: 0,
      importedLines: 0,
      importedPolylines: 0,
      mergedNodes: 0,
      skippedEntities: 0,
    };
  }
}

// ============================================================================
// CONVERSION UTILITIES
// ============================================================================

/**
 * Convert DXF import result to BeamLab model format
 */
export function convertToBeamLabModel(result: DxfImportResult): {
  nodes: Array<{ id: string; x: number; y: number; z: number }>;
  members: Array<{ id: string; startNode: string; endNode: string }>;
} {
  return {
    nodes: result.nodes.map((n) => ({
      id: n.id,
      x: n.x,
      y: n.y,
      z: n.z,
    })),
    members: result.members.map((m) => ({
      id: m.id,
      startNode: m.startNodeId,
      endNode: m.endNodeId,
    })),
  };
}

/**
 * Group members by layer for material/section assignment
 */
export function groupMembersByLayer(
  result: DxfImportResult
): Map<string, DxfMember[]> {
  const groups = new Map<string, DxfMember[]>();

  for (const member of result.members) {
    const layer = member.layer;
    if (!groups.has(layer)) {
      groups.set(layer, []);
    }
    groups.get(layer)!.push(member);
  }

  return groups;
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Quick DXF import with default options
 */
export async function importDxf(
  dxfContent: string,
  options?: Partial<DxfImportOptions>
): Promise<DxfImportResult> {
  const service = new DxfImportService(options);
  return service.importFromString(dxfContent);
}

/**
 * Quick DXF import from file with default options
 */
export async function importDxfFile(
  file: File,
  options?: Partial<DxfImportOptions>
): Promise<DxfImportResult> {
  const service = new DxfImportService(options);
  return service.importFromFile(file);
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/*
// Browser usage
const fileInput = document.getElementById('dxf-input') as HTMLInputElement;
fileInput.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    const result = await importDxfFile(file, {
      sourceUnit: 'mm',
      targetUnit: 'm',
      nodeTolerance: 1.0,
      includeLayers: ['BEAMS', 'COLUMNS'],
    });

    console.log('Nodes:', result.nodes);
    console.log('Members:', result.members);
    console.log('Stats:', result.stats);

    // Convert to BeamLab model
    const model = convertToBeamLabModel(result);
    console.log('Model:', model);

    // Group by layer for section assignment
    const groups = groupMembersByLayer(result);
    groups.forEach((members, layer) => {
      console.log(`Layer ${layer}: ${members.length} members`);
    });
  }
});
*/
