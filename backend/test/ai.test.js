const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseResult,
  parseItems,
  validDate,
  planHash,
} = require("../dist/ai-contract");
const { AiService } = require("../dist/services/ai.service");
const {
  RecommendationSafetyService,
} = require("../dist/services/recommendation-safety.service");
const item = { foodId: 1, meal: "LUNCH", grams: 150 };
const food = {
  id: 1,
  name: "Cơm",
  calories: 130,
  protein: 2.7,
  carbs: 28,
  fat: 0.3,
};
const profile = {
  age: 30,
  healthConditions: [],
  allergies: [],
  dietaryPreferences: [],
};
function fixture(overrides = {}) {
  let writes = 0,
    calls = 0;
  const db = {
    user: {
      findUniqueOrThrow: async () => ({
        usageMode: "PERSONALIZED",
        profile,
        preferences: [],
      }),
    },
    food: { findMany: async () => [food] },
    aiConversation: {
      findFirst: async () => ({ id: "c", userId: 1, busy: false }),
      updateMany: async () => ({ count: 1 }),
    },
    aiMessage: {
      findMany: async () => [],
      createMany: async () => {
        writes++;
      },
    },
    aiDraft: { findFirst: async () => null },
    mealPlan: { findUnique: async () => null },
    ...overrides,
  };
  const nutrients = {
    target: async () => ({ calories: 2000, protein: 100, carbs: 250, fat: 60 }),
    consumed: async () => ({ calories: 0, protein: 0, carbs: 0, fat: 0 }),
  };
  const model = {
    complete: async () => {
      calls++;
      return "invalid json";
    },
  };
  const service = new AiService(
    db,
    nutrients,
    new RecommendationSafetyService(),
    model,
  );
  return {
    db,
    service,
    model,
    get writes() {
      return writes;
    },
    get calls() {
      return calls;
    },
  };
}
test("strict contract rejects malformed JSON, extra fields and action payloads", () => {
  for (const text of [
    "```json\n{}\n```",
    "null",
    JSON.stringify({ kind: "ADVICE", reply: "Hi", items: [item] }),
    JSON.stringify({
      kind: "PROPOSAL",
      reply: "Hi",
      items: [{ ...item, userId: 2 }],
    }),
    JSON.stringify({ kind: "ADVICE", reply: "Hi", items: [], userId: 2 }),
  ])
    assert.throws(() => parseResult(text));
  assert.equal(
    parseResult(JSON.stringify({ kind: "ADVICE", reply: "Hi", items: [] }))
      .kind,
    "ADVICE",
  );
});
test("portions, duplicate items and total meal mass are validated", () => {
  for (const grams of [0, -1, Infinity, NaN, 1001, "150"])
    assert.throws(() => parseItems([{ ...item, grams }]));
  assert.throws(() => parseItems([item, item]));
  assert.throws(() =>
    parseItems([
      { ...item, grams: 900 },
      { foodId: 2, meal: "LUNCH", grams: 900 },
    ]),
  );
  assert.equal(parseItems([item])[0].grams, 150);
});
test("calendar dates reject rollover and plan fingerprints ignore ordering", () => {
  assert.throws(() => validDate("2026-02-30"));
  assert.throws(() => validDate("2026-2-01"));
  const second = { foodId: 2, meal: "DINNER", grams: "100.00" };
  assert.equal(planHash([item, second]), planHash([second, item]));
  assert.notEqual(planHash([item]), planHash([{ ...item, grams: 151 }]));
});
test("backend calculates macros from database values", async () => {
  const { service } = fixture();
  const result = await service.validate(1, [item]);
  assert.equal(result.totals.calories, 195);
  assert.equal(result.totals.carbs, 42);
});
test("food missing from accessible database scope is rejected", async () => {
  const { service } = fixture({ food: { findMany: async () => [] } });
  await assert.rejects(service.validate(1, [item]), /không tồn tại/);
});
test("declared allergies, exclusions and restricted profiles block proposals", async () => {
  for (const user of [
    {
      usageMode: "PERSONALIZED",
      profile: { ...profile, allergies: ["cơm"] },
      preferences: [],
    },
    { usageMode: "PERSONALIZED", profile, preferences: [{ foodId: 1 }] },
    {
      usageMode: "PERSONALIZED",
      profile: { ...profile, age: 17 },
      preferences: [],
    },
    {
      usageMode: "PERSONALIZED",
      profile: { ...profile, healthConditions: ["KIDNEY_DISEASE"] },
      preferences: [],
    },
    { usageMode: "SELF_GUIDED", profile: null, preferences: [] },
  ]) {
    const { service } = fixture({
      user: { findUniqueOrThrow: async () => user },
    });
    await assert.rejects(service.validate(1, [item]));
  }
});
test("foreign conversations cannot load history or invoke model", async () => {
  const f = fixture({
    aiConversation: {
      findFirst: async ({ where }) => {
        assert.equal(where.userId, 2);
        return null;
      },
    },
  });
  await assert.rejects(f.service.history(2, "foreign"), /Không tìm thấy/);
  await assert.rejects(
    f.service.chat(2, "foreign", {
      date: "2026-11-19",
      message: "hi",
      mode: "ADVICE",
    }),
  );
  assert.equal(f.calls, 0);
});
test("invalid model output gets two repairs and never persists messages or plans", async () => {
  const f = fixture();
  await assert.rejects(
    f.service.chat(1, "c", {
      date: "2026-11-19",
      message: "hi",
      mode: "ADVICE",
    }),
    /hai lần sửa/,
  );
  assert.equal(f.calls, 3);
  assert.equal(f.writes, 0);
});
test("advice mode rejects model attempts to create a proposal", async () => {
  const f = fixture();
  f.model.complete = async () =>
    JSON.stringify({ kind: "PROPOSAL", reply: "Hi", items: [item] });
  await assert.rejects(
    f.service.chat(1, "c", {
      date: "2026-11-19",
      message: "hi",
      mode: "ADVICE",
    }),
    /chỉ được trả ADVICE/,
  );
  assert.equal(f.writes, 0);
});
test("action chat never invokes model or writes a plan", async () => {
  const f = fixture();
  const result = await f.service.chat(1, "c", {
    date: "2026-11-19",
    message: "Lưu đi",
    mode: "ACTION",
  });
  assert.equal(result.kind, "ACTION");
  assert.equal(f.calls, 0);
  assert.equal(f.writes, 1);
});
test("confirmation rejects superseded and expired drafts", async () => {
  for (const draft of [
    { status: "SUPERSEDED", expiresAt: new Date(Date.now() + 10000) },
    { status: "PENDING", expiresAt: new Date(0) },
  ]) {
    const f = fixture({ aiDraft: { findFirst: async () => draft } });
    f.db.$transaction = async (fn) => fn(f.db);
    await assert.rejects(
      f.service.confirm(1, "c", "d", 1, "SAVE_PLAN"),
      /hết hạn/,
    );
  }
});
test("confirmation refuses a plan changed after preview", async () => {
  const f = fixture({
    aiDraft: {
      findFirst: async () => ({
        id: "d",
        date: new Date("2026-11-19"),
        status: "PENDING",
        expiresAt: new Date(Date.now() + 10000),
        items: [item],
        planHash: planHash([]),
      }),
      updateMany: async () => ({ count: 1 }),
    },
    mealPlan: { findUnique: async () => ({ items: [item] }) },
  });
  f.db.$transaction = async (fn) => fn(f.db);
  await assert.rejects(
    f.service.confirm(1, "c", "d", 1, "SAVE_PLAN"),
    /Kế hoạch đã thay đổi/,
  );
});
test("already applied plan confirmation is idempotent", async () => {
  const f = fixture({
    aiDraft: {
      findFirst: async () => ({
        status: "APPLIED",
        expiresAt: new Date(Date.now() + 10000),
        items: [item],
      }),
    },
  });
  f.db.$transaction = async (fn) => fn(f.db);
  assert.equal(
    (await f.service.confirm(1, "c", "d", 1, "SAVE_PLAN")).alreadyApplied,
    true,
  );
});
