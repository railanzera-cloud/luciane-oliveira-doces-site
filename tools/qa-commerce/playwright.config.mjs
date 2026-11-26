import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const sizes = [[320, 568], [375, 667], [390, 844], [430, 932]];
const mobileDevices = { chromium: devices['Pixel 7'], webkit: devices['iPhone 13'] };
const reviewPhase = process.env.QA_REVIEW_PHASE;
const output = fileURLToPath(new URL(reviewPhase
  ? '../../outputs/qa-commerce/incremento-revisao/' + reviewPhase + '/'
  : '../../outputs/qa-commerce/visual/', import.meta.url));

export default defineConfig({
  testDir: '.',
  testMatch: reviewPhase ? 'commercial-review.spec.mjs' : 'visual.spec.mjs',
  outputDir: path.join(output, 'results'),
  snapshotPathTemplate: path.join(output, 'baseline/{projectName}/{arg}{ext}'),
  timeout: 75_000,
  expect: { timeout: 25_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: path.join(output, 'report') }],
  ],
  workers: 2,
  use: {
    baseURL: 'http://127.0.0.1:8181',
    deviceScaleFactor: 1,
    locale: 'pt-BR',
    timezoneId: 'America/Belem',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: Object.entries(mobileDevices).flatMap(([browserName, device]) =>
    sizes.map(([width, height]) => ({
      name: browserName + '-' + width,
      use: { browserName, userAgent: device.userAgent, viewport: { width, height }, isMobile: true, hasTouch: true },
    }))),
});
