import { Routes } from '@angular/router';
import {
  adminGuard,
  guard,
  onboardingGuard,
  publicOnly,
  userGuard,
} from './core/guards/auth.guards';
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing.component').then((m) => m.LandingComponent),
    canActivate: [publicOnly],
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/auth.component').then((m) => m.AuthComponent),
    canActivate: [publicOnly],
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/auth.component').then((m) => m.AuthComponent),
    canActivate: [publicOnly],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    canActivate: [guard, userGuard],
  },
  {
    path: 'setup',
    loadComponent: () => import('./features/setup/setup.component').then((m) => m.SetupComponent),
    canActivate: [guard, userGuard, onboardingGuard],
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfileComponent),
    canActivate: [guard, userGuard],
  },
  {
    path: 'foods',
    loadComponent: () => import('./features/foods/foods.component').then((m) => m.FoodsComponent),
    canActivate: [guard, userGuard],
  },
  {
    path: 'plans',
    loadComponent: () =>
      import('./features/meal-records/records.component').then((m) => m.RecordsComponent),
    canActivate: [guard, userGuard],
  },
  {
    path: 'week',
    loadComponent: () => import('./features/week/week.component').then((m) => m.WeekComponent),
    canActivate: [guard, userGuard],
  },
  {
    path: 'recommendations',
    loadComponent: () =>
      import('./features/recommendations/recommendations.component').then(
        (m) => m.RecommendationsComponent,
      ),
    canActivate: [guard, userGuard],
  },
  {
    path: 'ai',
    loadComponent: () => import('./features/ai/ai.component').then((m) => m.AiComponent),
    canActivate: [guard, userGuard],
  },
  {
    path: 'logs',
    loadComponent: () =>
      import('./features/meal-records/records.component').then((m) => m.RecordsComponent),
    canActivate: [guard, userGuard],
  },
  {
    path: 'weights',
    loadComponent: () =>
      import('./features/weights/weights.component').then((m) => m.WeightsComponent),
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
      import('./features/notifications/notification-alert-detail.component').then(
        (m) => m.NotificationAlertDetailComponent,
      ),
    canActivate: [guard, userGuard],
  },
  {
    path: 'documents',
    loadComponent: () =>
      import('./features/documents/documents.component').then((m) => m.DocumentsComponent),
    canActivate: [guard],
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('./features/notifications/notifications.component').then(
        (m) => m.NotificationsComponent,
      ),
    canActivate: [guard],
  },
  {
    path: 'insights',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'admin/alerts',
    loadComponent: () =>
      import('./features/admin/alerts/alerts.component').then((m) => m.AlertsComponent),
    canActivate: [guard, adminGuard],
  },
  {
    path: 'admin/users/:id',
    loadComponent: () =>
      import('./features/admin/user-detail/admin-user-detail.component').then(
        (m) => m.AdminUserDetailComponent,
      ),
    canActivate: [guard, adminGuard],
  },
  {
    path: 'admin/users',
    loadComponent: () =>
      import('./features/admin/users/admin-users.component').then((m) => m.AdminUsersComponent),
    canActivate: [guard, adminGuard],
  },
  {
    path: 'admin/foods',
    loadComponent: () => import('./features/foods/foods.component').then((m) => m.FoodsComponent),
    canActivate: [guard, adminGuard],
  },
  {
    path: 'admin/categories',
    loadComponent: () =>
      import('./features/admin/categories/admin-categories.component').then(
        (m) => m.AdminCategoriesComponent,
      ),
    canActivate: [guard, adminGuard],
  },
  {
    path: 'admin/account',
    loadComponent: () =>
      import('./features/admin/account/admin-account.component').then(
        (m) => m.AdminAccountComponent,
      ),
    canActivate: [guard, adminGuard],
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/dashboard/admin-dashboard.component').then(
        (m) => m.AdminDashboardComponent,
      ),
    canActivate: [guard, adminGuard],
  },
  { path: '**', redirectTo: '' },
];
