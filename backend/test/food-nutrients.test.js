require("reflect-metadata");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validateSync } = require("class-validator");
const { FoodDto } = require("../dist/modules/foods/dto/foods.dto");
const { nutrition, sum } = require("../dist/modules/nutrition/nutrition-calculator");
const food = {
  name: "Thực phẩm thử",
  categoryId: 1,
  calories: 100,
  protein: 5,
  carbs: 15,
  fat: 2,
};
test("nutrient columns accept unknown, zero and decimals without breaking old clients", () => {
  for (const values of [
    {},
    { fiber: null, sugars: null, sodium: null },
    { fiber: 0, sugars: 2.5, sodium: 12.12345678 },
  ])
    assert.equal(
      validateSync(Object.assign(new FoodDto(), food, values)).length,
      0,
    );
});
test("nutrient columns reject negative, nonfinite, nonnumeric and out-of-range amounts", () => {
  for (const values of [
    { fiber: -1 },
    { fiber: 101 },
    { sugars: 101 },
    { sodium: 100001 },
    { fiber: "2" },
    { sodium: Infinity },
    { sugars: NaN },
  ])
    assert.ok(validateSync(Object.assign(new FoodDto(), food, values)).length);
  assert.ok(
    validateSync(
      Object.assign(new FoodDto(), food, { nutrients: { fiber: 2 } }),
      { whitelist: true, forbidNonWhitelisted: true },
    ).length,
  );
});
test("moving nutrient storage does not change portion calculations or daily macro totals", () => {
  const migrated = { ...food, fiber: 3, sugars: 1, sodium: 12 };
  const unknown = { ...food, fiber: null, sugars: null, sodium: null };
  assert.deepEqual(nutrition(migrated, 150), nutrition(food, 150));
  assert.deepEqual(nutrition(unknown, 150), nutrition(food, 150));
  assert.deepEqual(sum([nutrition(migrated, 150), nutrition(unknown, 50)]), {
    calories: 200,
    protein: 10,
    carbs: 30,
    fat: 4,
  });
});
