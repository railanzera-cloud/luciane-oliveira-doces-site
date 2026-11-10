"use client";

import { Check, ChevronDown, CupSoda, Plus } from "lucide-react";
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

/** Oferta opcional: sem modal, carrossel, seleção padrão ou avanço obrigatório. */
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
        return <article className="refreshment-card" data-selected={quantity > 0 || undefined} key={drink.id}>
          <div className="refreshment-product">
            <span className="refreshment-image"><img src={drink.image} alt={drink.imageAlt} width="96" height="96" loading="lazy" decoding="async" draggable={false}/></span>
            <div className="refreshment-copy"><h4>{drink.name}</h4><span>{variant.label}</span><strong>{money.format(variant.price)}</strong></div>
          </div>
          <button type="button" className="refreshment-add" disabled={disabled}
            onClick={() => onAdd(drink)} aria-label={`Adicionar ${drink.name}, ${variant.label}, ${money.format(variant.price)}${quantity ? `, ${quantity} no pedido` : ""}`}>
            {soldOut ? "Esgotado" : !availability.ordersOpen ? "Pedidos pausados" : quantity >= 99 ? "Limite atingido" : <><Plus size={14} aria-hidden="true"/> Adicionar</>}
          </button>
          <span className="refreshment-count" aria-hidden="true">{quantity > 0 ? <><Check size={12}/> {quantity} no pedido</> : ""}</span>
        </article>;
      })}
    </div>
    <p className="refreshment-feedback" role="status" aria-live="polite" aria-atomic="true">{message || ""}</p>
  </>;
  return compact ? <details className="refreshment-later" id="acompanhamentos">
    <summary><span><CupSoda size={18} aria-hidden="true"/> Adicionar refrigerante</span><ChevronDown size={16} aria-hidden="true"/></summary>
    {content}
  </details> : <section className="refreshment-offer" id="acompanhamentos" aria-labelledby="refreshment-title">
    <div className="refreshment-heading"><span className="refreshment-icon"><CupSoda size={19} aria-hidden="true"/></span><div><h3 id="refreshment-title">Um refrigerante para acompanhar?</h3><p>Se quiser, adicione por aqui.</p></div></div>
    {content}
  </section>;
}
