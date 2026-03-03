import express from 'express';
import { hashSync, compare } from 'bcrypt-ts';
import { prisma } from './lib/prisma.js';
import jwt from 'jsonwebtoken';
import taskRouter from './routes/task.route.js';
import errorHandler from './middleware/errorHandler.js';
import morgan from 'morgan';
import logger from './lib/logger.js';
import limiter, { authLimiter } from './lib/rateLimiter.js';
import helmet from 'helmet';
import cors from 'cors';
import 'dotenv/config';
const app = express();

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

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
  })
);
app.use(
  morgan('combined', {
    stream: { write: (message) => logger.http(message.trim()) },
  })
);
app.use(limiter);
app.use(helmet());

app.get('/', (_req, res) => {
  res.send('Hello, World!');
});

app.post('/auth/register', authLimiter, async (req, res, next) => {
  const {
    email,
    password,
    name,
  }: { email: string; password: string; name: string } = req.body;

  if (!email || !password || !name) {
    res.status(400).json({ message: 'Email, password, and name are required' });
    return;
  }

  const passwordHash = hashSync(password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        name,
      },
    });

    res.status(201).json({ id: user.id, email: user.email, name: user.name });
  } catch (error) {
    next(error);
  }
});

app.post('/auth/login', authLimiter, async (req, res, next) => {
  const { email, password }: { email: string; password: string } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const secretKey = process.env.JWT_SECRET ?? 'default_secret_key';
    const expiresIn = Number(process.env.JWT_EXPIRES_IN_SECONDS) || 900;

    const token = jwt.sign({ userId: user.id }, secretKey, { expiresIn });
    res.status(200).json({ token });
  } catch (error) {
    next(error);
  }
});

app.use('/tasks', taskRouter);
app.use(errorHandler);

export default app;
