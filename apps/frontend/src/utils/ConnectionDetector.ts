/**
 * ConnectionDetector.ts
 * 
 * Automated connection detection utility per IS 1893 and IS 875
 * 
 * Identifies structural connection types by analyzing member orientations
 * and connectivity at nodes:
 * - Beam-Column Connection: Vertical + Horizontal members meet
 * - Splice: Colinear members (same direction) at a node
 * - Base Plate: Column connects to fixed support
 */

/**
 * Member orientation type
 */
export type MemberOrientation = 'VERTICAL' | 'HORIZONTAL' | 'INCLINED';

/**
 * Connection type at a node
 */
export type ConnectionType = 'BEAM_COLUMN' | 'SPLICE' | 'BASE_PLATE' | 'GENERIC' | 'NONE';

/**
 * Member information for connection analysis
 */
export interface Member {
  id: string;
  startNodeId: string;
  endNodeId: string;
  startX: number;
  startY: number;
  startZ: number;
  endX: number;
  endY: number;
  endZ: number;
}

/**
 * Node information
 */
export interface Node {
  id: string;
  x: number;
  y: number;
  z: number;
  support?: {
    fixed?: boolean;
    pinned?: boolean;
  };
}

/**
 * Connection detection result
 */
export interface ConnectionDetectionResult {
  nodeId: string;
  connectionType: ConnectionType;
  members: string[]; // IDs of connected members
  details: {
    orientations: MemberOrientation[];
    isSupported: boolean;
    angle?: number; // Angle between members (degrees)
  };
}

/**
 * Tolerance for geometric comparisons (mm)
 */
const TOLERANCE = 0.01;

/**
 * Tolerance for colinearity check (degrees)
 */
const COLINEARITY_TOLERANCE = 2.0;

/**
 * Determine member orientation based on start and end points
 * 
 * @param member Member with coordinates
 * @returns Orientation: VERTICAL (dy >> dx,dz), HORIZONTAL (dx >> dy or dz >> dy), INCLINED
 */
function getMemberOrientation(member: Member): MemberOrientation {
  const dx = Math.abs(member.endX - member.startX);
  const dy = Math.abs(member.endY - member.startY);
  const dz = Math.abs(member.endZ - member.startZ);

  // Vertical member: significant Y change, minimal X and Z
  if (dy > Math.max(dx, dz) * 2) {
    return 'VERTICAL';
  }

  // Horizontal member: significant X or Z change, minimal Y
  if ((dx > dy * 2 || dz > dy * 2) && dy < Math.max(dx, dz) * 0.5) {
    return 'HORIZONTAL';
  }

  // Inclined member
  return 'INCLINED';
}

/**
 * Calculate 3D direction vector of a member
 * 
 * @param member Member with coordinates
 * @returns Normalized direction vector [x, y, z]
 */
function getMemberDirection(member: Member): [number, number, number] {
  const dx = member.endX - member.startX;
  const dy = member.endY - member.startY;
  const dz = member.endZ - member.startZ;

  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (length < TOLERANCE) return [0, 0, 0];

  return [dx / length, dy / length, dz / length];
}

/**
 * Calculate angle between two direction vectors (degrees)
 * 
 * @param dir1 Direction vector 1
 * @param dir2 Direction vector 2
 * @returns Angle in degrees (0-180)
 */
function getAngleBetweenVectors(
  dir1: [number, number, number],
  dir2: [number, number, number]
): number {
  const dotProduct = dir1[0] * dir2[0] + dir1[1] * dir2[1] + dir1[2] * dir2[2];
  const clipped = Math.max(-1, Math.min(1, dotProduct));
  return (Math.acos(clipped) * 180) / Math.PI;
}

/**
 * Check if two members are colinear (same or opposite direction)
 * 
 * @param member1 First member
 * @param member2 Second member
 * @returns True if members are colinear
 */
function areColinear(member1: Member, member2: Member): boolean {
  const dir1 = getMemberDirection(member1);
  const dir2 = getMemberDirection(member2);

  if (dir1[0] === 0 && dir1[1] === 0 && dir1[2] === 0) return false;
  if (dir2[0] === 0 && dir2[1] === 0 && dir2[2] === 0) return false;

  const angle = getAngleBetweenVectors(dir1, dir2);
  // Colinear if angle ≈ 0° or ≈ 180°
  return angle < COLINEARITY_TOLERANCE || angle > 180 - COLINEARITY_TOLERANCE;
}

/**
 * Detect connections at a node
 * 
 * @param nodeId Node ID to analyze
 * @param nodes Map of all nodes
 * @param members Array of all members
 * @returns Connection detection result
 */
export function detectConnectionAtNode(
  nodeId: string,
  nodes: Map<string, Node>,
  members: Member[]
): ConnectionDetectionResult {
  const node = nodes.get(nodeId);
  if (!node) {
    return {
      nodeId,
      connectionType: 'NONE',
      members: [],
      details: { orientations: [], isSupported: false },
    };
  }

  // Find all members connected to this node
  const connectedMembers = members.filter(
    (m) =>
      (Math.abs(m.startX - node.x) < TOLERANCE &&
        Math.abs(m.startY - node.y) < TOLERANCE &&
        Math.abs(m.startZ - node.z) < TOLERANCE) ||
      (Math.abs(m.endX - node.x) < TOLERANCE &&
        Math.abs(m.endY - node.y) < TOLERANCE &&
        Math.abs(m.endZ - node.z) < TOLERANCE)
  );

  // No connection if fewer than 2 members
  if (connectedMembers.length < 2) {
    const isSupported = (node.support?.fixed ?? false) || (node.support?.pinned ?? false);
    return {
      nodeId,
      connectionType: isSupported && connectedMembers.length === 1 ? 'BASE_PLATE' : 'NONE',
      members: connectedMembers.map((m) => m.id),
      details: {
        orientations: connectedMembers.map(getMemberOrientation),
        isSupported,
      },
    };
  }

  const orientations = connectedMembers.map(getMemberOrientation);
  const isSupported = (node.support?.fixed ?? false) || (node.support?.pinned ?? false);

  // Analyze connection type based on member configuration
  let connectionType: ConnectionType = 'GENERIC';
  let angle: number | undefined;

  // Check for Beam-Column Connection
  // Condition: One vertical + one or more horizontal members
  const hasVertical = orientations.includes('VERTICAL');
  const hasHorizontal = orientations.includes('HORIZONTAL');

  if (hasVertical && hasHorizontal && connectedMembers.length === 2) {
    connectionType = 'BEAM_COLUMN';
    const verticalMember = connectedMembers[orientations.indexOf('VERTICAL')];
    const horizontalMember = connectedMembers[orientations.indexOf('HORIZONTAL')];
    angle = getAngleBetweenVectors(
      getMemberDirection(verticalMember),
      getMemberDirection(horizontalMember)
    );
  }

  // Check for Splice
  // Condition: Two colinear members at the same node
  if (connectedMembers.length === 2 && areColinear(connectedMembers[0], connectedMembers[1])) {
    connectionType = 'SPLICE';
    angle = getAngleBetweenVectors(
      getMemberDirection(connectedMembers[0]),
      getMemberDirection(connectedMembers[1])
    );
  }

  // Check for Base Plate
  // Condition: Column (vertical) connects to support
  if (isSupported && hasVertical && connectedMembers.length === 1) {
    connectionType = 'BASE_PLATE';
  }

  return {
    nodeId,
    connectionType,
    members: connectedMembers.map((m) => m.id),
    details: {
      orientations,
      isSupported,
      angle,
    },
  };
}

/**
 * Detect all connections in a structural model
 * 
 * @param nodes Map of all nodes
 * @param members Array of all members
 * @returns Array of connection detection results for all nodes
 */
export function detectAllConnections(
  nodes: Map<string, Node>,
  members: Member[]
): ConnectionDetectionResult[] {
  const results: ConnectionDetectionResult[] = [];

  for (const [nodeId] of nodes) {
    const result = detectConnectionAtNode(nodeId, nodes, members);
    results.push(result);
  }

  return results;
}

/**
 * Tag nodes with detected connection types
 * 
 * @param nodes Map of all nodes
 * @param members Array of all members
 * @returns Map of nodeId -> connectionType
 */
export function tagNodesWithConnections(
  nodes: Map<string, Node>,
  members: Member[]
): Map<string, ConnectionType> {
  const tagged = new Map<string, ConnectionType>();
  const connections = detectAllConnections(nodes, members);

  for (const conn of connections) {
    tagged.set(conn.nodeId, conn.connectionType);
  }

  return tagged;
}

/**
 * Generate connection detection report
 * 
 * @param results Array of connection detection results
 * @returns Formatted report string
 */
export function generateConnectionReport(results: ConnectionDetectionResult[]): string {
  const grouped = new Map<ConnectionType, ConnectionDetectionResult[]>();

  for (const result of results) {
    if (!grouped.has(result.connectionType)) {
      grouped.set(result.connectionType, []);
    }
    grouped.get(result.connectionType)!.push(result);
  }

  let report = `
Connection Detection Report
===========================

Summary by Type:
`;

  for (const [type, items] of grouped) {
    report += `\n${type}: ${items.length} connection(s)\n`;
    for (const item of items) {
      report += `  • Node ${item.nodeId}: Members [${item.members.join(', ')}]`;
      if (item.details.angle !== undefined) {
        report += ` (Angle: ${item.details.angle.toFixed(1)}°)`;
      }
      if (item.details.isSupported) {
        report += ' [SUPPORTED]';
      }
      report += '\n';
    }
  }

  report += `\nTotal Nodes Analyzed: ${results.length}`;

  return report;
}

/**
 * Get connection statistics
 * 
 * @param results Array of connection detection results
 * @returns Object with counts by connection type
 */
export function getConnectionStatistics(
  results: ConnectionDetectionResult[]
): Record<ConnectionType, number> {
  const stats: Record<ConnectionType, number> = {
    BEAM_COLUMN: 0,
    SPLICE: 0,
    BASE_PLATE: 0,
    GENERIC: 0,
    NONE: 0,
  };

  for (const result of results) {
    stats[result.connectionType]++;
  }

  return stats;
}
