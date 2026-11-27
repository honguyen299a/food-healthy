require("reflect-metadata");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validateSync } = require("class-validator");
const { aggregateNutrition, analyzePeriod, createInsights } = require("../dist/modules/monitoring/monitoring-analysis");
const { localToday, monday } = require("../dist/common/utils/date");
const { evaluateRules } = require("../dist/modules/monitoring/monitoring-rules");
const { RecommendationSafetyService } = require("../dist/modules/recommendations/recommendation-safety.service");
const { MonitoringSettingsDto } = require("../dist/modules/monitoring/dto/monitoring.dto");
const { nutrition, sum } = require("../dist/modules/nutrition/nutrition-calculator");
const safety = new RecommendationSafetyService();
const food = {
  id: 1,
  name: "Yến mạch",
  calories: 100,
  protein: 5,
  carbs: 15,
  fat: 2,
  fiber: 3,
  sugars: 0,
  sodium: 12,
};
const item = (overrides = {}) => ({
  foodId: 1,
  food: { ...food, ...overrides },
  grams: 100,
  meal: "BREAKFAST",
});
const log = (date, completed = true, overrides = {}) => ({
  date: new Date(date),
  completed,
  items: [item(overrides)],
});
const target = { calories: 2000, protein: 100, carbs: 250, fat: 60 };
const rules = (
  logs = [],
  plans = [],
  weights = [],
  settings = {},
  profile = {},
  preferences = [],
) =>
  evaluateRules(
    "2026-11-26",
    logs,
    plans,
    weights,
    target,
    profile,
    preferences,
    settings,
    safety,
  );
const active = (results, type) => results.find((r) => r.type === type)?.active;

test("extended totals preserve legacy portion arithmetic and distinguish unknown from zero", () => {
  const items = [
    { ...item(), grams: 150 },
    { ...item({ fiber: null }), grams: 35.5 },
  ];
  const result = aggregateNutrition(items);
  for (const key of ["calories", "protein", "carbs", "fat"])
    assert.equal(
      result[key],
      sum(items.map((x) => nutrition(x.food, x.grams)))[key],
    );
  assert.equal(result.fiber, null);
  assert.equal(result.sugars, 0);
  assert.equal(result.coverage.fiber.knownTotal, 4.5);
  assert.equal(aggregateNutrition([]).fiber, null);
  assert.equal(aggregateNutrition([item({ fiber: 0 })]).fiber, 0);
});
test("weekly averages exclude unlogged days and incomplete nutrient coverage", () => {
  const current = analyzePeriod(
    "2026-11-19",
    [
      log("2026-11-19"),
      log("2026-11-20", false, { calories: 300, fiber: null }),
    ],
    [],
    target,
    {},
    {},
  );
  assert.equal(current.loggedDays, 2);
  assert.equal(current.completedDays, 1);
  assert.equal(current.averages.calories.value, 200);
  assert.equal(current.averages.fiber.value, 3);
  assert.equal(current.averages.fiber.days, 1);
  assert.equal(current.averages.fiber.missingDays, 1);
  assert.equal(current.attainment.calories.evaluatedDays, 1);
  assert.equal(current.weight.change, null);
  assert.deepEqual(createInsights(current, current), []);
});
test("protein and fiber shortfall require three consecutive completed calendar days", () => {
  const days = ["2026-11-23", "2026-11-24", "2026-11-25"];
  const logs = days.map((d) => log(d));
  assert.equal(
    active(rules(logs, [], [], { fiberMin: 25 }), "PROTEIN_LOW"),
    true,
  );
  assert.equal(
    active(rules(logs, [], [], { fiberMin: 25 }), "FIBER_LOW"),
    true,
  );
  assert.equal(active(rules([logs[0], logs[2]]), "PROTEIN_LOW"), null);
  assert.equal(
    active(rules([logs[0], log(days[1], false), logs[2]]), "PROTEIN_LOW"),
    null,
  );
  assert.equal(
    active(
      rules([logs[0], log(days[1], true, { fiber: null }), logs[2]], [], [], {
        fiberMin: 25,
      }),
      "FIBER_LOW",
    ),
    null,
  );
  assert.equal(active(rules(logs), "FIBER_LOW"), null);
});
test("calories already exceeding a target need no claim that the whole day was logged", () => {
  const logs = ["2026-11-23", "2026-11-24", "2026-11-25"].map((d) =>
    log(d, false, { calories: 2300 }),
  );
  assert.equal(active(rules(logs), "CALORIES_OVER"), true);
  assert.equal(active(rules(logs.slice(1)), "CALORIES_OVER"), null);
});
test("sodium may exceed a configured limit on a known lower bound, never on unknown data alone", () => {
  const logs = [log("2026-11-25")];
  logs[0].items = [item({ sodium: 500 }), item({ sodium: null })];
  const result = rules(logs, [], [], { sodiumMax: 400 });
  assert.equal(active(result, "SODIUM_OVER"), true);
  assert.equal(
    result.find((x) => x.type === "SODIUM_OVER").evidence.complete,
    false,
  );
  assert.equal(
    active(rules(logs, [], [], { sodiumMax: 600 }), "SODIUM_OVER"),
    null,
  );
  assert.equal(active(rules(logs), "SODIUM_OVER"), null);
});
test("planned and actual allergy findings have separate identities and sources", () => {
  const logs = [log("2026-11-25", false, { name: "Sữa bò" })];
  const plans = [log("2026-11-26", false, { name: "Sữa bò" })];
  const findings = rules(
    logs,
    plans,
    [],
    {},
    { allergies: ["sữa"], dietaryPreferences: ["VEGAN"] },
  ).filter((r) => r.active && r.type === "ALLERGY_MATCH");
  assert.equal(findings.length, 2);
  assert.deepEqual(
    new Set(findings.map((r) => r.source)),
    new Set(["ACTUAL", "PLAN"]),
  );
  assert.equal(
    findings.every((r) => r.severity === "HIGH" && r.adminReview),
    true,
  );
  assert.notEqual(findings[0].fingerprint, findings[1].fingerprint);
  assert.equal(
    active(
      rules(logs, [], [], {}, {}, [{ foodId: 1, kind: "ALLERGY" }]),
      "ALLERGY_MATCH",
    ),
    true,
  );
});
test("every active health alert is shared with Admin including LOW", () => {
  const findings = rules(
    ["2026-11-23", "2026-11-24", "2026-11-25"].map((d) => log(d)),
    [log("2026-11-26", false, { name: "Sữa bò" })],
    [],
    { fiberMin: 25 },
    { allergies: ["sữa"] },
  ).filter((r) => r.active);
  assert.deepEqual(
    new Set(findings.map((r) => r.severity)),
    new Set(["LOW", "MEDIUM", "HIGH"]),
  );
  assert.ok(findings.every((r) => r.adminReview));
});
test("weight alerts need at least three measurements spanning seven days plus a personal limit", () => {
  const weights = [
    { date: "2026-11-16", weightKg: 60 },
    { date: "2026-11-20", weightKg: 61 },
    { date: "2026-11-25", weightKg: 63 },
  ];
  assert.equal(
    active(
      rules([], [], weights.slice(-1), { weightChangePercent: 2 }),
      "WEIGHT_CHANGE",
    ),
    null,
  );
  assert.equal(active(rules([], [], weights), "WEIGHT_CHANGE"), null);
  assert.equal(
    active(rules([], [], weights, { weightChangePercent: 2 }), "WEIGHT_CHANGE"),
    true,
  );
  assert.equal(
    active(
      rules(
        [],
        [],
        weights,
        { weightChangePercent: 10 },
        { targetWeightKg: 55 },
      ),
      "WEIGHT_GOAL",
    ),
    true,
  );
});
test("configuration validates null, nonnumeric and invalid ranges; timezone follows Vietnam midnight", () => {
  for (const values of [
    { weightWindowDays: null },
    { targetTolerancePercent: null },
    { reminders: null },
    { fiberMin: -1 },
    { sodiumMax: "2000" },
    { weightWindowDays: 1 },
    { targetTolerancePercent: 100 },
  ])
    assert.ok(
      validateSync(Object.assign(new MonitoringSettingsDto(), values)).length,
    );
  assert.equal(
    validateSync(
      Object.assign(new MonitoringSettingsDto(), {
        fiberMin: null,
        sugarsMax: 0,
        sodiumMax: 2000,
        reminders: false,
      }),
    ).length,
    0,
  );
  assert.equal(localToday(new Date("2026-11-25T17:01:00Z")), "2026-11-26");
  assert.equal(monday("2026-11-29"), "2026-11-23");
});
