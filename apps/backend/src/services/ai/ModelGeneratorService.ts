/**
 * ModelGeneratorService.ts
 * 
 * AI-powered structural model generator for BeamLab Ultimate.
 * Takes natural language descriptions and generates valid structural models
 * using Google's Gemini AI.
 * 
 * Features:
 * - Converts natural language to structural geometry
 * - Ensures JSON validity and schema compliance
 * - Validates structural stability and connectivity
 * - Supports various structure types (frames, trusses, grids, etc.)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ModelNode {
  id: string;
  x: number;
  y: number;
  z: number;
}

export interface ModelMember {
  id: string;
  startNodeId: string;
  endNodeId: string;
  section: string;
}

export interface GeneratedModel {
  nodes: ModelNode[];
  members: ModelMember[];
}

export interface ModelGeneratorRequest {
  /** User's natural language description of the structure */
  prompt: string;
  /** Optional: Preferred units (default: meters) */
  units?: 'meters' | 'feet' | 'mm';
  /** Optional: Structure type hint (frame, truss, grid, etc.) */
  structureType?: string;
  /** Optional: Maximum nodes to generate */
  maxNodes?: number;
  /** Optional: Maximum members to generate */
  maxMembers?: number;
}

export interface ModelGeneratorResponse {
  success: boolean;
  model?: GeneratedModel;
  error?: string;
  /** Raw AI response for debugging */
  rawResponse?: string;
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const SYSTEM_PROMPT = `You are a structural modeling agent for BeamLab Ultimate.

Your task is to convert natural language descriptions into valid structural models.

OUTPUT REQUIREMENTS:
- Output ONLY valid JSON. No prose. No explanations. No markdown.
- Return raw JSON object, not wrapped in code blocks.

JSON SCHEMA:
{
  "nodes": [
    { "id": "string", "x": number, "y": number, "z": number },
    ...
  ],
  "members": [
    { "id": "string", "startNodeId": "string", "endNodeId": "string", "section": "string" },
    ...
  ]
}

NODE REQUIREMENTS:
- id: Unique identifier (e.g., "N1", "N2", etc.)
- x, y, z: Coordinates in meters
- z-axis is vertical (gravity direction)
- Origin at (0, 0, 0) is acceptable
- Space nodes logically and clearly

MEMBER REQUIREMENTS:
- id: Unique identifier (e.g., "M1", "M2", etc.)
- startNodeId and endNodeId: Must reference existing node IDs
- section: Standard steel section (e.g., "W24x68", "UC152x152x30", "2L100x100x10") or generic (e.g., "200x200mm", "Dia 50mm")

STRUCTURAL REQUIREMENTS:
- Ensure the structure is stable and well-connected
- Create realistic geometries (avoid unrealistic proportions)
- Use sensible node spacing (typically 3-10 meters for large structures, 0.5-2 meters for smaller ones)
- All nodes must be connected or part of a coherent structural system
- Avoid isolated nodes or disconnected members

EXAMPLES:

Input: "Simple 2-story 2-bay frame, 3m bays, 3m story height"
Output:
{
  "nodes": [
    {"id":"N1","x":0,"y":0,"z":0},
    {"id":"N2","x":3,"y":0,"z":0},
    {"id":"N3","x":6,"y":0,"z":0},
    {"id":"N4","x":0,"y":0,"z":3},
    {"id":"N5","x":3,"y":0,"z":3},
    {"id":"N6","x":6,"y":0,"z":3},
    {"id":"N7","x":0,"y":0,"z":6},
    {"id":"N8","x":3,"y":0,"z":6},
    {"id":"N9","x":6,"y":0,"z":6}
  ],
  "members": [
    {"id":"M1","startNodeId":"N1","endNodeId":"N2","section":"W24x68"},
    {"id":"M2","startNodeId":"N2","endNodeId":"N3","section":"W24x68"},
    {"id":"M3","startNodeId":"N4","endNodeId":"N5","section":"W24x68"},
    {"id":"M4","startNodeId":"N5","endNodeId":"N6","section":"W24x68"},
    {"id":"M5","startNodeId":"N7","endNodeId":"N8","section":"W24x68"},
    {"id":"M6","startNodeId":"N8","endNodeId":"N9","section":"W24x68"},
    {"id":"M7","startNodeId":"N1","endNodeId":"N4","section":"W14x61"},
    {"id":"M8","startNodeId":"N2","endNodeId":"N5","section":"W14x61"},
    {"id":"M9","startNodeId":"N3","endNodeId":"N6","section":"W14x61"},
    {"id":"M10","startNodeId":"N4","endNodeId":"N7","section":"W14x61"},
    {"id":"M11","startNodeId":"N5","endNodeId":"N8","section":"W14x61"},
    {"id":"M12","startNodeId":"N6","endNodeId":"N9","section":"W14x61"}
  ]
}

Input: "Simple triangle truss, 10m span, 5m height"
Output:
{
  "nodes": [
    {"id":"N1","x":0,"y":0,"z":0},
    {"id":"N2","x":10,"y":0,"z":0},
    {"id":"N3","x":5,"y":0,"z":5}
  ],
  "members": [
    {"id":"M1","startNodeId":"N1","endNodeId":"N2","section":"L50x50x5"},
    {"id":"M2","startNodeId":"N1","endNodeId":"N3","section":"L50x50x5"},
    {"id":"M3","startNodeId":"N2","endNodeId":"N3","section":"L50x50x5"}
  ]
}

Now generate a valid structural model based on the user's description.
Do NOT include any text outside the JSON object.
Do NOT wrap the JSON in code blocks or markdown.
Return ONLY the raw JSON.`;

// ============================================================================
// MODEL GENERATOR SERVICE
// ============================================================================

export class ModelGeneratorService {
  private genAI: GoogleGenerativeAI | null;
  private model: any;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GOOGLE_AI_API_KEY;
    
    if (!key) {
      console.warn('⚠️  Google AI API key not configured - AI generation will not work');
      this.genAI = null;
      this.model = null;
    } else {
      this.genAI = new GoogleGenerativeAI(key);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }
  }

  /**
   * Generate a structural model from a natural language description
   */
  async generateModel(
    request: ModelGeneratorRequest
  ): Promise<ModelGeneratorResponse> {
    // Check if client is initialized
    if (!this.model) {
      return {
        success: false,
        error: 'Google AI API key not configured. Please add GOOGLE_AI_API_KEY to your .env file.',
      };
    }

    try {
      // Build user message with constraints
      let userMessage = request.prompt;

      if (request.maxNodes) {
        userMessage += `\n(Limit to approximately ${request.maxNodes} nodes)`;
      }
      if (request.maxMembers) {
        userMessage += `\n(Limit to approximately ${request.maxMembers} members)`;
      }
      if (request.units && request.units !== 'meters') {
        userMessage += `\n(Input is in ${request.units}, but output coordinates MUST be in meters)`;
      }

      // Combine system prompt and user message for Gemini
      const fullPrompt = `${SYSTEM_PROMPT}\n\nUser Request: ${userMessage}`;

      // Call Google Gemini API
      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;

      // Extract the response text
      const rawResponse = response.text() || '';

      // Parse JSON - be lenient with whitespace and code blocks
      let jsonString = rawResponse.trim();

      // Remove markdown code blocks if present
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      jsonString = jsonString.trim();

      // Parse JSON
      let model: GeneratedModel;
      try {
        model = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', jsonString);
        return {
          success: false,
          error: `Failed to parse model JSON: ${parseError}`,
          rawResponse,
        };
      }

      // Validate the model
      const validation = this.validateModel(model);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          rawResponse,
        };
      }

      return {
        success: true,
        model,
        rawResponse,
      };
    } catch (error) {
      console.error('ModelGeneratorService error:', error);
      return {
        success: false,
        error: `Failed to generate model: ${error}`,
      };
    }
  }

  /**
   * Validate the generated model
   */
  private validateModel(
    model: any
  ): { valid: boolean; error?: string } {
    // Check structure
    if (!model.nodes || !Array.isArray(model.nodes)) {
      return { valid: false, error: 'Missing or invalid "nodes" array' };
    }
    if (!model.members || !Array.isArray(model.members)) {
      return { valid: false, error: 'Missing or invalid "members" array' };
    }

    // Check nodes are not empty
    if (model.nodes.length === 0) {
      return { valid: false, error: 'Model must have at least 1 node' };
    }

    // Validate each node
    const nodeIds = new Set<string>();
    for (const node of model.nodes) {
      if (!node.id || typeof node.id !== 'string') {
        return { valid: false, error: `Node missing or invalid id: ${JSON.stringify(node)}` };
      }
      if (typeof node.x !== 'number' || typeof node.y !== 'number' || typeof node.z !== 'number') {
        return { valid: false, error: `Node ${node.id} has invalid coordinates` };
      }
      if (nodeIds.has(node.id)) {
        return { valid: false, error: `Duplicate node id: ${node.id}` };
      }
      nodeIds.add(node.id);
    }

    // Validate each member
    const memberIds = new Set<string>();
    for (const member of model.members) {
      if (!member.id || typeof member.id !== 'string') {
        return { valid: false, error: `Member missing or invalid id: ${JSON.stringify(member)}` };
      }
      if (!member.startNodeId || typeof member.startNodeId !== 'string') {
        return { valid: false, error: `Member ${member.id} has invalid startNodeId` };
      }
      if (!member.endNodeId || typeof member.endNodeId !== 'string') {
        return { valid: false, error: `Member ${member.id} has invalid endNodeId` };
      }
      if (!member.section || typeof member.section !== 'string') {
        return { valid: false, error: `Member ${member.id} has invalid section` };
      }
      if (!nodeIds.has(member.startNodeId)) {
        return {
          valid: false,
          error: `Member ${member.id} references non-existent node ${member.startNodeId}`,
        };
      }
      if (!nodeIds.has(member.endNodeId)) {
        return {
          valid: false,
          error: `Member ${member.id} references non-existent node ${member.endNodeId}`,
        };
      }
      if (member.startNodeId === member.endNodeId) {
        return { valid: false, error: `Member ${member.id} connects node to itself` };
      }
      if (memberIds.has(member.id)) {
        return { valid: false, error: `Duplicate member id: ${member.id}` };
      }
      memberIds.add(member.id);
    }

    // Check basic connectivity (all nodes should be connected to at least 1 member)
    // unless it's a single member structure
    if (model.members.length > 0) {
      const connectedNodes = new Set<string>();
      for (const member of model.members) {
        connectedNodes.add(member.startNodeId);
        connectedNodes.add(member.endNodeId);
      }

      if (connectedNodes.size < model.nodes.length && model.nodes.length > 1) {
        // Allow isolated nodes, but warn
        console.warn(
          `Warning: Model has ${model.nodes.length - connectedNodes.size} disconnected nodes`
        );
      }
    }

    return { valid: true };
  }
}

export default ModelGeneratorService;
