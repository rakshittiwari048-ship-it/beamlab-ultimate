/**
 * EnhancedViewport3D.tsx
 * 
 * Advanced 3D visualization enhancements:
 * - ViewCube for snap-to-view controls
 * - Gradient floor grid with infinite feel
 * - Soft shadows for realistic lighting
 * - Adaptive event handling for smooth 60FPS
 * - Member success pulse animations
 */

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  Grid,
  SoftShadows,
  Environment,
} from '@react-three/drei';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import * as THREE from 'three';

/**
 * ViewCube Component
 * Interactive cube in top-right corner for camera control
 */
interface ViewCubeProps {
  onViewChange?: (view: 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom' | 'iso') => void;
}

const ViewCube: React.FC<ViewCubeProps> = ({ onViewChange }) => {
  const viewOptions = [
    { label: 'Front', view: 'front' },
    { label: 'Back', view: 'back' },
    { label: 'Left', view: 'left' },
    { label: 'Right', view: 'right' },
    { label: 'Top', view: 'top' },
    { label: 'Bottom', view: 'bottom' },
    { label: 'ISO', view: 'iso' },
  ];

  return (
    <div className="absolute top-20 right-6 z-30 w-32">
      <div className="bg-surface/70 backdrop-blur-hud border border-border rounded-lg overflow-hidden">
        <div className="p-2 space-y-1">
          {viewOptions.map((opt) => (
            <motion.button
              key={opt.view}
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onViewChange?.(opt.view as any)}
              className={clsx(
                'w-full px-3 py-1.5 rounded text-xs font-medium',
                'text-muted hover:text-accent transition-colors duration-150',
                'bg-canvas/40 hover:bg-canvas/60'
              )}
            >
              {opt.label}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Enhanced Grid with Gradient Effect
 */
interface GradientGridProps {
  size?: number;
  divisions?: number;
  gridColor?: string;
}

const GradientGrid: React.FC<GradientGridProps> = ({
  size = 100,
  divisions = 20,
  gridColor = '#3f3f46',
}) => {
  const gridRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (gridRef.current) {
      // Subtle animation/scale based on camera distance
      const distance = state.camera.position.length();
      const scale = Math.min(distance / 50, 2);
      gridRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group ref={gridRef}>
      <Grid
        args={[size, divisions]}
        cellSize={size / divisions}
        cellColor={gridColor}
        sectionSize={size / 4}
        sectionColor={gridColor}
        fadeDistance={size * 1.5}
        fadeStrength={1}
        infiniteGrid
      />
    </group>
  );
};

/**
 * Enhanced 3D Scene with Soft Shadows
 */
interface Enhanced3DSceneProps {
  children?: React.ReactNode;
  showViewCube?: boolean;
  onViewChange?: (view: string) => void;
}

const Enhanced3DScene: React.FC<Enhanced3DSceneProps> = ({
  children,
  showViewCube = true,
  onViewChange,
}) => {
  const canvasRef = useRef<any>(null);

  return (
    <div className="w-full h-full relative">
      {/* 3D Canvas */}
      <Canvas
        ref={canvasRef}
        dpr={[1, 2]}
        performance={{ min: 0.5, max: 1, debounce: 200 }}
        gl={{
          antialias: true,
          alpha: true,
          precision: 'highp',
          powerPreference: 'high-performance',
        }}
        camera={{ position: [50, 50, 50], fov: 50, near: 0.1, far: 10000 }}
      >
        {/* Lighting & Rendering */}
        <SoftShadows size={25} samples={6} />
        <Environment preset="warehouse" />

        {/* Grid Floor */}
        <GradientGrid size={100} divisions={20} />

        {/* Orbit Controls */}
        <OrbitControls
          autoRotate={false}
          autoRotateSpeed={2}
          dampingFactor={0.05}
          enableDamping
          enablePan
          enableRotate
          enableZoom
        />

        {/* Scene Content */}
        {children}

        {/* Placeholder - Replace with actual model */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#0ea5e9" />
        </mesh>
      </Canvas>

      {/* ViewCube Control */}
      {showViewCube && <ViewCube onViewChange={onViewChange} />}
    </div>
  );
};

/**
 * Member Success Pulse Animation
 */
interface MemberPulseProps {
  position: [number, number, number];
  intensity?: number;
}

const MemberPulse: React.FC<MemberPulseProps> = ({ position, intensity = 1 }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      const scale = 1 + Math.sin(t * 3) * 0.1 * intensity;
      meshRef.current.scale.set(scale, scale, scale);
      const mat = meshRef.current.material as any;
      if (mat && mat.opacity !== undefined) {
        mat.opacity = Math.cos(t * 3) * 0.5 + 0.3;
      }
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.5, 8, 8]} />
      <meshStandardMaterial
        color="#22c55e"
        emissive="#22c55e"
        emissiveIntensity={0.5}
        transparent
        opacity={0.3}
      />
    </mesh>
  );
};

export { ViewCube, GradientGrid, Enhanced3DScene, MemberPulse };
