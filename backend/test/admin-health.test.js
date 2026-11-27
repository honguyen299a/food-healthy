const { test } = require("node:test");
const assert = require("node:assert/strict");
const { classifyHealth } = require("../dist/modules/admin/admin-health");
const end = "2026-11-25";
const summary = (protein = 100) => ({
  end,
  target: { protein: 100 },
  tolerancePercent: 10,
  days: Array.from({ length: 7 }, (_, i) => ({
    completed: i >= 4,
    totals: {
      protein,
      fiber: 10,
      coverage: {
        fiber: { complete: true },
        sodium: { complete: true },
        sugars: { complete: true },
      },
    },
  })),
  monitoringLimits: { fiberMin: 25 },
});
test("no diary, missing target, old snapshots and insufficient confirmed days cannot be counted as no-alert evaluated users", () => {
  assert.equal(classifyHealth(null, [], end), "INSUFFICIENT");
  assert.equal(
    classifyHealth({ ...summary(), target: null }, [], end),
    "INSUFFICIENT",
  );
  assert.equal(
    classifyHealth({ ...summary(), end: "2026-11-24" }, [], end),
    "INSUFFICIENT",
  );
  const short = summary();
  short.days[5].completed = false;
  assert.equal(classifyHealth(short, [], end), "INSUFFICIENT");
});
test("configured composition coverage is required even when the diary is confirmed", () => {
  const data = summary();
  assert.equal(classifyHealth(data, [], end), "NO_ALERT");
  data.days[6].totals.coverage.fiber.complete = false;
  assert.equal(classifyHealth(data, [], end), "INSUFFICIENT");
  data.monitoringLimits = {};
  assert.equal(classifyHealth(data, [], end), "NO_ALERT");
});
test("only confirmed actual shortfall matching the current days enters the below-target cohort", () => {
  const alert = {
    conditionActive: true,
    type: "PROTEIN_LOW",
    source: "ACTUAL",
  };
  assert.equal(classifyHealth(summary(20), [alert], end), "BELOW_TARGET");
  assert.equal(classifyHealth(summary(100), [alert], end), "OTHER_ALERT");
  assert.equal(
    classifyHealth(summary(20), [{ ...alert, source: "PLAN" }], end),
    "OTHER_ALERT",
  );
  assert.equal(classifyHealth(null, [alert], end), "OTHER_ALERT");
  assert.equal(
    classifyHealth(summary(100), [{ ...alert, conditionActive: false }], end),
    "NO_ALERT",
  );
});
test("unknown fiber or unconfirmed days cannot establish an active fiber shortage", () => {
  const data = summary(),
    alert = { conditionActive: true, type: "FIBER_LOW", source: "ACTUAL" };
  assert.equal(classifyHealth(data, [alert], end), "BELOW_TARGET");
  data.days[6].totals.coverage.fiber.complete = false;
  assert.equal(classifyHealth(data, [alert], end), "OTHER_ALERT");
  data.days[6].completed = false;
  assert.equal(classifyHealth(data, [alert], end), "OTHER_ALERT");
});
