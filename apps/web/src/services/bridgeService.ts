/**
 * Bridge Service - TypeScript to Python Communication Layer
 * 
 * This service acts as a bridge between the TypeScript frontend and Python backend,
 * handling template generation and AI-powered beam design.
 * 
 * API Endpoints:
 * - POST http://localhost:8000/template/{beam|truss|frame} — Factory method for template generation
 * - POST http://localhost:8000/generate/ai — AI-powered beam generation from text prompt
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface TemplateParams {
  span: number;        // Span length in meters
  height?: number;     // Height in meters (for frames)
  bays?: number;       // Number of bays (for trusses)
  loading?: string;    // Load type: 'uniform' | 'point' | 'distributed'
  [key: string]: any;  // Allow additional parameters
}

export interface TemplateResponse {
  nodes: Node[];
  members: Member[];
  metadata?: {
    type: string;
    span: number;
    units: string;
  };
}

export interface Node {
  id: number;
  x: number;
  y: number;
  z: number;
  constraints?: {
    x: boolean;
    y: boolean;
    z: boolean;
    rx: boolean;
    ry: boolean;
    rz: boolean;
  };
}

export interface Member {
  id: number;
  startNode: number;
  endNode: number;
  section?: string;
  material?: string;
}

export interface AIGenerationRequest {
  prompt: string;
  context?: {
    span?: number;
    loading?: string;
    material?: string;
  };
}

export interface AIGenerationResponse {
  template: TemplateResponse;
  reasoning: string;
  confidence: number;
}

export interface BridgeError {
  code: string;
  message: string;
  details?: any;
}

// ============================================================================
// Bridge Service
// ============================================================================

const PYTHON_API = process.env.REACT_APP_PYTHON_API || 'http://localhost:8000';
const TIMEOUT = 30000; // 30 second timeout

class BridgeService {
  /**
   * Spawn a template structure from the Python factory
   * 
   * @param type - Template type: 'beam', 'truss', or 'frame'
   * @param params - Template parameters (span, height, bays, loading, etc.)
   * @returns Template response with nodes and members, or null if error
   * 
   * @example
   * const template = await Bridge.spawnTemplate('beam', { span: 10, loading: 'uniform' });
   * if (template) {
   *   console.log('Nodes:', template.nodes);
   *   console.log('Members:', template.members);
   * }
   */
  async spawnTemplate(
    type: 'beam' | 'truss' | 'frame',
    params: TemplateParams
  ): Promise<TemplateResponse | null> {
    try {
      const url = `${PYTHON_API}/template/${type}`;
      
      console.log(`[Bridge] Spawning ${type} template from ${url}`, params);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-OK response
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[Bridge] Template generation failed (${response.status}):`, errorData);
        return null;
      }

      // Parse and return template
      const template: TemplateResponse = await response.json();
      console.log(`[Bridge] Template generated successfully:`, template);
      return template;

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error(`[Bridge] Template request timed out after ${TIMEOUT}ms`);
        } else {
          console.error('[Bridge] Python Server Offline or Connection Failed:', error.message);
        }
      } else {
        console.error('[Bridge] Unknown error during template generation:', error);
      }
      return null;
    }
  }

  /**
   * Generate a structure from a natural language prompt using AI
   * 
   * @param userText - Natural language description of the structure
   * @param context - Optional context like span, loading, material
   * @returns Generated template with AI reasoning, or null if error
   * 
   * @example
   * const result = await Bridge.generateFromPrompt(
   *   'I need a 15m span steel beam for a warehouse with uniform load',
   *   { span: 15, material: 'steel' }
   * );
   * if (result) {
   *   console.log('Generated template:', result.template);
   *   console.log('AI reasoning:', result.reasoning);
   *   console.log('Confidence:', result.confidence);
   * }
   */
  async generateFromPrompt(
    userText: string,
    context?: {
      span?: number;
      loading?: string;
      material?: string;
    }
  ): Promise<AIGenerationResponse | null> {
    try {
      const url = `${PYTHON_API}/generate/ai`;
      
      const payload: AIGenerationRequest = {
        prompt: userText,
        context,
      };

      console.log(`[Bridge] Generating from prompt at ${url}:`, payload);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-OK response
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[Bridge] AI generation failed (${response.status}):`, errorData);
        return null;
      }

      // Parse and return AI response
      const result: AIGenerationResponse = await response.json();
      console.log(`[Bridge] AI generation successful:`, result);
      return result;

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error(`[Bridge] AI generation request timed out after ${TIMEOUT}ms`);
        } else {
          console.error('[Bridge] AI Service Error:', error.message);
        }
      } else {
        console.error('[Bridge] Unknown error during AI generation:', error);
      }
      return null;
    }
  }

  /**
   * Health check for Python backend
   * 
   * @returns true if backend is reachable, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${PYTHON_API}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get API base URL
   */
  getApiUrl(): string {
    return PYTHON_API;
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

/**
 * Singleton instance of BridgeService
 * 
 * @example
 * import { Bridge } from '@/services/bridgeService';
 * 
 * // Spawn a template
 * const template = await Bridge.spawnTemplate('beam', { span: 10 });
 * 
 * // Generate from prompt
 * const result = await Bridge.generateFromPrompt('15m steel beam warehouse');
 */
export const Bridge = new BridgeService();

export default BridgeService;
