require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { NestFactory } = require('@nestjs/core');
const { PATH_METADATA, METHOD_METADATA } = require('@nestjs/common/constants');
const { RequestMethod } = require('@nestjs/common');
const { AppModule } = require('../dist/app.module');
const { PrismaService } = require('../dist/database/prisma.service');
const { AuthService } = require('../dist/modules/auth/auth.service');
const { MealRecordsService } = require('../dist/modules/meal-records/meal-records.service');
const { NutritionService } = require('../dist/modules/nutrition/nutrition.service');
const { MonitoringService } = require('../dist/modules/monitoring/monitoring.service');
const { MonitoringJobsService } = require('../dist/modules/monitoring/monitoring-jobs.service');
const { NotificationsService } = require('../dist/modules/notifications/notifications.service');
const { MealPlansController } = require('../dist/modules/meal-records/meal-plans.controller');
const { FoodLogsController } = require('../dist/modules/meal-records/food-logs.controller');
const { AdminAlertsController } = require('../dist/modules/admin/admin-alerts.controller');
const { AdminController } = require('../dist/modules/admin/admin.controller');

test('feature modules resolve dependencies and share one Prisma and monitoring service', async () => {
  // create() resolves the full Nest dependency graph without init()/listen():
  // no database connections, background jobs or HTTP ports are started.
  const app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });
  try {
    const db = app.get(PrismaService);
    for (const klass of [AuthService, MealRecordsService, NutritionService, MonitoringService, NotificationsService])
      assert.equal(app.get(klass).db, db, `${klass.name} must use the shared database provider`);
    assert.equal(app.get(MonitoringJobsService).monitoring, app.get(MonitoringService));
    assert.equal(app.get(MonitoringService).notifications, app.get(NotificationsService));
  } finally {
    await app.close();
  }
});

test('linked records and admin alert routes retain HTTP contracts and role checks', () => {
  for (const [klass, prefix, role] of [[MealPlansController, 'plans', 'USER'], [FoodLogsController, 'logs', 'USER'], [AdminAlertsController, 'admin/alerts', 'ADMIN']]) {
    assert.equal(Reflect.getMetadata(PATH_METADATA, klass), prefix);
    assert.equal(Reflect.getMetadata('role', klass), role);
  }
  for (const klass of [MealPlansController, FoodLogsController]) {
    assert.equal(Reflect.getMetadata(PATH_METADATA, klass.prototype.update), 'items/:id');
    assert.equal(Reflect.getMetadata(METHOD_METADATA, klass.prototype.update), RequestMethod.PUT);
    assert.equal(Reflect.getMetadata(METHOD_METADATA, klass.prototype.remove), RequestMethod.DELETE);
  }
});

test('admin cannot grant roles through a user-management HTTP endpoint', () => {
  const routes = Object.getOwnPropertyNames(AdminController.prototype)
    .filter(name => name !== 'constructor')
    .map(name => Reflect.getMetadata(PATH_METADATA, AdminController.prototype[name]));
  assert.ok(!routes.includes('users/:id/role'));
});
