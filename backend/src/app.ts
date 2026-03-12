import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { stream } from './utils/logger';
import { errorHandler, notFound } from './middleware/error.middleware';
import { requestLogger, requestDetails } from './middleware/logging.middleware';
import { securityHeaders, corsOptions, xssProtection } from './middleware/security.middleware';
import { apiLimiter } from './middleware/rateLimiter.middleware';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import locationRoutes from './routes/location.routes';
import hospitalRoutes from './routes/hospital.routes';
import incidentRoutes from './routes/incident.routes';
import adminRoutes from './routes/admin.routes';
import ambulanceRoutes from './routes/ambulance.routes';
const app: Express = express();

// Security middleware
app.use(securityHeaders);
app.use(xssProtection);
app.use(cors(corsOptions));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.CLIENT_URL || 'http://localhost:3000'],
    },
  },
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

// Logging middleware
app.use(morgan('combined', { stream }));
app.use(requestLogger);
if (process.env.NODE_ENV === 'development') {
  app.use(requestDetails);
}

// Global rate limiting
app.use('/api', apiLimiter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ambulances', ambulanceRoutes);
// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

export default app;
