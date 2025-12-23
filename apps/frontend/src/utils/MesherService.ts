/**
 * MesherService - Generates quad plate meshes for 2D surface analysis
 * 
 * Creates a structured grid of 4-node plate elements within a boundary polygon.
 */

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Plate {
  id: string;
  nodeIds: [string, string, string, string]; // 4-node quad: [n1, n2, n3, n4]
  thickness?: number;
  material?: string;
}

export interface MeshResult {
  nodes: Map<string, Point3D>;
  plates: Plate[];
  stats: {
    nodeCount: number;
    plateCount: number;
    meshSize: number;
  };
}

/**
 * Point-in-polygon test using ray casting algorithm
 */
function pointInPolygon(point: Point3D, polygon: Point3D[]): boolean {
  let inside = false;
  const x = point.x;
  const y = point.y;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Check if a point is on or very close to a polygon edge (tolerance-based)
 */
function pointOnEdge(point: Point3D, polygon: Point3D[], tolerance: number = 1e-6): boolean {
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];

    // Vector from p1 to p2
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len < tolerance) continue;

    // Vector from p1 to point
    const px = point.x - p1.x;
    const py = point.y - p1.y;

    // Project point onto edge
    const t = (px * dx + py * dy) / (len * len);

    if (t >= -tolerance && t <= 1 + tolerance) {
      const closestX = p1.x + t * dx;
      const closestY = p1.y + t * dy;
      const distX = point.x - closestX;
      const distY = point.y - closestY;
      const dist = Math.sqrt(distX * distX + distY * distY);

      if (dist < tolerance) return true;
    }
  }

  return false;
}

/**
 * Get bounding box of polygon
 */
function getBounds(polygon: Point3D[]): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const point of polygon) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  return { minX, maxX, minY, maxY };
}

/**
 * Snap a point to nearest boundary node if within tolerance
 */
function snapToBoundary(point: Point3D, polygon: Point3D[], tolerance: number = 1e-4): Point3D | null {
  for (const boundaryPoint of polygon) {
    const dx = point.x - boundaryPoint.x;
    const dy = point.y - boundaryPoint.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < tolerance) {
      return boundaryPoint;
    }
  }

  return null;
}

/**
 * Generate a structured quad mesh within a boundary polygon
 * 
 * @param surfaceVertices - Array of vertices defining the boundary polygon (in order)
 * @param meshSize - Target size of mesh elements (spacing between nodes)
 * @returns MeshResult with nodes map and plate elements
 */
export function meshSurface(
  surfaceVertices: Point3D[],
  meshSize: number
): MeshResult {
  if (surfaceVertices.length < 3) {
    throw new Error('Polygon must have at least 3 vertices');
  }

  if (meshSize <= 0) {
    throw new Error('Mesh size must be positive');
  }

  const nodes = new Map<string, Point3D>();
  const plates: Plate[] = [];
  const nodeIds = new Map<string, string>(); // Key: "x,y" -> nodeId
  let nodeCounter = 0;

  const bounds = getBounds(surfaceVertices);
  const tolerance = meshSize * 0.01; // 1% of mesh size

  // Step 1: Generate grid points
  const gridPoints: Point3D[] = [];
  const gridMap = new Map<string, Point3D>(); // Key: "x,y" -> Point3D

  for (let x = Math.floor(bounds.minX / meshSize) * meshSize; x <= bounds.maxX; x += meshSize) {
    for (let y = Math.floor(bounds.minY / meshSize) * meshSize; y <= bounds.maxY; y += meshSize) {
      const point: Point3D = { x: Math.round(x / meshSize) * meshSize, y: Math.round(y / meshSize) * meshSize, z: 0 };

      // Check if point is inside polygon or on boundary
      const inside = pointInPolygon(point, surfaceVertices);
      const onEdge = pointOnEdge(point, surfaceVertices, tolerance);

      if (inside || onEdge) {
        // Try to snap to boundary vertex
        const snapped = snapToBoundary(point, surfaceVertices, tolerance);
        const finalPoint = snapped || point;

        const key = `${finalPoint.x.toFixed(6)},${finalPoint.y.toFixed(6)}`;
        if (!gridMap.has(key)) {
          gridMap.set(key, finalPoint);
          gridPoints.push(finalPoint);
        }
      }
    }
  }

  // Step 2: Assign node IDs
  for (const point of gridPoints) {
    const key = `${point.x.toFixed(6)},${point.y.toFixed(6)}`;
    const nodeId = `N${nodeCounter++}`;
    nodeIds.set(key, nodeId);
    nodes.set(nodeId, point);
  }

  // Step 3: Generate quad elements
  const uniqueX = [...new Set(gridPoints.map((p) => Math.round(p.x / meshSize) * meshSize))].sort(
    (a, b) => a - b
  );
  const uniqueY = [...new Set(gridPoints.map((p) => Math.round(p.y / meshSize) * meshSize))].sort(
    (a, b) => a - b
  );

  let plateCounter = 0;

  for (let i = 0; i < uniqueX.length - 1; i++) {
    for (let j = 0; j < uniqueY.length - 1; j++) {
      const x1 = uniqueX[i];
      const x2 = uniqueX[i + 1];
      const y1 = uniqueY[j];
      const y2 = uniqueY[j + 1];

      // Four corner points
      const corners = [
        { x: x1, y: y1 },
        { x: x2, y: y1 },
        { x: x2, y: y2 },
        { x: x1, y: y2 },
      ];

      // Find node IDs for corners
      const cornerNodeIds: (string | null)[] = corners.map((corner) => {
        const key = `${corner.x.toFixed(6)},${corner.y.toFixed(6)}`;
        return nodeIds.get(key) || null;
      });

      // Only create quad if all 4 corners exist
      if (cornerNodeIds.every((id) => id !== null)) {
        plates.push({
          id: `P${plateCounter++}`,
          nodeIds: cornerNodeIds as [string, string, string, string],
        });
      }
    }
  }

  return {
    nodes,
    plates,
    stats: {
      nodeCount: nodes.size,
      plateCount: plates.length,
      meshSize,
    },
  };
}

/**
 * Export mesh to solver-compatible format
 */
export function exportMesh(result: MeshResult): {
  nodes: Array<{ id: string; x: number; y: number; z: number }>;
  plates: Array<{ id: string; nodeIds: [string, string, string, string] }>;
} {
  return {
    nodes: Array.from(result.nodes.entries()).map(([id, pos]) => ({ id, ...pos })),
    plates: result.plates,
  };
}
