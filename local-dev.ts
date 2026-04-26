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
