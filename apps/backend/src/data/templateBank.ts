export type TemplateSupportType = 'FIXED' | 'PINNED' | 'ROLLER' | 'FREE';

export interface TemplateNode {
  id: string;
  x: number;
  y: number;
  z: number;
  support?: TemplateSupportType;
}

export interface TemplateMember {
  id: string;
  startNode: string;
  endNode: string;
  section?: string;
}

export interface TemplateLoad {
  type: 'UDL' | 'POINT' | 'MOMENT';
  memberId?: string;
  nodeId?: string;
  value: number;
}

export interface TemplateDefinition {
  name: string;
  description?: string;
  category?: string;
  nodes: TemplateNode[];
  members: TemplateMember[];
  loads?: TemplateLoad[];
}

/**
 * TEMPLATE_BANK
 * Core library of starter structural models.
 * Add more as needed (transmission tower, retaining wall, etc.).
 */
export const TEMPLATE_BANK: Record<string, TemplateDefinition> = {
  WAREHOUSE_SIMPLE: {
    name: 'Standard Portal Frame Warehouse',
    category: 'Industrial',
    description: 'Single-bay portal frame with ridge and UDL on rafters',
    nodes: [
      { id: 'n1', x: 0, y: 0, z: 0, support: 'FIXED' },
      { id: 'n2', x: 0, y: 6, z: 0 },
      { id: 'n3', x: 10, y: 8, z: 0 },
      { id: 'n4', x: 20, y: 6, z: 0 },
      { id: 'n5', x: 20, y: 0, z: 0, support: 'FIXED' },
    ],
    members: [
      { id: 'm1', startNode: 'n1', endNode: 'n2', section: 'ISMB400' },
      { id: 'm2', startNode: 'n2', endNode: 'n3', section: 'ISMB300' },
      { id: 'm3', startNode: 'n3', endNode: 'n4', section: 'ISMB300' },
      { id: 'm4', startNode: 'n4', endNode: 'n5', section: 'ISMB400' },
    ],
    loads: [
      { type: 'UDL', memberId: 'm2', value: -5 },
      { type: 'UDL', memberId: 'm3', value: -5 },
    ],
  },
  G_PLUS_3_FRAME: {
    name: 'G+3 Moment Frame (4 stories)',
    category: 'Building',
    description: 'Regular 2-bay moment frame, 4 stories, 3.3m story height',
    nodes: (() => {
      const nodes: TemplateNode[] = [];
      const bays = 2;
      const bayWidth = 6;
      const stories = 4;
      const storyHeight = 3.3;
      let id = 1;
      for (let level = 0; level <= stories; level++) {
        for (let bay = 0; bay <= bays; bay++) {
          nodes.push({
            id: `n${id++}`,
            x: bay * bayWidth,
            y: level * storyHeight,
            z: 0,
            support: level === 0 ? 'FIXED' : undefined,
          });
        }
      }
      return nodes;
    })(),
    members: (() => {
      const members: TemplateMember[] = [];
      const bays = 2;
      const stories = 4;
      const nodeFor = (bay: number, level: number) => bay + level * (bays + 1) + 1; // 1-based ids
      let id = 1;
      // Columns
      for (let level = 0; level < stories; level++) {
        for (let bay = 0; bay <= bays; bay++) {
          const nStart = nodeFor(bay, level);
          const nEnd = nodeFor(bay, level + 1);
          members.push({ id: `m${id++}`, startNode: `n${nStart}`, endNode: `n${nEnd}`, section: 'ISMB300' });
        }
      }
      // Beams
      for (let level = 1; level <= stories; level++) {
        for (let bay = 0; bay < bays; bay++) {
          const nStart = nodeFor(bay, level);
          const nEnd = nodeFor(bay + 1, level);
          members.push({ id: `m${id++}`, startNode: `n${nStart}`, endNode: `n${nEnd}`, section: 'ISMB350' });
        }
      }
      return members;
    })(),
    loads: [],
  },
  TRUSS_20M: {
    name: '20m Pratt Roof Truss',
    category: 'Industrial',
    description: 'Steel Pratt truss, 20m span, 4m height, nodes at 2.5m spacing',
    nodes: (() => {
      const nodes: TemplateNode[] = [];
      const panel = 2.5;
      const height = 4;
      let id = 1;
      for (let i = 0; i <= 8; i++) {
        nodes.push({ id: `n${id++}`, x: i * panel, y: 0, z: 0, support: i === 0 ? 'PINNED' : i === 8 ? 'ROLLER' : undefined });
      }
      // Top chord
      nodes.push({ id: `n${id++}`, x: 2.5, y: height, z: 0 });
      nodes.push({ id: `n${id++}`, x: 7.5, y: height, z: 0 });
      nodes.push({ id: `n${id++}`, x: 12.5, y: height, z: 0 });
      nodes.push({ id: `n${id++}`, x: 17.5, y: height, z: 0 });
      return nodes;
    })(),
    members: (() => {
      const m: TemplateMember[] = [];
      let id = 1;
      const b = (s: number, e: number) => m.push({ id: `m${id++}`, startNode: `n${s}`, endNode: `n${e}`, section: 'ISA75x75x8' });
      // Bottom chord
      for (let i = 1; i <= 8; i++) b(i, i + 1);
      // Top chord
      b(9, 10); b(10, 11); b(11, 12);
      // Verticals/Diagonals (Pratt)
      b(1, 9); b(2, 9); b(3, 10); b(4, 10); b(5, 11); b(6, 11); b(7, 12); b(8, 12);
      b(2, 10); b(4, 11); b(6, 12);
      return m;
    })(),
    loads: [
      { type: 'UDL', memberId: 'm2', value: -4 },
      { type: 'UDL', memberId: 'm3', value: -4 },
      { type: 'UDL', memberId: 'm4', value: -4 },
    ],
  },
};

export function listTemplates() {
  return Object.entries(TEMPLATE_BANK).map(([id, t]) => ({
    id,
    name: t.name,
    category: t.category,
    description: t.description,
    nodeCount: t.nodes.length,
    memberCount: t.members.length,
  }));
}

export function getTemplate(id: string) {
  return TEMPLATE_BANK[id] || null;
}
