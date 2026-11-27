const keys = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugars', 'sodium'] as const;
export function nutritionSnapshot(food: any) {
  return {
    foodName: food.name,
    ...Object.fromEntries(keys.map((k) => [k + 'Per100g', food[k] ?? null])),
  };
}
export function recordedFood(item: any) {
  const captured = ['calories', 'protein', 'carbs', 'fat'].every(
    (k) => item[k + 'Per100g'] != null,
  );
  if (!captured) return item.food;
  return {
    ...item.food,
    name: item.foodName || item.food.name,
    ...Object.fromEntries(keys.map((k) => [k, item[k + 'Per100g'] ?? null])),
  };
}
export function withRecordedFood<T extends { food: any }>(item: T): T {
  return { ...item, food: recordedFood(item) };
}
export function withConsumedPlanFood(item: any) {
  return item.status === 'COMPLETED' && item.logItem
    ? { ...item, food: recordedFood({ ...item.logItem, food: item.food }) }
    : item;
}
export function planProgress(items: any[], logs: any[] = []) {
  const completedItems = items.filter((i) => i.status === 'COMPLETED').length;
  const skippedItems = items.filter((i) => i.status === 'SKIPPED').length;
  const meals = [...new Set<string>(items.map((i) => i.meal))];
  const pendingMeals = meals.filter((m) =>
    items.some((i) => i.meal === m && (!i.status || i.status === 'PENDING')),
  ).length;
  const skippedMeals = meals.filter((m) =>
    items.filter((i) => i.meal === m).every((i) => i.status === 'SKIPPED'),
  ).length;
  return {
    totalItems: items.length,
    completedItems,
    skippedItems,
    pendingItems: items.length - completedItems - skippedItems,
    completionPercent: items.length ? Math.round((completedItems / items.length) * 100) : 0,
    plannedMeals: meals.length,
    completedMeals: meals.length - pendingMeals - skippedMeals,
    pendingMeals,
    skippedMeals,
    loggedMeals: new Set(logs.map((i) => i.meal)).size,
  };
}
