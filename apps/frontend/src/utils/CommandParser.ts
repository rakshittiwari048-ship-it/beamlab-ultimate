import type { Node, Member } from '../store/model';

/**
 * Action types that can be parsed from script and applied to model
 */
export type CommandAction = 
  | { type: 'ADD_NODE'; id: string; x: number; y: number; z: number }
  | { type: 'ADD_MEMBER'; id: string; startNodeId: string; endNodeId: string; sectionId?: string }
  | { type: 'SET_SECTION'; memberIds: string[]; sectionId: string }
  | { type: 'COMMENT'; text: string };

export interface ParseResult {
  actions: CommandAction[];
  errors: string[];
}

/**
 * Regex patterns for command parsing
 */
const patterns = {
  // JOINT COORDINATES <id> <x> <y> <z>
  jointCoordinates: /JOINT\s+COORDINATES\s+(\S+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)/i,
  
  // MEMBER INCIDENCES <id> <start> <end>
  memberIncidences: /MEMBER\s+INCIDENCES\s+(\S+)\s+(\S+)\s+(\S+)/i,
  
  // MEMBER PROPERTY AMERICAN <ids> TABLE ST <section_name>
  // Flexible: can be comma/space-separated ids, and section name can have spaces
  memberPropertyAmerican: /MEMBER\s+PROPERTY\s+AMERICAN\s+(.+?)\s+TABLE\s+ST\s+(.+?)(?:\s*$|;)/i,
  
  // Comment lines (starting with ; or #)
  comment: /^\s*[;#](.*)/,
  
  // Blank line
  blank: /^\s*$/,
};

/**
 * Parse command script and return actions
 */
export function parse(script: string): ParseResult {
  const lines = script.split('\n');
  const actions: CommandAction[] = [];
  const errors: string[] = [];

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum].trim();

    if (!line || patterns.blank.test(line)) {
      continue;
    }

    // Check for comment
    const commentMatch = patterns.comment.exec(line);
    if (commentMatch) {
      actions.push({ type: 'COMMENT', text: commentMatch[1].trim() });
      continue;
    }

    // Check for JOINT COORDINATES
    const jcMatch = patterns.jointCoordinates.exec(line);
    if (jcMatch) {
      try {
        const id = jcMatch[1].trim();
        const x = parseFloat(jcMatch[2]);
        const y = parseFloat(jcMatch[3]);
        const z = parseFloat(jcMatch[4]);

        if (isNaN(x) || isNaN(y) || isNaN(z)) {
          errors.push(`Line ${lineNum + 1}: Invalid coordinate values`);
          continue;
        }

        actions.push({ type: 'ADD_NODE', id, x, y, z });
      } catch (e) {
        errors.push(`Line ${lineNum + 1}: Failed to parse JOINT COORDINATES: ${e}`);
      }
      continue;
    }

    // Check for MEMBER INCIDENCES
    const miMatch = patterns.memberIncidences.exec(line);
    if (miMatch) {
      try {
        const id = miMatch[1].trim();
        const startNodeId = miMatch[2].trim();
        const endNodeId = miMatch[3].trim();

        if (!id || !startNodeId || !endNodeId) {
          errors.push(`Line ${lineNum + 1}: Missing member or node IDs`);
          continue;
        }

        actions.push({ type: 'ADD_MEMBER', id, startNodeId, endNodeId });
      } catch (e) {
        errors.push(`Line ${lineNum + 1}: Failed to parse MEMBER INCIDENCES: ${e}`);
      }
      continue;
    }

    // Check for MEMBER PROPERTY AMERICAN
    const mpaMatch = patterns.memberPropertyAmerican.exec(line);
    if (mpaMatch) {
      try {
        const idsStr = mpaMatch[1].trim();
        const sectionName = mpaMatch[2].trim();

        if (!idsStr || !sectionName) {
          errors.push(`Line ${lineNum + 1}: Missing member IDs or section name`);
          continue;
        }

        // Parse comma or space-separated member IDs
        const memberIds = idsStr
          .split(/[,\s]+/)
          .map((id) => id.trim())
          .filter((id) => id.length > 0);

        if (memberIds.length === 0) {
          errors.push(`Line ${lineNum + 1}: No valid member IDs found`);
          continue;
        }

        // Map section name to sectionId (e.g., "W12x26" -> "W12x26")
        const sectionId = sectionName;

        actions.push({ type: 'SET_SECTION', memberIds, sectionId });
      } catch (e) {
        errors.push(`Line ${lineNum + 1}: Failed to parse MEMBER PROPERTY AMERICAN: ${e}`);
      }
      continue;
    }

    // Unknown command
    errors.push(`Line ${lineNum + 1}: Unknown or malformed command`);
  }

  return { actions, errors };
}

/**
 * Serialize model state back to text format
 */
export function serialize(model: {
  nodes: Map<string, Node>;
  members: Map<string, Member>;
}): string {
  const lines: string[] = [];

  lines.push('; ============================================================================');
  lines.push('; BEAMLAB MODEL EXPORT');
  lines.push('; Generated from structural model state');
  lines.push('; ============================================================================');
  lines.push('');

  // Export nodes
  if (model.nodes.size > 0) {
    lines.push('; JOINT COORDINATES');
    lines.push('; Format: JOINT COORDINATES <id> <x> <y> <z>');
    lines.push('');
    for (const node of model.nodes.values()) {
      lines.push(`JOINT COORDINATES ${node.id} ${node.x} ${node.y} ${node.z}`);
    }
    lines.push('');
  }

  // Export members
  if (model.members.size > 0) {
    lines.push('; MEMBER INCIDENCES');
    lines.push('; Format: MEMBER INCIDENCES <id> <start_node> <end_node>');
    lines.push('');
    for (const member of model.members.values()) {
      lines.push(
        `MEMBER INCIDENCES ${member.id} ${member.startNodeId} ${member.endNodeId}`
      );
    }
    lines.push('');

    // Export member sections
    lines.push('; MEMBER PROPERTY AMERICAN');
    lines.push('; Format: MEMBER PROPERTY AMERICAN <id1> <id2> ... TABLE ST <section_name>');
    lines.push('');

    // Group members by section
    const sectionMap = new Map<string | undefined, string[]>();
    for (const member of model.members.values()) {
      const section = member.sectionId;
      if (!sectionMap.has(section)) {
        sectionMap.set(section, []);
      }
      sectionMap.get(section)!.push(member.id);
    }

    for (const [section, memberIds] of sectionMap.entries()) {
      const sectionName = section || 'UNKNOWN';
      const idsStr = memberIds.join(' ');
      lines.push(`MEMBER PROPERTY AMERICAN ${idsStr} TABLE ST ${sectionName}`);
    }
  }

  lines.push('');
  lines.push('; END OF MODEL');

  return lines.join('\n');
}
