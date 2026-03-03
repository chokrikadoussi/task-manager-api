import { test, expect } from '@playwright/test';

const email = `test-${Date.now()}@example.com`;
const password = 'password123';
const name = 'E2E Test User';

let token: string;
let taskId: number;

test.describe.serial('Task Manager API - E2E flow', () => {
  test('POST /auth/register - should register a new user', async ({ request }) => {
    const response = await request.post('/auth/register', {
      data: { email, password, name },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(body.email).toBe(email);
    expect(body.name).toBe(name);
  });

  test('POST /auth/login - should login and return a token', async ({ request }) => {
    const response = await request.post('/auth/login', {
      data: { email, password },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('token');
    token = body.token;
  });

  test('POST /tasks - should create a task', async ({ request }) => {
    const response = await request.post('/tasks', {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: 'E2E Test Task', description: 'Created by Playwright' },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(body.title).toBe('E2E Test Task');
    expect(body.description).toBe('Created by Playwright');
    expect(body.status).toBe('pending');
    taskId = body.id;
  });

  test('GET /tasks - should list tasks and include the created task', async ({ request }) => {
    const response = await request.get('/tasks', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('page');
    expect(body).toHaveProperty('limit');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.some((t: { id: number }) => t.id === taskId)).toBe(true);
  });

  test('GET /tasks?status=pending - should filter by status', async ({ request }) => {
    const response = await request.get('/tasks?status=pending', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.every((t: { status: string }) => t.status === 'pending')).toBe(true);
  });

  test('PATCH /tasks/:id - should update the task', async ({ request }) => {
    const response = await request.patch(`/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: 'Updated E2E Task', status: 'in_progress' },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.title).toBe('Updated E2E Task');
    expect(body.status).toBe('in_progress');
  });

  test('PATCH /tasks/:id - should return 404 for unknown task', async ({ request }) => {
    const response = await request.patch('/tasks/999999', {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: 'Ghost Task' },
    });
    expect(response.status()).toBe(404);
  });

  test('DELETE /tasks/:id - should delete the task', async ({ request }) => {
    const response = await request.delete(`/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status()).toBe(204);
  });

  test('DELETE /tasks/:id - should return 404 after deletion', async ({ request }) => {
    const response = await request.patch(`/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: 'Should not exist' },
    });
    expect(response.status()).toBe(404);
  });
});
