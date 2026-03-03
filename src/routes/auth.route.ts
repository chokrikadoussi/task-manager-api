import { Router } from 'express';
import { hashSync, compare } from 'bcrypt-ts';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { authLimiter } from '../lib/rateLimiter.js';

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *               name:
 *                 type: string
 *                 example: John Doe
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 email:
 *                   type: string
 *                   example: user@example.com
 *                 name:
 *                   type: string
 *                   example: John Doe
 *       400:
 *         description: Missing required fields
 *       409:
 *         description: Email already in use
 *       429:
 *         description: Too many requests
 */
router.post('/register', authLimiter, async (req, res, next) => {
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
      data: { email, password: passwordHash, name },
    });
    res.status(201).json({ id: user.id, email: user.email, name: user.name });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Authenticate and receive a JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       401:
 *         description: Invalid email or password
 *       429:
 *         description: Too many login attempts
 */
router.post('/login', authLimiter, async (req, res, next) => {
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

export default router;
