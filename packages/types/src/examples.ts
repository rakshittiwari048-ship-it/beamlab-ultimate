import type { StructuralModel, Node, Element, LoadCase, Material, Section } from './index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Example: Simple Supported Beam with Point Load
 * 
 * This example creates a simply supported beam (5m span) with:
 * - Fixed support at left end
 * - Roller support at right end
 * - Point load of 10kN at midspan
 */

export function createSimpleBeamExample(): StructuralModel {
  // Materials
  const steel: Material = {
    id: uuidv4(),
    name: 'Steel S275',
    elasticModulus: 210e9, // 210 GPa
    shearModulus: 81e9,
    poissonRatio: 0.3,
    density: 7850, // kg/m³
    yieldStrength: 275e6,
    ultimateStrength: 430e6,
  };

  // Sections
  const section: Section = {
    id: uuidv4(),
    name: 'IPE 300',
    type: 'i-beam',
    properties: {
      area: 5.38e-3, // m²
      momentOfInertiaY: 8.36e-5, // m⁴
      momentOfInertiaZ: 6.04e-7,
      torsionalConstant: 2.01e-8,
      sectionModulusY: 5.57e-4,
      sectionModulusZ: 8.49e-5,
    },
  };

  // Nodes
  const node1: Node = {
    id: uuidv4(),
    position: { x: 0, y: 0, z: 0 },
    constraints: {
      x: false,
      y: false,
      z: false,
      rx: false,
      ry: false,
      rz: false,
    },
    label: 'Node 1 (Left Support)',
  };

  const node2: Node = {
    id: uuidv4(),
    position: { x: 2.5, y: 0, z: 0 },
    constraints: {
      x: false,
      y: false,
      z: false,
      rx: false,
      ry: false,
      rz: false,
    },
    label: 'Node 2 (Midspan)',
  };

  const node3: Node = {
    id: uuidv4(),
    position: { x: 5, y: 0, z: 0 },
    constraints: {
      x: false,
      y: false,
      z: false,
      rx: false,
      ry: false,
      rz: false,
    },
    label: 'Node 3 (Right Support)',
  };

  // Elements
  const beam1: Element = {
    id: uuidv4(),
    type: 'beam',
    startNodeId: node1.id,
    endNodeId: node2.id,
    materialId: steel.id,
    sectionId: section.id,
    label: 'Beam 1-2',
  };

  const beam2: Element = {
    id: uuidv4(),
    type: 'beam',
    startNodeId: node2.id,
    endNodeId: node3.id,
    materialId: steel.id,
    sectionId: section.id,
    label: 'Beam 2-3',
  };

  // Load Case
  const deadLoad: LoadCase = {
    id: uuidv4(),
    name: 'Dead Load',
    description: '10kN point load at midspan',
    loads: [
      {
        id: uuidv4(),
        type: 'point',
        nodeId: node2.id,
        force: { x: 0, y: -10000, z: 0 }, // -10kN downward
      },
    ],
  };

  // Model
  const model: StructuralModel = {
    id: uuidv4(),
    name: 'Simple Beam Example',
    description: 'Simply supported beam with point load at midspan',
    unitSystem: 'metric',
    nodes: [node1, node2, node3],
    elements: [beam1, beam2],
    supports: [
      {
        nodeId: node1.id,
        type: 'pinned', // Pinned support at left
      },
      {
        nodeId: node3.id,
        type: 'roller', // Roller support at right
      },
    ],
    materials: [steel],
    sections: [section],
    loadCases: [deadLoad],
    loadCombinations: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return model;
}

/**
 * Example: 2D Frame Structure
 * 
 * This creates a simple portal frame:
 *     4---5
 *     |   |
 *     1   2
 *     |   |
 * (0) 0---3 (6)
 */

export function createPortalFrameExample(): StructuralModel {
  const steel: Material = {
    id: uuidv4(),
    name: 'Steel S355',
    elasticModulus: 210e9,
    shearModulus: 81e9,
    poissonRatio: 0.3,
    density: 7850,
    yieldStrength: 355e6,
    ultimateStrength: 510e6,
  };

  const columnSection: Section = {
    id: uuidv4(),
    name: 'HEB 300',
    type: 'i-beam',
    properties: {
      area: 1.49e-2,
      momentOfInertiaY: 2.52e-4,
      momentOfInertiaZ: 8.56e-5,
      torsionalConstant: 1.04e-6,
    },
  };

  const beamSection: Section = {
    id: uuidv4(),
    name: 'IPE 400',
    type: 'i-beam',
    properties: {
      area: 8.45e-3,
      momentOfInertiaY: 2.31e-4,
      momentOfInertiaZ: 1.32e-6,
      torsionalConstant: 5.10e-8,
    },
  };

  // Nodes
  const nodes: Node[] = [
    { id: uuidv4(), position: { x: 0, y: 0, z: 0 }, constraints: { x: false, y: false, z: false, rx: false, ry: false, rz: false }, label: 'Base Left' },
    { id: uuidv4(), position: { x: 0, y: 4, z: 0 }, constraints: { x: false, y: false, z: false, rx: false, ry: false, rz: false }, label: 'Top Left' },
    { id: uuidv4(), position: { x: 0, y: 8, z: 0 }, constraints: { x: false, y: false, z: false, rx: false, ry: false, rz: false }, label: 'Eave Left' },
    { id: uuidv4(), position: { x: 8, y: 0, z: 0 }, constraints: { x: false, y: false, z: false, rx: false, ry: false, rz: false }, label: 'Base Right' },
    { id: uuidv4(), position: { x: 8, y: 4, z: 0 }, constraints: { x: false, y: false, z: false, rx: false, ry: false, rz: false }, label: 'Top Right' },
    { id: uuidv4(), position: { x: 8, y: 8, z: 0 }, constraints: { x: false, y: false, z: false, rx: false, ry: false, rz: false }, label: 'Eave Right' },
  ];

  // Elements
  const elements: Element[] = [
    { id: uuidv4(), type: 'frame', startNodeId: nodes[0].id, endNodeId: nodes[1].id, materialId: steel.id, sectionId: columnSection.id, label: 'Left Column 1' },
    { id: uuidv4(), type: 'frame', startNodeId: nodes[1].id, endNodeId: nodes[2].id, materialId: steel.id, sectionId: columnSection.id, label: 'Left Column 2' },
    { id: uuidv4(), type: 'frame', startNodeId: nodes[3].id, endNodeId: nodes[4].id, materialId: steel.id, sectionId: columnSection.id, label: 'Right Column 1' },
    { id: uuidv4(), type: 'frame', startNodeId: nodes[4].id, endNodeId: nodes[5].id, materialId: steel.id, sectionId: columnSection.id, label: 'Right Column 2' },
    { id: uuidv4(), type: 'frame', startNodeId: nodes[2].id, endNodeId: nodes[5].id, materialId: steel.id, sectionId: beamSection.id, label: 'Roof Beam' },
  ];

  // Load Cases
  const windLoad: LoadCase = {
    id: uuidv4(),
    name: 'Wind Load',
    description: 'Lateral wind load on left column',
    loads: [
      { id: uuidv4(), type: 'point', nodeId: nodes[1].id, force: { x: 5000, y: 0, z: 0 } },
      { id: uuidv4(), type: 'point', nodeId: nodes[2].id, force: { x: 5000, y: 0, z: 0 } },
    ],
  };

  const model: StructuralModel = {
    id: uuidv4(),
    name: 'Portal Frame Example',
    description: 'Simple portal frame with wind load',
    unitSystem: 'metric',
    nodes,
    elements,
    supports: [
      { nodeId: nodes[0].id, type: 'fixed' },
      { nodeId: nodes[3].id, type: 'fixed' },
    ],
    materials: [steel],
    sections: [columnSection, beamSection],
    loadCases: [windLoad],
    loadCombinations: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return model;
}

/**
 * Example: 3D Space Frame (Cantilever)
 */

export function create3DFrameExample(): StructuralModel {
  const steel: Material = {
    id: uuidv4(),
    name: 'Steel S275',
    elasticModulus: 210e9,
    shearModulus: 81e9,
    poissonRatio: 0.3,
    density: 7850,
    yieldStrength: 275e6,
  };

  const section: Section = {
    id: uuidv4(),
    name: 'Square Tube 100x100x5',
    type: 'tube',
    properties: {
      area: 1.89e-3,
      momentOfInertiaY: 6.97e-6,
      momentOfInertiaZ: 6.97e-6,
      torsionalConstant: 1.12e-5,
    },
  };

  const nodes: Node[] = [
    { id: uuidv4(), position: { x: 0, y: 0, z: 0 }, constraints: { x: false, y: false, z: false, rx: false, ry: false, rz: false } },
    { id: uuidv4(), position: { x: 3, y: 0, z: 0 }, constraints: { x: false, y: false, z: false, rx: false, ry: false, rz: false } },
    { id: uuidv4(), position: { x: 3, y: 0, z: 3 }, constraints: { x: false, y: false, z: false, rx: false, ry: false, rz: false } },
    { id: uuidv4(), position: { x: 0, y: 0, z: 3 }, constraints: { x: false, y: false, z: false, rx: false, ry: false, rz: false } },
    { id: uuidv4(), position: { x: 1.5, y: 3, z: 1.5 }, constraints: { x: false, y: false, z: false, rx: false, ry: false, rz: false } },
  ];

  const elements: Element[] = [
    { id: uuidv4(), type: 'frame', startNodeId: nodes[0].id, endNodeId: nodes[4].id, materialId: steel.id, sectionId: section.id },
    { id: uuidv4(), type: 'frame', startNodeId: nodes[1].id, endNodeId: nodes[4].id, materialId: steel.id, sectionId: section.id },
    { id: uuidv4(), type: 'frame', startNodeId: nodes[2].id, endNodeId: nodes[4].id, materialId: steel.id, sectionId: section.id },
    { id: uuidv4(), type: 'frame', startNodeId: nodes[3].id, endNodeId: nodes[4].id, materialId: steel.id, sectionId: section.id },
  ];

  const loadCase: LoadCase = {
    id: uuidv4(),
    name: 'Vertical Load',
    description: 'Point load at apex',
    loads: [
      { id: uuidv4(), type: 'point', nodeId: nodes[4].id, force: { x: 0, y: -20000, z: 0 } },
    ],
  };

  return {
    id: uuidv4(),
    name: '3D Pyramidal Frame',
    unitSystem: 'metric',
    nodes,
    elements,
    supports: [
      { nodeId: nodes[0].id, type: 'fixed' },
      { nodeId: nodes[1].id, type: 'fixed' },
      { nodeId: nodes[2].id, type: 'fixed' },
      { nodeId: nodes[3].id, type: 'fixed' },
    ],
    materials: [steel],
    sections: [section],
    loadCases: [loadCase],
    loadCombinations: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
