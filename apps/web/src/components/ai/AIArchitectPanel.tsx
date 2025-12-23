import React, { useState } from 'react';
import { Sparkles, Loader } from 'lucide-react';

interface GeneratedTemplate {
  nodes: any[];
  members: any[];
  metadata?: any;
}

interface AIResponse {
  template: GeneratedTemplate;
  reasoning: string;
  confidence: number;
  mode?: string;
}

export default function AIArchitectPanel() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTemplate, setGeneratedTemplate] = useState<AIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle the Generate button click
   * Sends prompt to Python backend and handles response/errors
   */
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a description');
      return;
    }

    // Log the prompt
    console.log('Sending prompt:', prompt);

    // Set loading state
    setIsGenerating(true);
    setError(null);
    setGeneratedTemplate(null);

    try {
      // Call the Python backend
      const response = await fetch('http://localhost:8000/generate/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          context: {
            span: 10,
            loading: 'uniform',
            material: 'steel',
          },
        }),
      }).catch((e) => {
        // Explicit connection failure handling per requirement
        console.error('Fetch failed connecting to Python server:', e);
        alert('❌ Cannot connect to Python Server\n\nMake sure the backend is running on http://localhost:8000');
        throw e;
      });

      // Handle response
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `Server error: ${response.status}`
        );
      }

      // Parse and display result
      const data: AIResponse = await response.json();
      console.log('AI response received:', data);

      setGeneratedTemplate(data);
      setPrompt(''); // Clear input after success

    } catch (err) {
      // Handle fetch or parsing errors
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error calling AI endpoint:', errorMessage);

      // Alert user of connection failure
      if (errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
        alert('❌ Cannot connect to Python Server\n\nMake sure the backend is running on http://localhost:8000');
        setError('Cannot connect to Python Server. Is it running on port 8000?');
      } else {
        setError(errorMessage);
        alert(`❌ AI Generation Failed\n\n${errorMessage}`);
      }

    } finally {
      // Always clear loading state
      setIsGenerating(false);
    }
  };

  /**
   * Handle "Load to Canvas" button
   */
  const handleLoadTemplate = () => {
    if (generatedTemplate?.template) {
      console.log('Loading template to canvas:', generatedTemplate.template);
      // TODO: Integrate with canvas/model state
      alert('Template loading would be dispatched to canvas here');
    }
  };

  /**
   * Clear the generated result and start over
   */
  const handleClear = () => {
    setGeneratedTemplate(null);
    setError(null);
    setPrompt('');
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-zinc-900 rounded-lg border border-zinc-800">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          AI Architect
        </h3>
        <p className="text-sm text-zinc-400">
          Describe your structure in natural language and let AI generate the model
        </p>
      </div>

      {/* Input Section */}
      <div className="flex flex-col gap-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., 'I need a 15m span steel beam for a warehouse with uniform load across the entire span'"
          className="
            w-full p-3 rounded-lg
            bg-zinc-800 border border-zinc-700
            text-white placeholder-zinc-500
            focus:outline-none focus:border-blue-500
            resize-none
            text-sm
            min-h-[100px]
          "
          disabled={isGenerating}
        />

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className={`
            w-full py-3 rounded-lg font-semibold
            flex items-center justify-center gap-2
            transition-all duration-300
            ${isGenerating
              ? 'bg-zinc-700 text-zinc-300 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg hover:shadow-purple-500/30'
            }
          `}
        >
          {isGenerating ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              <span>Architect is thinking...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate Structure</span>
            </>
          )}
        </button>
      </div>

      {/* Generated Result Section */}
      {generatedTemplate && (
        <div className="border-t border-zinc-700 pt-6">
          <div className="mb-4">
            <h4 className="font-semibold text-white mb-2">Generated Structure</h4>

            {/* Mock Mode Badge */}
            {generatedTemplate.mode === 'mock' && (
              <div className="inline-block mb-3 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400">
                Using Mock Mode (Development)
              </div>
            )}

            {/* Reasoning */}
            <div className="mb-4 p-3 bg-zinc-800 rounded-lg">
              <p className="text-sm text-zinc-300 mb-2">
                <span className="font-semibold">Reasoning:</span>
              </p>
              <p className="text-sm text-zinc-400 italic">
                {generatedTemplate.reasoning}
              </p>
            </div>

            {/* Template Preview */}
            <div className="mb-4 p-3 bg-zinc-800 rounded-lg">
              <p className="text-sm text-zinc-300 mb-2">
                <span className="font-semibold">Template Preview:</span>
              </p>
              <div className="text-xs text-zinc-400 space-y-1">
                <p>✓ Nodes: {generatedTemplate.template.nodes.length}</p>
                <p>✓ Members: {generatedTemplate.template.members.length}</p>
                {generatedTemplate.template.metadata?.span && (
                  <p>✓ Span: {generatedTemplate.template.metadata.span}m</p>
                )}
                <p>✓ Confidence: {(generatedTemplate.confidence * 100).toFixed(0)}%</p>
              </div>
            </div>

            {/* Confidence Indicator */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-400">AI Confidence</span>
                <span className="text-xs font-semibold text-blue-400">
                  {(generatedTemplate.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                  style={{ width: `${generatedTemplate.confidence * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleLoadTemplate}
              className="
                flex-1 py-2 px-4 rounded-lg
                bg-blue-600 text-white text-sm font-semibold
                hover:bg-blue-700 transition-colors
              "
            >
              Load to Canvas
            </button>
            <button
              onClick={handleClear}
              className="
                flex-1 py-2 px-4 rounded-lg
                bg-zinc-700 text-white text-sm font-semibold
                hover:bg-zinc-600 transition-colors
              "
            >
              Generate New
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
