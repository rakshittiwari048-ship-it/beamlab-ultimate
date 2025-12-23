<div align="center">

# 🏗️ BeamLab Ultimate

### Professional-Grade Structural Analysis Platform

[![Azure](https://img.shields.io/badge/Azure-Deployed-0078D4?logo=microsoftazure)](https://beamlabultimate.tech)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)

**Live Demo:** [beamlabultimate.tech](https://beamlabultimate.tech)

</div>

---

## 📋 Overview

BeamLab Ultimate is a comprehensive web-based structural analysis platform designed for civil and structural engineers. Built with modern web technologies and deployed on **Microsoft Azure**, it provides powerful analysis tools accessible from anywhere.

## ✨ Features

- 🏗️ **Structural Analysis**: Linear static analysis for beams, trusses, and frames
- 🎨 **3D Visualization**: Interactive WebGL-based model viewing with React Three Fiber
- 📊 **Results Display**: Bending moment diagrams, shear force diagrams, deflection plots
- 🤖 **AI Assistant**: Google Gemini-powered structural design assistant
- 🔧 **Material Library**: Pre-defined steel and concrete sections with custom options
- 💾 **Project Management**: Save, load, and export structural models
- 🔐 **Authentication**: Secure user authentication with Clerk
- 📐 **Unit System**: Support for both metric (SI) and imperial units

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Three.js / React Three Fiber** for 3D rendering
- **Tailwind CSS** for styling
- **Zustand** for state management
- **Zod** for runtime type validation

### Backend - Node.js
- **Express** with TypeScript
- **MongoDB** for data persistence
- **Clerk** for authentication
- **Zod** for request validation

### Backend - Python
- **FastAPI** for high-performance API
- **Google Gemini AI** for structural design assistance
- **NumPy/SciPy** for advanced calculations

### Infrastructure
- **Azure Static Web Apps** - Frontend hosting
- **Azure App Service** - Backend hosting (Node.js + Python)
- **MongoDB Atlas** - Database
- **GitHub Actions** - CI/CD

## 📁 Project Structure

```
beamlab-ultimate/
├── apps/
│   ├── frontend/          # React + Vite application
│   ├── backend/           # Node.js + Express API
│   └── backend-python/    # FastAPI + AI services
├── packages/
│   ├── types/             # Shared TypeScript types
│   ├── analysis-engine/   # Structural analysis engine
│   └── solver-wasm/       # WebAssembly solver
├── .github/
│   ├── workflows/         # GitHub Actions CI/CD
│   └── ISSUE_TEMPLATE/    # Issue templates
├── AZURE_DEPLOYMENT.md    # Complete deployment guide
└── package.json
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- MongoDB (or use MongoDB Atlas)
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/beamlab-ultimate.git
   cd beamlab-ultimate
   ```

2. **Install dependencies**
   ```bash
   # Frontend
   cd apps/frontend && npm install
   
   # Node.js Backend
   cd ../backend && npm install
   
   # Python Backend
   cd ../backend-python && pip install -r requirements.txt
   ```

3. **Set up environment variables**
   
   Create `.env` files in each app directory (see `.env.example` files):
   - `apps/frontend/.env`
   - `apps/backend/.env`
   - `apps/backend-python/.env`

4. **Start development servers**
   ```bash
   # Terminal 1 - Frontend (port 8000)
   cd apps/frontend && npm run dev
   
   # Terminal 2 - Node.js Backend (port 6000)
   cd apps/backend && npm run dev
   
   # Terminal 3 - Python Backend (port 8001)
   cd apps/backend-python && uvicorn main:app --reload --port 8001
   ```

5. **Open your browser**
   ```
   http://localhost:8000
   ```

## 📦 Deployment

This project is configured for **Microsoft Azure** deployment.

### Azure Deployment (GitHub Student Pack - FREE)

See the complete guide: **[AZURE_DEPLOYMENT.md](AZURE_DEPLOYMENT.md)**

**Quick Summary:**
1. Activate GitHub Student Pack → Get $100 Azure credit
2. Push code to GitHub
3. Create Azure Static Web App (Frontend)
4. Create 2 Azure App Services (Backends)
5. Configure environment variables
6. Add custom domain

**Total Cost: $0/month** with student benefits!

## 🔬 Structural Analysis Capabilities

- **Element Types**: Beam, truss, frame elements
- **Support Types**: Fixed, pinned, roller, spring
- **Load Types**: Point loads, distributed loads, moments
- **Analysis Methods**: Direct stiffness method, matrix displacement method
- **Results**: Nodal displacements, member forces, reactions, stress analysis
- **Design Codes**: Compliance with international standards

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](.github/CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔐 Security

See [SECURITY.md](.github/SECURITY.md) for security policies and vulnerability reporting.

## 📚 Documentation

- [QUICKSTART.md](QUICKSTART.md) - Quick start guide
- [SETUP.md](SETUP.md) - Detailed setup instructions
- [AZURE_DEPLOYMENT.md](AZURE_DEPLOYMENT.md) - Azure deployment guide
- [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) - Architecture overview

## 🎓 Built with GitHub Student Pack

This project leverages free services from the GitHub Student Developer Pack:
- ✅ Microsoft Azure ($100 credit)
- ✅ MongoDB Atlas (Free tier)
- ✅ GitHub Actions (CI/CD)
- ✅ Clerk (Authentication)

[Get your student benefits →](https://education.github.com/pack)

## 📧 Contact

For questions or support, please [open an issue](https://github.com/YOUR_USERNAME/beamlab-ultimate/issues).

---

<div align="center">

**Made with ❤️ for structural engineers worldwide**

[Website](https://beamlabultimate.tech) • [Documentation](AZURE_DEPLOYMENT.md) • [Report Bug](https://github.com/YOUR_USERNAME/beamlab-ultimate/issues)

</div>
