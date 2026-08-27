"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  CakeSlice,
  Check,
  ChevronRight,
  Crown,
  CupSoda,
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DELIVERY_ZONES,
  DRINKS,
  POPCORN,
  PRODUCTS,
  SAUCES,
  SLICES,
  STORE_CONFIG,
  type CategoryId,
  type Product,
  type ProductOption,
  type Variant,
} from "@/app/catalog";

type CartItem = {
  id: string;
  productId: string;
  variantId: string;
  optionIds: string[];
  quantity: number;
};

type Fulfillment = "entrega" | "retirada" | "";
type Payment = "pix" | "dinheiro" | "cartao" | "";
type MetaEventName = "ViewContent" | "AddToCart" | "InitiateCheckout";

type SavedOrder = {
  version: 1;
  savedAt: number;
  activeCategory: CategoryId;
  cart: CartItem[];
  fulfillment: Fulfillment;
  deliveryZoneId: string;
  neighborhood: string;
  address: string;
  reference: string;
  payment: Payment;
  needsChange: boolean;
  changeFor: string;
};

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    __lucianeViewContentTracked?: boolean;
  }
}

const TINTIM_SITE_LINK = "https://tintim.link/whatsapp/2c956a42-229f-4d21-ade6-4442f8c048ed/7522df92-bbe1-4bff-83ca-2629bba182eb";
const ORDER_STORAGE_KEY = "luciane-order-v1";
const ORDER_STORAGE_TTL = 2 * 60 * 60 * 1000;
const DEFAULT_POPCORN_VARIANT_ID = POPCORN.variants.find((variant) => variant.id === "500ml" && variant.available)?.id
  ?? POPCORN.variants.find((variant) => variant.available)?.id
  ?? POPCORN.variants[0].id;
const DEFAULT_SLICE_PRODUCT_ID = SLICES.find((product) => product.available && product.variants[0]?.available)?.id ?? SLICES[0].id;
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function makeCartId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function productLabel(product: Product) {
  return product.subtitle
    ? `${product.name} (${product.subtitle.toLowerCase()})`
    : product.name;
}

function trackMetaEvent(eventName: MetaEventName, payload?: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return false;
  if (payload) window.fbq("track", eventName, payload);
  else window.fbq("track", eventName);
  return true;
}

function metaProductPayload(product: Product, variant: Variant, quantity: number) {
  const contentId = `${product.id}:${variant.id}`;
  return {
    content_name: productLabel(product),
    content_category: product.category,
    content_ids: [contentId],
    content_type: "product",
    contents: [{ id: contentId, quantity, item_price: variant.price }],
    currency: "BRL",
    value: variant.price * quantity,
    num_items: quantity,
  };
}

function tintimWhatsAppUrl(message: string) {
  return `${TINTIM_SITE_LINK}?text=${encodeURIComponent(message)}`;
}

function sanitizeSavedCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const item = candidate as Partial<CartItem>;
    const product = PRODUCTS.find((current) => current.id === item.productId);
    const variant = product?.variants.find((current) => current.id === item.variantId);
    if (!product?.available || !variant?.available) return [];

    const optionIds = Array.isArray(item.optionIds)
      ? item.optionIds.filter((id): id is string => typeof id === "string")
      : [];
    const optionsAreAvailable = optionIds.every((id) => product.options.some((option) => option.id === id && option.available));
    const optionsAreValid = product.kind === "popcorn"
      ? optionIds.length > 0 && optionIds.length <= (variant.maxOptions ?? 0)
      : product.kind === "slice"
        ? optionIds.length === 1
        : optionIds.length === 0;
    if (!optionsAreAvailable || !optionsAreValid) return [];

    const quantity = typeof item.quantity === "number" && Number.isInteger(item.quantity)
      ? Math.min(99, Math.max(1, item.quantity))
      : 1;
    return [{
      id: typeof item.id === "string" ? item.id : makeCartId(),
      productId: product.id,
      variantId: variant.id,
      optionIds,
      quantity,
    }];
  });
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>("pipocas");
  const [popcornVariantId, setPopcornVariantId] = useState(DEFAULT_POPCORN_VARIANT_ID);
  const [popcornOptionIds, setPopcornOptionIds] = useState<string[]>([]);
  const [popcornQuantity, setPopcornQuantity] = useState(1);
  const [sliceProductId, setSliceProductId] = useState(DEFAULT_SLICE_PRODUCT_ID);
  const [sliceSauceId, setSliceSauceId] = useState("");
  const [sliceQuantity, setSliceQuantity] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectionMessage, setSelectionMessage] = useState("");
  const [drinkMessage, setDrinkMessage] = useState("");
  const [fulfillment, setFulfillment] = useState<Fulfillment>("");
  const [deliveryZoneId, setDeliveryZoneId] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [address, setAddress] = useState("");
  const [reference, setReference] = useState("");
  const [payment, setPayment] = useState<Payment>("");
  const [needsChange, setNeedsChange] = useState(false);
  const [changeFor, setChangeFor] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [restoredOrderNotice, setRestoredOrderNotice] = useState(false);
  const checkoutStartedRef = useRef(false);

  useEffect(() => {
    if (window.__lucianeViewContentTracked) return;
    if (trackMetaEvent("ViewContent")) {
      window.__lucianeViewContentTracked = true;
    }
  }, []);

  useEffect(() => {
    const requestedCategory = new URLSearchParams(window.location.search).get("categoria");
    try {
      const rawOrder = window.localStorage.getItem(ORDER_STORAGE_KEY);
      if (rawOrder) {
        const saved = JSON.parse(rawOrder) as Partial<SavedOrder>;
        const stillFresh = saved.version === 1
          && typeof saved.savedAt === "number"
          && Date.now() - saved.savedAt <= ORDER_STORAGE_TTL;
        if (stillFresh) {
          const savedCart = sanitizeSavedCart(saved.cart);
          setCart(savedCart);
          if (saved.fulfillment === "entrega" || saved.fulfillment === "retirada") setFulfillment(saved.fulfillment);
          if (typeof saved.deliveryZoneId === "string" && DELIVERY_ZONES.some((zone) => zone.id === saved.deliveryZoneId)) {
            setDeliveryZoneId(saved.deliveryZoneId);
          }
          if (typeof saved.neighborhood === "string") setNeighborhood(saved.neighborhood);
          if (typeof saved.address === "string") setAddress(saved.address);
          if (typeof saved.reference === "string") setReference(saved.reference);
          if (saved.payment === "pix" || saved.payment === "dinheiro" || saved.payment === "cartao") setPayment(saved.payment);
          if (typeof saved.needsChange === "boolean") setNeedsChange(saved.needsChange);
          if (typeof saved.changeFor === "string") setChangeFor(saved.changeFor);
          if (requestedCategory !== "fatias" && (saved.activeCategory === "pipocas" || saved.activeCategory === "fatias")) {
            setActiveCategory(saved.activeCategory);
          }
          setRestoredOrderNotice(savedCart.length > 0);
        } else {
          window.localStorage.removeItem(ORDER_STORAGE_KEY);
        }
      }
    } catch {
      try {
        window.localStorage.removeItem(ORDER_STORAGE_KEY);
      } catch {
        // O cardápio continua funcionando mesmo quando o navegador bloqueia o armazenamento local.
      }
    }
    if (requestedCategory === "fatias") setActiveCategory("fatias");
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    const hasSavedData = cart.length > 0
      || Boolean(fulfillment || deliveryZoneId || neighborhood || address || reference || payment || changeFor);
    try {
      if (!hasSavedData) {
        window.localStorage.removeItem(ORDER_STORAGE_KEY);
        return;
      }
      const savedOrder: SavedOrder = {
        version: 1,
        savedAt: Date.now(),
        activeCategory,
        cart,
        fulfillment,
        deliveryZoneId,
        neighborhood,
        address,
        reference,
        payment,
        needsChange,
        changeFor,
      };
      window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(savedOrder));
    } catch {
      // A persistência é uma conveniência; o fluxo do pedido não depende dela.
    }
  }, [activeCategory, address, cart, changeFor, deliveryZoneId, fulfillment, needsChange, neighborhood, payment, reference, storageReady]);

  const popcornVariant = POPCORN.variants.find((variant) => variant.id === popcornVariantId)!;
  const popcornMaxOptions = popcornVariant.maxOptions ?? 0;
  const popcornLimitReached = popcornOptionIds.length >= popcornMaxOptions;
  const selectedSlice = SLICES.find((product) => product.id === sliceProductId)!;
  const selectedSliceVariant = selectedSlice.variants[0];
  const selectedDeliveryZone = DELIVERY_ZONES.find((zone) => zone.id === deliveryZoneId);
  const deliveryNeighborhood = selectedDeliveryZone?.asksNeighborhood
    ? neighborhood.trim()
    : selectedDeliveryZone?.label ?? "";

  const cartSubtotal = useMemo(
    () => cart.reduce((total, item) => {
      const product = PRODUCTS.find((candidate) => candidate.id === item.productId);
      const variant = product?.variants.find((candidate) => candidate.id === item.variantId);
      return total + (variant?.price ?? 0) * item.quantity;
    }, 0),
    [cart],
  );

  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const deliveryFee = fulfillment === "entrega" ? selectedDeliveryZone?.price ?? 0 : 0;
  const orderTotal = cartSubtotal + deliveryFee;
  const hasEstimatedTotal = fulfillment === "retirada" || (fulfillment === "entrega" && Boolean(selectedDeliveryZone));

  const popcornReady = POPCORN.available && popcornVariant.available && popcornOptionIds.length > 0;
  const sliceReady = selectedSlice.available && selectedSliceVariant.available && Boolean(sliceSauceId);
  const draftReady = activeCategory === "pipocas" ? popcornReady : sliceReady;
  const draftSubtotal = activeCategory === "pipocas"
    ? popcornVariant.price * popcornQuantity
    : selectedSliceVariant.price * sliceQuantity;
  const addressReady = fulfillment !== "entrega"
    || Boolean(selectedDeliveryZone && deliveryNeighborhood && address.trim() && reference.trim());
  const paymentReady = Boolean(payment) && (payment !== "dinheiro" || !needsChange || Boolean(changeFor.trim()));
  const checkoutReady = STORE_CONFIG.acceptingOrders
    && cart.length > 0
    && Boolean(fulfillment)
    && addressReady
    && paymentReady;

  useEffect(() => {
    if (cart.length === 0) checkoutStartedRef.current = false;
  }, [cart.length]);

  const hero = activeCategory === "pipocas"
    ? {
        eyebrow: "Pipocas Gourmet",
        titleLead: "Monte sua",
        titleAccent: "Pipoca Gourmet",
        copy: "Escolha o tamanho, combine seus sabores favoritos e faça seu pedido em poucos passos.",
        image: POPCORN.image!,
        alt: POPCORN.imageAlt!,
        facts: ["A partir de R$20", "Até 3 sabores"],
        cta: "Montar minha pipoca",
      }
    : {
        eyebrow: "Fatias Artesanais",
        titleLead: "Escolha sua",
        titleAccent: "Fatia Artesanal",
        copy: "Escolha a fatia e o sabor da calda incluída, enviada separadamente em um potinho.",
        image: "/fatia-chocolate-morango.jpeg",
        alt: "Fatia artesanal de chocolate com morango da Luciane Oliveira Doces",
        facts: ["A partir de R$20", "Calda grátis e separada"],
        cta: "Escolher minha fatia",
      };

  function selectCategory(category: CategoryId, shouldScroll = false) {
    setActiveCategory(category);
    setEditingId(null);
    setSelectionMessage("");
    const url = new URL(window.location.href);
    if (category === "fatias") url.searchParams.set("categoria", "fatias");
    else url.searchParams.delete("categoria");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    if (shouldScroll) window.setTimeout(() => scrollToSection("configurador"), 30);
  }

  function choosePopcornVariant(nextId: string) {
    const nextVariant = POPCORN.variants.find((variant) => variant.id === nextId);
    if (!nextVariant?.available) return;
    setPopcornVariantId(nextId);
    setPopcornOptionIds((current) => {
      const max = nextVariant.maxOptions ?? 0;
      if (current.length <= max) return current;
      setSelectionMessage(`Ajustamos sua seleção para o limite de ${max} sabores deste tamanho.`);
      return current.slice(0, max);
    });
  }

  function togglePopcornOption(option: ProductOption) {
    if (!option.available) return;
    setPopcornOptionIds((current) => {
      if (current.includes(option.id)) {
        setSelectionMessage("");
        return current.filter((id) => id !== option.id);
      }
      if (current.length >= popcornMaxOptions) {
        setSelectionMessage(`Você já escolheu ${popcornMaxOptions} sabores. Desmarque um para trocar.`);
        return current;
      }
      setSelectionMessage("");
      return [...current, option.id];
    });
  }

  function clearDraft() {
    setPopcornOptionIds([]);
    setPopcornQuantity(1);
    setSliceSauceId("");
    setSliceQuantity(1);
    setEditingId(null);
    setSelectionMessage("");
  }

  function trackCheckoutStart() {
    if (!STORE_CONFIG.acceptingOrders || checkoutStartedRef.current || cart.length === 0) return;
    const contents = cart.map((item) => {
      const product = PRODUCTS.find((candidate) => candidate.id === item.productId)!;
      const variant = product.variants.find((candidate) => candidate.id === item.variantId)!;
      return {
        id: `${product.id}:${variant.id}`,
        quantity: item.quantity,
        item_price: variant.price,
      };
    });
    const didTrack = trackMetaEvent("InitiateCheckout", {
      content_ids: contents.map((item) => item.id),
      content_type: "product",
      contents,
      currency: "BRL",
      value: cartSubtotal,
      num_items: cart.reduce((total, item) => total + item.quantity, 0),
    });
    if (didTrack) checkoutStartedRef.current = true;
  }

  function enterCheckout(sectionId: "recebimento" | "pagamento") {
    trackCheckoutStart();
    scrollToSection(sectionId);
  }

  function chooseFulfillment(value: string) {
    trackCheckoutStart();
    setFulfillment(value as Fulfillment);
  }

  function choosePayment(value: string) {
    trackCheckoutStart();
    setPayment(value as Payment);
  }

  function addOrUpdatePopcorn() {
    if (!STORE_CONFIG.acceptingOrders) {
      setSelectionMessage(STORE_CONFIG.closedMessage);
      return;
    }
    if (!popcornReady) {
      setSelectionMessage("Escolha pelo menos 1 sabor para continuar.");
      scrollToSection("sabores");
      return;
    }
    const nextItem: Omit<CartItem, "id"> = {
      productId: POPCORN.id,
      variantId: popcornVariantId,
      optionIds: [...popcornOptionIds],
      quantity: popcornQuantity,
    };
    if (editingId) {
      setCart((current) => current.map((item) => item.id === editingId ? { ...item, ...nextItem } : item));
    } else {
      setCart((current) => [...current, { id: makeCartId(), ...nextItem }]);
      trackMetaEvent("AddToCart", metaProductPayload(POPCORN, popcornVariant, popcornQuantity));
    }
    const destination = editingId ? "carrinho" : "acompanhamentos";
    clearDraft();
    window.setTimeout(() => scrollToSection(destination), 50);
  }

  function addOrUpdateSlice() {
    if (!STORE_CONFIG.acceptingOrders) {
      setSelectionMessage(STORE_CONFIG.closedMessage);
      return;
    }
    if (!sliceSauceId) {
      setSelectionMessage("Escolha sua calda inclusa: Chocolate ou Ninho.");
      scrollToSection("caldas");
      return;
    }
    if (!sliceReady) return;
    const nextItem: Omit<CartItem, "id"> = {
      productId: selectedSlice.id,
      variantId: selectedSliceVariant.id,
      optionIds: [sliceSauceId],
      quantity: sliceQuantity,
    };
    if (editingId) {
      setCart((current) => current.map((item) => item.id === editingId ? { ...item, ...nextItem } : item));
    } else {
      setCart((current) => [...current, { id: makeCartId(), ...nextItem }]);
      trackMetaEvent("AddToCart", metaProductPayload(selectedSlice, selectedSliceVariant, sliceQuantity));
    }
    const destination = editingId ? "carrinho" : "acompanhamentos";
    clearDraft();
    window.setTimeout(() => scrollToSection(destination), 50);
  }

  function addDrink(product: Product) {
    if (!STORE_CONFIG.acceptingOrders || !product.available || !product.variants[0].available) return;
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) => item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...current, {
        id: makeCartId(),
        productId: product.id,
        variantId: product.variants[0].id,
        optionIds: [],
        quantity: 1,
      }];
    });
    trackMetaEvent("AddToCart", metaProductPayload(product, product.variants[0], 1));
    setDrinkMessage(`${product.name} ${product.variants[0].label} adicionado ao pedido.`);
  }

  function editItem(item: CartItem) {
    const product = PRODUCTS.find((candidate) => candidate.id === item.productId)!;
    if (product.kind === "drink") return;
    setEditingId(item.id);
    setSelectionMessage("");
    if (product.kind === "popcorn") {
      setActiveCategory("pipocas");
      setPopcornVariantId(item.variantId);
      setPopcornOptionIds([...item.optionIds]);
      setPopcornQuantity(item.quantity);
    } else {
      setActiveCategory("fatias");
      setSliceProductId(product.id);
      setSliceSauceId(item.optionIds[0] ?? "");
      setSliceQuantity(item.quantity);
    }
    window.setTimeout(() => scrollToSection("configurador"), 30);
  }

  function removeItem(id: string) {
    setCart((current) => current.filter((item) => item.id !== id));
    if (editingId === id) clearDraft();
  }

  function changeCartQuantity(id: string, delta: number) {
    if (delta > 0 && STORE_CONFIG.acceptingOrders) {
      const item = cart.find((candidate) => candidate.id === id);
      const product = PRODUCTS.find((candidate) => candidate.id === item?.productId);
      const variant = product?.variants.find((candidate) => candidate.id === item?.variantId);
      if (product && variant) {
        trackMetaEvent("AddToCart", metaProductPayload(product, variant, 1));
      }
    }
    setCart((current) => current.map((item) => item.id === id
      ? { ...item, quantity: Math.max(1, item.quantity + delta) }
      : item));
  }

  function buildWhatsAppMessage() {
    const orderLines = cart.map((item, index) => {
      const product = PRODUCTS.find((candidate) => candidate.id === item.productId)!;
      const variant = product.variants.find((candidate) => candidate.id === item.variantId)!;
      const optionNames = item.optionIds
        .map((id) => product.options.find((option) => option.id === id)?.name)
        .filter(Boolean)
        .join(" + ");
      const prefix = cart.length > 1 ? `${index + 1}. ` : "";
      const optionLine = optionNames && product.optionLabel ? `\n${product.optionLabel}: ${optionNames}` : "";
      return `${prefix}${item.quantity}x ${productLabel(product)} ${variant.whatsappLabel}${optionLine}\nValor: ${currency.format(variant.price * item.quantity)}`;
    }).join("\n\n");

    const receivingLines = fulfillment === "entrega"
      ? `Entrega\nRegião: ${selectedDeliveryZone?.label ?? "Não informada"}\nBairro: ${deliveryNeighborhood}\nEndereço: ${address.trim()}\nReferência: ${reference.trim()}`
      : "Retirada em Paragominas";
    const paymentLabel = payment === "pix"
      ? "Pix"
      : payment === "dinheiro"
        ? `Dinheiro${needsChange ? ` — troco para ${changeFor.trim()}` : " — sem troco"}`
        : "Cartão na entrega";
    const deliveryLine = fulfillment === "entrega"
      ? `Taxa estimada de entrega: ${currency.format(deliveryFee)} (a confirmar no WhatsApp).`
      : "Taxa de entrega: não se aplica.";

    return `Olá! Quero finalizar meu pedido na Luciane Oliveira Doces.\n\n*Pedido*\n${orderLines}\n\n*Recebimento*\n${receivingLines}\n\n*Pagamento*\n${paymentLabel}\n\nSubtotal dos produtos: ${currency.format(cartSubtotal)}\n${deliveryLine}\nTotal estimado: ${currency.format(orderTotal)}`;
  }

  function finishOnWhatsApp() {
    if (!STORE_CONFIG.acceptingOrders) {
      scrollToSection("inicio");
      return;
    }
    if (cart.length > 0) trackCheckoutStart();
    if (!checkoutReady) {
      if (!cart.length) scrollToSection("configurador");
      else if (!fulfillment || !addressReady) enterCheckout("recebimento");
      else enterCheckout("pagamento");
      return;
    }
    window.location.href = tintimWhatsAppUrl(buildWhatsAppMessage());
  }

  function stickyAction() {
    if (editingId || !cart.length) {
      if (activeCategory === "pipocas") addOrUpdatePopcorn();
      else addOrUpdateSlice();
      return;
    }
    finishOnWhatsApp();
  }

  const checkoutHint = !STORE_CONFIG.acceptingOrders
    ? STORE_CONFIG.closedMessage
    : !cart.length
      ? "Adicione pelo menos um produto ao pedido."
      : !fulfillment
        ? "Escolha entrega ou retirada."
        : fulfillment === "entrega" && !selectedDeliveryZone
          ? "Escolha sua região de entrega."
          : fulfillment === "entrega" && selectedDeliveryZone?.asksNeighborhood && !neighborhood.trim()
            ? "Informe seu bairro."
            : !addressReady
              ? "Preencha os dados da entrega."
              : !payment
                ? "Escolha a forma de pagamento."
                : !paymentReady
                  ? "Informe o valor para o troco."
                  : "Ao continuar, seu pedido será enviado no WhatsApp para confirmação.";

  return (
    <main>
      <header className="brand-bar">
        <a className="brand-lockup" href="#inicio" aria-label="Voltar ao início">
          <span className="brand-crown" aria-hidden="true"><Crown size={17} strokeWidth={1.7} /></span>
          <span><strong>Luciane</strong><small>Oliveira Doces</small></span>
        </a>
        <span className="location-chip"><MapPin size={14} /> Paragominas</span>
      </header>

      <section className={`hero ${activeCategory === "fatias" ? "hero-slices" : ""}`} id="inicio">
        <img className="hero-image" src={hero.image} alt={hero.alt} width="900" height="1600" fetchPriority="high" />
        <div className="hero-overlay" />
        <div className="hero-content page-shell">
          {!STORE_CONFIG.acceptingOrders && (
            <div className="store-status-banner" role="status">
              <strong>{STORE_CONFIG.closedMessage}</strong>
              <span>Você ainda pode consultar o cardápio.</span>
            </div>
          )}
          <div className="category-switch" aria-label="Categorias disponíveis">
            <button type="button" className={activeCategory === "pipocas" ? "is-active" : ""} onClick={() => selectCategory("pipocas")}>
              Pipocas Gourmet
            </button>
            <button type="button" className={activeCategory === "fatias" ? "is-active" : ""} onClick={() => selectCategory("fatias")}>
              Fatias Artesanais
            </button>
          </div>
          <p className="eyebrow">{hero.eyebrow}</p>
          <h1>{hero.titleLead}<span>{hero.titleAccent}</span></h1>
          <p className="hero-copy">{hero.copy}</p>
          <div className="hero-facts" aria-label="Informações principais">
            {hero.facts.map((fact) => <span key={fact}>{fact}</span>)}
          </div>
          <Button type="button" className="primary-cta hero-cta" onClick={() => scrollToSection("configurador")}>
            {hero.cta} <ArrowDown size={18} />
          </Button>
          <p className="delivery-note"><Truck size={16} /> Entrega a partir de R$8 ou retirada em Paragominas</p>
        </div>
      </section>

      <section className="builder-section" id="configurador">
        <div className="page-shell builder-shell">
          <div className="section-intro">
            <p className="eyebrow">Seu pedido, do seu jeito</p>
            <h2>{activeCategory === "pipocas" ? "Monte em poucos passos" : "Escolha sua fatia"}</h2>
            <p>{activeCategory === "pipocas"
              ? "As regras de combinação são aplicadas automaticamente."
              : "Escolha o sabor, a calda incluída e a quantidade."}</p>
            <button type="button" className="category-text-link" onClick={() => selectCategory(activeCategory === "pipocas" ? "fatias" : "pipocas", true)}>
              Ver {activeCategory === "pipocas" ? "Fatias Artesanais" : "Pipocas Gourmet"} <ChevronRight size={15} />
            </button>
          </div>

          {((activeCategory === "pipocas" && !POPCORN.available)
            || (activeCategory === "fatias" && !SLICES.some((slice) => slice.available && slice.variants[0]?.available))) && (
            <div className="availability-alert" role="status">
              <strong>Esgotado hoje</strong>
              <span>Esta categoria está temporariamente indisponível.</span>
            </div>
          )}

          {activeCategory === "pipocas" ? (
            <div className="builder-card">
              <section className="step-block" aria-labelledby="step-size">
                <div className="step-heading"><span className="step-number">1</span><div><h3 id="step-size">Escolha o tamanho</h3><p>O preço e o limite de sabores mudam conforme o pote.</p></div></div>
                <RadioGroup className="size-grid" value={popcornVariantId} onValueChange={choosePopcornVariant} aria-label="Tamanho da Pipoca Gourmet">
                  {POPCORN.variants.map((variant) => (
                    <label className={`size-card ${variant.id === popcornVariantId ? "is-selected" : ""} ${!POPCORN.available || !variant.available ? "is-unavailable" : ""}`} htmlFor={`size-${variant.id}`} key={variant.id}>
                      <RadioGroupItem id={`size-${variant.id}`} value={variant.id} disabled={!POPCORN.available || !variant.available} />
                      <span className="size-copy"><strong>{variant.label}</strong><b>{currency.format(variant.price)}</b><small>Até {variant.maxOptions} sabores</small></span>
                      {variant.id === popcornVariantId && POPCORN.available && variant.available && <span className="selected-check" aria-hidden="true"><Check size={14} strokeWidth={3} /></span>}
                      {(!POPCORN.available || !variant.available) && <span className="unavailable-label">{!POPCORN.available ? "Esgotado hoje" : "Indisponível"}</span>}
                    </label>
                  ))}
                </RadioGroup>
              </section>

              <section className="step-block" id="sabores" aria-labelledby="step-flavors">
                <div className="step-heading flavor-heading">
                  <span className="step-number">2</span>
                  <div><h3 id="step-flavors">Escolha os sabores</h3><p>Você pode escolher até {popcornMaxOptions} sabores neste tamanho.</p></div>
                  <span className="selection-count" aria-live="polite">{popcornOptionIds.length}/{popcornMaxOptions}</span>
                </div>
                <div className="flavor-grid">
                  {POPCORN.options.map((option) => {
                    const selected = popcornOptionIds.includes(option.id);
                    const limitDisabled = popcornLimitReached && !selected;
                    const disabled = !option.available || limitDisabled;
                    return (
                      <label className={`flavor-card ${selected ? "is-selected" : ""} ${disabled ? "is-disabled" : ""}`} htmlFor={`flavor-${option.id}`} key={option.id}>
                        <Checkbox id={`flavor-${option.id}`} checked={selected} disabled={disabled} onCheckedChange={() => togglePopcornOption(option)} aria-label={`Selecionar sabor ${option.name}`} />
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
                  {selectionMessage || (popcornLimitReached
                    ? "Limite preenchido. Desmarque um sabor para trocar."
                    : `Escolha mais ${popcornMaxOptions - popcornOptionIds.length} ${popcornMaxOptions - popcornOptionIds.length === 1 ? "sabor" : "sabores"}, se quiser.`)}
                </div>
              </section>

              <section className="step-block" aria-labelledby="step-quantity">
                <div className="step-heading compact-heading"><span className="step-number">3</span><div><h3 id="step-quantity">Escolha a quantidade</h3><p>Você poderá ajustar novamente no carrinho.</p></div></div>
                <div className="quantity-row">
                  <div className="quantity-control" aria-label="Quantidade">
                    <Button type="button" variant="ghost" size="icon" onClick={() => setPopcornQuantity((current) => Math.max(1, current - 1))} disabled={popcornQuantity === 1} aria-label="Diminuir quantidade"><Minus size={18} /></Button>
                    <strong aria-live="polite">{popcornQuantity}</strong>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setPopcornQuantity((current) => current + 1)} aria-label="Aumentar quantidade"><Plus size={18} /></Button>
                  </div>
                  <div className="draft-total"><small>Subtotal</small><strong>{currency.format(popcornVariant.price * popcornQuantity)}</strong></div>
                </div>
                <Button type="button" className="primary-cta add-button" onClick={addOrUpdatePopcorn} disabled={!STORE_CONFIG.acceptingOrders || !POPCORN.available || !popcornVariant.available}>
                  <ShoppingBag size={18} />{editingId ? "Salvar alterações" : "Adicionar ao pedido"}
                </Button>
                {editingId && <Button type="button" variant="ghost" className="cancel-edit" onClick={clearDraft}>Cancelar edição</Button>}
              </section>
            </div>
          ) : (
            <div className="builder-card slice-builder">
              <section className="step-block" aria-labelledby="step-slice">
                <div className="step-heading"><span className="step-number">1</span><div><h3 id="step-slice">Escolha o sabor</h3><p>Selecione uma fatia para montar seu pedido.</p></div></div>
                <RadioGroup className="slice-grid" value={sliceProductId} onValueChange={(value) => { setSliceProductId(value); setSelectionMessage(""); }} aria-label="Sabor da fatia artesanal">
                  {SLICES.map((slice) => {
                    const selected = slice.id === sliceProductId;
                    const variant = slice.variants[0];
                    return (
                      <label className={`slice-card ${selected ? "is-selected" : ""} ${!slice.available || !variant.available ? "is-unavailable" : ""}`} htmlFor={`slice-${slice.id}`} key={slice.id}>
                        <RadioGroupItem id={`slice-${slice.id}`} value={slice.id} disabled={!slice.available || !variant.available} />
                        <span className="slice-media">
                          {slice.image ? <img src={slice.image} alt={slice.imageAlt} width="900" height="900" loading="lazy" /> : <span className="slice-placeholder"><CakeSlice size={30} strokeWidth={1.4} /><small>Fatia artesanal</small></span>}
                        </span>
                        <span className="slice-card-copy">
                          <strong>{slice.name}</strong>
                          {slice.subtitle && <em>{slice.subtitle}</em>}
                          <b>{currency.format(variant.price)}</b>
                        </span>
                        {selected && slice.available && variant.available && <span className="slice-selected"><Check size={14} strokeWidth={3} /></span>}
                        {(!slice.available || !variant.available) && <span className="slice-status">Esgotado hoje</span>}
                      </label>
                    );
                  })}
                </RadioGroup>
              </section>

              <section className="step-block" id="caldas" aria-labelledby="step-sauce">
                <div className="step-heading"><span className="step-number">2</span><div><h3 id="step-sauce">Escolha sua calda inclusa</h3><p>Sua fatia já acompanha 1 potinho de calda. Escolha o sabor:</p></div></div>
                <RadioGroup className="sauce-grid" value={sliceSauceId} onValueChange={(value) => { setSliceSauceId(value); setSelectionMessage(""); }} aria-label="Calda da fatia">
                  {SAUCES.map((sauce) => (
                    <label className={`sauce-card ${sliceSauceId === sauce.id ? "is-selected" : ""} ${!sauce.available ? "is-unavailable" : ""}`} htmlFor={`sauce-${sauce.id}`} key={sauce.id}>
                      <RadioGroupItem id={`sauce-${sauce.id}`} value={sauce.id} disabled={!sauce.available} />
                      <span className="sauce-tone" style={{ backgroundColor: sauce.tone }} aria-hidden="true" />
                      <span><strong>{sauce.name}</strong><small>{sauce.available ? "Já inclusa" : "Indisponível hoje"}</small></span>
                      {sliceSauceId === sauce.id && <Check size={16} />}
                    </label>
                  ))}
                </RadioGroup>
                <div className={`selection-helper ${selectionMessage ? "has-message" : ""}`} aria-live="polite">{selectionMessage || "Escolha Chocolate ou Ninho."}</div>
              </section>

              <section className="step-block" aria-labelledby="step-slice-quantity">
                <div className="step-heading compact-heading"><span className="step-number">3</span><div><h3 id="step-slice-quantity">Escolha a quantidade</h3><p>Você poderá ajustar novamente no carrinho.</p></div></div>
                <div className="quantity-row">
                  <div className="quantity-control" aria-label="Quantidade">
                    <Button type="button" variant="ghost" size="icon" onClick={() => setSliceQuantity((current) => Math.max(1, current - 1))} disabled={sliceQuantity === 1} aria-label="Diminuir quantidade"><Minus size={18} /></Button>
                    <strong aria-live="polite">{sliceQuantity}</strong>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setSliceQuantity((current) => current + 1)} aria-label="Aumentar quantidade"><Plus size={18} /></Button>
                  </div>
                  <div className="draft-total"><small>Subtotal</small><strong>{currency.format(selectedSliceVariant.price * sliceQuantity)}</strong></div>
                </div>
                <Button type="button" className="primary-cta add-button" onClick={addOrUpdateSlice} disabled={!STORE_CONFIG.acceptingOrders || !selectedSlice.available || !selectedSliceVariant.available}>
                  <ShoppingBag size={18} />{editingId ? "Salvar alterações" : "Adicionar ao pedido"}
                </Button>
                {editingId && <Button type="button" variant="ghost" className="cancel-edit" onClick={clearDraft}>Cancelar edição</Button>}
              </section>
            </div>
          )}
        </div>
      </section>

      <section className="extras-section" id="acompanhamentos">
        <div className="page-shell extras-shell">
          <div className="extras-heading"><div><p className="eyebrow">Complete seu pedido</p><h2>Refrigerantes</h2></div><p>Adicione com um toque. A quantidade pode ser ajustada no carrinho.</p></div>
          <div className="drink-grid">
            {DRINKS.map((drink) => {
              const variant = drink.variants[0];
              return (
                <article className={`drink-card ${!drink.available || !variant.available ? "is-unavailable" : ""}`} key={drink.id}>
                  <span className="drink-media">
                    {drink.image
                      ? <img src={drink.image} alt={drink.imageAlt} width="720" height="720" loading="lazy" />
                      : <CupSoda size={23} strokeWidth={1.6} />}
                  </span>
                  <div><strong>{drink.name}</strong><small>{variant.label}</small></div>
                  <b>{currency.format(variant.price)}</b>
                  <Button type="button" variant="outline" size="icon" onClick={() => addDrink(drink)} disabled={!STORE_CONFIG.acceptingOrders || !drink.available || !variant.available} aria-label={`Adicionar ${drink.name} ${variant.label}`}><Plus size={17} /></Button>
                  {(!drink.available || !variant.available) && <span className="drink-status">Indisponível</span>}
                </article>
              );
            })}
          </div>
          <p className="drink-message" aria-live="polite">{drinkMessage}</p>
        </div>
      </section>

      <section className="checkout-section" id="carrinho">
        <div className="page-shell checkout-grid">
          <div className="checkout-main">
            <section className="order-card" aria-labelledby="cart-title">
              <div className="order-card-heading">
                <div><p className="eyebrow">Carrinho</p><h2 id="cart-title">Seu pedido</h2></div>
                {cart.length > 0 && <span className="cart-count">{cartItemCount} {cartItemCount === 1 ? "item" : "itens"}</span>}
              </div>
              {restoredOrderNotice && cart.length > 0 && (
                <div className="restored-order-note" role="status">
                  <Check size={16} />
                  <span><strong>Pedido recuperado.</strong> Sua seleção anterior foi salva neste aparelho.</span>
                  <button type="button" onClick={() => setRestoredOrderNotice(false)} aria-label="Fechar aviso">Fechar</button>
                </div>
              )}
              {cart.length === 0 ? (
                <div className="empty-cart">
                  <ShoppingBag size={26} strokeWidth={1.5} /><strong>Seu pedido está vazio</strong><p>Escolha uma pipoca, uma fatia ou um refrigerante para começar.</p>
                  <Button type="button" variant="outline" onClick={() => scrollToSection("configurador")}>Escolher produtos</Button>
                </div>
              ) : (
                <div className="cart-list">
                  {cart.map((item) => {
                    const product = PRODUCTS.find((candidate) => candidate.id === item.productId)!;
                    const variant = product.variants.find((candidate) => candidate.id === item.variantId)!;
                    const optionNames = item.optionIds.map((id) => product.options.find((option) => option.id === id)?.name).filter(Boolean).join(", ");
                    return (
                      <article className="cart-item" key={item.id}>
                        <div className="cart-item-top">
                          <div>
                            <span className="product-category">{product.category}</span>
                            <h3>{productLabel(product)} · {variant.label}</h3>
                            {optionNames && product.optionLabel && <p>{product.optionLabel}: {optionNames}</p>}
                          </div>
                          <strong>{currency.format(variant.price * item.quantity)}</strong>
                        </div>
                        <div className="cart-item-actions">
                          <div className="mini-quantity">
                            <Button type="button" variant="ghost" size="icon" onClick={() => changeCartQuantity(item.id, -1)} disabled={item.quantity === 1} aria-label="Diminuir quantidade deste item"><Minus size={15} /></Button>
                            <span>{item.quantity}</span>
                            <Button type="button" variant="ghost" size="icon" onClick={() => changeCartQuantity(item.id, 1)} disabled={!STORE_CONFIG.acceptingOrders} aria-label="Aumentar quantidade deste item"><Plus size={15} /></Button>
                          </div>
                          {product.kind !== "drink" && <Button type="button" variant="ghost" className="text-action" onClick={() => editItem(item)}><Pencil size={15} /> Editar</Button>}
                          <Button type="button" variant="ghost" className="text-action destructive-action" onClick={() => removeItem(item.id)}><Trash2 size={15} /> Remover</Button>
                        </div>
                      </article>
                    );
                  })}
                  <div className="cart-subtotal"><span>Subtotal dos produtos</span><strong>{currency.format(cartSubtotal)}</strong></div>
                  <p className="cart-save-note"><Check size={14} /> Este pedido fica salvo neste aparelho por até 2 horas.</p>
                  <Button type="button" variant="outline" className="add-another" onClick={() => scrollToSection("configurador")}><Plus size={16} /> Adicionar outro produto</Button>
                </div>
              )}
            </section>

            <section className="order-card" id="recebimento" aria-labelledby="receiving-title">
              <div className="step-heading checkout-step-heading"><span className="step-number">4</span><div><h2 id="receiving-title">Como deseja receber?</h2><p>Escolha a opção mais conveniente.</p></div></div>
              <RadioGroup className="choice-grid" value={fulfillment} onValueChange={chooseFulfillment} aria-label="Forma de recebimento">
                <label className={`choice-card ${fulfillment === "entrega" ? "is-selected" : ""}`} htmlFor="receive-delivery">
                  <RadioGroupItem id="receive-delivery" value="entrega" /><Truck size={21} /><span><strong>Entrega</strong><small>A partir de R$8</small></span>
                </label>
                <label className={`choice-card ${fulfillment === "retirada" ? "is-selected" : ""}`} htmlFor="receive-pickup">
                  <RadioGroupItem id="receive-pickup" value="retirada" /><Store size={21} /><span><strong>Retirada</strong><small>Em Paragominas</small></span>
                </label>
              </RadioGroup>
              {fulfillment === "entrega" && (
                <div className="delivery-fields">
                  <div className="field-group delivery-zone-field">
                    <label id="delivery-zone-label">Região de entrega</label>
                    <Select value={deliveryZoneId} onValueChange={setDeliveryZoneId}>
                      <SelectTrigger className="delivery-select-trigger" aria-labelledby="delivery-zone-label">
                        <SelectValue placeholder="Selecione seu bairro ou região" />
                      </SelectTrigger>
                      <SelectContent className="delivery-select-content" align="start">
                        <SelectGroup>
                          <SelectLabel>Mais pedidas</SelectLabel>
                          {DELIVERY_ZONES.filter((zone) => zone.group === "mais-pedidas").map((zone) => (
                            <SelectItem key={zone.id} value={zone.id}>{zone.label} — {currency.format(zone.price)}</SelectItem>
                          ))}
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Outras regiões</SelectLabel>
                          {DELIVERY_ZONES.filter((zone) => zone.group === "outras-regioes").map((zone) => (
                            <SelectItem key={zone.id} value={zone.id}>{zone.label} — {currency.format(zone.price)}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {selectedDeliveryZone && (
                      <span className="delivery-price-preview">Taxa estimada: <strong>{currency.format(selectedDeliveryZone.price)}</strong></span>
                    )}
                  </div>
                  {selectedDeliveryZone?.asksNeighborhood && (
                    <div className="field-group"><label htmlFor="neighborhood">Bairro</label><Input id="neighborhood" value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} placeholder="Informe seu bairro" autoComplete="address-level3" /></div>
                  )}
                  <div className="field-group"><label htmlFor="address">Endereço</label><Input id="address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Rua, número e complemento" autoComplete="street-address" /></div>
                  <div className="field-group"><label htmlFor="reference">Ponto de referência</label><Input id="reference" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Ex.: próximo à praça" /></div>
                  <p className="field-note">A taxa é calculada automaticamente pela região e será confirmada no WhatsApp junto com o endereço.</p>
                </div>
              )}
              {fulfillment === "retirada" && <div className="pickup-note"><MapPin size={18} /><span><strong>Retirada disponível em Paragominas.</strong>O horário e o local serão confirmados no WhatsApp.</span></div>}
            </section>

            <section className="order-card" id="pagamento" aria-labelledby="payment-title">
              <div className="order-card-heading payment-heading"><div><p className="eyebrow">Pagamento</p><h2 id="payment-title">Como prefere pagar?</h2></div></div>
              <RadioGroup className="payment-list" value={payment} onValueChange={choosePayment} aria-label="Forma de pagamento">
                {[["pix", "Pix"], ["dinheiro", "Dinheiro"], ["cartao", "Cartão na entrega"]].map(([value, label]) => (
                  <label className={`payment-option ${payment === value ? "is-selected" : ""}`} htmlFor={`payment-${value}`} key={value}>
                    <RadioGroupItem id={`payment-${value}`} value={value} /><span>{label}</span>{payment === value && <Check size={17} />}
                  </label>
                ))}
              </RadioGroup>
              {payment === "dinheiro" && (
                <div className="change-box">
                  <div className="change-question"><span><strong>Precisa de troco?</strong><small>Opcional</small></span><div className="segmented-control">
                    <Button type="button" variant={!needsChange ? "default" : "ghost"} onClick={() => setNeedsChange(false)}>Não</Button>
                    <Button type="button" variant={needsChange ? "default" : "ghost"} onClick={() => setNeedsChange(true)}>Sim</Button>
                  </div></div>
                  {needsChange && <div className="field-group"><label htmlFor="change-for">Troco para quanto?</label><Input id="change-for" value={changeFor} onChange={(event) => setChangeFor(event.target.value)} placeholder="Ex.: R$ 100" inputMode="decimal" /></div>}
                </div>
              )}
            </section>
          </div>

          <aside className="summary-card" aria-labelledby="summary-title">
            <p className="eyebrow">Confira antes de enviar</p><h2 id="summary-title">Resumo do pedido</h2>
            <div className="summary-content">
              {cart.length === 0 ? <p className="summary-empty">Os produtos adicionados aparecerão aqui.</p> : cart.map((item, index) => {
                const product = PRODUCTS.find((candidate) => candidate.id === item.productId)!;
                const variant = product.variants.find((candidate) => candidate.id === item.variantId)!;
                const names = item.optionIds.map((id) => product.options.find((option) => option.id === id)?.name).filter(Boolean).join(", ");
                return (
                  <div className="summary-item" key={item.id}>
                    <div><strong>{item.quantity}x {productLabel(product)} {variant.label}</strong>{names && product.optionLabel && <p>{product.optionLabel}: {names}</p>}</div>
                    {product.kind !== "drink" && <Button type="button" variant="ghost" size="sm" onClick={() => editItem(item)} aria-label={`Editar item ${index + 1}`}>Editar</Button>}
                  </div>
                );
              })}
              <div className="summary-row"><span>Subtotal</span><strong>{currency.format(cartSubtotal)}</strong></div>
              {fulfillment === "entrega" && selectedDeliveryZone && (
                <div className="summary-row summary-delivery"><span>Taxa estimada de entrega</span><strong>{currency.format(deliveryFee)}</strong></div>
              )}
              {cart.length > 0 && (fulfillment === "retirada" || (fulfillment === "entrega" && selectedDeliveryZone)) && (
                <div className="summary-row summary-total"><span>Total estimado</span><strong>{currency.format(orderTotal)}</strong></div>
              )}
              <button type="button" className="summary-link" onClick={() => enterCheckout("recebimento")}><span><small>Recebimento</small><strong>{fulfillment === "entrega" ? selectedDeliveryZone ? `Entrega — ${selectedDeliveryZone.label} · ${currency.format(deliveryFee)}` : "Entrega — escolher região" : fulfillment === "retirada" ? "Retirada em Paragominas" : "Escolher opção"}</strong></span><ChevronRight size={18} /></button>
              <button type="button" className="summary-link" onClick={() => enterCheckout("pagamento")}><span><small>Pagamento</small><strong>{payment === "pix" ? "Pix" : payment === "dinheiro" ? "Dinheiro" : payment === "cartao" ? "Cartão na entrega" : "Escolher opção"}</strong></span><ChevronRight size={18} /></button>
            </div>
            <Button type="button" className="whatsapp-button" onClick={finishOnWhatsApp} disabled={!STORE_CONFIG.acceptingOrders} aria-describedby="checkout-status" data-event="whatsapp_checkout"><MessageCircle size={20} /> Finalizar pedido no WhatsApp</Button>
            <p id="checkout-status" className={checkoutReady ? "ready-status" : "checkout-status"} aria-live="polite">{checkoutReady && <Check size={14} />}{checkoutHint}</p>
          </aside>
        </div>
      </section>

      <section className="trust-section"><div className="page-shell trust-content"><Crown size={30} strokeWidth={1.4} aria-hidden="true" /><div><p className="eyebrow">Luciane Oliveira Doces</p><h2>Feito em Paragominas com muito recheio e cuidado em cada pedido.</h2></div></div></section>

      <footer><div className="page-shell footer-content"><div><strong>Luciane Oliveira Doces</strong><span>Paragominas–PA</span></div><div className="footer-details">{STORE_CONFIG.acceptingOrders ? <a href={tintimWhatsAppUrl("Olá! Quero fazer um pedido pelo cardápio online.")}><MessageCircle size={16} /> (91) 99362-3669</a> : <span className="footer-phone"><MessageCircle size={16} /> (91) 99362-3669</span>}<span>Entrega a partir de R$8.</span><span>Retirada disponível.</span></div></div></footer>

      <div className="mobile-sticky-bar">
        <div><small>{cart.length ? hasEstimatedTotal ? "Total estimado" : "Subtotal" : activeCategory === "pipocas" ? "Sua pipoca" : "Sua fatia"}</small><strong>{currency.format(cart.length ? hasEstimatedTotal ? orderTotal : cartSubtotal : draftSubtotal)}</strong></div>
        <Button type="button" onClick={stickyAction} disabled={!STORE_CONFIG.acceptingOrders}>
          {editingId
            ? "Salvar alterações"
            : cart.length
              ? checkoutReady ? "Finalizar no WhatsApp" : "Continuar pedido"
              : draftReady ? "Adicionar ao pedido" : activeCategory === "pipocas" ? "Escolher sabores" : "Escolher calda"}
          <ChevronRight size={17} />
        </Button>
      </div>
    </main>
  );
}
