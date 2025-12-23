/**
 * SectionLibrary.tsx
 * 
 * Steel Section Property Library - Free Tool
 * Browse and search steel sections with full geometric properties.
 */

import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Box,
  Search,
  ChevronDown,
  Copy,
  Check,
  Filter,
} from 'lucide-react';

// ============================================================================
// SECTION DATA (Subset of IS sections for demo)
// ============================================================================

interface SteelSection {
  id: string;
  name: string;
  type: 'ISMB' | 'ISMC' | 'ISLB' | 'ISWB' | 'ISA';
  designation: string;
  depth: number;       // mm
  width: number;       // mm (flange or leg width)
  webThickness: number; // mm
  flangeThickness: number; // mm
  area: number;        // cm²
  Ixx: number;         // cm⁴ (major axis)
  Iyy: number;         // cm⁴ (minor axis)
  Zxx: number;         // cm³ (section modulus major)
  Zyy: number;         // cm³ (section modulus minor)
  rxx: number;         // cm (radius of gyration major)
  ryy: number;         // cm (radius of gyration minor)
  weight: number;      // kg/m
}

const sections: SteelSection[] = [
  // ISMB Sections
  { id: 'ismb100', name: 'ISMB 100', type: 'ISMB', designation: 'ISMB 100', depth: 100, width: 75, webThickness: 4.0, flangeThickness: 7.2, area: 14.6, Ixx: 257, Iyy: 40.8, Zxx: 51.5, Zyy: 10.9, rxx: 4.20, ryy: 1.67, weight: 11.5 },
  { id: 'ismb150', name: 'ISMB 150', type: 'ISMB', designation: 'ISMB 150', depth: 150, width: 80, webThickness: 4.8, flangeThickness: 7.6, area: 19.0, Ixx: 726, Iyy: 52.6, Zxx: 96.9, Zyy: 13.2, rxx: 6.18, ryy: 1.66, weight: 14.9 },
  { id: 'ismb200', name: 'ISMB 200', type: 'ISMB', designation: 'ISMB 200', depth: 200, width: 100, webThickness: 5.7, flangeThickness: 10.8, area: 32.3, Ixx: 2235, Iyy: 150, Zxx: 224, Zyy: 30.0, rxx: 8.32, ryy: 2.15, weight: 25.4 },
  { id: 'ismb250', name: 'ISMB 250', type: 'ISMB', designation: 'ISMB 250', depth: 250, width: 125, webThickness: 6.9, flangeThickness: 12.5, area: 47.6, Ixx: 5132, Iyy: 335, Zxx: 410, Zyy: 53.5, rxx: 10.4, ryy: 2.65, weight: 37.3 },
  { id: 'ismb300', name: 'ISMB 300', type: 'ISMB', designation: 'ISMB 300', depth: 300, width: 140, webThickness: 7.7, flangeThickness: 13.1, area: 56.3, Ixx: 8603, Iyy: 453, Zxx: 573, Zyy: 64.8, rxx: 12.4, ryy: 2.84, weight: 44.2 },
  { id: 'ismb350', name: 'ISMB 350', type: 'ISMB', designation: 'ISMB 350', depth: 350, width: 140, webThickness: 8.1, flangeThickness: 14.2, area: 66.7, Ixx: 13630, Iyy: 538, Zxx: 779, Zyy: 76.9, rxx: 14.3, ryy: 2.84, weight: 52.4 },
  { id: 'ismb400', name: 'ISMB 400', type: 'ISMB', designation: 'ISMB 400', depth: 400, width: 140, webThickness: 8.9, flangeThickness: 16.0, area: 78.5, Ixx: 20458, Iyy: 622, Zxx: 1023, Zyy: 88.9, rxx: 16.1, ryy: 2.82, weight: 61.6 },
  { id: 'ismb450', name: 'ISMB 450', type: 'ISMB', designation: 'ISMB 450', depth: 450, width: 150, webThickness: 9.4, flangeThickness: 17.4, area: 92.3, Ixx: 30391, Iyy: 834, Zxx: 1350, Zyy: 111, rxx: 18.2, ryy: 3.01, weight: 72.4 },
  { id: 'ismb500', name: 'ISMB 500', type: 'ISMB', designation: 'ISMB 500', depth: 500, width: 180, webThickness: 10.2, flangeThickness: 17.2, area: 110.7, Ixx: 45218, Iyy: 1370, Zxx: 1809, Zyy: 152, rxx: 20.2, ryy: 3.52, weight: 86.9 },
  { id: 'ismb600', name: 'ISMB 600', type: 'ISMB', designation: 'ISMB 600', depth: 600, width: 210, webThickness: 12.0, flangeThickness: 20.8, area: 156.2, Ixx: 91800, Iyy: 2650, Zxx: 3060, Zyy: 252, rxx: 24.2, ryy: 4.12, weight: 123 },
  
  // ISMC Channels
  { id: 'ismc75', name: 'ISMC 75', type: 'ISMC', designation: 'ISMC 75', depth: 75, width: 40, webThickness: 4.4, flangeThickness: 7.3, area: 8.67, Ixx: 76.0, Iyy: 12.5, Zxx: 20.3, Zyy: 4.77, rxx: 2.96, ryy: 1.20, weight: 6.8 },
  { id: 'ismc100', name: 'ISMC 100', type: 'ISMC', designation: 'ISMC 100', depth: 100, width: 50, webThickness: 5.0, flangeThickness: 7.7, area: 11.7, Ixx: 187, Iyy: 26.0, Zxx: 37.4, Zyy: 7.72, rxx: 4.00, ryy: 1.49, weight: 9.2 },
  { id: 'ismc150', name: 'ISMC 150', type: 'ISMC', designation: 'ISMC 150', depth: 150, width: 75, webThickness: 5.4, flangeThickness: 9.0, area: 20.9, Ixx: 779, Iyy: 103, Zxx: 104, Zyy: 19.4, rxx: 6.11, ryy: 2.22, weight: 16.4 },
  { id: 'ismc200', name: 'ISMC 200', type: 'ISMC', designation: 'ISMC 200', depth: 200, width: 75, webThickness: 6.2, flangeThickness: 11.4, area: 28.2, Ixx: 1830, Iyy: 141, Zxx: 183, Zyy: 26.3, rxx: 8.06, ryy: 2.24, weight: 22.1 },
  { id: 'ismc250', name: 'ISMC 250', type: 'ISMC', designation: 'ISMC 250', depth: 250, width: 80, webThickness: 7.1, flangeThickness: 14.1, area: 39.4, Ixx: 3817, Iyy: 211, Zxx: 306, Zyy: 36.2, rxx: 9.84, ryy: 2.31, weight: 30.9 },
  { id: 'ismc300', name: 'ISMC 300', type: 'ISMC', designation: 'ISMC 300', depth: 300, width: 90, webThickness: 7.8, flangeThickness: 13.6, area: 46.3, Ixx: 6362, Iyy: 310, Zxx: 424, Zyy: 46.2, rxx: 11.7, ryy: 2.59, weight: 36.3 },
  
  // ISLB Light Beams
  { id: 'islb150', name: 'ISLB 150', type: 'ISLB', designation: 'ISLB 150', depth: 150, width: 80, webThickness: 4.8, flangeThickness: 6.8, area: 16.4, Ixx: 565, Iyy: 44.6, Zxx: 75.4, Zyy: 11.2, rxx: 5.87, ryy: 1.65, weight: 12.9 },
  { id: 'islb200', name: 'ISLB 200', type: 'ISLB', designation: 'ISLB 200', depth: 200, width: 100, webThickness: 5.4, flangeThickness: 7.8, area: 24.2, Ixx: 1540, Iyy: 109, Zxx: 154, Zyy: 21.7, rxx: 7.98, ryy: 2.12, weight: 19.0 },
  { id: 'islb250', name: 'ISLB 250', type: 'ISLB', designation: 'ISLB 250', depth: 250, width: 125, webThickness: 6.1, flangeThickness: 8.2, area: 34.1, Ixx: 3717, Iyy: 215, Zxx: 297, Zyy: 34.5, rxx: 10.4, ryy: 2.51, weight: 26.8 },
  { id: 'islb300', name: 'ISLB 300', type: 'ISLB', designation: 'ISLB 300', depth: 300, width: 150, webThickness: 6.7, flangeThickness: 9.4, area: 44.2, Ixx: 7333, Iyy: 422, Zxx: 489, Zyy: 56.3, rxx: 12.9, ryy: 3.09, weight: 34.7 },
  
  // ISA Angles
  { id: 'isa50x50x5', name: 'ISA 50x50x5', type: 'ISA', designation: 'ISA 50×50×5', depth: 50, width: 50, webThickness: 5, flangeThickness: 5, area: 4.80, Ixx: 11.1, Iyy: 11.1, Zxx: 3.15, Zyy: 3.15, rxx: 1.52, ryy: 1.52, weight: 3.77 },
  { id: 'isa65x65x6', name: 'ISA 65x65x6', type: 'ISA', designation: 'ISA 65×65×6', depth: 65, width: 65, webThickness: 6, flangeThickness: 6, area: 7.53, Ixx: 28.6, Iyy: 28.6, Zxx: 6.19, Zyy: 6.19, rxx: 1.95, ryy: 1.95, weight: 5.91 },
  { id: 'isa75x75x8', name: 'ISA 75x75x8', type: 'ISA', designation: 'ISA 75×75×8', depth: 75, width: 75, webThickness: 8, flangeThickness: 8, area: 11.4, Ixx: 59.0, Iyy: 59.0, Zxx: 11.0, Zyy: 11.0, rxx: 2.28, ryy: 2.28, weight: 8.95 },
  { id: 'isa100x100x10', name: 'ISA 100x100x10', type: 'ISA', designation: 'ISA 100×100×10', depth: 100, width: 100, webThickness: 10, flangeThickness: 10, area: 19.0, Ixx: 177, Iyy: 177, Zxx: 24.8, Zyy: 24.8, rxx: 3.05, ryy: 3.05, weight: 14.9 },
];

const sectionTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'ISMB', label: 'ISMB (I-Beams)' },
  { value: 'ISMC', label: 'ISMC (Channels)' },
  { value: 'ISLB', label: 'ISLB (Light Beams)' },
  { value: 'ISA', label: 'ISA (Angles)' },
];

// ============================================================================
// NAVBAR
// ============================================================================

function ToolNavbar() {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <Link
              to="/tools"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">All Tools</span>
            </Link>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-2">
              <Box className="w-5 h-5 text-emerald-600" />
              <span className="font-semibold text-gray-900">Section Library</span>
            </div>
          </div>
          <Link
            to="/dashboard"
            className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Full App
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ============================================================================
// SECTION TABLE
// ============================================================================

interface SectionTableProps {
  sections: SteelSection[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function SectionTable({ sections, selectedId, onSelect }: SectionTableProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Section</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Depth</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Width</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Area</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">I<sub>xx</sub></th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Weight</th>
            </tr>
            <tr className="text-xs text-gray-400">
              <th className="px-4 pb-2 text-left"></th>
              <th className="px-4 pb-2 text-right">mm</th>
              <th className="px-4 pb-2 text-right">mm</th>
              <th className="px-4 pb-2 text-right">cm²</th>
              <th className="px-4 pb-2 text-right">cm⁴</th>
              <th className="px-4 pb-2 text-right">kg/m</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <tr
                key={section.id}
                onClick={() => onSelect(section.id)}
                className={`border-b border-gray-100 cursor-pointer transition-colors ${
                  selectedId === section.id
                    ? 'bg-emerald-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <td className="px-4 py-3 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 text-xs rounded ${
                      section.type === 'ISMB' ? 'bg-blue-100 text-blue-700' :
                      section.type === 'ISMC' ? 'bg-purple-100 text-purple-700' :
                      section.type === 'ISLB' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {section.type}
                    </span>
                    {section.designation}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-gray-600">{section.depth}</td>
                <td className="px-4 py-3 text-right text-gray-600">{section.width}</td>
                <td className="px-4 py-3 text-right text-gray-600">{section.area.toFixed(1)}</td>
                <td className="px-4 py-3 text-right text-gray-600">{section.Ixx.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-gray-600">{section.weight.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sections.length === 0 && (
        <div className="text-center py-12">
          <Box className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No sections match your search</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SECTION DETAIL PANEL
// ============================================================================

interface SectionDetailProps {
  section: SteelSection | null;
}

function SectionDetail({ section }: SectionDetailProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (value: string, field: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  if (!section) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <Box className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Select a section to view details</p>
        </div>
      </div>
    );
  }

  const properties = [
    { label: 'Depth (d)', value: section.depth, unit: 'mm' },
    { label: 'Width (b)', value: section.width, unit: 'mm' },
    { label: 'Web Thickness (tw)', value: section.webThickness, unit: 'mm' },
    { label: 'Flange Thickness (tf)', value: section.flangeThickness, unit: 'mm' },
    { label: 'Area (A)', value: section.area, unit: 'cm²' },
    { label: 'Moment of Inertia (Ixx)', value: section.Ixx, unit: 'cm⁴' },
    { label: 'Moment of Inertia (Iyy)', value: section.Iyy, unit: 'cm⁴' },
    { label: 'Section Modulus (Zxx)', value: section.Zxx, unit: 'cm³' },
    { label: 'Section Modulus (Zyy)', value: section.Zyy, unit: 'cm³' },
    { label: 'Radius of Gyration (rxx)', value: section.rxx, unit: 'cm' },
    { label: 'Radius of Gyration (ryy)', value: section.ryy, unit: 'cm' },
    { label: 'Weight per meter', value: section.weight, unit: 'kg/m' },
  ];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={section.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-white rounded-xl border border-gray-200 p-6"
      >
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{section.designation}</h2>
          <p className="text-gray-500">{section.type} Section (IS Standard)</p>
        </div>

        {/* Properties Grid */}
        <div className="space-y-3">
          {properties.map((prop) => (
            <div
              key={prop.label}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
            >
              <span className="text-sm text-gray-600">{prop.label}</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">
                  {typeof prop.value === 'number' ? prop.value.toLocaleString() : prop.value}
                </span>
                <span className="text-xs text-gray-400">{prop.unit}</span>
                <button
                  onClick={() => copyToClipboard(String(prop.value), prop.label)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Copy value"
                >
                  {copiedField === prop.label ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Section Diagram */}
        <div className="mt-6 bg-gray-50 rounded-xl p-4 flex items-center justify-center">
          {section.type === 'ISA' ? (
            <AngleDiagram section={section} />
          ) : (
            <IBeamDiagram section={section} />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// SECTION DIAGRAMS
// ============================================================================

function IBeamDiagram({ section }: { section: SteelSection }) {
  const scale = 0.8;
  const d = section.depth * scale;
  const b = section.width * scale;
  const tw = section.webThickness * scale * 3; // Exaggerate for visibility
  const tf = section.flangeThickness * scale * 2;

  return (
    <svg width="120" height="150" viewBox="-60 -75 120 150" className="overflow-visible">
      {/* Top flange */}
      <rect x={-b/2} y={-d/2} width={b} height={tf} fill="#3b82f6" />
      {/* Bottom flange */}
      <rect x={-b/2} y={d/2 - tf} width={b} height={tf} fill="#3b82f6" />
      {/* Web */}
      <rect x={-tw/2} y={-d/2 + tf} width={tw} height={d - 2*tf} fill="#60a5fa" />
      
      {/* Dimension lines */}
      <line x1={-b/2 - 15} y1={-d/2} x2={-b/2 - 15} y2={d/2} stroke="#94a3b8" strokeWidth="1" />
      <text x={-b/2 - 20} y="0" textAnchor="end" className="text-[10px] fill-gray-500">d</text>
      
      <line x1={-b/2} y1={d/2 + 15} x2={b/2} y2={d/2 + 15} stroke="#94a3b8" strokeWidth="1" />
      <text x="0" y={d/2 + 25} textAnchor="middle" className="text-[10px] fill-gray-500">b</text>
    </svg>
  );
}

function AngleDiagram({ section }: { section: SteelSection }) {
  const scale = 1;
  const a = section.depth * scale;
  const t = section.webThickness * scale * 2;

  return (
    <svg width="120" height="120" viewBox="-10 -10 120 120" className="overflow-visible">
      {/* Vertical leg */}
      <rect x="0" y="0" width={t} height={a} fill="#3b82f6" />
      {/* Horizontal leg */}
      <rect x="0" y={a - t} width={a} height={t} fill="#60a5fa" />
      
      {/* Dimension */}
      <text x={a/2} y={a + 15} textAnchor="middle" className="text-[10px] fill-gray-500">
        {section.depth}×{section.width}
      </text>
    </svg>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SectionLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredSections = useMemo(() => {
    return sections.filter(section => {
      const matchesSearch = searchQuery === '' ||
        section.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        section.designation.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = typeFilter === 'all' || section.type === typeFilter;
      
      return matchesSearch && matchesType;
    });
  }, [searchQuery, typeFilter]);

  const selectedSection = useMemo(() => 
    sections.find(s => s.id === selectedId) || null,
    [selectedId]
  );

  return (
    <>
      <Helmet>
        <title>Steel Section Property Library | IS ISMB ISMC | BeamLab</title>
        <meta
          name="description"
          content="Free steel section property database. Browse ISMB, ISMC, ISLB, ISA sections with full geometric properties: area, moment of inertia, section modulus, weight."
        />
        <meta
          name="keywords"
          content="steel section, ISMB, ISMC, section properties, moment of inertia, I-beam, channel, Indian Standard"
        />
        <link rel="canonical" href="https://beamlab.app/tools/section-library" />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <ToolNavbar />

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Steel Section Property Library
            </h1>
            <p className="text-gray-600">
              Browse Indian Standard steel sections with complete geometric properties.
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sections..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {sectionTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SectionTable
                sections={filteredSections}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
              <p className="text-sm text-gray-500 mt-3">
                Showing {filteredSections.length} of {sections.length} sections
              </p>
            </div>
            <div className="lg:col-span-1">
              <div className="sticky top-20">
                <SectionDetail section={selectedSection} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
