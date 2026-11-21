import test from 'node:test';
import assert from 'node:assert/strict';
import { orderAvailableProductsFirst } from '../lib/storefront-merchandising.mjs';

test('the sole sellable cone precedes sold-out flavors while catalog identities and relative order remain intact', () => {
  const catalog = Object.freeze(['prestigio', 'folheado', 'ferrero', 'kinder', 'ninho', 'chocottone'].map(id => Object.freeze({ id })));
  const sorted = orderAvailableProductsFirst(catalog, product => product.id === 'ferrero');
  assert.deepEqual(sorted.map(product => product.id), ['ferrero', 'prestigio', 'folheado', 'kinder', 'ninho', 'chocottone']);
  assert.equal(catalog[0].id, 'prestigio');
  assert.ok(sorted.every(product => catalog.includes(product)));
});

test('an entirely unavailable or entirely available category retains its established order', () => {
  const products = Object.freeze([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
  assert.deepEqual(orderAvailableProductsFirst(products, () => false), products);
  assert.deepEqual(orderAvailableProductsFirst(products, () => true), products);
  assert.deepEqual(orderAvailableProductsFirst([], () => false), []);
});
