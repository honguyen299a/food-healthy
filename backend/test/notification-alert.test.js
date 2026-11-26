const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  notificationAlertId,
  notificationAlertPaths,
} = require("../dist/notification-alert");
test("notification context recognizes old and new user alert links and Admin links", () => {
  for (const path of [
    "/alerts?id=12",
    "/notifications/alerts/12",
    "/admin/alerts?id=12",
  ])
    assert.equal(notificationAlertId(path), 12);
  for (const path of [
    "/logs",
    "/insights?report=12",
    "/notifications/alerts/0",
    "/notifications/alerts/12junk",
  ])
    assert.equal(notificationAlertId(path), null);
  assert.deepEqual(notificationAlertPaths([12], false), [
    "/alerts?id=12",
    "/notifications/alerts/12",
  ]);
  assert.deepEqual(notificationAlertPaths([12], true), ["/admin/alerts?id=12"]);
});
