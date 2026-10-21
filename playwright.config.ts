import { defineConfig, devices } from '@playwright/test';

const PORT = 4331;

// The tests run against a real build of the site that uses fake certificates and
// goes into dist-test/, so the real dist/ and src/data/certificates.json are never touched.
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node tests/prepare-data.mjs && npx astro build && npx astro preview --port ${PORT} --ignore-lock`,
    url: `http://localhost:${PORT}/verify/`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { CERTIFICATES_FILE: 'test-results/certificates.json', ASTRO_OUT_DIR: './dist-test' },
  },
});
