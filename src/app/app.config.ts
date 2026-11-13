/**
 * @file app.config.ts
 * @description Contenedor central de Inyección de Dependencias (DI) de Angular Standalone (RA 1 y RA 5).
 * Configura:
 * - Enrutador con `withPreloading(NoPreloading)` para garantizar que los módulos protegidos por `canMatch`
 *   jamás se descarguen en segundo plano sin autorización previa.
 * - Cliente HTTP con pipeline funcional `provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))`.
 */
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import {
  RouteReuseStrategy,
  provideRouter,
  withComponentInputBinding,
  withPreloading,
  NoPreloading,
} from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(NoPreloading), withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
  ],
};
