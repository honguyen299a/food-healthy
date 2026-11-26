import { Injectable, effect, inject, signal } from '@angular/core';
import { Subject, catchError, merge, of, switchMap, timer } from 'rxjs';
import { ApiService } from './api.service';
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private api = inject(ApiService);
  private reload = new Subject<void>();
  unread = signal(0);
  recent = signal<any[]>([]);
  error = signal('');
  constructor() {
    effect((onCleanup) => {
      if (!this.api.loggedIn()) {
        this.unread.set(0);
        this.recent.set([]);
        this.error.set('');
        return;
      }
      const sub = merge(timer(0, 30000), this.reload)
        .pipe(
          switchMap(() =>
            this.api.get<any>('/notifications?limit=5').pipe(
              catchError(() => {
                this.error.set('Chưa tải được thông báo.');
                return of(null);
              }),
            ),
          ),
        )
        .subscribe((result) => {
          if (result) {
            this.unread.set(result.unread);
            this.recent.set(result.items);
            this.error.set('');
          }
        });
      onCleanup(() => sub.unsubscribe());
    });
  }
  refresh() {
    this.reload.next();
  }
}
