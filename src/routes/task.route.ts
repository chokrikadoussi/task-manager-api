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

const StatusSchema = z.enum(['pending', 'in_progress', 'completed']);

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

router.get('/', authenticate, async (req: Request, res: Response) => {

    const { status, assignedToId, page, limit } = req.query;
    const pageNumber: number = Number(page) || 1;
    const limitNumber: number = Number(limit) || 10;

    if (status && !StatusSchema.safeParse(status).success) {
        res.status(400).json({ message: 'Invalid status value' });
        return;
    }

    const parsedAssignedToId = assignedToId ? Number(assignedToId) : undefined;

    const where = {
        ...(status ? { status: status as string } : {}),
        ...(parsedAssignedToId && !isNaN(parsedAssignedToId) ? { assignedToId: parsedAssignedToId } : {}),
    };

    try {
        const [tasks, total] = await prisma.$transaction([
            prisma.task.findMany({
                where,
                skip: (pageNumber - 1) * limitNumber,
                take: limitNumber,
            }),
            prisma.task.count({ where }),
        ]);

        res.status(200).json({ data: tasks, total, page: pageNumber, limit: limitNumber });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ message: 'Error fetching tasks' });
    }
});

export default router;
