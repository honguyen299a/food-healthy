type Group = {
  code: string;
  name: string;
  sortOrder: number;
  subgroups: { name: string; foods: string[] }[];
};
export const foodTaxonomy: Group[] = require('../../../prisma/data/food-taxonomy.json');
const catalog: {
  foods: { name: string; aliases?: string[] }[];
} = require('../../../prisma/data/food-catalog.json');
export const normalizeFoodName = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
export function searchFoodNames(search: string) {
  const needle = normalizeFoodName(search);
  return catalog.foods
    .filter((f) =>
      [f.name, ...(f.aliases || [])].some((n) => normalizeFoodName(n).includes(needle)),
    )
    .map((f) => f.name);
}
export function categoryWithSubgroups(category: any) {
  return {
    ...category,
    subgroups:
      foodTaxonomy.find((g) => g.code === category.code)?.subgroups.map((s) => s.name) || [],
  };
}
export function missingFoodReferences(foods: { name: string }[]) {
  const present = new Set(foods.map((f) => normalizeFoodName(f.name)));
  return foodTaxonomy.flatMap((g) =>
    g.subgroups.flatMap((s) =>
      s.foods
        .filter((n) => !present.has(normalizeFoodName(n)))
        .map((name) => ({ name, categoryCode: g.code, subgroup: s.name })),
    ),
  );
}
