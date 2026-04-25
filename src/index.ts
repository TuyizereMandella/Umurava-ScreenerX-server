import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import apiRoutes from './routes';
import { errorHandler } from './middleware/error.middleware';
import { AppError } from './utils/AppError';

const app = express();
const port = config.port;

// Security & Production Middleware
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
});
app.use('/api/', limiter);

// Global Middleware
app.use(cors({ 
  origin: true, // Reflects the requesting origin (allows all for dev)
  credentials: true 
}));
app.use(express.json({ limit: '10mb' })); // Body parser with higher limit for base64 files if needed
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'success', message: 'ScreenerX Backend Engine is running' });
});

// API Routes (v1)
app.use('/api/v1', apiRoutes);

// Handle undefined routes
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`API available at http://localhost:${port}/api/v1`);
});
