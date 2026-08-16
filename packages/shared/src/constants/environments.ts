export const ENVIRONMENTS = {
  DEVELOPMENT: "development",
  STAGING: "staging",
  PRODUCTION: "production",
  TEST: "test",
} as const;

export type Environment = (typeof ENVIRONMENTS)[keyof typeof ENVIRONMENTS];

export function isDevelopment(env: string): boolean {
  return env === ENVIRONMENTS.DEVELOPMENT;
}

export function isProduction(env: string): boolean {
  return env === ENVIRONMENTS.PRODUCTION;
}

export function isTest(env: string): boolean {
  return env === ENVIRONMENTS.TEST;
}
