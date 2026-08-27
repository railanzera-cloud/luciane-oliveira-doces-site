"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  Check,
  ChevronRight,
  Crown,
  MapPin,
  MessageCircle,
  Minus,
  Pencil,
  Plus,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type Variant = {
  id: string;
  label: string;
  whatsappLabel: string;
  price: number;
  maxOptions: number;
  available: boolean;
};

type ProductOption = {
  id: string;
  name: string;
  description: string;
  tone: string;
  available: boolean;
};

type Product = {
  id: string;
  category: string;
  name: string;
  image: string;
  available: boolean;
  variants: Variant[];
  options: ProductOption[];
};

type CartItem = {
  id: string;
  productId: string;
  variantId: string;
  optionIds: string[];
  quantity: number;
};

type Fulfillment = "entrega" | "retirada" | "";
type Payment = "pix" | "dinheiro" | "cartao" | "";

const PRODUCTS: Product[] = [
  {
    id: "pipoca-gourmet",
    category: "Pipocas Gourmet",
    name: "Pipoca Gourmet",
    image: "/pipoca-gourmet.jpeg",
    available: true,
    variants: [
      { id: "350ml", label: "350 ml", whatsappLabel: "350 ml", price: 20, maxOptions: 2, available: true },
      { id: "500ml", label: "500 ml", whatsappLabel: "500 ml", price: 25, maxOptions: 2, available: true },
      { id: "750ml", label: "750 ml", whatsappLabel: "750 ml", price: 39, maxOptions: 2, available: true },
      { id: "1l", label: "1 litro", whatsappLabel: "1 litro", price: 49, maxOptions: 3, available: true },
    ],
    options: [
      { id: "leitinho", name: "Leitinho", description: "Creme branco com leite em pó.", tone: "#f3d9a7", available: true },
      { id: "nutella", name: "Nutella", description: "Creme de avelã com cacau.", tone: "#7b4025", available: true },
      { id: "kinder-bueno", name: "Kinder Bueno", description: "Creme de avelã com leite.", tone: "#d69a66", available: true },
      { id: "choco-cookies-branco", name: "Choco Cookies Branco", description: "Creme branco com cookies.", tone: "#ead8bc", available: true },
      { id: "choco-cookies-leite", name: "Choco Cookies ao Leite", description: "Chocolate ao leite com cookies.", tone: "#9b6040", available: true },
      { id: "pistache", name: "Pistache", description: "Creme sabor pistache.", tone: "#9f9b61", available: true },
    ],
  },
];

const WHATSAPP_NUMBER = "5591993623669";
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Home() {
  const product = PRODUCTS[0];
  const [variantId, setVariantId] = useState("500ml");
  const [optionIds, setOptionIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectionMessage, setSelectionMessage] = useState("");
  const [fulfillment, setFulfillment] = useState<Fulfillment>("");
  const [neighborhood, setNeighborhood] = useState("");
  const [address, setAddress] = useState("");
  const [reference, setReference] = useState("");
  const [payment, setPayment] = useState<Payment>("");
  const [needsChange, setNeedsChange] = useState(false);
  const [changeFor, setChangeFor] = useState("");

  const selectedVariant = product.variants.find((variant) => variant.id === variantId)!;
  const maxOptionsReached = optionIds.length >= selectedVariant.maxOptions;
  const cartSubtotal = useMemo(
    () => cart.reduce((total, item) => {
      const itemProduct = PRODUCTS.find((candidate) => candidate.id === item.productId);
      const variant = itemProduct?.variants.find((candidate) => candidate.id === item.variantId);
      return total + (variant?.price ?? 0) * item.quantity;
    }, 0),
    [cart],
  );

  const draftSubtotal = selectedVariant.price * quantity;
  const itemReady = product.available && selectedVariant.available && optionIds.length > 0;
  const addressReady = fulfillment !== "entrega" || Boolean(neighborhood.trim() && address.trim() && reference.trim());
  const paymentReady = Boolean(payment) && (payment !== "dinheiro" || !needsChange || Boolean(changeFor.trim()));
  const checkoutReady = cart.length > 0 && Boolean(fulfillment) && addressReady && paymentReady;

  function chooseVariant(nextId: string) {
    const nextVariant = product.variants.find((variant) => variant.id === nextId);
    if (!nextVariant?.available) return;
    setVariantId(nextId);
    setOptionIds((current) => {
      if (current.length <= nextVariant.maxOptions) return current;
      setSelectionMessage(`Ajustamos sua seleção para o limite de ${nextVariant.maxOptions} sabores deste tamanho.`);
      return current.slice(0, nextVariant.maxOptions);
    });
  }

  function toggleOption(option: ProductOption) {
    if (!option.available) return;
    setOptionIds((current) => {
      if (current.includes(option.id)) {
        setSelectionMessage("");
        return current.filter((id) => id !== option.id);
      }
      if (current.length >= selectedVariant.maxOptions) {
        setSelectionMessage(`Você já escolheu ${selectedVariant.maxOptions} sabores. Desmarque um para trocar.`);
        return current;
      }
      setSelectionMessage("");
      return [...current, option.id];
    });
  }

  function resetDraft() {
    setOptionIds([]);
    setQuantity(1);
    setEditingId(null);
    setSelectionMessage("");
  }

  function addOrUpdateItem() {
    if (!itemReady) {
      setSelectionMessage("Escolha pelo menos 1 sabor para continuar.");
      scrollToSection("sabores");
      return;
    }
    if (editingId) {
      setCart((current) => current.map((item) => item.id === editingId ? { ...item, variantId, optionIds: [...optionIds], quantity } : item));
    } else {
      setCart((current) => [...current, {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        productId: product.id,
        variantId,
        optionIds: [...optionIds],
        quantity,
      }]);
    }
    const destination = editingId ? "carrinho" : "recebimento";
    resetDraft();
    window.setTimeout(() => scrollToSection(destination), 50);
  }

  function editItem(item: CartItem) {
    setVariantId(item.variantId);
    setOptionIds([...item.optionIds]);
    setQuantity(item.quantity);
    setEditingId(item.id);
    setSelectionMessage("");
    scrollToSection("configurador");
  }

  function removeItem(id: string) {
    setCart((current) => current.filter((item) => item.id !== id));
    if (editingId === id) resetDraft();
  }

  function changeCartQuantity(id: string, delta: number) {
    setCart((current) => current.map((item) => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item));
  }

  function buildWhatsAppMessage() {
    const orderLines = cart.map((item, index) => {
      const itemProduct = PRODUCTS.find((candidate) => candidate.id === item.productId)!;
      const variant = itemProduct.variants.find((candidate) => candidate.id === item.variantId)!;
      const options = item.optionIds.map((id) => itemProduct.options.find((option) => option.id === id)?.name).filter(Boolean).join(" + ");
      const prefix = cart.length > 1 ? `${index + 1}. ` : "";
      return `${prefix}${item.quantity}x ${itemProduct.name} ${variant.whatsappLabel}\nSabores: ${options}\nValor: ${currency.format(variant.price * item.quantity)}`;
    }).join("\n\n");
    const receivingLines = fulfillment === "entrega"
      ? `Entrega\nBairro: ${neighborhood.trim()}\nEndereço: ${address.trim()}\nReferência: ${reference.trim()}`
      : "Retirada em Paragominas";
    const paymentLabel = payment === "pix"
      ? "Pix"
      : payment === "dinheiro"
        ? `Dinheiro${needsChange ? ` — troco para ${changeFor.trim()}` : " — sem troco"}`
        : "Cartão na entrega";
    const deliveryLine = fulfillment === "entrega"
      ? "Taxa de entrega: a confirmar (a partir de R$8)."
      : "Taxa de entrega: não se aplica.";
    return `Olá! Quero finalizar meu pedido de Pipoca Gourmet.\n\n*Pedido*\n${orderLines}\n\n*Recebimento*\n${receivingLines}\n\n*Pagamento*\n${paymentLabel}\n\nSubtotal dos produtos: ${currency.format(cartSubtotal)}\n${deliveryLine}`;
  }

  function finishOnWhatsApp() {
    if (!checkoutReady) {
      if (!cart.length) scrollToSection("configurador");
      else if (!fulfillment || !addressReady) scrollToSection("recebimento");
      else scrollToSection("pagamento");
      return;
    }
    const message = encodeURIComponent(buildWhatsAppMessage());
    window.location.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
  }

  function stickyAction() {
    if (!cart.length) {
      if (itemReady) addOrUpdateItem();
      else scrollToSection("configurador");
      return;
    }
    finishOnWhatsApp();
  }

  const checkoutHint = !cart.length
    ? "Adicione sua pipoca ao pedido."
    : !fulfillment
      ? "Escolha entrega ou retirada."
      : !addressReady
        ? "Preencha os dados da entrega."
        : !payment
          ? "Escolha a forma de pagamento."
          : !paymentReady
            ? "Informe o valor para o troco."
            : "Tudo certo para enviar seu pedido.";

  return (
    <main>
      <header className="brand-bar">
        <a className="brand-lockup" href="#inicio" aria-label="Voltar ao início">
          <span className="brand-crown" aria-hidden="true"><Crown size={17} strokeWidth={1.7} /></span>
          <span><strong>Luciane</strong><small>Oliveira Doces</small></span>
        </a>
        <span className="location-chip"><MapPin size={14} /> Paragominas</span>
      </header>

      <section className="hero" id="inicio">
        <img className="hero-image" src={product.image} alt="Pote real de Pipoca Gourmet Luciane Oliveira Doces com três sabores" width="900" height="1600" fetchPriority="high" />
        <div className="hero-overlay" />
        <div className="hero-content page-shell">
          <p className="eyebrow">Pipocas Gourmet</p>
          <h1>Monte sua<span>Pipoca Gourmet</span></h1>
          <p className="hero-copy">Escolha o tamanho, combine seus sabores favoritos e faça seu pedido em poucos passos.</p>
          <div className="hero-facts" aria-label="Informações principais"><span>A partir de R$20</span><span>Até 3 sabores</span></div>
          <Button type="button" className="primary-cta hero-cta" onClick={() => scrollToSection("configurador")}>Montar meu pedido <ArrowDown size={18} /></Button>
          <p className="delivery-note"><Truck size={16} /> Entrega a partir de R$8 ou retirada em Paragominas</p>
        </div>
      </section>

      {!product.available && (
        <section className="unavailable-banner" role="status"><strong>Esgotado hoje</strong><span>As Pipocas Gourmet estão temporariamente indisponíveis.</span></section>
      )}

      <section className="builder-section" id="configurador">
        <div className="page-shell builder-shell">
          <div className="section-intro">
            <p className="eyebrow">Seu pedido, do seu jeito</p>
            <h2>Monte em poucos passos</h2>
            <p>As regras de combinação são aplicadas automaticamente.</p>
          </div>

          <div className="builder-card">
            <section className="step-block" aria-labelledby="step-size">
              <div className="step-heading">
                <span className="step-number">1</span>
                <div><h3 id="step-size">Escolha o tamanho</h3><p>O preço e o limite de sabores mudam conforme o pote.</p></div>
              </div>
              <RadioGroup className="size-grid" value={variantId} onValueChange={chooseVariant} aria-label="Tamanho da Pipoca Gourmet">
                {product.variants.map((variant) => (
                  <label className={`size-card ${variant.id === variantId ? "is-selected" : ""} ${!variant.available ? "is-unavailable" : ""}`} htmlFor={`size-${variant.id}`} key={variant.id}>
                    <RadioGroupItem id={`size-${variant.id}`} value={variant.id} disabled={!variant.available} />
                    <span className="size-copy"><strong>{variant.label}</strong><b>{currency.format(variant.price)}</b><small>Até {variant.maxOptions} sabores</small></span>
                    {variant.id === variantId && variant.available && <span className="selected-check" aria-hidden="true"><Check size={14} strokeWidth={3} /></span>}
                    {!variant.available && <span className="unavailable-label">Indisponível</span>}
                  </label>
                ))}
              </RadioGroup>
            </section>

            <section className="step-block" id="sabores" aria-labelledby="step-flavors">
              <div className="step-heading flavor-heading">
                <span className="step-number">2</span>
                <div><h3 id="step-flavors">Escolha os sabores</h3><p>Você pode escolher até {selectedVariant.maxOptions} sabores neste tamanho.</p></div>
                <span className="selection-count" aria-live="polite">{optionIds.length}/{selectedVariant.maxOptions}</span>
              </div>
              <div className="flavor-grid">
                {product.options.map((option) => {
                  const selected = optionIds.includes(option.id);
                  const limitDisabled = maxOptionsReached && !selected;
                  const disabled = !option.available || limitDisabled;
                  return (
                    <label className={`flavor-card ${selected ? "is-selected" : ""} ${disabled ? "is-disabled" : ""}`} htmlFor={`flavor-${option.id}`} key={option.id}>
                      <Checkbox id={`flavor-${option.id}`} checked={selected} disabled={disabled} onCheckedChange={() => toggleOption(option)} aria-label={`Selecionar sabor ${option.name}`} />
                      <span className="flavor-tone" style={{ backgroundColor: option.tone }} aria-hidden="true" />
                      <span className="flavor-copy"><strong>{option.name}</strong><small>{option.description}</small></span>
                      {selected && <span className="flavor-selected">Selecionado</span>}
                      {!option.available && <span className="flavor-status">Esgotado hoje</span>}
                      {limitDisabled && option.available && <span className="flavor-status">Limite atingido</span>}
                    </label>
                  );
                })}
              </div>
              <div className={`selection-helper ${selectionMessage ? "has-message" : ""}`} aria-live="polite">
                {selectionMessage || (maxOptionsReached
                  ? "Limite preenchido. Desmarque um sabor para trocar."
                  : `Escolha mais ${selectedVariant.maxOptions - optionIds.length} ${selectedVariant.maxOptions - optionIds.length === 1 ? "sabor" : "sabores"}, se quiser.`)}
              </div>
            </section>

            <section className="step-block" aria-labelledby="step-quantity">
              <div className="step-heading compact-heading">
                <span className="step-number">3</span>
                <div><h3 id="step-quantity">Escolha a quantidade</h3><p>Você poderá ajustar novamente no resumo.</p></div>
              </div>
              <div className="quantity-row">
                <div className="quantity-control" aria-label="Quantidade">
                  <Button type="button" variant="ghost" size="icon" onClick={() => setQuantity((current) => Math.max(1, current - 1))} disabled={quantity === 1} aria-label="Diminuir quantidade"><Minus size={18} /></Button>
                  <strong aria-live="polite">{quantity}</strong>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setQuantity((current) => current + 1)} aria-label="Aumentar quantidade"><Plus size={18} /></Button>
                </div>
                <div className="draft-total"><small>Subtotal</small><strong>{currency.format(draftSubtotal)}</strong></div>
              </div>
              <Button type="button" className="primary-cta add-button" onClick={addOrUpdateItem} disabled={!product.available || !selectedVariant.available}>
                <ShoppingBag size={18} />{editingId ? "Salvar alterações" : "Adicionar ao pedido"}
              </Button>
              {editingId && <Button type="button" variant="ghost" className="cancel-edit" onClick={resetDraft}>Cancelar edição</Button>}
            </section>
          </div>
        </div>
      </section>

      <section className="checkout-section" id="carrinho">
        <div className="page-shell checkout-grid">
          <div className="checkout-main">
            <section className="order-card" aria-labelledby="cart-title">
              <div className="order-card-heading">
                <div><p className="eyebrow">Carrinho</p><h2 id="cart-title">Seu pedido</h2></div>
                {cart.length > 0 && <span className="cart-count">{cart.reduce((total, item) => total + item.quantity, 0)} {cart.reduce((total, item) => total + item.quantity, 0) === 1 ? "item" : "itens"}</span>}
              </div>
              {cart.length === 0 ? (
                <div className="empty-cart">
                  <ShoppingBag size={26} strokeWidth={1.5} /><strong>Seu pedido está vazio</strong><p>Escolha o tamanho e os sabores para adicionar sua pipoca.</p>
                  <Button type="button" variant="outline" onClick={() => scrollToSection("configurador")}>Montar minha pipoca</Button>
                </div>
              ) : (
                <div className="cart-list">
                  {cart.map((item) => {
                    const itemProduct = PRODUCTS.find((candidate) => candidate.id === item.productId)!;
                    const variant = itemProduct.variants.find((candidate) => candidate.id === item.variantId)!;
                    const optionNames = item.optionIds.map((id) => itemProduct.options.find((option) => option.id === id)?.name).filter(Boolean).join(", ");
                    return (
                      <article className="cart-item" key={item.id}>
                        <div className="cart-item-top">
                          <div><span className="product-category">{itemProduct.category}</span><h3>{itemProduct.name} · {variant.label}</h3><p>Sabores: {optionNames}</p></div>
                          <strong>{currency.format(variant.price * item.quantity)}</strong>
                        </div>
                        <div className="cart-item-actions">
                          <div className="mini-quantity">
                            <Button type="button" variant="ghost" size="icon" onClick={() => changeCartQuantity(item.id, -1)} disabled={item.quantity === 1} aria-label="Diminuir quantidade deste item"><Minus size={15} /></Button>
                            <span>{item.quantity}</span>
                            <Button type="button" variant="ghost" size="icon" onClick={() => changeCartQuantity(item.id, 1)} aria-label="Aumentar quantidade deste item"><Plus size={15} /></Button>
                          </div>
                          <Button type="button" variant="ghost" className="text-action" onClick={() => editItem(item)}><Pencil size={15} /> Editar</Button>
                          <Button type="button" variant="ghost" className="text-action destructive-action" onClick={() => removeItem(item.id)}><Trash2 size={15} /> Remover</Button>
                        </div>
                      </article>
                    );
                  })}
                  <div className="cart-subtotal"><span>Subtotal dos produtos</span><strong>{currency.format(cartSubtotal)}</strong></div>
                  <Button type="button" variant="outline" className="add-another" onClick={() => scrollToSection("configurador")}><Plus size={16} /> Adicionar outra combinação</Button>
                </div>
              )}
            </section>

            <section className="order-card" id="recebimento" aria-labelledby="receiving-title">
              <div className="step-heading checkout-step-heading">
                <span className="step-number">4</span>
                <div><h2 id="receiving-title">Como deseja receber?</h2><p>Escolha a opção mais conveniente.</p></div>
              </div>
              <RadioGroup className="choice-grid" value={fulfillment} onValueChange={(value) => setFulfillment(value as Fulfillment)} aria-label="Forma de recebimento">
                <label className={`choice-card ${fulfillment === "entrega" ? "is-selected" : ""}`} htmlFor="receive-delivery">
                  <RadioGroupItem id="receive-delivery" value="entrega" /><Truck size={21} /><span><strong>Entrega</strong><small>A partir de R$8</small></span>
                </label>
                <label className={`choice-card ${fulfillment === "retirada" ? "is-selected" : ""}`} htmlFor="receive-pickup">
                  <RadioGroupItem id="receive-pickup" value="retirada" /><Store size={21} /><span><strong>Retirada</strong><small>Em Paragominas</small></span>
                </label>
              </RadioGroup>
              {fulfillment === "entrega" && (
                <div className="delivery-fields">
                  <div className="field-group"><label htmlFor="neighborhood">Bairro</label><Input id="neighborhood" value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} placeholder="Informe seu bairro" autoComplete="address-level3" /></div>
                  <div className="field-group"><label htmlFor="address">Endereço</label><Input id="address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Rua, número e complemento" autoComplete="street-address" /></div>
                  <div className="field-group"><label htmlFor="reference">Ponto de referência</label><Input id="reference" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Ex.: próximo à praça" /></div>
                  <p className="field-note">A taxa final de entrega será confirmada no WhatsApp de acordo com o endereço.</p>
                </div>
              )}
              {fulfillment === "retirada" && (
                <div className="pickup-note"><MapPin size={18} /><span><strong>Retirada disponível em Paragominas.</strong>O horário e o local serão confirmados no WhatsApp.</span></div>
              )}
            </section>

            <section className="order-card" id="pagamento" aria-labelledby="payment-title">
              <div className="order-card-heading payment-heading"><div><p className="eyebrow">Pagamento</p><h2 id="payment-title">Como prefere pagar?</h2></div></div>
              <RadioGroup className="payment-list" value={payment} onValueChange={(value) => setPayment(value as Payment)} aria-label="Forma de pagamento">
                {[["pix", "Pix"], ["dinheiro", "Dinheiro"], ["cartao", "Cartão na entrega"]].map(([value, label]) => (
                  <label className={`payment-option ${payment === value ? "is-selected" : ""}`} htmlFor={`payment-${value}`} key={value}>
                    <RadioGroupItem id={`payment-${value}`} value={value} /><span>{label}</span>{payment === value && <Check size={17} />}
                  </label>
                ))}
              </RadioGroup>
              {payment === "dinheiro" && (
                <div className="change-box">
                  <div className="change-question">
                    <span><strong>Precisa de troco?</strong><small>Opcional</small></span>
                    <div className="segmented-control">
                      <Button type="button" variant={!needsChange ? "default" : "ghost"} onClick={() => setNeedsChange(false)}>Não</Button>
                      <Button type="button" variant={needsChange ? "default" : "ghost"} onClick={() => setNeedsChange(true)}>Sim</Button>
                    </div>
                  </div>
                  {needsChange && <div className="field-group"><label htmlFor="change-for">Troco para quanto?</label><Input id="change-for" value={changeFor} onChange={(event) => setChangeFor(event.target.value)} placeholder="Ex.: R$ 100" inputMode="decimal" /></div>}
                </div>
              )}
            </section>
          </div>

          <aside className="summary-card" aria-labelledby="summary-title">
            <p className="eyebrow">Confira antes de enviar</p><h2 id="summary-title">Resumo do pedido</h2>
            <div className="summary-content">
              {cart.length === 0 ? <p className="summary-empty">Sua Pipoca Gourmet aparecerá aqui depois de ser adicionada.</p> : cart.map((item, index) => {
                const itemProduct = PRODUCTS.find((candidate) => candidate.id === item.productId)!;
                const variant = itemProduct.variants.find((candidate) => candidate.id === item.variantId)!;
                const names = item.optionIds.map((id) => itemProduct.options.find((option) => option.id === id)?.name).filter(Boolean).join(", ");
                return (
                  <div className="summary-item" key={item.id}>
                    <div><strong>{item.quantity}x {itemProduct.name} {variant.label}</strong><p>Sabores: {names}</p></div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => editItem(item)} aria-label={`Editar item ${index + 1}`}>Editar</Button>
                  </div>
                );
              })}
              <div className="summary-row"><span>Subtotal</span><strong>{currency.format(cartSubtotal)}</strong></div>
              <button type="button" className="summary-link" onClick={() => scrollToSection("recebimento")}>
                <span><small>Recebimento</small><strong>{fulfillment === "entrega" ? "Entrega — taxa a confirmar" : fulfillment === "retirada" ? "Retirada em Paragominas" : "Escolher opção"}</strong></span><ChevronRight size={18} />
              </button>
              <button type="button" className="summary-link" onClick={() => scrollToSection("pagamento")}>
                <span><small>Pagamento</small><strong>{payment === "pix" ? "Pix" : payment === "dinheiro" ? "Dinheiro" : payment === "cartao" ? "Cartão na entrega" : "Escolher opção"}</strong></span><ChevronRight size={18} />
              </button>
            </div>
            <Button type="button" className="whatsapp-button" onClick={finishOnWhatsApp} aria-describedby="checkout-status" data-event="whatsapp_checkout"><MessageCircle size={20} /> Finalizar pedido no WhatsApp</Button>
            <p id="checkout-status" className={checkoutReady ? "ready-status" : "checkout-status"} aria-live="polite">{checkoutReady && <Check size={14} />}{checkoutHint}</p>
          </aside>
        </div>
      </section>

      <section className="trust-section">
        <div className="page-shell trust-content"><Crown size={30} strokeWidth={1.4} aria-hidden="true" /><div><p className="eyebrow">Luciane Oliveira Doces</p><h2>Feito em Paragominas com muito recheio e cuidado em cada pedido.</h2></div></div>
      </section>

      <footer>
        <div className="page-shell footer-content">
          <div><strong>Luciane Oliveira Doces</strong><span>Paragominas–PA</span></div>
          <div className="footer-details"><a href="https://wa.me/5591993623669"><MessageCircle size={16} /> (91) 99362-3669</a><span>Entrega a partir de R$8.</span><span>Retirada disponível.</span></div>
        </div>
      </footer>

      <div className="mobile-sticky-bar">
        <div><small>{cart.length ? "Subtotal" : "Sua pipoca"}</small><strong>{currency.format(cart.length ? cartSubtotal : draftSubtotal)}</strong></div>
        <Button type="button" onClick={stickyAction}>
          {cart.length ? checkoutReady ? "Finalizar no WhatsApp" : "Continuar pedido" : itemReady ? editingId ? "Salvar alterações" : "Adicionar ao pedido" : "Escolher sabores"}<ChevronRight size={17} />
        </Button>
      </div>
    </main>
  );
}
