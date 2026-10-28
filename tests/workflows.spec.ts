// The deploy workflows are read as plain text (no YAML parser needed). The merge workflow has
// two independent jobs: the live deploy (never entries-open) and a fixed entries-open preview.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const merge = readFileSync('.github/workflows/firebase-hosting-merge.yml', 'utf8');

// A job is the text from its two-space-indented key to the next job key (or the end).
function job(name: string): string {
  const match = merge.match(new RegExp(`^  ${name}:\\n([\\s\\S]*?)(?=^  [A-Za-z_][\\w-]*:\\n|(?![\\s\\S]))`, 'm'));
  expect(match, `job ${name} exists`).not.toBeNull();
  return match![0];
}

test('merge workflow: the live job deploys to live and never sets PUBLIC_PREVIEW_REGISTRATION_OPEN', () => {
  const live = job('build_and_deploy');
  expect(live).toMatch(/channelId:\s*live\b/);
  expect(live).not.toContain('PUBLIC_PREVIEW_REGISTRATION_OPEN');
  expect(live).not.toMatch(/channelId:\s*entries-open/);
});

test('merge workflow: the entries-open job is independent, builds with the variable and deploys to entries-open', () => {
  const open = job('build_and_deploy_entries_open');
  expect(open).toMatch(/channelId:\s*entries-open\s*$/m);
  expect(open).toMatch(/PUBLIC_PREVIEW_REGISTRATION_OPEN:\s*'true'/);
  expect(open).toMatch(/expires:\s*30d/);
  expect(open).toMatch(/group:\s*entries-open-preview/);
  expect(open).toMatch(/cancel-in-progress:\s*true/);
  expect(open).not.toMatch(/^\s*needs:/m);
  expect(open).not.toMatch(/^\s*repoToken:/m);
  expect(open).not.toMatch(/channelId:\s*live\b/);
});

test('merge workflow: only the entries-open job sets the variable, and the live deploy does not depend on it', () => {
  expect(merge.match(/PUBLIC_PREVIEW_REGISTRATION_OPEN/g)).toHaveLength(1);
  expect(merge).not.toMatch(/^\s*needs:/m);
});
