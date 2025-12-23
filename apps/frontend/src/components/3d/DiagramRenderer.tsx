import { useMemo } from 'react';
import { BufferGeometry, Color, Vector3, Float32BufferAttribute } from 'three';
import { Line } from '@react-three/drei';
import { useModelStore } from '../../store/model';

interface DiagramRendererProps {
  memberId: string;
  type: 'MZ' | 'FY';
  scale: number; // visual scale factor (world units per kN/kN·m)
}

/**
 * Build a stable local basis for a member, similar to MembersRenderer alignment:
 * - dir (local Y): along member
 * - up (local Z): as close to world-up as possible
 * - right (local X): completes right-handed system
 */
function buildLocalBasis(start: Vector3, end: Vector3) {
  const dir = new Vector3().subVectors(end, start).normalize();
  const worldUp = new Vector3(0, 1, 0);
  const isVertical = Math.abs(dir.dot(worldUp)) > 0.999;
  const right = new Vector3();
  if (isVertical) {
    right.set(1, 0, 0).cross(dir).normalize();
    if (right.lengthSq() < 1e-6) right.set(0, 0, 1).cross(dir).normalize();
  } else {
    right.crossVectors(dir, worldUp).normalize();
  }
  const up = new Vector3().crossVectors(right, dir).normalize();
  return { dir, up, right };
}

/**
 * Color helper: blue for positive, red for negative, neutral gray near zero.
 */
function colorForValue(v: number) {
  const c = new Color();
  if (v > 1e-9) c.set('#3b82f6'); // blue
  else if (v < -1e-9) c.set('#ef4444'); // red
  else c.set('#94a3b8'); // slate gray
  return c;
}

export const DiagramRenderer = ({ memberId, type, scale }: DiagramRendererProps) => {
  const getMember = useModelStore((s) => s.getMember);
  const getNode = useModelStore((s) => s.getNode);
  const analysisResults = useModelStore((s) => s.analysisResults);

  const { spinePoints, offsetPoints, colors } = useMemo(() => {
    const member = getMember(memberId);
    if (!member) return { spinePoints: [], offsetPoints: [], colors: [] };
    const startNode = getNode(member.startNodeId);
    const endNode = getNode(member.endNodeId);
    if (!startNode || !endNode) return { spinePoints: [], offsetPoints: [], colors: [] };

    const start = new Vector3(startNode.x, startNode.y, startNode.z);
    const end = new Vector3(endNode.x, endNode.y, endNode.z);
    const { dir, up } = buildLocalBasis(start, end);

    // Pull precomputed diagram points
    const diagram = analysisResults?.memberDiagrams.get(memberId) ?? [];
    if (diagram.length === 0) return { spinePoints: [], offsetPoints: [], colors: [] };

    const spine: Vector3[] = [];
    const offs: Vector3[] = [];
    const cols: Color[] = [];

    for (const pnt of diagram) {
      const p = new Vector3().copy(start).addScaledVector(dir, pnt.x);
      spine.push(p);
      const value = type === 'MZ' ? pnt.Mz : pnt.Fy;
      const offset = new Vector3().copy(p).addScaledVector(up, value * scale);
      offs.push(offset);
      cols.push(colorForValue(value));
    }

    return { spinePoints: spine, offsetPoints: offs, colors: cols };
  }, [memberId, getMember, getNode, analysisResults, scale, type]);

  // Build geometry for filled strip between spine and offset
  const fillGeometry = useMemo(() => {
    if (spinePoints.length === 0 || offsetPoints.length === 0) return null;
    const geom = new BufferGeometry();

    // Triangle strip: two vertices per segment
    const positions: number[] = [];
    const colorsArr: number[] = [];

    for (let i = 0; i < spinePoints.length - 1; i++) {
      const a0 = spinePoints[i];
      const b0 = offsetPoints[i];
      const a1 = spinePoints[i + 1];
      const b1 = offsetPoints[i + 1];

      // First triangle (a0, b0, a1)
      positions.push(a0.x, a0.y, a0.z, b0.x, b0.y, b0.z, a1.x, a1.y, a1.z);
      const c0 = colors[i];
      colorsArr.push(c0.r, c0.g, c0.b, c0.r, c0.g, c0.b, c0.r, c0.g, c0.b);

      // Second triangle (b0, b1, a1)
      positions.push(b0.x, b0.y, b0.z, b1.x, b1.y, b1.z, a1.x, a1.y, a1.z);
      const c1 = colors[i + 1] || c0;
      colorsArr.push(c1.r, c1.g, c1.b, c1.r, c1.g, c1.b, c1.r, c1.g, c1.b);
    }

    geom.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geom.setAttribute('color', new Float32BufferAttribute(colorsArr, 3));
    geom.computeVertexNormals();
    return geom;
  }, [spinePoints, offsetPoints, colors]);

  if (spinePoints.length === 0) return null;

  return (
    <group>
      {/* Offset line with gradient colors */}
      <Line
        points={offsetPoints}
        vertexColors={colors}
        linewidth={2}
        transparent
        opacity={0.95}
      />

      {/* Spine line (neutral gray) */}
      <Line
        points={spinePoints}
        color="#94a3b8"
        linewidth={1}
        transparent
        opacity={0.6}
      />

      {/* Filled strip */}
      {fillGeometry && (
        <mesh geometry={fillGeometry}>
          <meshBasicMaterial vertexColors transparent opacity={0.25} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
};
