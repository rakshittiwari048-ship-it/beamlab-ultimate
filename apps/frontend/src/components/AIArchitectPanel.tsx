/**
 * AIArchitectPanel.tsx
 * 
 * AI-powered structural model generator panel.
 * Converts natural language descriptions into 3D structural models.
 * 
 * Features:
 * - Natural language input textarea
 * - One-click model generation with loading state
 * - Auto-analysis toggle for immediate solver execution
 * - Animated node placement for visual feedback
 * - Error handling and user notifications
 */

import { useState, createContext, useContext } from 'react';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { useModelStore } from '../store/model';
import type { Node as ModelNode, Member as ModelMember } from '../store/model';

interface GeneratedModel {
  nodes: Array<{ id: string; x: number; y: number; z: number }>;
  members: Array<{ id: string; startNodeId: string; endNodeId: string; section: string }>;
}

interface GenerateResponse {
  success: boolean;
  model?: GeneratedModel;
  error?: string;
  rawResponse?: string;
}

interface AIGenerationContextType {
  isGenerating: boolean;
  generationMessage: string;
}

const AIGenerationContext = createContext<AIGenerationContextType>({
  isGenerating: false,
  generationMessage: '',
});

export const useAIGeneration = () => useContext(AIGenerationContext);

export const AIArchitectPanel = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMessage, setGenerationMessage] = useState('Generating structure...');
  const [autoAnalysis, setAutoAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  // Model store actions
  const clear = useModelStore((state) => state.clear);
  const addNode = useModelStore((state) => state.addNode);
  const addMember = useModelStore((state) => state.addMember);
  const runAnalysis = useModelStore((state) => state.runAnalysis);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a description of the structure');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGenerationMessage('Calling AI model...');

    try {
      // Call the backend API
      const response = await fetch('http://localhost:6000/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          maxNodes: 100,
          maxMembers: 500,
        }),
      });

      const data: GenerateResponse = await response.json();

      if (!data.success || !data.model) {
        throw new Error(data.error || 'Failed to generate model');
      }

      setGenerationMessage('Clearing existing model...');
      // Clear existing model
      clear();

      // Animate nodes appearing one by one
      const { nodes, members } = data.model;

      setGenerationMessage(`Placing ${nodes.length} nodes...`);
      // Add nodes with staggered animation
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        
        // Add delay for visual effect
        await new Promise((resolve) => setTimeout(resolve, 50 + i * 30));
        
        addNode({
          id: node.id,
          x: node.x,
          y: node.y,
          z: node.z,
        } as ModelNode);
      }

      setGenerationMessage(`Adding ${members.length} members...`);
      // Add all members after nodes are placed
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      members.forEach((member) => {
        addMember({
          id: member.id,
          startNodeId: member.startNodeId,
          endNodeId: member.endNodeId,
          sectionId: 'default-section', // Use default section
          materialId: undefined,
        } as ModelMember);
      });

      setLastGenerated(prompt.trim());

      // Run analysis if auto-analysis is enabled
      if (autoAnalysis) {
        setGenerationMessage('Running structural analysis...');
        await new Promise((resolve) => setTimeout(resolve, 500));
        runAnalysis();
      }
    } catch (err) {
      console.error('AI generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate model');
    } finally {
      setIsGenerating(false);
      setGenerationMessage('Generating structure...');
    }
  };

  const examplePrompts = [
    '2-story 2-bay frame, 3m bays, 3m story height',
    'Simple warehouse truss, 20m span, 5m height',
    '3-bay single-story frame, 4m bays, 5m columns',
    'Cantilever beam 6m long',
    'Portal frame 10m span, 4m height',
  ];

  return (
    <AIGenerationContext.Provider value={{ isGenerating, generationMessage }}>
      <div className="p-4 bg-gray-900 border-b border-gray-700 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-semibold text-white">AI Architect</h3>
        </div>

      {/* Prompt Textarea */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400 uppercase">
          Describe the structure
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., 2-story 2-bay frame, 3m bays, 3m story height"
          disabled={isGenerating}
          className="w-full h-24 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm 
            placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
            resize-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Example Prompts */}
      <div className="space-y-1">
        <label className="text-xs text-gray-500">Quick examples:</label>
        <div className="flex flex-wrap gap-1">
          {examplePrompts.map((example, idx) => (
            <button
              key={idx}
              onClick={() => setPrompt(example)}
              disabled={isGenerating}
              className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 
                rounded text-gray-300 hover:text-white transition-colors disabled:opacity-50 
                disabled:cursor-not-allowed"
            >
              {example.length > 30 ? `${example.substring(0, 30)}...` : example}
            </button>
          ))}
        </div>
      </div>

      {/* Auto-Analysis Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="auto-analysis"
          checked={autoAnalysis}
          onChange={(e) => setAutoAnalysis(e.target.checked)}
          disabled={isGenerating}
          className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded 
            focus:ring-blue-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <label
          htmlFor="auto-analysis"
          className="text-sm text-gray-300 cursor-pointer select-none"
        >
          Run Analysis After Generation
        </label>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
        className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-purple-600 
          hover:from-blue-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700
          text-white font-medium rounded-lg transition-all shadow-lg
          hover:shadow-blue-500/50 disabled:shadow-none
          flex items-center justify-center gap-2
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Generating Model...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            <span>Generate Model</span>
          </>
        )}
      </button>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-200">Generation Failed</p>
            <p className="text-xs text-red-300 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {lastGenerated && !error && !isGenerating && (
        <div className="p-3 bg-green-900/30 border border-green-700 rounded-lg">
          <p className="text-xs text-green-300">
            ✓ Model generated: <span className="font-medium">{lastGenerated}</span>
          </p>
        </div>
      )}

      {/* Loading Overlay Hint */}
      {isGenerating && (
        <div className="text-xs text-gray-500 text-center">
          Watch the 3D canvas as nodes appear...
        </div>
      )}
    </div>
    </AIGenerationContext.Provider>
  );
};
