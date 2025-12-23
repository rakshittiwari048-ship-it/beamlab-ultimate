import React from 'react';
import { Link } from 'react-router-dom';
import { Grid3X3, FileDown, Bot } from 'lucide-react';

const FeatureCard: React.FC<{ title: string; icon: React.ReactNode; items: string[] }> = ({ title, icon, items }) => (
  <div className="bg-surface border border-border rounded-lg p-4">
    <div className="flex items-center gap-2 mb-2 text-accent">
      {icon}
      <h3 className="text-sm font-semibold uppercase tracking-wide">{title}</h3>
    </div>
    <ul className="text-sm text-muted list-disc pl-5 space-y-1">
      {items.map((it) => (
        <li key={it}>{it}</li>
      ))}
    </ul>
  </div>
);

const ModelingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-canvas text-zinc-100">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Modeling</h1>
            <p className="text-sm text-muted">Geometry creation and connectivity.</p>
          </div>
          <Link to="/workspace" className="px-3 py-2 rounded-md bg-accent/20 border border-accent text-accent text-sm hover:bg-accent/30">Open Workspace</Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard title="AI Architect" icon={<Bot size={16} />} items={[
            'Auto-generate frames/grids',
            'Suggest member layout',
            'Draft foundation plan',
          ]} />
          <FeatureCard title="DXF Import" icon={<FileDown size={16} />} items={[
            'Import DXF geometry',
            'Layer mapping to nodes/members',
            'Snap-to-grid alignment',
          ]} />
          <FeatureCard title="Node/Member Grid" icon={<Grid3X3 size={16} />} items={[
            'Grid-based node creation',
            'Member connectivity validation',
            'Interactive selection tools',
          ]} />
        </div>

        <section className="bg-surface border border-border rounded-lg p-4">
          <h2 className="text-sm font-semibold text-accent uppercase mb-2">Workflow</h2>
          <ol className="list-decimal pl-5 text-sm text-muted space-y-1">
            <li>Start with AI Architect or define grid manually.</li>
            <li>Import DXF and auto-map layers to elements.</li>
            <li>Validate connectivity and fix open nodes.</li>
          </ol>
        </section>
      </div>
    </div>
  );
};

export default ModelingPage;
