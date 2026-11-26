import { spawn } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
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
const distributionReview = action === 'review-distribution';
const preview = await startPreview(undefined, distributionReview ? 'pages' : undefined);
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
  } else if (['review', 'review-before', 'review-performance', 'review-distribution'].includes(action)) {
    const phase = action === 'review-before' ? 'antes' : 'depois';
    await runNode(path.join(tools, 'node_modules/@playwright/test/cli.js'), [
      'test', '--config', path.join(tools, 'playwright.config.mjs'),
    ], { env: {
      ...process.env, QA_REVIEW_PHASE: phase,
      QA_PERFORMANCE_REVIEW: action === 'review-performance' || distributionReview ? '1' : '0',
      QA_DISTRIBUTION_REVIEW: distributionReview ? '1' : '0',
    } });
  } else if (['lighthouse', 'performance-before', 'performance'].includes(action)) {
    const phase = action === 'lighthouse' ? null : action === 'performance-before' ? 'antes' : 'depois';
    const reports = phase ? path.join(output, 'incremento-desempenho', phase) : path.join(output, 'lighthouse');
    const routes = [['vitrine', '/'], ['fatias', '/?categoria=fatias']];
    await mkdir(reports, { recursive: true });
    for (let run = 1; run <= (phase ? 3 : 1); run++) {
      for (const [slug, route] of routes) {
        const name = phase ? `${slug}-${run}` : slug;
        await runNode(path.join(tools, 'node_modules/lighthouse/cli/index.js'), [
          origin + route,
          '--quiet', '--only-categories=performance,accessibility,best-practices,seo',
          '--output=html', '--output=json', '--output-path=' + path.join(reports, name),
          '--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage',
        ], { env: { ...process.env, CHROME_PATH: chromium.executablePath() } });
        console.log(`Lighthouse ${name} concluído`);
      }
    }
    if (phase) await runNode(path.join(tools, 'mobile-performance.mjs'), [reports]);
    const comparisonRoot = path.dirname(reports);
    if (phase === 'depois' && await access(path.join(comparisonRoot, 'antes', 'rede-movel.json')).then(() => true, () => false)) {
      await runNode(path.join(tools, 'performance-summary.mjs'), [comparisonRoot]);
    }
  } else {
    throw new Error('Comando de QA desconhecido.');
  }
} finally {
  preview.close();
}
