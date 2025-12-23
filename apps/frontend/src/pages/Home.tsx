import { Helmet } from 'react-helmet-async';
import { NavLink } from 'react-router-dom';

export default function Home() {
  return (
    <div>
      <Helmet>
        <title>BeamLab Ultimate — Structural Analysis Platform</title>
        <meta name="description" content="Design and analyze steel structures with blazing-fast performance, interactive tools, and professional-grade results." />
        <meta property="og:title" content="BeamLab Ultimate" />
        <meta property="og:description" content="Design and analyze steel structures with blazing-fast performance and professional results." />
        <meta property="og:type" content="website" />
      </Helmet>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">Structural Analysis, Reimagined</h1>
            <p className="mt-4 text-lg text-gray-300">
              Model complex frames, run fast analyses, and export clean reports. Built for Indian structural engineers with local billing and UPI support.
            </p>
            <div className="mt-6 flex gap-4">
              <NavLink to="/app" className="btn-primary">Launch App</NavLink>
              <NavLink to="/pricing" className="btn-secondary">See Pricing</NavLink>
            </div>
            <div className="mt-4 text-sm text-gray-400">No install required. Runs in your browser.</div>
          </div>
          <div className="panel p-6">
            <div className="h-64 bg-gray-900 rounded-lg border border-gray-700 flex items-center justify-center">
              <span className="text-gray-400">Viewport Preview</span>
            </div>
            <ul className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <li className="panel p-4">Fast Eigen Solver</li>
              <li className="panel p-4">Interactive Tools</li>
              <li className="panel p-4">Steel Design Checks</li>
              <li className="panel p-4">Exportable Reports</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
