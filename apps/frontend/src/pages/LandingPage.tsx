/**
 * LandingPage.tsx
 * 
 * SkyCiv-style Landing Page for BeamLab
 * Clean, high-trust SaaS marketing page with:
 * - Sticky Navbar with clean layout
 * - Split-screen Hero with 3D placeholder
 * - Module Grid with hover lift effects
 * - Trust Signals with company logos
 */

import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import type { Variants } from 'framer-motion';
import {
  Menu,
  X,
  Box,
  PenTool,
  Layers,
  Columns,
  BarChart3,
  Puzzle,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Check,
  Play,
  Github,
  Twitter,
  Linkedin,
} from 'lucide-react';

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

// ============================================================================
// SECTION 1: NAVBAR (Sticky & Clean)
// ============================================================================

function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProductsOpen, setIsProductsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const productItems = [
    { label: 'Structural 3D', href: '/workspace/3d', description: 'Frame & truss analysis' },
    { label: 'Beam Tool', href: '/workspace/3d', description: 'Quick beam calculator' },
    { label: 'Section Builder', href: '/workspace/3d', description: 'Custom cross-sections' },
    { label: 'Foundation', href: '/workspace/foundation', description: 'Footing design' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-16 ${
        isScrolled ? 'bg-white shadow-sm' : 'bg-white'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full">
          {/* Left: Logo */}
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold text-blue-600">BeamLab</span>
          </Link>

          {/* Center: Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            {/* Products Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProductsOpen(!isProductsOpen)}
                onBlur={() => setTimeout(() => setIsProductsOpen(false), 150)}
                className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Products
                <ChevronDown className={`w-4 h-4 transition-transform ${isProductsOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isProductsOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50">
                  {productItems.map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-sm font-medium text-gray-900">{item.label}</div>
                      <div className="text-xs text-gray-500">{item.description}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <a href="#enterprise" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Enterprise
            </a>
            <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Pricing
            </a>
            <a href="#resources" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Resources
            </a>
          </div>

          {/* Right: Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/dashboard"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Login
            </Link>
            <Link
              to="/dashboard"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              Sign Up Free
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 py-4">
            <div className="flex flex-col gap-2">
              <a href="#modules" className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg">
                Products
              </a>
              <a href="#enterprise" className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg">
                Enterprise
              </a>
              <a href="#pricing" className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg">
                Pricing
              </a>
              <a href="#resources" className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg">
                Resources
              </a>
              <div className="border-t border-gray-100 mt-2 pt-4 px-4 space-y-2">
                <Link to="/dashboard" className="block py-2 text-gray-600">Login</Link>
                <Link
                  to="/dashboard"
                  className="block py-3 bg-blue-600 text-white text-center font-medium rounded-md"
                >
                  Sign Up Free
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

// ============================================================================
// SECTION 2: HERO (Split Screen)
// ============================================================================

function HeroSection() {
  return (
    <section className="pt-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column: Text */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.h1
              variants={fadeInUp}
              className="text-5xl font-extrabold text-gray-900 leading-tight"
            >
              Structural Analysis &amp; Design Software on the Cloud.
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-xl text-gray-500 mt-4"
            >
              Powerful, easy to use, and accessible from anywhere. No installation required.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="mt-8 flex flex-wrap gap-4"
            >
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button className="inline-flex items-center gap-3 px-6 py-3 border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold rounded-md transition-colors bg-white">
                <Play className="w-5 h-5 text-gray-500" />
                Book a Demo
              </button>
            </motion.div>
          </motion.div>

          {/* Right Column: Visual Placeholder */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* 3D Canvas Placeholder - React-Three-Fiber truss will mount here */}
            <div className="bg-gray-100 rounded-xl shadow-2xl h-96 flex items-center justify-center">
              {/* Animated SVG Truss Preview */}
              <svg className="w-full h-full p-8" viewBox="0 0 400 250">
                <defs>
                  <linearGradient id="heroGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#60A5FA" />
                  </linearGradient>
                </defs>

                {/* Supports */}
                <motion.polygon
                  points="40,200 55,220 25,220"
                  fill="#22C55E"
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ delay: 0.8 }}
                />
                <motion.polygon
                  points="360,200 375,220 345,220"
                  fill="#22C55E"
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ delay: 0.9 }}
                />

                {/* Bottom Chord */}
                <motion.line
                  x1="40" y1="200" x2="360" y2="200"
                  stroke="url(#heroGradient)" strokeWidth="4"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6 }}
                />

                {/* Top Chord */}
                <motion.line
                  x1="40" y1="100" x2="360" y2="100"
                  stroke="url(#heroGradient)" strokeWidth="4"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                />

                {/* Verticals */}
                {[40, 120, 200, 280, 360].map((x, i) => (
                  <motion.line
                    key={`v-${i}`}
                    x1={x} y1="100" x2={x} y2="200"
                    stroke="url(#heroGradient)" strokeWidth="3"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                  />
                ))}

                {/* Diagonals */}
                <motion.line x1="40" y1="100" x2="120" y2="200" stroke="#94A3B8" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.8 }} />
                <motion.line x1="120" y1="100" x2="200" y2="200" stroke="#94A3B8" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.9 }} />
                <motion.line x1="200" y1="100" x2="280" y2="200" stroke="#94A3B8" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1.0 }} />
                <motion.line x1="280" y1="100" x2="360" y2="200" stroke="#94A3B8" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1.1 }} />

                {/* Nodes */}
                {[[40, 100], [120, 100], [200, 100], [280, 100], [360, 100],
                  [40, 200], [120, 200], [200, 200], [280, 200], [360, 200]].map(([cx, cy], i) => (
                  <motion.circle
                    key={i}
                    cx={cx} cy={cy} r="5"
                    fill="#3B82F6"
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.05, type: 'spring', stiffness: 400 }}
                  />
                ))}

                {/* Load Arrow */}
                <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>
                  <line x1="200" y1="40" x2="200" y2="90" stroke="#EF4444" strokeWidth="2" />
                  <polygon points="200,95 195,80 205,80" fill="#EF4444" />
                  <text x="210" y="60" fill="#EF4444" fontSize="12" fontWeight="600">P</text>
                </motion.g>
              </svg>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SECTION 3: MODULE GRID (SkyCiv Signature with Hover Lift)
// ============================================================================

function ModuleGridSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const modules = [
    {
      icon: Box,
      title: 'Structural 3D',
      description: 'Full 3D frame and truss analysis with advanced FEM solver.',
      colorClasses: 'bg-blue-100 text-blue-500',
    },
    {
      icon: PenTool,
      title: 'Beam Tool',
      description: 'Quick beam calculations with moment, shear, and deflection diagrams.',
      colorClasses: 'bg-orange-100 text-orange-500',
    },
    {
      icon: Layers,
      title: 'Section Builder',
      description: 'Build custom cross-sections and calculate section properties.',
      colorClasses: 'bg-cyan-100 text-cyan-500',
    },
    {
      icon: Columns,
      title: 'RC Design',
      description: 'Reinforced concrete design per IS 456:2000 and ACI 318.',
      colorClasses: 'bg-green-100 text-green-500',
    },
    {
      icon: BarChart3,
      title: 'Steel Design',
      description: 'Steel member design to IS 800:2007, AISC 360, and Eurocode.',
      colorClasses: 'bg-rose-100 text-rose-500',
    },
    {
      icon: Puzzle,
      title: 'Connection',
      description: 'Steel connection design: base plates, end plates, and moment connections.',
      colorClasses: 'bg-purple-100 text-purple-500',
    },
  ];

  return (
    <section id="modules" ref={ref} className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="text-center mb-12"
        >
          <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold text-gray-900">
            Everything you need in one platform.
          </motion.h2>
          <motion.p variants={fadeInUp} className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Integrated modules for complete structural engineering workflow.
          </motion.p>
        </motion.div>

        {/* Module Grid */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12"
        >
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <motion.div
                key={module.title}
                variants={fadeInUp}
                className="group bg-white rounded-xl p-6 border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              >
                {/* Icon - Top Left */}
                <div className={`w-12 h-12 ${module.colorClasses} rounded-lg flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6" />
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {module.title}
                </h3>

                {/* Description */}
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  {module.description}
                </p>

                {/* Learn More Link */}
                <Link
                  to="/workspace"
                  className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Learn More
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// SECTION 4: TRUST SIGNALS
// ============================================================================

function TrustSignalsSection() {
  const companies = [
    'BuildCorp',
    'CivilEng',
    'StructPro',
    'DesignLab',
    'Apex Engineers',
  ];

  return (
    <section className="bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-medium text-gray-500 mb-8">
          Trusted by 500+ Engineers
        </p>
        <div className="flex flex-wrap justify-center items-center gap-12">
          {companies.map((company) => (
            <div
              key={company}
              className="text-lg font-semibold text-gray-400 opacity-50 grayscale"
            >
              {company}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// PRICING SECTION
// ============================================================================

function PricingSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const plans = [
    {
      name: 'Free',
      tagline: 'For Students & Learning',
      price: '₹0',
      period: 'forever',
      features: ['Up to 20 nodes', 'Basic static analysis', 'PDF export (watermarked)', 'Community support'],
      cta: 'Get Started',
      highlighted: false,
    },
    {
      name: 'Professional',
      tagline: 'For Freelancers',
      price: '₹999',
      period: '/month',
      features: ['Unlimited nodes', 'All analysis types', 'Clean PDF reports', 'All design modules', 'Priority support', 'Cloud storage'],
      cta: 'Start Free Trial',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      tagline: 'For Teams',
      price: 'Custom',
      period: '',
      features: ['Everything in Pro', 'API access', 'Team collaboration', 'SSO / SAML', 'Dedicated support', 'On-premise option'],
      cta: 'Contact Sales',
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" ref={ref} className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold text-gray-900">
            Simple, Transparent Pricing
          </motion.h2>
          <motion.p variants={fadeInUp} className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Start free, upgrade when you're ready. No hidden fees.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={fadeInUp}
              className={`rounded-2xl p-8 ${
                plan.highlighted
                  ? 'bg-blue-600 text-white ring-4 ring-blue-600 ring-offset-4'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <div className={`text-sm font-medium mb-1 ${plan.highlighted ? 'text-blue-200' : 'text-gray-500'}`}>
                {plan.tagline}
              </div>
              <h3 className={`text-2xl font-bold mb-4 ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                {plan.name}
              </h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className={`text-4xl font-extrabold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                  {plan.price}
                </span>
                <span className={plan.highlighted ? 'text-blue-200' : 'text-gray-500'}>
                  {plan.period}
                </span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className={`w-5 h-5 ${plan.highlighted ? 'text-blue-200' : 'text-green-500'}`} />
                    <span className={`text-sm ${plan.highlighted ? 'text-blue-100' : 'text-gray-600'}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                to="/dashboard"
                className={`block w-full py-3 text-center font-semibold rounded-lg transition-colors ${
                  plan.highlighted
                    ? 'bg-white text-blue-600 hover:bg-blue-50'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// FOOTER
// ============================================================================

function Footer() {
  const footerLinks = {
    Product: ['Structural 3D', 'Beam Tool', 'Section Builder', 'Steel Design', 'RC Design'],
    Resources: ['Documentation', 'API Reference', 'Tutorials', 'Blog', 'Changelog'],
    Company: ['About', 'Careers', 'Contact', 'Partners', 'Press'],
    Legal: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'],
  };

  return (
    <footer className="bg-gray-900 text-gray-400 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <span className="text-2xl font-bold text-white">BeamLab</span>
            <p className="mt-4 text-sm">
              Cloud-based structural analysis and design software for modern engineers.
            </p>
            <div className="flex gap-4 mt-6">
              <a href="#" className="hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-white font-semibold mb-4">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm hover:text-white transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm">© 2024 BeamLab. All rights reserved.</p>
          <p className="text-sm">Made with ❤️ for Structural Engineers</p>
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// MAIN LANDING PAGE COMPONENT
// ============================================================================

export default function LandingPage() {
  return (
    <>
      <Helmet>
        <title>BeamLab — Structural Analysis Software on the Cloud</title>
        <meta
          name="description"
          content="Cloud-based structural analysis and design software. Analyze frames, trusses, beams. Design steel and RC members. Works on any device."
        />
      </Helmet>

      <div className="min-h-screen">
        <Navbar />
        <HeroSection />
        <ModuleGridSection />
        <TrustSignalsSection />
        <PricingSection />
        <Footer />
      </div>
    </>
  );
}
