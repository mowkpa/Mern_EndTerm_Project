import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { createTestUser, createAuthToken } from './helpers.js';

describe('AI Assistant Endpoint (/api/ai/parse)', () => {
  let student;
  let token;

  beforeEach(async () => {
    student = await createTestUser({ role: 'student' });
    token = createAuthToken(student);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app)
      .post('/api/ai/parse')
      .send({ prompt: 'Book a lab for tomorrow at 2pm' });

    expect(res.status).toBe(401);
  });

  it('validates that prompt string is present and non-empty', async () => {
    const res = await request(app)
      .post('/api/ai/parse')
      .set('Cookie', [`token=${token}`])
      .send({ prompt: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Prompt string is required/i);
  });

  it('returns graceful fallback when ANTHROPIC_API_KEY is not set', async () => {
    const res = await request(app)
      .post('/api/ai/parse')
      .set('Cookie', [`token=${token}`])
      .send({ prompt: 'I need a room with computers for 30 students tomorrow at 10 AM' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('parsed');
    expect(res.body.parsed).toBeNull();
    expect(res.body.message).toMatch(/AI booking assistant is not configured/i);
  });
});
