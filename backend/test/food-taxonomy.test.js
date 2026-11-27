const { test } = require("node:test");
const assert = require("node:assert/strict");
const { foodTaxonomy, searchFoodNames, missingFoodReferences } = require("../dist/modules/foods/food-taxonomy");
const { RecommendationSafetyService } = require("../dist/modules/recommendations/recommendation-safety.service");
const catalog = require("../prisma/data/food-catalog.json");
test("eight primary groups keep stable codes and ordering, with a separate prepared-food group", () => {
  assert.deepEqual(
    foodTaxonomy.slice(0, 8).map((g) => g.code),
    [
      "GRAINS",
      "VEGETABLES",
      "FRUITS",
      "MEAT_POULTRY",
      "SEAFOOD",
      "EGGS",
      "DAIRY",
      "LEGUMES_NUTS",
    ],
  );
  assert.equal(foodTaxonomy[8].code, "PREPARED");
  const names = foodTaxonomy.flatMap((g) =>
    g.subgroups.flatMap((s) => s.foods),
  );
  assert.equal(new Set(names).size, names.length);
  assert.ok(catalog.foods.length > 200);
  const missing = missingFoodReferences(catalog.foods);
  assert.equal(missing.length, 0);
  assert.equal(catalog.pending.length, 0);
  assert.deepEqual([...names].sort(), catalog.foods.map((f) => f.name).sort());
  assert.ok(
    missing.every((f) => !catalog.foods.some((x) => x.name === f.name)),
  );
});
test("aliases find canonical foods without creating duplicate ingredients", () => {
  assert.ok(searchFoodNames("rau bina").includes("Cải bó xôi"));
  assert.ok(searchFoodNames("bi dao").includes("Bí xanh"));
  assert.ok(searchFoodNames("bap").includes("Ngô"));
  assert.ok(searchFoodNames("đậu tương").includes("Đậu nành"));
});
test("every usable food has finite macro values and provenance; missing composition stays null", () => {
  for (const f of catalog.foods) {
    for (const k of ["calories", "protein", "carbs", "fat"])
      assert.ok(
        typeof f[k] === "number" && Number.isFinite(f[k]) && f[k] >= 0,
        f.name + " " + k,
      );
    assert.ok(f.nutritionSourceUrl?.startsWith("https://"));
    assert.ok(
      foodTaxonomy
        .find((g) => g.code === f.categoryCode)
        ?.subgroups.some((s) => s.name === f.subgroup),
    );
    if (f.sourceRecord?.cellulose !== undefined)
      assert.equal(
        f.fiber,
        null,
        "Crude cellulose must not be relabelled as total dietary fibre",
      );
  }
});
test("raw eggs and boiled eggs remain distinct, and species names are not interchanged", () => {
  const byName = (n) => catalog.foods.find((f) => f.name === n);
  assert.equal(byName("Trứng gà").sourceRecord.code, "9001");
  assert.ok(byName("Trứng gà luộc").nutritionSourceUrl.includes("173424"));
  assert.equal(byName("Trứng gà luộc").calories, 155);
  assert.equal(byName("Hến").sourceRecord.code, "8037");
  assert.ok(byName("Nghêu").foodDescription.toLowerCase().includes("clam"));
});
test("diet exclusions use category codes for English food names and do not mistake vegetable names for fish", () => {
  const s = new RecommendationSafetyService();
  assert.equal(
    s.evaluate(
      { name: "Cheddar", category: { name: "Sữa", code: "DAIRY" } },
      [],
      [],
      ["VEGAN"],
    ).allowed,
    false,
  );
  assert.equal(
    s.evaluate(
      { name: "Bạch tuộc", category: { name: "Hải sản", code: "SEAFOOD" } },
      [],
      [],
      ["VEGETARIAN"],
    ).allowed,
    false,
  );
  assert.equal(
    s.evaluate(
      { name: "Cà rốt", category: { name: "Rau", code: "VEGETABLES" } },
      [],
      [],
      ["VEGETARIAN"],
    ).allowed,
    true,
  );
});
