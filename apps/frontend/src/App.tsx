import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import ModelAppModern from './ModelAppModern';  // Use modern CAD-style app
import ModernWorkspace from './layouts/ModernWorkspace';  // New IDE-style workspace

// Lazy-loaded pages
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Home = lazy(() => import('./pages/Home'));
const Pricing = lazy(() => import('./pages/Pricing'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Free Tools (SEO-optimized public pages)
const ToolsLanding = lazy(() => import('./pages/tools/ToolsLanding'));
const BeamCalculator = lazy(() => import('./pages/tools/BeamCalculator'));
const BeamSolver = lazy(() => import('./pages/tools/BeamSolver'));
const SectionLibrary = lazy(() => import('./pages/tools/SectionLibrary'));
const SectionDatabase = lazy(() => import('./pages/tools/SectionDatabase'));
const UnitConverter = lazy(() => import('./pages/tools/UnitConverter'));
const WindLoadGenerator = lazy(() => import('./pages/tools/WindLoadGenerator'));
const LoadGenerators = lazy(() => import('./pages/tools/LoadGenerators'));

const FeaturesHub = lazy(() => import('./pages/FeaturesHub'));
// Workspace sub-pages
const ModelingPage = lazy(() => import('./pages/workspace/Modeling'));
const PropertiesPage = lazy(() => import('./pages/workspace/Properties'));
const LoadingPage = lazy(() => import('./pages/workspace/Loading'));
const AnalysisPage = lazy(() => import('./pages/workspace/Analysis'));
const DesignPage = lazy(() => import('./pages/workspace/Design'));

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-white text-lg">Loading...</div>
      </div>
    </div>
  );
}

const App = () => {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Landing Page (SkyCiv-style marketing page) */}
            <Route path="/" element={<LandingPage />} />
            
            {/* Dashboard (Module Hub) */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/*" element={<Dashboard />} />
            
            {/* Main Modeling App - Full interactive canvas with analysis (Modern CAD Interface) */}
            <Route path="/workspace" element={<ModelAppModern />} />
            <Route path="/workspace/*" element={<ModelAppModern />} />
            {/* Workspace Sub-Pages */}
            <Route path="/workspace/modeling" element={<ModelingPage />} />
            <Route path="/workspace/properties" element={<PropertiesPage />} />
            <Route path="/workspace/loading" element={<LoadingPage />} />
            <Route path="/workspace/analysis" element={<AnalysisPage />} />
            <Route path="/workspace/design" element={<DesignPage />} />
            
            {/* New IDE-style workspace */}
            <Route path="/editor" element={<ModernWorkspace />} />
            
            {/* Legacy App route (direct access) */}
            <Route path="/app" element={<ModelAppModern />} />

            {/* Features hub */}
            <Route path="/features" element={<FeaturesHub />} />
            
            {/* Static pages */}
            <Route path="/home-old" element={<Home />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            
            {/* Free Tools (Public, SEO-optimized) */}
            <Route path="/tools" element={<ToolsLanding />} />
            <Route path="/tools/beam-calculator" element={<BeamCalculator />} />
            <Route path="/tools/beam-solver" element={<BeamSolver />} />
            <Route path="/tools/section-library" element={<SectionLibrary />} />
            <Route path="/tools/section-database" element={<SectionDatabase />} />
            <Route path="/tools/unit-converter" element={<UnitConverter />} />
            <Route path="/tools/wind-load" element={<WindLoadGenerator />} />
            <Route path="/tools/load-generators" element={<LoadGenerators />} />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </HelmetProvider>
  );
};

export default App;
