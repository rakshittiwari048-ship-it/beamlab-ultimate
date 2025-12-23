# SolverWorker Integration Guide

## Quick Start

This guide shows how to integrate the SolverWorker into your BeamLab frontend application.

## Step 1: Install Dependencies (if needed)

The worker uses the existing `@beamlab/analysis-engine` package. If you're in the `apps/web` directory and it's not configured, you may need to add it to the workspace dependencies.

Check your `apps/web/package.json`:

```json
{
  "dependencies": {
    "@beamlab/analysis-engine": "workspace:*",
    "@beamlab/types": "workspace:*"
  }
}
```

## Step 2: Import the Worker Client

```typescript
// In your analysis component or service
import { SolverWorkerClient, solveInWorker } from '@/workers';
```

## Step 3: Replace Main-Thread Solver

### Before (Blocking Main Thread)

```typescript
import { SparseSolver } from '@beamlab/analysis-engine';

async function runAnalysis() {
  // This blocks the UI!
  const solver = new SparseSolver({ nodes, members, supports });
  const K = solver.assembleSparse();
  const result = solver.solve(loads);
  
  return result;
}
```

### After (Non-Blocking Worker)

```typescript
import { solveInWorker } from '@/workers';

async function runAnalysis() {
  // This runs in a worker - UI stays responsive!
  const result = await solveInWorker(
    {
      nodes,
      members,
      supports,
      loads,
    },
    {
      onProgress: (data) => {
        console.log(`${data.stage}: ${data.progress}%`);
      },
    }
  );
  
  return result;
}
```

## Step 4: Add Progress UI

### React Component Example

```typescript
import React, { useState } from 'react';
import { solveInWorker } from '@/workers';
import type { ProgressMessage } from '@/workers';

function AnalysisPanel() {
  const [progress, setProgress] = useState<ProgressMessage['data'] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);

  const handleAnalyze = async () => {
    setIsRunning(true);
    setProgress(null);

    try {
      const analysisResult = await solveInWorker(
        {
          nodes: getNodes(),
          members: getMembers(),
          supports: getSupports(),
          loads: getLoads(),
        },
        {
          onProgress: (data) => {
            setProgress(data);
          },
        }
      );

      setResult(analysisResult);
      console.log('Analysis complete!', analysisResult);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div>
      <button onClick={handleAnalyze} disabled={isRunning}>
        {isRunning ? 'Running...' : 'Run Analysis'}
      </button>

      {progress && (
        <div className="mt-4">
          <div className="mb-2">
            <span className="font-medium">{progress.stage}</span>
            <span className="float-right">{progress.progress}%</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded h-2">
            <div
              className="bg-blue-500 h-2 rounded transition-all"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          
          <p className="text-sm text-gray-600 mt-1">{progress.message}</p>
        </div>
      )}

      {result && (
        <div className="mt-4">
          <h3>Results</h3>
          <p>Solver: {result.result.solverType}</p>
          <p>Time: {result.result.timing.total.toFixed(1)}ms</p>
          <p>Max Displacement: {Math.max(...result.displacements.map(Math.abs)).toFixed(6)}</p>
        </div>
      )}
    </div>
  );
}
```

## Step 5: Integrate with Zustand Store (Optional)

```typescript
// store/analysisStore.ts
import { create } from 'zustand';
import { SolverWorkerClient } from '@/workers';
import type { ProgressMessage } from '@/workers';

interface AnalysisStore {
  // Worker
  worker: SolverWorkerClient | null;
  
  // State
  progress: ProgressMessage['data'] | null;
  isAnalyzing: boolean;
  lastResult: any | null;
  error: string | null;
  
  // Actions
  initWorker: () => void;
  analyze: (modelData: any) => Promise<void>;
  clearResults: () => void;
  terminateWorker: () => void;
}

export const useAnalysisStore = create<AnalysisStore>((set, get) => ({
  worker: null,
  progress: null,
  isAnalyzing: false,
  lastResult: null,
  error: null,

  initWorker: () => {
    const worker = new SolverWorkerClient({
      onProgress: (data) => {
        set({ progress: data });
      },
    });
    set({ worker });
  },

  analyze: async (modelData) => {
    const { worker } = get();
    
    if (!worker) {
      get().initWorker();
    }

    set({ isAnalyzing: true, error: null, progress: null });

    try {
      const result = await get().worker!.solve(modelData);
      set({ lastResult: result, isAnalyzing: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : String(error),
        isAnalyzing: false,
      });
    }
  },

  clearResults: () => {
    set({ lastResult: null, progress: null, error: null });
  },

  terminateWorker: () => {
    const { worker } = get();
    if (worker) {
      worker.terminate();
      set({ worker: null });
    }
  },
}));

// Usage in component
function MyComponent() {
  const { analyze, progress, isAnalyzing, lastResult } = useAnalysisStore();

  return (
    <div>
      <button onClick={() => analyze(modelData)} disabled={isAnalyzing}>
        Analyze
      </button>
      {progress && <ProgressBar {...progress} />}
      {lastResult && <Results data={lastResult} />}
    </div>
  );
}
```

## Step 6: Vite Configuration

Ensure your `vite.config.ts` supports Web Workers:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es', // Use ES modules for workers
  },
  optimizeDeps: {
    exclude: ['@beamlab/analysis-engine'], // Prevent pre-bundling if needed
  },
});
```

## Step 7: TypeScript Configuration

Ensure workers are supported in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "lib": ["ES2020", "DOM", "WebWorker"],
    "module": "ESNext",
    "target": "ES2020"
  }
}
```

## Common Patterns

### Pattern 1: Single Analysis Button

```typescript
const handleSolve = async () => {
  const result = await solveInWorker({ nodes, members, supports, loads });
  updateVisualization(result);
};
```

### Pattern 2: Live Analysis (Debounced)

```typescript
import { debounce } from 'lodash';

const debouncedAnalyze = debounce(async (modelData) => {
  const result = await solveInWorker(modelData);
  updateResults(result);
}, 1000);

// Call whenever model changes
useEffect(() => {
  debouncedAnalyze({ nodes, members, supports, loads });
}, [nodes, members, supports, loads]);
```

### Pattern 3: Batch Analysis (Multiple Load Cases)

```typescript
const loadCases = [case1, case2, case3];

const results = await Promise.all(
  loadCases.map(loads =>
    solveInWorker({ nodes, members, supports, loads })
  )
);
```

### Pattern 4: Persistent Worker

```typescript
// Create once at app startup
const workerClient = new SolverWorkerClient();

// Use multiple times
const result1 = await workerClient.solve(data1);
const result2 = await workerClient.solve(data2);

// Clean up on unmount
workerClient.terminate();
```

## Performance Tips

1. **Use sparse solver for large models**: Set `forceSparse: true` for >500 nodes
2. **Reuse worker instance**: Don't create a new worker for each solve
3. **Monitor memory**: Large models may need garbage collection between solves
4. **Debounce live analysis**: Don't analyze on every keystroke
5. **Show progress**: Users are more patient when they see progress

## Testing

```typescript
import { describe, it, expect } from 'vitest';
import { solveInWorker } from '@/workers';

describe('SolverWorker', () => {
  it('should solve simple beam', async () => {
    const result = await solveInWorker({
      nodes: testNodes,
      members: testMembers,
      supports: testSupports,
      loads: testLoads,
    });

    expect(result.result.displacements).toBeDefined();
    expect(result.displacements.length).toBeGreaterThan(0);
  });

  it('should report progress', async () => {
    const progressUpdates: number[] = [];

    await solveInWorker(
      { nodes, members, supports, loads },
      {
        onProgress: (data) => {
          progressUpdates.push(data.progress);
        },
      }
    );

    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(Math.max(...progressUpdates)).toBe(100);
  });
});
```

## Troubleshooting

### Issue: "Worker failed to load"

**Cause**: Path resolution issue  
**Fix**: Check that the worker path in `useSolverWorker.ts` is correct:

```typescript
this.worker = new Worker(
  new URL('./SolverWorker.ts', import.meta.url),
  { type: 'module' }
);
```

### Issue: "Module not found: @beamlab/analysis-engine"

**Cause**: Package not linked in workspace  
**Fix**: Run `pnpm install` in the workspace root

### Issue: Worker is slow

**Cause**: Using dense solver for large models  
**Fix**: Force sparse solver:

```typescript
await solveInWorker({
  nodes,
  members,
  supports,
  loads,
  config: { forceSparse: true },
});
```

## Next Steps

1. Replace existing solver calls with worker-based calls
2. Add progress UI to your analysis panel
3. Test with large models (1000+ nodes)
4. Monitor performance improvements
5. Consider adding cancellation support

## Resources

- [SolverWorker API](./README.md)
- [Usage Examples](./examples.ts)
- [Web Workers MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [Transferable Objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects)
