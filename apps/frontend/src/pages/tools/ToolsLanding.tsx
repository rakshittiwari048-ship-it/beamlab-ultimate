/**
 * ToolsLanding.tsx
 * 
 * Free Engineering Calculators Landing Page
 * SEO-optimized public page with:
 * - Hero section with search
 * - Grid of free tools
 * - No authentication required
 */

import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import {
  Search,
  Calculator,
  Ruler,
  Wind,
  Box,
  Database,
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  Clock,
} from 'lucide-react';

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } 
  },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

// ============================================================================
// TOOL DATA
// ============================================================================

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
  bgColor: string;
  tags: string[];
  isNew?: boolean;
  comingSoon?: boolean;
}

const tools: Tool[] = [
  {
    id: 'beam-solver',
    name: '2D Beam Solver (Interactive)',
    description: 'Draw beams visually, add supports and loads by clicking. Get instant SFD, BMD, and deflection diagrams using FEM.',
    icon: Calculator,
    href: '/tools/beam-solver',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    tags: ['beam', 'solver', 'FEM', 'interactive', 'draw', 'SFD', 'BMD'],
    isNew: true,
  },
  {
    id: 'beam-calculator',
    name: 'Simple Beam Calculator',
    description: 'Calculate bending moments, shear forces, and deflections for simply supported, cantilever, and continuous beams.',
    icon: Calculator,
    href: '/tools/beam-calculator',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    tags: ['beam', 'moment', 'shear', 'deflection', 'bending'],
  },
  {
    id: 'section-library',
    name: 'Section Property Library',
    description: 'Browse and search steel sections with full geometric properties. IS, AISC, and European standards.',
    icon: Box,
    href: '/tools/section-library',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    tags: ['section', 'steel', 'property', 'ISMB', 'ISMC', 'I-beam'],
  },
  {
    id: 'section-database',
    name: 'Steel Section Database',
    description: 'Searchable AISC W-shapes and IS sections database with interactive 2D cross-section diagrams. Hover to highlight properties.',
    icon: Database,
    href: '/tools/section-database',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    tags: ['section', 'database', 'AISC', 'W14x90', 'ISMB', 'steel', 'cross-section'],
    isNew: true,
  },
  {
    id: 'unit-converter',
    name: 'Unit Converter',
    description: 'Convert between engineering units: force, length, stress, moment, and more. Quick and accurate.',
    icon: Ruler,
    href: '/tools/unit-converter',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    tags: ['unit', 'convert', 'kN', 'MPa', 'meter', 'feet', 'conversion'],
  },
  {
    id: 'wind-load',
    name: 'Wind Load Generator (IS 875)',
    description: 'Calculate design wind pressure as per IS 875 Part 3. Input terrain, building dimensions, and get Cp values.',
    icon: Wind,
    href: '/tools/wind-load',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    tags: ['wind', 'IS 875', 'pressure', 'terrain', 'load', 'Indian Standard'],
    isNew: true,
  },
  {
    id: 'load-generators',
    name: 'IS 875 & IS 1893 Calculators',
    description: 'Wind (Pz) and Seismic (Ah) load calculators with transparent formulas. Select city, zone, soil type and get instant results.',
    icon: Calculator,
    href: '/tools/load-generators',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    tags: ['IS 875', 'IS 1893', 'wind', 'seismic', 'Pz', 'Ah', 'base shear', 'earthquake'],
    isNew: true,
  },
];

// ============================================================================
// NAVBAR (Simplified for Tools)
// ============================================================================

function ToolsNavbar() {
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-600">BeamLab</span>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600 font-medium">Tools</span>
          </Link>

          {/* Right: CTA */}
          <div className="flex items-center gap-4">
            <Link
              to="/tools"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              All Tools
            </Link>
            <Link
              to="/dashboard"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Open Full App
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

// ============================================================================
// HERO SECTION
// ============================================================================

interface HeroSectionProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

function HeroSection({ searchQuery, onSearchChange }: HeroSectionProps) {
  return (
    <section className="bg-gradient-to-br from-gray-50 to-blue-50 py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center max-w-3xl mx-auto"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="mb-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
              <Sparkles className="w-4 h-4" />
              100% Free, No Sign-up Required
            </span>
          </motion.div>

          <motion.h1 
            variants={fadeInUp}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6"
          >
            Free Engineering
            <span className="text-blue-600"> Calculators</span>
          </motion.h1>

          <motion.p 
            variants={fadeInUp}
            className="text-lg md:text-xl text-gray-600 mb-10"
          >
            Quick, accurate tools for structural engineers. Calculate beam forces, 
            look up section properties, convert units, and generate wind loads.
          </motion.p>

          {/* Search Bar */}
          <motion.div variants={fadeInUp} className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="What do you need to calculate?"
              className="w-full pl-12 pr-4 py-4 text-lg bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            />
          </motion.div>

          {/* Quick Stats */}
          <motion.div 
            variants={fadeInUp}
            className="flex items-center justify-center gap-8 mt-10 text-sm text-gray-500"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Instant Results</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" />
              <span>Verified Calculations</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>No Registration</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// TOOL CARD
// ============================================================================

interface ToolCardProps {
  tool: Tool;
  index: number;
}

function ToolCard({ tool, index }: ToolCardProps) {
  const Icon = tool.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link
        to={tool.comingSoon ? '#' : tool.href}
        className={`group block bg-white rounded-2xl border border-gray-200 p-6 h-full transition-all duration-300 ${
          tool.comingSoon 
            ? 'opacity-60 cursor-not-allowed' 
            : 'hover:shadow-xl hover:border-gray-300 hover:-translate-y-1'
        }`}
      >
        {/* Icon */}
        <div className={`w-14 h-14 ${tool.bgColor} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
          <Icon className={`w-7 h-7 ${tool.color}`} />
        </div>

        {/* Title with Badge */}
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            {tool.name}
          </h3>
          {tool.isNew && (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              New
            </span>
          )}
          {tool.comingSoon && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
              Coming Soon
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-gray-600 mb-5 line-clamp-2">
          {tool.description}
        </p>

        {/* CTA */}
        {!tool.comingSoon && (
          <div className="flex items-center text-blue-600 font-medium text-sm group-hover:gap-2 transition-all">
            <span>Open Calculator</span>
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        )}
      </Link>
    </motion.div>
  );
}

// ============================================================================
// TOOLS GRID
// ============================================================================

interface ToolsGridProps {
  tools: Tool[];
}

function ToolsGrid({ tools }: ToolsGridProps) {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
          {tools.map((tool, index) => (
            <ToolCard key={tool.id} tool={tool} index={index} />
          ))}
        </div>

        {tools.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No tools match your search</p>
            <p className="text-gray-400 text-sm mt-1">Try a different keyword</p>
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================================
// CTA SECTION
// ============================================================================

function CTASection() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Need More Power?
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            Our full structural analysis platform handles complex 3D models, 
            steel design per IS 800, concrete design per IS 456, and much more.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/dashboard"
              className="px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
            >
              Try Full Platform
            </Link>
            <Link
              to="/pricing"
              className="px-8 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-400 transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FOOTER
// ============================================================================

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">BeamLab</span>
            <span className="text-gray-600">|</span>
            <span className="text-sm">Free Engineering Tools</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link to="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link to="/contact" className="hover:text-white transition-colors">
              Contact
            </Link>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm">
          © {new Date().getFullYear()} BeamLab. All calculations should be verified by a licensed engineer.
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ToolsLanding() {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter tools based on search
  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return tools;
    
    const query = searchQuery.toLowerCase();
    return tools.filter(tool => 
      tool.name.toLowerCase().includes(query) ||
      tool.description.toLowerCase().includes(query) ||
      tool.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  return (
    <>
      <Helmet>
        <title>Free Engineering Calculators | BeamLab Tools</title>
        <meta 
          name="description" 
          content="Free online engineering calculators for structural engineers. Beam calculator, section properties, unit converter, wind load generator per IS 875. No registration required." 
        />
        <meta 
          name="keywords" 
          content="beam calculator, section properties, unit converter, wind load, IS 875, structural engineering, free calculator" 
        />
        <link rel="canonical" href="https://beamlab.app/tools" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Free Engineering Calculators | BeamLab" />
        <meta property="og:description" content="Quick, accurate tools for structural engineers. Calculate beam forces, look up section properties, convert units, and more." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://beamlab.app/tools" />
        
        {/* Structured Data for SEO */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "BeamLab Engineering Tools",
            "description": "Free online engineering calculators for structural engineers",
            "applicationCategory": "UtilitiesApplication",
            "operatingSystem": "Web Browser",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            }
          })}
        </script>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-white">
        <ToolsNavbar />
        <main className="flex-1">
          <HeroSection searchQuery={searchQuery} onSearchChange={setSearchQuery} />
          <ToolsGrid tools={filteredTools} />
          <CTASection />
        </main>
        <Footer />
      </div>
    </>
  );
}
