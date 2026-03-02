import { z } from 'zod';
import type { Request, Response } from 'express';
import authenticate from '../middleware/auth.middleware.js';
import { prisma } from '../lib/prisma.js';
import { Router } from 'express';
const router = Router();

const TaskSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
});

router.post('/', authenticate, async (req: Request, res: Response) => {
  const result = TaskSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  const { title, description } = result.data;

  if (!title) {
    res.status(400).json({ message: 'Title is required' });
    return;
  }

  try {
    const task = await prisma.task.create({
      data: {
        title,
        description: description ?? null,
        assignedToId: req.userId!,
      },
    });
    res.status(201).json(task);
    return;
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Error creating task' });
    return;
  }
});

export default router;
