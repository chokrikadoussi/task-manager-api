import request from 'supertest';
import app from '../src/app';
import jwt from 'jsonwebtoken';

jest.mock('bcrypt-ts', () => ({
  hashSync: jest.fn().mockReturnValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/lib/prisma', () => ({
  prisma: {
    task: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import { prisma } from '../src/lib/prisma';

const secretKey: string = process.env.JWT_SECRET ?? 'default_secret_key';

const token = jwt.sign({ userId: 1 }, secretKey);

describe('POST /tasks', () => {
  it('should create a new task', async () => {
    (prisma.task.create as jest.Mock).mockResolvedValue({
      id: 1,
      title: 'Test Task',
      description: null,
      status: 'pending',
      assignedToId: 1,
    });

    const response = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test Task' });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe('Test Task');
  });

  it('should return 401 for no token', async () => {
    const response = await request(app)
      .post('/tasks')
      .send({ title: 'Test Task' });

    expect(response.status).toBe(401);
  });

  it('should return 400 for no title', async () => {
    const response = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Test Description' });

    expect(response.status).toBe(400);
  });
});

describe('GET /tasks', () => {
  it('should return a list of tasks', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([
      [
        {
          id: 1,
          title: 'Task 1',
          description: null,
          status: 'pending',
          assignedToId: 1,
        },
        {
          id: 2,
          title: 'Task 2',
          description: null,
          status: 'in_progress',
          assignedToId: 1,
        },
      ],
      2, // total
    ]);

    const tasks = [
      {
        id: 1,
        title: 'Task 1',
        description: null,
        status: 'pending',
        assignedToId: 1,
      },
      {
        id: 2,
        title: 'Task 2',
        description: null,
        status: 'in_progress',
        assignedToId: 1,
      },
    ];

    const result = await request(app)
      .get('/tasks')
      .set('Authorization', `Bearer ${token}`);

    expect(result.status).toBe(200);
    expect(result.body.data).toEqual(tasks);
    expect(result.body.total).toBe(2);
  });

  it('should return a filtered list of tasks by status', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([
      [
        {
          id: 2,
          title: 'Task 2',
          description: null,
          status: 'in_progress',
          assignedToId: 1,
        },
      ],
      1, // total
    ]);

    const filteredTask = {
      id: 2,
      title: 'Task 2',
      description: null,
      status: 'in_progress',
      assignedToId: 1,
    };

    const result = await request(app)
      .get('/tasks?status=in_progress')
      .set('Authorization', `Bearer ${token}`);

    expect(result.status).toBe(200);
    expect(result.body.data).toEqual([filteredTask]);
    expect(result.body.total).toBe(1);
  });

  it('should return a list of tasks with pagination', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([
      [
        {
          id: 1,
          title: 'Task 1',
          description: null,
          status: 'pending',
          assignedToId: 1,
        },
        {
          id: 2,
          title: 'Task 2',
          description: null,
          status: 'in_progress',
          assignedToId: 1,
        },
      ],
      10, // total
    ]);

    const result = await request(app)
      .get('/tasks?page=1&limit=10')
      .set('Authorization', `Bearer ${token}`);

    expect(result.status).toBe(200);
    expect(result.body.total).toBe(10);
    expect(result.body.page).toBe(1);
    expect(result.body.limit).toBe(10);
  });

  it('should return 401 for no token', async () => {
    const response = await request(app).get('/tasks');

    expect(response.status).toBe(401);
  });
});

describe('PATCH /tasks/:id', () => {
  it("should update a task's title", async () => {
    (prisma.task.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      title: 'Old Title',
      assignedToId: 1,
    });

    (prisma.task.update as jest.Mock).mockResolvedValue({
      id: 1,
      title: 'New Title',
      assignedToId: 1,
    });

    const response = await request(app)
      .patch('/tasks/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'New Title' });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe('New Title');
  });

  it('should return 401 for no token', async () => {
    const response = await request(app)
      .patch('/tasks/1')
      .send({ title: 'New Title' });

    expect(response.status).toBe(401);
  });

  it('should return 404 for non-existent task', async () => {
    (prisma.task.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await request(app)
      .patch('/tasks/999')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'New Title' });

    expect(response.status).toBe(404);
  });

  it("should return 403 for updating another user's task", async () => {
    (prisma.task.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      title: 'Old Title',
      assignedToId: 2, // Task belongs to another user
    });

    const response = await request(app)
      .patch('/tasks/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'New Title' });

    expect(response.status).toBe(403);
  });

  it('should return 400 for invalid status', async () => {
    const response = await request(app)
      .patch('/tasks/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'invalid_status' });

    expect(response.status).toBe(400);
  });
});

describe('DELETE /tasks/:id', () => {
  it('should delete a task', async () => {
    (prisma.task.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      title: 'Task to Delete',
      assignedToId: 1,
    });

    (prisma.task.delete as jest.Mock).mockResolvedValue({});

    const response = await request(app)
      .delete('/tasks/1')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(204);
  });

  it('should return 401 for no token', async () => {
    const response = await request(app).delete('/tasks/1');

    expect(response.status).toBe(401);
  });

  it('should return 404 for non-existent task', async () => {
    (prisma.task.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await request(app)
      .delete('/tasks/999')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
  });

  it("should return 403 for deleting another user's task", async () => {
    (prisma.task.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      title: 'Task to Delete',
      assignedToId: 2, // Task belongs to another user
    });

    const response = await request(app)
      .delete('/tasks/1')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });
});
