# SolverWorker Architecture Diagram

## High-Level Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         MAIN THREAD (UI)                             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────┐        ┌──────────────────────┐           │
│  │  React Component    │        │  Zustand Store       │           │
│  │  - UI Controls      │◄───────┤  - State Management  │           │
│  │  - Progress Bar     │        │  - Worker Client     │           │
│  │  - Results Display  │        └──────────────────────┘           │
│  └─────────────────────┘                    │                       │
│           │                                 │                       │
│           └─────────────────┬───────────────┘                       │
│                             │                                       │
│                             ▼                                       │
│                   ┌──────────────────────┐                          │
│                   │ SolverWorkerClient   │                          │
│                   │  - new Worker()      │                          │
│                   │  - postMessage()     │                          │
│                   │  - addEventListener()│                          │
│                   └──────────────────────┘                          │
│                             │                                       │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
                              │ postMessage({ type: 'solve', data })
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      WORKER THREAD (Compute)                         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────┐                                           │
│  │   SolverWorker.ts    │                                           │
│  │  - Message Handler   │                                           │
│  │  - Progress Sender   │                                           │
│  └──────────────────────┘                                           │
│             │                                                        │
│             ▼                                                        │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │               Processing Pipeline                       │       │
│  │                                                          │       │
│  │  1. Initialize (5%)                                     │       │
│  │     └─► Create SparseSolver instance                    │       │
│  │                                                          │       │
│  │  2. Assembly (5% → 45%)                                 │       │
│  │     ├─► Build sparse matrix (DOK)                       │       │
│  │     └─► Convert to CSR format                           │       │
│  │                                                          │       │
│  │  3. Solve (45% → 90%)                                   │       │
│  │     ├─► Apply boundary conditions                       │       │
│  │     ├─► Choose solver (CG vs LU)                        │       │
│  │     └─► Solve system (K·u = F)                          │       │
│  │                                                          │       │
│  │  4. Postprocess (90% → 100%)                            │       │
│  │     ├─► Calculate reactions                             │       │
│  │     ├─► Build nodal displacements                       │       │
│  │     └─► Create ArrayBuffers (transferable)              │       │
│  │                                                          │       │
│  └──────────────────────────────────────────────────────────┘       │
│             │                                                        │
│             │ postMessage({ type: 'progress' })  (multiple times)   │
│             │ postMessage({ type: 'result' }, [buffers])            │
│             │                                                        │
└─────────────┼────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         MAIN THREAD (UI)                             │
│                                                                      │
│  ┌──────────────────────┐                                           │
│  │ Progress Updates     │  (type: 'progress')                       │
│  │  ├─► Update UI       │  ─► UI stays responsive                   │
│  │  └─► Show progress   │  ─► User sees feedback                    │
│  └──────────────────────┘                                           │
│                                                                      │
│  ┌──────────────────────┐                                           │
│  │ Result Received      │  (type: 'result')                         │
│  │  ├─► Transferred     │  ─► Zero-copy ArrayBuffers                │
│  │  │   ArrayBuffers    │                                           │
│  │  ├─► Convert to      │  ─► Float64Array(buffer)                  │
│  │  │   TypedArrays     │                                           │
│  │  └─► Update UI       │  ─► Display results                       │
│  └──────────────────────┘                                           │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Data Flow - Transferable Objects

### Without Transferable (Copy)
```
Main Thread                         Worker Thread
┌────────────────┐                 ┌────────────────┐
│  Displacements │                 │  Displacements │
│   [6000 nums]  │ ─── Copy ────►  │   [6000 nums]  │
│   48 KB        │    (~20ms)      │   48 KB        │
└────────────────┘                 └────────────────┘
      │                                    │
      └─► Still in memory                 │
                                           │
          Total Memory: 96 KB             │
          Transfer Time: ~20ms            │
```

### With Transferable (Zero-Copy)
```
Main Thread                         Worker Thread
┌────────────────┐                 ┌────────────────┐
│  ArrayBuffer   │                 │  ArrayBuffer   │
│   [6000 nums]  │ ── Transfer ──► │   [6000 nums]  │
│   48 KB        │    (~0ms)       │   48 KB        │
└────────────────┘                 └────────────────┘
      │                                    │
      └─► EMPTY (ownership transferred)   │
                                           │
          Total Memory: 48 KB             │
          Transfer Time: ~0ms             │
```

## Message Flow Timeline

```
Time  Main Thread                    Worker Thread
─────────────────────────────────────────────────────────────
  0ms │ User clicks "Solve"
  1ms │ postMessage(solve)        ──►
  2ms │                                Receive message
  5ms │                                Initialize (5%)
  6ms │ ◄── onProgress(5%)
 10ms │                                Start assembly
 15ms │ ◄── onProgress(10%)
 50ms │ ◄── onProgress(25%)
100ms │ ◄── onProgress(45%)
      │                                Start solving
150ms │ ◄── onProgress(60%)
200ms │ ◄── onProgress(75%)
250ms │ ◄── onProgress(90%)
      │                                Create buffers
280ms │ ◄── onProgress(95%)
300ms │ ◄── postMessage(result)       Transfer buffers
301ms │ Receive ArrayBuffers
      │ Convert to Float64Array
      │ Update UI
      │ ✓ Complete!
```

## Component Integration

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
│  │   Model      │   │   Analysis   │   │   Results    │   │
│  │   Editor     │──►│   Panel      │──►│   Viewer     │   │
│  └──────────────┘   └──────┬───────┘   └──────────────┘   │
│                            │                               │
└────────────────────────────┼───────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                     Worker Layer                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────┐      │
│  │         SolverWorkerClient (Singleton)           │      │
│  │                                                  │      │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐│      │
│  │  │   Worker   │  │   Worker   │  │   Worker   ││      │
│  │  │  Instance  │  │  Instance  │  │  Instance  ││      │
│  │  │  (Pool)    │  │  (Pool)    │  │  (Pool)    ││      │
│  │  └────────────┘  └────────────┘  └────────────┘│      │
│  │                                                  │      │
│  └──────────────────────────────────────────────────┘      │
│                             │                               │
└─────────────────────────────┼───────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  Analysis Engine Layer                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────┐    ┌────────────────┐                  │
│  │ SparseSolver   │    │ MatrixUtils    │                  │
│  │ - assembleSparse│    │ - Local K      │                  │
│  │ - solve        │    │ - Transform    │                  │
│  └────────────────┘    └────────────────┘                  │
│                                                             │
│  ┌────────────────┐    ┌────────────────┐                  │
│  │ SparseMatrix   │    │ CG Solver      │                  │
│  │ - DOK          │    │ - Iterative    │                  │
│  │ - CSR          │    │ - Precondition │                  │
│  └────────────────┘    └────────────────┘                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## State Management (Zustand)

```
┌─────────────────────────────────────────────────────────────┐
│                    Global Store                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  State:                                                     │
│  ┌─────────────────────────────────────────────────┐       │
│  │ worker: SolverWorkerClient | null              │       │
│  │ progress: ProgressData | null                  │       │
│  │ isAnalyzing: boolean                           │       │
│  │ lastResult: SolverResponse | null              │       │
│  │ error: string | null                           │       │
│  └─────────────────────────────────────────────────┘       │
│                                                             │
│  Actions:                                                   │
│  ┌─────────────────────────────────────────────────┐       │
│  │ initWorker()                                    │       │
│  │ analyze(modelData)                              │       │
│  │ clearResults()                                  │       │
│  │ terminateWorker()                               │       │
│  └─────────────────────────────────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
              │                │              │
              ▼                ▼              ▼
     ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
     │  Component A │  │  Component B │  │  Component C │
     │  (Model)     │  │  (Progress)  │  │  (Results)   │
     └──────────────┘  └──────────────┘  └──────────────┘
```

## Performance Comparison

```
WITHOUT WORKER (Main Thread Blocking)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Time: 0ms                              300ms
      └────────────────┬────────────────┘
                       │
                  UI FROZEN
              (No user input)
              (No animations)
              (No feedback)


WITH WORKER (Separate Thread)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Main:  │ UI ◄─► User │ UI ◄─► User │ UI ◄─► User │
       ├─────────────┼─────────────┼─────────────┤
Worker: └─ Assemble ─┴─── Solve ───┴── Results ──┘
       0ms          100ms         200ms         300ms
                       │
              UI STAYS RESPONSIVE
              Progress updates shown
              User can interact
```

## File Structure

```
apps/web/src/workers/
├── SolverWorker.ts        (248 lines) - Worker implementation
├── useSolverWorker.ts     (296 lines) - Client API & React hook
├── index.ts               (27 lines)  - Module exports
├── examples.ts            (279 lines) - Usage examples
├── README.md              (387 lines) - API documentation
└── INTEGRATION.md         (419 lines) - Integration guide
                          ────────────
                          1,656 lines total
```

## Key Benefits Summary

```
┌────────────────────┬─────────────┬─────────────┐
│      Metric        │   Before    │    After    │
├────────────────────┼─────────────┼─────────────┤
│ UI Responsiveness  │  Blocked    │  Smooth     │
│ User Feedback      │  None       │  Progress   │
│ Large Models       │  Crashes    │  Handles    │
│ Memory Efficiency  │  2x copy    │  Zero-copy  │
│ Transfer Time      │  20ms       │  ~0ms       │
│ CPU Usage          │  100% (1c)  │  Distributed│
└────────────────────┴─────────────┴─────────────┘
```

## Technology Stack

```
┌─────────────────────────────────────────────────┐
│ Web Workers API (Native Browser)                │
│  - Separate thread execution                    │
│  - postMessage() communication                  │
│  - Transferable Objects (ArrayBuffer)           │
└─────────────────────────────────────────────────┘
                     │
┌─────────────────────────────────────────────────┐
│ TypeScript                                      │
│  - Strong typing                                │
│  - Interface definitions                        │
│  - Type-safe message passing                    │
└─────────────────────────────────────────────────┘
                     │
┌─────────────────────────────────────────────────┐
│ @beamlab/analysis-engine                        │
│  - SparseSolver (DOK → CSR)                     │
│  - Conjugate Gradient solver                    │
│  - Matrix utilities                             │
└─────────────────────────────────────────────────┘
```
