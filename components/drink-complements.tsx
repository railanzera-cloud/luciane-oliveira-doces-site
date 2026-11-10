"use client";

import { ChevronDown, CupSoda, Plus } from "lucide-react";
import { DRINKS, type Product } from "@/app/catalog";
import { drinkStatus, type AvailabilitySnapshot } from "@/app/menu-availability";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type Props = {
  availability: AvailabilitySnapshot;
  cart: Array<{ productId: string; quantity: number }>;
  onAdd: (product: Product) => void;
  message: string;
  compact?: boolean;
  busy?: boolean;
};

/**
 * Bebidas são um complemento rápido aos doces, não uma segunda vitrine.
 * Os quatro produtos permanecem reconhecíveis, com área de toque de 44px,
 * sem linha de quantidade ou mensagem visual que empurre a próxima etapa.
 */
export function DrinkComplements({ availability, cart, onAdd, message, compact, busy }: Props) {
  const visible = DRINKS.filter(drink => drinkStatus(availability, drink.id) !== "hidden");
  if (visible.length === 0) return null;

  const content = <>
    <div className="refreshment-grid" role="group" aria-label="Refrigerantes para acompanhar">
      {visible.map(drink => {
        const variant = drink.variants[0];
        const quantity = cart.filter(item => item.productId === drink.id).reduce((sum, item) => sum + item.quantity, 0);
        const soldOut = drinkStatus(availability, drink.id) !== "available";
        const disabled = busy || soldOut || !availability.ordersOpen || quantity >= 99;
        const actionLabel = soldOut ? `${drink.name}, ${variant.label}, esgotado`
          : !availability.ordersOpen ? "Pedidos pausados"
          : quantity >= 99 ? "Limite de 99 unidades atingido"
          : `Adicionar ${drink.name}, ${variant.label}, ${money.format(variant.price)}${quantity ? `, ${quantity} no pedido` : ""}`;
        return <article className="refreshment-card" data-drink-id={drink.id}
          data-selected={quantity > 0 || undefined} data-unavailable={soldOut || undefined} key={drink.id}>
          <div className="refreshment-product">
            <span className="refreshment-image">
              <img src={drink.image} alt={drink.imageAlt} width="96" height="96" loading="lazy" decoding="async" draggable={false}/>
              {quantity > 0 && <span className="refreshment-count" aria-hidden="true">{quantity}</span>}
            </span>
            <div className="refreshment-copy">
              <h4>{drink.name}</h4>
              <span>{variant.label}</span>
            </div>
          </div>
          <div className="refreshment-action-row">
            <strong className="refreshment-price">{money.format(variant.price)}</strong>
            <button type="button" className="refreshment-add" disabled={disabled}
              onClick={() => onAdd(drink)} aria-label={actionLabel} title={actionLabel}>
              {soldOut ? <span>Esgotado</span> : quantity >= 99 ? <span>Limite</span> : <Plus size={20} strokeWidth={2} aria-hidden="true"/>}
            </button>
          </div>
        </article>;
      })}
    </div>
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{message}</p>
  </>;

  return compact ? <details className="refreshment-later" id="acompanhamentos">
    <summary><span><CupSoda size={18} aria-hidden="true"/> Adicionar refrigerante</span><ChevronDown size={16} aria-hidden="true"/></summary>
    {content}
  </details> : <section className="refreshment-offer" id="acompanhamentos" aria-labelledby="refreshment-title">
    <div className="refreshment-heading">
      <span className="refreshment-icon"><CupSoda size={19} aria-hidden="true"/></span>
      <div><h3 id="refreshment-title">Uma bebida para acompanhar?</h3><p>Opcional. Adicione com um toque.</p></div>
    </div>
    {content}
  </section>;
}
