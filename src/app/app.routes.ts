/**
 * @file app.routes.ts
 * @description Árbol de enrutamiento central con Lazy Loading seguro (`loadComponent`) y perímetro `canMatch` (RA 1).
 *
 * ARQUITECTURA DE SEGURIDAD PERIMETRAL (Defensa frente a descarga de bundles no autorizados):
 * - Todas las rutas protegidas implementan `canMatch` en lugar de depender exclusivamente de `canActivate`.
 * - En combinación con `withPreloading(NoPreloading)` en `app.config.ts` / `main.ts`, el navegador
 *   NO descarga por red los chunks JavaScript de administración (`dashboard-page`) ni de operaciones
 *   hasta que `authGuard` y `roleGuard` resuelven positivamente el flujo asíncrono `Observable<boolean | UrlTree>`.
 */
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'welcome',
    pathMatch: 'full',
  },
  {
    path: 'welcome',
    loadComponent: () => import('./pages/welcome/welcome.page').then((m) => m.WelcomePage),
    title: 'Bienvenida | EnterpriseHub PWA',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
    title: 'Iniciar Sesión | EnterpriseHub',
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page').then((m) => m.RegisterPage),
    title: 'Crear Cuenta | EnterpriseHub',
  },
  {
    path: 'dashboard',
    canMatch: [authGuard, roleGuard(['ADMIN'])],
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
    title: 'Telemetría de Clúster | EnterpriseHub',
  },
  {
    path: 'admin',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'tickets',
    canMatch: [authGuard, roleGuard(['ADMIN', 'SUPERVISOR', 'USER'])],
    loadComponent: () => import('./pages/tickets/tickets.page').then((m) => m.TicketsPage),
    title: 'Gestión de Incidencias | EnterpriseHub',
  },
  {
    path: 'user-dashboard',
    canMatch: [authGuard, roleGuard(['USER'])],
    loadComponent: () =>
      import('./pages/user-dashboard/user-dashboard.page').then((m) => m.UserDashboardPage),
    title: 'Panel de Operador | EnterpriseHub',
  },
  {
    path: 'help',
    canMatch: [authGuard],
    loadComponent: () => import('./pages/help/help.page').then((m) => m.HelpPage),
    title: 'Documentación y Ayuda | EnterpriseHub',
  },
  {
    path: '**',
    redirectTo: 'welcome',
  },
];
