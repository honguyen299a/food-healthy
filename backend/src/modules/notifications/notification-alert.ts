export function notificationAlertId(path: string): number | null {
  const match = /^\/(?:admin\/alerts\?id=|alerts\?id=|notifications\/alerts\/)([1-9]\d*)$/.exec(
    path,
  );
  return match ? Number(match[1]) : null;
}
export function notificationAlertPaths(ids: number[], admin: boolean): string[] {
  return ids.flatMap((id) =>
    admin ? [`/admin/alerts?id=${id}`] : [`/alerts?id=${id}`, `/notifications/alerts/${id}`],
  );
}
