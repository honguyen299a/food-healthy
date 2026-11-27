import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
export const guard = () => inject(ApiService).loggedIn() || inject(Router).parseUrl('/login');
export const adminGuard = () =>
  inject(ApiService).role() === 'ADMIN' || inject(Router).parseUrl('/dashboard');
export const publicOnly = () =>
  !inject(ApiService).loggedIn() ||
  inject(Router).parseUrl(inject(ApiService).role() === 'ADMIN' ? '/admin' : '/dashboard');
export const userGuard = () =>
  inject(ApiService).role() !== 'ADMIN' || inject(Router).parseUrl('/admin');
export const onboardingGuard = () =>
  !inject(ApiService).onboardingCompleted() || inject(Router).parseUrl('/dashboard');
