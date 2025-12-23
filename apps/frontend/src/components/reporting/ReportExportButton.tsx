/**
 * ReportExportButton.tsx
 * 
 * Example component showing how to use the useReportCapture hook
 * to generate and download PDF reports with 3D view and charts
 * 
 * Usage:
 * ```tsx
 * import ReportExportButton from './components/reporting/ReportExportButton';
 * 
 * <ReportExportButton 
 *   canvasRef={myCanvasRef}
 *   projectName="My Project"
 *   clientName="ABC Corp"
 * />
 * ```
 */

import React, { useState } from 'react';
import { useReportCapture } from './useReportCapture';
import type { ProjectData } from '../../services/ReportGenerator';

// ============================================================================
// INTERFACES
// ============================================================================

interface ReportExportButtonProps {
  /** Ref to the Three.js canvas element (optional - will auto-detect if not provided) */
  canvasRef?: React.RefObject<HTMLCanvasElement>;
  
  /** Project name for the report */
  projectName?: string;
  
  /** Client name (optional) */
  clientName?: string;
  
  /** Engineer name (optional) */
  engineerName?: string;
  
  /** Project description (optional) */
  description?: string;
  
  /** Array of chart element IDs to include in the report */
  chartIds?: string[];
  
  /** Button text (default: "Export PDF Report") */
  buttonText?: string;
  
  /** Button CSS classes */
  className?: string;
  
  /** Callback when report generation starts */
  onGenerateStart?: () => void;
  
  /** Callback when report generation completes */
  onGenerateComplete?: () => void;
  
  /** Callback when report generation fails */
  onGenerateError?: (error: Error) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Button component for generating and downloading PDF reports
 * Handles all capture and generation logic automatically
 */
export const ReportExportButton: React.FC<ReportExportButtonProps> = ({
  canvasRef,
  projectName = 'BeamLab Project',
  clientName,
  engineerName,
  description,
  chartIds = ['shear-diagram', 'moment-diagram', 'deflection-chart'],
  buttonText = '📄 Export PDF Report',
  className = '',
  onGenerateStart,
  onGenerateComplete,
  onGenerateError,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { generateFullReport } = useReportCapture();

  const handleExport = async () => {
    try {
      setIsGenerating(true);
      onGenerateStart?.();

      const projectData: ProjectData = {
        name: projectName,
        clientName,
        engineerName,
        description,
      };

      await generateFullReport(projectData, canvasRef, chartIds);

      onGenerateComplete?.();
    } catch (error) {
      console.error('Report generation failed:', error);
      onGenerateError?.(error as Error);
    } finally {
      setIsGenerating(false);
    }
  };

  const defaultClasses = `
    inline-flex items-center gap-2 px-4 py-2 
    bg-blue-600 hover:bg-blue-700 
    text-white font-medium rounded-lg 
    transition-colors duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
    shadow-sm hover:shadow-md
  `.trim().replace(/\s+/g, ' ');

  return (
    <button
      onClick={handleExport}
      disabled={isGenerating}
      className={className || defaultClasses}
      title="Generate and download a comprehensive PDF report"
    >
      {isGenerating ? (
        <>
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Generating...</span>
        </>
      ) : (
        <span>{buttonText}</span>
      )}
    </button>
  );
};

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: Basic usage in ResultsPanel
 */
export const ResultsPanelExample = () => {
  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Analysis Results</h3>
      
      {/* Your results content here */}
      
      <div className="mt-4">
        <ReportExportButton 
          projectName="Office Building - Level 3"
          clientName="ABC Construction"
          engineerName="John Doe, P.E."
        />
      </div>
    </div>
  );
};

/**
 * Example 2: Usage with Three.js Canvas ref
 */
export const CanvasIntegrationExample = () => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  
  return (
    <div>
      {/* Your Three.js Canvas component */}
      {/* <Canvas ref={canvasRef}>
        <mesh>...</mesh>
      </Canvas> */}
      
      <ReportExportButton 
        canvasRef={canvasRef}
        projectName="My Structure"
        chartIds={['shear-force', 'bending-moment', 'deflection']}
      />
    </div>
  );
};

/**
 * Example 3: Custom styled button with callbacks
 */
export const CustomStyledExample = () => {
  const [status, setStatus] = React.useState('');
  
  return (
    <div className="flex flex-col gap-2">
      <ReportExportButton
        projectName="Bridge Analysis"
        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full font-bold"
        buttonText="🚀 Generate Report"
        onGenerateStart={() => setStatus('Generating report...')}
        onGenerateComplete={() => setStatus('✅ Report downloaded!')}
        onGenerateError={(err) => setStatus(`❌ Error: ${err.message}`)}
      />
      
      {status && (
        <p className="text-sm text-gray-600">{status}</p>
      )}
    </div>
  );
};

/**
 * Example 4: Programmatic report generation (no button)
 */
export const ProgrammaticExample = () => {
  const { generateFullReport, isCapturing } = useReportCapture();
  
  React.useEffect(() => {
    // Auto-generate report when analysis completes
    // Uncomment to use:
    /*
    const generateOnAnalysisComplete = async () => {
      await generateFullReport({
        name: 'Auto-generated Report',
        description: 'Generated automatically after analysis',
      });
    };
    
    generateOnAnalysisComplete();
    */
  }, [generateFullReport]);
  
  return (
    <div>
      {isCapturing && <p>Capturing views...</p>}
    </div>
  );
};

export default ReportExportButton;
