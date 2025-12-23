# BeamLab Ultimate - Installation & Setup Guide

## Prerequisites

- **Node.js**: Version 18 or higher
- **MongoDB**: Version 6 or higher
- **npm**: Version 9 or higher (comes with Node.js)

## Installation Steps

### 1. Install Dependencies

From the root directory, install all dependencies:

```bash
npm install
```

This will install dependencies for all workspaces (frontend, backend, and shared packages).

### 2. Build Shared Packages

Build the shared TypeScript packages:

```bash
# Build types package
cd packages/types
npm run build

# Build analysis engine
cd ../analysis-engine
npm run build

# Return to root
cd ../..
```

### 3. Configure Environment Variables

#### Backend Configuration

Create a `.env` file in `apps/backend/`:

```bash
cd apps/backend
cp .env.example .env
```

Edit `.env` with your MongoDB connection string:

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/beamlab
CORS_ORIGIN=http://localhost:5173
```

### 4. Start MongoDB

Make sure MongoDB is running on your system:

```bash
# macOS (if installed via Homebrew)
brew services start mongodb-community

# Linux (systemd)
sudo systemctl start mongod

# Or run directly
mongod --dbpath /path/to/data/directory
```

### 5. Start Development Servers

#### Option A: Start all services together (recommended)

From the root directory:

```bash
npm run dev
```

This will start both frontend and backend simultaneously.

#### Option B: Start services separately

Terminal 1 - Frontend:
```bash
cd apps/frontend
npm run dev
```

Terminal 2 - Backend:
```bash
cd apps/backend
npm run dev
```

### 6. Access the Application

- **Frontend**: http://localhost:8000
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## Project Structure

```
beamlab-ultimate/
├── apps/
│   ├── frontend/                 # React + Vite application
│   │   ├── src/
│   │   │   ├── components/       # React components
│   │   │   │   ├── 3d/          # Three.js components
│   │   │   │   ├── Viewport3D.tsx
│   │   │   │   ├── Toolbar.tsx
│   │   │   │   └── ...
│   │   │   ├── store/           # Zustand state management
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   └── package.json
│   │
│   └── backend/                  # Express + Node.js API
│       ├── src/
│       │   ├── config/          # Database configuration
│       │   ├── models/          # Mongoose models
│       │   ├── routes/          # API routes
│       │   └── server.ts        # Entry point
│       └── package.json
│
├── packages/
│   ├── types/                    # Shared TypeScript types
│   │   └── src/index.ts         # Zod schemas and types
│   │
│   └── analysis-engine/          # Structural analysis engine
│       └── src/index.ts         # FEM calculations
│
├── package.json                  # Root package.json (monorepo)
└── README.md
```

## Development Workflow

### Type Checking

```bash
# Check types in all packages
npm run type-check

# Or individual packages
cd apps/frontend && npm run type-check
cd apps/backend && npm run type-check
```

### Linting

```bash
# Lint all packages
npm run lint
```

### Building for Production

```bash
# Build all packages
npm run build

# Or individual builds
cd apps/frontend && npm run build
cd apps/backend && npm run build
```

## Key Features Implemented

### Frontend
- ✅ 3D viewport with React Three Fiber
- ✅ Interactive node and beam creation
- ✅ Support visualization (fixed, pinned, roller)
- ✅ Properties panel with selection
- ✅ Material and section libraries
- ✅ Zustand state management
- ✅ Tailwind CSS styling

### Backend
- ✅ RESTful API with Express
- ✅ MongoDB data persistence
- ✅ Project CRUD operations
- ✅ Analysis endpoint integration
- ✅ Zod validation
- ✅ Error handling

### Analysis Engine
- ✅ Direct stiffness method
- ✅ 3D beam/frame elements
- ✅ Coordinate transformations
- ✅ Boundary conditions
- ✅ Load case management
- ✅ Result calculations (displacements, forces, reactions)

## API Endpoints

### Projects
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get single project
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Analysis
- `POST /api/analysis/run` - Run structural analysis
- `GET /api/analysis/:modelId/results` - Get analysis results

## Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
mongo --eval 'db.runCommand({ connectionStatus: 1 })'

# Or with mongosh
mongosh --eval 'db.runCommand({ connectionStatus: 1 })'
```

### Port Already in Use
```bash
# Kill process on port 3000 (backend)
lsof -ti:3000 | xargs kill -9

# Kill process on port 5173 (frontend)
lsof -ti:5173 | xargs kill -9
```

### TypeScript Errors in Packages
```bash
# Rebuild shared packages
cd packages/types && npm run build
cd ../analysis-engine && npm run build
```

## Next Steps

1. **Authentication**: Add user authentication and authorization
2. **Load Application**: Implement distributed load conversion to nodal loads
3. **Results Visualization**: Add bending moment diagrams, shear force diagrams
4. **Export**: Implement model export (JSON, DXF, PDF reports)
5. **Material Database**: Expand material and section libraries
6. **Code Checks**: Add design code compliance (Eurocode, AISC, etc.)
7. **Optimization**: Implement member sizing optimization
8. **Collaboration**: Add real-time collaboration features

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Three.js, React Three Fiber, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript, MongoDB, Mongoose
- **State Management**: Zustand
- **Validation**: Zod
- **Math**: math.js
- **Build Tool**: Vite
- **Package Manager**: npm workspaces

## License

MIT
