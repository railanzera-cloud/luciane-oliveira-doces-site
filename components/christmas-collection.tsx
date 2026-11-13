"use client";

import { Minus, Plus, ShoppingBag } from "lucide-react";
import { CHOCOTONES, type Product } from "@/app/catalog";
import { CHOCOTONE_ITEM_KEYS, isItemAvailable, isItemVisible, type AvailabilitySnapshot } from "@/app/menu-availability";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type Props = {
  availability: AvailabilitySnapshot;
  quantities: Record<string, number>;
  onAdjust: (product: Product, delta: -1 | 1) => void;
  onCheckout: () => void;
};

export function ChristmasCollection({ availability, quantities, onAdjust, onCheckout }: Props) {
  const visible = CHOCOTONES.filter(p => isItemVisible(availability, CHOCOTONE_ITEM_KEYS[p.id]));
  const canQuote = availability.source === "supabase" && availability.ordersOpen;
  const selectedCount = CHOCOTONES.reduce((sum,p) => sum + (quantities[p.id] ?? 0), 0);
  return (
    <div className="natal-collection">
      <div className="natal-collection-intro">
        <span className="natal-collection-eyebrow">✦ Coleção especial · Natal 2026</span>
        <h3>Escolha suas fatias.</h3>
        <p>Combine seus favoritos e escolha quantas fatias quiser de cada sabor.</p>
      </div>
      <div className="natal-product-grid" id="natal-sabores" role="group" aria-label="Escolha as fatias de Chocottone da coleção de Natal">
        {visible.map(product => {
          const count = quantities[product.id] ?? 0;
          const available = canQuote && product.available && product.variants[0]?.available && isItemAvailable(availability, CHOCOTONE_ITEM_KEYS[product.id]);
          const isSoldOut = !isItemAvailable(availability, CHOCOTONE_ITEM_KEYS[product.id]);
          const full = count >= 99;
          const morango = product.id === "chocotone-morango-brigadeiro-branco-chocolate";
          return (
            <article className="natal-product-card" data-selected={count > 0 || undefined} data-unavailable={isSoldOut || undefined} key={product.id}>
              <button type="button" className="natal-product-photo"
                aria-label={`Adicionar uma fatia de Chocottone ${product.name} ao pedido`}
                onClick={() => onAdjust(product, 1)} disabled={!available || full}>
                <img src={product.cardImage ?? product.image} alt="" loading="lazy"
                  decoding="async" width="840" height="910" draggable={false} />
                {isSoldOut && <span className="natal-sold-out">Esgotado</span>}
              </button>
              <div className="natal-product-info">
                <div className="natal-product-heading">
                  <h4>{morango ? "Morango com Chocolate" : product.name}</h4>
                  <span className="natal-product-base">Chocottone Bauducco</span>
                  {morango && <span className="natal-product-note">Brigadeiro branco</span>}
                </div>
                <div className="natal-product-price-row">
                  <strong className="natal-product-price">{money.format(product.variants[0].price)}</strong>
                  <span className="natal-product-unit">por fatia</span>
                </div>
                <div className="natal-product-control">
                  {count === 0 ? (
                    <button type="button" className="natal-product-add"
                      aria-label={`Adicionar uma fatia de Chocottone ${product.name} por ${money.format(product.variants[0].price)}`}
                      onClick={() => onAdjust(product, 1)} disabled={!available}>
                      <Plus size={18} aria-hidden="true" /> {isSoldOut ? "Esgotado" : "Adicionar"}
                    </button>
                  ) : (
                    <div className="natal-quantity-control" role="group" aria-label={`Quantidade de fatias de Chocottone ${product.name} no pedido`}>
                      <button type="button" onClick={() => onAdjust(product, -1)} aria-label={`Diminuir ou remover uma fatia de ${product.name}`}><Minus size={17} aria-hidden="true" /></button>
                      <span aria-live="polite" aria-atomic="true">{count}</span>
                      <button type="button" onClick={() => onAdjust(product, 1)} aria-label={`Adicionar mais uma fatia de ${product.name}`} disabled={!available || full}><Plus size={17} aria-hidden="true" /></button>
                    </div>
                  )}
                </div>
                <span className="natal-in-cart" aria-live="polite" aria-atomic="true">{count > 0 ? `${count} ${count === 1 ? "fatia selecionada" : "fatias selecionadas"}` : "\u00a0"}</span>
              </div>
            </article>
          );
        })}
      </div>
      {visible.length === 0 && <p className="natal-none" role="status">Os sabores da coleção ainda não foram liberados. Consulte novamente em breve.</p>}
      {selectedCount > 0 && (
        <button type="button" className="natal-continue" onClick={onCheckout}>
          <ShoppingBag size={18} aria-hidden="true" />
          <span>Continuar pedido · {selectedCount} {selectedCount === 1 ? "fatia" : "fatias"}</span>
          <span aria-hidden="true">›</span>
        </button>
      )}
    </div>
  );
}
