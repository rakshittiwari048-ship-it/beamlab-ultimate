import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Zap,
  BarChart3,
  FileText,
  Wind,
  Loader,
  Grid3x3,
  Wrench,
  BookOpen,
  Download,
  Share2,
  LineChart,
} from 'lucide-react';

// ============================================================================
// Data Structure
// ============================================================================

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'AI & Automation' | 'Analysis' | 'Design Codes' | 'Reporting';
  color: string;
}

const FEATURES: Feature[] = [
  // AI & Automation
  {
    id: 'ai-architect',
    title: 'AI Architect',
    description: 'Text-to-BIM generation from natural language',
    icon: Sparkles,
    category: 'AI & Automation',
    color: 'text-purple-500',
  },
  {
    id: 'auto-load',
    title: 'Auto-Load Generator',
    description: 'Automatic load case generation based on standards',
    icon: Zap,
    category: 'AI & Automation',
    color: 'text-yellow-500',
  },
  {
    id: 'smart-design',
    title: 'Smart Design',
    description: 'AI-assisted member sizing with optimization',
    icon: Wrench,
    category: 'AI & Automation',
    color: 'text-cyan-500',
  },

  // Analysis
  {
    id: 'fem-analysis',
    title: 'FEM Analysis Engine',
    description: 'Advanced finite element method solver',
    icon: Grid3x3,
    category: 'Analysis',
    color: 'text-blue-500',
  },
  {
    id: 'wind-analysis',
    title: 'Wind Load Analysis',
    description: 'Dynamic wind load calculation per IS 875',
    icon: Wind,
    category: 'Analysis',
    color: 'text-teal-500',
  },
  {
    id: 'stress-analysis',
    title: 'Stress & Deflection',
    description: 'Detailed stress distribution and deflection plots',
    icon: BarChart3,
    category: 'Analysis',
    color: 'text-red-500',
  },

  // Design Codes
  {
    id: 'lrfd-design',
    title: 'LRFD Design Code',
    description: 'Load & Resistance Factor Design per AISC',
    icon: BookOpen,
    category: 'Design Codes',
    color: 'text-green-500',
  },
  {
    id: 'asd-design',
    title: 'ASD Design Code',
    description: 'Allowable Stress Design methodology',
    icon: Loader,
    category: 'Design Codes',
    color: 'text-indigo-500',
  },
  {
    id: 'is-codes',
    title: 'Indian Standards',
    description: 'IS 800, IS 875 code compliance checker',
    icon: BookOpen,
    category: 'Design Codes',
    color: 'text-orange-500',
  },

  // Reporting
  {
    id: 'report-gen',
    title: 'Report Generator',
    description: 'Professional PDF reports with all analysis results',
    icon: FileText,
    category: 'Reporting',
    color: 'text-pink-500',
  },
  {
    id: 'data-export',
    title: 'Data Export',
    description: 'Export to CAD formats (DXF, STEP) and Excel',
    icon: Download,
    category: 'Reporting',
    color: 'text-amber-500',
  },
  {
    id: 'share-collab',
    title: 'Collaboration',
    description: 'Share projects and comments with team members',
    icon: Share2,
    category: 'Reporting',
    color: 'text-lime-500',
  },
];

const CATEGORIES = ['All', 'AI & Automation', 'Analysis', 'Design Codes', 'Reporting'] as const;

// ============================================================================
// Feature Card Component
// ============================================================================

interface FeatureCardProps {
  feature: Feature;
  index: number;
}

function FeatureCard({ feature, index }: FeatureCardProps) {
  const Icon = feature.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: 'easeOut',
      }}
      viewport={{ once: true, margin: '-100px' }}
      className="group h-full"
    >
      <div
        className={`
          h-full p-6 rounded-xl
          bg-zinc-900/50 backdrop-blur-md
          border border-zinc-800
          hover:border-blue-500/50
          transition-all duration-300
          hover:shadow-lg hover:shadow-blue-500/10
          cursor-pointer
          flex flex-col gap-4
        `}
      >
        {/* Icon Circle */}
        <div className="flex items-center justify-center">
          <div
            className={`
              p-3 rounded-full
              bg-blue-500/10 group-hover:bg-blue-500/20
              transition-all duration-300
            `}
          >
            <Icon className={`w-6 h-6 ${feature.color}`} />
          </div>
        </div>

        {/* Title & Description */}
        <div className="flex-grow">
          <h3 className="text-lg font-semibold text-white mb-2">
            {feature.title}
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {feature.description}
          </p>
        </div>

        {/* Launch Tool Button (appears on hover) */}
        <div className="flex items-center gap-2 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="text-sm font-medium">Launch Tool</span>
          <Sparkles className="w-4 h-4" />
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Capabilities Page Component
// ============================================================================

export default function Capabilities() {
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // Filter features based on active category
  const filteredFeatures =
    activeCategory === 'All'
      ? FEATURES
      : FEATURES.filter((feature) => feature.category === activeCategory);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Background gradient */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Engineering Superpowers
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Everything you need to analyze, design, and report.
          </p>
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`
                px-4 py-2 rounded-lg font-medium
                transition-all duration-300
                ${
                  activeCategory === category
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }
              `}
            >
              {category === 'All' ? 'All Features' : category}
            </button>
          ))}
        </motion.div>

        {/* Feature Grid */}
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredFeatures.map((feature, index) => (
            <FeatureCard key={feature.id} feature={feature} index={index} />
          ))}
        </motion.div>

        {/* Empty State */}
        {filteredFeatures.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-zinc-400 text-lg">
              No features found in this category.
            </p>
          </motion.div>
        )}

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <p className="text-zinc-400 mb-6">
            Ready to get started with BeamLab?
          </p>
          <button
            className={`
              px-8 py-3 rounded-lg font-semibold
              bg-gradient-to-r from-blue-600 to-cyan-600
              text-white
              hover:shadow-lg hover:shadow-blue-500/30
              transition-all duration-300
              transform hover:scale-105
            `}
          >
            Start Free Trial
          </button>
        </motion.div>
      </div>
    </div>
  );
}
