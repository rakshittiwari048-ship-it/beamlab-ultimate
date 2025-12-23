/**
 * FeaturesHub
 * Central hub listing all major BeamLab features with deep links into the workspace.
 */

import { Link } from 'react-router-dom';
import { Building2, Footprints, HomeIcon, Layers3, Ruler, Wind, Hammer, Factory, LineChart } from 'lucide-react';

const features = [
  {
    title: '3D Modeling Workspace',
    description: 'Full 3D modeling with quad viewports, snapping, and tool-based editing.',
    icon: Layers3,
    to: '/workspace/3d',
    accent: 'from-blue-500/80 to-blue-600/80',
  },
  {
    title: 'Footing Design',
    description: 'Isolated and combined footing design workflows with code checks.',
    icon: Footprints,
    to: '/workspace/foundation',
    accent: 'from-emerald-500/80 to-emerald-600/80',
  },
  {
    title: 'Truss / Frame Design',
    description: 'Member design and analysis for trusses and frames.',
    icon: Ruler,
    to: '/workspace/steel-design',
    accent: 'from-orange-500/80 to-orange-600/80',
  },
  {
    title: 'RC Building Design',
    description: 'Multi-storey RC building design and detailing.',
    icon: Building2,
    to: '/workspace/rc-design',
    accent: 'from-purple-500/80 to-purple-600/80',
  },
  {
    title: 'Connection Design',
    description: 'Steel connection design and checks.',
    icon: Hammer,
    to: '/workspace/connection',
    accent: 'from-amber-500/80 to-amber-600/80',
  },
  {
    title: 'Dynamic Analysis',
    description: 'Modal and response-spectrum analysis.',
    icon: LineChart,
    to: '/workspace/dynamic',
    accent: 'from-cyan-500/80 to-cyan-600/80',
  },
  {
    title: 'Wind & Seismic Wizards',
    description: 'IS 875 wind and IS 1893 seismic load generators.',
    icon: Wind,
    to: '/tools/load-generators',
    accent: 'from-sky-500/80 to-sky-600/80',
  },
  {
    title: 'Section Library',
    description: 'Browse steel sections and material libraries.',
    icon: Factory,
    to: '/tools/section-library',
    accent: 'from-slate-500/80 to-slate-600/80',
  },
];

export default function FeaturesHub() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      <header className="border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-lg">
              BL
            </div>
            <div>
              <div className="text-lg font-semibold">BeamLab Ultimate</div>
              <div className="text-xs text-zinc-400">Feature Hub</div>
            </div>
          </div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-zinc-200 hover:text-white px-3 py-2 rounded-lg bg-zinc-800/70 border border-zinc-700"
          >
            <HomeIcon className="w-4 h-4" /> Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">All Features</h1>
          <p className="text-sm text-zinc-400">Jump directly into any workflow: modeling, design, loads, reporting.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.title}
                to={feature.to}
                className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/70 hover:border-zinc-700 transition-colors"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-0 group-hover:opacity-10 transition-opacity`} />
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold tracking-tight">{feature.title}</div>
                      <div className="text-xs text-zinc-400">{feature.description}</div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
