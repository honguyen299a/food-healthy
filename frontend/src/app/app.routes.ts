import { Routes, Router } from '@angular/router';
import { inject } from '@angular/core';
import { ApiService } from './core/services/api.service';
const guard = () => inject(ApiService).loggedIn() || inject(Router).parseUrl('/login');
const adminGuard = () =>
  inject(ApiService).role() === 'ADMIN' || inject(Router).parseUrl('/dashboard');
const publicOnly = () =>
  !inject(ApiService).loggedIn() ||
  inject(Router).parseUrl(inject(ApiService).role() === 'ADMIN' ? '/admin' : '/dashboard');
const userGuard = () => inject(ApiService).role() !== 'ADMIN' || inject(Router).parseUrl('/admin');
const onboardingGuard = () =>
  !inject(ApiService).onboardingCompleted() || inject(Router).parseUrl('/dashboard');
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/landing.component').then((m) => m.LandingComponent),
    canActivate: [publicOnly],
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/auth.component').then((m) => m.AuthComponent),
    canActivate: [publicOnly],
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/auth.component').then((m) => m.AuthComponent),
    canActivate: [publicOnly],
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard.component').then((m) => m.DashboardComponent),
    canActivate: [guard, userGuard],
  },
  {
    path: 'setup',
    loadComponent: () => import('./pages/setup.component').then((m) => m.SetupComponent),
    canActivate: [guard, userGuard, onboardingGuard],
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile.component').then((m) => m.ProfileComponent),
    canActivate: [guard, userGuard],
  },
  {
    path: 'foods',
    loadComponent: () => import('./pages/foods.component').then((m) => m.FoodsComponent),
    canActivate: [guard, userGuard],
  },
  {
    path: 'plans',
    loadComponent: () => import('./pages/records.component').then((m) => m.RecordsComponent),
    canActivate: [guard, userGuard],
  },
  {
    path: 'week',
    loadComponent: () => import('./pages/week.component').then((m) => m.WeekComponent),
    canActivate: [guard, userGuard],
  },
  {
    path: 'recommendations',
    loadComponent: () =>
      import('./pages/recommendations.component').then((m) => m.RecommendationsComponent),
    canActivate: [guard, userGuard],
  },
  {
    path: 'ai',
    loadComponent: () => import('./pages/ai.component').then((m) => m.AiComponent),
    canActivate: [guard, userGuard],
  },
  {
    path: 'logs',
    loadComponent: () => import('./pages/records.component').then((m) => m.RecordsComponent),
    canActivate: [guard, userGuard],
  },
  {
    path: 'weights',
    loadComponent: () => import('./pages/weights.component').then((m) => m.WeightsComponent),
    canActivate: [guard, userGuard],
  },
  {
    path: 'alerts',
    pathMatch: 'full',
    redirectTo: ({ queryParams }) =>
      /^[1-9]\d*$/.test(String(queryParams['id'] || ''))
        ? `/notifications/alerts/${queryParams['id']}`
        : '/notifications',
  },
  {
    path: 'notifications/alerts/:id',
    loadComponent: () =>
      import('./pages/notification-alert-detail.component').then(
        (m) => m.NotificationAlertDetailComponent,
      ),
    canActivate: [guard, userGuard],
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('./pages/notifications.component').then((m) => m.NotificationsComponent),
    canActivate: [guard],
  },
  {
    path: 'insights',
    loadComponent: () => import('./pages/insights.component').then((m) => m.InsightsComponent),
    canActivate: [guard, userGuard],
  },
  {
    path: 'admin/alerts',
    loadComponent: () => import('./pages/alerts.component').then((m) => m.AlertsComponent),
    canActivate: [guard, adminGuard],
  },
  {
    path: 'admin/users/:id',
    loadComponent: () =>
      import('./pages/admin-user-detail.component').then((m) => m.AdminUserDetailComponent),
    canActivate: [guard, adminGuard],
  },
  {
    path: 'admin/users',
    loadComponent: () => import('./pages/admin-users.component').then((m) => m.AdminUsersComponent),
    canActivate: [guard, adminGuard],
  },
  {
    path: 'admin/foods',
    loadComponent: () => import('./pages/foods.component').then((m) => m.FoodsComponent),
    canActivate: [guard, adminGuard],
  },
  {
    path: 'admin/categories',
    loadComponent: () =>
      import('./pages/admin-categories.component').then((m) => m.AdminCategoriesComponent),
    canActivate: [guard, adminGuard],
  },
  {
    path: 'admin/account',
    loadComponent: () =>
      import('./pages/admin-account.component').then((m) => m.AdminAccountComponent),
    canActivate: [guard, adminGuard],
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./pages/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
    canActivate: [guard, adminGuard],
  },
  { path: '**', redirectTo: '' },
];
