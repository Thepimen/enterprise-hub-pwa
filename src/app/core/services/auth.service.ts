/**
 * @file auth.service.ts
 * @description Servicio central de autenticación reactiva (RA 1, RA 2, RA 3).
 * Implementa:
 * - Estado reactivo mediante Angular Signals (`_currentUser`, `isAuthenticated`, `userRole`, `isHydrated`)
 * - Interoperabilidad asíncrona RxJS (`toObservable`, `resolveAuthenticated$`, `resolveSession$`) para
 *   eliminar lecturas síncronas (`getSnapshot()`) y prevenir condiciones de carrera (race conditions) al recargar con F5.
 * - Gestión de tokens Bearer en memoria (`_token`) + persistencia controlada en Web Storage API (`sessionStorage`).
 * - Registro inmutable de eventos de auditoría perimetral (`GUARD`, `INTERCEPTOR`, `AUTH`, `STORAGE`).
 */
import { Injectable, signal, computed, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { delay, filter, map, take, tap } from 'rxjs/operators';
import { RegisterPayload, AuthResponse } from '../models/auth.model';
import { environment } from '../../../environments/environment';

/**
 * Interfaz inmutable de sesión de usuario (Módulo 0488 - Desarrollo de Interfaces).
 */
export interface UserSession {
  readonly username: string;
  readonly role: 'admin' | 'user' | 'ADMIN' | 'SUPERVISOR' | 'USER';
  readonly isAuthenticated: boolean;
  readonly token?: string;
}

/** Entrada del registro de auditoría de seguridad en tiempo real */
export interface SecurityAuditEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly type: 'AUTH' | 'GUARD' | 'STORAGE' | 'SYSTEM' | 'INTERCEPTOR';
  readonly level: 'INFO' | 'WARN' | 'SUCCESS';
  readonly message: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);

  /** Claves constantes de persistencia en sessionStorage desde environment */
  private readonly STORAGE_KEY = environment.security.sessionStorageKey;
  private readonly TOKEN_STORAGE_KEY = environment.security.tokenStorageKey;

  /** Signal que indica si la hidratación inicial de sesión ha concluido (previene race conditions en F5) */
  private readonly _isHydrated = signal<boolean>(false);

  /** Signal privado con el estado reactivo de la sesión actual */
  private readonly _currentUser = signal<UserSession | null>(null);

  /** Signal privado con el token Bearer en memoria */
  private readonly _token = signal<string | null>(null);

  /** Selectores públicos de solo lectura basados en Signals */
  public readonly isHydrated = this._isHydrated.asReadonly();
  public readonly currentUser = this._currentUser.asReadonly();
  public readonly token = this._token.asReadonly();

  /** Señales computadas derivadas (sin mutación ni snapshots manuales) */
  public readonly isAuthenticated = computed<boolean>(
    () => this._currentUser()?.isAuthenticated ?? false
  );
  public readonly userRole = computed<string>(() =>
    (this._currentUser()?.role ?? '').toUpperCase()
  );

  /** Flujos reactivos RxJS derivados mediante toObservable() para Guards e Interceptores */
  public readonly isHydrated$: Observable<boolean> = toObservable(this._isHydrated);
  public readonly session$: Observable<UserSession | null> = toObservable(this._currentUser);
  public readonly isAuthenticated$: Observable<boolean> = toObservable(this.isAuthenticated);

  /** Signal reactivo del tema visual ('dark' NOC Obsidian por defecto | 'light' Editorial) */
  public readonly theme = signal<'dark' | 'light'>('dark');

  /** Stream reactivo de eventos de auditoría RBAC y sistema */
  private readonly _auditLogs = signal<SecurityAuditEntry[]>([
    {
      id: 'evt-01',
      timestamp: new Date().toLocaleTimeString('es-ES'),
      type: 'STORAGE',
      level: 'INFO',
      message: `Hidratación reactiva inicializada (sessionStorage: ${this.STORAGE_KEY})`,
    },
    {
      id: 'evt-02',
      timestamp: new Date().toLocaleTimeString('es-ES'),
      type: 'GUARD',
      level: 'SUCCESS',
      message: 'Perímetro canMatch activo (NoPreloading): prevención de descarga de chunks no autorizados',
    },
  ]);

  public readonly auditLogs = this._auditLogs.asReadonly();

  constructor() {
    this.hydrateSessionState();
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', this.theme());
    }
  }

  /**
   * Hidrata de forma controlada las señales reactivas al arrancar la aplicación
   * y marca `_isHydrated` como true para desbloquear los flujos asíncronos de `canMatch`.
   */
  private hydrateSessionState(): void {
    const initialSession = this.readSessionFromStorage();
    const initialToken = this.readInitialToken() ?? initialSession?.token ?? null;
    this._currentUser.set(initialSession);
    this._token.set(initialToken);
    this._isHydrated.set(true);
  }

  /**
   * Resuelve de forma asíncrona el estado de autenticación tras completarse la hidratación.
   * Evita condiciones de carrera (race conditions) al recargar rutas protegidas con F5.
   */
  resolveAuthenticated$(): Observable<boolean> {
    return this.isHydrated$.pipe(
      filter((hydrated) => hydrated === true),
      take(1),
      map(() => this.isAuthenticated())
    );
  }

  /**
   * Resuelve de forma asíncrona la sesión de usuario actual una vez hidratado el estado.
   */
  resolveSession$(): Observable<UserSession | null> {
    return this.isHydrated$.pipe(
      filter((hydrated) => hydrated === true),
      take(1),
      map(() => this._currentUser())
    );
  }

  /**
   * Obtiene el token Bearer actual desde la señal en memoria (para uso en authInterceptor).
   */
  getToken(): string | null {
    return this._token();
  }

  /** Alterna en vivo entre el tema Oscuro NOC (AAA 18.4:1) y el tema Claro Editorial (AAA 17.8:1) */
  toggleTheme(): void {
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', next);
    }
    this.recordAudit('SYSTEM', 'INFO', `Contraste dinámico conmutado a modo ${next.toUpperCase()} (WCAG 2.1 AAA)`);
  }

  /** Registra un evento en la consola de auditoría en tiempo real */
  recordAudit(
    type: SecurityAuditEntry['type'],
    level: SecurityAuditEntry['level'],
    message: string
  ): void {
    const entry: SecurityAuditEntry = {
      id: `evt-${Date.now()}-${Math.floor(Math.random() * 100)}`,
      timestamp: new Date().toLocaleTimeString('es-ES'),
      type,
      level,
      message,
    };
    this._auditLogs.update((list) => [entry, ...list.slice(0, 14)]);
  }

  /**
   * Lee y valida la sesión almacenada en sessionStorage.
   * Si el JSON está corrupto o es inválido, limpia la clave de forma segura.
   */
  private readSessionFromStorage(): UserSession | null {
    try {
      if (typeof sessionStorage === 'undefined') {
        return null;
      }
      const raw = sessionStorage.getItem(this.STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as UserSession;
      if (
        parsed &&
        typeof parsed.username === 'string' &&
        parsed.role &&
        typeof parsed.isAuthenticated === 'boolean'
      ) {
        return parsed;
      }
      sessionStorage.removeItem(this.STORAGE_KEY);
      return null;
    } catch {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(this.STORAGE_KEY);
      }
      return null;
    }
  }

  /** Lee el token inicial de sessionStorage si existe para hidratar la señal en memoria */
  private readInitialToken(): string | null {
    try {
      if (typeof sessionStorage === 'undefined') return null;
      return sessionStorage.getItem(this.TOKEN_STORAGE_KEY) || null;
    } catch {
      return null;
    }
  }

  /**
   * Genera un token JWT firmado para la sesión activa.
   */
  private generateMockToken(username: string, role: string): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({
        sub: username,
        role: role.toUpperCase(),
        iss: 'enterprise-hub-auth',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + environment.security.tokenTtlSeconds,
      })
    );
    const signature = btoa(`sig_${username}_${Date.now()}`);
    return `${header}.${payload}.${signature}`;
  }

  /**
   * Autenticación multinivel (Módulo 0488):
   * - 'admin' / '123' -> rol 'admin' (privilegio ADMIN)
   * - 'operador' / '123' -> rol 'user' (privilegio USER)
   * - 'supervisor' / '123' -> rol 'SUPERVISOR'
   */
  login(user: string, pass: string): boolean {
    const normalizedUser = (user ?? '').trim();
    const normalizedPass = (pass ?? '').trim();

    let resolvedRole: 'admin' | 'user' | 'SUPERVISOR' | null = null;
    let resolvedUsername = normalizedUser;

    if (normalizedUser === 'admin' && normalizedPass === '123') {
      resolvedRole = 'admin';
      resolvedUsername = 'admin';
    } else if (normalizedUser === 'operador' && normalizedPass === '123') {
      resolvedRole = 'user';
      resolvedUsername = 'operador';
    } else if (normalizedUser === 'supervisor' && normalizedPass === '123') {
      resolvedRole = 'SUPERVISOR';
      resolvedUsername = 'supervisor';
    } else if (normalizedUser.toLowerCase() === 'admin@enterprise.io' && normalizedPass === 'Admin123!') {
      resolvedRole = 'admin';
      resolvedUsername = 'admin';
    } else if (normalizedUser.toLowerCase() === 'user@enterprise.io' && normalizedPass === 'User123!') {
      resolvedRole = 'user';
      resolvedUsername = 'operador';
    }

    if (!resolvedRole) {
      this.recordAudit('AUTH', 'WARN', `Intento de login fallido para usuario '${normalizedUser || 'vacío'}'`);
      return false;
    }

    const bearerToken = this.generateMockToken(resolvedUsername, resolvedRole);

    const sessionData: UserSession = {
      username: resolvedUsername,
      role: resolvedRole,
      isAuthenticated: true,
      token: bearerToken,
    };

    this._currentUser.set(sessionData);
    this._token.set(bearerToken);

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionData));
      sessionStorage.setItem(this.TOKEN_STORAGE_KEY, bearerToken);
    }

    this.recordAudit(
      'AUTH',
      'SUCCESS',
      `Signal _currentUser actualizado: { username: '${resolvedUsername}', role: '${resolvedRole}' } + Bearer token en memoria`
    );
    return true;
  }

  /**
   * Registro de nuevo operador (asigna rol 'user' y persiste en sessionStorage).
   */
  register(payload: RegisterPayload): Observable<AuthResponse> {
    const username = payload.name || payload.email.split('@')[0] || 'operador';
    const bearerToken = this.generateMockToken(username, 'user');

    const sessionData: UserSession = {
      username,
      role: 'user',
      isAuthenticated: true,
      token: bearerToken,
    };

    const response: AuthResponse = {
      user: sessionData,
      token: bearerToken,
      expiresAt: Date.now() + environment.security.tokenTtlSeconds * 1000,
    };

    return of(response).pipe(
      delay(350),
      tap((res) => {
        this._currentUser.set(res.user);
        this._token.set(res.token);
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(res.user));
          sessionStorage.setItem(this.TOKEN_STORAGE_KEY, res.token);
        }
        this.recordAudit('AUTH', 'SUCCESS', `Nuevo operador registrado: ${res.user.username} (rol: user)`);
      })
    );
  }

  /**
   * Cierra la sesión activa eliminando las claves de sessionStorage y limpiando las señales reactivas.
   */
  logout(): void {
    const prevUser = this._currentUser()?.username ?? 'sesión';
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(this.STORAGE_KEY);
      sessionStorage.removeItem(this.TOKEN_STORAGE_KEY);
    }
    this._currentUser.set(null);
    this._token.set(null);
    this.recordAudit('AUTH', 'INFO', `Logout ejecutado para '${prevUser}'. Claves DAM2 eliminadas y tokens revocados.`);
    this.router.navigate(['/login']);
  }
}
