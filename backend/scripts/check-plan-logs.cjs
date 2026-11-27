// Uses real HTTP authentication, disposable users/foods, and the configured DB.
require('dotenv').config();
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const base = process.env.RECORDS_CHECK_URL || 'http://localhost:3000/api';
const users = [];
let checks = 0;
async function api(token, method, path, body, expected) {
  const r = await fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await r.json();
  if (expected) assert.equal(r.status, expected, `${method} ${path}: ${JSON.stringify(data)}`);
  else assert.ok(r.ok, `${method} ${path}: ${r.status} ${JSON.stringify(data)}`);
  return data;
}
function check(name, run) { return Promise.resolve().then(run).then(() => { checks++; console.log(`PASS ${name}`); }); }
async function main() {
  for (let i = 0; i < 2; i++) {
    const email = `records-check-${randomUUID()}@example.com`;
    const auth = await api(null, 'POST', '/auth/register', { email, password: `Test!${randomUUID()}` });
    users.push({ id: auth.user.id, email, token: auth.accessToken });
  }
  const token = users[0].token, other = users[1].token;
  const call = (method, path, body, expected) => api(token, method, path, body, expected);
  const categories = await call('GET', '/categories');
  const aBody = { name: 'Record test A', categoryId: categories[0].id, calories: 100, protein: 10, carbs: 10, fat: 2, fiber: null, sugars: 1, sodium: 10 };
  const bBody = { ...aBody, name: 'Record test B', calories: 90, protein: 8, carbs: 12, fat: 1, fiber: 2 };
  const a = await call('POST', '/foods', aBody), b = await call('POST', '/foods', bBody);
  const foreign = await api(other, 'POST', '/foods', aBody);
  const d = '2026-11-10', d2 = '2026-11-11';
  const getPlan = () => call('GET', `/plans?date=${d}`);
  const getLogs = () => call('GET', `/logs?date=${d}`);
  let item = await call('POST', `/plans/${d}/items`, { foodId: a.id, meal: 'BREAKFAST', grams: 500 });
  const original = { foodId: a.id, meal: 'BREAKFAST', grams: 500, status: 'COMPLETED', expectedRevision: 0 };
  let logId;
  await check('Pending plan is not consumed; concurrent confirmations create exactly one log', async () => {
    assert.equal(item.status, 'PENDING');
    assert.equal((await getLogs()).totals.calories, 0);
    await Promise.all(Array.from({ length: 12 }, () => call('PUT', `/plans/items/${item.id}`, original)));
    const logs = await getLogs();
    assert.equal(logs.items.length, 1);
    assert.equal(logs.items[0].planItemId, item.id);
    assert.equal(logs.totals.calories, 500);
    assert.equal(logs.totals.protein, 50);
    assert.equal((await getPlan()).items[0].status, 'COMPLETED');
    logId = logs.items[0].id;
  });
  await check('Skipped item creates no log and adds no consumed calories', async () => {
    const skip = await call('POST', `/plans/${d}/items`, { foodId: a.id, meal: 'LUNCH', grams: 100 });
    await call('PUT', `/plans/items/${skip.id}`, { foodId: a.id, meal: 'LUNCH', grams: 100, status: 'SKIPPED', expectedRevision: skip.revision });
    assert.equal((await getLogs()).items.length, 1);
    assert.equal((await getLogs()).totals.calories, 500);
    assert.equal((await getPlan()).progress.skippedItems, 1);
  });
  await check('Replacement records only actual food (450 kcal), preserving linked log ID', async () => {
    item = (await getPlan()).items.find(i => i.id === item.id);
    item = await call('PUT', `/plans/items/${item.id}`, { foodId: b.id, meal: 'BREAKFAST', grams: 500, status: 'COMPLETED', expectedRevision: item.revision });
    const logs = await getLogs();
    assert.equal(logs.items.length, 1); assert.equal(logs.items[0].id, logId);
    assert.equal(logs.items[0].foodId, b.id); assert.equal(logs.totals.calories, 450);
    await call('PUT', `/plans/items/${item.id}`, original, 409);
    assert.equal((await getLogs()).totals.calories, 450);
  });
  await check('Actual portions recalculate totals; log edits synchronize plan', async () => {
    await call('PUT', `/logs/${d}/completeness`, { completed: true });
    assert.equal((await getLogs()).completed, true);
    item = await call('PUT', `/plans/items/${item.id}`, { foodId: b.id, meal: 'BREAKFAST', grams: 250, expectedRevision: item.revision });
    assert.equal((await getLogs()).totals.calories, 225);
    assert.equal((await getLogs()).completed, false);
    await call('PUT', `/logs/${d}/completeness`, { completed: true });
    await call('PUT', `/logs/items/${logId}`, { foodId: b.id, meal: 'DINNER', grams: 200 });
    assert.equal((await getLogs()).completed, false);
    item = (await getPlan()).items.find(i => i.id === item.id);
    assert.equal(Number(item.grams), 200); assert.equal(item.meal, 'DINNER'); assert.equal(item.status, 'COMPLETED');
    assert.equal((await getLogs()).totals.calories, 180);
    await call('PUT', `/logs/items/${logId}`, { foodId: a.id, meal: 'DINNER', grams: 100 });
    assert.equal((await getPlan()).items.find(i => i.id === item.id).foodId, a.id);
    assert.equal((await getLogs()).totals.calories, 100);
    await call('PUT', `/logs/items/${logId}`, { foodId: b.id, meal: 'DINNER', grams: 200 });
    assert.equal((await getLogs()).totals.calories, 180);
  });
  await check('Deleting log resets plan to PENDING; reconfirm and skip remain consistent', async () => {
    await call('DELETE', `/logs/items/${logId}`);
    assert.equal((await getLogs()).totals.calories, 0);
    item = (await getPlan()).items.find(i => i.id === item.id);
    assert.equal(item.status, 'PENDING');
    item = await call('PUT', `/plans/items/${item.id}`, { foodId: b.id, meal: 'DINNER', grams: 200, status: 'COMPLETED', expectedRevision: item.revision });
    assert.equal((await getLogs()).items.length, 1);
    await call('PUT', `/plans/items/${item.id}`, { foodId: b.id, meal: 'DINNER', grams: 200, status: 'SKIPPED', expectedRevision: item.revision });
    assert.equal((await getLogs()).items.length, 0);
  });
  let manual, next;
  await check('Manual logs are independent; switching date leaves previous day unchanged', async () => {
    manual = await call('POST', `/logs/${d}/items`, { foodId: a.id, meal: 'SNACK', grams: 100 });
    assert.equal(manual.planItemId, null); assert.equal(manual.fromPlan, false);
    next = await call('POST', `/plans/${d2}/items`, { foodId: a.id, meal: 'LUNCH', grams: 100 });
    await call('PUT', `/plans/items/${next.id}`, { foodId: a.id, meal: 'LUNCH', grams: 100, status: 'COMPLETED', expectedRevision: next.revision });
    assert.equal((await getLogs()).totals.calories, 100);
    assert.equal((await call('GET', `/logs?date=${d2}`)).totals.calories, 100);
    const dash = await call('GET', `/dashboard?date=${d}`);
    assert.equal(dash.consumed.calories, 100); assert.equal(dash.progress.completedItems, 0);
    assert.equal(dash.progress.loggedMeals, 1);
    const nextDash = await call('GET', `/dashboard?date=${d2}`);
    assert.equal(nextDash.progress.completedItems, 1); assert.equal(nextDash.progress.completedMeals, 1);
  });
  await check('Ownership, private foods, validation and bulk replacement guard', async () => {
    for (const method of ['PUT', 'DELETE']) {
      await api(other, method, `/plans/items/${next.id}`, method === 'PUT' ? original : undefined, 404);
      await api(other, method, `/logs/items/${manual.id}`, method === 'PUT' ? { foodId: foreign.id, meal: 'SNACK', grams: 1 } : undefined, 404);
    }
    assert.equal((await api(other, 'GET', `/logs?date=${d}`)).items.length, 0);
    await call('POST', `/logs/${d}/items`, { foodId: foreign.id, meal: 'SNACK', grams: 100 }, 404);
    await call('PUT', `/plans/items/${next.id}`, { ...original, status: 'INVALID' }, 400);
    await call('POST', `/logs/${d}/items`, { foodId: a.id, meal: 'SNACK', grams: -1 }, 400);
    await call('POST', `/logs/${d}/items`, { foodId: a.id, meal: 'SNACK', grams: 100, planItemId: next.id }, 400);
    // Failed replacement must roll back both sides, not remove the existing log.
    const actual = (await getPlan()).items.find(i => i.id === item.id);
    await call('PUT', `/plans/items/${item.id}`, { foodId: foreign.id, meal: 'DINNER', grams: 100, status: 'COMPLETED', expectedRevision: actual.revision }, 404);
    assert.equal((await getLogs()).totals.calories, 100);
    assert.equal((await getPlan()).items.find(i => i.id === item.id).status, 'SKIPPED');
    await call('PUT', `/plans/${d2}/items`, { items: [] }, 409);
    assert.equal((await call('GET', `/logs?date=${d2}`)).totals.calories, 100);
  });
  await check('Deleting consumed plan preserves actual history and its origin', async () => {
    await call('DELETE', `/plans/items/${next.id}`);
    const logs = await call('GET', `/logs?date=${d2}`);
    assert.equal(logs.items.length, 1); assert.equal(logs.items[0].planItemId, null);
    assert.equal(logs.items[0].fromPlan, true); assert.equal(logs.totals.calories, 100);
  });
  await check('Nutrition snapshots remain stable after food catalog edits, including unknown nutrients', async () => {
    await call('PUT', `/foods/${a.id}`, { ...aBody, name: 'Changed catalog A', calories: 999, fiber: 10 });
    let logs = await getLogs();
    assert.equal(logs.totals.calories, 100); assert.equal(logs.items[0].food.name, aBody.name);
    assert.equal(logs.items[0].food.fiber, null);
    await call('PUT', `/logs/items/${manual.id}`, { foodId: a.id, meal: 'SNACK', grams: 125 });
    assert.equal((await getLogs()).totals.calories, 125);
    assert.equal((await call('GET', `/dashboard?date=${d}`)).consumed.calories, 125);
    const charts = await call('GET', `/dashboard/charts?mode=DAY&date=${d}`);
    assert.equal(charts.totals.calories, 125);
    const fresh = await call('POST', `/logs/${d}/items`, { foodId: a.id, meal: 'SNACK', grams: 100 });
    assert.equal(Number(fresh.food.calories), 999);
    await call('DELETE', `/logs/items/${fresh.id}`);
    assert.equal((await getLogs()).totals.calories, 125);
  });
  console.log(`All ${checks} Plans/Logs integration scenarios passed.`);
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => {
  // Delete only users created by this run; ownership is rechecked before cleanup.
  for (const u of users) {
    const exact = await db.user.findFirst({ where: { id: u.id, email: u.email } });
    if (!exact) continue;
    await db.$transaction(async tx => {
      await tx.foodLog.deleteMany({ where: { userId: u.id } });
      await tx.mealPlan.deleteMany({ where: { userId: u.id } });
      await tx.user.delete({ where: { id: u.id } });
    });
  }
  await db.$disconnect();
});
