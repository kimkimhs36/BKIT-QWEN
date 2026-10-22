import { expect, it } from 'vitest';
import { buildMetadata } from '../buildMetadata';
it('publishes only valid source identity and never configuration or secrets', () => {
  const metadata = buildMetadata({
    VERCEL_GIT_COMMIT_SHA: 'A'.repeat(40),
    VERCEL_GIT_COMMIT_REF: 'feat/student-study',
    VERCEL_ENV: 'preview',
    AI_API_KEY: 'private-model-key',
    BKIT_OWNER_EMAIL: 'private@example.test',
  });
  expect(metadata).toEqual({
    schemaVersion: 1,
    product: 'BKIT STUDY OS',
    sourceCommit: 'a'.repeat(40),
    sourceBranch: 'feat/student-study',
    environment: 'preview',
    verification: 'build-identity-only',
  });
  expect(JSON.stringify(metadata)).not.toContain('private');
});
it('marks an unidentified local build honestly instead of inventing a commit', () => {
  expect(buildMetadata({})).toMatchObject({
    sourceCommit: null,
    sourceBranch: null,
    environment: 'local',
  });
  expect(
    buildMetadata({
      VERCEL_GIT_COMMIT_SHA: 'not-a-sha',
      VERCEL_GIT_COMMIT_REF: 'bad\nbranch',
      VERCEL_ENV: 'unknown',
    }),
  ).toMatchObject({ sourceCommit: null, sourceBranch: null, environment: 'local' });
});
it('accepts explicit CI source metadata without treating it as a production deployment', () => {
  expect(
    buildMetadata({ BKIT_SOURCE_COMMIT: 'b'.repeat(40), BKIT_SOURCE_BRANCH: 'test/preview' }),
  ).toMatchObject({
    sourceCommit: 'b'.repeat(40),
    sourceBranch: 'test/preview',
    environment: 'local',
  });
});
