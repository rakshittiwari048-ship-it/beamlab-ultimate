import express from 'express';
import type { Express, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { clerkMiddleware } from '@clerk/express';
import { connectDatabase } from './config/database' ;
import { createSocketServer } from './services/SocketServer' ;
import projectRoutes from './routes/projects' ;
import analysisRoutes from './routes/analysis' ;
import cloudAnalysisRoutes from './routes/cloudAnalysis' ;
import billingRoutes from './routes/billing' ;
import razorpayRoutes from './routes/razorpay' ;
import copilotRoutes from './routes/copilot' ;
import aiRoutes from './routes/ai' ;
import templateRoutes from './routes/templates' ;

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 6000;

// CORS Configuration - Support multiple origins for production
const ALLOWED_ORIGINS = [
  'http://localhost:8000',
  'http://localhost:5173',
  process.env.FRONTEND_URL,
  'https://beamlabultimate.tech',
  'https://www.beamlabultimate.tech'
].filter(Boolean); // Remove undefined values

// Create HTTP server for both Express and Socket.IO
const httpServer = createServer(app);

// Middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (ALLOWED_ORIGINS.some(allowed => origin.includes(allowed as string))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(morgan('dev'));
// Middleware for raw body (needed for Stripe webhook signature verification)
app.use(
  express.json({
    limit: '10mb',
    verify: (req: any, _res: any, buf: any) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Health check (public)
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes (no auth required)
app.use('/api/ai', aiRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/copilot', copilotRoutes);

// Clerk auth middleware - only apply to protected routes
const clerkAuth = process.env.CLERK_PUBLISHABLE_KEY ? clerkMiddleware() : (_req: Request, _res: Response, next: NextFunction) => next();

// Protected routes (require auth when Clerk is configured)
app.use('/api/projects', clerkAuth, projectRoutes);
app.use('/api/analysis', clerkAuth, analysisRoutes);
app.use('/api/analysis', clerkAuth, cloudAnalysisRoutes);  // Cloud analysis routes (under /api/analysis/cloud)
app.use('/api/billing', clerkAuth, billingRoutes);
app.use('/api/razorpay', clerkAuth, razorpayRoutes);

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Try to connect to MongoDB, but don't fail if it's not available
    try {
      await connectDatabase();
    } catch (dbError) {
      console.warn('⚠️  MongoDB not available - running without database');
      console.warn('   The API will return errors for database operations');
      console.warn('   To enable database: start MongoDB and restart the server');
    }
    
    // Initialize Socket.IO server for real-time collaboration
    createSocketServer(httpServer, ALLOWED_ORIGINS[0] as string);
    console.log(`🔌 Socket.IO server attached`);
    
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📖 API Documentation: http://localhost:${PORT}/health`);
      console.log(`🤝 Real-time collaboration: ws://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
