import { z } from 'zod';
import type { NextFunction, Request, Response } from 'express';
import authenticate from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.js';
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

/**
 * @openapi
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         title:
 *           type: string
 *           example: Fix login bug
 *         description:
 *           type: string
 *           nullable: true
 *           example: The login button does not respond on mobile
 *         status:
 *           type: string
 *           enum: [pending, in_progress, completed]
 *           example: pending
 *         assignedToId:
 *           type: integer
 *           nullable: true
 *           example: 1
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: An error occurred
 */

/**
 * @openapi
 * /tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Fix login bug
 *               description:
 *                 type: string
 *                 example: The login button does not respond on mobile
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/',
  authenticate,
  validate(TaskSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const { title, description } = req.body;

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

/**
 * @openapi
 * /tasks:
 *   get:
 *     summary: List tasks with filters and pagination
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, completed]
 *         description: Filter by task status
 *       - in: query
 *         name: assignedToId
 *         schema:
 *           type: integer
 *         description: Filter by assigned user ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Paginated list of tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Task'
 *                 total:
 *                   type: integer
 *                   example: 42
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
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

/**
 * @openapi
 * /tasks/{id}:
 *   patch:
 *     summary: Update a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Updated title
 *               description:
 *                 type: string
 *                 example: Updated description
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed]
 *                 example: in_progress
 *     responses:
 *       200:
 *         description: Task updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Validation error or invalid ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden — not the task owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
  '/:id',
  authenticate,
  validate(TaskUpdateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const taskId = Number(req.params.id);

    if (isNaN(taskId)) {
      throw new AppError(400, 'Invalid task ID');
    }

    const { title, description, status } = req.body;
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

/**
 * @openapi
 * /tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     responses:
 *       204:
 *         description: Task deleted successfully
 *       400:
 *         description: Invalid task ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden — not the task owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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
