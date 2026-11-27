import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API, ApiService } from './api.service';
import { NotificationsService } from './notifications.service';

describe('Notification polling and session isolation', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });
  it('starts after sign-in, refreshes unread counts and clears private previews after logout', () => {
    const api = TestBed.inject(ApiService),
      service = TestBed.inject(NotificationsService);
    TestBed.tick();
    vi.advanceTimersByTime(0);
    http.expectNone(API + '/notifications?limit=5');
    api.loggedIn.set(true);
    TestBed.tick();
    vi.advanceTimersByTime(0);
    http
      .expectOne(API + '/notifications?limit=5')
      .flush({ unread: 2, items: [{ id: 1, title: 'Riêng tư' }] });
    expect(service.unread()).toBe(2);
    expect(service.recent()).toHaveLength(1);
    service.refresh();
    http.expectOne(API + '/notifications?limit=5').flush({ unread: 1, items: [] });
    expect(service.unread()).toBe(1);
    api.logout();
    TestBed.tick();
    expect(service.unread()).toBe(0);
    expect(service.recent()).toEqual([]);
    vi.advanceTimersByTime(30000);
    http.expectNone(API + '/notifications?limit=5');
  });
  it('continues polling after a temporary API failure', () => {
    TestBed.inject(ApiService).loggedIn.set(true);
    const service = TestBed.inject(NotificationsService);
    TestBed.tick();
    vi.advanceTimersByTime(0);
    http
      .expectOne(API + '/notifications?limit=5')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    expect(service.error()).not.toBe('');
    vi.advanceTimersByTime(30000);
    http.expectOne(API + '/notifications?limit=5').flush({ unread: 3, items: [] });
    expect(service.unread()).toBe(3);
    expect(service.error()).toBe('');
  });
});
