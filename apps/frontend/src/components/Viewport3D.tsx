import type { FC } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera } from '@react-three/drei';
import { Scene3D } from './Scene3D';
import { useEditorStore } from '../store/editorStore';
import { useMemo } from 'react';

export const Viewport3D: FC = () => {
  const toggleVibration = useEditorStore((s) => s.toggleVibration);
  const setVibrationAmplitude = useEditorStore((s) => s.setVibrationAmplitude);
  const activeModeIndex = useEditorStore((s) => s.activeModeIndex);
  const isVibrating = useEditorStore((s) => s.isVibrating);
  const vibrationAmplitude = useEditorStore((s) => s.vibrationAmplitude);
  const frequencyLabel = useEditorStore((s) => {
    const f = s.modalFrequenciesHz[s.activeModeIndex];
    return f ? f.toFixed(2) : '—';
  });

  const modeLabel = useMemo(() => `Mode ${activeModeIndex + 1}: ${frequencyLabel} Hz`, [activeModeIndex, frequencyLabel]);

  return (
    <div className="w-full h-full relative">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[10, 10, 10]} fov={50} />
        <OrbitControls makeDefault />
        
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={0.8}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <hemisphereLight args={['#ffffff', '#444444', 0.5]} />
        
        {/* Grid */}
        <Grid
          args={[20, 20]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#6b7280"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#9ca3af"
          fadeDistance={50}
          fadeStrength={1}
          infiniteGrid
        />
        
        {/* Scene content */}
        <Scene3D />
      </Canvas>

      {/* Dynamics UI */}
      <div className="absolute top-2 left-2 flex items-center gap-3 rounded bg-white/80 px-3 py-2 shadow text-sm text-gray-800 backdrop-blur">
        <button
          className="rounded bg-indigo-600 px-3 py-1 text-white shadow hover:bg-indigo-700"
          onClick={toggleVibration}
        >
          {isVibrating ? 'Pause' : 'Play'}
        </button>
        <span className="font-medium">{modeLabel}</span>
        <label className="flex items-center gap-2">
          <span>Amp</span>
          <input
            type="range"
            min={0}
            max={5}
            step={0.1}
            value={vibrationAmplitude}
            onChange={(e) => setVibrationAmplitude(Number(e.target.value))}
          />
          <span className="w-12 text-right">{vibrationAmplitude.toFixed(2)}</span>
        </label>
      </div>
    </div>
  );
};
