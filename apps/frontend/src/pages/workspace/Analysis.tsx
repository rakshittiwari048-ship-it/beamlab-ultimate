import React from 'react';
import { Link } from 'react-router-dom';
import { Ratio, LineChart } from 'lucide-react';

const AnalysisPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-canvas text-zinc-100">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Analysis</h1>
            <p className="text-sm text-muted">Static Linear, Modal (Frequency), Deformed Shape.</p>
          </div>
          <Link to="/workspace" className="px-3 py-2 rounded-md bg-accent/20 border border-accent text-accent text-sm hover:bg-accent/30">Open Workspace</Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2 text-accent">
              <Ratio size={16} />
              <h3 className="text-sm font-semibold uppercase tracking-wide">Static Linear</h3>
            </div>
            <p className="text-sm text-muted">Solve F = K u for load cases; support reactions, member forces, node displacements.</p>
          </div>

          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2 text-accent">
              <LineChart size={16} />
              <h3 className="text-sm font-semibold uppercase tracking-wide">Modal Analysis</h3>
            </div>
            <p className="text-sm text-muted">Extract natural frequencies and mode shapes; mass participation factors.</p>
          </div>

          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2 text-accent">
              <LineChart size={16} />
              <h3 className="text-sm font-semibold uppercase tracking-wide">Deformed Shape</h3>
            </div>
            <p className="text-sm text-muted">Visualize deformations scaled and color-mapped for clarity.</p>
          </div>
        </div>

        <section className="bg-surface border border-border rounded-lg p-4">
          <h2 className="text-sm font-semibold text-accent uppercase mb-2">Run Solver</h2>
          <p className="text-sm text-muted">Kick off analysis from the workspace or via API; results stored per case & combination.</p>
        </section>
      </div>
    </div>
  );
};

export default AnalysisPage;
