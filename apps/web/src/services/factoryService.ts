/**
 * factoryService.ts
 *
 * Service for communicating with the Python FastAPI Backend
 * Handles template generation and AI-based model generation
 *
 * API Base: http://localhost:8001 (Python FastAPI server)
 */

const API_URL = 'http://localhost:8001';

// ============================================================================
// Types
// ============================================================================

export interface FactoryNode {
  id: string;
  x: number;
  y: number;
  z: number;
}

export interface FactoryMember {
  id: string;
  startNodeId: string;
  endNodeId: string;
  section?: string;
  type?: string;
}

export interface FactorySection {
  name: string;
  area: number;
  Ixx: number;
  Iyy: number;
}

export interface StructuralModel {
  id: string;
  nodes: FactoryNode[];
  members: FactoryMember[];
}

export interface TemplateParams {
  span?: number;
  width?: number;
  height?: number;
  roof_angle?: number;
  bays?: number;
  supports?: string;
  section?: string;
  [key: string]: any;
}

export interface FetchTemplateResponse {
  success: boolean;
  model?: StructuralModel;
  error?: string;
}

export interface GenerateFromAIResponse {
  success: boolean;
  model?: StructuralModel;
  error?: string;
  rawResponse?: string;
}

// ============================================================================
// API Error Handling
// ============================================================================

class FactoryServiceError extends Error {
  constructor(
    public status: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'FactoryServiceError';
  }
}

// ============================================================================
// Factory Service
// ============================================================================

/**
 * Fetches a template from the Python backend
 * @param type - Template type: 'beam', 'frame', 'truss'
 * @param params - Parameters for template generation
 * @returns Promise with nodes and members
 */
export async function fetchTemplate(
  type: string,
  params: TemplateParams
): Promise<FetchTemplateResponse> {
  try {
    const requestBody = {
      type,
      ...params,
    };

    console.log('[FactoryService] Fetching template:', { type, params });

    const response = await fetch(`${API_URL}/generate/template`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[FactoryService] API Error:', errorText);
      throw new FactoryServiceError(
        response.status,
        `Failed to fetch template: ${response.statusText}`,
        errorText
      );
    }

    const model: StructuralModel = await response.json();
    console.log('[FactoryService] Template fetched successfully:', model);

    return {
      success: true,
      model,
    };
  } catch (error) {
    const message =
      error instanceof FactoryServiceError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Unknown error occurred';

    console.error('[FactoryService] Error fetching template:', message);

    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Generates a model from natural language AI prompt
 * @param prompt - Natural language description of the structure
 * @returns Promise with nodes and members
 */
export async function generateFromAI(prompt: string): Promise<GenerateFromAIResponse> {
  try {
    console.log('[FactoryService] Generating from AI prompt:', prompt);

    const response = await fetch(`${API_URL}/generate/ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[FactoryService] AI Generation Error:', errorText);
      throw new FactoryServiceError(
        response.status,
        `AI generation failed: ${response.statusText}`,
        errorText
      );
    }

    const model: StructuralModel = await response.json();
    console.log('[FactoryService] AI generation successful:', model);

    return {
      success: true,
      model,
    };
  } catch (error) {
    const message =
      error instanceof FactoryServiceError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Unknown error occurred';

    console.error('[FactoryService] Error in AI generation:', message);

    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Fetches available template types and their parameters
 */
export async function getAvailableTemplates() {
  try {
    const response = await fetch(`${API_URL}/templates`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new FactoryServiceError(
        response.status,
        `Failed to fetch templates: ${response.statusText}`
      );
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    const message =
      error instanceof FactoryServiceError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Unknown error occurred';

    console.error('[FactoryService] Error fetching templates:', message);
    return { success: false, error: message };
  }
}

/**
 * Fetches available sections
 */
export async function getAvailableSections() {
  try {
    const response = await fetch(`${API_URL}/sections`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new FactoryServiceError(
        response.status,
        `Failed to fetch sections: ${response.statusText}`
      );
    }

    const data: FactorySection[] = await response.json();
    return { success: true, data };
  } catch (error) {
    const message =
      error instanceof FactoryServiceError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Unknown error occurred';

    console.error('[FactoryService] Error fetching sections:', message);
    return { success: false, error: message };
  }
}

/**
 * Health check for the Python backend
 */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new FactoryServiceError(
        response.status,
        `Backend health check failed: ${response.statusText}`
      );
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    const message =
      error instanceof FactoryServiceError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Unknown error occurred';

    console.error('[FactoryService] Backend health check failed:', message);
    return { success: false, error: message };
  }
}
