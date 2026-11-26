export function notificationDestination(path: string): string {
  if (path?.startsWith('/alerts')) {
    const parsed = new URL(path, 'http://local');
    const id = parsed.searchParams.get('id');
    return parsed.pathname === '/alerts' && id && /^[1-9]\d*$/.test(id)
      ? `/notifications/alerts/${id}`
      : '/notifications';
  }
  return path || '/notifications';
}
