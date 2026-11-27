import { Macros, nutrition, sum } from '../nutrition/nutrition-calculator';

type Candidate = {
  id: number;
  name: string;
  calories: unknown;
  protein: unknown;
  carbs: unknown;
  fat: unknown;
  category?: { code?: string | null } | null;
};
const keys = ['calories', 'protein', 'carbs', 'fat'] as const;
const slots = [
  {
    meal: 'BREAKFAST',
    share: 0.25,
    groups: [['GRAINS'], ['DAIRY'], ['EGGS', 'PREPARED'], ['FRUITS']],
  },
  {
    meal: 'LUNCH',
    share: 0.35,
    groups: [
      ['GRAINS'],
      ['MEAT_POULTRY', 'SEAFOOD', 'LEGUMES_NUTS'],
      ['VEGETABLES'],
      ['LEGUMES_NUTS'],
    ],
  },
  {
    meal: 'DINNER',
    share: 0.3,
    groups: [
      ['GRAINS'],
      ['MEAT_POULTRY', 'SEAFOOD', 'LEGUMES_NUTS'],
      ['VEGETABLES'],
      ['LEGUMES_NUTS'],
    ],
  },
  { meal: 'SNACK', share: 0.1, groups: [['DAIRY'], ['FRUITS'], ['LEGUMES_NUTS']] },
];

// Use the full safe catalog. A food can appear in different meals, while the
// combined draft never exceeds any of the actual remaining daily nutrients.
export function buildMealDraft<T extends Candidate>(
  foods: T[],
  available: Macros,
  options: { seed?: number; recentUsage?: ReadonlyMap<number, number> } = {},
) {
  const variety = (id: number, meal: string) => {
    let value = options.seed || 0;
    for (const char of `${meal}:${id}`) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
    value ^= value >>> 16;
    return (value >>> 0) / 4294967296;
  };
  const remaining = { ...available };
  const draft: { foodId: number; meal: string; grams: number; food: T }[] = [];
  const valid = foods.filter(
    (f) =>
      keys.every((k) => Number.isFinite(Number(f[k])) && Number(f[k]) >= 0) &&
      Number(f.calories) > 0,
  );
  const used = new Map<number, number>();
  for (const slot of slots) {
    const desired = Object.fromEntries(
      keys.map((k) => [k, available[k] * slot.share]),
    ) as unknown as Macros;
    const mealItems: typeof draft = [];
    const mealTotal = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const loss = (values: Macros) =>
      keys.reduce(
        (s, k) =>
          s +
          (k === 'calories' ? 4 : 1) * ((desired[k] - values[k]) / Math.max(1, desired[k])) ** 2,
        0,
      );
    // Reserve a place for each food group before increasing portions. Otherwise
    // energy-dense foods can fill all four places before vegetables or grains.
    const knownGroups = valid.some((f) => !!f.category?.code);
    const groups = slot.groups.map((codes, index) => {
      const matching = valid.filter(
        (f) =>
          codes.includes(f.category?.code || '') &&
          !(
            codes.includes('EGGS') &&
            f.category?.code === 'PREPARED' &&
            (Number(f.protein) < 8 || Number(f.carbs) > 15)
          ) &&
          !(f.category?.code === 'DAIRY' && Number(f.calories) > 120) &&
          !(f.category?.code === 'FRUITS' && (Number(f.calories) > 120 || Number(f.fat) > 5)) &&
          !(
            index === 1 &&
            slot.meal !== 'BREAKFAST' &&
            slot.meal !== 'SNACK' &&
            Number(f.fat) > 25
          ),
      );
      return matching.length || knownGroups ? matching : valid;
    });
    for (let iteration = 0; iteration < 240; iteration++) {
      let best:
        { food: T; grams: number; macros: Macros; item?: (typeof draft)[number] } | undefined;
      let bestGain = 0;
      const before = loss(mealTotal);
      const seeding = iteration < groups.length;
      const candidates = seeding ? groups[iteration] : mealItems.map((x) => x.food);
      for (const food of candidates) {
        const item = mealItems.find((x) => x.foodId === food.id);
        if (seeding && item) continue;
        if (!item && mealItems.length >= 4) continue;
        const code = food.category?.code || '';
        const cap =
          code === 'LEGUMES_NUTS' && Number(food.fat) > 25
            ? 35
            : Number(food.calories) > 300
              ? 100
              : ['MEAT_POULTRY', 'SEAFOOD', 'EGGS'].includes(code)
                ? 180
                : 300;
        const grams = item
          ? 5
          : code === 'DAIRY'
            ? 100
            : ['VEGETABLES', 'FRUITS'].includes(code)
              ? 75
              : ['MEAT_POULTRY', 'SEAFOOD'].includes(code)
                ? 70
                : code === 'EGGS' || (code === 'PREPARED' && Number(food.carbs) <= 15)
                  ? 50
                  : code === 'LEGUMES_NUTS'
                    ? Number(food.fat) > 25
                      ? 15
                      : 75
                    : code === 'GRAINS' && Number(food.calories) < 300
                      ? 75
                      : 25;
        if ((item?.grams || 0) + grams > cap) continue;
        const macros = nutrition(
          Object.fromEntries(keys.map((k) => [k, Number(food[k])])) as unknown as Macros,
          grams,
        );
        if (keys.some((k) => macros[k] > remaining[k] + 1e-8)) continue;
        // Reserve the other meals' shares, including protein and fat. A first
        // meal must not use up a nutrient needed to make the last meal viable.
        if (keys.some((k) => mealTotal[k] + macros[k] > desired[k] + 1e-8)) continue;
        const after = sum([mealTotal, macros]);
        // Prefer foods suited to the meal and variety, without discarding
        // alternatives when the available catalog is restricted.
        const repetition = item ? 1 : 1 / (1 + (used.get(food.id) || 0) * 2);
        const ideal =
          code === 'GRAINS'
            ? [0.1, 0.8, 0.1]
            : code === 'VEGETABLES' || code === 'FRUITS'
              ? [0.05, 0.9, 0.05]
              : code === 'DAIRY'
                ? [0.25, 0.35, 0.4]
                : code === 'LEGUMES_NUTS' && Number(food.fat) > 25
                  ? [0.15, 0.15, 0.7]
                  : [0.55, 0.05, 0.4];
        const energy = Number(food.protein) * 4 + Number(food.carbs) * 4 + Number(food.fat) * 9;
        const fit = [Number(food.protein) * 4, Number(food.carbs) * 4, Number(food.fat) * 9].reduce(
          (s, n, i) => s + (n / Math.max(1, energy) - ideal[i]) ** 2,
          0,
        );
        const historyPenalty = 1 + (options.recentUsage?.get(food.id) || 0) * 0.6;
        const rotation = options.seed === undefined ? 1 : 0.75 + variety(food.id, slot.meal) * 0.5;
        const gain = seeding
          ? (repetition * rotation) / ((1 + fit * 4) * historyPenalty)
          : (before - loss(after)) * repetition;
        if (gain > bestGain + 1e-10) {
          bestGain = gain;
          best = { food, grams, macros, item };
        }
      }
      if (!best) {
        if (seeding) continue;
        else break;
      }
      if (best.item) best.item.grams += best.grams;
      else
        mealItems.push({
          foodId: best.food.id,
          meal: slot.meal,
          grams: best.grams,
          food: best.food,
        });
      for (const k of keys) {
        mealTotal[k] += best.macros[k];
        remaining[k] = Math.max(0, remaining[k] - best.macros[k]);
      }
    }
    for (const item of mealItems) used.set(item.foodId, (used.get(item.foodId) || 0) + 1);
    draft.push(...mealItems);
  }
  return { draft, draftCalories: Math.round(available.calories - remaining.calories) };
}
