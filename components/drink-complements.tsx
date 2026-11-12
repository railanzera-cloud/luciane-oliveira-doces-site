"use client";

import { ChevronDown, CupSoda, Minus, Plus } from "lucide-react";
import { DRINKS, type Product } from "@/app/catalog";
import { drinkStatus, type AvailabilitySnapshot } from "@/app/menu-availability";

const money = new Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL" });

type Props = {
  availability: AvailabilitySnapshot;
  cart: Array<{ productId:string; quantity:number }>;
  onChange: (product:Product, delta:-1|1) => void;
  message: string;
  busy?: boolean;
};

/** Oferta opcional, recolhida por padrão. Não participa da rolagem automática. */
export function DrinkComplements({ availability, cart, onChange, message, busy = false }:Props) {
  // Bebida escondida nunca vira oferta; item esgotado pode aparecer apenas como indisponível.
  const visible = DRINKS.filter(drink => drinkStatus(availability, drink.id) !== "hidden");
  if (!visible.length || !availability.ordersOpen) return null;

  const selected = cart.filter(item => DRINKS.some(drink => drink.id === item.productId));
  const count = selected.reduce((sum,item) => sum + item.quantity, 0);
  const selectedTotal = selected.reduce((sum,item) => {
    const drink = DRINKS.find(product => product.id === item.productId);
    return sum + item.quantity * (drink?.variants[0].price ?? 0);
  }, 0);
  const startingPrice = Math.min(...visible.filter(drink => drinkStatus(availability, drink.id) === "available").map(drink => drink.variants[0].price));
  const hasAvailable = Number.isFinite(startingPrice);

  return <details className="refreshment-later" id="acompanhamentos" data-has-selection={count > 0 || undefined}>
    <summary aria-label={count > 0 ? `Adicionar refrigerante. ${count} no pedido` : "Adicionar refrigerante, opcional"}>
      <span className="refreshment-summary-symbol"><CupSoda size={19} strokeWidth={1.8} aria-hidden="true" /></span>
      <span className="refreshment-summary-copy">
        <strong>Adicionar refrigerante</strong>
        <small>{count > 0 ? `${count} no pedido · ${money.format(selectedTotal)}`
          : hasAvailable ? `${visible.length} opções · A partir de ${money.format(startingPrice)}`
            : "Opções indisponíveis no momento"}</small>
      </span>
      <ChevronDown className="refreshment-chevron" size={18} aria-hidden="true" />
    </summary>
    <div className="refreshment-body">
      <p className="refreshment-subtitle">Opcional. Escolha uma ou mais bebidas, sem sair do seu pedido.</p>
      <div className="refreshment-grid" role="group" aria-label="Bebidas para acompanhar">
        {visible.map(drink => {
          const variant = drink.variants[0];
          const quantity = cart.filter(item => item.productId === drink.id).reduce((a,item) => a+item.quantity,0);
          const available = drinkStatus(availability,drink.id) === "available" && drink.available && variant.available;
          const canAdd = available && !busy && quantity < 99;
          const canRemove = quantity > 0 && !busy;
          return <article className="refreshment-card" key={drink.id} data-drink-id={drink.id}
              data-selected={quantity > 0 || undefined} data-unavailable={!available || undefined}>
            <div className="refreshment-product">
              <span className="refreshment-image"><img src={drink.image} alt={drink.imageAlt} width="92" height="92"
                loading="lazy" decoding="async" draggable={false} /></span>
              <div className="refreshment-copy">
                <h4>{drink.name}</h4>
                <small>{variant.label}</small>
              </div>
            </div>
            <div className="refreshment-action-row">
              <strong className="refreshment-price">{money.format(variant.price)}</strong>
              {!available && quantity === 0 ? <span className="refreshment-unavailable">Esgotado</span>
                : quantity > 0 ? <div className="refreshment-quantity" role="group" aria-label={`Quantidade de ${drink.name}, ${variant.label}`}>
                    <button type="button" disabled={!canRemove} aria-label={`Remover uma unidade de ${drink.name}`}
                      onClick={() => onChange(drink,-1)}><Minus size={16} aria-hidden="true" /></button>
                    <span aria-live="off">{quantity}</span>
                    <button type="button" disabled={!canAdd} aria-label={`Adicionar uma unidade de ${drink.name}`}
                      onClick={() => onChange(drink,1)}><Plus size={16} aria-hidden="true" /></button>
                  </div>
                : <button type="button" className="refreshment-add" disabled={!canAdd}
                    onClick={() => onChange(drink,1)} aria-label={`Adicionar ${drink.name}, ${variant.label}, ${money.format(variant.price)}`}>
                    <Plus size={19} strokeWidth={2} aria-hidden="true" />
                  </button>}
            </div>
          </article>;
        })}
      </div>
      <p className="refreshment-footnote">Sem obrigação de adicionar. Continue em entrega ou retirada logo abaixo.</p>
    </div>
    <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{message}</span>
  </details>;
}
