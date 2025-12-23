# 🖊️ Pen Tool - Interactive 3D Member Drawing System

**Location:** `apps/web/src/components/viewer/InteractionLayer.tsx`

A professional-grade interactive drawing tool for creating structural members in 3D space using React-Three-Fiber.

---

## 📋 Features

### ✅ Implemented

- **State Machine Architecture** - Clean IDLE → PLACING_START → PLACING_END flow
- **Real-time Ghost Preview** - Dashed line showing member before placement
- **Smart Grid Snapping** - Auto-snap to 0.5m grid intervals
- **Node Proximity Detection** - Snap to existing nodes within 0.2m threshold
- **Visual Feedback System**:
  - 🟢 Green sphere - Start node indicator
  - 🔴 Red ring - Snap to existing node indicator
  - ⚪ White sphere - Cursor position preview
  - 🔵 Blue dashed line - Ghost member preview (animated)
  - 🟠 Orange dashed line - Ghost member when snapped to node
- **Continuous Drawing Chain** - End node becomes next start node
- **Keyboard Shortcuts** - ESC to cancel drawing
- **Right-click Cancel** - Cancel drawing with right mouse button

---

## 🎯 State Machine

```
┌─────────────────────────────────────────────────────────┐
│                    DRAWING STATES                       │
└─────────────────────────────────────────────────────────┘

    IDLE
     │
     │ (Tool Activated)
     ├──────────────────────────────┐
     │                              │
     ▼                              │
PLACING_START                       │
     │                              │
     │ (Click 1 - Set Start)        │
     ▼                              │
PLACING_END                         │
     │                              │
     │ (Click 2 - Add Member)       │
     └──────────────────────────────┘
     │ (Continuous Chain)
     │
     ▼
PLACING_END (with new start)
```

**State Transitions:**

| Current State | Event | New State | Action |
|--------------|-------|-----------|--------|
| IDLE | Tool Activated | PLACING_START | Show cursor preview |
| PLACING_START | Click 1 | PLACING_END | Set start node, show green sphere |
| PLACING_END | Click 2 | PLACING_END | Create member, chain to next |
| Any | ESC / Right-click | IDLE | Cancel drawing |
| Any | Tool Deactivated | IDLE | Cleanup |

---

## 🔧 API Reference

### Component Props

```typescript
interface InteractionLayerProps {
  /** Existing nodes in the scene for snap detection */
  existingNodes?: Array<{ id: string; position: [number, number, number] }>;
  
  /** Callback when a new member is added */
  onAddMember?: (member: { 
    start: [number, number, number]; 
    end: [number, number, number] 
  }) => void;
  
  /** Whether the pen tool is active */
  isActive?: boolean;
  
  /** Grid snap interval in meters (default: 0.5) */
  gridSnapSize?: number;
  
  /** Node snap threshold in meters (default: 0.2) */
  nodeSnapThreshold?: number;
}
```

### Usage Example

```tsx
import InteractionLayer from './InteractionLayer';

function MyStructuralEditor() {
  const [nodes, setNodes] = useState([]);
  const [isPenActive, setIsPenActive] = useState(true);

  const handleAddMember = (memberData) => {
    console.log('New member:', memberData);
    // Add to your state/store
  };

  return (
    <Canvas>
      <InteractionLayer
        existingNodes={nodes}
        onAddMember={handleAddMember}
        isActive={isPenActive}
        gridSnapSize={0.5}      // 0.5m grid
        nodeSnapThreshold={0.2}  // Snap within 0.2m
      />
    </Canvas>
  );
}
```

---

## 🎨 Visual Feedback System

### Cursor States

| Visual | Condition | Meaning |
|--------|-----------|---------|
| ⚪ White sphere | Drawing active | Cursor position (grid snapped) |
| 🔴 White → Red sphere | Near existing node | Cursor will snap to node |
| 🔴 Red ring | Hovering over node | Snap indicator (0.15-0.25m radius) |
| 🟢 Green sphere | After first click | Start node placed |
| 🔵 Blue dashed line | Moving cursor | Ghost preview (animated dash) |
| 🟠 Orange dashed line | Snapped to node | Ghost preview while snapping |

### Animation Details

- **Dashed Line Flow**: Animated dash offset creates "marching ants" effect
- **Speed**: 2 units/second
- **Dash Pattern**: 0.3m dash, 0.15m gap
- **Color Transition**: Blue (normal) → Orange (snapped)

---

## 📐 Snapping Logic

### Priority System

```
1. Node Proximity Snap (Highest Priority)
   ├─ Check distance to all existing nodes
   ├─ If distance < nodeSnapThreshold (0.2m)
   └─ Snap to exact node position

2. Grid Snap (Fallback)
   ├─ Round to nearest gridSnapSize (0.5m)
   └─ Ensures alignment for structural analysis
```

### Grid Snapping Algorithm

```typescript
const snapToGrid = (value: number, gridSize: number): number => {
  return Math.round(value / gridSize) * gridSize;
};

// Example:
snapToGrid(3.7, 0.5)  // → 3.5
snapToGrid(3.8, 0.5)  // → 4.0
snapToGrid(2.25, 0.5) // → 2.5
```

### Node Proximity Detection

```typescript
const findNearbyNode = (
  cursorPos: Vector3,
  nodes: Array<{ position: [number, number, number] }>,
  threshold: number
): Vector3 | null => {
  for (const node of nodes) {
    const nodePos = new Vector3(...node.position);
    const distance = cursorPos.distanceTo(nodePos);
    
    if (distance < threshold) {
      return nodePos; // Snap to this node
    }
  }
  return null; // No nearby nodes
};
```

---

## 🎮 User Interactions

### Mouse Events

| Event | Action | Result |
|-------|--------|--------|
| **Click 1** | Set start node | Green sphere appears, enter PLACING_END |
| **Click 2** | Set end node | Create member, chain to next drawing |
| **Right-click** | Cancel drawing | Return to IDLE, clear state |
| **Mouse Move** | Update cursor | Show preview, check snapping |

### Keyboard Events

| Key | Action |
|-----|--------|
| **ESC** | Cancel drawing and return to IDLE |

### Continuous Drawing Chain

```
User clicks sequence:

Click 1 (0, 0, 0)  → Start Node A
Click 2 (5, 0, 0)  → Create Member A-B, B becomes new start
Click 3 (5, 0, 5)  → Create Member B-C, C becomes new start
Click 4 (0, 0, 5)  → Create Member C-D, D becomes new start
ESC                → Cancel, return to IDLE
```

This enables fast continuous drawing without needing to restart!

---

## 🧪 Testing & Validation

### Unit Tests (Recommended)

```typescript
describe('InteractionLayer', () => {
  test('snaps to grid correctly', () => {
    expect(snapToGrid(3.7, 0.5)).toBe(3.5);
    expect(snapToGrid(3.8, 0.5)).toBe(4.0);
  });

  test('finds nearby nodes', () => {
    const nodes = [{ position: [0, 0, 0] }];
    const cursor = new Vector3(0.1, 0, 0);
    const result = findNearbyNode(cursor, nodes, 0.2);
    expect(result).not.toBeNull();
  });

  test('prevents zero-length members', () => {
    const start = new Vector3(0, 0, 0);
    const end = new Vector3(0, 0, 0);
    expect(start.distanceTo(end)).toBeLessThan(0.01);
    // Should not create member
  });
});
```

### Manual Testing Checklist

- [ ] Click creates start node (green sphere appears)
- [ ] Moving mouse shows dashed preview line
- [ ] Second click creates member
- [ ] Member appears in scene after creation
- [ ] Continuous chaining works (no need to restart)
- [ ] Red ring appears when near existing nodes
- [ ] Cursor snaps to existing nodes within 0.2m
- [ ] Grid snapping works (0.5m intervals)
- [ ] ESC cancels drawing
- [ ] Right-click cancels drawing
- [ ] No zero-length members created
- [ ] Tool deactivates when `isActive={false}`

---

## 🎓 Advanced Customization

### Custom Grid Size

```tsx
<InteractionLayer
  gridSnapSize={1.0}  // 1 meter grid
/>
```

### Tighter Node Snapping

```tsx
<InteractionLayer
  nodeSnapThreshold={0.1}  // Snap within 0.1m
/>
```

### Custom Member Creation

```tsx
const handleAddMember = ({ start, end }) => {
  const member = {
    id: generateId(),
    start,
    end,
    section: { name: 'W12x26', area: 7.65 },
    material: { E: 29000, yield: 50 },
  };
  
  // Add to Zustand store
  addMemberToStore(member);
  
  // Validate connectivity
  validateStructure();
  
  // Trigger auto-save
  saveToLocalStorage();
};
```

---

## 🐛 Common Issues & Solutions

### Issue: Ghost line not appearing

**Cause:** Missing `Line` component from `@react-three/drei`

**Solution:**
```tsx
import { Line } from '@react-three/drei';
```

### Issue: Snapping not working

**Cause:** `existingNodes` prop not passed or wrong format

**Solution:**
```tsx
// Correct format
const nodes = [
  { id: 'n1', position: [0, 0, 0] },
  { id: 'n2', position: [5, 0, 0] },
];

<InteractionLayer existingNodes={nodes} />
```

### Issue: Members created at wrong height

**Cause:** Ground plane at wrong Y position

**Solution:**
```tsx
// In InteractionLayer.tsx, adjust ground plane
const groundPlane = useMemo(
  () => new Plane(new Vector3(0, 1, 0), 0), // Y=0 ground
  []
);
```

### Issue: Can't cancel drawing

**Cause:** Event listeners not attached

**Solution:** Check that `useEffect` properly attaches keyboard/mouse listeners

---

## 🚀 Performance Optimization

### Raycasting Optimization

```tsx
// Use throttle for mouse move events
import { throttle } from 'lodash';

const throttledUpdate = useMemo(
  () => throttle(updateCursorPosition, 16), // ~60fps
  []
);
```

### Node Search Optimization

For large structures (1000+ nodes), use spatial indexing:

```tsx
import { Octree } from 'three/examples/jsm/math/Octree';

// Build octree of nodes
const octree = useMemo(() => {
  const tree = new Octree();
  nodes.forEach(node => tree.insert(node.position));
  return tree;
}, [nodes]);

// Fast proximity search
const nearbyNodes = octree.search(cursorPos, nodeSnapThreshold);
```

---

## 📊 Integration with Stores

### Zustand Store Integration

```tsx
// In your store
interface ModelStore {
  members: StructuralMember[];
  nodes: StructuralNode[];
  addMember: (member: StructuralMember) => void;
  addNode: (node: StructuralNode) => void;
}

// In component
const { members, nodes, addMember, addNode } = useModelStore();

<InteractionLayer
  existingNodes={nodes}
  onAddMember={({ start, end }) => {
    const member = createMember(start, end);
    addMember(member);
    
    // Add nodes if they don't exist
    [start, end].forEach(pos => {
      if (!nodeExistsAt(pos, nodes)) {
        addNode(createNode(pos));
      }
    });
  }}
/>
```

---

## 📚 Related Components

- **[StructuralCanvas.tsx](./StructuralCanvas.tsx)** - Main 3D canvas wrapper
- **[PenToolExample.tsx](./PenToolExample.tsx)** - Complete working example
- **[Overlays.tsx](./Overlays.tsx)** - UI overlays and HUD

---

## 🎯 Next Steps

**Potential Enhancements:**

1. **Multi-plane drawing** - Draw on XY, XZ, YZ planes
2. **Dimension annotations** - Show length while drawing
3. **Angle snapping** - Snap to 0°, 45°, 90° angles
4. **Member properties dialog** - Set section immediately after drawing
5. **Undo/Redo** - Ctrl+Z support
6. **Touch support** - Mobile/tablet drawing
7. **Curved members** - Bezier curves for arches
8. **3D node placement** - Vertical drawing with height control

---

## 📄 License

MIT License - Part of BeamLab Ultimate

---

## 👨‍💻 Author

Senior Frontend Graphics Engineer  
BeamLab Development Team  
December 2025
