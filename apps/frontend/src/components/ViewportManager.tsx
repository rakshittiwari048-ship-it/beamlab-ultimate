import { useRef, useEffect, useState, forwardRef } from 'react';
import type { FC, MutableRefObject } from 'react';
import { Canvas } from '@react-three/fiber';
import { View, OrbitControls, MapControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import { useViewportStore, type ViewportType } from '../store/viewport';
import { SceneContent } from './SceneContent';
import { Maximize2, Grid2X2, Grid3x3 } from 'lucide-react';
import type { Tool } from './ToolSelector';
import { useAIGeneration } from './AIArchitectPanel';
import { AIGenerationOverlay } from './AIGenerationOverlay';

/**
 * ViewportContainer - Individual viewport panel
 */
interface ViewportContainerProps {
  type: ViewportType;
  label: string;
  isActive: boolean;
  isVisible: boolean;
  onClick: () => void;
}

const ViewportContainer = forwardRef<HTMLDivElement, ViewportContainerProps>(
  ({ type, label, isActive, isVisible, onClick }, ref) => {
    if (!isVisible) return null;

    return (
      <div
        ref={ref}
        onClick={onClick}
        className={`relative bg-gray-950 border-2 transition-colors cursor-pointer overflow-hidden ${
          isActive
            ? 'border-blue-500'
            : 'border-gray-800 hover:border-gray-700'
        }`}
        style={{ pointerEvents: 'auto' }}
      >
        {/* Viewport Label */}
        <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-gray-900/80 backdrop-blur-sm rounded text-xs font-semibold text-gray-300 pointer-events-none">
          {label}
        </div>

        {/* Active Indicator */}
        {isActive && (
          <div className="absolute top-2 right-2 z-10 w-2 h-2 bg-blue-500 rounded-full animate-pulse pointer-events-none" />
        )}

        {/* Viewport type indicator */}
        <div className="absolute bottom-2 right-2 z-10 text-gray-700 pointer-events-none">
          {type === '3D' ? (
            <Grid3x3 size={24} />
          ) : (
            <div className="text-xs font-mono font-bold">{type}</div>
          )}
        </div>
      </div>
    );
  }
);

ViewportContainer.displayName = 'ViewportContainer';

/**
 * ViewportManager - Multi-viewport CAD system
 * 
 * Features:
 * - Single Canvas with multiple View components for performance
 * - 3D Perspective view with orbit controls
 * - Top/Front/Right orthographic views with locked rotation
 * - CSS Grid layout for responsive viewport arrangement
 * - Active viewport highlighting
 * - Tool integration for mode-specific rendering
 */

interface ViewportManagerProps {
  activeTool: Tool;
}

export const ViewportManager: FC<ViewportManagerProps> = ({ activeTool }) => {
  const layout = useViewportStore((state) => state.layout);
  const setLayout = useViewportStore((state) => state.setLayout);
  const viewports = useViewportStore((state) => state.viewports);
  const activeViewport = useViewportStore((state) => state.activeViewport);
  const setActiveViewport = useViewportStore((state) => state.setActiveViewport);

  // AI Generation state from context
  const { isGenerating, generationMessage } = useAIGeneration();

  // Once mounted, trigger a rerender so the View components receive concrete refs.
  // Without this, the refs stay null for the initial render and the canvas never mounts.
  const [viewsReady, setViewsReady] = useState(false);
  useEffect(() => {
    setViewsReady(true);
  }, []);

  // Refs for each viewport div (required by View component)
  const view3DRef = useRef<HTMLDivElement>(null);
  const viewTopRef = useRef<HTMLDivElement>(null);
  const viewFrontRef = useRef<HTMLDivElement>(null);
  const viewRightRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative w-full h-full bg-gray-900">
      {/* AI Generation Overlay */}
      <AIGenerationOverlay isVisible={isGenerating} message={generationMessage} />

      {/* Layout Toggle Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={() => setLayout('SINGLE')}
          className={`p-2 rounded-lg transition-colors ${
            layout === 'SINGLE'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
          title="Single View"
        >
          <Maximize2 size={20} />
        </button>
        <button
          onClick={() => setLayout('QUAD')}
          className={`p-2 rounded-lg transition-colors ${
            layout === 'QUAD'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
          title="Quad View"
        >
          <Grid2X2 size={20} />
        </button>
      </div>

      {/* Viewport Grid Layout */}
      <div
        className={`w-full h-full ${
          layout === 'SINGLE'
            ? 'grid grid-cols-1 grid-rows-1'
            : 'grid grid-cols-2 grid-rows-2 gap-1'
        }`}
      >
        {/* 3D Perspective Viewport */}
        <ViewportContainer
          ref={view3DRef}
          type="3D"
          label={viewports['3D'].label}
          isActive={activeViewport === '3D'}
          isVisible={layout === 'SINGLE' || layout === 'QUAD'}
          onClick={() => setActiveViewport('3D')}
        />

        {/* Top Orthographic Viewport */}
        {layout === 'QUAD' && (
          <ViewportContainer
            ref={viewTopRef}
            type="TOP"
            label={viewports.TOP.label}
            isActive={activeViewport === 'TOP'}
            isVisible={true}
            onClick={() => setActiveViewport('TOP')}
          />
        )}

        {/* Front Orthographic Viewport */}
        {layout === 'QUAD' && (
          <ViewportContainer
            ref={viewFrontRef}
            type="FRONT"
            label={viewports.FRONT.label}
            isActive={activeViewport === 'FRONT'}
            isVisible={true}
            onClick={() => setActiveViewport('FRONT')}
          />
        )}

        {/* Right Orthographic Viewport */}
        {layout === 'QUAD' && (
          <ViewportContainer
            ref={viewRightRef}
            type="RIGHT"
            label={viewports.RIGHT.label}
            isActive={activeViewport === 'RIGHT'}
            isVisible={true}
            onClick={() => setActiveViewport('RIGHT')}
          />
        )}
      </div>

      {/* Single Canvas with Multiple Views */}
      <Canvas
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
        eventSource={document.getElementById('root')!}
        eventPrefix="client"
      >
        {/* 3D Perspective View */}
        {viewsReady && (layout === 'SINGLE' || layout === 'QUAD') && view3DRef.current && (
          <View track={view3DRef as unknown as MutableRefObject<HTMLElement>}>
            <PerspectiveCamera
              makeDefault
              position={viewports['3D'].camera.position}
              zoom={viewports['3D'].camera.zoom}
            />
            <OrbitControls
              enableRotate={viewports['3D'].controls.enableRotate}
              enablePan={viewports['3D'].controls.enablePan}
              enableZoom={viewports['3D'].controls.enableZoom}
            />
            <SceneContent viewportType="3D" activeTool={activeTool} />
          </View>
        )}

        {/* Top Orthographic View */}
        {viewsReady && layout === 'QUAD' && viewTopRef.current && (
          <View track={viewTopRef as unknown as MutableRefObject<HTMLElement>}>
            <OrthographicCamera
              makeDefault
              position={viewports.TOP.camera.position}
              zoom={viewports.TOP.camera.zoom}
              up={[0, 0, -1]}
              onUpdate={(camera) => camera.lookAt(0, 0, 0)}
            />
            <MapControls
              enableRotate={false}
              enablePan={viewports.TOP.controls.enablePan}
              enableZoom={viewports.TOP.controls.enableZoom}
              screenSpacePanning={true}
              target={[0, 0, 0]}
            />
            <SceneContent viewportType="TOP" activeTool={activeTool} />
          </View>
        )}

        {/* Front Orthographic View */}
        {viewsReady && layout === 'QUAD' && viewFrontRef.current && (
          <View track={viewFrontRef as unknown as MutableRefObject<HTMLElement>}>
            <OrthographicCamera
              makeDefault
              position={viewports.FRONT.camera.position}
              zoom={viewports.FRONT.camera.zoom}
              onUpdate={(camera) => camera.lookAt(0, 0, 0)}
            />
            <MapControls
              enableRotate={false}
              enablePan={viewports.FRONT.controls.enablePan}
              enableZoom={viewports.FRONT.controls.enableZoom}
              screenSpacePanning={true}
              target={[0, 0, 0]}
            />
            <SceneContent viewportType="FRONT" activeTool={activeTool} />
          </View>
        )}

        {/* Right Orthographic View */}
        {viewsReady && layout === 'QUAD' && viewRightRef.current && (
          <View track={viewRightRef as unknown as MutableRefObject<HTMLElement>}>
            <OrthographicCamera
              makeDefault
              position={viewports.RIGHT.camera.position}
              zoom={viewports.RIGHT.camera.zoom}
              onUpdate={(camera) => camera.lookAt(0, 0, 0)}
            />
            <MapControls
              enableRotate={false}
              enablePan={viewports.RIGHT.controls.enablePan}
              enableZoom={viewports.RIGHT.controls.enableZoom}
              screenSpacePanning={true}
              target={[0, 0, 0]}
            />
            <SceneContent viewportType="RIGHT" activeTool={activeTool} />
          </View>
        )}
      </Canvas>
    </div>
  );
};
