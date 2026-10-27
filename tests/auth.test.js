import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/user.model.js';

describe('Auth & Role Workflow', () => {
  it('registers a new user as student and sets auth cookie', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alice Student',
        email: 'alice@slotsync.demo',
        password: 'Password123!',
        department: 'CS',
      });

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('alice@slotsync.demo');
    expect(res.body.user.role).toBe('student');
    expect(res.body.user.password).toBeUndefined();

    // Verify cookie set
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.includes('token='))).toBe(true);
  });

  it('ignores role in registration body and forces student role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Malicious Admin Wannabe',
        email: 'hacker@slotsync.demo',
        password: 'Password123!',
        role: 'admin',
      });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('student');

    const dbUser = await User.findOne({ email: 'hacker@slotsync.demo' });
    expect(dbUser.role).toBe('student');
  });

  it('rejects registration with existing email with 409', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Duplicate Test',
        email: 'duplicate@slotsync.demo',
        password: 'Password123!',
      });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Duplicate Test 2',
        email: 'duplicate@slotsync.demo',
        password: 'Password123!',
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_EXISTS');
  });

  it('rejects passwords shorter than 8 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Short Pass',
        email: 'short@slotsync.demo',
        password: 'short',
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('logs in successfully and never leaks password hash', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Login User',
        email: 'login@slotsync.demo',
        password: 'Password123!',
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@slotsync.demo',
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('login@slotsync.demo');
    expect(res.body.user.password).toBeUndefined();

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
  });

  it('rejects invalid password with 401 and generic message', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'User Bad Pass',
        email: 'badpass@slotsync.demo',
        password: 'Password123!',
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'badpass@slotsync.demo',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('returns current user session on GET /api/auth/me with cookie', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Session User',
        email: 'session@slotsync.demo',
        password: 'Password123!',
      });

    const cookie = regRes.headers['set-cookie'];

    const meRes = await request(app).get('/api/auth/me').set('Cookie', cookie);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe('session@slotsync.demo');
  });

  it('rejects GET /api/auth/me with 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Authentication required');
  });

  it('clears cookie on logout', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Logout User',
        email: 'logout@slotsync.demo',
        password: 'Password123!',
      });

    const cookie = regRes.headers['set-cookie'];

    const res = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out successfully');

    const cookies = res.headers['set-cookie'];
    expect(cookies.some((c) => c.includes('token=;'))).toBe(true);
  });
});
