# GitHub Copilot Instructions

## Project map
- Monorepo (pnpm) with `apps/frontend` (React/Vite), `apps/backend` (Express/TS), `packages/analysis-engine` (FEM solver), `packages/types` (Zod schemas), `packages/solver-wasm` (Rust/WASM), and `apps/web` (worker harness).
- Shared contracts live in `@beamlab/types`; update schemas first, then consume types across frontend, backend, and workers.

## Build & run
- Prefer pnpm: `pnpm install`, `pnpm dev` (runs frontend + backend). Per-app: `pnpm --filter @beamlab/frontend dev`, `pnpm --filter @beamlab/backend dev`.
- Quality gates: `pnpm type-check`, `pnpm lint`; analysis engine tests via `pnpm --filter @beamlab/analysis-engine test`.
- Production: `pnpm build` or per-package `build` scripts; backend can also run via `start-backend.sh` (tsx).

## Backend conventions
- Express API with Zod validation; routes in `apps/backend/src/routes/{projects,analysis}.ts`, Mongo config in `config/database.ts`.
- Use `@beamlab/types` DTOs for request/response shapes; avoid ad-hoc schemas.
- Env lives in `apps/backend/.env` (PORT, MONGODB_URI, CORS_ORIGIN). Never commit secrets; copy from `.env.example`.

## Frontend conventions
- React 18 + Zustand stores in `apps/frontend/src/store`; keep selection sets and model mutations inside store actions.
- 3D viewport uses React Three Fiber with instanced renderers (`NodesRenderer`, `MembersRenderer`) and LOD via `useLOD`; reuse Matrix/Vector objects to avoid GC.
- Tool system: `ToolSelector.tsx`, `InteractionManager`, `DrawBeamGhostLine`; keyboard shortcuts V/N/B/S/L/D, Esc cancel, Delete removes. Thread `activeTool` through viewports instead of local state.
- Analysis runs in worker (`apps/web/src/workers/useSolverWorker.ts`); emit progress stages (`initializing` → `assembling` → `solving` → `postprocessing`) and transfer ArrayBuffers (zero-copy) for results.
- Reporting lives in `apps/frontend/src/components/reporting`; `useReportCapture` renders a frame before 3D capture and expects chart DOM ids for screenshots.

## Analysis engine conventions
- Core FEM in `packages/analysis-engine/src` (stiffness assembly, transformations, MemberForcesCalculator, EigenSolver, SparseSolver).
- Super-element pipeline (`features/SubstructureManager.ts`, `SuperElementIntegration.ts`) uses static condensation; maintain boundary/internal DOF partitioning and return recovery transform `T` for internal displacement reconstruction.
- Use `MatrixUtils` helpers for math; keep matrices dense unless explicitly opting into sparse/worker paths.

## Solver WASM
- High-performance solvers in `packages/solver-wasm`; build with `pnpm --filter @beamlab/solver-wasm build`. In browser, call `init()` before `solve_*` exports.

## Testing & debugging
- Analysis engine has Jest entry; colocate new tests near modules.
- UI perf checks rely on FPS monitor (`apps/frontend/src/components/FPSMonitor.tsx`) and LOD controls; consult `PERFORMANCE_IMPROVEMENTS.md`, `VIEWPORT_FIX.md`, `VIEWPORT_VISUAL_GUIDE.md` before tuning rendering.

## Patterns to follow
- Single source of truth for schemas: update `@beamlab/types`, then reuse imports everywhere.
- Prefer worker-based solving with sparse solver for >1000 DOF; keep progress messaging stable for the UI.
- Preserve status bar + selection counts in `App.tsx`; keep tool state centralized.
- When extending tool system, workers, or reporting, update the corresponding README in that folder.# BeamLab Ultimate - AI Agent Instructions

## Architecture Overview

BeamLab is a **pnpm monorepo** structural analysis platform with 3D CAD-like modeling. Uses **Direct Stiffness Method (FEM)** for beam/frame/truss analysis.

```
apps/frontend/     → React 18 + Vite + Three.js/R3F (port 8000)
apps/backend/      → Express + MongoDB + Clerk auth (port 3000)
packages/types/    → Zod schemas + TS types (shared source of truth)
packages/analysis-engine/ → FEM solver, IS code design modules
```

### Key Data Flow
1. Model state lives in Zustand stores (`apps/frontend/src/store/`)
2. Analysis runs via `Solver` class → returns `SolverResult`
3. Backend handles project persistence, cloud analysis (>2000 nodes), payments

## Development Commands

```bash
pnpm install          # Install all dependencies
````instructions
# BeamLab Ultimate — AI Agent Guide

## Monorepo map (pnpm)
- `apps/frontend` — React 18 + Vite + R3F (Three.js). UI, tool system, reporting.
- `apps/backend` — Express/TS + Mongo. Routes in `src/routes/*`, Zod validation, Clerk/Razorpay integration.
- `apps/web` — Worker harness (solver workers, overlays, etc.).
- `packages/types` — Zod schemas + TS types (single source of truth).
- `packages/analysis-engine` — FEM solver, super-elements, IS design modules.
- `packages/solver-wasm` — Rust/WASM solver; init before calling exports.

## Build / run / quality
- Install: `pnpm install`
- Frontend dev: `pnpm --filter @beamlab/frontend dev`
- Backend dev: `pnpm --filter @beamlab/backend dev`
- All dev: `pnpm dev` (concurrent)
- Checks: `pnpm type-check`, `pnpm lint`
- Analysis engine tests: `pnpm --filter @beamlab/analysis-engine test`
- Build packages before consumers: `pnpm --filter @beamlab/types build` then `pnpm --filter @beamlab/analysis-engine build`

## Core conventions
- **Types first**: add/modify schemas in `packages/types`; import from `@beamlab/types` everywhere (backend DTOs, frontend stores, workers).
- **State**: Zustand stores in `apps/frontend/src/store`. Keep mutations/actions in stores (selection, model edits, tools). New UI state? add store slice, not component state.
- **3D viewport**: React Three Fiber with instanced renderers (`components/3d/*Renderer.tsx`). Use existing LOD patterns; reuse THREE objects to avoid GC. Overlays via `<Html>` (see `apps/web/src/components/viewer/Overlays.tsx`).
- **Tool system**: Centralized tool/interaction (keyboard: V select, N node, B beam, S support, L load, D delete; Esc cancel). Thread `activeTool` through viewport, don’t keep per-component copies.
- **Analysis pipeline**: Solver runs in worker (`apps/web/src/workers/useSolverWorker.ts`); emit staged progress (`initializing → assembling → solving → postprocessing`) and transfer ArrayBuffers zero-copy. Use sparse solver for large DOF.
- **Super-elements**: `packages/analysis-engine/src/features/SubstructureManager.ts` & `SuperElementIntegration.ts` use static condensation—keep boundary/internal DOF partition and recovery transform `T` intact.
- **Reporting**: `apps/frontend/src/components/reporting` expects DOM IDs for capture; `useReportCapture` renders one frame before screenshot. Preserve chart IDs when editing.

## Backend specifics
- Routes in `apps/backend/src/routes/{projects,analysis,...}.ts`; validate with Zod; DTOs from `@beamlab/types`.
- Env in `apps/backend/.env` (PORT, MONGODB_URI, CORS_ORIGIN). Do not commit secrets; copy from example.
- Payments via Razorpay routes; auth via Clerk middleware.

## UI design system (apps/web/src/components/ui)
- Typography: Inter, base `text-sm`, headings `font-semibold tracking-tight`.
- Inputs: `Input` h-8 compact; `Label` text-xs zinc-500.
- Tables: `DataTable` uses `@tanstack/react-table` + `@tanstack/react-virtual` (sticky header, bordered, striped, virtualized 10k+ rows).

## Performance & debugging
- Check `PERFORMANCE_IMPROVEMENTS.md`, `VIEWPORT_FIX*.md`, `FPSMonitor.tsx` before tuning rendering.
- Prefer worker-based solving for >1000 DOF; keep progress messages stable for UI consumers.
- For analysis debugging, inspect `SolverResult` displacement/reaction maps; keep MatrixUtils helpers for math consistency.

## Contribution patterns
- When adding elements/design codes: update `packages/types` → frontend store/renderers → solver/analysis-engine → UI controls.
- Keep status bar/selection counters intact in frontend shell.
- Update folder README when extending tool system, workers, or reporting (many directories have local READMEs).
````
```
