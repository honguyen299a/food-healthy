require("reflect-metadata");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { chartPeriod } = require("../dist/modules/dashboard/chart-period");
const { chartSummary } = require("../dist/modules/dashboard/user-charts.service");
const food = {
  calories: 100,
  protein: 5,
  carbs: 15,
  fat: 2,
  fiber: 3,
  sugars: 0,
  sodium: 12,
};
const log = (date, grams, extra = {}) => ({
  date,
  completed: true,
  items: [{ grams, meal: "BREAKFAST", food: { ...food, ...extra } }],
});
test("day and month filters use actual calendar boundaries including leap years", () => {
  assert.deepEqual(chartPeriod({ mode: "DAY", date: "2026-11-25" }), {
    mode: "DAY",
    start: "2026-11-25",
    end: "2026-11-25",
    days: 1,
  });
  assert.equal(chartPeriod({ mode: "MONTH", month: "2024-02" }).days, 29);
  assert.equal(
    chartPeriod({ mode: "MONTH", month: "2026-02" }).end,
    "2026-02-28",
  );
  assert.equal(chartPeriod({ mode: "MONTH", month: "2026-12" }).days, 31);
  for (const q of [
    { mode: "BAD" },
    { date: "2026-02-31" },
    { mode: "MONTH", month: "2026-13" },
    { mode: "MONTH", month: "2101-01" },
  ])
    assert.throws(() => chartPeriod(q));
});
test("monthly average excludes missing days, preserves portion sums and separates planned days", () => {
  const period = chartPeriod({ mode: "MONTH", month: "2026-11" });
  const result = chartSummary(
    period,
    [log("2026-11-01", 150), log("2026-11-03", 50)],
    [log("2026-11-05", 300)],
  );
  assert.equal(result.days.length, 30);
  assert.equal(result.loggedDays, 2);
  assert.equal(result.averages.calories, 100);
  assert.equal(result.averages.protein, 5);
  assert.equal(result.totals.calories, 200);
  assert.equal(result.plannedDays, 1);
  assert.equal(result.plannedAverages.calories, 300);
  assert.equal(result.days[1].logged, false);
  assert.equal(result.days[1].totals.fiber, null);
});
test("empty periods stay unknown and missing composition is not averaged as zero", () => {
  const period = chartPeriod({ mode: "MONTH", month: "2026-11" }),
    empty = chartSummary(period, [], []);
  assert.equal(empty.loggedDays, 0);
  assert.equal(empty.averages.calories, null);
  assert.equal(empty.averages.fiber, null);
  const mixed = chartSummary(
    period,
    [log("2026-11-01", 100), log("2026-11-02", 100, { fiber: null })],
    [],
  );
  assert.equal(mixed.averages.fiber, 3);
  assert.equal(mixed.totals.fiber, null);
  assert.equal(mixed.averages.sugars, 0);
});
