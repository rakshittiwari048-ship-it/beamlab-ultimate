/**
 * EngineeringCopilotService.ts
 * 
 * AI-powered structural engineering assistant for analyzing design failures
 * and providing actionable fix recommendations based on IS 800, IS 456, and other codes.
 * 
 * Features:
 * - Analyze failed member data and provide specific fixes
 * - Context-aware prompt engineering for structural problems
 * - Support for multiple failure modes (buckling, flexure, shear, etc.)
 * - Trade-off analysis for each recommendation
 * 
 * Uses Google's Gemini AI for intelligent analysis.
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

// ============================================================================
// INTERFACES
// ============================================================================

export interface FailedMemberData {
  /** Member ID/label */
  memberId: string;
  /** Demand/Capacity ratio */
  ratio: number;
  /** Failure mode description */
  failureMode: string;
  /** Governing code clause */
  clause?: string;
  /** Design code (IS 800, IS 456, AISC, etc.) */
  designCode: string;
  /** Member type */
  memberType: 'column' | 'beam' | 'brace' | 'truss' | 'slab' | 'footing';
  /** Current capacity (kN, kN·m, etc.) */
  capacity?: number;
  /** Current demand (kN, kN·m, etc.) */
  demand?: number;
}

export interface GeometricContext {
  /** Member length (m) */
  length: number;
  /** Current section designation */
  section: string;
  /** Effective length factor Kx */
  Kx?: number;
  /** Effective length factor Ky */
  Ky?: number;
  /** Lateral bracing interval (m) */
  bracingInterval?: number;
  /** End conditions */
  endConditions?: {
    start: 'fixed' | 'pinned' | 'free' | 'roller';
    end: 'fixed' | 'pinned' | 'free' | 'roller';
  };
  /** Material grade */
  materialGrade?: string;
  /** Connected members */
  connectedMembers?: string[];
}

export interface LoadContext {
  /** Axial force (kN) */
  axialForce?: number;
  /** Major axis moment (kN·m) */
  momentMajor?: number;
  /** Minor axis moment (kN·m) */
  momentMinor?: number;
  /** Shear force (kN) */
  shearForce?: number;
  /** Load combination */
  loadCombination?: string;
  /** Is seismic load present? */
  isSeismic?: boolean;
}

export interface CopilotRequest {
  failedMember: FailedMemberData;
  geometry: GeometricContext;
  loads?: LoadContext;
  /** Additional context from user */
  userQuery?: string;
  /** Number of recommendations to provide */
  numRecommendations?: number;
}

export interface FixRecommendation {
  /** Short title of the fix */
  title: string;
  /** Detailed description */
  description: string;
  /** Expected improvement in ratio */
  expectedImprovement: string;
  /** Implementation difficulty (1-5) */
  difficulty: number;
  /** Cost impact (low, medium, high) */
  costImpact: 'low' | 'medium' | 'high';
  /** Trade-offs and considerations */
  tradeoffs: string[];
  /** Related code clause */
  codeReference?: string;
}

export interface CopilotResponse {
  /** Summary of the problem */
  problemSummary: string;
  /** List of fix recommendations */
  recommendations: FixRecommendation[];
  /** Additional notes */
  notes?: string;
  /** Suggested next steps */
  nextSteps?: string[];
  /** Raw AI response for debugging */
  rawResponse?: string;
}

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

const SYSTEM_PROMPTS: Record<string, string> = {
  IS800_COMPRESSION: `You are a Senior Structural Engineering Expert specializing in steel design per IS 800:2007.
The user has a steel column or compression member that is FAILING in compression/buckling.

Your task:
1. Analyze the failure based on the provided data
2. Suggest exactly {numRecommendations} specific, actionable fixes
3. For each fix, explain the engineering rationale and trade-offs
4. Reference specific IS 800 clauses where applicable

Focus on practical solutions:
- Section upgrades (specific alternatives)
- Bracing modifications
- Effective length adjustments
- Connection stiffening

Response format (JSON):
{
  "problemSummary": "Brief analysis of why the member is failing",
  "recommendations": [
    {
      "title": "Short fix title",
      "description": "Detailed description of the fix",
      "expectedImprovement": "e.g., 'Reduce ratio from 1.45 to ~0.85'",
      "difficulty": 1-5,
      "costImpact": "low|medium|high",
      "tradeoffs": ["Trade-off 1", "Trade-off 2"],
      "codeReference": "IS 800 Clause X.Y"
    }
  ],
  "notes": "Any additional engineering notes",
  "nextSteps": ["Step 1", "Step 2"]
}`,

  IS800_FLEXURE: `You are a Senior Structural Engineering Expert specializing in steel design per IS 800:2007.
The user has a steel beam that is FAILING in bending/flexure.

Your task:
1. Analyze the failure based on the provided data
2. Suggest exactly {numRecommendations} specific, actionable fixes
3. For each fix, explain the engineering rationale and trade-offs
4. Reference specific IS 800 clauses where applicable

Focus on practical solutions:
- Section upgrades (deeper sections, heavier sections)
- Lateral bracing to prevent LTB
- Cover plates or flange reinforcement
- Span reduction or load redistribution

Response format (JSON):
{
  "problemSummary": "Brief analysis of why the member is failing",
  "recommendations": [...],
  "notes": "Any additional engineering notes",
  "nextSteps": ["Step 1", "Step 2"]
}`,

  IS800_COMBINED: `You are a Senior Structural Engineering Expert specializing in steel design per IS 800:2007.
The user has a steel member FAILING under combined axial and bending forces (beam-column).

Your task:
1. Analyze the interaction failure based on the provided data
2. Suggest exactly {numRecommendations} specific, actionable fixes
3. For each fix, explain the engineering rationale and trade-offs
4. Reference IS 800 Clause 9.3 and related clauses

Focus on practical solutions:
- Section with better plastic modulus in the critical axis
- Bracing to reduce effective length
- Moment redistribution through connection modifications
- Load path changes

Response format (JSON): Same as above`,

  IS456_FLEXURE: `You are a Senior Structural Engineering Expert specializing in RC design per IS 456:2000.
The user has a reinforced concrete beam FAILING in flexure.

Your task:
1. Analyze the failure based on the provided data
2. Suggest exactly {numRecommendations} specific, actionable fixes
3. For each fix, explain the engineering rationale and trade-offs
4. Reference specific IS 456 clauses where applicable

Focus on practical solutions:
- Increase tension reinforcement (within limits of Clause 26.5.1)
- Increase beam depth
- Use compression steel for doubly reinforced section
- Concrete grade upgrade
- Consider T-beam action if slab is monolithic

Response format (JSON): Same as above`,

  IS456_SHEAR: `You are a Senior Structural Engineering Expert specializing in RC design per IS 456:2000.
The user has a reinforced concrete beam FAILING in shear.

Your task:
1. Analyze the failure based on the provided data
2. Suggest exactly {numRecommendations} specific, actionable fixes
3. For each fix, explain the engineering rationale and trade-offs
4. Reference IS 456 Clause 40

Focus on practical solutions:
- Reduce stirrup spacing
- Increase stirrup diameter
- Increase beam width
- Use inclined stirrups or bent-up bars near supports

Response format (JSON): Same as above`,

  GENERIC: `You are a Senior Structural Engineering Expert with expertise in multiple design codes.
The user has a structural member that is FAILING a design check.

Your task:
1. Analyze the failure based on the provided data
2. Suggest exactly {numRecommendations} specific, actionable fixes
3. For each fix, explain the engineering rationale and trade-offs
4. Reference applicable code clauses

Response format (JSON):
{
  "problemSummary": "Brief analysis of why the member is failing",
  "recommendations": [
    {
      "title": "Short fix title",
      "description": "Detailed description of the fix",
      "expectedImprovement": "Expected improvement description",
      "difficulty": 1-5,
      "costImpact": "low|medium|high",
      "tradeoffs": ["Trade-off 1", "Trade-off 2"],
      "codeReference": "Code Clause"
    }
  ],
  "notes": "Any additional engineering notes",
  "nextSteps": ["Step 1", "Step 2"]
}`,
};

// ============================================================================
// ENGINEERING COPILOT SERVICE CLASS
// ============================================================================

export class EngineeringCopilotService {
  private model: GenerativeModel;
  private conversationHistory: Map<string, { role: string; parts: string }[]>;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GOOGLE_AI_API_KEY;
    if (!key) {
      throw new Error('GOOGLE_AI_API_KEY is required for EngineeringCopilotService');
    }
    const genAI = new GoogleGenerativeAI(key);
    this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    this.conversationHistory = new Map();
  }

  // ==========================================================================
  // PROMPT SELECTION
  // ==========================================================================

  /**
   * Select appropriate system prompt based on failure context
   */
  private selectSystemPrompt(request: CopilotRequest): string {
    const { failedMember } = request;
    const { designCode, failureMode, memberType } = failedMember;

    // Normalize failure mode
    const mode = failureMode.toLowerCase();

    // IS 800 Steel Design
    if (designCode.includes('800') || designCode.toLowerCase().includes('steel')) {
      if (mode.includes('buckling') || mode.includes('compression') || memberType === 'column') {
        return SYSTEM_PROMPTS.IS800_COMPRESSION;
      }
      if (mode.includes('flexure') || mode.includes('bending') || mode.includes('moment')) {
        return SYSTEM_PROMPTS.IS800_FLEXURE;
      }
      if (mode.includes('combined') || mode.includes('interaction')) {
        return SYSTEM_PROMPTS.IS800_COMBINED;
      }
    }

    // IS 456 RC Design
    if (designCode.includes('456') || designCode.toLowerCase().includes('concrete')) {
      if (mode.includes('shear')) {
        return SYSTEM_PROMPTS.IS456_SHEAR;
      }
      if (mode.includes('flexure') || mode.includes('bending')) {
        return SYSTEM_PROMPTS.IS456_FLEXURE;
      }
    }

    return SYSTEM_PROMPTS.GENERIC;
  }

  // ==========================================================================
  // PROMPT CONSTRUCTION
  // ==========================================================================

  /**
   * Build user prompt with all context
   */
  private buildUserPrompt(request: CopilotRequest): string {
    const { failedMember, geometry, loads, userQuery } = request;

    let prompt = `## Failed Member Analysis Request

### Member Information
- **Member ID**: ${failedMember.memberId}
- **Member Type**: ${failedMember.memberType}
- **Design Code**: ${failedMember.designCode}
- **Failure Mode**: ${failedMember.failureMode}
- **D/C Ratio**: ${failedMember.ratio.toFixed(2)} (FAILING - ratio > 1.0)
${failedMember.clause ? `- **Governing Clause**: ${failedMember.clause}` : ''}
${failedMember.capacity ? `- **Capacity**: ${failedMember.capacity.toFixed(1)} kN` : ''}
${failedMember.demand ? `- **Demand**: ${failedMember.demand.toFixed(1)} kN` : ''}

### Geometric Context
- **Length**: ${geometry.length} m
- **Section**: ${geometry.section}
${geometry.Kx ? `- **Effective Length Factor Kx**: ${geometry.Kx}` : ''}
${geometry.Ky ? `- **Effective Length Factor Ky**: ${geometry.Ky}` : ''}
${geometry.bracingInterval ? `- **Bracing Interval**: ${geometry.bracingInterval} m` : ''}
${geometry.materialGrade ? `- **Material Grade**: ${geometry.materialGrade}` : ''}
${geometry.endConditions ? `- **End Conditions**: Start=${geometry.endConditions.start}, End=${geometry.endConditions.end}` : ''}`;

    if (loads) {
      prompt += `

### Applied Loads
${loads.axialForce ? `- **Axial Force**: ${loads.axialForce.toFixed(1)} kN` : ''}
${loads.momentMajor ? `- **Major Axis Moment**: ${loads.momentMajor.toFixed(1)} kN·m` : ''}
${loads.momentMinor ? `- **Minor Axis Moment**: ${loads.momentMinor.toFixed(1)} kN·m` : ''}
${loads.shearForce ? `- **Shear Force**: ${loads.shearForce.toFixed(1)} kN` : ''}
${loads.loadCombination ? `- **Load Combination**: ${loads.loadCombination}` : ''}
${loads.isSeismic ? `- **Seismic Loading**: Yes` : ''}`;
    }

    if (userQuery) {
      prompt += `

### User Query
${userQuery}`;
    }

    prompt += `

Please analyze this failure and provide ${request.numRecommendations || 3} specific, actionable recommendations to fix this member.`;

    return prompt;
  }

  // ==========================================================================
  // AI INTERACTION
  // ==========================================================================

  /**
   * Analyze failed member and get fix recommendations
   */
  async analyzeFailure(request: CopilotRequest): Promise<CopilotResponse> {
    const numRecs = request.numRecommendations || 3;

    // Select and customize system prompt
    let systemPrompt = this.selectSystemPrompt(request);
    systemPrompt = systemPrompt.replace(/{numRecommendations}/g, numRecs.toString());

    // Build user prompt
    const userPrompt = this.buildUserPrompt(request);

    // Combine system and user prompts for Gemini
    const fullPrompt = `${systemPrompt}\n\n---\n\nUser Request:\n${userPrompt}\n\nRespond with valid JSON only.`;

    try {
      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      let rawResponse = response.text();

      // Clean up response - remove markdown code blocks if present
      rawResponse = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      // Parse JSON response
      const parsed = JSON.parse(rawResponse);

      return {
        problemSummary: parsed.problemSummary || 'Analysis complete',
        recommendations: parsed.recommendations || [],
        notes: parsed.notes,
        nextSteps: parsed.nextSteps,
        rawResponse,
      };
    } catch (error) {
      console.error('EngineeringCopilot error:', error);

      // Return fallback response
      return this.getFallbackResponse(request);
    }
  }

  /**
   * Continue conversation with follow-up questions
   */
  async chat(
    sessionId: string,
    message: string,
    context?: CopilotRequest
  ): Promise<{ reply: string; recommendations?: FixRecommendation[] }> {
    // Get or initialize conversation history
    let history = this.conversationHistory.get(sessionId) || [];

    // If new conversation with context, initialize with system prompt
    if (history.length === 0 && context) {
      const systemPrompt = this.selectSystemPrompt(context);
      history.push({ role: 'model', parts: systemPrompt });
      history.push({ role: 'user', parts: this.buildUserPrompt(context) });
    }

    // Add new user message
    history.push({ role: 'user', parts: message });

    try {
      // Build chat prompt from history
      const historyText = history
        .map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.parts}`)
        .join('\n\n');
      
      const result = await this.model.generateContent(historyText);
      const response = await result.response;
      const reply = response.text() || 'I apologize, I could not generate a response.';

      // Add assistant response to history
      history.push({ role: 'model', parts: reply });

      // Keep history manageable (last 20 messages)
      if (history.length > 20) {
        history = [history[0], ...history.slice(-19)];
      }

      this.conversationHistory.set(sessionId, history);

      return { reply };
    } catch (error) {
      console.error('Chat error:', error);
      return { reply: 'I apologize, there was an error processing your request.' };
    }
  }

  /**
   * Clear conversation history for a session
   */
  clearSession(sessionId: string): void {
    this.conversationHistory.delete(sessionId);
  }

  // ==========================================================================
  // FALLBACK RESPONSES
  // ==========================================================================

  /**
   * Provide fallback recommendations when API fails
   */
  private getFallbackResponse(request: CopilotRequest): CopilotResponse {
    const { failedMember, geometry } = request;
    const mode = failedMember.failureMode.toLowerCase();

    const recommendations: FixRecommendation[] = [];

    // Generic section upgrade recommendation
    recommendations.push({
      title: 'Upgrade Section Size',
      description: `Consider upgrading from ${geometry.section} to a heavier section with larger cross-sectional properties.`,
      expectedImprovement: `Reduce ratio from ${failedMember.ratio.toFixed(2)} to below 1.0`,
      difficulty: 2,
      costImpact: 'medium',
      tradeoffs: [
        'Increased material cost',
        'May affect connected members',
        'Check connection capacity for new section',
      ],
    });

    // Buckling-specific
    if (mode.includes('buckling') || mode.includes('compression')) {
      recommendations.push({
        title: 'Add Intermediate Bracing',
        description: `Add lateral bracing at mid-span to reduce the effective length from ${geometry.length}m to ${(geometry.length / 2).toFixed(1)}m.`,
        expectedImprovement: 'Significant reduction in slenderness ratio',
        difficulty: 3,
        costImpact: 'medium',
        tradeoffs: [
          'Requires additional bracing members',
          'May impact architectural considerations',
          'Bracing connections need design verification',
        ],
        codeReference: 'IS 800 Clause 7.1.2',
      });

      recommendations.push({
        title: 'Modify End Conditions',
        description: 'Stiffen connections to reduce effective length factor from current value.',
        expectedImprovement: 'Reduce effective length by up to 50%',
        difficulty: 4,
        costImpact: 'high',
        tradeoffs: [
          'Requires connection redesign',
          'May induce moments in connected members',
          'Higher fabrication complexity',
        ],
      });
    }

    // Flexure-specific
    if (mode.includes('flexure') || mode.includes('bending')) {
      recommendations.push({
        title: 'Increase Section Depth',
        description: 'Use a deeper section to increase moment of inertia and section modulus.',
        expectedImprovement: 'Proportional increase in moment capacity',
        difficulty: 2,
        costImpact: 'medium',
        tradeoffs: [
          'May conflict with floor-to-floor height',
          'Check for clearance issues',
          'Verify shear capacity of deeper section',
        ],
      });
    }

    return {
      problemSummary: `Member ${failedMember.memberId} is failing with a D/C ratio of ${failedMember.ratio.toFixed(2)} due to ${failedMember.failureMode}.`,
      recommendations: recommendations.slice(0, request.numRecommendations || 3),
      notes: 'These are general recommendations. For precise solutions, please verify with detailed analysis.',
      nextSteps: [
        'Run analysis with suggested modifications',
        'Check capacity of connected members',
        'Verify constructability and cost implications',
      ],
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let copilotInstance: EngineeringCopilotService | null = null;

export function getEngineeringCopilot(apiKey?: string): EngineeringCopilotService {
  if (!copilotInstance) {
    copilotInstance = new EngineeringCopilotService(apiKey);
  }
  return copilotInstance;
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Quick analysis of a failed member
 */
export async function analyzeFailedMember(
  memberId: string,
  ratio: number,
  failureMode: string,
  section: string,
  length: number,
  designCode: string = 'IS 800:2007'
): Promise<CopilotResponse> {
  const copilot = getEngineeringCopilot();

  return copilot.analyzeFailure({
    failedMember: {
      memberId,
      ratio,
      failureMode,
      designCode,
      memberType: 'column',
    },
    geometry: {
      length,
      section,
    },
    numRecommendations: 3,
  });
}
