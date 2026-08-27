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

type CategoryId = "pipocas" | "fatias";
type ProductKind = "popcorn" | "slice" | "drink";

type Variant = {
  id: string;
  label: string;
  whatsappLabel: string;
  price: number;
  maxOptions?: number;
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
  kind: ProductKind;
  category: string;
  name: string;
  subtitle?: string;
  image?: string;
  imageAlt?: string;
  optionLabel?: string;
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
type MetaEventName = "ViewContent" | "AddToCart" | "InitiateCheckout";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    __lucianeViewContentTracked?: boolean;
  }
}

const SAUCES: ProductOption[] = [
  {
    id: "calda-chocolate",
    name: "Chocolate",
    description: "Calda de chocolate.",
    tone: "#74412a",
    available: true,
  },
  {
    id: "calda-ninho",
    name: "Ninho",
    description: "Calda de Ninho.",
    tone: "#ead9ba",
    available: true,
  },
];

const PRODUCTS: Product[] = [
  {
    id: "pipoca-gourmet",
    kind: "popcorn",
    category: "Pipocas Gourmet",
    name: "Pipoca Gourmet",
    image: "/pipoca-gourmet.jpeg",
    imageAlt: "Pote real de Pipoca Gourmet com três sabores",
    optionLabel: "Sabores",
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
  {
    id: "fatia-chocolate-morango",
    kind: "slice",
    category: "Fatias Artesanais",
    name: "Chocolate com Morango",
    image: "/fatia-chocolate-morango.jpeg",
    imageAlt: "Fatia artesanal de chocolate com morango",
    optionLabel: "Calda",
    available: true,
    variants: [{ id: "fatia", label: "1 fatia", whatsappLabel: "1 fatia", price: 22, available: true }],
    options: SAUCES,
  },
  {
    id: "fatia-ninho-morango",
    kind: "slice",
    category: "Fatias Artesanais",
    name: "Ninho com Morango",
    subtitle: "Massa branca",
    image: "/fatia-ninho-morango.jpeg",
    imageAlt: "Fatia artesanal de Ninho com morango em massa branca",
    optionLabel: "Calda",
    available: true,
    variants: [{ id: "fatia", label: "1 fatia", whatsappLabel: "1 fatia", price: 22, available: true }],
    options: SAUCES,
  },
  {
    id: "fatia-chocolate-maracuja",
    kind: "slice",
    category: "Fatias Artesanais",
    name: "Chocolate com Maracujá",
    image: "/fatia-chocolate-maracuja.jpeg",
    imageAlt: "Fatia artesanal de chocolate com maracujá",
    optionLabel: "Calda",
    available: true,
    variants: [{ id: "fatia", label: "1 fatia", whatsappLabel: "1 fatia", price: 20, available: true }],
    options: SAUCES,
  },
  {
    id: "fatia-chocolatudo",
    kind: "slice",
    category: "Fatias Artesanais",
    name: "Chocolatudo",
    image: "/fatia-chocolatudo.jpeg",
    imageAlt: "Fatia artesanal de chocolate com recheio de chocolate",
    optionLabel: "Calda",
    available: true,
    variants: [{ id: "fatia", label: "1 fatia", whatsappLabel: "1 fatia", price: 20, available: true }],
    options: SAUCES,
  },
  {
    id: "fatia-chocolate-cenoura",
    kind: "slice",
    category: "Fatias Artesanais",
    name: "Chocolate com Cenoura",
    image: "/fatia-chocolate-cenoura.jpeg",
    imageAlt: "Fatia artesanal de bolo de cenoura com chocolate",
    optionLabel: "Calda",
    available: true,
    variants: [{ id: "fatia", label: "1 fatia", whatsappLabel: "1 fatia", price: 20, available: true }],
    options: SAUCES,
  },
  {
    id: "coca-cola-220",
    kind: "drink",
    category: "Refrigerantes",
    name: "Coca-Cola",
    image: "/coca-cola-220.jpeg",
    imageAlt: "Lata gelada de Coca-Cola 220 ml",
    available: true,
    variants: [{ id: "220ml", label: "220 ml", whatsappLabel: "220 ml", price: 5, available: true }],
    options: [],
  },
  {
    id: "coca-cola-350",
    kind: "drink",
    category: "Refrigerantes",
    name: "Coca-Cola",
    image: "/coca-cola-350.jpeg",
    imageAlt: "Lata gelada de Coca-Cola 350 ml",
    available: true,
    variants: [{ id: "350ml", label: "350 ml", whatsappLabel: "350 ml", price: 6, available: true }],
    options: [],
  },
  {
    id: "fanta-laranja-350",
    kind: "drink",
    category: "Refrigerantes",
    name: "Fanta Laranja",
    image: "/fanta-laranja-350.jpeg",
    imageAlt: "Lata gelada de Fanta Laranja 350 ml",
    available: true,
    variants: [{ id: "350ml", label: "350 ml", whatsappLabel: "350 ml", price: 5, available: true }],
    options: [],
  },
];

const POPCORN = PRODUCTS.find((product) => product.kind === "popcorn")!;
const SLICES = PRODUCTS.filter((product) => product.kind === "slice");
const DRINKS = PRODUCTS.filter((product) => product.kind === "drink");
const TINTIM_SITE_LINK = "https://tintim.link/whatsapp/2c956a42-229f-4d21-ade6-4442f8c048ed/7522df92-bbe1-4bff-83ca-2629bba182eb";
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

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>("pipocas");
  const [popcornVariantId, setPopcornVariantId] = useState("500ml");
  const [popcornOptionIds, setPopcornOptionIds] = useState<string[]>([]);
  const [popcornQuantity, setPopcornQuantity] = useState(1);
  const [sliceProductId, setSliceProductId] = useState(SLICES[0].id);
  const [sliceSauceId, setSliceSauceId] = useState("");
  const [sliceQuantity, setSliceQuantity] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectionMessage, setSelectionMessage] = useState("");
  const [drinkMessage, setDrinkMessage] = useState("");
  const [fulfillment, setFulfillment] = useState<Fulfillment>("");
  const [neighborhood, setNeighborhood] = useState("");
  const [address, setAddress] = useState("");
  const [reference, setReference] = useState("");
  const [payment, setPayment] = useState<Payment>("");
  const [needsChange, setNeedsChange] = useState(false);
  const [changeFor, setChangeFor] = useState("");
  const checkoutStartedRef = useRef(false);

  useEffect(() => {
    if (window.__lucianeViewContentTracked) return;
    if (trackMetaEvent("ViewContent")) {
      window.__lucianeViewContentTracked = true;
    }
  }, []);

  useEffect(() => {
    const category = new URLSearchParams(window.location.search).get("categoria");
    if (category === "fatias") setActiveCategory("fatias");
  }, []);

  const popcornVariant = POPCORN.variants.find((variant) => variant.id === popcornVariantId)!;
  const popcornMaxOptions = popcornVariant.maxOptions ?? 0;
  const popcornLimitReached = popcornOptionIds.length >= popcornMaxOptions;
  const selectedSlice = SLICES.find((product) => product.id === sliceProductId)!;
  const selectedSliceVariant = selectedSlice.variants[0];

  const cartSubtotal = useMemo(
    () => cart.reduce((total, item) => {
      const product = PRODUCTS.find((candidate) => candidate.id === item.productId);
      const variant = product?.variants.find((candidate) => candidate.id === item.variantId);
      return total + (variant?.price ?? 0) * item.quantity;
    }, 0),
    [cart],
  );

  const popcornReady = POPCORN.available && popcornVariant.available && popcornOptionIds.length > 0;
  const sliceReady = selectedSlice.available && selectedSliceVariant.available && Boolean(sliceSauceId);
  const draftReady = activeCategory === "pipocas" ? popcornReady : sliceReady;
  const draftSubtotal = activeCategory === "pipocas"
    ? popcornVariant.price * popcornQuantity
    : selectedSliceVariant.price * sliceQuantity;
  const addressReady = fulfillment !== "entrega" || Boolean(neighborhood.trim() && address.trim() && reference.trim());
  const paymentReady = Boolean(payment) && (payment !== "dinheiro" || !needsChange || Boolean(changeFor.trim()));
  const checkoutReady = cart.length > 0 && Boolean(fulfillment) && addressReady && paymentReady;

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
    if (checkoutStartedRef.current || cart.length === 0) return;
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
    if (!product.available || !product.variants[0].available) return;
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
    if (delta > 0) {
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

    return `Olá! Quero finalizar meu pedido na Luciane Oliveira Doces.\n\n*Pedido*\n${orderLines}\n\n*Recebimento*\n${receivingLines}\n\n*Pagamento*\n${paymentLabel}\n\nSubtotal dos produtos: ${currency.format(cartSubtotal)}\n${deliveryLine}`;
  }

  function finishOnWhatsApp() {
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

  const checkoutHint = !cart.length
    ? "Adicione pelo menos um produto ao pedido."
    : !fulfillment
      ? "Escolha entrega ou retirada."
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

          {activeCategory === "pipocas" ? (
            <div className="builder-card">
              <section className="step-block" aria-labelledby="step-size">
                <div className="step-heading"><span className="step-number">1</span><div><h3 id="step-size">Escolha o tamanho</h3><p>O preço e o limite de sabores mudam conforme o pote.</p></div></div>
                <RadioGroup className="size-grid" value={popcornVariantId} onValueChange={choosePopcornVariant} aria-label="Tamanho da Pipoca Gourmet">
                  {POPCORN.variants.map((variant) => (
                    <label className={`size-card ${variant.id === popcornVariantId ? "is-selected" : ""} ${!variant.available ? "is-unavailable" : ""}`} htmlFor={`size-${variant.id}`} key={variant.id}>
                      <RadioGroupItem id={`size-${variant.id}`} value={variant.id} disabled={!variant.available} />
                      <span className="size-copy"><strong>{variant.label}</strong><b>{currency.format(variant.price)}</b><small>Até {variant.maxOptions} sabores</small></span>
                      {variant.id === popcornVariantId && variant.available && <span className="selected-check" aria-hidden="true"><Check size={14} strokeWidth={3} /></span>}
                      {!variant.available && <span className="unavailable-label">Indisponível</span>}
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
                <Button type="button" className="primary-cta add-button" onClick={addOrUpdatePopcorn} disabled={!POPCORN.available || !popcornVariant.available}>
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
                      <label className={`slice-card ${selected ? "is-selected" : ""} ${!slice.available ? "is-unavailable" : ""}`} htmlFor={`slice-${slice.id}`} key={slice.id}>
                        <RadioGroupItem id={`slice-${slice.id}`} value={slice.id} disabled={!slice.available} />
                        <span className="slice-media">
                          {slice.image ? <img src={slice.image} alt={slice.imageAlt} width="900" height="900" loading="lazy" /> : <span className="slice-placeholder"><CakeSlice size={30} strokeWidth={1.4} /><small>Fatia artesanal</small></span>}
                        </span>
                        <span className="slice-card-copy">
                          <strong>{slice.name}</strong>
                          {slice.subtitle && <em>{slice.subtitle}</em>}
                          <b>{currency.format(variant.price)}</b>
                        </span>
                        {selected && slice.available && <span className="slice-selected"><Check size={14} strokeWidth={3} /></span>}
                        {!slice.available && <span className="slice-status">Esgotado hoje</span>}
                      </label>
                    );
                  })}
                </RadioGroup>
              </section>

              <section className="step-block" id="caldas" aria-labelledby="step-sauce">
                <div className="step-heading"><span className="step-number">2</span><div><h3 id="step-sauce">Escolha sua calda inclusa</h3><p>Sua fatia já acompanha 1 potinho de calda. Escolha o sabor:</p></div></div>
                <RadioGroup className="sauce-grid" value={sliceSauceId} onValueChange={(value) => { setSliceSauceId(value); setSelectionMessage(""); }} aria-label="Calda da fatia">
                  {SAUCES.map((sauce) => (
                    <label className={`sauce-card ${sliceSauceId === sauce.id ? "is-selected" : ""}`} htmlFor={`sauce-${sauce.id}`} key={sauce.id}>
                      <RadioGroupItem id={`sauce-${sauce.id}`} value={sauce.id} disabled={!sauce.available} />
                      <span className="sauce-tone" style={{ backgroundColor: sauce.tone }} aria-hidden="true" />
                      <span><strong>{sauce.name}</strong><small>Já inclusa</small></span>
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
                <Button type="button" className="primary-cta add-button" onClick={addOrUpdateSlice} disabled={!selectedSlice.available || !selectedSliceVariant.available}>
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
                <article className={`drink-card ${!drink.available ? "is-unavailable" : ""}`} key={drink.id}>
                  <span className="drink-media">
                    {drink.image
                      ? <img src={drink.image} alt={drink.imageAlt} width="720" height="720" loading="lazy" />
                      : <CupSoda size={23} strokeWidth={1.6} />}
                  </span>
                  <div><strong>{drink.name}</strong><small>{variant.label}</small></div>
                  <b>{currency.format(variant.price)}</b>
                  <Button type="button" variant="outline" size="icon" onClick={() => addDrink(drink)} disabled={!drink.available || !variant.available} aria-label={`Adicionar ${drink.name} ${variant.label}`}><Plus size={17} /></Button>
                  {!drink.available && <span className="drink-status">Indisponível</span>}
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
                {cart.length > 0 && <span className="cart-count">{cart.reduce((total, item) => total + item.quantity, 0)} {cart.reduce((total, item) => total + item.quantity, 0) === 1 ? "item" : "itens"}</span>}
              </div>
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
                            <Button type="button" variant="ghost" size="icon" onClick={() => changeCartQuantity(item.id, 1)} aria-label="Aumentar quantidade deste item"><Plus size={15} /></Button>
                          </div>
                          {product.kind !== "drink" && <Button type="button" variant="ghost" className="text-action" onClick={() => editItem(item)}><Pencil size={15} /> Editar</Button>}
                          <Button type="button" variant="ghost" className="text-action destructive-action" onClick={() => removeItem(item.id)}><Trash2 size={15} /> Remover</Button>
                        </div>
                      </article>
                    );
                  })}
                  <div className="cart-subtotal"><span>Subtotal dos produtos</span><strong>{currency.format(cartSubtotal)}</strong></div>
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
                  <div className="field-group"><label htmlFor="neighborhood">Bairro</label><Input id="neighborhood" value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} placeholder="Informe seu bairro" autoComplete="address-level3" /></div>
                  <div className="field-group"><label htmlFor="address">Endereço</label><Input id="address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Rua, número e complemento" autoComplete="street-address" /></div>
                  <div className="field-group"><label htmlFor="reference">Ponto de referência</label><Input id="reference" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Ex.: próximo à praça" /></div>
                  <p className="field-note">A taxa final de entrega será confirmada no WhatsApp de acordo com o endereço.</p>
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
              <button type="button" className="summary-link" onClick={() => enterCheckout("recebimento")}><span><small>Recebimento</small><strong>{fulfillment === "entrega" ? "Entrega — taxa a confirmar" : fulfillment === "retirada" ? "Retirada em Paragominas" : "Escolher opção"}</strong></span><ChevronRight size={18} /></button>
              <button type="button" className="summary-link" onClick={() => enterCheckout("pagamento")}><span><small>Pagamento</small><strong>{payment === "pix" ? "Pix" : payment === "dinheiro" ? "Dinheiro" : payment === "cartao" ? "Cartão na entrega" : "Escolher opção"}</strong></span><ChevronRight size={18} /></button>
            </div>
            <Button type="button" className="whatsapp-button" onClick={finishOnWhatsApp} aria-describedby="checkout-status" data-event="whatsapp_checkout"><MessageCircle size={20} /> Finalizar pedido no WhatsApp</Button>
            <p id="checkout-status" className={checkoutReady ? "ready-status" : "checkout-status"} aria-live="polite">{checkoutReady && <Check size={14} />}{checkoutHint}</p>
          </aside>
        </div>
      </section>

      <section className="trust-section"><div className="page-shell trust-content"><Crown size={30} strokeWidth={1.4} aria-hidden="true" /><div><p className="eyebrow">Luciane Oliveira Doces</p><h2>Feito em Paragominas com muito recheio e cuidado em cada pedido.</h2></div></div></section>

      <footer><div className="page-shell footer-content"><div><strong>Luciane Oliveira Doces</strong><span>Paragominas–PA</span></div><div className="footer-details"><a href={tintimWhatsAppUrl("Olá! Quero fazer um pedido pelo cardápio online.")}><MessageCircle size={16} /> (91) 99362-3669</a><span>Entrega a partir de R$8.</span><span>Retirada disponível.</span></div></div></footer>

      <div className="mobile-sticky-bar">
        <div><small>{cart.length ? "Subtotal" : activeCategory === "pipocas" ? "Sua pipoca" : "Sua fatia"}</small><strong>{currency.format(cart.length ? cartSubtotal : draftSubtotal)}</strong></div>
        <Button type="button" onClick={stickyAction}>
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
