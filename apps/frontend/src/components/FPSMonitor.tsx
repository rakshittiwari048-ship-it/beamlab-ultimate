import { FC, useEffect, useRef, useState } from 'react';
import { Activity } from 'lucide-react';

/**
 * FPSMonitor - Real-time frame rate display
 * 
 * Tracks rendering performance to ensure 10,000+ elements maintain target FPS
 * - Updates every 500ms to avoid UI thrashing
 * - Color-coded: green (60+ FPS), yellow (30-59 FPS), red (<30 FPS)
 * - Shows min/max/average stats
 */
export const FPSMonitor: FC = () => {
  const [fps, setFps] = useState(0);
  const [minFps, setMinFps] = useState(Infinity);
  const [maxFps, setMaxFps] = useState(0);
  const [avgFps, setAvgFps] = useState(0);
  const frameTimesRef = useRef<number[]>([]);
  const lastTimeRef = useRef(performance.now());
  const frameIdRef = useRef<number>();

  useEffect(() => {
    let frames = 0;
    let startTime = performance.now();
    const frameTimes: number[] = [];

    const measure = () => {
      frames++;
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      if (delta > 0) {
        const instantFps = 1000 / delta;
        frameTimes.push(instantFps);
        
        // Keep last 120 frames (2 seconds at 60 FPS)
        if (frameTimes.length > 120) {
          frameTimes.shift();
        }
      }

      // Update stats every 30 frames (~500ms)
      if (frames % 30 === 0) {
        const elapsed = now - startTime;
        const currentFps = Math.round((frames * 1000) / elapsed);
        
        setFps(currentFps);
        setMinFps(prev => Math.min(prev, currentFps));
        setMaxFps(prev => Math.max(prev, currentFps));
        
        if (frameTimes.length > 0) {
          const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
          setAvgFps(Math.round(avg));
        }

        // Reset counters
        frames = 0;
        startTime = now;
      }

      frameIdRef.current = requestAnimationFrame(measure);
    };

    frameIdRef.current = requestAnimationFrame(measure);

    return () => {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
    };
  }, []);

  const getFpsColor = (fpsValue: number) => {
    if (fpsValue >= 60) return 'text-green-500';
    if (fpsValue >= 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  const handleReset = () => {
    setMinFps(fps);
    setMaxFps(fps);
    setAvgFps(fps);
    frameTimesRef.current = [];
  };

  return (
    <div className="absolute top-4 right-4 bg-gray-900/90 text-white p-3 rounded-lg shadow-lg backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-2">
        <Activity size={16} className={getFpsColor(fps)} />
        <span className="text-xs font-semibold">Performance</span>
        <button
          onClick={handleReset}
          className="ml-auto text-xs text-gray-400 hover:text-white transition-colors"
          title="Reset stats"
        >
          Reset
        </button>
      </div>
      
      <div className="space-y-1 text-xs font-mono">
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Current:</span>
          <span className={getFpsColor(fps)}>{fps} FPS</span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Average:</span>
          <span className={getFpsColor(avgFps)}>{avgFps} FPS</span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Min:</span>
          <span className={getFpsColor(minFps)}>
            {minFps === Infinity ? '-' : minFps} FPS
          </span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Max:</span>
          <span className={getFpsColor(maxFps)}>{maxFps || '-'} FPS</span>
        </div>
      </div>
    </div>
  );
};
