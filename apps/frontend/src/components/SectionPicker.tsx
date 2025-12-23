import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { X, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useSectionsStore, Section } from '../store/sections';

// ============================================================================
// SECTION PICKER MODAL
// ============================================================================

interface SectionPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (section: Section) => void;
  currentSectionId?: string;
}

export function SectionPicker({ isOpen, onClose, onSelect, currentSectionId }: SectionPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'depth' | 'weight' | 'area'>('depth');
  const [sortAsc, setSortAsc] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const searchSections = useSectionsStore(state => state.searchSections);
  const allSections = useSectionsStore(state => state.getAllSections);
  
  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);
  
  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);
  
  // Filter and sort sections
  const filteredSections = useMemo(() => {
    const sections = searchQuery ? searchSections(searchQuery) : allSections();
    
    return [...sections].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'depth':
          comparison = a.depth - b.depth;
          break;
        case 'weight':
          comparison = a.weight - b.weight;
          break;
        case 'area':
          comparison = a.area - b.area;
          break;
      }
      return sortAsc ? comparison : -comparison;
    });
  }, [searchQuery, sortBy, sortAsc, searchSections, allSections]);
  
  const handleSelect = useCallback((section: Section) => {
    onSelect(section);
    onClose();
  }, [onSelect, onClose]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);
  
  const toggleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(column);
      setSortAsc(false);
    }
  };
  
  const SortIcon = ({ column }: { column: typeof sortBy }) => {
    if (sortBy !== column) return null;
    return sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={handleKeyDown}
    >
      <div className="bg-gray-900 rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Select Section</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="px-4 py-3 border-b border-gray-700">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type ISMB, 300, ISWB..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Search by section type (ISMB, ISWB, ISLB, ISJB) or depth (e.g., "300")
          </p>
        </div>
        
        {/* Table Header */}
        <div className="grid grid-cols-6 gap-2 px-4 py-2 bg-gray-800 text-xs text-gray-400 font-medium border-b border-gray-700">
          <button
            onClick={() => toggleSort('name')}
            className="flex items-center gap-1 hover:text-white transition-colors text-left"
          >
            Section <SortIcon column="name" />
          </button>
          <button
            onClick={() => toggleSort('depth')}
            className="flex items-center gap-1 hover:text-white transition-colors text-right justify-end"
          >
            Depth (mm) <SortIcon column="depth" />
          </button>
          <div className="text-right">bf (mm)</div>
          <button
            onClick={() => toggleSort('area')}
            className="flex items-center gap-1 hover:text-white transition-colors text-right justify-end"
          >
            Area (mm²) <SortIcon column="area" />
          </button>
          <div className="text-right">Ixx (mm⁴)</div>
          <button
            onClick={() => toggleSort('weight')}
            className="flex items-center gap-1 hover:text-white transition-colors text-right justify-end"
          >
            Weight <SortIcon column="weight" />
          </button>
        </div>
        
        {/* Sections List */}
        <div className="flex-1 overflow-y-auto">
          {filteredSections.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              No sections match your search
            </div>
          ) : (
            filteredSections.map((section) => (
              <button
                key={section.id}
                onClick={() => handleSelect(section)}
                className={`w-full grid grid-cols-6 gap-2 px-4 py-2.5 text-sm hover:bg-gray-700 transition-colors border-b border-gray-800 ${
                  section.id === currentSectionId ? 'bg-blue-900/30 border-l-2 border-l-blue-500' : ''
                }`}
              >
                <span className="text-left font-medium text-white">{section.name}</span>
                <span className="text-right text-gray-300">{section.depth}</span>
                <span className="text-right text-gray-300">{section.flangeWidth}</span>
                <span className="text-right text-gray-300">{section.area}</span>
                <span className="text-right text-gray-300">{(section.Ixx / 1e6).toFixed(1)}×10⁶</span>
                <span className="text-right text-gray-400">{section.weight} kg/m</span>
              </button>
            ))
          )}
        </div>
        
        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-700 text-xs text-gray-500">
          {filteredSections.length} section{filteredSections.length !== 1 ? 's' : ''} • Click to select
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SECTION PREVIEW (Small inline preview)
// ============================================================================

interface SectionPreviewProps {
  sectionId: string;
  onClick?: () => void;
  className?: string;
}

export function SectionPreview({ sectionId, onClick, className = '' }: SectionPreviewProps) {
  const getSectionById = useSectionsStore(state => state.getSectionById);
  const section = getSectionById(sectionId);
  
  if (!section) {
    return (
      <button
        onClick={onClick}
        className={`flex items-center gap-2 px-3 py-1.5 bg-gray-700 rounded border border-gray-600 hover:border-gray-500 transition-colors ${className}`}
      >
        <span className="text-gray-400 text-sm">Select section...</span>
        <ChevronDown size={14} className="text-gray-500" />
      </button>
    );
  }
  
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 bg-gray-700 rounded border border-gray-600 hover:border-gray-500 transition-colors ${className}`}
    >
      <ISBeamIcon className="w-5 h-5 text-blue-400" />
      <span className="text-white text-sm font-medium">{section.name}</span>
      <span className="text-gray-400 text-xs">({section.depth} × {section.flangeWidth} mm)</span>
      <ChevronDown size={14} className="text-gray-500 ml-auto" />
    </button>
  );
}

// ============================================================================
// I-BEAM ICON (Simple SVG representation for IS Sections)
// ============================================================================

interface ISBeamIconProps {
  className?: string;
}

export function ISBeamIcon({ className = '' }: ISBeamIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      {/* I-beam cross section */}
      <rect x="2" y="2" width="20" height="3" rx="0.5" />  {/* Top flange */}
      <rect x="10" y="5" width="4" height="14" rx="0.5" /> {/* Web */}
      <rect x="2" y="19" width="20" height="3" rx="0.5" /> {/* Bottom flange */}
    </svg>
  );
}

export default SectionPicker;
