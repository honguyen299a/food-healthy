require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const { readFileSync, writeFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");
const manifest = require("../prisma/data/food-catalog.json");
const { prepareFoodTaxonomy } = require("./food-taxonomy.cjs");

async function importFoodCatalog(db, backup = false) {
  const groups = await prepareFoodTaxonomy(db);
  const names = manifest.foods.map((f) => f.name);
  const previous = await db.food.findMany({
    where: { name: { in: names }, ownerId: null },
  });
  if (backup) {
    const path = resolve(__dirname, "..", ".food-catalog-backup.json");
    if (!existsSync(path))
      writeFileSync(path, JSON.stringify(previous, null, 2));
  }
  const result = { updated: [], skipped: [] };
  for (const record of manifest.foods) {
    const {
      category,
      categoryCode,
      fdcId,
      usdaDescription,
      imageSha256,
      sourceRecord,
      ...data
    } = record;
    const existing = previous.find((f) => f.name === data.name);
    // Never replace private foods or an Admin's explicit edits on subsequent imports.
    if (existing && (existing.ownerId !== null || existing.nutritionEdited)) {
      result.skipped.push(data.name);
      continue;
    }
    const group = groups.get(categoryCode);
    if (!group) throw Error("Unknown category code: " + categoryCode);
    // New raw ingredients remain available for manual logging, but are not
    // proposed as ready-to-eat meals. Existing catalog eligibility is preserved.
    const canSuggest = existing
      ? existing.canSuggest
      : categoryCode === "FRUITS" ||
        categoryCode === "DAIRY" ||
        categoryCode === "PREPARED" ||
        record.subgroup === "Hạt và quả hạch" ||
        record.subgroup === "Bánh mì";
    await db.food.upsert({
      where: { ownerScope_name: { ownerScope: 0, name: data.name } },
      update: { ...data, canSuggest, categoryId: group.id },
      create: { ...data, canSuggest, categoryId: group.id },
    });
    result.updated.push(data.name);
  }
  return result;
}
module.exports = { importFoodCatalog };
if (require.main === module) {
  const db = new PrismaClient();
  importFoodCatalog(db, true)
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}
