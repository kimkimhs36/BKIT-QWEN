/** Publish only deployment identity. Never serialize environment configuration. */
export function buildMetadata(env: Record<string, string | undefined>) {
  const commit = env.VERCEL_GIT_COMMIT_SHA || env.BKIT_SOURCE_COMMIT;
  const branch = env.VERCEL_GIT_COMMIT_REF || env.BKIT_SOURCE_BRANCH;
  return {
    schemaVersion: 1,
    product: 'BKIT STUDY OS',
    sourceCommit: commit && /^[a-f0-9]{40}$/i.test(commit) ? commit.toLowerCase() : null,
    sourceBranch: branch && branch.length <= 200 && !/[\x00-\x1f\x7f]/.test(branch) ? branch : null,
    environment: ['preview', 'production', 'development'].includes(env.VERCEL_ENV || '')
      ? env.VERCEL_ENV
      : 'local',
    verification: 'build-identity-only',
  };
}
