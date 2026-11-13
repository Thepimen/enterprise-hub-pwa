/**
 * @file auth.interceptor.ts
 * @description Interceptor funcional HTTP (HttpInterceptorFn) para inyección automática de tokens Bearer.
 * Garantiza que toda petición saliente hacia servicios protegidos transporte las credenciales en memoria.
 */
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Si existe un token de sesión en memoria, inyectar cabecera Authorization y registrar auditoría
  if (token) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
        'X-Client-Environment': 'EnterpriseHub-PWA-v1.5',
      },
    });
    authService.recordAudit(
      'INTERCEPTOR',
      'SUCCESS',
      `authInterceptor: Cabecera Authorization Bearer inyectada en petición HTTP (${req.method} ${req.url}).`
    );
    return next(authReq);
  }

  return next(req);
};
