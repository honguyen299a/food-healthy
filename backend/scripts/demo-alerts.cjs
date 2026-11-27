// Persistent, clearly labelled local demo. No existing user's health data is changed.
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
const { localToday, addDays } = require("../dist/common/utils/date");
const db = new PrismaClient();
const statePath = resolve(__dirname, "..", ".alert-demo-state.json");
const base = `http://127.0.0.1:${process.env.PORT || 3000}/api`;

async function request(path, method = "GET", body, token) {
  const response = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      `${method} ${path}: ${response.status} ${JSON.stringify(data)}`,
    );
  return data;
}
async function waitForJob(userId, scope, revision) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const job = await db.monitoringJob.findUnique({
      where: { userId_scope: { userId, scope } },
    });
    if (job && job.processedRevision >= revision) return;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(
    `Worker has not finished ${scope}. Check that Backend is running with MONITORING_WORKER enabled. Demo accounts were kept.`,
  );
}
async function cleanup() {
  if (!existsSync(statePath)) {
    console.log("No saved demo to remove.");
    return;
  }
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  for (const account of [state.user, state.admin]) {
    const current = await db.user.findUnique({
      where: { id: account.id },
      select: { email: true },
    });
    if (current && current.email !== account.email)
      throw new Error(
        "Demo account identity does not match; refusing cleanup.",
      );
  }
  await db.$transaction(async (tx) => {
    const alerts = await tx.healthAlert.findMany({
      where: { userId: state.user.id },
      select: { id: true },
    });
    if (alerts.length)
      await tx.notification.deleteMany({
        where: {
          OR: alerts.map((a) => ({
            dedupeKey: { startsWith: `alert:${a.id}:` },
          })),
        },
      });
    await tx.foodLog.deleteMany({ where: { userId: state.user.id } });
    await tx.mealPlan.deleteMany({ where: { userId: state.user.id } });
    await tx.user.deleteMany({
      where: { id: { in: [state.user.id, state.admin.id] } },
    });
  });
  unlinkSync(statePath);
  console.log(
    "Removed only the saved demo accounts, their records and related alert notifications.",
  );
}
async function main() {
  if (process.argv.includes("--cleanup")) return cleanup();
  if (existsSync(statePath))
    throw new Error(
      "A saved demo already exists. Use its accounts, or run npm run monitoring:demo:cleanup before creating another.",
    );
  // Verify the running API before creating any persistent demo data.
  await request("/auth/login", "POST", {
    email: "demo-probe@example.invalid",
    password: "invalid",
  }).catch((error) => {
    if (!String(error.message).includes(": 401 ")) throw error;
  });
  const stamp = Date.now().toString(36),
    today = localToday();
  const password = `Demo!${randomBytes(9).toString("base64url")}`;
  const adminPassword = `Admin!${randomBytes(12).toString("base64url")}`;
  const [userHash, adminHash] = await Promise.all([
    bcrypt.hash(password, 12),
    bcrypt.hash(adminPassword, 12),
  ]);
  const state = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: `alert-demo-${stamp}@example.com`,
        passwordHash: userHash,
        onboardingCompleted: true,
      },
    });
    const admin = await tx.user.create({
      data: {
        email: `admin-alert-${stamp}@example.com`,
        passwordHash: adminHash,
        role: "ADMIN",
        onboardingCompleted: true,
      },
    });
    const category = await tx.foodCategory.findFirstOrThrow();
    await tx.userProfile.create({
      data: {
        userId: user.id,
        name: "GIẢ LẬP — Người dùng kiểm thử cảnh báo",
        age: 30,
        gender: "MALE",
        heightCm: 170,
        weightKg: 64.5,
        targetWeightKg: 60,
        activity: "LIGHT",
        goal: "LOSE",
        allergies: ["sữa"],
      },
    });
    await tx.manualNutritionTarget.create({
      data: {
        userId: user.id,
        calories: 1800,
        protein: 100,
        carbs: 200,
        fat: 60,
      },
    });
    await tx.monitoringSettings.create({
      data: {
        userId: user.id,
        fiberMin: 25,
        sugarsMax: 35,
        sodiumMax: 2000,
        weightChangePercent: 3,
        limitSource:
          "GIẢ LẬP kiểm thử phần mềm — các giới hạn minh họa, không phải chỉ định dinh dưỡng.",
        reminders: false,
      },
    });
    await tx.monitoringSettings.create({
      data: { userId: admin.id, reminders: false },
    });
    const meal = await tx.food.create({
      data: {
        ownerId: user.id,
        categoryId: category.id,
        name: `GIẢ LẬP — Cơm gà ít rau ${stamp}`,
        calories: 180,
        protein: 5,
        carbs: 25,
        fat: 6,
        fiber: 0.5,
        sugars: 3,
        sodium: 500,
      },
    });
    const milk = await tx.food.create({
      data: {
        ownerId: user.id,
        categoryId: category.id,
        name: `GIẢ LẬP — Sữa bò ${stamp}`,
        calories: 60,
        protein: 3,
        carbs: 5,
        fat: 3,
        fiber: 0,
        sugars: 5,
        sodium: 40,
      },
    });
    for (const offset of [-3, -2, -1])
      await tx.foodLog.create({
        data: {
          userId: user.id,
          date: new Date(addDays(today, offset)),
          completed: true,
          items: {
            create: ["BREAKFAST", "LUNCH", "DINNER"].map((slot) => ({
              foodId: meal.id,
              meal: slot,
              grams: 450,
            })),
          },
        },
      });
    await tx.mealPlan.create({
      data: {
        userId: user.id,
        date: new Date(today),
        items: { create: { foodId: milk.id, meal: "BREAKFAST", grams: 250 } },
      },
    });
    for (const [offset, kg] of [
      [-10, 62],
      [-6, 63],
      [-1, 64.5],
    ])
      await tx.weightLog.create({
        data: {
          userId: user.id,
          date: new Date(addDays(today, offset)),
          weightKg: kg,
        },
      });
    return {
      createdAt: new Date().toISOString(),
      user: { id: user.id, email: user.email },
      admin: { id: admin.id, email: admin.email },
    };
  });
  writeFileSync(statePath, JSON.stringify(state, null, 2));
  console.log(
    JSON.stringify(
      {
        user: { ...state.user, password },
        admin: { ...state.admin, password: adminPassword },
      },
      null,
      2,
    ),
  );
  const signedIn = await request("/auth/login", "POST", {
    email: state.user.email,
    password,
  });
  await request("/monitoring/refresh", "POST", {}, signedIn.accessToken);
  const job = await db.monitoringJob.findUniqueOrThrow({
    where: { userId_scope: { userId: state.user.id, scope: "CURRENT" } },
  });
  console.log(
    "Waiting for the real Backend worker to generate alerts and notifications...",
  );
  await waitForJob(state.user.id, "CURRENT", job.revision);
  const reportStart = addDays(today, -7);
  await request(
    "/insights/reports",
    "POST",
    { start: reportStart },
    signedIn.accessToken,
  );
  const reportJob = await db.monitoringJob.findUniqueOrThrow({
    where: {
      userId_scope: { userId: state.user.id, scope: `REPORT:${reportStart}` },
    },
  });
  await waitForJob(state.user.id, reportJob.scope, reportJob.revision);
  const adminLogin = await request("/auth/login", "POST", {
    email: state.admin.email,
    password: adminPassword,
  });
  const alerts = await request(
    `/admin/alerts?userId=${state.user.id}&limit=50`,
    "GET",
    undefined,
    adminLogin.accessToken,
  );
  const notifications = await request(
    "/notifications?limit=50",
    "GET",
    undefined,
    adminLogin.accessToken,
  );
  const high = alerts.items.find((a) => a.severity === "HIGH");
  if (
    !high ||
    !notifications.items.some(
      (n) => n.targetPath === `/admin/alerts?id=${high.id}`,
    )
  )
    throw new Error(
      "Expected allergy alert/administrator notification is missing.",
    );
  console.log(
    JSON.stringify(
      {
        dates: {
          from: addDays(today, -3),
          to: addDays(today, -1),
          plan: today,
        },
        daily: {
          calories: 2430,
          protein: 67.5,
          fiber: 6.75,
          sugars: 40.5,
          sodium: 6750,
        },
        adminAlertCount: alerts.total,
        adminUnread: notifications.unread,
        highAlert: {
          id: high.id,
          title: high.title,
          source: high.source,
          url: `http://localhost:4200/admin/alerts?id=${high.id}`,
        },
        severityCounts: alerts.stats,
        userUrl: "http://localhost:4200/alerts",
        adminNotificationsUrl: "http://localhost:4200/notifications",
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
