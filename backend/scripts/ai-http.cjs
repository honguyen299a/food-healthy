require('dotenv/config');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const { JwtService } = require('@nestjs/jwt');
const db = new PrismaClient();
const base = `http://127.0.0.1:${process.env.PORT || 3000}/api/ai`;
(async () => {
  let user, other;
  try {
    user = await db.user.create({ data: { email: `ai-http-${require('node:crypto').randomUUID()}@example.invalid`, passwordHash: 'not-a-login-hash' } });
    other = await db.user.create({ data: { email: `ai-http-other-${require('node:crypto').randomUUID()}@example.invalid`, passwordHash: 'not-a-login-hash' } });
    const jwt = new JwtService({ secret: process.env.JWT_SECRET });
    const token = jwt.sign({ sub: user.id, role: 'USER' });
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    assert.equal((await fetch(base + '/conversations')).status, 401);
    const created = await fetch(base + '/conversations', { method: 'POST', headers, body: '{}' });
    assert.equal(created.status, 201);
    const c = await created.json();
    assert.equal((await fetch(base + '/conversations/' + c.id, { headers })).status, 200);
    const foreign = jwt.sign({ sub: other.id, role: 'USER' });
    assert.equal((await fetch(base + '/conversations/' + c.id, { headers: { Authorization: `Bearer ${foreign}` } })).status, 404);
    const draftId = require('node:crypto').randomUUID();
    for (const body of [{ version: 1, action: 'SAVE_PLAN' }, { confirmed: false, version: 1, action: 'SAVE_PLAN' }, { confirmed: true, version: 1, action: 'SAVE_PLAN', userId: user.id + 1 }]) {
      assert.equal((await fetch(`${base}/conversations/${c.id}/drafts/${draftId}/confirm`, { method: 'POST', headers, body: JSON.stringify(body) })).status, 400);
    }
    assert.equal((await fetch(`${base}/conversations/${c.id}/messages`, { method: 'POST', headers, body: JSON.stringify({ message: 'test', date: '2026-02-30', mode: 'ADVICE' }) })).status, 400);
    console.log('PASS HTTP auth, ownership, explicit confirmation, forbidden fields and date validation');
  } finally {
    if (user) await db.user.delete({ where: { id: user.id } });
    if (other) await db.user.delete({ where: { id: other.id } });
    await db.$disconnect();
  }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
