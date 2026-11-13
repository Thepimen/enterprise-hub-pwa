/**
 * @file auth.guard.ts
 * @description Functional Guard reactivo (`CanMatchFn` / `CanActivateFn`) para Angular Standalone (RA 1, RA 2, RA 3).
 * Implementa:
 * - Intercepción en fase de coincidencia de rutas (`canMatch`) ANTES de descargar el bundle JS (`loadComponent`).
 * - Resolución asíncrona mediante `Observable<boolean | UrlTree>` sobre Signals (`resolveAuthenticated$`),
 *   eliminando lecturas síncronas (`getSnapshot()`) y condiciones de carrera al recargar con F5.
 * - Redirección atómica mediante `UrlTree` preservando el parámetro `returnUrl`.
 */
import { inject } from '@angular/core';
import {
  CanActivateFn,
  CanMatchFn,
  Route,
  Router,
  RouterStateSnapshot,
  UrlSegment,
  UrlTree,
} from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * Resuelve la URL objetivo tanto cuando el guard se invoca en `canMatch` (`UrlSegment[]`)
 * como cuando se invoca en `canActivate` (`RouterStateSnapshot`).
 */
function resolveTargetUrl(
  route: Route | { routeConfig?: Route | null },
  secondArg: UrlSegment[] | RouterStateSnapshot
): string {
  if (Array.isArray(secondArg)) {
    const joined = secondArg.map((s) => s.path).join('/');
    if (joined) {
      return `/${joined}`;
    }
    const fallbackPath = 'path' in route && route.path ? route.path : '';
    return `/${fallbackPath}`;
  }
  return secondArg?.url || '/';
}

/**
 * Guard funcional de autenticación perimetral.
 * Retorna un `Observable<boolean | UrlTree>` tras verificar la hidratación reactiva de la sesión.
 */
export const authGuard: CanMatchFn & CanActivateFn = (
  route: Route | { routeConfig?: Route | null },
  secondArg: UrlSegment[] | RouterStateSnapshot
): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const targetUrl = resolveTargetUrl(route, secondArg);

  return authService.resolveAuthenticated$().pipe(
    map((isAuth: boolean) => {
      if (isAuth) {
        return true;
      }

      authService.recordAudit(
        'GUARD',
        'WARN',
        `canMatch(authGuard): Descarga de chunk bloqueada sin sesión en '${targetUrl}' -> UrlTree('/login?returnUrl=${encodeURIComponent(targetUrl)}')`
      );

      return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: targetUrl },
      });
    })
  );
};
