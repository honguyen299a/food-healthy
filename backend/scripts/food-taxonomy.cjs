const groups = require("../prisma/data/food-taxonomy.json");
const legacyNames = {
  GRAINS: "Ngũ cốc",
  MEAT_POULTRY: "Đạm lành mạnh",
  DAIRY: "Sữa và hạt",
};
async function prepareFoodTaxonomy(db) {
  const byCode = new Map();
  for (const g of groups) {
    let row = await db.foodCategory.findUnique({ where: { code: g.code } });
    if (!row)
      row = await db.foodCategory.findFirst({
        where: { name: { in: [g.name, legacyNames[g.code]].filter(Boolean) } },
      });
    row = row
      ? await db.foodCategory.update({
          where: { id: row.id },
          data: { code: g.code, name: g.name, sortOrder: g.sortOrder },
        })
      : await db.foodCategory.create({
          data: { code: g.code, name: g.name, sortOrder: g.sortOrder },
        });
    byCode.set(g.code, row);
  }
  // These two catalog foods already have diary/plan references. Rename in place
  // only when their provenance identifies the exact original seeded record.
  for (const [oldName, newName, sourceId, code, subgroup] of [
    ["Trứng gà", "Trứng gà luộc", "173424", "PREPARED", "Món từ trứng"],
    ["Rau bina", "Cải bó xôi", "168462", "VEGETABLES", "Rau lá"],
  ]) {
    const old = await db.food.findUnique({
      where: { ownerScope_name: { ownerScope: 0, name: oldName } },
    });
    const newer = await db.food.findUnique({
      where: { ownerScope_name: { ownerScope: 0, name: newName } },
    });
    if (
      old &&
      !newer &&
      !old.nutritionEdited &&
      old.nutritionSourceUrl?.includes(sourceId)
    )
      await db.food.update({
        where: { id: old.id },
        data: { name: newName, categoryId: byCode.get(code).id, subgroup },
      });
  }
  return byCode;
}
module.exports = { prepareFoodTaxonomy };
