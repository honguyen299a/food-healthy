import { AlertSeverity, AlertSource } from "@prisma/client";
import { addDays, aggregateNutrition, iso } from "./monitoring-analysis";
import { RecommendationSafetyService } from "./services/recommendation-safety.service";

export type RuleResult = {
  fingerprint: string;
  type: string;
  source: AlertSource;
  severity: AlertSeverity;
  title: string;
  body: string;
  evidence: any;
  active: boolean | null;
  adminReview: boolean;
};
export function evaluateRules(
  today: string,
  logs: any[],
  plans: any[],
  weights: any[],
  target: any,
  profile: any,
  preferences: any[],
  settings: any,
  safety: RecommendationSafetyService,
): RuleResult[] {
  const results: RuleResult[] = [];
  const lastThree = Array.from({ length: 3 }, (_, i) => addDays(today, -3 + i));
  const actual = lastThree.map((date) => {
    const log = logs.find((x) => iso(x.date) === date);
    return {
      date,
      completed: !!log?.completed,
      items: log?.items || [],
      totals: aggregateNutrition(log?.items || []),
    };
  });
  const tolerance = Number(settings?.targetTolerancePercent ?? 10) / 100;
  const base = (
    type: string,
    source: AlertSource,
    severity: AlertSeverity,
    title: string,
    body: string,
    active: boolean | null,
    evidence: any,
    scope = "trend",
  ): RuleResult => ({
    fingerprint: `${type}:${source}:${scope}`,
    type,
    source,
    severity,
    title,
    body,
    active,
    evidence,
    adminReview: true,
  });
  const full = actual.every((d) => d.completed && d.items.length > 0);
  const hasLogs = actual.every((d) => d.items.length > 0);
  results.push(
    base(
      "CALORIES_OVER",
      "ACTUAL",
      "MEDIUM",
      "Calories đã ghi liên tục vượt mục tiêu",
      "Ba ngày liên tiếp có lượng calories đã ghi vượt khoảng so sánh của mục tiêu hiện tại. Đây không phải chẩn đoán.",
      target && hasLogs
        ? actual.every(
            (d) => d.totals.calories > target.calories * (1 + tolerance),
          )
        : null,
      {
        days: actual.map((d) => ({ date: d.date, value: d.totals.calories })),
        target: target?.calories ?? null,
        tolerancePercent: tolerance * 100,
        rule: "3 ngày liên tiếp; quy tắc theo dõi, không phải ngưỡng y khoa",
      },
    ),
  );
  results.push(
    base(
      "PROTEIN_LOW",
      "ACTUAL",
      "MEDIUM",
      "Protein thấp hơn mục tiêu trong nhiều ngày",
      "Protein đã ghi thấp hơn khoảng mục tiêu trong ba ngày liên tiếp được xác nhận ghi đủ.",
      target && full
        ? actual.every(
            (d) => d.totals.protein < target.protein * (1 - tolerance),
          )
        : null,
      {
        days: actual.map((d) => ({
          date: d.date,
          value: d.totals.protein,
          completed: d.completed,
        })),
        target: target?.protein ?? null,
        tolerancePercent: tolerance * 100,
      },
    ),
  );
  const fiberLimit =
    settings?.fiberMin == null ? null : Number(settings.fiberMin);
  const fiberComplete =
    full && actual.every((d) => d.totals.coverage.fiber.complete);
  results.push(
    base(
      "FIBER_LOW",
      "ACTUAL",
      "MEDIUM",
      "Chất xơ thấp hơn ngưỡng theo dõi cá nhân",
      "Ba ngày ghi đủ và đủ dữ liệu thành phần đều có chất xơ thấp hơn mục tiêu được thiết lập.",
      fiberLimit === null
        ? null
        : fiberComplete
          ? actual.every((d) => d.totals.fiber! < fiberLimit)
          : null,
      {
        days: actual.map((d) => ({ date: d.date, value: d.totals.fiber })),
        limit: fiberLimit,
        limitSource: settings?.limitSource || null,
      },
    ),
  );
  for (const log of logs.filter(
    (x) =>
      iso(x.date) >= addDays(today, -6) &&
      iso(x.date) <= today &&
      x.items.length,
  )) {
    const totals = aggregateNutrition(log.items);
    for (const [key, setting, label] of [
      ["sugars", "sugarsMax", "Đường tổng"],
      ["sodium", "sodiumMax", "Natri"],
    ] as const) {
      const limit =
          settings?.[setting] == null ? null : Number(settings[setting]),
        coverage = totals.coverage[key];
      const active =
        limit === null
          ? null
          : coverage.knownTotal > limit
            ? true
            : coverage.complete
              ? false
              : null;
      results.push(
        base(
          `${key.toUpperCase()}_OVER`,
          "ACTUAL",
          "MEDIUM",
          `${label} vượt ngưỡng theo dõi`,
          `${label} trong thực phẩm đã ghi vượt giới hạn cá nhân. Nếu thiếu thành phần, số đã biết chỉ là mức tối thiểu.`,
          active,
          {
            date: iso(log.date),
            knownTotal: coverage.knownTotal,
            complete: coverage.complete,
            missingItems: coverage.totalItems - coverage.knownItems,
            limit,
            limitSource: settings?.limitSource || null,
          },
          iso(log.date),
        ),
      );
    }
  }
  // Plan targets are only checked on a day which the user has actually planned, and are
  // explicitly distinguished from consumed nutrition. Missing data is never treated as zero.
  for (const [source, records] of [
    ["PLAN", plans],
    [
      "ACTUAL",
      logs.filter(
        (x) => iso(x.date) >= addDays(today, -6) && iso(x.date) <= today,
      ),
    ],
  ] as const) {
    for (const record of records) {
      const date = iso(record.date),
        items = record.items || [];
      const allergies: string[] = [],
        diet: string[] = [];
      for (const item of items) {
        const checks = safety.evaluate(
          item.food,
          profile?.healthConditions,
          profile?.allergies,
          profile?.dietaryPreferences,
        );
        if (
          checks.reasons.includes("ALLERGY") ||
          preferences.some(
            (p) => p.foodId === item.foodId && p.kind === "ALLERGY",
          )
        )
          allergies.push(item.food.name);
        if (
          checks.reasons.includes("DIET") ||
          checks.reasons.includes("CONDITION") ||
          preferences.some(
            (p) => p.foodId === item.foodId && p.kind === "DISLIKE",
          )
        )
          diet.push(item.food.name);
      }
      results.push(
        base(
          "ALLERGY_MATCH",
          source,
          "HIGH",
          "Có thực phẩm liên quan dị ứng đã khai báo",
          "Đối chiếu tên món và danh sách loại trừ cho thấy thực phẩm cần kiểm tra. Dữ liệu thành phần chưa đầy đủ; không xác nhận an toàn hay chẩn đoán phản ứng dị ứng.",
          allergies.length > 0,
          {
            date,
            foods: [...new Set(allergies)],
            method:
              "Đối chiếu khai báo và tên thực phẩm; chưa kiểm chứng đầy đủ nguyên liệu",
          },
          date,
        ),
      );
      results.push(
        base(
          "FOOD_CONSTRAINT",
          source,
          "MEDIUM",
          "Thực phẩm chưa phù hợp hồ sơ đã khai báo",
          "Có món trùng điều kiện loại trừ hoặc chưa phù hợp kiểu ăn theo bộ quy tắc hiện có. Hãy kiểm tra thành phần thực tế.",
          diet.length > 0,
          { date, foods: [...new Set(diet)] },
          date,
        ),
      );
      if (source === "PLAN") {
        const totals = aggregateNutrition(items);
        for (const [key, setting, label, low] of [
          ["fiber", "fiberMin", "Chất xơ", true],
          ["sugars", "sugarsMax", "Đường tổng", false],
          ["sodium", "sodiumMax", "Natri", false],
        ] as const) {
          const limit =
            settings?.[setting] == null ? null : Number(settings[setting]);
          results.push(
            base(
              `PLAN_${key.toUpperCase()}`,
              "PLAN",
              "LOW",
              `${label} trong thực đơn cần xem lại`,
              "Thực đơn dự kiến chưa phù hợp ngưỡng theo dõi cá nhân; đây chưa phải lượng thực tế đã ăn.",
              limit === null || !items.length
                ? null
                : totals.coverage[key].complete
                  ? low
                    ? totals[key]! < limit
                    : totals[key]! > limit
                  : null,
              {
                date,
                value: totals[key],
                limit,
                complete: totals.coverage[key].complete,
                limitSource: settings?.limitSource || null,
              },
              date,
            ),
          );
        }
        if (target && items.length)
          results.push(
            base(
              "PLAN_CALORIES",
              "PLAN",
              "LOW",
              "Calories dự kiến vượt khoảng mục tiêu",
              "Kế hoạch ngày này vượt khoảng so sánh mục tiêu hiện tại; bạn có thể rà lại khẩu phần trước khi áp dụng.",
              totals.calories > target.calories * (1 + tolerance),
              {
                date,
                value: totals.calories,
                target: target.calories,
                tolerancePercent: tolerance * 100,
              },
              date,
            ),
          );
      }
    }
  }
  const weightWindow = Number(settings?.weightWindowDays ?? 14);
  const recent = weights
    .filter(
      (x) =>
        iso(x.date) >= addDays(today, -weightWindow) && iso(x.date) <= today,
    )
    .sort((a, b) => iso(a.date).localeCompare(iso(b.date)));
  const first = recent[0],
    last = recent.at(-1),
    span =
      first && last
        ? (Date.parse(iso(last.date)) - Date.parse(iso(first.date))) / 86400000
        : 0;
  const enough = recent.length >= 3 && span >= 7;
  const delta = enough ? Number(last.weightKg) - Number(first.weightKg) : null;
  const percent =
    delta === null ? null : (delta / Number(first.weightKg)) * 100;
  const limit =
    settings?.weightChangePercent == null
      ? null
      : Number(settings.weightChangePercent);
  results.push(
    base(
      "WEIGHT_CHANGE",
      "WEIGHT",
      "MEDIUM",
      "Cân nặng thay đổi vượt ngưỡng theo dõi cá nhân",
      "Biến động giữa nhiều lần đo vượt giới hạn đã thiết lập. Hãy xác nhận điều kiện đo; hệ thống không kết luận nguyên nhân.",
      limit === null || !enough ? null : Math.abs(percent!) > limit,
      {
        measurements: recent.map((x) => ({
          date: iso(x.date),
          kg: Number(x.weightKg),
        })),
        percent,
        limit,
        spanDays: span,
        windowDays: weightWindow,
        limitSource: settings?.limitSource || null,
      },
    ),
  );
  const targetWeight =
    profile?.targetWeightKg == null ? null : Number(profile.targetWeightKg);
  results.push(
    base(
      "WEIGHT_GOAL",
      "WEIGHT",
      "LOW",
      "Xu hướng cân nặng xa mục tiêu hơn",
      "Khoảng cách tới cân nặng mục tiêu tăng giữa các lần đo trong cửa sổ theo dõi. Đây là nhận xét mô tả, không đánh giá nguy cơ bệnh.",
      enough && targetWeight !== null
        ? Math.abs(Number(last.weightKg) - targetWeight) >
            Math.abs(Number(first.weightKg) - targetWeight)
        : null,
      {
        first: first
          ? { date: iso(first.date), kg: Number(first.weightKg) }
          : null,
        last: last ? { date: iso(last.date), kg: Number(last.weightKg) } : null,
        targetWeight,
        spanDays: span,
      },
    ),
  );
  return results;
}
