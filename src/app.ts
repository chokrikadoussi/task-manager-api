import express from 'express';
import { hashSync, compare } from 'bcrypt-ts';
import { prisma } from './lib/prisma.js';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.post('/auth/register', async (req, res) => {
  const {
    email,
    password,
    name,
  }: { email: string; password: string; name: string } = req.body;

  if (!email || !password || !name) {
    return res
      .status(400)
      .json({ message: 'Email, password, and name are required' });
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
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password }: { email: string; password: string } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const secretKey = process.env.JWT_SECRET ?? 'default_secret_key';
    const expiresIn = process.env.JWT_EXPIRES_IN ?? '15m';

    const token = jwt.sign({ userId: user.id }, secretKey, {
      expiresIn: expiresIn,
    });
    return res.status(200).json({ token });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Error during login' });
  }
});

export default app;
