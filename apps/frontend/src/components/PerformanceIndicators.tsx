import { useEffect, useState } from 'react';
import { useModelStore, selectAllMembers, selectAllNodes } from '../store/model';
import { shouldShowPerformanceWarning, estimateMemoryUsage, PERFORMANCE_CONFIG } from '../utils/performanceConfig';

/**
 * Performance Warning Toast
 * Shows warnings when structure size may impact performance
 */
export const PerformanceWarning = () => {
  const members = useModelStore(selectAllMembers);
  const nodes = useModelStore(selectAllNodes);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [dismissed, setDismissed] = useState(false);
  
  useEffect(() => {
    const { show, message } = shouldShowPerformanceWarning(members.length, nodes.length);
    
    if (show && !dismissed) {
      setShowWarning(true);
      setWarningMessage(message);
      
      // Auto-dismiss after 10 seconds
      const timer = setTimeout(() => {
        setShowWarning(false);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
    
    return undefined;
  }, [members.length, nodes.length, dismissed]);
  
  if (!showWarning) return null;
  
  const memoryUsage = estimateMemoryUsage(members.length, nodes.length);
  
  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className="bg-amber-500 text-white rounded-lg shadow-lg p-4 animate-slide-in">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Performance Notice</h3>
            <p className="text-sm mb-2">{warningMessage}</p>
            <div className="text-xs opacity-90 space-y-1">
              <div>Members: {members.length} / Nodes: {nodes.length}</div>
              <div>Est. Memory: ~{memoryUsage} MB</div>
              <div>Rendering optimized automatically</div>
            </div>
          </div>
          <button
            onClick={() => {
              setShowWarning(false);
              setDismissed(true);
            }}
            className="flex-shrink-0 text-white hover:text-amber-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Analysis Progress Overlay
 * Shows progress indicator during long-running analysis
 */
interface AnalysisProgressProps {
  isAnalyzing: boolean;
  progress?: number; // 0-100
  message?: string;
}

export const AnalysisProgress = ({ isAnalyzing, progress, message }: AnalysisProgressProps) => {
  const [elapsed, setElapsed] = useState(0);
  
  useEffect(() => {
    if (!isAnalyzing) {
      setElapsed(0);
      return;
    }
    
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isAnalyzing]);
  
  if (!isAnalyzing) return null;
  
  const timeoutWarning = elapsed > PERFORMANCE_CONFIG.ANALYSIS.TIMEOUT_MS / 1000;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {/* Spinner */}
          <div className="inline-block relative w-16 h-16 mb-4">
            <div className="absolute border-4 border-purple-600 border-t-transparent rounded-full w-16 h-16 animate-spin"></div>
          </div>
          
          {/* Message */}
          <h3 className="text-xl font-semibold text-white mb-2">
            {message || 'Running Analysis...'}
          </h3>
          
          <p className="text-gray-400 mb-4">
            Please wait while we solve the structural system
          </p>
          
          {/* Progress Bar */}
          {progress !== undefined && (
            <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          )}
          
          {/* Elapsed Time */}
          <div className="text-sm text-gray-500">
            Elapsed: {elapsed}s
          </div>
          
          {/* Timeout Warning */}
          {timeoutWarning && (
            <div className="mt-4 text-amber-500 text-sm">
              ⚠️ Analysis taking longer than expected...
            </div>
          )}
          
          {/* Tips */}
          <div className="mt-6 text-left text-xs text-gray-500 space-y-1">
            <div>💡 Large structures may take 30-60 seconds</div>
            <div>💡 UI will remain frozen during analysis</div>
            <div>💡 Consider reducing structure size if too slow</div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Performance Stats Display
 * Shows real-time performance metrics (for debugging)
 */
interface PerformanceStatsProps {
  visible?: boolean;
}

export const PerformanceStats = ({ visible = false }: PerformanceStatsProps) => {
  const members = useModelStore(selectAllMembers);
  const nodes = useModelStore(selectAllNodes);
  const [fps, setFps] = useState(60);
  
  useEffect(() => {
    if (!visible) return;
    
    let frameCount = 0;
    let lastTime = performance.now();
    
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        setFps(Math.round(frameCount * 1000 / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    const rafId = requestAnimationFrame(measureFPS);
    return () => cancelAnimationFrame(rafId);
  }, [visible]);
  
  if (!visible) return null;
  
  const memoryUsage = estimateMemoryUsage(members.length, nodes.length);
  
  return (
    <div className="fixed bottom-4 right-4 z-40 bg-black bg-opacity-80 text-white p-3 rounded-lg text-xs font-mono space-y-1">
      <div>FPS: <span className={fps < 30 ? 'text-red-500' : 'text-green-500'}>{fps}</span></div>
      <div>Members: {members.length}</div>
      <div>Nodes: {nodes.length}</div>
      <div>Memory: ~{memoryUsage} MB</div>
    </div>
  );
};
