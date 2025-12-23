import { useMemo } from 'react';
import { Vector3 } from 'three';
import { useModelStore } from '../../store/model';

/**
 * ReactionRenderer
 * 
 * Visualizes solver support reactions as arrows at supported nodes.
 * Uses solverResult.nodalReactions (global directions).
 */
export const ReactionRenderer = () => {
  const solverResult = useModelStore((s) => s.solverResult);
  const nodes = useModelStore((s) => s.getAllNodes());
  const supports = useModelStore((s) => s.supports);

  const nodeMap = useMemo(() => {
    const m = new Map<string, { x: number; y: number; z: number }>();
    for (const n of nodes) m.set(n.id, { x: n.x, y: n.y, z: n.z });
    return m;
  }, [nodes]);

  const arrows = useMemo(() => {
    if (!solverResult) return [] as Array<{ key: string; origin: Vector3; dir: Vector3; length: number; color: string }>;

    const out: Array<{ key: string; origin: Vector3; dir: Vector3; length: number; color: string }> = [];

    for (const [nodeId, r] of solverResult.nodalReactions.entries()) {
      // Only show at supported nodes
      if (!supports.has(nodeId)) continue;

      const pos = nodeMap.get(nodeId);
      if (!pos) continue;

      const force = new Vector3(r.fx, r.fy, r.fz);
      const mag = force.length();
      if (mag < 1e-9) continue;

      const dir = force.clone().normalize();

      // Visual scaling: make arrows bigger for better visibility
      // Increased scale factor from 0.05 to 0.15 and max from 2 to 5
        const length = Math.min(2.5, Math.max(0.3, mag * 0.08));

      out.push({
        key: `R-${nodeId}`,
        origin: new Vector3(pos.x, pos.y, pos.z),
        dir,
        length,
        color: '#ff6b35', // brighter orange for better visibility
      });
    }

    return out;
  }, [solverResult, nodeMap, supports]);

  if (!solverResult || arrows.length === 0) return null;

  return (
    <group>
      {arrows.map((a) => (
        // Scale up arrow head for better visibility
        <arrowHelper
          key={a.key}
          args={[a.dir, a.origin, a.length, a.color]}
            scale={[1.2, 1.2, 1.2]}
        />
      ))}
    </group>
  );
};

export default ReactionRenderer;
