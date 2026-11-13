/**
 * @file main.ts
 * @description Punto de entrada de inicialización de EnterpriseHub PWA (`bootstrapApplication`) (RA 1 y RA 5).
 * Registra explícitamente en el contenedor raíz de Inyección de Dependencias:
 * 1. `provideRouter(routes, withPreloading(NoPreloading), withComponentInputBinding())` -> Lazy Loading seguro con `canMatch`.
 * 2. `provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))` -> Inyección centralizada de Bearer JWT y control 401/403.
 */
import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideZoneChangeDetection } from '@angular/core';
import {
  RouteReuseStrategy,
  provideRouter,
  withComponentInputBinding,
  withPreloading,
  NoPreloading,
} from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { errorInterceptor } from './app/core/interceptors/error.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(NoPreloading), withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
  ],
}).catch((err) => console.error(err));
