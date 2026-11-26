import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
export const API = 'http://localhost:3000/api';
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('healthy_token');
  return next(token ? req.clone({setHeaders:{Authorization:`Bearer ${token}`}}) : req);
};
@Injectable({providedIn:'root'})
export class ApiService {
  private http = inject(HttpClient);
  loggedIn = signal(!!localStorage.getItem('healthy_token'));
  role = signal(localStorage.getItem('healthy_role') || 'USER');
  usageMode = signal(localStorage.getItem('healthy_mode') || 'SELF_GUIDED');
  onboardingCompleted = signal(localStorage.getItem('healthy_onboarding') === 'true');
  get<T=any>(path:string):Observable<T>{return this.http.get<T>(API+path)}
  post<T=any>(path:string,body:any):Observable<T>{return this.http.post<T>(API+path,body)}
  put<T=any>(path:string,body:any):Observable<T>{return this.http.put<T>(API+path,body)}
  delete<T=any>(path:string):Observable<T>{return this.http.delete<T>(API+path)}
  authenticate(path:string,body:any){return this.post<any>(path,body).pipe(tap(res=>{localStorage.setItem('healthy_token',res.accessToken);localStorage.setItem('healthy_role',res.user.role);localStorage.setItem('healthy_mode',res.user.usageMode||'SELF_GUIDED');localStorage.setItem('healthy_onboarding',String(!!res.user.onboardingCompleted));this.loggedIn.set(true);this.role.set(res.user.role);this.usageMode.set(res.user.usageMode||'SELF_GUIDED');this.onboardingCompleted.set(!!res.user.onboardingCompleted)}))}
  setUsageMode(mode:string){localStorage.setItem('healthy_mode',mode);this.usageMode.set(mode)}
  setOnboardingCompleted(value:boolean){localStorage.setItem('healthy_onboarding',String(value));this.onboardingCompleted.set(value)}
  logout(){localStorage.removeItem('healthy_token');localStorage.removeItem('healthy_role');localStorage.removeItem('healthy_mode');localStorage.removeItem('healthy_onboarding');this.loggedIn.set(false);this.role.set('USER');this.usageMode.set('SELF_GUIDED');this.onboardingCompleted.set(false)}
}
