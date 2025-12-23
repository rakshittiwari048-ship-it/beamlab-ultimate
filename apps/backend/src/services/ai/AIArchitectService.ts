import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * AIArchitectService
 * Lightweight Gemini-based structural model generator.
 */
const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

export class AIArchitectService {
  static getModel() {
    if (!API_KEY) {
      throw new Error('Google Gemini API key missing (set GEMINI_API_KEY or GOOGLE_AI_API_KEY)');
    }
    const genAI = new GoogleGenerativeAI(API_KEY);
    return genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  static async generateStructure(userPrompt: string) {
    const model = AIArchitectService.getModel();

    const systemInstruction = `
      You are a Civil Engineering AI. Generate a structural model in JSON format.
      Units: meters.
      Schema:
      {
        "nodes": [ { "id": "n1", "x": 0, "y": 0, "z": 0, "isSupport": true } ],
        "members": [ { "id": "m1", "s": "n1", "e": "n2", "section": "ISMB300" } ]
      }
      If the user prompt matches a standard structure like 'warehouse' or 'truss',
      ensure the geometry is physically stable and connected.
      Output ONLY JSON (no code fences, no prose).
    `;

    const result = await model.generateContent([systemInstruction, userPrompt]);
    const response = await result.response;
    const raw = response.text();

    // Clean potential code fences or stray text
    const cleaned = raw.replace(/```json|```/g, '').trim();

    return JSON.parse(cleaned);
  }
}
