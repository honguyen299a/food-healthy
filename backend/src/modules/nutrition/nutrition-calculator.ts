import { Activity, Gender, Goal, UserProfile } from '@prisma/client';

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
export const zero = (): Macros => ({ calories: 0, protein: 0, carbs: 0, fat: 0 });
export function nutrition(food: Macros, grams: number): Macros {
  const scale = grams / 100;
  return {
    calories: food.calories * scale,
    protein: food.protein * scale,
    carbs: food.carbs * scale,
    fat: food.fat * scale,
  };
}
export function sum(items: Macros[]): Macros {
  return items.reduce(
    (a, b) => ({
      calories: a.calories + b.calories,
      protein: a.protein + b.protein,
      carbs: a.carbs + b.carbs,
      fat: a.fat + b.fat,
    }),
    zero(),
  );
}
export function targets(p: UserProfile) {
  const weight = Number(p.weightKg),
    height = Number(p.heightCm);
  const bmi = weight / (height / 100) ** 2;
  const bmr =
    10 * weight +
    6.25 * height -
    5 * p.age +
    (p.gender === Gender.MALE ? 5 : p.gender === Gender.FEMALE ? -161 : -78);
  const factors: Record<Activity, number> = {
    SEDENTARY: 1.2,
    LIGHT: 1.375,
    MODERATE: 1.55,
    ACTIVE: 1.725,
    VERY_ACTIVE: 1.9,
  };
  const tdee = bmr * factors[p.activity];
  const calories = Math.max(
    1200,
    Math.round(tdee + (p.goal === Goal.LOSE ? -300 : p.goal === Goal.GAIN ? 300 : 0)),
  );
  // An illustrative adult split within the DRI ranges, not a prescription.
  const protein = Math.round((calories * 0.2) / 4);
  const fat = Math.round((calories * 0.3) / 9);
  const carbs = Math.round((calories * 0.5) / 4);
  return {
    bmi: +bmi.toFixed(1),
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calories,
    protein,
    carbs,
    fat,
  };
}
