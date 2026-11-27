const { test } = require("node:test");
const assert = require("node:assert/strict");
const { RecommendationsService } = require("../dist/modules/recommendations/recommendations.service");
const { RecommendationSafetyService } = require("../dist/modules/recommendations/recommendation-safety.service");
const { targets } = require("../dist/modules/nutrition/nutrition-calculator");
const { analyzePlan } = require("../dist/modules/meal-records/plan-analysis");
const { NutritionService } = require("../dist/modules/nutrition/nutrition.service");

test("Mifflin-St Jeor and activity multiplier produce stable targets", () => {
  const result = targets({
    age: 30,
    gender: "FEMALE",
    heightCm: 165,
    weightKg: 60,
    activity: "MODERATE",
    goal: "MAINTAIN",
  });
  assert.equal(result.bmr, 1320);
  assert.equal(result.tdee, 2046);
  assert.equal(result.calories, 2046);
  assert.equal(result.bmi, 22);
});

test("adult macro targets are consistent with energy allocation", () => {
  const result = targets({
    age: 30,
    gender: "FEMALE",
    heightCm: 165,
    weightKg: 60,
    activity: "MODERATE",
    goal: "MAINTAIN",
  });
  assert.ok(Math.abs((result.protein * 4) / result.calories - 0.2) < 0.01);
  assert.ok(Math.abs((result.carbs * 4) / result.calories - 0.5) < 0.01);
  assert.ok(Math.abs((result.fat * 9) / result.calories - 0.3) < 0.01);
});

test("personalized automatic targets are withheld for groups needing individual guidance", async () => {
  for (const profile of [
    { age: 17, healthConditions: [] },
    { age: 30, healthConditions: ["PREGNANCY"] },
    { age: 30, healthConditions: ["KIDNEY_DISEASE"] },
  ]) {
    const service = new NutritionService({
      user: {
        findUniqueOrThrow: async () => ({ usageMode: "PERSONALIZED", profile }),
      },
    });
    assert.equal(await service.target(1), null);
  }
});

test("recommendations exclude preferences and stay within remaining energy", async () => {
  const foods = [
    {
      id: 1,
      name: "Avoid",
      calories: 100,
      protein: 20,
      carbs: 1,
      fat: 1,
      category: { name: "Đạm" },
    },
    {
      id: 2,
      name: "Chicken",
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 3.6,
      category: { name: "Đạm" },
    },
    {
      id: 3,
      name: "Oats",
      calories: 389,
      protein: 16.9,
      carbs: 66,
      fat: 7,
      category: { name: "Ngũ cốc" },
    },
  ];
  const profile = {
    healthConditions: [],
    allergies: [],
    dietaryPreferences: [],
    budgetPerDay: null,
  };
  const db = {
    user: {
      findUniqueOrThrow: async () => ({ usageMode: "PERSONALIZED", profile }),
    },
    userFoodPreference: { findMany: async () => [{ foodId: 1 }] },
    mealPlan: { findMany: async () => [] },
    food: { findMany: async () => foods },
  };
  const nutritionService = {
    target: async () => ({ calories: 2000, protein: 100, carbs: 250, fat: 60 }),
    consumed: async () => ({
      calories: 1450,
      protein: 70,
      carbs: 230,
      fat: 50,
    }),
  };
  const result = await new RecommendationsService(
    db,
    nutritionService,
    new RecommendationSafetyService(),
  ).suggest(1, "2026-11-07", 3);
  assert.equal(result.remaining.calories, 550);
  assert.ok(result.suggestions.length > 0);
  assert.ok(
    result.suggestions.every(
      (x) => x.food.id !== 1 && x.macros.calories <= 550 * 1.05,
    ),
  );
});

test("generated plan checks combined macros against the remaining target", async () => {
  const foods = Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    name: `Food ${i}`,
    calories: 100 + i * 10,
    protein: 10,
    carbs: 12,
    fat: 2,
    category: { name: "Mixed" },
  }));
  const profile = {
    healthConditions: [],
    allergies: [],
    dietaryPreferences: [],
    budgetPerDay: null,
  };
  const db = {
    user: {
      findUniqueOrThrow: async () => ({ usageMode: "PERSONALIZED", profile }),
    },
    userFoodPreference: { findMany: async () => [] },
    mealPlan: { findMany: async () => [] },
    food: { findMany: async () => foods },
  };
  const nutritionService = {
    target: async () => ({ calories: 2000, protein: 100, carbs: 250, fat: 60 }),
    consumed: async () => ({
      calories: 1500,
      protein: 70,
      carbs: 220,
      fat: 50,
    }),
  };
  const result = await new RecommendationsService(
    db,
    nutritionService,
    new RecommendationSafetyService(),
  ).plan(1, "2026-11-07", 3);
  const total = result.draft.reduce(
    (a, item) => ({
      calories: a.calories + (item.food.calories * item.grams) / 100,
      protein: a.protein + (item.food.protein * item.grams) / 100,
      carbs: a.carbs + (item.food.carbs * item.grams) / 100,
      fat: a.fat + (item.food.fat * item.grams) / 100,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  for (const key of Object.keys(total))
    assert.ok(
      total[key] <= result.remaining[key] + 0.001,
      `${key} exceeded target`,
    );
});

test("safety rules exclude declared allergies and do not infer undeclared conditions", () => {
  const safety = new RecommendationSafetyService();
  assert.equal(
    safety.evaluate({ name: "Tôm hấp" }, [], ["tôm"], []).allowed,
    false,
  );
  assert.equal(safety.evaluate({ name: "Tôm hấp" }, [], [], []).allowed, true);
  assert.equal(safety.warnings([]).length, 0);
});

test('no-added-sugar wording is not mistaken for sugar, and unaccented allergy names still match', () => {
  const safety = new RecommendationSafetyService();
  assert.equal(safety.evaluate({ name: 'Sữa tươi không đường' }, ['DIABETES'], [], []).allowed, true);
  assert.equal(safety.evaluate({ name: 'Kẹo không đường' }, ['DIABETES'], [], []).allowed, false);
  assert.equal(safety.evaluate({ name: 'Đậu phộng' }, [], ['dau phong'], []).allowed, false);
});

test("weekly plan analysis flags nutritional gaps and declared allergy matches", () => {
  const safety = new RecommendationSafetyService();
  const items = [{ foodId: 1, meal: "LUNCH", food: { name: "Sữa đậu phộng" } }];
  const result = analyzePlan(
    items,
    { calories: 700, protein: 30, carbs: 80, fat: 20 },
    { calories: 2000, protein: 100, carbs: 250, fat: 60 },
    {
      mealsPerDay: 3,
      healthConditions: [],
      allergies: ["đậu phộng"],
      dietaryPreferences: [],
    },
    safety,
  );
  assert.equal(result.status, "DANGER");
  assert.ok(result.issues.some((issue) => issue.code === "LOW_CALORIES"));
  assert.ok(
    result.issues.some(
      (issue) => issue.level === "danger" && issue.message.includes("dị ứng"),
    ),
  );
});

test("automatic plans use four meal slots even when an old caller asks for a different count", async () => {
  const foods = Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    name: "Food " + i,
    calories: 120,
    protein: 5,
    carbs: 15,
    fat: 3,
    category: { name: "Mixed" },
  }));
  const db = {
    user: {
      findUniqueOrThrow: async () => ({
        usageMode: "PERSONALIZED",
        profile: {
          healthConditions: [],
          allergies: [],
          dietaryPreferences: [],
        },
      }),
    },
    userFoodPreference: { findMany: async () => [] },
    mealPlan: { findMany: async () => [] },
    food: { findMany: async () => foods },
  };
  const service = new RecommendationsService(
    db,
    {
      target: async () => ({
        calories: 2000,
        protein: 100,
        carbs: 250,
        fat: 60,
      }),
      consumed: async () => ({ calories: 0, protein: 0, carbs: 0, fat: 0 }),
    },
    new RecommendationSafetyService(),
  );
  const result = await service.plan(1, "2026-11-27", 1);
  assert.equal(result.mealCount, 4);
  assert.deepEqual(result.mealSlots, ["BREAKFAST", "LUNCH", "DINNER", "SNACK"]);
  const totals = result.draft.reduce(
    (n, item) => {
      for (const key of Object.keys(n))
        n[key] += (Number(item.food[key]) * item.grams) / 100;
      return n;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  for (const key of Object.keys(totals))
    assert.ok(totals[key] <= result.remaining[key] + 0.001);
});
