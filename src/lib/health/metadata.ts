export type BuildInfo = {
  commit: string | null;
  deploymentId: string | null;
  environment: string;
};

export const getBuildInfo = (): BuildInfo => ({
  commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? null,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
});
