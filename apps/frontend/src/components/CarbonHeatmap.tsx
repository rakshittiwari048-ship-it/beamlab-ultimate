/**
 * CarbonHeatmap.tsx
 * 
 * Visualization components for embodied carbon analysis
 * 
 * Features:
 * - 3D heatmap coloring of members by carbon intensity
 * - Sustainability gauge (A+ to F rating)
 * - Carbon breakdown charts
 * - Material comparison
 */

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Leaf,
  TreeDeciduous,
  Factory,
  TrendingDown,
  TrendingUp,
  Info,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react';

// ============================================================================
// LOCAL TYPE DEFINITIONS
// ============================================================================

export interface SustainabilityRating {
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  label: string;
  color: string;
  ratio: number;
  description: string;
}

export interface MemberCarbonData {
  memberId: string;
  memberLabel?: string;
  materialType: string;
  length: number;
  area: number;
  volume: number;
  mass: number;
  embodiedCarbon: number;
  carbonIntensity: number;
  normalizedIntensity: number;
}

export interface CarbonSummary {
  totalEmbodiedCarbon: number;
  totalEmbodiedCarbonTonnes: number;
  byMaterial: Record<string, {
    mass: number;
    volume: number;
    embodiedCarbon: number;
    percentage: number;
  }>;
  carbonPerArea?: number;
  rating: SustainabilityRating;
  benchmark?: {
    buildingType: string;
    benchmarkValue: number;
    actualValue: number;
    percentOfBenchmark: number;
    category: 'excellent' | 'good' | 'average' | 'poor';
  };
  members: MemberCarbonData[];
  statistics: {
    minIntensity: number;
    maxIntensity: number;
    avgIntensity: number;
    totalMass: number;
    totalVolume: number;
  };
}

// ============================================================================
// INTERFACES
// ============================================================================

interface CarbonHeatmapProps {
  /** Carbon summary data from CarbonCalculator */
  carbonData: CarbonSummary;
  /** Callback when member is hovered */
  onMemberHover?: (memberId: string | null) => void;
  /** Callback when member is selected */
  onMemberSelect?: (memberId: string) => void;
  /** Currently selected member */
  selectedMemberId?: string;
  /** Show detailed breakdown */
  showDetails?: boolean;
}

interface MaterialData {
  mass: number;
  volume: number;
  embodiedCarbon: number;
  percentage: number;
}

interface SustainabilityGaugeProps {
  rating: SustainabilityRating;
  totalCarbon: number;
  carbonPerArea?: number;
  className?: string;
}

interface CarbonBreakdownProps {
  byMaterial: CarbonSummary['byMaterial'];
  totalCarbon: number;
}

interface MemberListProps {
  members: MemberCarbonData[];
  onMemberSelect?: (memberId: string) => void;
  selectedMemberId?: string;
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

/**
 * Get heatmap color based on normalized intensity (0-1)
 * Uses a gradient from light gray to dark charcoal/black
 */
export function getCarbonHeatmapColor(normalizedIntensity: number): string {
  // Clamp between 0 and 1
  const intensity = Math.max(0, Math.min(1, normalizedIntensity));
  
  // Gradient from light gray (#E5E7EB) to dark (#1F2937)
  const startR = 229, startG = 231, startB = 235;
  const endR = 31, endG = 41, endB = 55;
  
  const r = Math.round(startR + (endR - startR) * intensity);
  const g = Math.round(startG + (endG - startG) * intensity);
  const b = Math.round(startB + (endB - startB) * intensity);
  
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Get heatmap color as hex
 */
export function getCarbonHeatmapColorHex(normalizedIntensity: number): number {
  const intensity = Math.max(0, Math.min(1, normalizedIntensity));
  
  const startR = 229, startG = 231, startB = 235;
  const endR = 31, endG = 41, endB = 55;
  
  const r = Math.round(startR + (endR - startR) * intensity);
  const g = Math.round(startG + (endG - startG) * intensity);
  const b = Math.round(startB + (endB - startB) * intensity);
  
  return (r << 16) | (g << 8) | b;
}

// ============================================================================
// SUSTAINABILITY GAUGE COMPONENT
// ============================================================================

const RATING_POSITIONS: Record<string, number> = {
  'A+': 7,
  'A': 21,
  'B': 36,
  'C': 50,
  'D': 64,
  'E': 79,
  'F': 93,
};

export const SustainabilityGauge: React.FC<SustainabilityGaugeProps> = ({
  rating,
  totalCarbon,
  carbonPerArea,
  className = '',
}) => {
  const needlePosition = RATING_POSITIONS[rating.grade] || 50;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl shadow-lg border border-gray-200 p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-green-100 rounded-lg">
            <Leaf className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Sustainability Rating</h3>
            <p className="text-sm text-gray-500">Embodied Carbon Analysis</p>
          </div>
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          className="text-4xl font-bold"
          style={{ color: rating.color }}
        >
          {rating.grade}
        </motion.div>
      </div>

      {/* Gauge */}
      <div className="relative h-8 mb-4">
        {/* Gradient bar */}
        <div className="absolute inset-0 rounded-full overflow-hidden flex">
          <div className="flex-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-lime-400" />
          <div className="flex-1 bg-gradient-to-r from-lime-400 via-yellow-400 to-orange-400" />
          <div className="flex-1 bg-gradient-to-r from-orange-400 via-red-400 to-red-600" />
        </div>

        {/* Rating markers */}
        <div className="absolute inset-0 flex justify-between px-2 items-center">
          {['A+', 'A', 'B', 'C', 'D', 'E', 'F'].map((grade) => (
            <span
              key={grade}
              className={`text-xs font-medium ${
                grade === rating.grade ? 'text-white' : 'text-white/70'
              }`}
            >
              {grade}
            </span>
          ))}
        </div>

        {/* Needle indicator */}
        <motion.div
          initial={{ left: '50%' }}
          animate={{ left: `${needlePosition}%` }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 100 }}
          className="absolute top-full mt-1 -translate-x-1/2"
        >
          <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[12px] border-l-transparent border-r-transparent border-b-gray-800" />
        </motion.div>
      </div>

      {/* Rating description */}
      <div className="text-center mb-6 mt-6">
        <span
          className="inline-block px-3 py-1 rounded-full text-sm font-medium text-white"
          style={{ backgroundColor: rating.color }}
        >
          {rating.label}
        </span>
        <p className="text-sm text-gray-600 mt-2">{rating.description}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">
            {totalCarbon >= 1000
              ? `${(totalCarbon / 1000).toFixed(1)}t`
              : `${totalCarbon.toFixed(0)}kg`}
          </p>
          <p className="text-xs text-gray-500">Total CO₂e</p>
        </div>
        {carbonPerArea && (
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {carbonPerArea.toFixed(0)}
            </p>
            <p className="text-xs text-gray-500">kg CO₂e/m²</p>
          </div>
        )}
      </div>

      {/* Benchmark comparison */}
      {rating.ratio && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">vs. Benchmark</span>
            <span
              className={`font-medium flex items-center gap-1 ${
                rating.ratio <= 1 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {rating.ratio <= 1 ? (
                <TrendingDown className="w-4 h-4" />
              ) : (
                <TrendingUp className="w-4 h-4" />
              )}
              {((1 - rating.ratio) * 100).toFixed(0)}%{' '}
              {rating.ratio <= 1 ? 'below' : 'above'}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// ============================================================================
// CARBON BREAKDOWN COMPONENT
// ============================================================================

const MATERIAL_ICONS: Record<string, React.ReactNode> = {
  steel: <Factory className="w-4 h-4" />,
  concrete: <div className="w-4 h-4 bg-gray-400 rounded" />,
  rebar: <div className="w-4 h-4 border-2 border-gray-600 rounded" />,
  timber: <TreeDeciduous className="w-4 h-4" />,
};

const MATERIAL_COLORS: Record<string, string> = {
  steel: '#3B82F6',
  concrete: '#6B7280',
  rebar: '#8B5CF6',
  timber: '#22C55E',
  aluminum: '#F59E0B',
  masonry: '#EF4444',
};

export const CarbonBreakdown: React.FC<CarbonBreakdownProps> = ({
  byMaterial,
  totalCarbon,
}) => {
  const sortedMaterials = useMemo(() => {
    return Object.entries(byMaterial).sort(
      ([, a], [, b]) => (b as MaterialData).embodiedCarbon - (a as MaterialData).embodiedCarbon
    ) as [string, MaterialData][];
  }, [byMaterial]);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Carbon by Material</h3>

      <div className="space-y-4">
        {sortedMaterials.map(([material, data]) => (
          <div key={material}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span style={{ color: MATERIAL_COLORS[material] || '#6B7280' }}>
                  {MATERIAL_ICONS[material] || <div className="w-4 h-4 bg-gray-400 rounded-full" />}
                </span>
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {material}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-gray-900">
                  {data.embodiedCarbon >= 1000
                    ? `${(data.embodiedCarbon / 1000).toFixed(2)}t`
                    : `${data.embodiedCarbon.toFixed(0)}kg`}
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  ({data.percentage.toFixed(1)}%)
                </span>
              </div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${data.percentage}%` }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="h-full rounded-full"
                style={{ backgroundColor: MATERIAL_COLORS[material] || '#6B7280' }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>{data.mass.toFixed(0)} kg</span>
              <span>{data.volume.toFixed(3)} m³</span>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-900">Total Embodied Carbon</span>
          <span className="text-lg font-bold text-gray-900">
            {totalCarbon >= 1000
              ? `${(totalCarbon / 1000).toFixed(2)} tCO₂e`
              : `${totalCarbon.toFixed(0)} kgCO₂e`}
          </span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MEMBER LIST COMPONENT
// ============================================================================

export const MemberCarbonList: React.FC<MemberListProps> = ({
  members,
  onMemberSelect,
  selectedMemberId,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [sortBy, setSortBy] = useState<'carbon' | 'intensity'>('carbon');

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      if (sortBy === 'carbon') {
        return b.embodiedCarbon - a.embodiedCarbon;
      }
      return b.carbonIntensity - a.carbonIntensity;
    });
  }, [members, sortBy]);

  const displayMembers = expanded ? sortedMembers : sortedMembers.slice(0, 5);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Member Analysis</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('carbon')}
            className={`px-2 py-1 text-xs rounded ${
              sortBy === 'carbon'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            By Carbon
          </button>
          <button
            onClick={() => setSortBy('intensity')}
            className={`px-2 py-1 text-xs rounded ${
              sortBy === 'intensity'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            By Intensity
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {displayMembers.map((member) => (
          <motion.div
            key={member.memberId}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => onMemberSelect?.(member.memberId)}
            className={`p-3 rounded-lg cursor-pointer transition-colors ${
              selectedMemberId === member.memberId
                ? 'bg-blue-50 border border-blue-200'
                : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded"
                  style={{
                    backgroundColor: getCarbonHeatmapColor(member.normalizedIntensity),
                  }}
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {member.memberLabel || member.memberId}
                  </span>
                  <p className="text-xs text-gray-500 capitalize">
                    {member.materialType} • {member.length.toFixed(2)}m
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  {member.embodiedCarbon.toFixed(1)} kg
                </p>
                <p className="text-xs text-gray-500">
                  {member.carbonIntensity.toFixed(1)} kg/m
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {members.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-4 py-2 text-sm text-gray-600 hover:text-gray-900 flex items-center justify-center gap-1"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show all {members.length} members
            </>
          )}
        </button>
      )}
    </div>
  );
};

// ============================================================================
// RECOMMENDATIONS COMPONENT
// ============================================================================

interface CarbonRecommendation {
  id: string;
  title: string;
  description: string;
  potentialSavings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'material' | 'design' | 'optimization';
}

interface RecommendationsProps {
  carbonData: CarbonSummary;
}

export const CarbonRecommendations: React.FC<RecommendationsProps> = ({
  carbonData,
}) => {
  const recommendations = useMemo<CarbonRecommendation[]>(() => {
    const recs: CarbonRecommendation[] = [];

    // Check steel content
    if (carbonData.byMaterial.steel?.percentage > 50) {
      recs.push({
        id: 'recycled-steel',
        title: 'Use Recycled Steel',
        description: 'Switch to EAF steel with 95% recycled content to reduce steel emissions by up to 72%',
        potentialSavings: carbonData.byMaterial.steel.embodiedCarbon * 0.72,
        difficulty: 'easy',
        category: 'material',
      });
    }

    // Check concrete content
    if (carbonData.byMaterial.concrete?.percentage > 30) {
      recs.push({
        id: 'ggbs-concrete',
        title: 'Use GGBS Cement Replacement',
        description: 'Replace 50% of cement with GGBS to reduce concrete emissions by 35%',
        potentialSavings: carbonData.byMaterial.concrete.embodiedCarbon * 0.35,
        difficulty: 'medium',
        category: 'material',
      });
    }

    // General optimization
    if (carbonData.statistics.maxIntensity > carbonData.statistics.avgIntensity * 1.5) {
      recs.push({
        id: 'optimize-sections',
        title: 'Optimize High-Carbon Members',
        description: 'Some members have significantly higher carbon intensity. Consider section optimization.',
        potentialSavings: carbonData.totalEmbodiedCarbon * 0.1,
        difficulty: 'hard',
        category: 'optimization',
      });
    }

    // Timber alternative
    if (!carbonData.byMaterial.timber) {
      recs.push({
        id: 'timber-alternative',
        title: 'Consider Timber Elements',
        description: 'Timber has negative carbon footprint due to sequestration. Consider for secondary members.',
        potentialSavings: carbonData.totalEmbodiedCarbon * 0.15,
        difficulty: 'hard',
        category: 'design',
      });
    }

    return recs.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }, [carbonData]);

  const difficultyColors = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-red-100 text-red-700',
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Info className="w-5 h-5 text-blue-500" />
        <h3 className="font-semibold text-gray-900">Recommendations</h3>
      </div>

      {recommendations.length === 0 ? (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="w-5 h-5" />
          <span>Great job! Your design is already well optimized.</span>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900">{rec.title}</h4>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        difficultyColors[rec.difficulty]
                      }`}
                    >
                      {rec.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{rec.description}</p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-lg font-bold text-green-600">
                    -{rec.potentialSavings >= 1000
                      ? `${(rec.potentialSavings / 1000).toFixed(1)}t`
                      : `${rec.potentialSavings.toFixed(0)}kg`}
                  </p>
                  <p className="text-xs text-gray-500">potential savings</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Total potential savings */}
      {recommendations.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Potential Savings</span>
            <span className="font-bold text-green-600">
              Up to{' '}
              {(() => {
                const total = recommendations.reduce(
                  (sum, r) => sum + r.potentialSavings,
                  0
                );
                return total >= 1000
                  ? `${(total / 1000).toFixed(1)} tCO₂e`
                  : `${total.toFixed(0)} kgCO₂e`;
              })()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN HEATMAP DASHBOARD COMPONENT
// ============================================================================

export const CarbonHeatmapDashboard: React.FC<CarbonHeatmapProps> = ({
  carbonData,
  onMemberHover: _onMemberHover,
  onMemberSelect,
  selectedMemberId,
  showDetails = true,
}) => {
  return (
    <div className="space-y-6">
      {/* Top row: Gauge and Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SustainabilityGauge
          rating={carbonData.rating}
          totalCarbon={carbonData.totalEmbodiedCarbon}
          carbonPerArea={carbonData.carbonPerArea}
        />
        <CarbonBreakdown
          byMaterial={carbonData.byMaterial}
          totalCarbon={carbonData.totalEmbodiedCarbon}
        />
      </div>

      {/* Bottom row: Members and Recommendations */}
      {showDetails && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MemberCarbonList
            members={carbonData.members}
            onMemberSelect={onMemberSelect}
            selectedMemberId={selectedMemberId}
          />
          <CarbonRecommendations carbonData={carbonData} />
        </div>
      )}

      {/* Color Legend */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Carbon Intensity Heatmap Legend
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-4 rounded"
                style={{ backgroundColor: getCarbonHeatmapColor(0) }}
              />
              <span className="text-xs text-gray-500">Low</span>
            </div>
            <div
              className="w-32 h-4 rounded"
              style={{
                background: `linear-gradient(to right, ${getCarbonHeatmapColor(0)}, ${getCarbonHeatmapColor(0.5)}, ${getCarbonHeatmapColor(1)})`,
              }}
            />
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-4 rounded"
                style={{ backgroundColor: getCarbonHeatmapColor(1) }}
              />
              <span className="text-xs text-gray-500">High</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarbonHeatmapDashboard;
