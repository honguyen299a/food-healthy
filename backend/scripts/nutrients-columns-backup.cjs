require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const db = new PrismaClient();
const backup = path.join(
  __dirname,
  "../backups/nutrients-columns-before-20261126.json",
);
(async () => {
  try {
    if (process.argv.includes("--verify")) {
      const before = JSON.parse(fs.readFileSync(backup, "utf8"));
      const after = await db.$queryRawUnsafe(
        "SELECT id, calories, protein, carbs, fat, fiber, sugars, sodium FROM foods ORDER BY id",
      );
      assert.equal(after.length, before.length, "Food count changed");
      for (const old of before) {
        const food = after.find((x) => x.id === old.id);
        assert.ok(food, `Missing food ${old.id}`);
        for (const key of ["calories", "protein", "carbs", "fat"])
          assert.equal(
            String(food[key]),
            String(old[key]),
            `Macro changed: ${old.id}/${key}`,
          );
        for (const key of ["fiber", "sugars", "sodium"]) {
          const value = old.nutrients?.[key];
          if (typeof value !== "number") assert.equal(food[key], null);
          else
            assert.ok(
              food[key] !== null && Math.abs(Number(food[key]) - value) < 1e-8,
              `Transfer changed: ${old.id}/${key}`,
            );
        }
      }
      console.log(
        `PASS ${after.length} foods preserved; calories/protein/carbs/fat unchanged; fiber/sugars/sodium migrated correctly`,
      );
    } else {
      const rows = await db.$queryRawUnsafe(
        "SELECT id, calories, protein, carbs, fat, nutrients FROM foods ORDER BY id",
      );
      fs.mkdirSync(path.dirname(backup), { recursive: true });
      fs.writeFileSync(backup, JSON.stringify(rows, null, 2), { flag: "wx" });
      console.log(
        `Backed up ${rows.length} foods and original nutrient JSON to ${backup}`,
      );
    }
  } finally {
    await db.$disconnect();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
