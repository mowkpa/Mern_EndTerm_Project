import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Backend Foundation & Health', () => {
  it('GET /health returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /non-existent returns 404', async () => {
    const res = await request(app).get('/non-existent');
    expect(res.status).toBe(404);
    expect(res.body.message).toContain('Route not found');
  });
});
