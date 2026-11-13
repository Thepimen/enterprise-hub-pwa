/**
 * @file environment.prod.ts
 * @description Configuración tipada de entorno de Producción (RA 7 — Distribución y Despliegue Continuo).
 * En compilación de producción (`ng build --configuration production`), Angular CLI reemplaza
 * automáticamente `environment.ts` por este archivo mediante `fileReplacements` en `angular.json`.
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
  production: true,
  appVersion: '1.5.0',
  apiBaseUrl: 'https://enterprise-hub-di-mauve.vercel.app/assets/data',
  supabaseConfig: {
    url: 'https://enterprise-hub-prod.supabase.co',
    anonKeyEnvVar: 'NG_APP_SUPABASE_ANON_KEY',
    schema: 'public',
  },
  firebaseConfig: {
    projectId: 'enterprise-hub-noc-telemetry-prod',
    telemetryCollection: 'sre_cluster_metrics',
  },
  security: {
    sessionStorageKey: 'DAM2_AUTH_SESSION',
    tokenStorageKey: 'DAM2_BEARER_TOKEN',
    tokenTtlSeconds: 28800,
    strictCsp: true,
    enableCanMatchPerimeter: true,
  },
};
