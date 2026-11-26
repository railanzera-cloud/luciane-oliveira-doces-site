import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { origin, startPreview } from './preview.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const tools = fileURLToPath(new URL('.', import.meta.url));
const output = path.join(root, 'outputs/qa-commerce');

function runNode(script, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: root, stdio: 'inherit', ...options,
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(path.basename(script) + ' terminou com ' + (signal || code)));
    });
  });
}

const action = process.argv[2];
const preview = await startPreview();
try {
  if (action === 'qa') {
    for (const script of ['qa-delivery-webkit.mjs', 'qa-checkout-clarity-webkit-20261116.mjs']) {
      await runNode(path.join(root, 'scripts', script), [], {
        env: {
          ...process.env,
          QA_PACKAGE: path.join(tools, 'package.json'),
          QA_OUTPUT: path.join(output, path.basename(script, '.mjs')),
        },
      });
    }
  } else if (action === 'baseline' || action === 'compare') {
    await runNode(path.join(tools, 'node_modules/@playwright/test/cli.js'), [
      'test', '--config', path.join(tools, 'playwright.config.mjs'),
      '--update-snapshots=' + (action === 'baseline' ? 'all' : 'none'),
    ]);
  } else if (action === 'review' || action === 'review-before') {
    const phase = action === 'review' ? 'depois' : 'antes';
    await runNode(path.join(tools, 'node_modules/@playwright/test/cli.js'), [
      'test', '--config', path.join(tools, 'playwright.config.mjs'),
    ], { env: { ...process.env, QA_REVIEW_PHASE: phase } });
  } else if (action === 'lighthouse') {
    const reports = path.join(output, 'lighthouse');
    await mkdir(reports, { recursive: true });
    for (const [slug, route] of [['vitrine', '/'], ['fatias', '/?categoria=fatias']]) {
      await runNode(path.join(tools, 'node_modules/lighthouse/cli/index.js'), [
        origin + route,
        '--quiet', '--only-categories=performance,accessibility,best-practices,seo',
        '--output=html', '--output=json', '--output-path=' + path.join(reports, slug),
        '--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage',
      ], { env: { ...process.env, CHROME_PATH: chromium.executablePath() } });
    }
  } else {
    throw new Error('Comando de QA desconhecido.');
  }
} finally {
  preview.close();
}
