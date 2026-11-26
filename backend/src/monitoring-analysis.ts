import { nutrition, sum } from "./nutrition";

export const extendedKeys = ["fiber", "sugars", "sodium"] as const;
export const macroKeys = ["calories", "protein", "carbs", "fat"] as const;
export function aggregateNutrition(items: { food: any; grams: unknown }[]) {
  const macros = sum(
    items.map((x) =>
      nutrition(
        Object.fromEntries(macroKeys.map((k) => [k, Number(x.food[k])])) as any,
        Number(x.grams),
      ),
    ),
  );
  const coverage = Object.fromEntries(
    extendedKeys.map((key) => {
      const known = items.filter(
        (x) =>
          x.food[key] !== null &&
          x.food[key] !== undefined &&
          Number.isFinite(Number(x.food[key])),
      );
      const knownTotal = known.reduce(
        (a, x) => a + (Number(x.food[key]) * Number(x.grams)) / 100,
        0,
      );
      return [
        key,
        {
          knownTotal,
          knownItems: known.length,
          totalItems: items.length,
          complete: items.length > 0 && known.length === items.length,
        },
      ];
    }),
  ) as Record<
    (typeof extendedKeys)[number],
    {
      knownTotal: number;
      knownItems: number;
      totalItems: number;
      complete: boolean;
    }
  >;
  return {
    ...macros,
    ...Object.fromEntries(
      extendedKeys.map((k) => [
        k,
        coverage[k].complete ? coverage[k].knownTotal : null,
      ]),
    ),
    coverage,
  } as typeof macros & {
    fiber: number | null;
    sugars: number | null;
    sodium: number | null;
    coverage: typeof coverage;
  };
}
export const iso = (date: Date | string) =>
  typeof date === "string"
    ? date.slice(0, 10)
    : date.toISOString().slice(0, 10);
export const addDays = (day: string, offset: number) =>
  new Date(Date.parse(day) + offset * 86400000).toISOString().slice(0, 10);
export function localToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function monday(day: string) {
  const weekday = new Date(day).getUTCDay();
  return addDays(day, -(weekday === 0 ? 6 : weekday - 1));
}
const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const sd = (values: number[]) => {
  const avg = mean(values);
  return avg === null
    ? null
    : Math.sqrt(values.reduce((a, b) => a + (b - avg) ** 2, 0) / values.length);
};
export function analyzePeriod(
  start: string,
  logs: any[],
  weights: any[],
  target: any,
  profile: any,
  settings: any,
) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i),
      log = logs.find((x) => iso(x.date) === date),
      items = log?.items || [];
    return {
      date,
      logged: items.length > 0,
      completed: !!log?.completed && items.length > 0,
      totals: aggregateNutrition(items),
      meals: Object.fromEntries(
        ["BREAKFAST", "LUNCH", "DINNER", "SNACK"].map((meal) => [
          meal,
          {
            items: items.filter((x: any) => x.meal === meal).length,
            calories: aggregateNutrition(
              items.filter((x: any) => x.meal === meal),
            ).calories,
          },
        ]),
      ),
    };
  });
  const recorded = days.filter((x) => x.logged),
    completed = days.filter((x) => x.completed),
    tolerance = Number(settings?.targetTolerancePercent ?? 10) / 100;
  const averages = Object.fromEntries(
    [...macroKeys, ...extendedKeys].map((key) => {
      const eligible = recorded.filter((d) => d.totals[key] !== null);
      return [
        key,
        {
          value: mean(eligible.map((d) => d.totals[key] as number)),
          days: eligible.length,
          missingDays: recorded.length - eligible.length,
        },
      ];
    }),
  );
  const attainment = Object.fromEntries(
    macroKeys.map((key) => [
      key,
      target?.[key] > 0
        ? {
            percent:
              averages[key].value === null
                ? null
                : (Number(averages[key].value) / Number(target[key])) * 100,
            withinDays: completed.filter(
              (d) =>
                d.totals[key] >= target[key] * (1 - tolerance) &&
                d.totals[key] <= target[key] * (1 + tolerance),
            ).length,
            evaluatedDays: completed.length,
            target: Number(target[key]),
          }
        : null,
    ]),
  );
  const periodWeights = weights
    .filter((x) => iso(x.date) >= start && iso(x.date) <= addDays(start, 6))
    .sort((a, b) => iso(a.date).localeCompare(iso(b.date)));
  const first = periodWeights[0],
    last = periodWeights.at(-1),
    weightChange =
      periodWeights.length >= 2
        ? Number(last.weightKg) - Number(first.weightKg)
        : null;
  const weight = {
    count: periodWeights.length,
    first: first ? { date: iso(first.date), kg: Number(first.weightKg) } : null,
    last: last ? { date: iso(last.date), kg: Number(last.weightKg) } : null,
    change: weightChange,
    target: profile?.targetWeightKg ? Number(profile.targetWeightKg) : null,
    measurements: periodWeights.map((x) => ({
      date: iso(x.date),
      kg: Number(x.weightKg),
    })),
  };
  const habits = Object.fromEntries(
    ["BREAKFAST", "LUNCH", "DINNER", "SNACK"].map((meal) => [
      meal,
      {
        recordedDays: recorded.filter((d) => d.meals[meal].items > 0).length,
        averageCalories: mean(
          recorded
            .filter((d) => d.meals[meal].items > 0)
            .map((d) => d.meals[meal].calories),
        ),
      },
    ]),
  );
  return {
    start,
    end: addDays(start, 6),
    days,
    loggedDays: recorded.length,
    completedDays: completed.length,
    averages,
    attainment,
    weight,
    habits,
    calorieVariability:
      recorded.length >= 3 ? sd(recorded.map((d) => d.totals.calories)) : null,
    target: target || null,
    tolerancePercent: tolerance * 100,
    limitations: [
      "Chỉ phản ánh thực phẩm đã ghi; ngày trống không được tính thành ngày ăn 0 kcal.",
      "Mục tiêu hiện tại được dùng để so sánh, chưa có lịch sử mục tiêu từng ngày.",
      "Chỉ đánh giá thiếu chất trên ngày người dùng xác nhận đã ghi đủ.",
      "Đường tổng không đồng nghĩa đường tự do; không tự áp ngưỡng đường tự do lên dữ liệu này.",
    ],
  };
}
export type Insight = {
  type: string;
  priority: "LOW" | "MEDIUM";
  title: string;
  body: string;
  suggestion: string;
  evidence: any;
};
export function createInsights(
  current: ReturnType<typeof analyzePeriod>,
  previous: ReturnType<typeof analyzePeriod>,
): Insight[] {
  const results: Insight[] = [];
  if (current.loggedDays < 3) return results;
  results.push({
    type: "LOG_REGULARITY",
    priority: "LOW",
    title: "Mức độ ghi nhật ký",
    body: `Bạn đã ghi nhật ký ${current.loggedDays}/7 ngày, trong đó ${current.completedDays} ngày xác nhận đã ghi đủ.`,
    suggestion:
      "Ghi cả khẩu phần thực tế và xác nhận ngày đã hoàn tất để nhận xét chính xác hơn.",
    evidence: {
      loggedDays: current.loggedDays,
      completedDays: current.completedDays,
    },
  });
  const protein = current.attainment.protein;
  if (protein && protein.evaluatedDays >= 3) {
    const complete = current.days.filter((d) => d.completed),
      avg = mean(complete.map((d) => d.totals.protein))!;
    if (avg < protein.target)
      results.push({
        type: "PROTEIN_PATTERN",
        priority: "MEDIUM",
        title: "Protein trung bình thấp hơn mục tiêu",
        body: `Trên ${complete.length} ngày ghi đủ, protein trung bình là ${avg.toFixed(1)}g, mục tiêu hiện tại ${protein.target}g.`,
        suggestion:
          "Rà lại khẩu phần và mục tiêu cá nhân; trao đổi với chuyên gia nếu mục tiêu cần điều chỉnh theo sức khỏe.",
        evidence: {
          average: avg,
          target: protein.target,
          days: complete.map((d) => d.date),
        },
      });
  }
  if (
    current.calorieVariability !== null &&
    previous.calorieVariability !== null
  ) {
    const steadier = current.calorieVariability < previous.calorieVariability;
    results.push({
      type: "CALORIE_VARIABILITY",
      priority: "LOW",
      title: "Biến động calories giữa hai tuần",
      body: `Calories đã ghi tuần này ${steadier ? "ít biến động hơn" : "biến động nhiều hơn hoặc tương đương"} tuần trước. Đây không phải đánh giá mức năng lượng có phù hợp sức khỏe hay không.`,
      suggestion:
        "Đối chiếu cùng mức độ đầy đủ của nhật ký trước khi thay đổi chế độ ăn.",
      evidence: {
        currentSD: current.calorieVariability,
        previousSD: previous.calorieVariability,
        currentDays: current.loggedDays,
        previousDays: previous.loggedDays,
      },
    });
  }
  if (current.weight.change !== null) {
    results.push({
      type: "WEIGHT_TREND",
      priority: "LOW",
      title: "Thay đổi cân nặng đã ghi",
      body: `Cân nặng thay đổi ${current.weight.change >= 0 ? "+" : ""}${current.weight.change.toFixed(1)}kg giữa ${current.weight.first!.date} và ${current.weight.last!.date}.`,
      suggestion:
        "Đo trong điều kiện tương tự và xem nhiều lần đo; không kết luận nguyên nhân từ biến động ngắn hạn.",
      evidence: current.weight,
    });
  }
  for (const key of extendedKeys)
    if (current.averages[key].days >= 3)
      results.push({
        type: `DATA_${key.toUpperCase()}`,
        priority: "LOW",
        title: `Dữ liệu ${key === "fiber" ? "chất xơ" : key === "sugars" ? "đường tổng" : "natri"} tuần này`,
        body: `Có đủ dữ liệu thành phần trên ${current.averages[key].days}/${current.loggedDays} ngày đã ghi. Trung bình ${Number(current.averages[key].value).toFixed(1)} ${key === "sodium" ? "mg" : "g"}/ngày có dữ liệu.`,
        suggestion:
          "Bổ sung số liệu thành phần còn thiếu từ nhãn thực phẩm hoặc nguồn đáng tin cậy.",
        evidence: current.averages[key],
      });
  return results;
}
