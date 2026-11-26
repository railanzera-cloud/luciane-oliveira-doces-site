import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import axe from 'axe-core';

const phase = process.env.QA_REVIEW_PHASE;
const reference = phase === 'antes';
const output = fileURLToPath(new URL('../../outputs/qa-commerce/incremento-revisao/', import.meta.url));

test.beforeEach(async ({ page, context, baseURL }) => {
  await context.route('**/*', route => new URL(route.request().url()).origin === baseURL
    ? route.continue() : route.abort());
  await page.clock.setFixedTime(new Date('2026-11-25T15:00:00Z'));
  const availability = page.waitForResponse(res => res.url().includes('/rest/v1/menu_availability'));
  const response = await page.goto('/');
  expect(response?.headers()['x-luciane-preview']).toBe('synthetic-local');
  expect((await availability).ok()).toBe(true);
});

test('revisão comercial, acessibilidade e contrato do pedido', async ({ page }, testInfo) => {
  const folder = path.join(output, phase, testInfo.project.name);
  await mkdir(folder, { recursive: true });

  const capture = async (name, selector) => {
    const region = page.locator(selector);
    await region.evaluate(el => {
      const top = el.getBoundingClientRect().top + window.scrollY - 16;
      window.scrollTo({ top, behavior: 'instant' });
    });
    await page.evaluate(async () => {
      await document.fonts.ready;
      const images = [...document.images].filter(img => {
        const box = img.getBoundingClientRect();
        return box.width && box.height && box.bottom > 0 && box.top < innerHeight;
      });
      await Promise.race([
        Promise.all(images.map(img => img.decode().catch(() => {}))),
        new Promise(resolve => setTimeout(resolve, 1500)),
      ]);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    await page.screenshot({ path: path.join(folder, name + '.png'), animations: 'disabled' });
  };

  await page.getByRole('button', { name: 'Fatias Artesanais — Escolher fatia' }).click();
  const slice = page.locator('.slice-card').filter({ hasText: 'Ninho com Morango' });
  await expect(slice).toBeVisible();
  await capture('fatias', '#fatias');
  if (!reference) {
    await expect(page.getByRole('heading', { name: 'Escolha sua fatia', level: 2 })).toBeVisible();
    const overlap = await slice.evaluate(card => {
      const marker = card.querySelector('[role="radio"]').getBoundingClientRect();
      const name = card.querySelector('.boutique-slice-card-title strong');
      const range = document.createRange();
      range.selectNodeContents(name);
      return [...range.getClientRects()].some(text =>
        text.left < marker.right && text.right > marker.left
        && text.top < marker.bottom && text.bottom > marker.top);
    });
    expect(overlap).toBe(false);
  }
  await slice.click();
  await page.getByText('Com calda de Ninho', { exact: true }).click();
  await page.locator('#quantidade-fatias').getByRole('button', { name: 'Aumentar quantidade' }).press('Enter');
  await page.getByRole('button', { name: 'Adicionar 2 fatias ao pedido', exact: true }).click();

  const line = page.locator('.cart-item').filter({ hasText: 'Ninho com Morango' });
  await expect(line).toContainText(/R\$\s*44,00/);
  await capture('carrinho', '#carrinho');
  if (!reference) {
    await expect(line).toContainText('2 fatias');
    await expect(line).toContainText('380 g por fatia');
    await expect(line).toContainText('Com calda de Ninho');
    await expect(line).not.toContainText('1 fatia');
    await expect(page.getByRole('heading', { name: 'O que vai no pedido', level: 3 })).toBeVisible();
    await expect(line.getByRole('heading', { name: 'Ninho com Morango', level: 4 })).toBeVisible();
    const fee = page.locator('label[for="payment-credito"] .boutique-payment-fee');
    await expect(fee).toHaveText('Acréscimo de 3,05%');
  }

  await page.locator('label[for="receive-delivery"]').click();
  await page.locator('#neighborhood').fill('Juparanã');
  await page.locator('button[role="option"][id$="-juparana"]').click();
  await page.locator('#address').fill('Rua de Teste');
  await page.locator('#address-number').fill('123');
  await page.getByRole('textbox', { name: 'Nome do cliente' }).fill('Cliente QA');
  const credit = page.locator('label[for="payment-credito"]');
  const debit = page.locator('label[for="payment-debito"]');
  await capture('pagamento', '#pagamento');
  if (!reference) {
    await expect(credit).toContainText('3,05%');
    await expect(credit).toContainText(/R\$\s*1,64/);
    await expect(debit).toContainText('0,57%');
    await expect(debit).toContainText(/R\$\s*0,30/);
    await expect(page.locator('.step-number[aria-label]')).toHaveCount(0);
    for (const link of await page.locator('.footer-legal-links a').all()) {
      expect((await link.boundingBox()).height).toBeGreaterThanOrEqual(32);
    }
    await page.addScriptTag({ content: axe.source });
    const accessibility = await page.evaluate(async () => {
      const result = await window.axe.run(['#carrinho', '.footer-business'], {
        runOnly: ['aria-prohibited-attr', 'target-size'],
      });
      return {
        passed: result.passes.map(rule => rule.id),
        violations: result.violations.map(rule => ({ rule: rule.id, targets: rule.nodes.map(node => node.target) })),
      };
    });
    await writeFile(path.join(folder, 'acessibilidade.json'), JSON.stringify(accessibility, null, 2));
    expect(accessibility.violations).toEqual([]);
  }
  await credit.click();
  const summary = page.locator('.summary-card');
  const recap = summary.locator('.boutique-order-recap summary');
  await recap.click();
  const recapItem = summary.locator('.summary-item').filter({ hasText: 'Ninho com Morango' });
  await expect(summary.locator('.summary-total')).toContainText(/R\$\s*53,64/);
  if (!reference) {
    await expect(recapItem).toContainText('2 fatias');
    await expect(recapItem).toContainText('Com calda de Ninho');
    await expect(recapItem).not.toContainText('1 fatia');
  }
  await capture('resumo', '.summary-card');
  await capture('rodape', '.footer-business');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);

  const sent = page.waitForRequest(request => request.method() === 'POST'
    && new URL(request.url()).pathname === '/functions/v1/create-whatsapp-order');
  await summary.getByRole('button', { name: 'Abrir WhatsApp para enviar pedido' }).press('Enter');
  const payload = (await sent).postDataJSON();
  expect(payload.client_order_id).toBeTruthy();
  expect(payload.request_key).toBeTruthy();
  expect(payload.items).toEqual([{
    product_id: 'fatia-ninho-morango', variant_id: 'fatia', option_ids: ['calda-ninho'], quantity: 2,
  }]);
  expect(payload.fulfillment).toMatchObject({ type: 'delivery', locality_id: 'juparana', street: 'Rua de Teste', number: '123' });
  expect(payload.payment).toEqual({ method: 'card_on_delivery', card_mode: 'credit_single' });
  expect(payload.expected_total).toBe('53.64');
  delete payload.client_order_id;
  delete payload.request_key;
  await writeFile(path.join(folder, 'pedido.json'), JSON.stringify(payload, null, 2));
  await expect(page.locator('#checkout-status')).toContainText('Tente novamente');
});

test('hierarquia das categorias e demais escolhas de calda', async ({ page }) => {
  test.skip(reference, 'Verifica a semântica e a apresentação da versão candidata.');
  await page.getByRole('button', { name: 'Edição especial de Natal: conhecer as fatias recheadas de Chocottone' }).click();
  await expect(page.getByRole('heading', { name: 'Escolha suas fatias.', level: 2 })).toBeVisible();
  await expect(page.locator('.natal-product-card').first().getByRole('heading', { level: 3 })).toBeVisible();
  await page.getByRole('link', { name: 'Voltar às categorias', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Pipocas Trufadas — Ver sabores' }).click();
  await expect(page.getByRole('heading', { name: 'Escolha seu sabor', level: 2, exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Voltar às categorias', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Fatias Artesanais — Escolher fatia' }).click();
  for (const sauce of ['Com calda de chocolate', 'Sem calda, por favor']) {
    await page.locator('.slice-card').filter({ hasText: 'Ninho com Morango' }).click();
    await expect(page.getByRole('heading', { name: 'Escolha sua calda', level: 2 })).toBeVisible();
    await page.getByRole('radio', { name: sauce }).press('Space');
    await page.getByRole('button', { name: 'Adicionar 1 fatia ao pedido', exact: true }).press('Enter');
    await expect(page.locator('.cart-item').filter({ hasText: sauce })).toContainText('1 fatia');
  }
  await page.locator('.boutique-order-recap summary').press('Enter');
  await expect(page.locator('.boutique-recap-items')).toContainText('Com calda de chocolate');
  await expect(page.locator('.boutique-recap-items')).toContainText('Sem calda, por favor');
});
