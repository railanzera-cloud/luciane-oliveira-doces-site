/**
 * Preserve catalog order within each group, without mutating the catalog.
 * Visibility and purchasing eligibility remain the caller's existing rules.
 * @template T
 * @param {readonly T[]} products
 * @param {(product: T) => boolean} isAvailable
 * @returns {T[]}
 */
export function orderAvailableProductsFirst(products, isAvailable) {
  return [...products].sort((first, second) => Number(isAvailable(second)) - Number(isAvailable(first)));
}
