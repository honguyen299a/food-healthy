require("dotenv/config");
const assert = require("node:assert/strict");
const { PrismaClient } = require("@prisma/client");
const { AiService } = require("../dist/services/ai.service");
const { AiModelService } = require("../dist/services/ai-model.service");
const { NutritionService } = require("../dist/services/nutrition.service");
const {
  RecommendationSafetyService,
} = require("../dist/services/recommendation-safety.service");
const db = new PrismaClient();
(async () => {
  let user;
  try {
    user = await db.user.create({
      data: {
        email: `ai-smoke-${require("node:crypto").randomUUID()}@example.invalid`,
        passwordHash: "not-a-login-hash",
        usageMode: "PERSONALIZED",
        profile: {
          create: {
            name: "AI smoke test",
            age: 30,
            gender: "MALE",
            heightCm: 170,
            weightKg: 65,
            activity: "MODERATE",
            goal: "MAINTAIN",
            healthConditions: [],
            allergies: [],
            dietaryPreferences: [],
            mealsPerDay: 3,
          },
        },
      },
    });
    const service = new AiService(
      db,
      new NutritionService(db),
      new RecommendationSafetyService(),
      new AiModelService(),
    );
    const c = await service.create(user.id);
    const advice = await service.chat(user.id, c.id, {
      message: "Hôm nay mình đã ăn bao nhiêu kcal? Trả lời ngắn.",
      date: "2026-11-19",
      mode: "ADVICE",
    });
    assert.equal(advice.kind, "ADVICE");
    assert.equal(await db.mealPlan.count({ where: { userId: user.id } }), 0);
    console.log("PASS real Ollama advice; no meal plan written");
    const proposal = await service.chat(user.id, c.id, {
      message:
        "Tạo thực đơn một ngày, ba bữa sáng trưa tối. Chỉ dùng thực phẩm được cung cấp. Khoảng 6 đến 9 món.",
      date: "2026-11-19",
      mode: "PROPOSAL",
    });
    assert.equal(proposal.kind, "PROPOSAL");
    assert.ok(proposal.draft.items.length);
    assert.equal(await db.mealPlan.count({ where: { userId: user.id } }), 0);
    console.log(
      "PASS real Ollama proposal validated; no plan before confirmation",
    );
    const saved = await service.confirm(
      user.id,
      c.id,
      proposal.draft.id,
      proposal.draft.version,
      "SAVE_PLAN",
    );
    assert.equal(saved.action, "SAVE_PLAN");
    const again = await service.confirm(
      user.id,
      c.id,
      proposal.draft.id,
      proposal.draft.version,
      "SAVE_PLAN",
    );
    assert.equal(again.alreadyApplied, true);
    const shopping = await service.confirm(
      user.id,
      c.id,
      proposal.draft.id,
      proposal.draft.version,
      "SHOPPING_LIST",
    );
    assert.ok(shopping.shoppingList.items.length);
    const history = await service.history(user.id, c.id);
    assert.equal(history.messages.length, 4);
    console.log(
      "PASS confirmed save, idempotent repeat, shopping list and persisted history",
    );
  } finally {
    if (user) await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
