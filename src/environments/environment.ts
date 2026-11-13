/**
 * @file environment.ts
 * @description Configuración tipada de entorno de desarrollo local (RA 7 - Distribución y Despliegue).
 * En compilación de producción (`ng build --configuration production`), Angular CLI reemplaza
 * automáticamente este archivo por `environment.prod.ts` mediante `fileReplacements` en `angular.json`.
 */

export interface AppEnvironment {
  readonly production: boolean;
  readonly appVersion: string;
  readonly apiBaseUrl: string;
  readonly supabaseConfig: {
    readonly url: string;
    readonly anonKeyEnvVar: string;
    readonly schema: string;
  };
  readonly firebaseConfig: {
    readonly projectId: string;
    readonly telemetryCollection: string;
  };
  readonly security: {
    readonly sessionStorageKey: string;
    readonly tokenStorageKey: string;
    readonly tokenTtlSeconds: number;
    readonly strictCsp: boolean;
    readonly enableCanMatchPerimeter: boolean;
  };
}

export const environment: AppEnvironment = {
  production: false,
  appVersion: '1.5.0-dev',
  apiBaseUrl: '/assets/data',
  supabaseConfig: {
    url: 'https://db.enterprise-hub.internal.supabase.co',
    anonKeyEnvVar: 'NG_APP_SUPABASE_ANON_KEY',
    schema: 'public',
  },
  firebaseConfig: {
    projectId: 'enterprise-hub-noc-telemetry',
    telemetryCollection: 'sre_cluster_metrics',
  },
  security: {
    sessionStorageKey: 'DAM2_AUTH_SESSION',
    tokenStorageKey: 'DAM2_BEARER_TOKEN',
    tokenTtlSeconds: 28800,
    strictCsp: false,
    enableCanMatchPerimeter: true,
  },
};
