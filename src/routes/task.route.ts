import { z } from 'zod';
import type { NextFunction, Request, Response } from 'express';
import authenticate from '../middleware/auth.middleware.js';
import { prisma } from '../lib/prisma.js';
import AppError from '../lib/AppError.js';
import { Router } from 'express';
const router = Router();

const TaskSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
});

const StatusSchema = z.enum(['pending', 'in_progress', 'completed']);

const TaskUpdateSchema = TaskSchema.partial().extend({
  status: StatusSchema.optional(),
});

router.post(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    // TODO: Zod validation middleware
    const result = TaskSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    const { title, description } = result.data;

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
      next(error);
    }
  }
);

router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    const { status, assignedToId, page, limit } = req.query;
    const pageNumber: number = Number(page) || 1;
    const limitNumber: number = Number(limit) || 10;

    // TODO: Zod validation middleware
    if (status && !StatusSchema.safeParse(status).success) {
      res.status(400).json({ message: 'Invalid status value' });
      return;
    }

    const parsedAssignedToId = assignedToId ? Number(assignedToId) : undefined;

    const where = {
      ...(status ? { status: status as string } : {}),
      ...(parsedAssignedToId && !isNaN(parsedAssignedToId)
        ? { assignedToId: parsedAssignedToId }
        : {}),
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

      res
        .status(200)
        .json({ data: tasks, total, page: pageNumber, limit: limitNumber });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    const taskId = Number(req.params.id);

    if (isNaN(taskId)) {
      throw new AppError(400, 'Invalid task ID');
    }

    // TODO: Zod validation middleware
    const result = TaskUpdateSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    const { title, description, status } = result.data;
    const userId = req.userId!;

    try {
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task) {
        throw new AppError(404, 'Task not found');
      }

      if (userId !== task.assignedToId) {
        throw new AppError(
          403,
          'Forbidden: You can only update your own tasks'
        );
      }

      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: {
          title: title ?? task.title,
          description: description ?? task.description,
          status: status ?? task.status,
        },
      });

      res.status(200).json(updatedTask);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    const taskId = Number(req.params.id);

    if (isNaN(taskId)) {
      throw new AppError(400, 'Invalid task ID');
    }

    try {
      const userId = req.userId!;
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task) {
        throw new AppError(404, 'Task not found');
      }

      if (userId !== task.assignedToId) {
        throw new AppError(
          403,
          'Forbidden: You can only delete your own tasks'
        );
      }

      await prisma.task.delete({ where: { id: taskId } });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
