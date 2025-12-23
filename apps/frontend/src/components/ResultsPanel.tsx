import type { FC } from 'react';
import { Play, TrendingUp } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { useModelStore } from '../store/model';
import { generateAndSaveReport } from '../utils/ReportGenerator';

export const ResultsPanel: FC = () => {
  const { analysisResults, isAnalyzing, model } = useEditorStore();
  const solverResult = useModelStore((state) => state.solverResult);
  const analysisError = useModelStore((state) => state.analysisError);
  const displacementScale = useModelStore((state) => state.displacementScale);
  const setDisplacementScale = useModelStore((state) => state.setDisplacementScale);

  const hasLoadCases = model.loadCases.length > 0;
  const hasResults = analysisResults.length > 0;

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Analysis</h2>
        <div className="flex items-center gap-2">
          <button
            className={`
              btn-primary flex items-center gap-2 text-sm
              ${!hasLoadCases || isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            disabled={!hasLoadCases || isAnalyzing}
          >
            <Play className="w-4 h-4" />
            {isAnalyzing ? 'Running...' : 'Run'}
          </button>
          <button
            className="btn-secondary flex items-center gap-2 text-sm"
            onClick={() => generateAndSaveReport({ projectName: 'BeamLab Model' })}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M12 16l4-5h-3V4h-2v7H8l4 5zm8 3H4v-2h16v2z" />
            </svg>
            Export PDF
          </button>
        </div>
      </div>

      {!hasLoadCases && (
        <p className="text-sm text-gray-400">
          Add load cases to run analysis
        </p>
      )}

      {hasLoadCases && !hasResults && !isAnalyzing && (
        <p className="text-sm text-gray-400">
          Click Run to analyze the model
        </p>
      )}

      {isAnalyzing && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500" />
          Analyzing structure...
        </div>
      )}

      {analysisError && (
        <div className="mt-3 rounded border border-red-800 bg-red-900/20 px-3 py-2 text-sm text-red-200">
          {analysisError}
        </div>
      )}

      {hasResults && (
        <div className="space-y-4">
          {analysisResults.map((result) => {
            const loadCase = model.loadCases.find((lc) => lc.id === result.loadCaseId);
            
            return (
              <div key={result.loadCaseId} className="border-t border-gray-700 pt-3">
                <h3 className="text-sm font-medium text-gray-300 mb-2">
                  {loadCase?.name || 'Unknown Load Case'}
                </h3>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Max Displacement:</span>
                    <span className="text-white font-mono">
                      {(result.maxDisplacement * 1000).toFixed(2)} mm
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Reactions:</span>
                    <span className="text-white">{result.reactions.length}</span>
                  </div>

                  <button className="w-full mt-2 btn-secondary text-xs flex items-center justify-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    View Diagrams
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {solverResult && (
        <div className="mt-4 space-y-2 border-t border-gray-700 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Deflection Scale</span>
            <span className="text-xs text-gray-400">{displacementScale.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={0.5}
            value={displacementScale}
            onChange={(e) => setDisplacementScale(parseFloat(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-gray-500">Adjust to exaggerate displacements in the 3D view.</p>
        </div>
      )}

      {solverResult && (
        <div className="mt-4 space-y-2 border-t border-gray-700 pt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-300">Nodal Displacements</span>
            <span className="text-xs text-gray-500">(Top 20 by magnitude)</span>
          </div>
          <div className="max-h-64 overflow-y-auto border border-gray-800 rounded">
            <div className="grid grid-cols-5 text-xs font-semibold text-gray-300 px-3 py-2 bg-gray-800">
              <span>Node</span>
              <span className="text-right">dx</span>
              <span className="text-right">dy</span>
              <span className="text-right">dz</span>
              <span className="text-right">|u|</span>
            </div>
            {Array.from(solverResult.nodalDisplacements.entries())
              .map(([nodeId, d]) => ({
                nodeId,
                dx: d.dx,
                dy: d.dy,
                dz: d.dz,
                mag: Math.sqrt(d.dx * d.dx + d.dy * d.dy + d.dz * d.dz),
              }))
              .filter((row) => row.mag > 1e-9) // Hide essentially zero displacements
              .sort((a, b) => b.mag - a.mag)
              .slice(0, 20)
              .map((row) => (
                <div key={row.nodeId} className="grid grid-cols-5 text-xs text-gray-100 px-3 py-1.5 border-t border-gray-800 hover:bg-gray-700/50">
                  <span className="font-semibold text-blue-300" title={row.nodeId}>Node {row.nodeId}</span>
                  <span className="text-right font-mono text-green-300">{(row.dx * 1000).toFixed(3)}</span>
                  <span className="text-right font-mono text-green-300">{(row.dy * 1000).toFixed(3)}</span>
                  <span className="text-right font-mono text-green-300">{(row.dz * 1000).toFixed(3)}</span>
                  <span className="text-right font-mono text-yellow-300 font-semibold">{(row.mag * 1000).toFixed(3)}</span>
                </div>
              ))}
          </div>
          <p className="text-[11px] text-gray-500">Values shown in millimeters.</p>
        </div>
      )}

      {solverResult && (
        <div className="mt-4 space-y-2 border-t border-gray-700 pt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-300">Support Reactions</span>
            <span className="text-xs text-gray-500">(Top 20 by |R|)</span>
          </div>
          <div className="max-h-64 overflow-y-auto border border-gray-800 rounded">
            <div className="grid grid-cols-7 text-xs font-semibold text-gray-300 px-3 py-2 bg-gray-800">
              <span>Node</span>
              <span className="text-right">Fx</span>
              <span className="text-right">Fy</span>
              <span className="text-right">Fz</span>
              <span className="text-right">Mx</span>
              <span className="text-right">My</span>
              <span className="text-right">Mz</span>
            </div>
            {Array.from(solverResult.nodalReactions.entries())
              .map(([nodeId, r]) => ({
                nodeId,
                fx: r.fx,
                fy: r.fy,
                fz: r.fz,
                mx: r.mx,
                my: r.my,
                mz: r.mz,
                mag: Math.sqrt(r.fx * r.fx + r.fy * r.fy + r.fz * r.fz),
              }))
              .sort((a, b) => b.mag - a.mag)
              .slice(0, 20)
              .map((row) => (
                <div key={row.nodeId} className="grid grid-cols-7 text-xs text-gray-100 px-3 py-1.5 border-t border-gray-800 hover:bg-gray-700/50">
                  <span className="font-semibold text-orange-300" title={row.nodeId}>Node {row.nodeId}</span>
                  <span className="text-right font-mono text-red-300">{row.fx.toFixed(2)}</span>
                  <span className="text-right font-mono text-red-300">{row.fy.toFixed(2)}</span>
                  <span className="text-right font-mono text-red-300">{row.fz.toFixed(2)}</span>
                  <span className="text-right font-mono text-purple-300 text-[10px]">{row.mx.toFixed(2)}</span>
                  <span className="text-right font-mono text-purple-300 text-[10px]">{row.my.toFixed(2)}</span>
                  <span className="text-right font-mono text-purple-300 text-[10px]">{row.mz.toFixed(2)}</span>
                </div>
              ))}
          </div>
          <p className="text-[11px] text-gray-500">Forces in kN, moments in kN·m (as provided to the solver).</p>
        </div>
      )}
    </div>
  );
};
