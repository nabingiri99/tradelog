process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-api-tests';
process.env.AUTH_RATE_LIMIT = '1000';
process.env.API_RATE_LIMIT = '10000';
process.env.MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/tradelog_test';
process.env.APP_BASE_URL = 'http://localhost:5173';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const { hashToken } = require('../utils/mailer');

let server;
let baseUrl;

before(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  server.close();
});

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function registerUser(name = 'Tester', email = 'tester@example.com', password = 'secret123') {
  return request('/auth/register', {
    method: 'POST',
    body: { name, email, password },
  });
}

test('GET / returns API metadata', async () => {
  const res = await fetch(`${baseUrl.replace('/api', '')}/`);
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.name, 'TradeLog API');
});

test('register creates an unverified account and issues tokens', async () => {
  const { status, json } = await registerUser();
  assert.equal(status, 201);
  assert.equal(json.success, true);
  assert.ok(json.accessToken);
  assert.ok(json.refreshToken);
  assert.equal(json.data.email, 'tester@example.com');
  assert.equal(json.data.emailVerified, false);
  assert.equal(json.data.passwordHash, undefined);
  assert.ok(json.data.id);
});

test('register rejects duplicate email', async () => {
  const { status, json } = await registerUser();
  assert.equal(status, 409);
  assert.equal(json.success, false);
});

test('register validates input', async () => {
  const { status } = await registerUser('', 'not-an-email', 'short');
  assert.equal(status, 400);
});

test('login succeeds with valid credentials', async () => {
  const { status, json } = await request('/auth/login', {
    method: 'POST',
    body: { email: 'tester@example.com', password: 'secret123' },
  });
  assert.equal(status, 200);
  assert.ok(json.accessToken);
  assert.ok(json.refreshToken);
  assert.equal(json.data.email, 'tester@example.com');
});

test('login rejects wrong password', async () => {
  const { status } = await request('/auth/login', {
    method: 'POST',
    body: { email: 'tester@example.com', password: 'wrong-password' },
  });
  assert.equal(status, 401);
});

test('refresh rotates tokens', async () => {
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'tester@example.com', password: 'secret123' },
  });
  const refreshToken = loginRes.json.refreshToken;
  const { status, json } = await request('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
  });
  assert.equal(status, 200);
  assert.ok(json.accessToken);
  assert.notEqual(json.refreshToken, refreshToken);
});

test('protected route rejects missing token', async () => {
  const { status } = await request('/trades');
  assert.equal(status, 401);
});

test('/auth/me returns the authenticated user', async () => {
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'tester@example.com', password: 'secret123' },
  });
  const { status, json } = await request('/auth/me', { token: loginRes.json.accessToken });
  assert.equal(status, 200);
  assert.equal(json.data.email, 'tester@example.com');
});

test('updateProfile updates name and accountBalance', async () => {
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'tester@example.com', password: 'secret123' },
  });
  const token = loginRes.json.accessToken;

  const { status, json } = await request('/auth/profile', {
    method: 'PUT',
    token,
    body: { name: 'Updated Name', accountBalance: 1234.567 },
  });
  assert.equal(status, 200);
  assert.equal(json.data.name, 'Updated Name');
  assert.equal(json.data.accountBalance, 1234.57);

  const meRes = await request('/auth/me', { token });
  assert.equal(meRes.json.data.accountBalance, 1234.57);
});

test('updateProfile rejects negative balance', async () => {
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'tester@example.com', password: 'secret123' },
  });
  const { status } = await request('/auth/profile', {
    method: 'PUT',
    token: loginRes.json.accessToken,
    body: { accountBalance: -5 },
  });
  assert.equal(status, 400);
});

test('changePassword updates password and invalidates refresh tokens', async () => {
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'tester@example.com', password: 'secret123' },
  });
  const token = loginRes.json.accessToken;
  const oldRefresh = loginRes.json.refreshToken;

  const { status, json } = await request('/auth/password', {
    method: 'PUT',
    token,
    body: { currentPassword: 'secret123', newPassword: 'newsecret456' },
  });
  assert.equal(status, 200);
  assert.equal(json.success, true);

  const oldLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'tester@example.com', password: 'secret123' },
  });
  assert.equal(oldLogin.status, 401);

  const newLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'tester@example.com', password: 'newsecret456' },
  });
  assert.equal(newLogin.status, 200);

  const staleRefresh = await request('/auth/refresh', {
    method: 'POST',
    body: { refreshToken: oldRefresh },
  });
  assert.equal(staleRefresh.status, 401);
});

test('changePassword rejects wrong current password', async () => {
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'tester@example.com', password: 'newsecret456' },
  });
  const { status } = await request('/auth/password', {
    method: 'PUT',
    token: loginRes.json.accessToken,
    body: { currentPassword: 'nope', newPassword: 'whatever123' },
  });
  assert.equal(status, 401);
});

test('forgotPassword responds without leaking account existence', async () => {
  const existing = await request('/auth/forgot-password', {
    method: 'POST',
    body: { email: 'tester@example.com' },
  });
  const missing = await request('/auth/forgot-password', {
    method: 'POST',
    body: { email: 'ghost@example.com' },
  });
  assert.equal(existing.status, 200);
  assert.equal(missing.status, 200);
  assert.equal(existing.json.message, missing.json.message);
});

test('resetPassword resets the password with a valid token', async () => {
  const resetToken = 'plaintext-reset-token-for-test';
  const user = await User.findOne({ email: 'tester@example.com' });
  user.resetTokenHash = hashToken(resetToken);
  user.resetTokenExpires = new Date(Date.now() + 1000 * 60 * 60);
  await user.save();

  const { status } = await request('/auth/reset-password', {
    method: 'POST',
    body: { token: resetToken, newPassword: 'resetpass123' },
  });
  assert.equal(status, 200);

  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'tester@example.com', password: 'resetpass123' },
  });
  assert.equal(loginRes.status, 200);
});

test('resetPassword rejects invalid token', async () => {
  const { status } = await request('/auth/reset-password', {
    method: 'POST',
    body: { token: 'bogus-token', newPassword: 'whatever123' },
  });
  assert.equal(status, 400);
});

test('verifyEmail verifies with a valid token', async () => {
  const verifyToken = 'plaintext-verify-token-for-test';
  const user = await User.findOne({ email: 'tester@example.com' });
  user.verificationToken = hashToken(verifyToken);
  user.verificationTokenExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);
  await user.save();

  const { status, json } = await request('/auth/verify-email', {
    method: 'POST',
    body: { token: verifyToken },
  });
  assert.equal(status, 200);
  assert.equal(json.message, 'Email verified successfully');

  const fresh = await User.findOne({ email: 'tester@example.com' });
  assert.equal(fresh.emailVerified, true);
});

test('verifyEmail rejects invalid token', async () => {
  const { status } = await request('/auth/verify-email', {
    method: 'POST',
    body: { token: 'bogus-verify-token' },
  });
  assert.equal(status, 400);
});

test('resendVerification requires an authenticated user', async () => {
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'tester@example.com', password: 'resetpass123' },
  });
  const { status } = await request('/auth/resend-verification', {
    method: 'POST',
    token: loginRes.json.accessToken,
  });
  assert.equal(status, 200);
});

test('trade CRUD isolates per user', async () => {
  const userA = await registerUser('Alice', 'alice@example.com', 'secret123');
  const userB = await registerUser('Bob', 'bob@example.com', 'secret123');
  const tokenA = userA.json.accessToken;
  const tokenB = userB.json.accessToken;

  const tradeA = {
    date: '2026-08-08',
    entryTime: '09:30',
    pair: 'EURUSD',
    session: 'London',
    direction: 'Buy',
    entry: 1.1,
    stopLoss: 1.09,
    target: 1.13,
    result: 'Win',
    rr: 3,
    positionSize: 1,
    riskAmount: 100,
    pnlAmount: 300,
    isValidRuleTrade: true,
  };

  const created = await request('/trades', { method: 'POST', token: tokenA, body: tradeA });
  assert.equal(created.status, 201);
  assert.equal(created.json.data.pair, 'EURUSD');

  const listA = await request('/trades', { token: tokenA });
  const listB = await request('/trades', { token: tokenB });
  assert.equal(listA.json.data.length, 1);
  assert.equal(listB.json.data.length, 0);

  const fetchAsB = await request(`/trades/${created.json.data.id}`, { token: tokenB });
  assert.equal(fetchAsB.status, 404);

  const paginated = await request('/trades?page=1&limit=1', { token: tokenA });
  assert.equal(paginated.json.data.length, 1);
  assert.equal(paginated.json.total, 1);
  assert.equal(paginated.json.pages, 1);

  const updated = await request(`/trades/${created.json.data.id}`, {
    method: 'PUT',
    token: tokenA,
    body: { ...tradeA, pair: 'GBPUSD', result: 'Loss', pnlAmount: -100 },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.json.data.pair, 'GBPUSD');

  const deleted = await request(`/trades/${created.json.data.id}`, {
    method: 'DELETE',
    token: tokenA,
  });
  assert.equal(deleted.status, 200);
  const listAfter = await request('/trades', { token: tokenA });
  assert.equal(listAfter.json.data.length, 0);
});

test('trade create validates input', async () => {
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'alice@example.com', password: 'secret123' },
  });
  const { status } = await request('/trades', {
    method: 'POST',
    token: loginRes.json.accessToken,
    body: { date: '2026-08-08', pair: 'EURUSD' },
  });
  assert.equal(status, 400);
});

test('analytics endpoint returns aggregates', async () => {
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'alice@example.com', password: 'secret123' },
  });
  const token = loginRes.json.accessToken;

  const trade = {
    date: '2026-08-07',
    entryTime: '10:00',
    pair: 'EURUSD',
    session: 'London',
    direction: 'Buy',
    entry: 1.1,
    stopLoss: 1.09,
    target: 1.13,
    result: 'Win',
    rr: 3,
    pnlAmount: 300,
    isValidRuleTrade: true,
  };
  await request('/trades', { method: 'POST', token, body: trade });

  const { status, json } = await request('/analytics', { token });
  assert.equal(status, 200);
  assert.ok(typeof json.data.counts.total === 'number');
  assert.equal(json.data.winRate, 100);
  assert.equal(json.data.totalR, 3);
});

test('unknown route returns 404', async () => {
  const { status } = await request('/does-not-exist');
  assert.equal(status, 404);
});

test('journal CRUD upserts and isolates per user', async () => {
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'alice@example.com', password: 'secret123' },
  });
  const token = loginRes.json.accessToken;

  const body = {
    mood: 'Focused',
    performanceScore: 7,
    whatWentWell: 'Followed the plan all day',
    whatToImprove: 'Cut losing trades sooner',
    lessonsLearned: 'London session is my best edge',
    nextDayPlan: 'Only trade setups with 1:2 R:R',
    gratitude: 'Good discipline',
  };

  const created = await request('/journal/2026-08-10', {
    method: 'PUT',
    token,
    body,
  });
  assert.equal(created.status, 200);
  assert.equal(created.json.data.date, '2026-08-10');
  assert.equal(created.json.data.mood, 'Focused');
  assert.equal(created.json.data.performanceScore, 7);

  const fetched = await request('/journal/2026-08-10', { token });
  assert.equal(fetched.status, 200);
  assert.equal(fetched.json.data.lessonsLearned, 'London session is my best edge');

  const updated = await request('/journal/2026-08-10', {
    method: 'PUT',
    token,
    body: { mood: 'Tired', performanceScore: 4 },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.json.data.mood, 'Tired');
  assert.equal(updated.json.data.whatWentWell, 'Followed the plan all day');

  const list = await request('/journal', { token });
  assert.equal(list.status, 200);
  assert.equal(list.json.data.length, 1);

  const bobRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'bob@example.com', password: 'secret123' },
  });
  const bobToken = bobRes.json.accessToken;
  const asBob = await request('/journal/2026-08-10', { token: bobToken });
  assert.equal(asBob.status, 404);

  const deleted = await request('/journal/2026-08-10', {
    method: 'DELETE',
    token,
  });
  assert.equal(deleted.status, 200);
  const afterDelete = await request('/journal', { token });
  assert.equal(afterDelete.json.data.length, 0);
});

test('journal validates date format', async () => {
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'alice@example.com', password: 'secret123' },
  });
  const token = loginRes.json.accessToken;

  const bad = await request('/journal/not-a-date', {
    method: 'PUT',
    token,
    body: { mood: 'Ok' },
  });
  assert.equal(bad.status, 400);

  const badScore = await request('/journal/2026-08-11', {
    method: 'PUT',
    token,
    body: { performanceScore: 42 },
  });
  assert.equal(badScore.status, 400);
});
