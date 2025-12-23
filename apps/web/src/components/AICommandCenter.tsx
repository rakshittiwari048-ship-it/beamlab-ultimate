// @ts-nocheck
import { useState, useMemo } from 'react';
import { useTemplates } from '../hooks/useTemplates';

interface AICommandCenterProps {
  importModel: (model: any) => void;
  runAnalysis: () => Promise<void>;
  apiBase?: string;
}

/**
 * AICommandCenter
 * - Tries to match prompt to a known template (from backend /api/templates)
 * - If no match, falls back to backend AI architect endpoint
 * - Imports model and triggers analysis
 */
export const AICommandCenter = ({ importModel, runAnalysis, apiBase = 'http://localhost:6000' }: AICommandCenterProps) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { templates, selectTemplate, selected } = useTemplates(apiBase);

  const normalizedPrompt = prompt.toLowerCase();

  // Simple matching on name/description
  const matchedTemplateId = useMemo(() => {
    if (!normalizedPrompt) return null;
    const hit = templates.find((t) => {
      const name = t.name?.toLowerCase() || '';
      const desc = t.description?.toLowerCase() || '';
      return normalizedPrompt.includes(name) || normalizedPrompt.includes(desc);
    });
    return hit?.id || null;
  }, [templates, normalizedPrompt]);

  const handleAIDesign = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);

    try {
      let model: any = null;

      // 1) Template match
      if (matchedTemplateId) {
        await selectTemplate(matchedTemplateId);
        model = selected;
      }

      // 2) Fallback to backend AI
      if (!model) {
        const res = await fetch(`${apiBase}/api/ai/architect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: prompt.trim() }),
        });
        const data = await res.json();
        if (!data.success || !data.model) {
          throw new Error(data.error || 'AI generation failed');
        }
        model = data.model;
      }

      // 3) Populate and solve
      importModel(model);
      await runAnalysis();
    } catch (err: any) {
      console.error('AICommandCenter error:', err);
      setError(err?.message || 'Failed to generate structure');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-zinc-900 border-t border-zinc-800">
      <h3 className="text-xs font-bold text-blue-400 mb-2 uppercase">AI Architect</h3>
      <textarea
        className="w-full bg-zinc-800 p-2 text-sm rounded border border-zinc-700"
        placeholder="e.g. 'Generate a 12m span bridge truss' or 'Standard Warehouse'"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <button
        onClick={handleAIDesign}
        disabled={loading}
        className="w-full mt-2 bg-blue-600 hover:bg-blue-500 py-2 rounded text-sm font-bold transition-all disabled:opacity-60"
      >
        {loading ? 'Working…' : 'Build & Analyze'}
      </button>
      {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
    </div>
  );
};
