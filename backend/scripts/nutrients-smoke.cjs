require("dotenv/config");
const assert = require("node:assert/strict");
const { PrismaClient } = require("@prisma/client");
const { JwtService } = require("@nestjs/jwt");
const { randomUUID } = require("node:crypto");
const db = new PrismaClient();
const base = `http://127.0.0.1:${process.env.PORT || 3000}/api`;
(async () => {
  let user;
  try {
    user = await db.user.create({
      data: {
        email: `nutrients-smoke-${randomUUID()}@example.invalid`,
        passwordHash: "not-a-login-hash",
      },
    });
    const token = new JwtService({ secret: process.env.JWT_SECRET }).sign({
      sub: user.id,
      role: "USER",
    });
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    const category = await db.foodCategory.findFirstOrThrow();
    const body = {
      name: `Nutrient smoke ${randomUUID()}`,
      categoryId: category.id,
      calories: 100,
      protein: 5,
      carbs: 15,
      fat: 2,
      fiber: 0,
      sugars: 2.5,
      sodium: 12.12345678,
    };
    const created = await fetch(base + "/foods", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    assert.equal(created.status, 201);
    const food = await created.json();
    assert.equal(Object.hasOwn(food, "nutrients"), false);
    const stored = await db.food.findUniqueOrThrow({ where: { id: food.id } });
    for (const key of ["fiber", "sugars", "sodium"]) {
      assert.equal(Number(food[key]), body[key]);
      assert.equal(Number(stored[key]), body[key]);
    }
    const put = (body) =>
      fetch(`${base}/foods/${food.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
      });
    assert.equal((await put({ ...body, fiber: -1 })).status, 400);
    assert.equal((await put({ ...body, nutrients: { fiber: 1 } })).status, 400);
    const { fiber, sugars, sodium, ...oldClient } = body;
    assert.equal((await put(oldClient)).status, 200);
    const preserved = await (
      await fetch(`${base}/foods/${food.id}`, { headers })
    ).json();
    assert.equal(Number(preserved.sodium), sodium);
    const cleared = await put({
      ...body,
      fiber: null,
      sugars: null,
      sodium: null,
    });
    assert.equal(cleared.status, 200);
    const empty = await cleared.json();
    for (const key of ["fiber", "sugars", "sodium"])
      assert.equal(empty[key], null);
    for (const key of ["calories", "protein", "carbs", "fat"])
      assert.equal(Number(empty[key]), body[key]);
    console.log(
      "PASS real SQL columns, API create/update, precision, NULL vs zero, omitted fields and unchanged macros",
    );
  } finally {
    if (user) await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
