# Contributing to BeamLab Ultimate

Thank you for your interest in contributing to BeamLab Ultimate!

## Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/beamlab-ultimate.git
   cd beamlab-ultimate
   ```

2. **Install Dependencies**
   ```bash
   npm install
   cd apps/backend && npm install
   cd ../backend-python && pip install -r requirements.txt
   cd ../frontend && npm install
   ```

3. **Set Up Environment**
   - Copy `.env.example` files to `.env` in each app folder
   - Add your MongoDB, Clerk, and Google AI credentials

4. **Run Locally**
   ```bash
   # Terminal 1 - Backend
   cd apps/backend && npm run dev
   
   # Terminal 2 - Python Backend
   cd apps/backend-python && uvicorn main:app --reload --port 8001
   
   # Terminal 3 - Frontend
   cd apps/frontend && npm run dev
   ```

## Pull Request Process

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Test thoroughly
4. Commit with clear messages
5. Push and create a PR

## Code Style

- Use TypeScript for frontend and Node.js backend
- Follow existing code formatting
- Add comments for complex logic
- Keep functions small and focused

## Questions?

Open an issue or reach out to the maintainers.
