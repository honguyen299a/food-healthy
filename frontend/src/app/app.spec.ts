import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { ApiService } from './core/services/api.service';

describe('App navigation', () => {
  beforeEach(async () => {
    localStorage.removeItem('healthy_token');
    localStorage.removeItem('healthy_role');
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
  });

  it('shows only account actions before sign-in', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('.public-nav')?.textContent).toContain('Đăng nhập');
    expect(root.querySelector('.public-nav')?.textContent).toContain('Đăng ký');
    expect(root.querySelector('.sidebar')).toBeNull();
  });

  it('shows vertical navigation after sign-in', () => {
    const fixture = TestBed.createComponent(App);
    TestBed.inject(ApiService).loggedIn.set(true);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('.side-nav')).not.toBeNull();
    expect(root.querySelector('.public-nav')).toBeNull();
    expect(root.querySelector('.sidebar-tip')).toBeNull();
    expect(root.querySelector('a[href="/alerts"]')).toBeNull();
    expect(root.querySelector('a[href="/notifications"]')).not.toBeNull();
  });
  it('gives Admin a management menu without personal logging, weight or survey actions', () => {
    const fixture = TestBed.createComponent(App),
      api = TestBed.inject(ApiService);
    api.loggedIn.set(true);
    api.role.set('ADMIN');
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('a[href="/admin"]')).not.toBeNull();
    expect(root.querySelector('a[href="/admin/users"]')).not.toBeNull();
    expect(root.querySelector('a[href="/admin/foods"]')).not.toBeNull();
    for (const path of ['/logs', '/weights', '/setup', '/profile', '/ai'])
      expect(root.querySelector(`a[href="${path}"]`)).toBeNull();
    expect(root.querySelector('.topbar-right')?.textContent).toContain('Quản trị viên');
  });
});
