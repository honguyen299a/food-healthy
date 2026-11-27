// Persistent scenarios for comparing a fully logged, on-target user with an alerting user.
// Only newly created, clearly labelled demo accounts are populated.
require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const { randomBytes } = require("node:crypto");
const {
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
} = require("node:fs");
const { resolve } = require("node:path");
const { targets } = require("../dist/modules/nutrition/nutrition-calculator");
const { localToday, addDays } = require("../dist/common/utils/date");
const db = new PrismaClient();
const statePath = resolve(__dirname, "..", ".paired-demo-state.json");
const base = "http://127.0.0.1:" + (process.env.PORT || 3000) + "/api";
const mealSlots = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];

async function api(path, method = "GET", body, token) {
  const response = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json();
  if (!response.ok)
    throw Error(
      method +
        " " +
        path +
        ": " +
        response.status +
        " " +
        JSON.stringify(result),
    );
  return result;
}
async function wait(userId, scope, revision) {
  for (let i = 0; i < 30; i++) {
    const job = await db.monitoringJob.findUnique({
      where: { userId_scope: { userId, scope } },
    });
    if (job && job.processedRevision >= revision && !job.lastError) return;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw Error(
    "Worker has not completed " +
      scope +
      ". Demo accounts were kept; check MONITORING_WORKER.",
  );
}
async function cleanup() {
  if (!existsSync(statePath)) {
    console.log("No saved paired demo.");
    return;
  }
  const state = JSON.parse(readFileSync(statePath, "utf8")),
    accounts = [state.normal, state.warning, state.admin],
    ids = accounts.map((a) => a.id);
  for (const account of accounts) {
    const user = await db.user.findUnique({
      where: { id: account.id },
      select: { email: true },
    });
    if (user && user.email !== account.email)
      throw Error("Demo identity mismatch; refusing cleanup.");
  }
  await db.$transaction(async (tx) => {
    const alerts = await tx.healthAlert.findMany({
      where: { userId: { in: ids } },
      select: { id: true },
    });
    if (alerts.length)
      await tx.notification.deleteMany({
        where: {
          OR: alerts.map((a) => ({
            dedupeKey: { startsWith: "alert:" + a.id + ":" },
          })),
        },
      });
    await tx.foodLog.deleteMany({ where: { userId: { in: ids } } });
    await tx.mealPlan.deleteMany({ where: { userId: { in: ids } } });
    await tx.user.deleteMany({ where: { id: { in: ids } } });
  });
  unlinkSync(statePath);
  console.log(
    "Removed only the saved paired demo and its related alert notifications.",
  );
}
async function main() {
  if (process.argv.includes("--cleanup")) return cleanup();
  if (existsSync(statePath))
    throw Error(
      "Paired demo already exists. Run npm run monitoring:demo-pair:cleanup before generating a new one.",
    );
  const ready = await fetch(base + "/auth/me");
  if (ready.status !== 401) throw Error("Expected the running API at " + base);
  const stamp = Date.now().toString(36),
    today = localToday();
  const credentials = {
    normal: {
      email: "binhthuong-" + stamp + "@example.com",
      password: "Normal!" + randomBytes(8).toString("base64url"),
    },
    warning: {
      email: "canhbao-" + stamp + "@example.com",
      password: "Warning!" + randomBytes(8).toString("base64url"),
    },
    admin: {
      email: "admin-demo-" + stamp + "@example.com",
      password: "Admin!" + randomBytes(10).toString("base64url"),
    },
  };
  const hashes = Object.fromEntries(
    await Promise.all(
      Object.entries(credentials).map(async ([key, account]) => [
        key,
        await bcrypt.hash(account.password, 12),
      ]),
    ),
  );
  const state = await db.$transaction(
    async (tx) => {
      const category = await tx.foodCategory.findFirstOrThrow();
      const accounts = {
        createdAt: new Date().toISOString(),
        from: addDays(today, -7),
        through: today,
      };
      for (const key of ["normal", "warning", "admin"]) {
        const user = await tx.user.create({
          data: {
            email: credentials[key].email,
            passwordHash: hashes[key],
            role: key === "admin" ? "ADMIN" : "USER",
            usageMode: key === "admin" ? "SELF_GUIDED" : "PERSONALIZED",
            onboardingCompleted: true,
          },
        });
        accounts[key] = { id: user.id, email: user.email };
        if (key === "admin") {
          await tx.monitoringSettings.create({
            data: { userId: user.id, reminders: false },
          });
          continue;
        }
        const warning = key === "warning";
        const profile = {
          name: warning
            ? "GIẢ LẬP — Trần Quốc Bảo (có cảnh báo)"
            : "GIẢ LẬP — Nguyễn Minh An (trong mục tiêu)",
          age: 30,
          gender: "MALE",
          heightCm: 175,
          weightKg: warning ? 76 : 70,
          targetWeightKg: 70,
          activity: "LIGHT",
          goal: warning ? "LOSE" : "MAINTAIN",
          mealsPerDay: 4,
          healthConditions: [],
          allergies: warning ? ["sữa"] : [],
          dietaryPreferences: [],
        };
        await tx.userProfile.create({ data: { userId: user.id, ...profile } });
        const target = targets(profile);
        accounts[key].target = target;
        await tx.monitoringSettings.create({
          data: {
            userId: user.id,
            fiberMin: 25,
            sugarsMax: 50,
            sodiumMax: 2000,
            weightChangePercent: 3,
            weightWindowDays: 14,
            reminders: false,
            limitSource:
              "GIẢ LẬP kiểm thử phần mềm — giới hạn minh họa, không phải chỉ định dinh dưỡng.",
          },
        });
        const food = await tx.food.create({
          data: {
            ownerId: user.id,
            categoryId: category.id,
            name:
              (warning
                ? "GIẢ LẬP — Suất ăn nhiều năng lượng, ít xơ "
                : "GIẢ LẬP — Suất ăn cân bằng ") + stamp,
            calories: Number(
              ((target.calories * (warning ? 1.45 : 1)) / 10).toFixed(2),
            ),
            protein: Number(
              ((target.protein * (warning ? 0.5 : 1)) / 10).toFixed(2),
            ),
            carbs: Number(
              ((target.carbs * (warning ? 1.6 : 1)) / 10).toFixed(2),
            ),
            fat: Number(((target.fat * (warning ? 1.1 : 1)) / 10).toFixed(2)),
            fiber: warning ? 0.5 : 3,
            sugars: warning ? 6 : 3,
            sodium: warning ? 350 : 80,
          },
        });
        for (let offset = -7; offset <= 0; offset++)
          await tx.foodLog.create({
            data: {
              userId: user.id,
              date: new Date(addDays(today, offset)),
              completed: offset < 0,
              items: {
                create: mealSlots.map((meal) => ({
                  foodId: food.id,
                  meal,
                  grams: 250,
                })),
              },
            },
          });
        let milk = null;
        if (warning)
          milk = await tx.food.create({
            data: {
              ownerId: user.id,
              categoryId: category.id,
              name: "GIẢ LẬP — Sữa bò kiểm tra dị ứng " + stamp,
              calories: 60,
              protein: 3,
              carbs: 5,
              fat: 3,
              fiber: 0,
              sugars: 5,
              sodium: 40,
            },
          });
        for (let offset = 0; offset < 7; offset++)
          await tx.mealPlan.create({
            data: {
              userId: user.id,
              date: new Date(addDays(today, offset)),
              items: {
                create: [
                  ...mealSlots.map((meal) => ({
                    foodId: food.id,
                    meal,
                    grams: 250,
                  })),
                  ...(warning && offset === 0
                    ? [{ foodId: milk.id, meal: "SNACK", grams: 250 }]
                    : []),
                ],
              },
            },
          });
        const points = warning
          ? [
              [-12, 71],
              [-6, 73],
              [-1, 76],
              [0, 76],
            ]
          : [
              [-12, 70],
              [-6, 70.1],
              [-1, 70],
              [0, 70],
            ];
        for (const [offset, weightKg] of points)
          await tx.weightLog.create({
            data: {
              userId: user.id,
              date: new Date(addDays(today, offset)),
              weightKg,
            },
          });
      }
      return accounts;
    },
    { timeout: 20000 },
  );
  writeFileSync(statePath, JSON.stringify(state, null, 2));
  console.log(
    "New demo credentials (passwords are not saved in the state file):",
  );
  console.log(JSON.stringify(credentials, null, 2));
  const tokens = {};
  for (const key of ["normal", "warning", "admin"])
    tokens[key] = (
      await api("/auth/login", "POST", credentials[key])
    ).accessToken;
  for (const key of ["normal", "warning"]) {
    await api("/monitoring/refresh", "POST", {}, tokens[key]);
    const current = await db.monitoringJob.findUniqueOrThrow({
      where: { userId_scope: { userId: state[key].id, scope: "CURRENT" } },
    });
    await wait(state[key].id, "CURRENT", current.revision);
    const start = addDays(today, -7);
    await api("/insights/reports", "POST", { start }, tokens[key]);
    const report = await db.monitoringJob.findUniqueOrThrow({
      where: {
        userId_scope: { userId: state[key].id, scope: "REPORT:" + start },
      },
    });
    await wait(state[key].id, report.scope, report.revision);
  }
  const normal = await api("/alerts?limit=50", "GET", undefined, tokens.normal);
  const warning = await api(
    "/alerts?limit=50",
    "GET",
    undefined,
    tokens.warning,
  );
  const normalHealth = await api(
    "/admin/users/" + state.normal.id + "/health",
    "GET",
    undefined,
    tokens.admin,
  );
  const warningHealth = await api(
    "/admin/users/" + state.warning.id + "/health",
    "GET",
    undefined,
    tokens.admin,
  );
  const notices = await api(
    "/notifications?limit=50",
    "GET",
    undefined,
    tokens.admin,
  );
  if (normal.total !== 0 || normalHealth.group !== "NO_ALERT")
    throw Error("Normal scenario did not pass verification.");
  if (
    warningHealth.group !== "BELOW_TARGET" ||
    !warning.items.some((a) => a.severity === "HIGH")
  )
    throw Error("Warning scenario did not pass verification.");
  const high = warning.items.find((a) => a.severity === "HIGH");
  if (!notices.items.some((n) => n.alertId === high.id))
    throw Error("Admin did not receive the high alert.");
  console.log(
    JSON.stringify(
      {
        normal: {
          id: state.normal.id,
          alerts: normal.total,
          group: normalHealth.group,
          loggedDays: normalHealth.summary.loggedDays,
          completedDays: normalHealth.summary.completedDays,
        },
        warning: {
          id: state.warning.id,
          alerts: warning.total,
          group: warningHealth.group,
          severityCounts: warning.stats,
        },
        admin: {
          id: state.admin.id,
          unread: notices.unread,
          highAlertUrl: "http://localhost:4200/admin/alerts?id=" + high.id,
        },
        dataDates: { from: state.from, to: state.through },
      },
      null,
      2,
    ),
  );
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
