require("reflect-metadata");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { FoodsService } = require("../dist/modules/foods/foods.service");

const dto = {
  name: "Broccoli",
  categoryId: 1,
  calories: 34,
  protein: 3,
  carbs: 7,
  fat: 0.4,
  fiber: 2.6,
  sugars: 1.7,
  sodium: 33,
};
test("a subgroup from another category is rejected before any food is written", async () => {
  const db = {
    foodCategory: {
      findUniqueOrThrow: async () => ({
        id: 1,
        name: "Rau củ",
        code: "VEGETABLES",
      }),
    },
    food: { create: () => assert.fail("Invalid subgroup must not be stored") },
  };
  await assert.rejects(
    new FoodsService(db).create(
      { user: { sub: 44, role: "USER" } },
      { ...dto, subgroup: "Thịt gà" },
    ),
    (e) => e.getStatus() === 400,
  );
});
test("new food name checks only the current library and ownership comes from authentication", async () => {
  for (const [role, sub, scope, owner] of [
    ["USER", 44, 44, 44],
    ["USER", 45, 45, 45],
    ["ADMIN", 46, 0, null],
  ]) {
    const db = {
      food: {
        findUnique: async ({ where }) => {
          assert.deepEqual(where, {
            ownerScope_name: { ownerScope: scope, name: dto.name },
          });
          return null;
        },
        create: async ({ data }) => data,
      },
    };
    const result = await new FoodsService(db).create(
      { user: { sub, role } },
      dto,
    );
    assert.equal(result.ownerId, owner);
    assert.equal(result.name, dto.name);
  }
});
test("duplicate name inside one library returns a friendly conflict without writing", async () => {
  const db = {
    food: {
      findUnique: async () => ({ id: 12 }),
      create: () => assert.fail("Duplicate must not be created"),
    },
  };
  await assert.rejects(
    new FoodsService(db).create({ user: { sub: 44, role: "USER" } }, dto),
    (e) => e.getStatus() === 409 && e.message.includes("tên này"),
  );
});
test("customizing a shared food creates a private copy, keeps source/photo and marks edited data", async () => {
  let created;
  const db = {
    food: {
      findFirstOrThrow: async ({ where }) => {
        assert.deepEqual(where, { id: 8, ownerId: null, isActive: true });
        return {
          nutritionSource: "USDA",
          nutritionSourceUrl:
            "https://fdc.nal.usda.gov/food-details/170379/nutrients",
          imageUrl: "/media/foods/broccoli.jpg",
        };
      },
      findUnique: async () => null,
      create: async ({ data }) => (created = data),
      update: () => assert.fail("Shared food must not be mutated"),
    },
  };
  await new FoodsService(db).customize(
    { user: { sub: 44, role: "USER" } },
    8,
    dto,
  );
  assert.equal(created.ownerId, 44);
  assert.equal(created.protein, 3);
  assert.equal(created.nutritionEdited, true);
  assert.equal(created.nutritionSource, "USDA");
  assert.equal(created.imageUrl, "/media/foods/broccoli.jpg");
  assert.equal(created.name, dto.name);
});
test("private-food updates are scoped to the current user and mark source values as modified", async () => {
  const db = {
    food: {
      findFirstOrThrow: async ({ where }) => {
        assert.deepEqual(where, { id: 9, ownerId: 44 });
        return { id: 9 };
      },
      update: async ({ data }) => data,
    },
  };
  const result = await new FoodsService(db).update(
    { user: { sub: 44, role: "USER" } },
    9,
    dto,
  );
  assert.equal(result.nutritionEdited, true);
  assert.equal(result.sodium, 33);
});
test("an existing private-copy name reports a conflict instead of replacing any food", async () => {
  const db = {
    food: {
      findFirstOrThrow: async () => ({}),
      findUnique: async () => ({ id: 10 }),
      create: () => assert.fail("Must not replace an existing record"),
    },
  };
  await assert.rejects(
    new FoodsService(db).customize({ user: { sub: 44 } }, 8, dto),
    (e) => e.getStatus() === 409,
  );
});
