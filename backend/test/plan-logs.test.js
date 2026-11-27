const { test } = require('node:test');
const assert = require('node:assert/strict');
const { nutritionSnapshot, recordedFood, withConsumedPlanFood, planProgress } = require("../dist/modules/meal-records/recorded-nutrition");
const { aggregateNutrition } = require("../dist/modules/monitoring/monitoring-analysis");

test('actual nutrition uses captured values after catalog changes and keeps unknown nutrients unknown', () => {
  const original = { name: 'Original', calories: 100, protein: 10, carbs: 12, fat: 2, fiber: null, sugars: 3, sodium: 10 };
  const item = { ...nutritionSnapshot(original), grams: 250, food: { ...original, name: 'Edited', calories: 999, protein: 99, fiber: 10 } };
  assert.equal(recordedFood(item).name, 'Original');
  const total = aggregateNutrition([item]);
  assert.equal(total.calories, 250); assert.equal(total.protein, 25);
  assert.equal(total.fiber, null); assert.equal(total.coverage.fiber.complete, false);
  assert.equal(total.sugars, 7.5);
  const plan = withConsumedPlanFood({ food: item.food, status: 'COMPLETED', logItem: item });
  assert.equal(plan.food.calories, 100);
  assert.equal(withConsumedPlanFood({ food: item.food, status: 'PENDING' }).food.calories, 999);
});

test('meal progress distinguishes partially eaten meals, skipped meals and actual extra meals', () => {
  const items = [
    { meal: 'BREAKFAST', status: 'COMPLETED' },
    { meal: 'BREAKFAST', status: 'PENDING' },
    { meal: 'LUNCH', status: 'COMPLETED' },
    { meal: 'LUNCH', status: 'SKIPPED' },
    { meal: 'DINNER', status: 'SKIPPED' },
  ];
  assert.deepEqual(planProgress(items, [{ meal: 'BREAKFAST' }, { meal: 'LUNCH' }, { meal: 'SNACK' }, { meal: 'SNACK' }]), {
    totalItems: 5, completedItems: 2, skippedItems: 2, pendingItems: 1, completionPercent: 40,
    plannedMeals: 3, completedMeals: 1, pendingMeals: 1, skippedMeals: 1, loggedMeals: 3,
  });
  assert.equal(planProgress([]).completionPercent, 0);
});
