import dotenv from 'dotenv';
dotenv.config();
import express    from 'express';
import cors       from 'cors';
import helmet     from 'helmet';
import cookieParser from 'cookie-parser';
import router     from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { auditLogger }  from './middlewares/audit.middleware.js';

const app = express();

// 1. Security + Parsing Middlewares
app.use(helmet());
app.use(cors({
  origin: [
    process.env.CORS_ORIGIN || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
  ],
  credentials: true,  // ← Required for cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // ← Required for refreshToken cookie parsing

// 2. Request audit logger
app.use(auditLogger);

// 3. API Routes
app.use('/api/v1', router);

// 4. 404 handler
app.use('*', (req, res, next) => {
  const error = new Error(`Resource not found at path: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// 5. Global error handler (must be last)
app.use(errorHandler);

export default app;
