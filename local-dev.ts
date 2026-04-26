export const LOCAL_EDITOR_HOST = 'localhost';
export const LOCAL_SERVER_HOST = 'localhost';
export const LOCAL_EDITOR_PORT = 3000;
export const LOCAL_SERVER_PORT = 4000;

export const LOCAL_EDITOR_ORIGIN = buildHttpOrigin(LOCAL_EDITOR_HOST, LOCAL_EDITOR_PORT);
export const LOCAL_SERVER_ORIGIN = buildHttpOrigin(LOCAL_SERVER_HOST, LOCAL_SERVER_PORT);

export const LOCAL_CORS_ORIGINS = [
  LOCAL_EDITOR_ORIGIN,
  buildHttpOrigin('127.0.0.1', LOCAL_EDITOR_PORT),
  LOCAL_SERVER_ORIGIN,
  buildHttpOrigin('127.0.0.1', LOCAL_SERVER_PORT),
  'null',
];

type Env = Record<string, string | undefined>;

export function buildHttpOrigin(host: string, port: number): string {
  return `http://${host}:${port}`;
}

export function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolveLocalServerHost(env: Env): string {
  return env.PROOF_SERVER_HOST?.trim() || LOCAL_SERVER_HOST;
}

export function resolveLocalServerListenHost(env: Env): string | undefined {
  return env.PROOF_SERVER_HOST?.trim() || undefined;
}

export function resolveLocalServerPort(env: Env): number {
  return parsePositiveInt(env.PROOF_SERVER_PORT || env.PORT, LOCAL_SERVER_PORT);
}

export function resolveLocalServerOrigin(env: Env): string {
  const configuredHost = resolveLocalServerHost(env);
  const host = configuredHost === '0.0.0.0' || configuredHost === '::'
    ? LOCAL_SERVER_HOST
    : configuredHost;
  return buildHttpOrigin(host, resolveLocalServerPort(env));
}

function readNonEmptyString(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

function isEnabled(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase() ?? '';
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function isProductionRuntime(env: Env): boolean {
  const normalized = (readNonEmptyString(env.PROOF_ENV) ?? readNonEmptyString(env.NODE_ENV) ?? '')
    .toLowerCase();
  return normalized === 'production' || normalized === 'prod';
}

export function resolveLocalEditorOrigin(env: Env): string {
  return (readNonEmptyString(env.PROOF_EDITOR_ORIGIN)
    ?? readNonEmptyString(env.VITE_PROOF_EDITOR_ORIGIN)
    ?? LOCAL_EDITOR_ORIGIN).replace(/\/+$/, '');
}

export function isLocalDevEditorEnabled(env: Env): boolean {
  return isEnabled(env.PROOF_DEV_EDITOR) && !isProductionRuntime(env);
}

export function buildLocalEditorUrl(pathAndQuery: string, env: Env): string {
  const path = pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`;
  return `${resolveLocalEditorOrigin(env)}${path}`;
}
