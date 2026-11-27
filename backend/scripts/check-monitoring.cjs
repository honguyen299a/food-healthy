// Integration check against the configured MySQL database. Only UUID-scoped fixtures
// are created; they are removed in finally. No existing user's notifications are sent.
require("reflect-metadata");
require("dotenv/config");
process.env.MONITORING_WORKER = "false";
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { NestFactory } = require("@nestjs/core");
const { ValidationPipe } = require("@nestjs/common");
const { JwtService } = require("@nestjs/jwt");
const { AppModule } = require("../dist/app.module");
const { PrismaService } = require("../dist/database/prisma.service");
const { MonitoringService } = require("../dist/modules/monitoring/monitoring.service");
const { MonitoringJobsService } = require("../dist/modules/monitoring/monitoring-jobs.service");
const { NotificationsService } = require("../dist/modules/notifications/notifications.service");
const { PrismaErrorFilter } = require("../dist/common/filters/prisma-error.filter");
const { localToday, addDays } = require("../dist/common/utils/date");

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new PrismaErrorFilter());
  await app.listen(0, "127.0.0.1");
  const db = app.get(PrismaService),
    monitoring = app.get(MonitoringService),
    notifications = app.get(NotificationsService),
    jwt = app.get(JwtService);
  const stamp = randomUUID(),
    ids = [],
    adminIds = [];
  let categoryId,
    createdCategory = false;
  // Scope administrator broadcasts to the integration fixture, including transactions.
  const scoped = (client) =>
    new Proxy(client, {
      get(target, key) {
        if (key === "user")
          return new Proxy(target.user, {
            get(users, method) {
              if (method === "findMany")
                return (args) =>
                  users.findMany({
                    ...args,
                    where: {
                      ...args.where,
                      ...(args.where?.role === "ADMIN"
                        ? { id: { in: adminIds } }
                        : {}),
                    },
                  });
              return users[method];
            },
          });
        if (key === "$transaction")
          return (work) => target.$transaction((tx) => work(scoped(tx)));
        return target[key];
      },
    });
  monitoring.db = scoped(db);
  const tokens = {};
  const sharedFoodIds = [];
  const today = localToday();
  let checks = 0;
  async function api(role, path, method = "GET", body, expected = 200) {
    const response = await fetch(`${await app.getUrl()}/api${path}`, {
      method,
      headers: {
        ...(role ? { Authorization: `Bearer ${tokens[role]}` } : {}),
        "Content-Type": "application/json",
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const value = await response.json();
    assert.equal(
      response.status,
      expected,
      `${method} ${path}: ${JSON.stringify(value)}`,
    );
    checks++;
    return value;
  }
  try {
    for (const [name, role] of [
      ["a", "USER"],
      ["b", "USER"],
      ["admin", "ADMIN"],
    ]) {
      const user = await db.user.create({
        data: {
          email: `monitoring-${stamp}-${name}@example.invalid`,
          passwordHash: "not-a-login-hash",
          role,
          onboardingCompleted: true,
        },
      });
      ids.push(user.id);
      if (role === "ADMIN") adminIds.push(user.id);
      tokens[name] = jwt.sign({ sub: user.id, role });
    }
    const [userId, otherId, adminId] = ids;
    let category = await db.foodCategory.findFirst();
    if (!category) {
      category = await db.foodCategory.create({
        data: { name: `Test ${stamp}` },
      });
      createdCategory = true;
    }
    categoryId = category.id;
    const food = await db.food.create({
      data: {
        ownerId: userId,
        categoryId,
        name: `Yến mạch kiểm thử ${stamp}`,
        calories: 1000,
        protein: 5,
        carbs: 100,
        fat: 15,
        fiber: 3,
        sugars: 2,
        sodium: 500,
      },
    });
    const milk = await db.food.create({
      data: {
        ownerId: userId,
        categoryId,
        name: `Sữa kiểm thử ${stamp}`,
        calories: 100,
        protein: 5,
        carbs: 10,
        fat: 4,
        fiber: 0,
        sugars: 4,
        sodium: 40,
      },
    });
    await db.userProfile.create({
      data: {
        userId,
        name: "Người dùng kiểm thử",
        age: 30,
        gender: "MALE",
        heightCm: 170,
        weightKg: 60,
        activity: "LIGHT",
        goal: "MAINTAIN",
        targetWeightKg: 60,
        allergies: ["sữa"],
      },
    });
    await db.manualNutritionTarget.create({
      data: { userId, calories: 2000, protein: 100, carbs: 250, fat: 60 },
    });
    await db.monitoringSettings.create({
      data: {
        userId,
        fiberMin: 25,
        sodiumMax: 1000,
        limitSource: "Mục tiêu riêng của bộ kiểm thử",
        reminders: false,
      },
    });
    for (const offset of [-3, -2, -1]) {
      const date = addDays(today, offset);
      const added = await api(
        "a",
        `/logs/${date}/items`,
        "POST",
        { foodId: food.id, meal: "BREAKFAST", grams: 300 },
        201,
      );
      await api("a", `/logs/${date}/completeness`, "PUT", { completed: true });
      const record = await api("a", `/logs?date=${date}`);
      assert.equal(record.completed, true);
      assert.equal(record.totals.calories, 3000);
      assert.equal(record.totals.fiber, 9);
      if (offset === -1) {
        await api(
          "b",
          `/logs/items/${added.id}`,
          "PUT",
          { foodId: food.id, meal: "BREAKFAST", grams: 200 },
          404,
        );
        await api("a", `/logs/items/${added.id}`, "PUT", {
          foodId: food.id,
          meal: "BREAKFAST",
          grams: 300,
        });
        assert.equal((await api("a", `/logs?date=${date}`)).completed, false);
        await api("a", `/logs/${date}/completeness`, "PUT", {
          completed: true,
        });
      }
    }
    const planned = await api(
      "a",
      `/plans/${today}/items`,
      "POST",
      { foodId: milk.id, meal: "BREAKFAST", grams: 100 },
      201,
    );
    await monitoring.refresh(userId);
    const firstCount = await db.notification.count({
      where: { userId: { in: ids } },
    });
    await monitoring.refresh(userId);
    assert.equal(
      await db.notification.count({ where: { userId: { in: ids } } }),
      firstCount,
    );
    const summary = await api("a", "/insights");
    assert.equal(summary.summary.loggedDays, 3);
    assert.equal(summary.summary.averages.calories.value, 3000);
    assert.equal(summary.summary.averages.fiber.value, 9);
    const alertList = await api("a", "/alerts");
    assert.ok(alertList.items.some((x) => x.type === "PROTEIN_LOW"));
    const low = alertList.items.find((x) => x.severity === "LOW");
    assert.ok(low, "Expected a LOW alert to verify all severities reach Admin");
    await api("admin", `/admin/alerts/${low.id}`);
    const adminList = await api(
      "admin",
      `/admin/alerts?userId=${userId}&limit=50`,
    );
    assert.equal(adminList.total, alertList.total);
    // Admin workspace, ownership and role boundaries use the same live MySQL data.
    const dashboard = await api("admin", "/admin/dashboard");
    assert.equal(
      dashboard.totalUsers,
      await db.user.count({ where: { role: "USER" } }),
    );
    assert.equal(
      dashboard.groups.reduce((n, g) => n + g.count, 0),
      dashboard.totalUsers,
    );
    const people = await api("admin", `/admin/users?search=${stamp}`);
    assert.equal(people.total, 2);
    const below = await api(
      "admin",
      `/admin/users?search=${stamp}&group=BELOW_TARGET`,
    );
    assert.equal(below.total, 1);
    assert.equal(below.items[0].id, userId);
    const health = await api("admin", `/admin/users/${userId}/health`);
    assert.equal(health.summary.averages.calories.value, 3000);
    assert.equal(health.user.passwordHash, undefined);
    assert.equal(health.aiConversations, undefined);
    assert.equal(health.group, "BELOW_TARGET");
    const selectedDay = addDays(today, -1),
      selectedMonth = selectedDay.slice(0, 7),
      outsideMonth = addDays(selectedMonth + "-01", -40);
    await db.foodLog.create({
      data: {
        userId,
        date: new Date(outsideMonth),
        items: { create: { foodId: food.id, meal: "LUNCH", grams: 100 } },
      },
    });
    await db.weightLog.createMany({
      data: [
        { userId, date: new Date(selectedDay), weightKg: 60 },
        { userId, date: new Date(outsideMonth), weightKg: 70 },
      ],
    });
    const dayChart = await api(
      "a",
      `/dashboard/charts?mode=DAY&date=${selectedDay}`,
    );
    assert.equal(dayChart.days.length, 1);
    assert.equal(dayChart.loggedDays, 1);
    assert.equal(dayChart.averages.calories, 3000);
    assert.equal(dayChart.weights.length, 1);
    const monthChart = await api(
      "a",
      `/dashboard/charts?mode=MONTH&month=${selectedMonth}`,
    );
    assert.equal(
      monthChart.days.length,
      new Date(
        Date.UTC(
          Number(selectedMonth.slice(0, 4)),
          Number(selectedMonth.slice(5, 7)),
          0,
        ),
      ).getUTCDate(),
    );
    assert.equal(monthChart.averages.calories, 3000);
    assert.equal(monthChart.target.calories, 2000);
    assert.equal(monthChart.weights.length, 1);
    assert.ok(monthChart.days.every((d) => d.date.startsWith(selectedMonth)));
    assert.equal(
      (await api("b", `/dashboard/charts?mode=MONTH&month=${selectedMonth}`))
        .loggedDays,
      0,
    );
    const emptyChart = await api(
      "a",
      `/dashboard/charts?mode=DAY&date=${addDays(outsideMonth, -1)}`,
    );
    assert.equal(emptyChart.averages.calories, null);
    await api(
      "a",
      "/dashboard/charts?mode=MONTH&month=2026-13",
      "GET",
      undefined,
      400,
    );
    await api(
      "a",
      "/dashboard/charts?mode=DAY&date=2026-02-31",
      "GET",
      undefined,
      400,
    );
    await api(
      "a",
      "/dashboard/charts?mode=MONTH&month=2026-11&userId=" + otherId,
      "GET",
      undefined,
      400,
    );
    await api(
      "admin",
      "/dashboard/charts?mode=MONTH&month=2026-11",
      "GET",
      undefined,
      403,
    );
    await api("b", `/admin/users/${userId}/health`, "GET", undefined, 403);
    await api("admin", `/admin/users/${adminId}/health`, "GET", undefined, 404);
    for (const path of [
      "/weights",
      "/logs?date=" + today,
      "/profile",
      "/insights",
      "/dashboard?date=" + today,
      "/alerts",
    ])
      await api("admin", path, "GET", undefined, 403);
    await api("a", "/admin/dashboard", "GET", undefined, 403);
    await api("admin", "/admin/users?group=HEALTHY", "GET", undefined, 400);
    await api("admin", "/admin/users?limit=100", "GET", undefined, 400);
    const foodDto = {
      name: `Shared test ${stamp}`,
      categoryId,
      calories: 150,
      protein: 10,
      carbs: 15,
      fat: 5,
      fiber: 3,
      sugars: 1,
      sodium: 12,
    };
    const shared = await api("admin", "/foods", "POST", foodDto, 201);
    sharedFoodIds.push(shared.id);
    assert.equal(shared.ownerId, null);
    const privateFood = await api(
      "b",
      "/foods",
      "POST",
      { ...foodDto, name: `Private test ${stamp}` },
      201,
    );
    assert.equal(privateFood.ownerId, otherId);
    const aFoods = await api("a", "/foods"),
      bFoods = await api("b", "/foods");
    assert.ok(
      aFoods.some((f) => f.id === shared.id) &&
        bFoods.some((f) => f.id === shared.id),
    );
    assert.equal(
      aFoods.some((f) => f.id === privateFood.id),
      false,
    );
    assert.equal(
      (await api("admin", "/foods")).some((f) => f.ownerId !== null),
      false,
    );
    await api("a", `/foods/${privateFood.id}`, "GET", undefined, 404);
    await api("admin", `/foods/${privateFood.id}`, "PUT", foodDto, 404);
    await api("a", `/foods/${shared.id}`, "PUT", foodDto, 404);
    await api(
      "a",
      `/logs/${today}/items`,
      "POST",
      { foodId: privateFood.id, meal: "LUNCH", grams: 100 },
      404,
    );
    await api(
      "b",
      "/foods",
      "POST",
      { ...foodDto, name: `Attempt owner ${stamp}`, ownerId: null },
      400,
    );
    await api("admin", `/admin/foods/${shared.id}/visibility`, "PUT", {
      isActive: false,
    });
    assert.equal(
      (await api("a", "/foods")).some((f) => f.id === shared.id),
      false,
    );
    assert.ok(
      (await api("admin", "/admin/foods?status=HIDDEN")).some(
        (f) => f.id === shared.id,
      ),
    );
    await api("admin", `/admin/foods/${shared.id}/visibility`, "PUT", {
      isActive: true,
    });
    assert.ok((await api("a", "/foods")).some((f) => f.id === shared.id));
    await api(
      "a",
      `/logs/${today}/items`,
      "POST",
      { foodId: shared.id, meal: "LUNCH", grams: 100 },
      201,
    );
    const beforeSharedEdit = await db.monitoringJob.findUnique({
      where: { userId_scope: { userId, scope: "CURRENT" } },
    });
    await api("admin", `/foods/${shared.id}`, "PUT", {
      ...foodDto,
      calories: 200,
    });
    const afterSharedEdit = await db.monitoringJob.findUnique({
      where: { userId_scope: { userId, scope: "CURRENT" } },
    });
    assert.ok(afterSharedEdit.revision > beforeSharedEdit.revision);
    // Editing a library food changes future portions, while previously eaten
    // food keeps its recorded nutrition snapshot.
    assert.equal((await api("admin", `/foods/${shared.id}`)).calories, '200');
    assert.equal((await api("a", `/logs?date=${today}`)).totals.calories, 150);
    const adminNotices = await api("admin", "/notifications?limit=50");
    assert.ok(
      adminNotices.items.some(
        (n) =>
          n.body.includes(`monitoring-${stamp}-a@example.invalid`) &&
          n.body.includes("MEDIUM"),
      ),
    );
    tokens.claimedAdmin = jwt.sign({ sub: otherId, role: "ADMIN" });
    await api("claimedAdmin", "/admin/dashboard", "GET", undefined, 403);
    await api(
      "admin",
      `/admin/users/${adminId}/role`,
      "PUT",
      { role: "USER" },
      404,
    );
    await api("admin", `/admin/users/${otherId}/role`, "PUT", {
      role: "ADMIN",
    }, 404);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: otherId } })).role, "USER");
    // Existing administrator roles remain supported; only fixtures are changed
    // directly here to verify that current database roles override JWT claims.
    await db.user.update({ where: { id: otherId }, data: { role: "ADMIN" } });
    await api("b", "/profile", "GET", undefined, 403);
    await api("b", "/admin/dashboard");
    const roleNotice = await db.notification.create({
      data: {
        userId: otherId,
        dedupeKey: "role-transition-test",
        type: "HEALTH_ALERT",
        title: "Admin role fixture",
        body: "Private administrator context",
        targetPath: "/admin/alerts?id=1",
      },
    });
    await db.user.update({ where: { id: otherId }, data: { role: "USER" } });
    await api("b", "/admin/dashboard", "GET", undefined, 403);
    assert.equal(
      (await api("b", "/notifications")).items.some(
        (n) => n.id === roleNotice.id,
      ),
      false,
    );
    for (const alert of alertList.items) {
      assert.equal(
        await db.notification.count({
          where: {
            userId,
            dedupeKey: `alert:${alert.id}:${alert.revision}:HEALTH_ALERT`,
          },
        }),
        1,
      );
      assert.equal(
        await db.notification.count({
          where: {
            userId: adminId,
            dedupeKey: `alert:${alert.id}:${alert.revision}:HEALTH_ALERT:admin`,
          },
        }),
        1,
      );
    }
    const allergy = alertList.items.find(
      (x) => x.type === "ALLERGY_MATCH" && x.source === "PLAN",
    );
    const alertNotices = await api(
      "a",
      "/notifications?type=HEALTH_ALERT&limit=50",
    );
    assert.ok(
      alertNotices.items.length > 0 &&
        alertNotices.items.every((n) =>
          /^\/notifications\/alerts\/\d+$/.test(n.targetPath),
        ),
    );
    assert.equal(allergy.severity, "HIGH");
    for (const severity of ["LOW", "MEDIUM", "HIGH"]) {
      const filtered = await api(
        "a",
        `/notifications?severity=${severity}&limit=1`,
      );
      assert.equal(filtered.items.length, 1);
      assert.equal(filtered.items[0].severity, severity);
      assert.ok(filtered.items[0].alertId);
      if (filtered.nextCursor) {
        const next = await api(
          "a",
          `/notifications?severity=${severity}&limit=1&cursor=${filtered.nextCursor}`,
        );
        assert.ok(
          next.items.every(
            (n) => n.severity === severity && n.id < filtered.items[0].id,
          ),
        );
      }
      const adminFiltered = await api(
        "admin",
        `/notifications?severity=${severity}&limit=50`,
      );
      assert.ok(
        adminFiltered.items.length > 0 &&
          adminFiltered.items.every((n) => n.severity === severity),
      );
    }
    assert.equal(
      (await api("b", "/notifications?severity=HIGH")).items.length,
      0,
    );
    await api("a", "/notifications?severity=CRITICAL", "GET", undefined, 400);
    const reviewDate = addDays(today, 1);
    const reviewFood = await db.food.create({
      data: {
        ownerId: userId,
        categoryId,
        name: `Sữa Plan review ${stamp}`,
        calories: 600,
        protein: 50,
        carbs: 50,
        fat: 20,
      },
    });
    await api(
      "a",
      `/plans/${reviewDate}/items`,
      "POST",
      { foodId: reviewFood.id, meal: "LUNCH", grams: 500 },
      201,
    );
    const detailPlan = await api("a", `/plans?date=${reviewDate}`);
    const weekPlans = await api("a", `/plans/week?start=${today}`);
    assert.deepEqual(
      detailPlan.analysis,
      weekPlans.find((p) => p.date.slice(0, 10) === reviewDate).analysis,
    );
    assert.ok(
      detailPlan.analysis.issues.some((i) => i.code === "HIGH_CALORIES"),
    );
    assert.ok(
      detailPlan.analysis.issues.some((i) => i.code === "HIGH_PROTEIN"),
    );
    assert.ok(detailPlan.analysis.issues.length >= 5);
    assert.equal(detailPlan.totals.calories, 3000);
    assert.equal(detailPlan.target.calories, 2000);
    assert.equal(
      (await api("b", `/plans?date=${reviewDate}`)).analysis.status,
      "EMPTY",
    );
    await api("b", `/alerts/${allergy.id}`, "GET", undefined, 404);
    await api("b", "/admin/alerts", "GET", undefined, 403);
    await api(null, "/alerts", "GET", undefined, 401);
    const adminDetail = await api("admin", `/admin/alerts/${allergy.id}`);
    assert.deepEqual(Object.keys(adminDetail.user.profile), ["name"]);
    assert.equal(adminDetail.user.aiConversations, undefined);
    await api("admin", `/admin/alerts/${allergy.id}`, "PUT", {
      status: "IN_PROGRESS",
      note: "Đã kiểm tra dữ liệu khai báo.",
      revision: adminDetail.revision,
    });
    await api(
      "admin",
      `/admin/alerts/${allergy.id}`,
      "PUT",
      {
        status: "RESOLVED",
        note: "Dữ liệu cũ.",
        revision: adminDetail.revision,
      },
      400,
    );
    let detail = await api("admin", `/admin/alerts/${allergy.id}`);
    await api("admin", `/admin/alerts/${allergy.id}`, "PUT", {
      status: "RESOLVED",
      note: "Đã trao đổi, tiếp tục theo dõi.",
      revision: detail.revision,
    });
    await monitoring.refresh(userId);
    assert.equal((await api("a", `/alerts/${allergy.id}`)).status, "RESOLVED");
    await api("a", `/plans/items/${planned.id}`, "DELETE");
    await monitoring.refresh(userId);
    assert.equal(
      (await api("a", `/alerts/${allergy.id}`)).conditionActive,
      false,
    );
    await api(
      "a",
      `/plans/${today}/items`,
      "POST",
      { foodId: milk.id, meal: "BREAKFAST", grams: 100 },
      201,
    );
    await monitoring.refresh(userId);
    detail = await api("a", `/alerts/${allergy.id}`);
    assert.equal(detail.status, "OPEN");
    assert.ok(detail.events.length >= 4);
    const notificationList = await api("a", "/notifications?limit=2");
    assert.equal(notificationList.items.length, 2);
    assert.ok(notificationList.nextCursor);
    const n = notificationList.items[0];
    await api("b", `/notifications/${n.id}/read`, "PUT", { read: true }, 404);
    await api("b", `/notifications/${n.id}`, "DELETE", undefined, 404);
    await api("a", `/notifications/${n.id}/read`, "PUT", { read: true });
    assert.equal(
      (await api("a", "/notifications?read=READ")).items.some(
        (x) => x.id === n.id,
      ),
      true,
    );
    await api("a", `/notifications/${n.id}/read`, "PUT", { read: false });
    await api("a", "/notifications/read-all", "PUT", {});
    assert.equal((await api("a", "/notifications")).unread, 0);
    await api("a", `/notifications/${n.id}`, "DELETE");
    assert.ok(
      (await db.notification.findUnique({ where: { id: n.id } })).deletedAt,
    );
    await notifications.send(
      userId,
      n.dedupeKey,
      n.type,
      n.title,
      n.body,
      n.targetPath,
    );
    assert.ok(
      (await db.notification.findUnique({ where: { id: n.id } })).deletedAt,
    );
    const report = await monitoring.generateReport(userId, addDays(today, -7));
    await monitoring.generateReport(userId, addDays(today, -7));
    assert.equal(
      await db.nutritionWeeklyReport.count({ where: { userId } }),
      1,
    );
    assert.equal(
      await db.notification.count({
        where: { userId, dedupeKey: `report:${report.id}` },
      }),
      0, // Legacy reports remain readable; notifications are reserved for health alerts.
    );
    assert.equal(
      (await api("a", `/insights/reports/${report.id}`)).payload.loggedDays,
      3,
    );
    await api("b", `/insights/reports/${report.id}`, "GET", undefined, 404);
    await api("a", "/notifications?limit=100", "GET", undefined, 400);
    await api("a", "/alerts?status=UNKNOWN", "GET", undefined, 400);
    await api("a", "/monitoring/settings", "PUT", { reminders: null }, 400);
    await api("a", "/monitoring/settings", "PUT", { userId: otherId }, 400);
    await api(
      "a",
      "/monitoring/settings",
      "PUT",
      { sodiumMax: 1000, limitSource: "" },
      400,
    );
    await api("a", "/insights/reports", "POST", { start: "2026-02-31" }, 400);
    await api("a", "/insights/reports", "POST", { start: today }, 400);
    await db.userProfile.create({
      data: {
        userId: otherId,
        name: "Four meals test",
        age: 30,
        gender: "MALE",
        heightCm: 170,
        weightKg: 60,
        activity: "LIGHT",
        goal: "MAINTAIN",
        mealsPerDay: 1,
      },
    });
    await db.user.update({
      where: { id: otherId },
      data: { usageMode: "PERSONALIZED" },
    });
    const recommendationDate = addDays(today, 2),
      beforeDrafts = await db.mealPlan.count({ where: { userId: otherId } });
    const automaticDay = await api(
      "b",
      "/recommendations/plan",
      "POST",
      { date: recommendationDate, meals: 1 },
      201,
    );
    assert.equal(automaticDay.mealCount, 4);
    assert.deepEqual(automaticDay.mealSlots, [
      "BREAKFAST",
      "LUNCH",
      "DINNER",
      "SNACK",
    ]);
    const automaticWeek = await api(
      "b",
      "/recommendations/week",
      "POST",
      { date: recommendationDate, meals: 2 },
      201,
    );
    assert.equal(automaticWeek.mealCount, 4);
    assert.equal(automaticWeek.days.length, 7);
    assert.equal(
      await db.mealPlan.count({ where: { userId: otherId } }),
      beforeDrafts,
    );
    // Verify real durable job processing and updates arriving during an in-flight run.
    await db.monitoringJob.deleteMany({ where: { userId } });
    const jobDb = new Proxy(db, {
      get(target, key) {
        if (key === "monitoringJob")
          return new Proxy(target.monitoringJob, {
            get(jobs, method) {
              if (method === "findMany")
                return (args) =>
                  jobs.findMany({ ...args, where: { ...args.where, userId } });
              return jobs[method];
            },
          });
        return target[key];
      },
    });
    const worker = new MonitoringJobsService(jobDb, {
      refresh: async (id) => worker.enqueue(id),
    });
    worker.lastSweep = Date.now();
    await worker.enqueue(userId);
    await db.monitoringJob.update({
      where: { userId_scope: { userId, scope: "CURRENT" } },
      data: { runAfter: new Date(Date.now() - 1000) },
    });
    await worker.tick();
    const pending = await db.monitoringJob.findUnique({
      where: { userId_scope: { userId, scope: "CURRENT" } },
    });
    assert.equal(pending.revision, 2);
    assert.equal(pending.processedRevision, 1);
    assert.equal(pending.lockedUntil, null);
    worker.monitoring = { refresh: (id) => monitoring.refresh(id) };
    await worker.tick();
    const done = await db.monitoringJob.findUnique({
      where: { id: pending.id },
    });
    assert.equal(done.revision, done.processedRevision);
    assert.equal(done.lastError, null);
    console.log(
      `PASS: ${checks} HTTP checks plus database totals, alert lifecycle, audit, deduplication, ownership, reports and durable worker revision checks.`,
    );
  } finally {
    try {
      // Remove records before custom foods: MySQL checks both cascade paths immediately.
      await db.foodLog.deleteMany({ where: { userId: { in: ids } } });
      await db.mealPlan.deleteMany({ where: { userId: { in: ids } } });
      await db.food.deleteMany({ where: { id: { in: sharedFoodIds } } });
      for (const id of ids) await db.user.deleteMany({ where: { id } });
      if (createdCategory)
        await db.foodCategory.deleteMany({ where: { id: categoryId } });
    } finally {
      await app.close();
    }
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
