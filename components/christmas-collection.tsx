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
    <div className="natal-collection" id="natal-sabores">
      <div className="natal-collection-intro">
        <span className="natal-collection-eyebrow">✦ Coleção de Natal 2026 · Edição especial</span>
        <h3>Quatro sabores para celebrar.</h3>
        <p>Porções individuais de chocotone recheado, preparadas com carinho. Escolha um ou combine diferentes sabores no mesmo pedido.</p>
      </div>
      <div className="natal-product-grid" role="group" aria-label="Escolha os chocotones da coleção de Natal">
        {visible.map(product => {
          const count = quantities[product.id] ?? 0;
          const available = canQuote && product.available && product.variants[0]?.available && isItemAvailable(availability, CHOCOTONE_ITEM_KEYS[product.id]);
          const isSoldOut = !isItemAvailable(availability, CHOCOTONE_ITEM_KEYS[product.id]);
          const full = count >= 99;
          return (
            <article className="natal-product-card" data-selected={count > 0 || undefined} data-unavailable={isSoldOut || undefined} key={product.id}>
              <div className="natal-product-photo">
                <img src={product.cardImage ?? product.image} alt={product.imageAlt}
                  loading="lazy" decoding="async" width="320" height="427" draggable={false} />
                {isSoldOut && <span className="natal-sold-out">Esgotado</span>}
              </div>
              <div className="natal-product-info">
                <span className="natal-product-overline">Porção individual</span>
                <h4>{product.name}</h4>
                <strong className="natal-product-price">{money.format(product.variants[0].price)}</strong>
                <div className="natal-product-control">
                  {count === 0 ? (
                    <button type="button" className="natal-product-add"
                      aria-label={`Adicionar ${product.name} por ${money.format(product.variants[0].price)}`}
                      onClick={() => onAdjust(product, 1)} disabled={!available}>
                      <Plus size={18} aria-hidden="true" /> {isSoldOut ? "Esgotado" : "Adicionar"}
                    </button>
                  ) : (
                    <div className="natal-quantity-control" role="group" aria-label={`Quantidade de ${product.name} no pedido`}>
                      <button type="button" onClick={() => onAdjust(product, -1)} aria-label={`Diminuir ou remover ${product.name}`}><Minus size={17} aria-hidden="true" /></button>
                      <span aria-live="polite" aria-atomic="true">{count}</span>
                      <button type="button" onClick={() => onAdjust(product, 1)} aria-label={`Adicionar mais um ${product.name}`} disabled={!available || full}><Plus size={17} aria-hidden="true" /></button>
                    </div>
                  )}
                </div>
                {count > 0 && <span className="natal-in-cart" role="status">{count} {count === 1 ? "porção no pedido" : "porções no pedido"}</span>}
              </div>
            </article>
          );
        })}
      </div>
      {visible.length === 0 && <p className="natal-none" role="status">Os sabores da coleção ainda não foram liberados. Consulte novamente em breve.</p>}
      {selectedCount > 0 && (
        <button type="button" className="natal-continue" onClick={onCheckout}>
          <ShoppingBag size={18} aria-hidden="true" />
          <span>Ver meu pedido · {selectedCount} {selectedCount === 1 ? "porção" : "porções"}</span>
          <span aria-hidden="true">›</span>
        </button>
      )}
    </div>
  );
}
