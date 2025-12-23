import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Construction, Ruler } from 'lucide-react';

const DesignPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-canvas text-zinc-100">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Design</h1>
            <p className="text-sm text-muted">Code compliance (Pass/Fail) & Rebar.</p>
          </div>
          <Link to="/workspace" className="px-3 py-2 rounded-md bg-accent/20 border border-accent text-accent text-sm hover:bg-accent/30">Open Workspace</Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2 text-accent">
              <Construction size={16} />
              <h3 className="text-sm font-semibold uppercase tracking-wide">IS 800 Steel</h3>
            </div>
            <p className="text-sm text-muted">Member design as per IS 800: checks for axial, bending, shear; interaction equations.</p>
          </div>

          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2 text-accent">
              <Ruler size={16} />
              <h3 className="text-sm font-semibold uppercase tracking-wide">IS 456 Concrete</h3>
            </div>
            <p className="text-sm text-muted">Beam/column design; rebar suggestion and detailing support.</p>
          </div>

          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2 text-accent">
              <CheckCircle2 size={16} />
              <h3 className="text-sm font-semibold uppercase tracking-wide">Footing Design</h3>
            </div>
            <p className="text-sm text-muted">Isolated & combined footings; bearing capacity, punching shear checks.</p>
          </div>
        </div>

        <section className="bg-surface border border-border rounded-lg p-4">
          <h2 className="text-sm font-semibold text-accent uppercase mb-2">Pass/Fail & Reports</h2>
          <p className="text-sm text-muted">Generate utilization, pass/fail summaries, and detailed PDF reports with drawings.</p>
        </section>
      </div>
    </div>
  );
};

export default DesignPage;
