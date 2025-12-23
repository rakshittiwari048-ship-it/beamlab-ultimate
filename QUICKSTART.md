# BeamLab Ultimate - Quick Start Guide

## Overview
Professional structural analysis platform built with React, Three.js, Node.js, and MongoDB.

## 🎯 What You Can Do

1. **Model Structures**
   - Create nodes in 3D space
   - Connect nodes with beam/frame elements
   - Add supports (fixed, pinned, roller)
   - Apply loads (point, distributed, moments)

2. **Analyze**
   - Run finite element analysis
   - Multiple load cases
   - Get displacements, forces, reactions

3. **Visualize**
   - Interactive 3D view
   - Real-time model manipulation
   - Results display

## ⚡ Quick Setup (5 minutes)

### Option 1: Automated Setup
```bash
cd beamlab-ultimate
./setup.sh
```

### Option 2: Manual Setup
```bash
# 1. Install dependencies
npm install

# 2. Build shared packages
cd packages/types && npm run build
cd ../analysis-engine && npm run build
cd ../..

# 3. Configure backend
cd apps/backend
cp .env.example .env
# Edit .env with your MongoDB URI
cd ../..

# 4. Start MongoDB
brew services start mongodb-community  # macOS
# OR
sudo systemctl start mongod            # Linux

# 5. Start development servers
npm run dev
```

## 🌐 Access Points

- **Frontend**: http://localhost:8000
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## 📝 Basic Usage

### Create a Simple Beam

1. **Add Nodes**
   - Click "Add Node" tool
   - Click in viewport to place nodes
   - Example: (0,0,0), (5,0,0)

2. **Add Beam**
   - Click "Add Beam" tool
   - Click start node, then end node

3. **Add Supports**
   - Click "Add Support" tool
   - Click on nodes
   - Choose support type (pinned/fixed/roller)

4. **Add Load**
   - Click "Add Load" tool
   - Click on node
   - Enter load values (kN)

5. **Analyze**
   - Click "Run" in Analysis panel
   - View results

## 📂 Project Structure

```
beamlab-ultimate/
├── apps/
│   ├── frontend/          # React app (port 5173)
│   └── backend/           # Express API (port 3000)
├── packages/
│   ├── types/             # Shared TypeScript types
│   └── analysis-engine/   # FEM calculations
├── setup.sh               # Automated setup script
├── SETUP.md              # Detailed setup guide
└── PROJECT_OVERVIEW.md   # Technical documentation
```

## 🔧 Common Commands

```bash
# Development
npm run dev              # Start both frontend & backend
npm run dev:frontend     # Frontend only
npm run dev:backend      # Backend only

# Building
npm run build            # Build all packages
npm run type-check       # Check TypeScript types
npm run lint             # Lint code

# Database
brew services start mongodb-community    # Start MongoDB (macOS)
brew services stop mongodb-community     # Stop MongoDB (macOS)
```

## 🐛 Troubleshooting

### MongoDB Connection Error
```bash
# Check if MongoDB is running
mongosh --eval "db.version()"

# Start MongoDB
brew services start mongodb-community  # macOS
sudo systemctl start mongod            # Linux
```

### Port Already in Use
```bash
# Kill process on port 3000 (backend)
lsof -ti:3000 | xargs kill -9

# Kill process on port 5173 (frontend)
lsof -ti:5173 | xargs kill -9
```

### TypeScript Errors
```bash
# Rebuild shared packages
cd packages/types && npm run build
cd ../analysis-engine && npm run build
```

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 📖 Example: Simple Beam Analysis

### Scenario
Simply supported beam, 5m span, 10kN point load at center

### Steps
1. Create nodes: (0,0,0), (2.5,0,0), (5,0,0)
2. Add beams: Node1→Node2, Node2→Node3
3. Add supports: Node1=Pinned, Node3=Roller
4. Add load: Node2, Y=-10000 (10kN downward)
5. Run analysis
6. View results: Max displacement ~1.2mm

## 🎓 Key Concepts

### Coordinate System
- **X**: Horizontal (along beam length)
- **Y**: Vertical (up positive)
- **Z**: Out of screen

### Units (Metric)
- **Length**: meters (m)
- **Force**: Newtons (N) or kiloNewtons (kN)
- **Stress**: Pascals (Pa) or MegaPascals (MPa)
- **E (modulus)**: GPa (210 GPa for steel)

### DOF (Degrees of Freedom)
Each node has 6 DOF:
- **Translations**: X, Y, Z
- **Rotations**: RX, RY, RZ

### Support Types
- **Fixed**: Constrains all 6 DOF
- **Pinned**: Constrains translations (X, Y, Z)
- **Roller**: Constrains vertical translation (Y)

## 🚀 Next Steps

1. **Explore Examples**
   - See `packages/types/src/examples.ts`
   - Load pre-configured models

2. **Read Documentation**
   - `PROJECT_OVERVIEW.md` - Technical details
   - `SETUP.md` - Detailed setup guide

3. **API Integration**
   - Use REST API for automation
   - See API endpoints in PROJECT_OVERVIEW.md

4. **Customize**
   - Add custom materials
   - Create custom sections
   - Extend analysis capabilities

## 📚 Resources

### Learning
- **Structural Analysis**: "Matrix Analysis of Structures" by Kassimali
- **React**: Official React documentation
- **Three.js**: Three.js fundamentals
- **TypeScript**: TypeScript handbook

### Support
- GitHub Issues: Report bugs or request features
- Documentation: Read detailed guides

## ⚠️ Known Limitations

- Linear analysis only (no nonlinear effects)
- Static loads only (no dynamic analysis)
- No automated design code checks
- Distributed loads need manual conversion to nodal loads

## 🎯 Roadmap

### v1.0 (Current)
- ✅ 3D modeling
- ✅ Linear static analysis
- ✅ Basic load types
- ✅ Result visualization

### v2.0 (Planned)
- [ ] Distributed load handling
- [ ] Bending moment diagrams
- [ ] Shear force diagrams
- [ ] PDF report export

### v3.0 (Future)
- [ ] Design code compliance
- [ ] Optimization tools
- [ ] Dynamic analysis
- [ ] Multi-user collaboration

## 📄 License

MIT License - Free to use for personal and commercial projects

---

**Need Help?** Check SETUP.md for detailed instructions or PROJECT_OVERVIEW.md for technical details.

**Ready to build?** Run `npm run dev` and open http://localhost:5173
