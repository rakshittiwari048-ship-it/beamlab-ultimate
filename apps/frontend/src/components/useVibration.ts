import { useFrame } from '@react-three/fiber';
import { useEditorStore } from '../store/editorStore';
import { Vector3 } from 'three';
import { RefObject, useMemo } from 'react';

/**
 * Hook to animate node positions with modal vibration.
 * Expects modal shapes to be stored per node in useEditorStore.modalShapesByNode.
 */
export function useVibration(
  nodeId: string,
  basePosition: { x: number; y: number; z: number },
  meshRef: RefObject<{ position: Vector3; updateMatrix?: () => void }>
): void {
  // Freeze base vector to avoid realloc each frame
  const baseVec = useMemo(() => new Vector3(basePosition.x, basePosition.y, basePosition.z), [basePosition.x, basePosition.y, basePosition.z]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const state = useEditorStore.getState();
    const modeIndex = state.activeModeIndex;
    const freq = state.modalFrequenciesHz[modeIndex] ?? 0;
    const shapes = state.modalShapesByNode.get(nodeId);
    const shape = shapes ? shapes[modeIndex] : undefined;
    const amplitude = state.vibrationAmplitude;
    const playing = state.isVibrating;

    const sine = playing && freq ? Math.sin(clock.elapsedTime * 2 * Math.PI * freq) : 0;

    const dx = (shape?.dx ?? 0) * amplitude * sine;
    const dy = (shape?.dy ?? 0) * amplitude * sine;
    const dz = (shape?.dz ?? 0) * amplitude * sine;

    mesh.position.set(baseVec.x + dx, baseVec.y + dy, baseVec.z + dz);
    if (typeof mesh.updateMatrix === 'function') {
      mesh.updateMatrix();
    }
  });
}