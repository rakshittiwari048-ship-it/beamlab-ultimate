import React from 'react';
import { Link } from 'react-router-dom';
import { Library, Beaker } from 'lucide-react';

const PropertiesPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-canvas text-zinc-100">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Properties</h1>
            <p className="text-sm text-muted">Assign physical data (E, I, A).</p>
          </div>
          <Link to="/workspace" className="px-3 py-2 rounded-md bg-accent/20 border border-accent text-accent text-sm hover:bg-accent/30">Open Workspace</Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2 text-accent">
              <Library size={16} />
              <h3 className="text-sm font-semibold uppercase tracking-wide">Section Library</h3>
            </div>
            <ul className="text-sm text-muted list-disc pl-5 space-y-1">
              <li>ISMB/AISC section catalog</li>
              <li>Search by depth, weight, Zx</li>
              <li>Assign to members and groups</li>
            </ul>
          </div>

          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2 text-accent">
              <Beaker size={16} />
              <h3 className="text-sm font-semibold uppercase tracking-wide">Material Grades</h3>
            </div>
            <ul className="text-sm text-muted list-disc pl-5 space-y-1">
              <li>Steel grades (Fe250, Fe345, Fe415)</li>
              <li>Concrete grades (M20, M25, M30)</li>
              <li>Set E, fy, fck globally or per group</li>
            </ul>
          </div>
        </div>

        <section className="bg-surface border border-border rounded-lg p-4">
          <h2 className="text-sm font-semibold text-accent uppercase mb-2">Section Properties</h2>
          <p className="text-sm text-muted">Define modulus of elasticity (E), area (A), moment of inertia (I) for accurate analysis.</p>
        </section>
      </div>
    </div>
  );
};

export default PropertiesPage;
