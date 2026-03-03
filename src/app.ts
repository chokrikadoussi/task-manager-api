import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import 'dotenv/config';

import { swaggerSpec } from './lib/swagger.js';
import logger from './lib/logger.js';
import limiter from './lib/rateLimiter.js';
import authRouter from './routes/auth.route.js';
import taskRouter from './routes/task.route.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

// Security
app.use(express.json());
app.use((req, res, next) => {
  if (
    req.headers['x-forwarded-proto'] !== 'https' &&
    process.env.NODE_ENV === 'production'
  ) {
    res.redirect(301, `https://${req.headers.host}${req.url}`);
    return;
  }
  next();
});
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(limiter);
app.use(helmet());

// Logging
app.use(
  morgan('combined', {
    stream: { write: (message) => logger.http(message.trim()) },
  })
);

// Docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.get('/', (_req, res) => {
  res.send('Hello, World!');
});
app.use('/auth', authRouter);
app.use('/tasks', taskRouter);

// Error handler
app.use(errorHandler);

export default app;
