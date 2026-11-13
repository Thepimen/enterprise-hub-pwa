/**
 * @file role.guard.ts
 * @description Factoría funcional de control de acceso granular basado en roles (`CanMatchFn` / `CanActivateFn`) (RA 1, RA 2, RA 3).
 * Implementa:
 * - Protección perimetral en `canMatch` que impide la descarga por red de los chunks JS de administración
 *   (`dashboard-page`) si el usuario carece del rol requerido.
 * - Evaluación asíncrona libre de condiciones de carrera mediante `authService.resolveSession$()` (`Observable<boolean | UrlTree>`).
 * - Redirección atómica mediante `UrlTree` hacia la vista operativa autorizada.
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
import { SystemRole } from '../models/auth.model';

export type AllowedRolesInput = SystemRole[] | SystemRole | string[];

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
 * Factoría de Functional Guard (`CanMatchFn` & `CanActivateFn`) para validación estricta de roles RBAC.
 * @param allowedRoles Lista o rol individual autorizado para cargar y activar la ruta
 */
export const roleGuard = (allowedRoles: AllowedRolesInput): CanMatchFn & CanActivateFn => {
  return (
    route: Route | { routeConfig?: Route | null },
    secondArg: UrlSegment[] | RouterStateSnapshot
  ): Observable<boolean | UrlTree> => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const targetUrl = resolveTargetUrl(route, secondArg);

    const normalizedAllowed: string[] = Array.isArray(allowedRoles)
      ? allowedRoles.map((r) => String(r).toUpperCase())
      : [String(allowedRoles).toUpperCase()];

    return authService.resolveSession$().pipe(
      map((session) => {
        // 1. Verificar sesión autenticada
        if (!session || !session.isAuthenticated) {
          authService.recordAudit(
            'GUARD',
            'WARN',
            `canMatch(roleGuard): Acceso no autenticado a '${targetUrl}' bloqueado -> Redirigiendo a /login`
          );
          return router.createUrlTree(['/login'], {
            queryParams: { returnUrl: targetUrl },
          });
        }

        const userRole = (session.role ?? '').toUpperCase();

        // 2. Comprobar si el rol del usuario está autorizado para descargar el chunk
        if (normalizedAllowed.includes(userRole)) {
          authService.recordAudit(
            'GUARD',
            'SUCCESS',
            `canMatch(roleGuard([${normalizedAllowed.join(', ')}])): Acceso AUTORIZADO a '${targetUrl}' para '${session.username}' (${userRole})`
          );
          return true;
        }

        // 3. Acceso denegado: aborta descarga del chunk JS y redirige mediante UrlTree atómico
        authService.recordAudit(
          'GUARD',
          'WARN',
          `canMatch(roleGuard([${normalizedAllowed.join(', ')}])): Acceso DENEGADO a '${targetUrl}' para rol '${userRole}'. Redirigiendo a vista permitida.`
        );

        if (userRole === 'USER') {
          return router.createUrlTree(['/user-dashboard']);
        }

        return router.createUrlTree(['/tickets']);
      })
    );
  };
};
