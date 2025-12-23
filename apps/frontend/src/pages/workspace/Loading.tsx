import React from 'react';
import { Link } from 'react-router-dom';
import { Wind, Waves, Activity } from 'lucide-react';

const LoadingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-canvas text-zinc-100">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Loading</h1>
            <p className="text-sm text-muted">Applying external forces.</p>
          </div>
          <Link to="/workspace" className="px-3 py-2 rounded-md bg-accent/20 border border-accent text-accent text-sm hover:bg-accent/30">Open Workspace</Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2 text-accent">
              <Wind size={16} />
              <h3 className="text-sm font-semibold uppercase tracking-wide">IS 875 Wind</h3>
            </div>
            <p className="text-sm text-muted">Auto-calculate wind pressures by zone, exposure, and height.</p>
          </div>

          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2 text-accent">
              <Activity size={16} />
              <h3 className="text-sm font-semibold uppercase tracking-wide">IS 1893 Seismic</h3>
            </div>
            <p className="text-sm text-muted">Compute base shear and distribute as per code with modal combination.</p>
          </div>

          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2 text-accent">
              <Waves size={16} />
              <h3 className="text-sm font-semibold uppercase tracking-wide">UDL & Point Loads</h3>
            </div>
            <p className="text-sm text-muted">Assign uniform and point loads to members and nodes with load cases.</p>
          </div>
        </div>

        <section className="bg-surface border border-border rounded-lg p-4">
          <h2 className="text-sm font-semibold text-accent uppercase mb-2">Load Combinations</h2>
          <p className="text-sm text-muted">Generate IS code combinations automatically and run envelope analysis.</p>
        </section>
      </div>
    </div>
  );
};

export default LoadingPage;
