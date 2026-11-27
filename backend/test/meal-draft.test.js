const { test } = require('node:test');
const assert = require('node:assert/strict');
const { RecommendationsService } = require("../dist/modules/recommendations/recommendations.service");
const { RecommendationSafetyService } = require("../dist/modules/recommendations/recommendation-safety.service");
const { buildMealDraft } = require('../dist/modules/recommendations/meal-draft');

const food = (id, code, calories, protein, carbs, fat) => ({
  id, name: `Food ${id}`, category: { code }, calories, protein, carbs, fat,
});
const foods = [
  ...Array.from({ length: 8 }, (_, i) => food(i + 1, 'MEAT_POULTRY', 151, 29, 0, 3.03)),
  food(20, 'GRAINS', 123, 2.74, 25.6, .97),
  food(21, 'DAIRY', 61, 3.15, 4.8, 3.25),
  food(22, 'FRUITS', 89, 1.09, 22.8, .33),
  food(23, 'VEGETABLES', 34, 2.82, 6.64, .37),
  food(24, 'LEGUMES_NUTS', 579, 21.2, 21.6, 49.9),
  food(25, 'SEAFOOD', 208, 20.4, 0, 13.4),
];
const target = { calories: 2224, protein: 111, carbs: 278, fat: 74 };
function service(catalog = foods, eaten = { calories: 0, protein: 0, carbs: 0, fat: 0 }, excluded = []) {
  return new RecommendationsService({
    user: { findUniqueOrThrow: async () => ({ usageMode: 'PERSONALIZED', profile: { healthConditions: [], allergies: [], dietaryPreferences: [] } }) },
    userFoodPreference: { findMany: async () => excluded.map(foodId => ({ foodId })) },
    mealPlan: { findMany: async () => [] },
    food: { findMany: async () => catalog },
  }, { target: async () => target, consumed: async () => eaten }, new RecommendationSafetyService());
}
function checkLimits(result) {
  for (const key of ['calories', 'protein', 'carbs', 'fat']) {
    const total = result.draft.reduce((s, i) => s + Number(i.food[key]) * i.grams / 100, 0);
    assert.ok(total <= result.remaining[key] + 1e-7, `${key}: ${total} exceeds ${result.remaining[key]}`);
  }
}
test('full candidate pool fills four meals when top eight foods are all protein sources', async () => {
  const s = service();
  const suggestions = await s.suggest(1, '2026-11-28');
  assert.equal(suggestions.suggestions.length, 8);
  const result = await s.plan(1, '2026-11-28');
  assert.deepEqual(new Set(result.draft.map(i => i.meal)), new Set(result.mealSlots));
  assert.ok(result.draft.some(i => i.food.category.code === 'GRAINS'));
  assert.ok(result.draft.some(i => i.food.category.code === 'FRUITS'));
  assert.ok(result.draftCalories > target.calories * .7);
  checkLimits(result);
});
test('partial actual intake reserves nutrients for later meals and respects exclusions', async () => {
  const result = await service(foods, { calories: 580, protein: 25, carbs: 80, fat: 18 }, [1, 2, 3]).plan(1, '2026-11-28');
  assert.equal(new Set(result.draft.map(i => i.meal)).size, 4);
  assert.ok(result.draft.every(i => ![1, 2, 3].includes(i.foodId)));
  checkLimits(result);
});
test('exhausted or unavailable nutrients produce honest incomplete previews without invalid portions', async () => {
  for (const s of [service([], undefined), service(foods, target), service(foods, { calories: 1800, protein: 111, carbs: 278, fat: 74 })]) {
    const result = await s.plan(1, '2026-11-28');
    assert.equal(result.draft.length, 0);
    assert.equal(result.draftCalories, 0);
    assert.ok(result.planWarnings.length);
    checkLimits(result);
  }
});
test('weekly preview keeps four populated meals each day without writing plans or logs', async () => {
  const result = await service().week(1, '2026-11-28');
  assert.equal(result.days.length, 7);
  assert.equal(result.days.at(-1).date, '2026-12-04');
  for (const day of result.days) assert.equal(new Set(day.draft.map(i => i.meal)).size, 4);
});

test('weekly and regenerated drafts vary foods when the safe catalog has alternatives', async () => {
  const rich = foods.flatMap(f => [f, { ...f, id: f.id + 100 }, { ...f, id: f.id + 200 }]);
  const s = service(rich);
  const week = await s.week(1, '2026-11-28');
  const signature = draft => draft.map(i => `${i.meal}:${i.foodId}`).sort().join('|');
  assert.ok(new Set(week.days.map(d => signature(d.draft))).size >= 5);
  const regenerated = await Promise.all(Array.from({ length: 8 }, () => s.plan(1, '2026-11-28')));
  assert.ok(new Set(regenerated.map(r => signature(r.draft))).size > 1);
  for (const r of regenerated) checkLimits(r);
});

test('recent usage changes choices, sparse catalogs still work, invalid dates are rejected', async () => {
  const rich = foods.flatMap(f => [f, { ...f, id: f.id + 100 }]);
  const first = buildMealDraft(rich, target, { seed: 42 });
  const usage = new Map(first.draft.map(i => [i.foodId, 100]));
  const next = buildMealDraft(rich, target, { seed: 42, recentUsage: usage });
  assert.ok(next.draft.some(i => !usage.has(i.foodId)));
  const sparse = await service([foods[0]]).plan(1, '2026-11-28');
  checkLimits(sparse);
  await assert.rejects(service().plan(1, '2026-02-30'));
  await assert.rejects(service().week(1, '2026-02-30'));
});
