"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CakeSlice,
  Check,
  Clock3,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Crown,
  CupSoda,
  LoaderCircle,
  Mail,
  MapPin,
  MessageCircle,
  Minus,
  Pencil,
  Phone,
  Plus,
  QrCode,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
  UserRound,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DeliveryLocalityPicker } from "@/components/delivery-locality-picker";
import { deliveryLocalityById, deliveryLegacyLocality, deliveryLocalityCanQuote } from "@/supabase/functions/_shared/delivery-localities.mjs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  DELIVERY_ZONES,
  DELIVERY_TIME_ESTIMATE,
  DRINKS,
  CONES,
  POPCORN,
  popcornPrice,
  PRODUCTS,
  SLICES,
  SLICE_WEIGHT_GRAMS,
  SLICE_OPTIONS,
  sliceSauceOptions,
  STORE_CONFIG,
  type CategoryId,
  type Product,
  type ProductOption,
  type Variant,
} from "@/app/catalog";
import {
  CATEGORY_ITEM_KEYS,
  CONE_ITEM_KEYS,
  TRUFADA_STOCK_ITEM_KEYS,
  trufadaStockItemKey,
  POPCORN_FLAVOR_ITEM_KEYS,
  POPCORN_SIZE_ITEM_KEYS,
  SLICE_ITEM_KEYS,
  isItemAvailable,
  isItemVisible,
  statusFor,
  type AvailabilitySnapshot,
} from "@/app/menu-availability";
import { categoryFromUrl, trufadasFromUrl, categoryUrl, publicCategories, resolveMenuCategory } from "@/app/menu-navigation";
import { useMenuAvailability } from "@/hooks/use-menu-availability";
import { isLastSlicesWindow, LAST_SLICES_PRODUCT_IDS } from "@/app/last-slices-campaign";
import { usePopcornPromotion } from "@/hooks/use-popcorn-promotion";
import { gourmetFlavorScrollTop } from "@/lib/gourmet-guided-scroll";
import { orderCheckoutComplements } from "@/lib/checkout-complement-order.mjs";
import { getLimitedCupPhase, type LimitedCupPhase } from "@/app/limited-cup-release";
import { isPopcornPromotionActive, POPCORN_PROMOTION } from "@/supabase/functions/_shared/popcorn-promotion.mjs";
import { GOURMET_HOLIDAY_CREATIVE } from "@/lib/storefront-campaign-creative";
import { StorefrontCampaignEditorial } from "@/components/storefront-campaign-editorial";
import {
  buildRegisteredOrderMessage, captureOrderAttribution, cleanWhatsAppField, formatOrderMoney, newOrderContext,
  parseCashCents, paymentDescription, restoreOrderContext,
  type CheckoutDetails, type OrderAttribution, type OrderContext,
} from "@/app/order-checkout";
import { mergeMarketingInteractions } from "@/app/attribution-history";
import { MercadoPagoCardForm } from "@/components/mercado-pago-card-form";
import { WhatsAppOrderResultView, type RegisteredWhatsAppOrder } from "@/components/whatsapp-order-result";
import { tintimWhatsAppUrl } from "@/lib/tintim";
import { TintimContactLink } from "@/components/tintim-contact-link";
import { HomeLastOrderLink } from "@/components/home-last-order";
import { SiteOrderResultView } from "@/components/site-order-result";
import { deliveryZoneMismatchMessage } from "@/supabase/functions/_shared/commerce-catalog.mjs";
import { RECEIPT_CARD_NOTICE, receiptCardQuote } from "@/lib/manual-payment-policy";
import { getCommercePublicConfiguration } from "@/lib/commerce-config";
import {
  createSiteOrder, createWhatsAppOrder, rememberOrder, lastOrderToken,
  isGatewayFailed,
  sitePaymentLabel,
  SiteOrderError,
  type MercadoPagoCardData,
  type SiteOrderResult,
  type SitePaymentMethod,
} from "@/lib/site-order";

type CartItem = {
  id: string;
  productId: string;
  variantId: string;
  optionIds: string[];
  quantity: number;
};

/** Rótulos de recompra devem refletir o carrinho, sem tratar Crocantes como potes Gourmet. */
function addMoreButtonLabel(category: CategoryId, cart: CartItem[]): string {
  if (category === "cones") return cart.some(item => CONES.some(cone => cone.id === item.productId))
    ? "Outro cone" : "Adicionar cone";
  if (category === "pipocas") {
    return cart.some((item) => item.productId === POPCORN.id)
      ? "Outro pote recheado" : "Adicionar pote recheado";
  }
  return cart.some((item) => SLICES.some((slice) => slice.id === item.productId))
    ? "Outra fatia" : "Adicionar fatia";
}

type Fulfillment = "entrega" | "retirada" | "";
type WhatsAppPayment = "pix" | "dinheiro" | "cartao" | "credito" | "debito";
type Payment = WhatsAppPayment | SitePaymentMethod | "";
type CheckoutChannel = "site" | "whatsapp";
type MetaEventName = "ViewContent" | "AddToCart" | "InitiateCheckout" | "AddPaymentInfo";
type StepState = "active" | "complete" | "locked";
type AddedNotice = {
  category: CategoryId;
  productId: string;
  description: string;
};

type CartAvailabilityIssue = {
  cartItemId: string;
  itemLabel: string;
  reasons: string[];
};

type SavedOrder = {
  version: 2;
  cart: CartItem[];
  fulfillment: Fulfillment;
  deliveryZoneId: string;
  deliveryLocalityId?: string;
  neighborhood: string;
  address: string;
  addressNumber?: string;
  complement?: string;
  reference: string;
  order?: OrderContext | null;
  order_details?: CheckoutDetails;
  payment: Payment;
  checkoutChannel?: CheckoutChannel;
  notes?: string;
  whatsappResult?: RegisteredWhatsAppOrder | null;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  siteResult?: SiteOrderResult | null;
  needsChange: boolean;
  changeFor: string;
  initiateCheckoutTracked?: boolean;
  paymentInfoTracked?: boolean;
};

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    __lucianeViewContentTracked?: boolean;
  }
}

const PIX_DETAILS = {
  holder: "Luciane Galvão de Oliveira",
  key: "03611974200",
  keyType: "CPF",
} as const;
const ORDER_STORAGE_KEY = "luciane-order-session-v2";
const LEGACY_ORDER_STORAGE_KEY = "luciane-order-v1";
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const COMMERCE_CONFIG = getCommercePublicConfiguration();
const SITE_PAYMENT_METHODS: SitePaymentMethod[] = ["mercado_pago_pix", "mercado_pago_card", "card_on_delivery", "cash"];

function StepMarker({ number, state }: { number: number; state: StepState }) {
  return (
    <span
      className="step-number"
      data-state={state}
      aria-label={state === "complete" ? `Etapa ${number} concluída` : `Etapa ${number}`}
    >
      {state === "complete" ? <Check size={15} strokeWidth={3} aria-hidden="true" /> : number}
    </span>
  );
}

function isCategoryEnabled(category: CategoryId) {
  return STORE_CONFIG.enabledCategories[category];
}

function isProductEnabled(product: Product) {
  if (product.kind === "popcorn") return isCategoryEnabled("pipocas");
  if (product.kind === "slice") return isCategoryEnabled("fatias");
  if (product.kind === "cone") return isCategoryEnabled("cones");
  return STORE_CONFIG.enabledExtras.drinks;
}

function isSitePayment(value: Payment): value is SitePaymentMethod {
  return SITE_PAYMENT_METHODS.includes(value as SitePaymentMethod);
}

function isWhatsAppPayment(value: Payment): value is WhatsAppPayment {
  return value === "pix" || value === "dinheiro" || value === "cartao" || value === "credito" || value === "debito";
}

let navigationByKeyboard = false;

function scrollToSection(id: string) {
  const element = document.getElementById(id);
  if (!element) return;
  const target = element.matches("input, select") ? element.closest<HTMLElement>(".field-group") ?? element : element;
  const heading = target.querySelector<HTMLElement>("h1, h2, h3") ?? target.closest<HTMLElement>(".field-group") ?? target;
  const previousTabIndex = heading.getAttribute("tabindex");
  heading.setAttribute("tabindex", "-1");
  heading.setAttribute("data-navigation-focus", navigationByKeyboard ? "keyboard" : "pointer");
  heading.addEventListener("blur", () => {
    heading.removeAttribute("data-navigation-focus");
    if (previousTabIndex === null) heading.removeAttribute("tabindex");
    else heading.setAttribute("tabindex", previousTabIndex);
  }, { once: true });
  heading.focus({ preventScroll: true });
  target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}

/**
 * Navegação Gourmet orientada à ação real: nunca aponta para o aviso da
 * promoção ou para a foto informativa do pote. O alvo é o primeiro controle
 * disponível, com espaço para a barra inferior e o topo do iPhone.
 */
function scrollToGourmetControl(step: "size" | "flavor" | "quantity") {
  const target = step === "size"
    ? document.querySelector<HTMLElement>("#tamanhos .size-card:not(.is-unavailable)")
    : step === "flavor"
      ? document.querySelector<HTMLElement>("#sabores .flavor-card:not(.is-disabled)")
      : document.querySelector<HTMLElement>("#quantidade-pipocas .quantity-row");
  if (!target) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const offset = Math.max(80, Math.min(124, Math.round(window.innerHeight * 0.15)));
  // Na escolha dos recheios, preserva a foto, tamanho e preço do pote
  // sem esconder a primeira opção disponível quando o viewport permitir.
  const stage = step === "flavor"
    ? document.querySelector<HTMLElement>("#sabores .boutique-flavor-stage")
    : null;
  const desired = stage
    ? gourmetFlavorScrollTop({
        scrollY: window.scrollY,
        stageY: stage.getBoundingClientRect().top,
        firstFlavorY: target.getBoundingClientRect().top,
        viewportHeight: window.innerHeight,
      })
    : Math.max(0, window.scrollY + target.getBoundingClientRect().top - offset);
  // Não mover o foco no toque: Safari com VoiceOver/teclado e rolagem suave
  // têm comportamentos diferentes. Para teclado, focar o controle alcançado.
  if (navigationByKeyboard) {
    const control = target.querySelector<HTMLElement>('button[role="radio"], button[role="checkbox"], button:not([disabled])');
    control?.focus({ preventScroll: true });
  }
  window.scrollTo({ top: desired, behavior: reducedMotion ? "instant" : "smooth" });
}

// Navegação previsível entre a edição e o pedido tradicional no Safari.
function jumpToEditorialSection(id: "tamanhos" | "edicao-crocante") {
  const target = document.getElementById(id);
  if (!target) return;
  const top = Math.max(0, window.scrollY + target.getBoundingClientRect().top - 16);
  // Safari/WebKit pode interromper a rolagem quando o foco é movido depois.
  // Primeiro posicionamos o foco acessível; depois iniciamos a rolagem.
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const heading = id === "tamanhos"
    ? document.getElementById("step-size")
    : target.querySelector<HTMLElement>(".limited-cup-selection-heading");
  if (heading) {
    const previousTabIndex = heading.getAttribute("tabindex");
    heading.setAttribute("tabindex", "-1");
    heading.setAttribute("data-editorial-navigation-focus", navigationByKeyboard ? "keyboard" : "pointer");
    heading.addEventListener("blur", () => {
      heading.removeAttribute("data-editorial-navigation-focus");
      if (previousTabIndex === null) heading.removeAttribute("tabindex");
      else heading.setAttribute("tabindex", previousTabIndex);
    }, { once: true });
    heading.focus({ preventScroll: true });
  }
  if (id === "edicao-crocante") {
    // Safari pode ignorar um scroll disparado no mesmo frame da troca de categoria.
    const originY = window.scrollY;
    target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    if (!reducedMotion && Math.abs(top - originY) > 40) {
      window.setTimeout(() => {
        if (!target.isConnected) return;
        // Só recupera o scroll realmente ignorado; nunca interrompe quem já rolou.
        const distance = target.getBoundingClientRect().top - 16;
        if (Math.abs(window.scrollY - originY) < 12 && distance > 60) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 460);
    }
  } else {
    window.scrollTo({ top, behavior: reducedMotion ? "instant" : "smooth" });
  }
}

function makeCartId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const TRUFADA_PRODUCT_IDS = ["crocante-ninho", "trufada-pacoca", "trufada-coco-queimado"] as const;
type TrufadaProductId = (typeof TRUFADA_PRODUCT_IDS)[number];
const isTrufadaId = (id: string) => (TRUFADA_PRODUCT_IDS as readonly string[]).includes(id);
// O preço da vitrine vem do catálogo real e acompanha mudanças comerciais.
const TRUFADA_STARTING_PRICE = Math.min(
  ...PRODUCTS.filter(product => isTrufadaId(product.id))
    .flatMap(product => product.variants.filter(variant => variant.available).map(variant => variant.price)),
);
const isTrufadaOrLegacy = (id: string) => isTrufadaId(id) || id === "crocante-chocolate";
const TRUFADA_SIZES = ["p", "m", "g"] as const;
type TrufadaSizeId = (typeof TRUFADA_SIZES)[number];
function productLabel(product: Product) {
  if (isTrufadaOrLegacy(product.id)) {
    return `Pipocas Trufadas — ${product.name}`;
  }
  if (product.kind === "cone") return `Cone Trufado — ${product.name}`;
  return product.subtitle
    ? `${product.name} (${product.subtitle.toLowerCase()})`
    : product.name;
}

// Nome resumido somente para elementos visuais da compra.
function productCheckoutLabel(product: Product) {
  return product.cardName ?? productLabel(product);
}

function trackMetaEvent(eventName: MetaEventName, payload?: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return false;
  if (payload) window.fbq("track", eventName, payload);
  else window.fbq("track", eventName);
  return true;
}

function itemUnitPrice(product: Product, variant: Variant, optionIds: string[] = [], now = Date.now()) {
  // Carrinhos com tamanho retirado ficam sem valor de venda até serem corrigidos.
  if (variant.retired) return 0;
  return product.kind === "popcorn" && !isTrufadaOrLegacy(product.id) ? popcornPrice(variant.id, optionIds, now) : variant.price;
}

function unavailableReason(snapshot: AvailabilitySnapshot, itemKey: string, label: string) {
  return statusFor(snapshot, itemKey) === "sold_out"
    ? `${label} esgotou.`
    : `${label} não está mais disponível no cardápio.`;
}

function cartAvailabilityIssues(
  cart: CartItem[],
  snapshot: AvailabilitySnapshot,
): CartAvailabilityIssue[] {
  return cart.flatMap((item) => {
    const product = PRODUCTS.find((candidate) => candidate.id === item.productId);
    const variant = product?.variants.find((candidate) => candidate.id === item.variantId);
    if (!product || !variant) {
      return [{ cartItemId: item.id, itemLabel: "Item do pedido", reasons: ["O item não existe mais no catálogo."] }];
    }

    const category = product.kind === "popcorn" ? "pipocas" : product.kind === "slice" ? "fatias" : product.kind === "cone" ? "cones" : null;
    const reasons: string[] = [];

    if (variant.retired) {
      reasons.push(`O tamanho ${variant.label} saiu do cardápio. Escolha 500 ml, 750 ml ou 1 litro.`);
    } else if (!product.available || !variant.available || !isProductEnabled(product)) {
      reasons.push(`${productLabel(product)} está indisponível no momento.`);
    }

    if (category) {
      const categoryKey = CATEGORY_ITEM_KEYS[category];
      if (!isItemAvailable(snapshot, categoryKey)) {
        reasons.push(unavailableReason(snapshot, categoryKey, product.category));
      }
    }

    if (isTrufadaOrLegacy(product.id)) {
      const key = trufadaStockItemKey(product.id, variant.id);
      if (snapshot.source !== "supabase" || !key || !isItemAvailable(snapshot, key) || !snapshot.stockChecked) {
        reasons.push("Pacote indisponível no momento.");
      } else {
        // Soma as quantidades do mesmo sabor no carrinho: a reserva no banco
        // acontece somente na finalização, nunca ao tocar em "adicionar".
        const requested = cart.filter(entry => entry.productId === item.productId && entry.variantId === item.variantId)
          .reduce((sum, entry) => sum + entry.quantity, 0);
        const left = snapshot.stockRemaining[key] ?? 0;
        if (requested > left) reasons.push(`Há apenas ${left} ${left === 1 ? "pacote disponível" : "pacotes disponíveis"} deste sabor. Ajuste a quantidade.`);
      }
    } else if (product.kind === "popcorn") {
      const sizeKey = POPCORN_SIZE_ITEM_KEYS[variant.id];
      if (sizeKey && !isItemAvailable(snapshot, sizeKey)) {
        reasons.push(unavailableReason(snapshot, sizeKey, `O tamanho ${variant.label}`));
      }
      for (const optionId of item.optionIds) {
        const option = product.options.find((candidate) => candidate.id === optionId);
        const flavorKey = POPCORN_FLAVOR_ITEM_KEYS[optionId];
        if (!option?.available || (flavorKey && !isItemAvailable(snapshot, flavorKey))) {
          reasons.push(flavorKey
            ? unavailableReason(snapshot, flavorKey, `O sabor ${option?.name ?? optionId}`)
            : `O sabor ${option?.name ?? optionId} está indisponível.`);
        }
      }
    }

    if (product.kind === "cone") {
      const coneKey = CONE_ITEM_KEYS[product.id];
      if (item.optionIds.length !== 0 || variant.id !== "unidade") reasons.push("Este cone não admite personalização ou outro tamanho.");
      if (!coneKey || !isItemAvailable(snapshot, coneKey)) reasons.push(unavailableReason(snapshot, coneKey ?? "", productLabel(product)));
      if (snapshot.source !== "supabase") reasons.push("Não foi possível confirmar a disponibilidade dos cones.");
    }

    if (product.kind === "slice") {
      if (item.optionIds.length !== 1 || !SLICE_OPTIONS.some(option => option.id === item.optionIds[0])) reasons.push("Escolha uma opção de calda ou sem calda editando esta fatia.");
      const sliceKey = SLICE_ITEM_KEYS[product.id];
      if (sliceKey && !isItemAvailable(snapshot, sliceKey)) {
        reasons.push(unavailableReason(snapshot, sliceKey, productLabel(product)));
      }
      if (product.id === "fatia-chocolate-morango" && snapshot.slicePreorder?.active) {
        const requested = cart.filter(entry=>entry.productId===product.id).reduce((sum,entry)=>sum+entry.quantity,0);
        if (requested > snapshot.slicePreorder.remaining)
          reasons.push("Não há fatias suficientes para pré-reserva. Reduza a quantidade.");
      }
    }

    const uniqueReasons = [...new Set(reasons)];
    return uniqueReasons.length > 0
      ? [{ cartItemId: item.id, itemLabel: productLabel(product), reasons: uniqueReasons }]
      : [];
  });
}

function metaProductPayload(product: Product, variant: Variant, quantity: number, optionIds: string[] = []) {
  const contentId = `${product.id}:${variant.id}`;
  const unitPrice = itemUnitPrice(product, variant, optionIds);
  return {
    content_name: productLabel(product),
    content_category: product.category,
    content_ids: [contentId],
    content_type: "product",
    contents: [{ id: contentId, quantity, item_price: unitPrice }],
    currency: "BRL",
    value: unitPrice * quantity,
    num_items: quantity,
  };
}

function sanitizeSavedCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const item = candidate as Partial<CartItem>;
    const product = PRODUCTS.find((current) => current.id === item.productId);
    const variant = product?.variants.find((current) => current.id === item.variantId);
    if (!product?.available || !variant || (!variant.available && !variant.retired) || !isProductEnabled(product)) return [];

    const optionIds = product.kind !== "drink" && Array.isArray(item.optionIds)
      ? item.optionIds.filter((id): id is string => typeof id === "string" && (product.kind !== "slice" || product.options.some(option => option.id === id)))
      : [];
    const optionsAreAvailable = optionIds.every((id) => product.options.some((option) => option.id === id && option.available));
    const optionsAreValid = isTrufadaOrLegacy(product.id) ? optionIds.length === 0
      : product.kind === "popcorn"
      ? optionIds.length > 0 && optionIds.length <= (variant.maxOptions ?? 0) && new Set(optionIds).size === optionIds.length
      : product.kind === "slice" ? optionIds.length <= 1 : optionIds.length === 0;
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

// Recortes específicos da mesma foto real, sem gerar nova embalagem, sabor ou fundo.
function GourmetCheckoutCrop({ context }: { context: "cart" | "added" }) {
  return (
    <svg
      className="gourmet-checkout-crop"
      viewBox={context === "cart" ? "70 360 760 860" : "130 430 640 720"}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
      onContextMenu={(event) => event.preventDefault()}
    >
      <image href="/pipoca-gourmet.jpeg" x="0" y="0" width="900" height="1600" preserveAspectRatio="none" />
    </svg>
  );
}

function CollectionChoice({ format, name, description, action, price, photo, photoWidth, fallback, disabled, onClick }: {
  format: string; name: string; description: string; action: string; photo: string; photoWidth: number;
  fallback?: string; price?: string; disabled: boolean; onClick: () => void;
}) {
  return (
    <button className="collection-choice" data-featured={format === "Pacotes com zíper" || undefined} type="button" disabled={disabled} onClick={onClick} aria-label={`${name} — ${action}`}>
      <span className="collection-photo" data-packs={format === "Pacotes com zíper" || undefined} onContextMenu={(event) => event.preventDefault()}>
        <img src={photo} srcSet={`${photo.replace(".webp", "-360.webp")} 360w, ${photo} ${photoWidth}w`} sizes="(min-width: 1152px) 374px, (min-width: 700px) 33vw, 36vw" alt="" draggable={false} decoding="async" width={640} height={480} onError={(event) => {
          const img = event.currentTarget;
          if (img.hasAttribute("srcset")) {
            img.removeAttribute("srcset");
            img.src = photo;
          } else if (fallback && img.getAttribute("src") !== fallback) img.src = fallback;
        }} />
        {format === "Pacotes com zíper" && (
          <img className="collection-pack-secondary" draggable={false}
            src="/images/pipocas-trufadas-pacoca-20261101.webp"
            srcSet="/images/pipocas-trufadas-pacoca-20261101-360.webp 360w, /images/pipocas-trufadas-pacoca-20261101.webp 1086w"
            sizes="(min-width: 760px) 25vw, 24vw"
            alt="" aria-hidden="true" width={1086} height={1448} decoding="async" />
        )}
      </span>
      <span className="collection-copy">
        <span className="collection-format">{format}</span>
        <strong>{name}</strong>
        <span className="collection-description">{description}</span>
        {price && <span className="collection-price">A partir de {price}</span>}
        <span className="collection-action">{action}{!disabled && <ChevronRight size={15} aria-hidden="true" />}</span>
      </span>
    </button>
  );
}

export default function Home() {
  const { promotionTime, refreshPromotionTime } = usePopcornPromotion();
  const popcornPromotionActive = isPopcornPromotionActive(promotionTime);
  const [requestedCategory, setRequestedCategory] = useState<CategoryId | null>(null);
  // Edição limitada é uma experiência de descoberta, não um passo obrigatório do pedido.
  const [showLimitedCupView, setShowLimitedCupView] = useState(false);
  const [popcornVariantId, setPopcornVariantId] = useState("");
  const [popcornOptionIds, setPopcornOptionIds] = useState<string[]>([]);
  const [popcornQuantity, setPopcornQuantity] = useState(1);
  const [scrollRequest, setScrollRequest] = useState<{ id: string; editorial?: boolean } | null>(null);
  function requestScroll(id: string) { setScrollRequest({ id }); }
  function requestEditorialScroll(id: "tamanhos" | "edicao-crocante") {
    setScrollRequest({ id, editorial: true });
  }
  useEffect(() => {
    if (!scrollRequest) return;
    const frame = window.requestAnimationFrame(() => {
      if (scrollRequest.id === "gourmet-size-action") scrollToGourmetControl("size");
      else if (scrollRequest.id === "gourmet-flavor-action") scrollToGourmetControl("flavor");
      else if (scrollRequest.id === "gourmet-quantity-action") scrollToGourmetControl("quantity");
      else if (scrollRequest.editorial && (scrollRequest.id === "tamanhos" || scrollRequest.id === "edicao-crocante")) {
        jumpToEditorialSection(scrollRequest.id);
      } else {
        scrollToSection(scrollRequest.id);
      }
      setScrollRequest(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [scrollRequest]);
  const [sliceProductId, setSliceProductId] = useState("");
  const [sliceOptionId, setSliceOptionId] = useState("");
  const [sliceQuantity, setSliceQuantity] = useState(1);
  const [coneProductId, setConeProductId] = useState("");
  const [coneQuantity, setConeQuantity] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectionMessage, setSelectionMessage] = useState("");
  const [drinkMessage, setDrinkMessage] = useState("");
  const [fulfillment, setFulfillment] = useState<Fulfillment>("");
  const [deliveryZoneId, setDeliveryZoneId] = useState("");
  const [deliveryLocalityId, setDeliveryLocalityId] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [address, setAddress] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [legacyAddressNotice, setLegacyAddressNotice] = useState(false);
  const [reference, setReference] = useState("");
  const [payment, setPayment] = useState<Payment>("");
  const [checkoutChannel, setCheckoutChannel] = useState<CheckoutChannel>(COMMERCE_CONFIG.siteOrderingEnabled ? "site" : "whatsapp");
  const [notes, setNotes] = useState("");
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [whatsappResult, setWhatsAppResult] = useState<RegisteredWhatsAppOrder | null>(null);
  const [lastToken, setLastToken] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [siteResult, setSiteResult] = useState<SiteOrderResult | null>(null);
  const [newPaymentAttempt, setNewPaymentAttempt] = useState(false);
  const [needsChange, setNeedsChange] = useState(false);
  const [changeFor, setChangeFor] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [restoredOrderNotice, setRestoredOrderNotice] = useState(false);
  const [addedNotice, setAddedNotice] = useState<AddedNotice | null>(null);
  const [builderEngaged, setBuilderEngaged] = useState(true);
  const [checkoutAvailabilityMessage, setCheckoutAvailabilityMessage] = useState("");
  const [whatsAppRetryAvailable, setWhatsAppRetryAvailable] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [openingWhatsApp, setOpeningWhatsApp] = useState(false);
  const [orderContext, setOrderContext] = useState<OrderContext | null>(null);
  const orderContextRef = useRef<OrderContext | null>(null);
  const attributionRef = useRef<OrderAttribution | undefined>(undefined);
  const finalizationLockRef = useRef(false);
  const cupAddLockRef = useRef(false);
  const inlineFinalActionRef = useRef<HTMLDivElement | null>(null);
  const [inlineFinalActionVisible, setInlineFinalActionVisible] = useState(false);
  const [inlineBuilderActionVisible, setInlineBuilderActionVisible] = useState(false);
  const navigationPendingRef = useRef(false);
  const checkoutFingerprintRef = useRef("");
  const unlockTimerRef = useRef<number | undefined>(undefined);
  const { availability, hasResolvedAvailability, refreshAvailability } = useMenuAvailability();
  const [lastSlicesNow, setLastSlicesNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setLastSlicesNow(new Date());
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  const cupSalesEnabled = true; // Formulário pronto; pedidos dependem de orders_open e estoque.
  const cupPhase: LimitedCupPhase = getLimitedCupPhase(
    availability.ordersOpen,
    availability.source === "supabase" && isItemAvailable(availability, CATEGORY_ITEM_KEYS.pipocas)
      && availability.stockChecked && TRUFADA_STOCK_ITEM_KEYS.some((key: string) => isItemAvailable(availability, key)),
    availability.source === "supabase" && availability.stockChecked && TRUFADA_STOCK_ITEM_KEYS.every((key: string) => statusFor(availability, key) === "sold_out"),
  );
  const [cupFlavorPreview, setCupFlavorPreview] = useState<TrufadaProductId | null>(null);
  const [cupSizeId, setCupSizeId] = useState<TrufadaSizeId | null>(null);
  const [cupQuantity, setCupQuantity] = useState(1);
  const [cupAddedNotice, setCupAddedNotice] = useState("");
  const [cupAdding, setCupAdding] = useState(false);
  const [cupInlineActionVisible, setCupInlineActionVisible] = useState(false);
  function selectCupFlavor(flavor: TrufadaProductId) {
    if (cupFlavorPreview === flavor) return;
    setCupFlavorPreview(flavor);
    setCupSizeId(null);
    setCupQuantity(1);
    setCupAddedNotice("");
    requestScroll("crocantes-tamanhos");
  }
  function selectCupSize(size: TrufadaSizeId) {
    if (cupSizeId === size) return;
    setCupSizeId(size);
    setCupQuantity(1);
    setCupAddedNotice("");
    requestScroll("crocantes-quantidade");
  }
  const cupLaunchCopy = cupPhase === "closed"
    ? { eyebrow: "PIPOCAS TRUFADAS · LOJA FECHADA", description: "As vendas estão pausadas. Você ainda pode conhecer os sabores." }
    : cupPhase === "sold-out"
      ? { eyebrow: "PIPOCAS TRUFADAS · ESGOTADA", description: "Os sabores estão esgotados no momento." }
      : cupPhase === "unavailable"
        ? { eyebrow: "PIPOCAS TRUFADAS · INDISPONÍVEL", description: "Pacotes indisponíveis no momento. Consulte novamente mais tarde." }
        : { eyebrow: "PIPOCAS TRUFADAS · DISPONÍVEL", description: "Escolha seu sabor e peça pelo WhatsApp enquanto houver estoque." };
  const visibleCategories = publicCategories(availability);
  const activeCategory = hasResolvedAvailability ? resolveMenuCategory(availability, requestedCategory) : null;
  const checkoutStartedRef = useRef(false);
  const paymentInfoTrackedRef = useRef(false);

  // A barra flutuante não deve concorrer com o botão principal quando ele já está visível.
  // É uma decisão apenas de apresentação; o comportamento do checkout não muda.
  useEffect(() => {
    const target = inlineFinalActionRef.current;
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      setInlineFinalActionVisible(Boolean(entries[0]?.isIntersecting));
    }, { threshold: 0.45 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [activeCategory, cart.length, checkoutChannel]);

  // Edição limitada: a barra orienta fora do campo de visão do botão do copo,
  // evitando duas ações idênticas simultaneamente na tela pequena.
  useEffect(() => {
    if (!showLimitedCupView || !cupSalesEnabled || typeof IntersectionObserver === "undefined") {
      setCupInlineActionVisible(false);
      return;
    }
    const target = document.querySelector<HTMLElement>(".storefront .limited-cup-buy-cta");
    if (!target) {
      setCupInlineActionVisible(false);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setCupInlineActionVisible(Boolean(entry?.isIntersecting));
    }, { threshold: 0.45, rootMargin: "0px 0px -68px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [showLimitedCupView, cupSalesEnabled, cupFlavorPreview, cupSizeId]);

  // Mesmo princípio para o configurador: uma só ação quando o botão de adicionar já aparece.
  // Observa o botão existente sem alterar suas regras, callbacks ou acessibilidade.
  useEffect(() => {
    if (!activeCategory || typeof IntersectionObserver === "undefined") return;
    const target = document.querySelector<HTMLElement>(".storefront .builder-card .add-button");
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => {
      setInlineBuilderActionVisible(Boolean(entry?.isIntersecting));
    }, { threshold: 0.35, rootMargin: "0px 0px -70px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [activeCategory]);

  const pipocasVisible = STORE_CONFIG.enabledCategories.pipocas
    && isItemVisible(availability, CATEGORY_ITEM_KEYS.pipocas);
  const fatiasVisible = STORE_CONFIG.enabledCategories.fatias
    && isItemVisible(availability, CATEGORY_ITEM_KEYS.fatias);
  const conesVisible = STORE_CONFIG.enabledCategories.cones
    && isItemVisible(availability, CATEGORY_ITEM_KEYS.cones);
  const pipocasAvailable = pipocasVisible
    && isItemAvailable(availability, CATEGORY_ITEM_KEYS.pipocas);
  const fatiasAvailable = fatiasVisible
    && isItemAvailable(availability, CATEGORY_ITEM_KEYS.fatias);
  const conesAvailable = conesVisible
    && isItemAvailable(availability, CATEGORY_ITEM_KEYS.cones);

  function categoryIsVisible(category: CategoryId) {
    return category === "pipocas" ? pipocasVisible : category === "cones" ? conesVisible : fatiasVisible;
  }

  function categoryIsAvailable(category: CategoryId | null) {
    return category === "pipocas" ? pipocasAvailable : category === "cones" ? conesAvailable : category === "fatias" && fatiasAvailable;
  }

  function popcornSizeIsVisible(variantId: string) {
    const itemKey = POPCORN_SIZE_ITEM_KEYS[variantId];
    return Boolean(itemKey && !POPCORN.variants.find((variant) => variant.id === variantId)?.retired && isItemVisible(availability, itemKey));
  }

  function popcornSizeIsAvailable(variantId: string) {
    const itemKey = POPCORN_SIZE_ITEM_KEYS[variantId];
    return Boolean(itemKey && !POPCORN.variants.find((variant) => variant.id === variantId)?.retired && isItemAvailable(availability, itemKey));
  }

  function popcornFlavorIsVisible(optionId: string) {
    const itemKey = POPCORN_FLAVOR_ITEM_KEYS[optionId];
    return Boolean(itemKey && isItemVisible(availability, itemKey));
  }

  function popcornFlavorIsAvailable(optionId: string) {
    const itemKey = POPCORN_FLAVOR_ITEM_KEYS[optionId];
    return Boolean(itemKey && isItemAvailable(availability, itemKey));
  }

  function coneIsVisible(productId: string) {
    const key = CONE_ITEM_KEYS[productId];
    return Boolean(key && isItemVisible(availability, key));
  }
  function coneIsAvailable(productId: string) {
    const key = CONE_ITEM_KEYS[productId];
    return Boolean(key && availability.source === "supabase" && isItemAvailable(availability, key));
  }

  function sliceIsVisible(productId: string) {
    const itemKey = SLICE_ITEM_KEYS[productId];
    return Boolean(itemKey && isItemVisible(availability, itemKey));
  }

  function sliceIsAvailable(productId: string) {
    const itemKey = SLICE_ITEM_KEYS[productId];
    return Boolean(itemKey && isItemAvailable(availability, itemKey));
  }

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (!event.altKey && !event.ctrlKey && !event.metaKey) navigationByKeyboard = true;
    };
    const pointer = () => { navigationByKeyboard = false; };
    document.addEventListener("keydown", keyboard, true);
    document.addEventListener("pointerdown", pointer, true);
    let leftPage = false;
    const reset = () => {
      if (!navigationPendingRef.current) return;
      navigationPendingRef.current = false;
      finalizationLockRef.current = false;
      window.clearTimeout(unlockTimerRef.current);
      setIsFinalizing(false);
      setOpeningWhatsApp(false);
      setCheckoutAvailabilityMessage("");
    };
    const onLeave = () => { if (navigationPendingRef.current) leftPage = true; };
    const onReturn = () => { if (leftPage) { leftPage = false; reset(); } };
    const onVisibility = () => document.visibilityState === "hidden" ? onLeave() : onReturn();
    window.addEventListener("pagehide", onLeave);
    window.addEventListener("pageshow", onReturn);
    window.addEventListener("blur", onLeave);
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(unlockTimerRef.current);
      document.removeEventListener("keydown", keyboard, true);
      document.removeEventListener("pointerdown", pointer, true);
      window.removeEventListener("pagehide", onLeave);
      window.removeEventListener("pageshow", onReturn);
      window.removeEventListener("blur", onLeave);
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (window.__lucianeViewContentTracked) return;
    if (trackMetaEvent("ViewContent")) {
      window.__lucianeViewContentTracked = true;
    }
  }, []);

  useEffect(() => {
    const requestedCategory = categoryFromUrl(window.location.href);
    let savedOrder: Partial<SavedOrder> | null = null;
    let savedCart: CartItem[] = [];
    try {
      // Remove o pedido antigo que permanecia no aparelho por até duas horas.
      window.localStorage.removeItem(LEGACY_ORDER_STORAGE_KEY);
      const rawOrder = window.sessionStorage.getItem(ORDER_STORAGE_KEY);
      if (rawOrder) {
        const saved = JSON.parse(rawOrder) as Partial<SavedOrder>;
        if (saved.version === 2) {
          savedOrder = saved;
          savedCart = sanitizeSavedCart(saved.cart);
        } else {
          window.sessionStorage.removeItem(ORDER_STORAGE_KEY);
        }
      }
    } catch {
      try {
        window.sessionStorage.removeItem(ORDER_STORAGE_KEY);
      } catch {
        // O cardápio continua funcionando mesmo quando o navegador bloqueia o armazenamento da aba.
      }
    }

    let priorAttribution = savedOrder?.order?.attribution;
    try {
      const stored = JSON.parse(window.localStorage.getItem("lod-first-known-attribution") || "null") as OrderAttribution | null;
      if (stored) {
        // O histórico local pode conter visitas posteriores ao rascunho salvo na sessão.
        priorAttribution = {
          ...stored,
          ...priorAttribution,
          marketing_interactions: mergeMarketingInteractions(
            stored.marketing_interactions,
            priorAttribution?.marketing_interactions,
          ),
        };
      }
    } catch { /* Histórico opcional: checkout permanece funcional sem armazenamento. */ }
    attributionRef.current = captureOrderAttribution(window.location.href, document.cookie, priorAttribution, true);
    try { window.localStorage.setItem("lod-first-known-attribution", JSON.stringify(attributionRef.current)); } catch { /* Keep session data. */ }
    const restoreTimer = window.setTimeout(() => {
      setLastToken(lastOrderToken());
      if (savedOrder) {
        setCart(savedCart);
        if (savedCart.length > 0) setBuilderEngaged(false);
        if (savedOrder.fulfillment === "entrega" || savedOrder.fulfillment === "retirada") setFulfillment(savedOrder.fulfillment);
        if (typeof savedOrder.deliveryZoneId === "string" && DELIVERY_ZONES.some((zone) => zone.id === savedOrder?.deliveryZoneId)) {
          setDeliveryZoneId(savedOrder.deliveryZoneId);
        }
        if (typeof savedOrder.neighborhood === "string") setNeighborhood(savedOrder.neighborhood);
        const savedLocality = deliveryLocalityById(savedOrder.deliveryLocalityId)
          ?? deliveryLegacyLocality(savedOrder.deliveryZoneId, savedOrder.neighborhood);
        if (savedLocality) {
          setDeliveryLocalityId(savedLocality.id);
          setDeliveryZoneId(deliveryLocalityCanQuote(savedLocality) ? (savedLocality.zoneId ?? "") : "");
        }
        if (typeof savedOrder.address === "string") {
          setAddress(savedOrder.address);
          setLegacyAddressNotice(Boolean(savedOrder.address && !savedOrder.addressNumber));
        }
        if (typeof savedOrder.addressNumber === "string") setAddressNumber(savedOrder.addressNumber);
        if (typeof savedOrder.complement === "string") setComplement(savedOrder.complement);
        if (savedCart.length > 0) {
          try {
            const context = restoreOrderContext(savedOrder.order, attributionRef.current!);
            orderContextRef.current = context;
            setOrderContext(context);
          } catch {
            setCheckoutAvailabilityMessage("Não foi possível gerar o código do pedido. Tente finalizar novamente.");
          }
        }
        if (typeof savedOrder.reference === "string") setReference(savedOrder.reference);
        const knownPayments: Payment[] = ["pix", "dinheiro", "cartao", "credito", "debito", "mercado_pago_pix", "mercado_pago_card", "card_on_delivery", "cash"];
        if (knownPayments.includes(savedOrder.payment as Payment)) setPayment(savedOrder.payment === "cartao" && !savedOrder.whatsappResult ? "" : savedOrder.payment as Payment);
        if (savedOrder.checkoutChannel === "site" && COMMERCE_CONFIG.siteOrderingEnabled) setCheckoutChannel("site");
        else if (savedOrder.checkoutChannel === "whatsapp") setCheckoutChannel("whatsapp");
        if (typeof savedOrder.notes === "string") {
          const restoredNotes = savedOrder.notes.slice(0, 500);
          setNotes(restoredNotes);
          setNotesExpanded(Boolean(restoredNotes.trim()));
        }
        if (savedOrder.whatsappResult?.result?.order?.tracking_token) setWhatsAppResult(savedOrder.whatsappResult);
        if (typeof savedOrder.customerName === "string") setCustomerName(savedOrder.customerName);
        if (typeof savedOrder.customerPhone === "string") setCustomerPhone(savedOrder.customerPhone);
        if (typeof savedOrder.customerEmail === "string") setCustomerEmail(savedOrder.customerEmail);
        if (savedOrder.siteResult && typeof savedOrder.siteResult === "object") setSiteResult(savedOrder.siteResult);
        if (typeof savedOrder.needsChange === "boolean") setNeedsChange(savedOrder.needsChange);
        if (typeof savedOrder.changeFor === "string") setChangeFor(savedOrder.changeFor);
        checkoutStartedRef.current = savedOrder.initiateCheckoutTracked === true;
        paymentInfoTrackedRef.current = savedOrder.paymentInfoTracked === true;
        setRestoredOrderNotice(savedCart.length > 0);
      }
      setRequestedCategory(requestedCategory);
      setShowLimitedCupView(trufadasFromUrl(window.location.href, window.history.state));
      setStorageReady(true);
    }, 0);

    const followHistory = () => {
      const category = categoryFromUrl(window.location.href);
      const isEdition = trufadasFromUrl(window.location.href, window.history.state);
      setShowLimitedCupView(isEdition);
      setRequestedCategory(category);
      if (!category) {
        window.scrollTo({ top: 0, behavior: "instant" });
      } else if (isEdition) {
        setScrollRequest({ id: "edicao-crocante", editorial: true });
      } else if (category === "pipocas") {
        setScrollRequest({ id: "tamanhos", editorial: true });
      } else {
        setScrollRequest({ id: "configurador" });
      }
    };
    window.addEventListener("popstate", followHistory);
    return () => {
      window.clearTimeout(restoreTimer);
      window.removeEventListener("popstate", followHistory);
    };
  }, []);

  const popcornVariant = POPCORN.variants.find((variant) => variant.id === popcornVariantId);
  const popcornVariantUsable = Boolean(popcornVariant?.available && pipocasAvailable && popcornSizeIsAvailable(popcornVariant.id));
  // No iPhone, a barra flutuante não deve cobrir os checkboxes enquanto
  // o cliente percorre a lista real de recheios. Ela volta ao sair da lista.
  const [gourmetFlavorsInView, setGourmetFlavorsInView] = useState(false);
  // Oculta o atalho inferior se o usuário já pode enxergar a continuação inline.
  const [gourmetNextStepInlineVisible, setGourmetNextStepInlineVisible] = useState(true);
  useEffect(() => {
    if (activeCategory !== "pipocas" || showLimitedCupView || !popcornVariantUsable) {
      setGourmetFlavorsInView(false);
      return;
    }
    if (typeof IntersectionObserver === "undefined") return;
    const section = document.querySelector<HTMLElement>("#sabores .flavor-grid");
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => setGourmetFlavorsInView(Boolean(entry?.isIntersecting)),
      { threshold: 0, rootMargin: "-8px 0px -100px 0px" },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [activeCategory, showLimitedCupView, popcornVariantUsable]);
  const popcornMaxOptions = popcornVariant?.maxOptions ?? 0;
  const popcornLimitReached = Boolean(popcornVariant) && popcornOptionIds.length >= popcornMaxOptions;
  // A comparação utiliza a MESMA regra do catálogo antes da promoção.
  // A economia é do pote completo, nunca a soma dos sabores.
  const popcornRegularCombinationPrice = popcornVariantUsable && popcornVariant && popcornOptionIds.length > 0
    ? popcornPrice(popcornVariant.id, popcornOptionIds, POPCORN_PROMOTION.startsAt - 1)
    : null;
  const popcornCurrentCombinationPrice = popcornVariantUsable && popcornVariant && popcornOptionIds.length > 0
    ? popcornPrice(popcornVariant.id, popcornOptionIds, promotionTime)
    : null;
  const popcornCombinationSavings = popcornPromotionActive
    && popcornRegularCombinationPrice !== null && popcornCurrentCombinationPrice !== null
    ? Math.max(0, popcornRegularCombinationPrice - popcornCurrentCombinationPrice)
    : 0;
  const selectedCone = CONES.find((product) => product.id === coneProductId);
  const selectedConeVariant = selectedCone?.variants[0];
  const coneReady = Boolean(availability.ordersOpen && conesAvailable && selectedCone?.available && selectedConeVariant?.available && selectedCone && coneIsAvailable(selectedCone.id));
  const selectedSlice = SLICES.find((product) => product.id === sliceProductId);
  const selectedSliceVariant = selectedSlice?.variants[0];
  const selectedDeliveryLocality = deliveryLocalityById(deliveryLocalityId);
  const selectedDeliveryZone = DELIVERY_ZONES.find((zone) =>
    deliveryLocalityCanQuote(selectedDeliveryLocality)
      && zone.id === deliveryZoneId && zone.id === selectedDeliveryLocality?.zoneId);
  const deliveryNeighborhood = selectedDeliveryLocality?.label ?? "";

  const deliveryZoneError = deliveryZoneMismatchMessage(deliveryZoneId, cleanWhatsAppField(neighborhood))
    .replace("‘Onde será a entrega?’", "‘Selecione seu bairro ou local de entrega’");

  const cartSubtotal = useMemo(
    () => cart.reduce((total, item) => {
      const product = PRODUCTS.find((candidate) => candidate.id === item.productId);
      const variant = product?.variants.find((candidate) => candidate.id === item.variantId);
      return total + (product && variant ? itemUnitPrice(product, variant, item.optionIds, promotionTime) : 0) * item.quantity;
    }, 0),
    [cart, promotionTime],
  );

  const cartNeedsSizeReview = cart.some((item) => PRODUCTS.find((product) => product.id === item.productId)?.variants.find((variant) => variant.id === item.variantId)?.retired);
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartContainsCrocantes = cart.some((item) => isTrufadaOrLegacy(item.productId));
  const cupProductId = cupFlavorPreview ?? "";
  const cupProduct = PRODUCTS.find(product => product.id === cupProductId);
  const cupVariant = cupProduct?.variants.find(variant => variant.id === cupSizeId);
  const cupStartingPrice = cupProduct?.variants.find(variant => variant.id === "p")?.price ?? 14.9;
  const cupStockKey = cupProductId && cupSizeId ? trufadaStockItemKey(cupProductId, cupSizeId) : null;
  const cartStockCount = (productId: string, variantId: string) => cart
    .filter(item => item.productId === productId && item.variantId === variantId)
    .reduce((sum, item) => sum + item.quantity, 0);
  const remainingForFlavor = (productId: string, sizeId: string) => {
    const key = trufadaStockItemKey(productId, sizeId);
    return availability.stockChecked && key
      ? Math.max(0, (availability.stockRemaining[key] ?? 0) - cartStockCount(productId, sizeId))
      : 0;
  };
  const cupRemaining = cupProductId && cupSizeId ? remainingForFlavor(cupProductId, cupSizeId) : 0;
  const cupCanOrder = cupSalesEnabled && pipocasAvailable && availability.ordersOpen && availability.source === "supabase"
    && availability.stockChecked && Boolean(cupVariant?.available && cupStockKey && isItemAvailable(availability, cupStockKey) && cupRemaining >= cupQuantity);
  const cupActionLabel = cupAdding ? "Conferindo estoque…"
    : !availability.ordersOpen ? "Pedidos pausados"
    : cupPhase === "sold-out" ? "Pacotes esgotados"
    : cupPhase === "unavailable" ? "Disponibilidade indisponível"
    : !cupFlavorPreview ? "Escolher sabor"
    : !cupSizeId ? "Escolher tamanho"
    : !cupCanOrder ? cupRemaining <= 0 ? "Sem pacotes disponíveis" : "Revise a quantidade"
    : `Adicionar ${cupQuantity} ${cupQuantity === 1 ? "pacote" : "pacotes"} ao pedido`;
  const cupCanBeAddedFromCheckout = cupSalesEnabled && pipocasAvailable && availability.ordersOpen && availability.source === "supabase"
    && availability.stockChecked && TRUFADA_PRODUCT_IDS.some(productId =>
      TRUFADA_SIZES.some(size => {
        const key = trufadaStockItemKey(productId, size);
        return Boolean(key && isItemAvailable(availability, key) && remainingForFlavor(productId, size) > 0);
      }));
  useEffect(() => {
    if (cartContainsCrocantes && checkoutChannel !== "whatsapp") {
      setCheckoutChannel("whatsapp");
      setPayment("");
    }
  }, [cartContainsCrocantes, checkoutChannel]);
  const justAddedProduct = addedNotice
    ? PRODUCTS.find((product) => product.id === addedNotice.productId)
    : null;
  // Recomendações são apenas atalhos de navegação para produtos de fato selecionáveis.
  // Nunca assumem quantidade, alteram preço ou habilitam uma categoria indisponível.
  const checkoutComplementItems = orderCheckoutComplements(
    addedNotice && isTrufadaOrLegacy(addedNotice.productId) ? "trufadas"
      : addedNotice?.category === "fatias" ? "fatias" : "gourmet",
    {
      gourmet: availability.ordersOpen && pipocasAvailable && POPCORN.available
        && POPCORN.variants.some((variant) => variant.available && popcornSizeIsAvailable(variant.id)),
      fatias: availability.ordersOpen && fatiasAvailable
        && SLICES.some((slice) => sliceIsVisible(slice.id) && slice.available
          && Boolean(slice.variants[0]?.available) && sliceIsAvailable(slice.id)),
      trufadas: cupCanBeAddedFromCheckout,
      bebidas: STORE_CONFIG.enabledExtras.drinks && availability.ordersOpen,
    },
  );
  const cartIssues = useMemo(
    () => cartAvailabilityIssues(cart, availability),
    [availability, cart],
  );
  const inProgressSummary = cart.slice(0, 2).map((item) => {
    const product = PRODUCTS.find((candidate) => candidate.id === item.productId)!;
    const variant = product.variants.find((candidate) => candidate.id === item.variantId)!;
    return `${item.quantity}x ${productLabel(product)} ${variant.label}`;
  }).join(" · ") + (cart.length > 2 ? ` · +${cart.length - 2} ${cart.length - 2 === 1 ? "item" : "itens"}` : "");
  const deliveryFee = fulfillment === "entrega" ? selectedDeliveryZone?.price ?? 0 : 0;
  const cardMode = checkoutChannel === "whatsapp" ? payment === "credito" ? "credit_single" : payment === "debito" ? "debit" : null : null;
  const cardQuote = receiptCardQuote(Math.round(cartSubtotal * 100) + Math.round(deliveryFee * 100), cardMode);
  const orderTotal = cardQuote.totalCents / 100;
  const hasEstimatedTotal = fulfillment === "retirada" || (fulfillment === "entrega" && Boolean(selectedDeliveryZone));

  const popcornReady = Boolean(
    availability.ordersOpen
    && pipocasAvailable
    && POPCORN.available
    && popcornVariant?.available
    && popcornSizeIsAvailable(popcornVariant.id)
    && popcornOptionIds.length > 0
    && popcornOptionIds.length <= popcornMaxOptions
    && popcornOptionIds.every((optionId) => popcornFlavorIsAvailable(optionId)),
  );
  // Apenas observa a ação existente e a etapa de quantidade. Não altera a
  // seleção, a rolagem automática de limite preenchido, nem o preço do pote.
  useEffect(() => {
    if (activeCategory !== "pipocas" || showLimitedCupView || !popcornReady
      || popcornOptionIds.length >= popcornMaxOptions || typeof IntersectionObserver === "undefined") {
      setGourmetNextStepInlineVisible(true);
      return;
    }
    const targets = [
      document.querySelector<HTMLElement>("#sabores .flavor-continue"),
      document.querySelector<HTMLElement>("#quantidade-pipocas .quantity-row"),
    ].filter((target): target is HTMLElement => Boolean(target));
    if (targets.length === 0) {
      setGourmetNextStepInlineVisible(true);
      return;
    }
    setGourmetNextStepInlineVisible(true);
    const visible = new Map<Element, boolean>(targets.map((node) => [node, false]));
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) visible.set(entry.target, entry.isIntersecting);
      setGourmetNextStepInlineVisible([...visible.values()].some(Boolean));
    }, { threshold: 0.2, rootMargin: "0px 0px -74px 0px" });
    targets.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [activeCategory, showLimitedCupView, popcornReady, popcornOptionIds.length, popcornMaxOptions]);
  const strawberryPreorder = availability.slicePreorder?.active ? availability.slicePreorder : null;
  const strawberryReadyLabel = strawberryPreorder && Number.isFinite(Date.parse(strawberryPreorder.ready_at ?? ""))
    ? new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Belem", hour: "2-digit", minute: "2-digit", hour12: false,
      }).format(new Date(strawberryPreorder.ready_at!)).replace(":", "h")
    : "horário a confirmar";
  const lastSlicesProducts = activeCategory === "fatias"
    && hasResolvedAvailability
    && availability.source === "supabase"
    && availability.ordersOpen
    && fatiasAvailable
    && !strawberryPreorder
    && isLastSlicesWindow(lastSlicesNow)
    ? SLICES.filter((slice) => LAST_SLICES_PRODUCT_IDS.some((id) => id === slice.id)
      && slice.available && Boolean(slice.variants[0]?.available) && sliceIsAvailable(slice.id))
    : [];
  const lastSlicesIds = new Set(lastSlicesProducts.map((slice) => slice.id));
  const cartHasStrawberryPreorder = Boolean(strawberryPreorder && cart.some(item=>item.productId==="fatia-chocolate-morango"));
  const reservedInCart = cart.filter(item=>item.productId==="fatia-chocolate-morango").reduce((sum,item)=>sum+item.quantity,0);
  const sliceReady = Boolean(
    availability.ordersOpen
    && fatiasAvailable
    && selectedSlice?.available
    && selectedSliceVariant?.available
    && selectedSlice
    && sliceIsAvailable(selectedSlice.id)
    && SLICE_OPTIONS.some(option => option.id === sliceOptionId),
  );
  const draftReady = activeCategory === "pipocas" ? popcornReady : activeCategory === "cones" ? coneReady : activeCategory === "fatias" && sliceReady;
  const popcornUnitPrice = popcornVariant && !popcornVariant.retired ? itemUnitPrice(POPCORN, popcornVariant, popcornOptionIds, promotionTime) : null;
  const draftSubtotal = activeCategory === "pipocas"
    ? popcornUnitPrice === null ? null : popcornUnitPrice * popcornQuantity
    : activeCategory === "cones" ? selectedConeVariant ? selectedConeVariant.price * coneQuantity : null
    : selectedSliceVariant ? selectedSliceVariant.price * sliceQuantity : null;
  const addressReady = fulfillment !== "entrega"
    || Boolean(deliveryLocalityCanQuote(selectedDeliveryLocality) && selectedDeliveryZone && !deliveryZoneError
      && cleanWhatsAppField(deliveryNeighborhood) && cleanWhatsAppField(address) && cleanWhatsAppField(addressNumber));
  const cashReceivedCents = parseCashCents(changeFor);
  const isCashPayment = payment === "dinheiro" || payment === "cash";
  const changeError = isCashPayment && needsChange
    ? cashReceivedCents === null
      ? "Informe um valor válido para o troco. Ex.: 50,00."
      : cashReceivedCents < Math.round(orderTotal * 100)
        ? `O valor para troco deve ser igual ou maior que ${formatOrderMoney(orderTotal)}.`
        : ""
    : "";
  const customerNameReady = customerName.trim().length >= 2;
  const customerPhoneReady = /^\d{10,15}$/.test(customerPhone.replace(/\D/g, ""));
  const customerEmailReady = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim());
  const customerReady = customerNameReady && (checkoutChannel === "whatsapp" || customerPhoneReady);
  const channelPaymentReady = checkoutChannel === "site"
    ? isSitePayment(payment)
      && (!(["mercado_pago_pix", "mercado_pago_card"] as SitePaymentMethod[]).includes(payment) || COMMERCE_CONFIG.onlinePaymentsEnabled)
      && (payment !== "mercado_pago_pix" || customerEmailReady)
    : isWhatsAppPayment(payment);
  const paymentReady = channelPaymentReady && !changeError;
  const checkoutFormReady = cart.length > 0
    && Boolean(fulfillment)
    && addressReady
    && customerReady
    && paymentReady;
  const checkoutReady = availability.ordersOpen
    && cartIssues.length === 0
    && checkoutFormReady;
  const popcornSizeStepState: StepState = popcornVariant && popcornSizeIsAvailable(popcornVariant.id) ? "complete" : "active";
  const popcornFlavorStepState: StepState = !popcornVariantUsable
    ? "locked"
    : popcornOptionIds.length > 0 && popcornOptionIds.every((optionId) => popcornFlavorIsAvailable(optionId))
      ? "complete"
      : "active";
  const popcornQuantityStepState: StepState = popcornReady ? "active" : "locked";
  const sliceProductStepState: StepState = selectedSlice && sliceIsAvailable(selectedSlice.id) ? "complete" : "active";
  const sliceSauceStepState: StepState = !selectedSlice ? "locked" : sliceOptionId ? "complete" : "active";
  const sliceQuantityStepState: StepState = sliceReady ? "active" : "locked";
  const receivingStepState: StepState = cart.length === 0
    ? "locked"
    : fulfillment && addressReady
      ? "complete"
      : "active";
  const paymentStepState: StepState = cart.length === 0
    ? "locked"
    : paymentReady
      ? "complete"
      : "active";
  const builderFlowActive = !showLimitedCupView && Boolean(activeCategory && (editingId || builderEngaged || draftReady || !cart.length));
  // A barra de navegação existente vira uma ação compacta somente enquanto
  // há uma escolha válida menor que o limite e a continuação não está visível.
  const gourmetContinueAvailable = builderFlowActive && activeCategory === "pipocas"
    && popcornReady && popcornOptionIds.length < popcornMaxOptions
    && gourmetFlavorsInView && !gourmetNextStepInlineVisible && !inlineBuilderActionVisible;
  const cupBuilderFlowActive = showLimitedCupView && cupSalesEnabled;
  const stickyUsesCheckoutAction = !builderFlowActive && !cupBuilderFlowActive;
  const stickyIsCheckoutReady = stickyUsesCheckoutAction && checkoutReady;
  const stickyPriceLabel = cupBuilderFlowActive
    ? currency.format((cupVariant?.price ?? cupStartingPrice) * (cupSizeId ? cupQuantity : 1))
    : cart.length > 0 && !builderFlowActive
    ? cartNeedsSizeReview ? "Revise o tamanho" : currency.format(hasEstimatedTotal ? orderTotal : cartSubtotal)
    : draftSubtotal === null
      ? activeCategory === "pipocas" ? `A partir de ${currency.format(popcornPrice("500ml", [], promotionTime))}` : "A partir de R$20"
      : currency.format(draftSubtotal);
  const stickyPriceCaption = cupBuilderFlowActive
    ? cupFlavorPreview
      ? `${cupProduct?.name ?? "Trufadas"}${cupSizeId ? ` · Pacote ${cupSizeId.toUpperCase()}` : ""} · ${cupQuantity} ${cupQuantity === 1 ? "pacote" : "pacotes"}`
      : "A partir de"
    : cart.length > 0 && !builderFlowActive
    ? hasEstimatedTotal ? "Total do pedido" : "Subtotal do pedido"
    : cart.length > 0 ? "Item em montagem" : activeCategory === "pipocas" ? "Sua pipoca" : "Sua fatia";
  const paymentLabel = checkoutChannel === "site" && isSitePayment(payment)
    ? sitePaymentLabel(payment, fulfillment)
    : paymentDescription(isWhatsAppPayment(payment) ? payment : "", fulfillment).replace(" (1x)", "");
  const finalButtonLabel = isFinalizing
    ? openingWhatsApp ? "Abrindo WhatsApp…" : "Conferindo pedido…"
    : checkoutChannel === "site"
      ? payment === "mercado_pago_pix" ? "Gerar Pix e confirmar pedido"
        : payment === "mercado_pago_card" ? "Preencher e pagar com cartão"
          : "Confirmar pedido"
      : whatsAppRetryAvailable ? "Tentar novamente" : typeof cartHasStrawberryPreorder !== "undefined" && cartHasStrawberryPreorder ? "Finalizar pré-reserva no WhatsApp" : "Finalizar pedido no WhatsApp";
  // A ação flutuante informa exatamente o que ainda falta preencher.
  // Não muda a função acionada: checkout incompleto continua rolando para o próximo campo.
  const checkoutNextActionLabel = !fulfillment
    ? "Entrega ou retirada"
    : fulfillment === "entrega" && !addressReady
      ? "Completar entrega"
      : !customerNameReady
        ? "Informar seu nome"
        : checkoutChannel === "site" && !customerPhoneReady
          ? "Informar celular"
          : isCashPayment && needsChange && Boolean(changeError)
            ? "Conferir troco"
            : checkoutChannel === "site" && payment === "mercado_pago_pix" && !customerEmailReady
              ? "Informar e-mail"
              : !paymentReady
                ? "Escolher pagamento"
                : "Conferir pedido";
  const summaryActionLabel = isFinalizing
    ? finalButtonLabel
    : !availability.ordersOpen
      ? "Pedidos fechados"
      : cartIssues.length > 0
        ? "Revisar itens do pedido"
        : checkoutReady
          ? finalButtonLabel
          : checkoutNextActionLabel;
  const stickyButtonLabel = typeof cupBuilderFlowActive !== "undefined" && cupBuilderFlowActive
    ? cupActionLabel
    : isFinalizing ? finalButtonLabel : !availability.ordersOpen
    ? "Pedidos fechados"
    : !categoryIsAvailable(activeCategory) && builderFlowActive
      ? "Esgotado no momento"
      : activeCategory === "fatias" && selectedSlice && !sliceOptionId && builderFlowActive
        ? "Escolher calda ou sem calda"
      : editingId
        ? "Salvar alterações"
        : draftReady
      ? activeCategory === "pipocas"
        ? `Adicionar ${popcornQuantity} ${popcornQuantity === 1 ? "pipoca" : "pipocas"}`
        : selectedSlice?.id==="fatia-chocolate-morango" && strawberryPreorder
          ? `Adicionar ${sliceQuantity} ${sliceQuantity === 1 ? "fatia" : "fatias"} à pré-reserva`
          : `Adicionar ${sliceQuantity} ${sliceQuantity === 1 ? "fatia" : "fatias"}`
      : builderFlowActive
        ? activeCategory === "pipocas"
          ? popcornVariant ? "Ir aos sabores" : "Escolher tamanho"
          : "Escolher minha fatia"
          : checkoutReady ? finalButtonLabel : checkoutNextActionLabel;

  const checkoutDetails: CheckoutDetails = {
    customer_name: customerName.trim(), notes: notes.trim(),
    preorderReadyAt: cart.some(item=>item.productId==="fatia-chocolate-morango") && strawberryPreorder ? strawberryPreorder.ready_at : undefined,
    items: cart.map((item) => {
      const product = PRODUCTS.find((candidate) => candidate.id === item.productId)!;
      const variant = product.variants.find((candidate) => candidate.id === item.variantId)!;
      return {
        product_id: product.id, variant_id: variant.id, option_ids: [...item.optionIds],
        name: productLabel(product), size: variant.whatsappLabel, kind: product.kind,
        options: item.optionIds.map((id) => product.options.find((option) => option.id === id)?.name).filter((name): name is string => Boolean(name)),
        quantity: item.quantity, unit_price: itemUnitPrice(product, variant, item.optionIds, promotionTime),
      };
    }),
    fulfillment, neighborhood: deliveryNeighborhood, street: address, number: addressNumber,
    complement, reference, payment: isWhatsAppPayment(payment) ? payment : "", needs_change: needsChange, cash_received_cents: cashReceivedCents,
    subtotal: cartSubtotal, delivery_fee: deliveryFee, card_fee: cardQuote.feeCents / 100, card_basis_points: cardQuote.basisPoints, total: orderTotal, currency: "BRL",
  };
  const checkoutFingerprint = JSON.stringify({
    ...checkoutDetails,
    delivery_locality_id: fulfillment === "entrega" ? deliveryLocalityId : null,
    checkout_channel: checkoutChannel,
    selected_payment: payment,
    ...(checkoutChannel === "site" ? {
      customer_name: customerName.trim(),
      customer_phone: customerPhone.replace(/\D/g, ""),
      customer_email: payment === "mercado_pago_pix" ? customerEmail.trim().toLowerCase() : undefined,
    } : {}),
  });
  useEffect(() => {
    checkoutFingerprintRef.current = checkoutFingerprint;
    setWhatsAppRetryAvailable(false);
    if (!storageReady || !cart.length) return;
    const current = orderContextRef.current;
    // Retentativa mantém o código. Edição após abrir o WhatsApp inicia outro pedido.
    if (!current || (current.handoff_fingerprint && current.handoff_fingerprint !== checkoutFingerprint)) {
      try {
        const next = newOrderContext(captureOrderAttribution(window.location.href, document.cookie, current?.attribution ?? attributionRef.current));
        orderContextRef.current = next;
        setOrderContext(next);
      } catch {
        setCheckoutAvailabilityMessage("Não foi possível gerar o código do pedido. Tente finalizar novamente.");
      }
    }
  }, [checkoutFingerprint, storageReady, cart.length]);

  const savedOrder: SavedOrder = {
    version: 2, cart, fulfillment, deliveryZoneId, deliveryLocalityId, neighborhood, address, addressNumber, complement,
    reference, payment, checkoutChannel, customerName, customerPhone, customerEmail, siteResult, notes, whatsappResult,
    needsChange, changeFor, order: orderContext, order_details: checkoutDetails,
  };
  const serializedOrder = JSON.stringify(savedOrder);
  const hasSavedData = cart.length > 0 || Boolean(fulfillment || deliveryZoneId || neighborhood || address || addressNumber || complement || reference || payment || changeFor || customerName || customerPhone || customerEmail || siteResult);
  useEffect(() => {
    if (!storageReady) return;
    try {
      if (hasSavedData) window.sessionStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify({ ...JSON.parse(serializedOrder), initiateCheckoutTracked: checkoutStartedRef.current, paymentInfoTracked: paymentInfoTrackedRef.current }));
      else window.sessionStorage.removeItem(ORDER_STORAGE_KEY);
    } catch {
      // Quando o armazenamento é bloqueado, o estado em memória continua disponível nesta página.
    }
  }, [hasSavedData, serializedOrder, storageReady]);

  useEffect(() => {
    if (cart.length === 0) {
      checkoutStartedRef.current = false;
      paymentInfoTrackedRef.current = false;
    }
  }, [cart.length]);

  function selectCategory(category: CategoryId, shouldScroll = true) {
    if (!categoryIsAvailable(category)) return;
    setShowLimitedCupView(false);
    setRequestedCategory(category);
    setEditingId(null);
    setSelectionMessage("");
    setAddedNotice(null);
    setBuilderEngaged(true);
    const historyState = window.history.state ?? {};
    if (categoryFromUrl(window.location.href) !== category || trufadasFromUrl(window.location.href, historyState)) {
      window.history.pushState({ ...historyState, lucianeCrocante: false }, "", categoryUrl(window.location.href, category));
    }
    if (shouldScroll) {
      if (category === "pipocas") requestEditorialScroll("tamanhos");
      else requestScroll("configurador");
    }
  }

  function openLimitedCupEdition() {
    if (!categoryIsAvailable("pipocas")) return;
    setShowLimitedCupView(true);
    setCupFlavorPreview(null);
    setCupSizeId(null);
    setCupAddedNotice("");
    setRequestedCategory("pipocas");
    setEditingId(null);
    setSelectionMessage("");
    setAddedNotice(null);
    setBuilderEngaged(false);
    const historyState = window.history.state ?? {};
    if (categoryFromUrl(window.location.href) !== "pipocas" || historyState.lucianeCrocante !== true) {
      window.history.pushState({ ...historyState, lucianeCrocante: true }, "", categoryUrl(window.location.href, "trufadas"));
    }
    requestEditorialScroll("edicao-crocante");
    // Redundância somente para o clique na vitrine: em alguns WebKit o primeiro
    // frame de montagem ignora a rolagem, mesmo com a categoria já renderizada.
    const originalY = window.scrollY;
    const recoverEntrance = () => {
      if (!trufadasFromUrl(window.location.href, window.history.state)) return;
      const destination = document.getElementById("edicao-crocante");
      if (!destination || Math.abs(window.scrollY - originalY) > 18) return;
      if (destination.getBoundingClientRect().top <= 70) return;
      destination.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    };
    window.setTimeout(recoverEntrance, 190);
    window.setTimeout(recoverEntrance, 540);
  }

  function returnToCategories() {
    setShowLimitedCupView(false);
    setCupFlavorPreview(null);
    setCupSizeId(null);
    setRequestedCategory(null);
    setEditingId(null);
    setSelectionMessage("");
    setAddedNotice(null);
    setBuilderEngaged(false);
    window.history.pushState({ ...(window.history.state ?? {}), lucianeCrocante: false }, "", categoryUrl(window.location.href, null));
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function choosePopcornVariant(nextId: string) {
    if (!categoryIsAvailable("pipocas")) return;
    const nextVariant = POPCORN.variants.find((variant) => variant.id === nextId);
    if (!nextVariant?.available || !popcornSizeIsAvailable(nextId)) return;
    setBuilderEngaged(true);
    setSelectionMessage("");
    setPopcornVariantId(nextId);
    requestScroll("gourmet-flavor-action");
    setPopcornOptionIds((current) => {
      const max = nextVariant.maxOptions ?? 0;
      if (current.length <= max) return current;
      setSelectionMessage(`Ajustamos sua seleção para o limite de ${max} sabores deste tamanho.`);
      return current.slice(0, max);
    });
  }

  function togglePopcornOption(option: ProductOption) {
    const alreadySelected = popcornOptionIds.includes(option.id);
    if (!categoryIsAvailable("pipocas") || !popcornVariant) return;
    if ((!option.available || !popcornFlavorIsAvailable(option.id)) && !alreadySelected) return;
    setBuilderEngaged(true);
    if (!alreadySelected && popcornOptionIds.length + 1 === popcornMaxOptions) {
      requestScroll("gourmet-quantity-action");
    }
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
    setPopcornVariantId("");
    setPopcornOptionIds([]);
    setPopcornQuantity(1);
    setSliceProductId("");
    setSliceOptionId("");
    setSliceQuantity(1);
    setConeProductId("");
    setConeQuantity(1);
    setEditingId(null);
    setSelectionMessage("");
    setBuilderEngaged(false);
  }

  function clearOrder() {
    if (finalizationLockRef.current) return;
    orderContextRef.current = null;
    setOrderContext(null);
    setAddressNumber("");
    setComplement("");
    setLegacyAddressNotice(false);
    setCart([]);
    setFulfillment("");
    setDeliveryZoneId("");
    setDeliveryLocalityId("");
    setNeighborhood("");
    setAddress("");
    setReference("");
    setPayment("");
    setCheckoutChannel(COMMERCE_CONFIG.siteOrderingEnabled ? "site" : "whatsapp");
    setCustomerName("");
    setNotes("");
    setNotesExpanded(false);
    setWhatsAppResult(null);
    setCustomerPhone("");
    setCustomerEmail("");
    setSiteResult(null);
    setNewPaymentAttempt(false);
    setNeedsChange(false);
    setChangeFor("");
    setDrinkMessage("");
    setRestoredOrderNotice(false);
    setAddedNotice(null);
    setCheckoutAvailabilityMessage("");
    checkoutStartedRef.current = false;
    paymentInfoTrackedRef.current = false;
    clearDraft();
    setBuilderEngaged(true);
    try {
      window.sessionStorage.removeItem(ORDER_STORAGE_KEY);
    } catch {
      // O estado em memória já foi limpo.
    }
  }

  function cartMetaPayload(value: number) {
    const contents = cart.map((item) => {
      const product = PRODUCTS.find((candidate) => candidate.id === item.productId)!;
      const variant = product.variants.find((candidate) => candidate.id === item.variantId)!;
      const unitPrice = itemUnitPrice(product, variant, item.optionIds, promotionTime);
      return {
        id: `${product.id}:${variant.id}`,
        quantity: item.quantity,
        item_price: unitPrice,
      };
    });

    return {
      content_ids: contents.map((item) => item.id),
      content_type: "product",
      contents,
      currency: "BRL",
      value,
      num_items: cart.reduce((total, item) => total + item.quantity, 0),
    };
  }

  function trackCheckoutStart() {
    if (!availability.ordersOpen || checkoutStartedRef.current || cart.length === 0) return;
    const didTrack = trackMetaEvent("InitiateCheckout", cartMetaPayload(cartSubtotal));
    if (didTrack) checkoutStartedRef.current = true;
  }

  function trackPaymentInfo(paymentMethod: Payment) {
    if (!availability.ordersOpen || paymentInfoTrackedRef.current || cart.length === 0) return;
    const didTrack = trackMetaEvent("AddPaymentInfo", {
      ...cartMetaPayload(hasEstimatedTotal ? orderTotal : cartSubtotal),
      payment_method: paymentMethod,
    });
    if (didTrack) paymentInfoTrackedRef.current = true;
  }

  function enterCheckout(sectionId: "recebimento" | "pagamento") {
    setBuilderEngaged(false);
    requestScroll(sectionId);
  }

  function nextCheckoutSection(receiving: Fulfillment = fulfillment): string {
    if (!receiving) return "recebimento";
    if (receiving === "entrega") {
      if (!selectedDeliveryZone || deliveryZoneError) return "delivery-fields";
      if (!cleanWhatsAppField(deliveryNeighborhood)) return "neighborhood";
      if (!cleanWhatsAppField(address)) return "address";
      if (!cleanWhatsAppField(addressNumber)) return "address-number";
    }
    if (!customerNameReady) return "identificacao";
    if (checkoutChannel === "site" && !customerPhoneReady) return "customer-phone";
    return "pagamento";
  }

  function chooseFulfillment(value: string) {
    trackCheckoutStart();
    setAddedNotice(null);
    setFulfillment(value as Fulfillment);
    setBuilderEngaged(false);
    requestScroll(nextCheckoutSection(value as Fulfillment));
  }

  function chooseCheckoutChannel(value: string) {
    const next = value === "site" && COMMERCE_CONFIG.siteOrderingEnabled && !cart.some((item) => isTrufadaOrLegacy(item.productId)) ? "site" : "whatsapp";
    if (next === checkoutChannel) return;
    setCheckoutChannel(next);
    setPayment("");
    setNeedsChange(false);
    setChangeFor("");
    setNewPaymentAttempt(false);
    setCheckoutAvailabilityMessage("");
  }

  function choosePayment(value: string) {
    const paymentMethod = value as Payment;
    trackPaymentInfo(paymentMethod);
    setPayment(paymentMethod);
    setNewPaymentAttempt(false);
  }

  async function addCrocantesCup() {
    if (cupAddLockRef.current) return;
    const product = PRODUCTS.find((candidate) => candidate.id === cupProductId);
    const variant = cupVariant;
    if (!product || !variant || !cupCanOrder) {
      setCupAddedNotice(!availability.ordersOpen ? "A loja está fechada no momento." : "Este pacote ainda não está disponível.");
      return;
    }
    cupAddLockRef.current = true;
    setCupAdding(true);
    try {
    const latest = await refreshAvailability();
    const qty = Math.min(99, Math.max(1, cupQuantity));
    const exactKey = trufadaStockItemKey(product.id, variant.id);
    const confirmedStock = exactKey ? (latest.snapshot.stockRemaining[exactKey] ?? 0) : 0;
    const alreadyInCart = cartStockCount(product.id, variant.id);
    if (latest.usedFallback || !latest.snapshot.ordersOpen || !latest.snapshot.stockChecked
      || !isItemAvailable(latest.snapshot, CATEGORY_ITEM_KEYS.pipocas)
      || !exactKey || !isItemAvailable(latest.snapshot, exactKey)
      || qty + alreadyInCart > confirmedStock) {
      setCupAddedNotice("Estoque insuficiente para essa quantidade. Atualize a seleção ou escolha outro sabor.");
      return;
    }
    setCart((current) => [...current, { id: makeCartId(), productId: product.id, variantId: variant.id, optionIds: [], quantity: qty }]);
    trackMetaEvent("AddToCart", metaProductPayload(product, variant, qty));
    setAddedNotice({
      category: "pipocas",
      productId: product.id,
      description: `${product.name} · ${variant.label} · ${qty} ${qty === 1 ? "unidade" : "unidades"} · ${currency.format(variant.price * qty)}`,
    });
    setCheckoutChannel("whatsapp");
    setPayment("");
    setBuilderEngaged(false);
    setCheckoutAvailabilityMessage("");
    setCupAddedNotice("");
    setCupFlavorPreview(null);
    setCupSizeId(null);
    setCupQuantity(1);
    setShowLimitedCupView(false);
    setRequestedCategory(null);
    window.history.replaceState({ ...(window.history.state ?? {}), lucianeCrocante: false }, "", categoryUrl(window.location.href, null));
    requestScroll("recebimento");
    } catch {
      setCupAddedNotice("Não foi possível confirmar o estoque. Tente novamente.");
    } finally {
      cupAddLockRef.current = false;
      setCupAdding(false);
    }
  }

  function addOrUpdatePopcorn() {
    if (!categoryIsVisible("pipocas")) return;
    if (!availability.ordersOpen) {
      setSelectionMessage(STORE_CONFIG.closedMessage);
      return;
    }
    if (!categoryIsAvailable("pipocas")) {
      setSelectionMessage("Pipocas Gourmet estão esgotadas no momento.");
      return;
    }
    if (!popcornVariant || !popcornVariantUsable) {
      setBuilderEngaged(true);
      setSelectionMessage("Escolha o tamanho da sua pipoca para continuar.");
      requestScroll("gourmet-size-action");
      return;
    }
    if (!popcornReady) {
      setBuilderEngaged(true);
      setSelectionMessage("Escolha pelo menos 1 sabor para continuar.");
      requestScroll("gourmet-flavor-action");
      return;
    }
    const nextItem: Omit<CartItem, "id"> = {
      productId: POPCORN.id,
      variantId: popcornVariantId,
      optionIds: [...popcornOptionIds],
      quantity: popcornQuantity,
    };
    setCheckoutAvailabilityMessage("");
    const wasEditing = Boolean(editingId);
    if (wasEditing) {
      setCart((current) => current.map((item) => item.id === editingId ? { ...item, ...nextItem } : item));
    } else {
      setCart((current) => [...current, { id: makeCartId(), ...nextItem }]);
      trackMetaEvent("AddToCart", metaProductPayload(POPCORN, popcornVariant, popcornQuantity, popcornOptionIds));
      const flavorNames = popcornOptionIds
        .map((id) => POPCORN.options.find((option) => option.id === id)?.name)
        .filter(Boolean)
        .join(" + ");
      setAddedNotice({
        category: "pipocas",
        productId: POPCORN.id,
        description: `${popcornQuantity}x Pipoca Gourmet ${popcornVariant.label} · ${flavorNames}`,
      });
    }
    const destination = wasEditing ? "carrinho" : "recebimento";
    clearDraft();
    setBuilderEngaged(false);
    requestScroll(destination);
  }

  function addOrUpdateSlice() {
    if (!categoryIsVisible("fatias")) return;
    if (!availability.ordersOpen) {
      setSelectionMessage(STORE_CONFIG.closedMessage);
      return;
    }
    if (!categoryIsAvailable("fatias")) {
      setSelectionMessage("Fatias Artesanais estão esgotadas no momento.");
      return;
    }
    if (!selectedSlice || !selectedSliceVariant) {
      setBuilderEngaged(true);
      setSelectionMessage("Escolha sua fatia para continuar.");
      scrollToSection("fatias");
      return;
    }
    if (!sliceReady) { setSelectionMessage("Escolha com calda de chocolate ou sem calda para continuar."); requestScroll("calda-fatias"); return; }
    if (selectedSlice.id === "fatia-chocolate-morango" && availability.slicePreorder?.active) {
      const original=editingId ? cart.find(item=>item.id===editingId)?.quantity ?? 0 : 0;
      const reserved=cart.filter(item=>item.productId==="fatia-chocolate-morango").reduce((sum,item)=>sum+item.quantity,0);
      if (reserved-original+sliceQuantity > availability.slicePreorder.remaining) {
        setSelectionMessage("Limite da pré-reserva atingido. Reduza a quantidade.");return;
      }
    }
    const nextItem: Omit<CartItem, "id"> = {
      productId: selectedSlice.id,
      variantId: selectedSliceVariant.id,
      optionIds: [sliceOptionId],
      quantity: sliceQuantity,
    };
    setCheckoutAvailabilityMessage("");
    const wasEditing = Boolean(editingId);
    if (wasEditing) {
      setCart((current) => current.map((item) => item.id === editingId ? { ...item, ...nextItem } : item));
    } else {
      setCart((current) => [...current, { id: makeCartId(), ...nextItem }]);
      trackMetaEvent("AddToCart", metaProductPayload(selectedSlice, selectedSliceVariant, sliceQuantity));
      setAddedNotice({
        category: "fatias",
        productId: selectedSlice.id,
        description: `${sliceQuantity}x ${selectedSlice.cardName ?? productLabel(selectedSlice)} · ${SLICE_OPTIONS.find((option) => option.id === sliceOptionId)?.name ?? "Personalizada"}`,
      });
    }
    const destination = wasEditing ? "carrinho" : "recebimento";
    clearDraft();
    setBuilderEngaged(false);
    requestScroll(destination);
  }

  function addDrink(product: Product) {
    if (!availability.ordersOpen || !isProductEnabled(product) || !product.available || !product.variants[0].available) return;
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
    if (isTrufadaOrLegacy(product.id)) return; // Quantidade é alterável no carrinho.
    if (product.kind === "drink" || !isProductEnabled(product)) return;
    const itemCategory = product.kind === "popcorn" ? "pipocas" : "fatias";
    if (!categoryIsAvailable(itemCategory)) {
      setCheckoutAvailabilityMessage(`${product.category} estão indisponíveis. Remova este item ou escolha outra categoria.`);
      scrollToSection("carrinho");
      return;
    }
    window.history.replaceState(window.history.state, "", categoryUrl(window.location.href, itemCategory));
    setEditingId(item.id);
    setShowLimitedCupView(false);
    setBuilderEngaged(true);
    setSelectionMessage("");
    setAddedNotice(null);
    if (product.kind === "popcorn") {
      setRequestedCategory("pipocas");
      setPopcornVariantId(product.variants.find((variant) => variant.id === item.variantId)?.retired ? "" : item.variantId);
      setPopcornOptionIds([...item.optionIds]);
      setPopcornQuantity(item.quantity);
    } else {
      setRequestedCategory("fatias");
      setSliceProductId(product.id);
      setSliceOptionId(item.optionIds[0] ?? "");
      setSliceQuantity(item.quantity);
    }
    window.setTimeout(() => scrollToSection("configurador"), 30);
  }

  function removeItem(id: string) {
    const removingLastItem = cart.length === 1 && cart[0]?.id === id;
    setCheckoutAvailabilityMessage("");
    setCart((current) => current.filter((item) => item.id !== id));
    if (editingId === id) clearDraft();
    if (removingLastItem) setBuilderEngaged(true);
  }

  function changeCartQuantity(id: string, delta: number) {
    const itemIssue = cartIssues.find((issue) => issue.cartItemId === id);
    if (delta > 0 && (!availability.ordersOpen || itemIssue)) return;
    if (delta > 0) {
      const selected = cart.find(item => item.id === id);
      const key = selected ? trufadaStockItemKey(selected.productId, selected.variantId) : null;
      if (selected?.productId==="fatia-chocolate-morango" && strawberryPreorder
        && reservedInCart >= strawberryPreorder.remaining) {
        setCheckoutAvailabilityMessage("Não há mais fatias disponíveis para pré-reserva.");return;
      }
      if (key && (!availability.stockChecked || cartStockCount(selected!.productId, selected!.variantId) >= (availability.stockRemaining[key] ?? 0))) {
        setCheckoutAvailabilityMessage("Não há mais pacotes disponíveis deste sabor para aumentar a quantidade.");
        return;
      }
    }
    if (delta > 0 && availability.ordersOpen) {
      const item = cart.find((candidate) => candidate.id === id);
      const product = PRODUCTS.find((candidate) => candidate.id === item?.productId);
      const variant = product?.variants.find((candidate) => candidate.id === item?.variantId);
      if (product && variant) {
        trackMetaEvent("AddToCart", metaProductPayload(product, variant, 1, item?.optionIds ?? []));
      }
    }
    setCart((current) => current.map((item) => item.id === id
      ? { ...item, quantity: Math.min(99, Math.max(1, item.quantity + delta)) }
      : item));
  }


  async function finishOnSite(card?: MercadoPagoCardData) {
    if (cart.some((item) => isTrufadaOrLegacy(item.productId))) {
      setCheckoutChannel("whatsapp");
      setCheckoutAvailabilityMessage("Pedidos com pacotes Trufados são concluídos pelo WhatsApp.");
      return;
    }
    if (finalizationLockRef.current || !COMMERCE_CONFIG.siteOrderingEnabled || !isSitePayment(payment)) return;
    if (!availability.ordersOpen) {
      scrollToSection("inicio");
      return;
    }
    if (popcornPromotionActive !== isPopcornPromotionActive()) {
      refreshPromotionTime();
      setCheckoutAvailabilityMessage("A condição especial terminou ou foi atualizada. Revise o valor do seu pedido antes de pagar.");
      throw new Error("Os preços mudaram. Confira o total atualizado antes de finalizar.");
    }
    if (!checkoutFormReady) {
      if (!cart.length) {
        setBuilderEngaged(true);
        scrollToSection(activeCategory ? "configurador" : "inicio");
      } else if (!fulfillment || !addressReady) enterCheckout("recebimento");
      else if (!customerReady) {
        setCheckoutAvailabilityMessage(!customerNameReady ? "Informe seu nome para continuar." : "Informe um celular válido com DDD.");
        scrollToSection("identificacao");
      } else {
        setCheckoutAvailabilityMessage(changeError || (payment === "mercado_pago_pix" ? "Informe um e-mail válido para gerar o Pix." : "Escolha a forma de pagamento."));
        enterCheckout("pagamento");
      }
      throw new Error("Confira os campos destacados antes de pagar.");
    }
    if (payment === "mercado_pago_card" && !card) {
      setCheckoutAvailabilityMessage("Preencha o formulário seguro do cartão para concluir.");
      enterCheckout("pagamento");
      return;
    }

    const effectiveEmail = payment === "mercado_pago_card" ? card?.payer_email?.trim().toLowerCase() : customerEmail.trim().toLowerCase();
    if ((payment === "mercado_pago_pix" || payment === "mercado_pago_card")
      && (!effectiveEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(effectiveEmail))) {
      setCheckoutAvailabilityMessage("Informe um e-mail válido no pagamento seguro.");
      throw new Error("Informe um e-mail válido no pagamento seguro.");
    }

    finalizationLockRef.current = true;
    setIsFinalizing(true);
    setOpeningWhatsApp(false);
    setCheckoutAvailabilityMessage("Conferindo o pedido e calculando o total…");
    try {
      const latest = await refreshAvailability();
      if (latest.usedFallback) throw new Error("Não foi possível confirmar a disponibilidade agora. Seu pedido continua salvo; tente novamente em instantes.");
      if (!latest.snapshot.ordersOpen) throw new Error(STORE_CONFIG.closedMessage);
      const latestIssues = cartAvailabilityIssues(cart, latest.snapshot);
      if (latestIssues.length) {
        throw new Error(`Um item acabou de ficar indisponível: ${latestIssues.map((issue) => `${issue.itemLabel}: ${issue.reasons.join(" ")}`).join("; ")}. Revise o carrinho.`);
      }
      if (checkoutFingerprintRef.current !== checkoutFingerprint) throw new Error("O pedido foi alterado durante a conferência. Confira o resumo e tente novamente.");

      const previous = orderContextRef.current;
      const attribution = captureOrderAttribution(window.location.href, document.cookie, previous?.attribution ?? attributionRef.current);
      const context = !previous || (previous.handoff_fingerprint && previous.handoff_fingerprint !== checkoutFingerprint)
        ? newOrderContext(attribution)
        : { ...previous, attribution };
      const next = { ...context, handoff_fingerprint: checkoutFingerprint };
      orderContextRef.current = next;
      setOrderContext(next);
      const cardPayload = card ? {
        token: card.token,
        payment_method_id: card.payment_method_id,
        payment_type_id: card.payment_type_id,
        installments: card.installments,
        ...(card.identification ? { identification: card.identification } : {}),
      } : undefined;
      const result = await createSiteOrder({
        client_order_id: next.order_id,
        customer: {
          name: customerName.trim(),
          phone: customerPhone.replace(/\D/g, ""),
          ...(effectiveEmail ? { email: effectiveEmail } : {}),
        },
        items: cart.map((item) => ({
          product_id: item.productId,
          variant_id: item.variantId,
          option_ids: [...item.optionIds],
          quantity: item.quantity,
        })),
        fulfillment: fulfillment === "retirada" ? { type: "pickup" } : {
          type: "delivery",
          zone_id: deliveryZoneId,
          locality_id: deliveryLocalityId,
          neighborhood: deliveryNeighborhood,
          street: address,
          number: addressNumber,
          complement,
          reference,
        },
        payment: {
          method: payment,
          ...(payment === "cash" && needsChange && cashReceivedCents !== null
            ? { change_for: (cashReceivedCents / 100).toFixed(2) }
            : {}),
          ...(cardPayload ? { card: cardPayload } : {}),
        },
        attribution,
        ...(newPaymentAttempt ? { new_payment_attempt: true } : {}),
      });

      if ((payment === "mercado_pago_pix" || payment === "mercado_pago_card") && isGatewayFailed(result.payment)) {
        setNewPaymentAttempt(true);
        throw new Error("O pagamento não foi aprovado. Confira os dados e faça uma nova tentativa.");
      }

      setNewPaymentAttempt(false);
      setSiteResult(result);
      setCheckoutAvailabilityMessage("");
      try {
        window.sessionStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify({
          ...savedOrder,
          order: next,
          siteResult: result,
          initiateCheckoutTracked: checkoutStartedRef.current,
          paymentInfoTracked: paymentInfoTrackedRef.current,
        }));
      } catch { /* O resultado continua em memória. */ }
    } catch (error) {
      if (error instanceof SiteOrderError && error.status === 422 && error.code === "payment_not_created") setNewPaymentAttempt(true);
      const message = error instanceof Error ? error.message : "Não foi possível concluir o pedido. Seus dados foram preservados.";
      setCheckoutAvailabilityMessage(message);
      throw error;
    } finally {
      finalizationLockRef.current = false;
      setIsFinalizing(false);
    }
  }

  async function finishOnWhatsApp() {
    if (finalizationLockRef.current) return;
    if (popcornPromotionActive !== isPopcornPromotionActive()) {
      refreshPromotionTime();
      setCheckoutAvailabilityMessage("Os preços foram atualizados. Confira o total e finalize novamente.");
      return;
    }
    if (!checkoutFormReady) {
      setBuilderEngaged(false);
      setCheckoutAvailabilityMessage("Complete as informações acima para continuar.");
      requestScroll(cart.length ? nextCheckoutSection() : "carrinho");
      return;
    }
    const retrying = orderContextRef.current?.handoff_fingerprint === checkoutFingerprint;
    if (!availability.ordersOpen && !retrying) { setCheckoutAvailabilityMessage(STORE_CONFIG.closedMessage); return; }
    finalizationLockRef.current = true;
    setIsFinalizing(true);
    setWhatsAppRetryAvailable(false);
    setCheckoutAvailabilityMessage("Registrando sua solicitação…");
    try {
      if (!retrying) {
      const latest = await refreshAvailability();
      if (latest.usedFallback) throw new Error("Não conseguimos concluir seu pedido agora. Tente novamente.");
      if (!latest.snapshot.ordersOpen) throw new Error(STORE_CONFIG.closedMessage);
      const issues = cartAvailabilityIssues(cart, latest.snapshot);
      if (issues.length) throw new Error(`Item indisponível: ${issues.map(issue => `${issue.itemLabel}: ${issue.reasons.join(" ")}`).join("; ")}`);
      }
      if (checkoutFingerprintRef.current !== checkoutFingerprint) throw new Error("O pedido foi alterado durante a conferência. Confira o resumo e tente novamente.");
      const previous = orderContextRef.current;
      const attribution = captureOrderAttribution(window.location.href, document.cookie, previous?.attribution ?? attributionRef.current);
      const context = !previous || (previous.handoff_fingerprint && previous.handoff_fingerprint !== checkoutFingerprint)
        ? newOrderContext(attribution) : { ...previous, attribution };
      const next = { ...context, handoff_fingerprint: checkoutFingerprint };
      orderContextRef.current = next;
      setOrderContext(next);
      // Persist identity before the network request: a timeout can be retried safely.
      try { window.sessionStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify({ ...savedOrder, order: next })); } catch { /* In-memory identity retained. */ }
      const result = await createWhatsAppOrder({
        client_order_id: next.order_id, request_key: next.request_key!,
        customer: { name: customerName.trim(), phone: "" },
        items: checkoutDetails.items.map(({ product_id, variant_id, option_ids, quantity }) => ({ product_id, variant_id, option_ids, quantity })),
        fulfillment: { type: fulfillment === "entrega" ? "delivery" : "pickup",
          ...(fulfillment === "entrega" ? { zone_id: deliveryZoneId, locality_id: deliveryLocalityId, neighborhood: deliveryNeighborhood, street: address, number: addressNumber, complement, reference } : {}) },
        payment: { method: payment === "pix" ? "manual_pix" : ["cartao", "credito", "debito"].includes(payment) ? "card_on_delivery" : "cash",
          ...(cardMode ? { card_mode: cardMode } : {}),
          ...(payment === "dinheiro" && needsChange && cashReceivedCents !== null ? { change_for: (cashReceivedCents / 100).toFixed(2) } : {}) },
        notes: notes.trim(), expected_total: orderTotal.toFixed(2), attribution,
      });
      const trackingUrl = `${window.location.origin}/pedido?token=${encodeURIComponent(result.order.tracking_token)}`;
      rememberOrder(result.order.tracking_token);
      setLastToken(result.order.tracking_token);
      const registered: RegisteredWhatsAppOrder = {
        result, customerName: customerName.trim(), trackingUrl,
        whatsappUrl: tintimWhatsAppUrl(buildRegisteredOrderMessage({ ...checkoutDetails,
            notes: checkoutDetails.notes,
            subtotal: Number(result.order.subtotal ?? checkoutDetails.subtotal),
            delivery_fee: Number(result.order.delivery_fee ?? checkoutDetails.delivery_fee),
            card_fee: Number(result.order.card_fee ?? 0),
            card_basis_points: result.order.card_basis_points ?? 0,
            total: Number(result.order.total)
          }, result.order.order_number, trackingUrl, PIX_DETAILS), attribution, document.cookie),
      };
      // The request snapshot remains immutable even if a control changed while awaiting the server.
      setWhatsAppResult(registered);
      try { window.sessionStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify({ ...savedOrder, order: next, whatsappResult: registered })); } catch { /* Copy-link remains available. */ }
      setCheckoutAvailabilityMessage("");
      window.scrollTo({ top: 0, behavior: "instant" });
    } catch (error) {
      setWhatsAppRetryAvailable(true);
      const temporaryFailure = !(error instanceof Error) || error instanceof TypeError || error.name === "AbortError"
        || (error instanceof SiteOrderError && (error.status >= 500 || error.status === 429));
      setCheckoutAvailabilityMessage(temporaryFailure ? "Não conseguimos concluir seu pedido agora. Tente novamente." : error.message);
    } finally { finalizationLockRef.current = false; setIsFinalizing(false); }
  }

  function stickyBuilderAction() {
    if (activeCategory === "pipocas" && categoryIsVisible("pipocas")) {
      if (!popcornVariantUsable) requestScroll("gourmet-size-action");
      else if (!popcornReady) requestScroll("gourmet-flavor-action");
      else addOrUpdatePopcorn();
    } else if (activeCategory === "fatias") addOrUpdateSlice();
  }

  function handleCupPurchaseAction() {
    if (!cupFlavorPreview) {
      requestScroll("crocantes-sabores");
      return;
    }
    if (!cupSizeId) {
      requestScroll("crocantes-tamanhos");
      return;
    }
    if (!cupCanOrder) {
      setCupAddedNotice("Este sabor está indisponível no momento.");
      return;
    }
    void addCrocantesCup();
  }

  function handleStickyAction() {
    // Mantém o dispatcher central de navegação; o caso Gourmet contextual
    // apenas leva à quantidade, sem adicionar item nem pular etapas.
    if (typeof gourmetContinueAvailable !== "undefined" && gourmetContinueAvailable) {
      requestScroll("gourmet-quantity-action");
      return;
    }
    if (typeof cupBuilderFlowActive !== "undefined" && cupBuilderFlowActive) handleCupPurchaseAction();
    else if (stickyUsesCheckoutAction) handleFinalAction();
    else stickyBuilderAction();
  }

  function handleFinalAction() {
    if (!checkoutFormReady) {
      setBuilderEngaged(false);
      setCheckoutAvailabilityMessage("Complete as informações acima para continuar.");
      requestScroll(cart.length ? nextCheckoutSection() : "carrinho");
      return;
    }
    if (checkoutChannel === "whatsapp") {
      void finishOnWhatsApp();
      return;
    }
    if (payment === "mercado_pago_card") {
      setCheckoutAvailabilityMessage("Preencha o formulário seguro do cartão para concluir.");
      enterCheckout("pagamento");
      return;
    }
    void finishOnSite().catch(() => {
      window.setTimeout(() => scrollToSection("carrinho"), 0);
    });
  }

  function startAnother(category: CategoryId) {
    if (!categoryIsAvailable(category)) return;
    clearDraft();
    setBuilderEngaged(true);
    selectCategory(category, true);
  }

  function startAnotherCrocantes() {
    if (!cupCanBeAddedFromCheckout) return;
    clearDraft();
    openLimitedCupEdition();
  }

  function beginBuilding() {
    setShowLimitedCupView(false);
    setBuilderEngaged(true);
    if (activeCategory === "pipocas") requestEditorialScroll("tamanhos");
    else scrollToSection(activeCategory ? "configurador" : "inicio");
  }

  // Generic form feedback follows the current missing field instead of staying stale.
  const checkoutFeedbackMessage = checkoutAvailabilityMessage === "Complete as informações acima para continuar."
    ? "" : checkoutAvailabilityMessage;
  const checkoutShowsReady = checkoutReady && !isFinalizing && !whatsAppRetryAvailable && !checkoutFeedbackMessage;
  const checkoutHint = (fulfillment === "entrega" && deliveryZoneError) || checkoutFeedbackMessage
    || (!availability.ordersOpen
    ? STORE_CONFIG.closedMessage
    : cartIssues.length > 0
      ? "Um ou mais itens ficaram indisponíveis. Revise o carrinho para continuar."
    : !cart.length
      ? "Adicione pelo menos um produto ao pedido."
      : !fulfillment
        ? "Escolha entrega ou retirada para continuar."
        : fulfillment === "entrega" && selectedDeliveryLocality && !deliveryLocalityCanQuote(selectedDeliveryLocality)
          ? "Este local precisa de confirmação da taxa com a loja."
          : fulfillment === "entrega" && !selectedDeliveryZone
            ? "Busque e selecione seu bairro para calcular a entrega."
            : !addressReady
              ? !cleanWhatsAppField(address) ? "Informe a rua da entrega." : "Informe o número da entrega (ou s/n)."
              : !customerNameReady
                ? "Informe seu nome para continuar."
                : checkoutChannel === "site" && !customerPhoneReady
                  ? "Informe um celular válido com DDD."
              : !payment
                ? "Escolha a forma de pagamento."
                : !paymentReady
                  ? changeError || (payment === "mercado_pago_pix" ? "Informe um e-mail válido para gerar o Pix." : "Confira a forma de pagamento.")
                  : checkoutChannel === "site"
                    ? payment === "mercado_pago_pix"
                      ? "O Pix será gerado pelo Mercado Pago e confirmado automaticamente."
                      : payment === "mercado_pago_card"
                        ? "Preencha o formulário seguro do cartão para concluir."
                        : `Ao confirmar, o pedido entra na cozinha e o pagamento será feito na ${fulfillment === "retirada" ? "retirada" : "entrega"}.`
                    : "Tudo certo! Seu pedido está pronto para ser enviado.");

  if (whatsappResult) return <WhatsAppOrderResultView order={whatsappResult} />;

  if (siteResult && (fulfillment === "entrega" || fulfillment === "retirada")) {
    return <SiteOrderResultView result={siteResult} fulfillment={fulfillment} onNewOrder={clearOrder} onRetryPayment={() => {
      setSiteResult(null);
      setNewPaymentAttempt(true);
      window.setTimeout(() => enterCheckout("pagamento"), 0);
    }} />;
  }

  return (
    <main className="storefront" inert={isFinalizing} aria-busy={isFinalizing}>
      <header className="brand-bar">
        <a className="brand-lockup" href="#inicio" aria-label="Voltar às categorias" onClick={(event) => { event.preventDefault(); returnToCategories(); }}>
          <span className="brand-crown" aria-hidden="true"><Crown size={17} strokeWidth={1.7} /></span>
          <span><strong>Luciane</strong><small>Oliveira Doces</small></span>
        </a>
        <span className="location-chip"><MapPin size={14} /> Paragominas</span>
      </header>

      <HomeLastOrderLink token={lastToken} />
      {restoredOrderNotice && cart.length > 0 && (
        <section className="session-order-strip" aria-label="Pedido em andamento">
          <div className="page-shell session-order-content" role="status">
            <span className="session-order-icon" aria-hidden="true"><ShoppingBag size={18} /></span>
            <div className="session-order-copy">
              <strong>Pedido em andamento</strong>
              <p>{inProgressSummary}</p>
            </div>
            <div className="session-order-actions">
              <Button type="button" variant="outline" onClick={() => { setRestoredOrderNotice(false); scrollToSection("carrinho"); }}>Ver pedido</Button>
              <Button type="button" variant="ghost" onClick={clearOrder}>Limpar</Button>
            </div>
          </div>
        </section>
      )}

      <section className={`menu-entry ${activeCategory ? "has-category" : "is-neutral"}`} id="inicio" aria-busy={!hasResolvedAvailability}>
        <div className="page-shell">
          {!availability.ordersOpen && (
            <div className="store-status-banner" role="status">
              <strong>{STORE_CONFIG.closedMessage}</strong>
              <span>Você ainda pode consultar o cardápio.</span>
            </div>
          )}
          {activeCategory ? (
            <div className="entry-heading">
              <p className="eyebrow">Luciane Oliveira Doces</p>
              <h1>{activeCategory === "pipocas" ? showLimitedCupView ? "Pipocas Trufadas" : "Pipocas Gourmet" : "Fatias Artesanais"}</h1>
              <p className="entry-copy">{activeCategory === "pipocas"
                ? showLimitedCupView ? "Três sabores artesanais em pacotes P, M e G." : "Escolha o tamanho e combine seus sabores."
                : "Sabores disponíveis"}</p>
              {availability.ordersOpen && visibleCategories.length > 0 && (
                <p className="delivery-time-estimate">
                  <span className="delivery-time-copy">
                    <span className="delivery-time-main">{DELIVERY_TIME_ESTIMATE}</span>{" "}
                    <span className="delivery-time-detail">O prazo começa após a confirmação da loja.</span>
                  </span>
                </p>
              )}
            </div>
          ) : (
            <div className="collection-heading">
              <p className="collection-kicker">Cardápio artesanal</p>
              <h1>Escolha seu <em>doce.</em></h1>
            </div>
          )}
          {!hasResolvedAvailability ? (
            <div className="collection-loading" role="status">Carregando cardápio…</div>
          ) : !activeCategory && (
            visibleCategories.length > 0 ? (
              <div className="collection-menu" role="group" aria-label="Escolha uma categoria">
                {pipocasVisible && (
                  <CollectionChoice format="Pacotes com zíper" name="Pipocas Trufadas"
                    photo="/images/pipocas-trufadas-ninho-20261101.webp" photoWidth={1086}
                    fallback="/images/pipocas-trufadas-pacoca-20261101.webp"
                    description="Ninho, Paçoca e Coco Queimado · P, M e G"
                    price={currency.format(TRUFADA_STARTING_PRICE)}
                    action={!pipocasAvailable || cupPhase === "sold-out" ? "Esgotado" : cupCanBeAddedFromCheckout ? "Ver sabores" : "Consultar sabores"}
                    disabled={!pipocasAvailable || cupPhase === "sold-out"} onClick={openLimitedCupEdition} />
                )}
                {visibleCategories.map((category) => {
                  const available = categoryIsAvailable(category.id);
                  const isPot = category.id === "pipocas";
                  const cover = isPot ? POPCORN : SLICES.find((slice) => sliceIsVisible(slice.id));
                  return (
                    <CollectionChoice key={category.id} format={isPot ? "Pote recheado" : "Bolo em fatias"}
                      name={category.name} photoWidth={isPot ? 1166 : 720}
                      photo={category.id === "fatias" ? "/images/categoria-fatias-editorial.webp" : "/images/categoria-pipocas-editorial-enquadrada-v107.webp"}
                      fallback={cover?.cardImage ?? cover?.image}
                      description={isPot ? "Escolha seu tamanho e combine os sabores." : "Camadas de massa e recheios artesanais."}
                      action={!available ? "Esgotado" : !availability.ordersOpen || availability.source !== "supabase" ? "Consultar sabores" : isPot ? "Montar pote" : "Escolher fatia"}
                      disabled={!available} onClick={() => selectCategory(category.id)} />
                  );
                })}
              </div>
            ) : (
              <div className="menu-empty-state" role="status">
                <strong>Cardápio temporariamente sem produtos disponíveis.</strong>
                <p>Consulte novamente em breve. Se precisar, fale com a Luciane.</p>
                <TintimContactLink className="category-text-link"><MessageCircle size={17} aria-hidden="true" /> Falar com a Luciane</TintimContactLink>
              </div>
            )
          )}
          {!activeCategory && hasResolvedAvailability && visibleCategories.length > 0 && (
            <div className="collection-service">
              <p><Truck size={16} aria-hidden="true" /><span>Entrega a partir de R$8 ou retirada em Paragominas</span></p>
              {availability.ordersOpen && <p><Clock3 size={16} aria-hidden="true" /><span>{DELIVERY_TIME_ESTIMATE}<small>O prazo começa após a confirmação da loja.</small></span></p>}
              <small>{COMMERCE_CONFIG.siteOrderingEnabled ? "Finalize seu pedido no site ou pelo WhatsApp." : "Monte seu pedido aqui e finalize pelo WhatsApp."}</small>
            </div>
          )}
          {activeCategory && <p className="delivery-note"><Truck size={16} aria-hidden="true" /> Entrega a partir de R$8 ou retirada em Paragominas</p>}
        </div>
      </section>

      {activeCategory && (
      <section className={showLimitedCupView ? "builder-section is-cup-discovery" : "builder-section"} id="configurador">
        <div className="page-shell builder-shell">
          {activeCategory === "pipocas" && showLimitedCupView && (
            <section className="limited-cup-story" id="edicao-crocante" aria-label="Pipocas Trufadas em pacotes com zíper">
              <nav className="v7-navigation v7-navigation-edition" aria-label="Navegação das Pipocas Trufadas">
                <button type="button" onClick={returnToCategories}><ArrowLeft size={15} aria-hidden="true" /> Voltar às categorias</button>
              </nav>
              <div className="limited-cup-selection-heading" id="crocantes-sabores" aria-label="Pacotes P, M e G — escolha do sabor">
                <span>Escolha seu sabor</span>
                <small>Pacotes com zíper · P, M e G</small>
              </div>
              <div className="limited-cup-duo is-trio" aria-label="Escolha um sabor de Pipocas Trufadas">
                {TRUFADA_PRODUCT_IDS.map((id) => {
                  const product = PRODUCTS.find(candidate => candidate.id === id);
                  if (!product) return null;
                  const selected = cupFlavorPreview === id;
                  return (
                    <button type="button" key={id} disabled={cupAdding}
                      className={`limited-cup-duo-item ${selected ? "is-selected" : ""}`}
                      aria-pressed={selected} aria-label={`${product.name}, ${selected ? "selecionado" : "selecionar sabor"}`} aria-controls="crocantes-tamanhos" onClick={() => selectCupFlavor(id)}>
                      {product.image && <img src={product.image} alt={product.imageAlt ?? `Pipocas Trufadas ${product.name}`}
                        width="840" height="1050" loading="lazy" decoding="async" />}
                      <span className="limited-cup-card-check" aria-hidden="true"><Check size={16} /></span>
                      <span className="limited-cup-duo-caption">
                        <strong>{product.name}</strong>
                        <span className="limited-cup-duo-disclosure">
                          {selected ? "Selecionado" : "Escolher"}
                          {selected ? <Check size={13} aria-hidden="true" /> : <ChevronRight size={13} aria-hidden="true" />}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {cupProduct && (
              <div className="limited-cup-size-section" id="crocantes-tamanhos" key={cupProduct.id}>
                <div className="limited-cup-size-intro">
                  <h2>Escolha o tamanho</h2>
                  <span className="limited-cup-selected-flavor"><Check size={14} aria-hidden="true" /> {cupProduct.name}</span>
                </div>
                <div className="limited-cup-size-options" role="group" aria-label="Tamanho do pacote">
                  {TRUFADA_SIZES.map((size) => {
                    const variant = cupProduct?.variants.find(entry => entry.id === size);
                    const key = cupProduct ? trufadaStockItemKey(cupProduct.id, size) : null;
                    const stock = key ? availability.stockRemaining[key] ?? 0 : 0;
                    const available = availability.stockChecked && Boolean(key && isItemAvailable(availability, key) && stock > 0);
                    return (
                      <button type="button" key={size} className={`limited-cup-size-option ${cupSizeId === size ? "is-selected" : ""}`}
                        disabled={!cupProduct || cupAdding || !available} aria-pressed={cupSizeId === size}
                        aria-label={cupProduct && variant ? `${cupProduct.name}, pacote ${size.toUpperCase()}, ${currency.format(variant.price)}, ${available ? "disponível" : "indisponível"}` : `Pacote ${size.toUpperCase()}, escolha primeiro o sabor`}
                        onClick={() => selectCupSize(size)}>
                        <span className="limited-cup-size-letter">{size.toUpperCase()}</span>
                        <strong className="limited-cup-size-price">{variant ? currency.format(variant.price) : "—"}</strong>
                        {cupSizeId === size ? (
                          <span className="limited-cup-size-status is-picked"><Check size={13} aria-hidden="true" /> Selecionado</span>
                        ) : !availability.stockChecked ? (
                          <span className="limited-cup-size-status">Consultando estoque</span>
                        ) : !available ? (
                          <span className="limited-cup-size-status is-unavailable">Esgotado</span>
                        ) : (
                          <span className="limited-cup-size-status is-blank" aria-hidden="true">&nbsp;</span>
                        )}
                        {cupSizeId === size && (
                          <span className="limited-cup-size-check" aria-hidden="true"><Check size={15} strokeWidth={3} /></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              )}
              <div className="limited-cup-story-bottom">
                {cupProduct && cupVariant && (
                <div className="limited-cup-buy" id="crocantes-quantidade" key={`${cupProduct.id}-${cupVariant.id}`} aria-label="Quantidade e inclusão no pedido">
                  <div className="limited-cup-buy-heading">
                    <strong>Seu pacote</strong>
                    <small>{cupProduct.name} · {cupVariant.label}</small>
                  </div>
                  <div className="limited-cup-buy-actions">
                    <div className="limited-cup-buy-composition">
                      <div className="limited-cup-quantity-control">
                        <span className="limited-cup-quantity-label">Quantidade</span>
                        <div className="mini-quantity" role="group" aria-label="Quantidade de pacotes">
                          <Button type="button" variant="ghost" size="icon" aria-label="Diminuir quantidade de pacotes"
                            disabled={!cupVariant || cupQuantity <= 1 || cupAdding} onClick={() => setCupQuantity(n => Math.max(1, n - 1))}><Minus size={16} /></Button>
                          <strong aria-live="polite">{cupQuantity}</strong>
                          <Button type="button" variant="ghost" size="icon" aria-label="Aumentar quantidade de pacotes"
                            disabled={!cupCanOrder || cupQuantity >= Math.min(99, cupRemaining) || cupAdding}
                            onClick={() => setCupQuantity(n => Math.min(99, cupRemaining, n + 1))}><Plus size={16} /></Button>
                        </div>
                      </div>
                      <div className="limited-cup-buy-estimate" aria-live="polite" aria-atomic="true">
                        <span>Subtotal</span>
                        <strong key={`${cupProduct.id}-${cupVariant.id}-${cupQuantity}`}>
                          {currency.format(cupVariant.price * cupQuantity)}
                        </strong>
                      </div>
                    </div>
                    <Button type="button" className="limited-cup-buy-cta"
                      disabled={cupAdding || cupPhase !== "available" || (Boolean(cupSizeId) && !cupCanOrder)}
                      onClick={handleCupPurchaseAction}>
                      {cupAdding ? <LoaderCircle className="admin-spinner" size={16} aria-hidden="true" /> : <ShoppingBag size={16} aria-hidden="true" />}
                      {cupActionLabel}
                    </Button>
                  </div>
                  {availability.stockChecked && availability.ordersOpen && cupRemaining <= 3 && (
                    <p className="limited-cup-stock-note" role="status">
                      {cupRemaining > 0 ? `Restam ${cupRemaining} ${cupRemaining === 1 ? "pacote" : "pacotes"} desta combinação.` : "Sem saldo livre; confira seu carrinho."}
                    </p>
                  )}
                  {cartContainsCrocantes && <button type="button" className="limited-cup-to-cart" onClick={() => requestScroll("carrinho")}>
                    <ShoppingBag size={16} aria-hidden="true" /><span>Ver carrinho e continuar pedido</span><ChevronRight size={16} aria-hidden="true" />
                  </button>}
                </div>
                )}
                {cupAddedNotice && <p className="limited-cup-buy-feedback" role="status">{cupAddedNotice}</p>}
                {cupPhase === "available" ? (
                  cupVariant && <p className="limited-cup-stock-note"><span aria-hidden="true">✦</span> Feito artesanalmente para você.</p>
                ) : (
                  <div className={`limited-cup-story-availability is-current ${cupPhase === "closed" ? "is-closed" : ""}`}>
                    <span className="limited-cup-story-availability-kicker">{cupPhase === "closed" ? "LOJA FECHADA" : cupPhase === "sold-out" ? "ESGOTADO NO MOMENTO" : "INDISPONÍVEL NO MOMENTO"}</span>
                    <p>{cupLaunchCopy.description}</p>
                  </div>
                )}
                {(cupVariant || cupPhase !== "available") && (
                <div className="limited-cup-story-footer">
                  <div className="limited-cup-more-intro">
                    <span>{cart.length > 0 ? "COMPLETE SEU PEDIDO" : "CONHEÇA TAMBÉM"}</span>
                    <strong>{cart.length > 0 ? "Que tal mais uma delícia?" : "Explore outras delícias"}</strong>
                  </div>
                  {categoryIsAvailable("pipocas") && (
                    <button type="button" onClick={() => selectCategory("pipocas")}>
                      <span>Pipocas Gourmet</span>
                      <strong>Ver sabores <ChevronRight size={15} aria-hidden="true" /></strong>
                    </button>
                  )}
                  {fatiasAvailable && (
                    <button type="button" className="limited-cup-more-slices" onClick={() => selectCategory("fatias")}>
                      <span>Fatias Artesanais</span>
                      <strong>Ver fatias <ChevronRight size={15} aria-hidden="true" /></strong>
                    </button>
                  )}
                </div>
                )}
              </div>
            </section>
          )}
          {activeCategory === "fatias" && (
            <nav className="v7-navigation v7-navigation-slices" aria-label="Navegação das fatias">
              <button type="button" onClick={returnToCategories}><ArrowLeft size={15} aria-hidden="true" /> Voltar às categorias</button>
            </nav>
          )}
          <div className="section-intro" id="potes-recheados">
            <p className="eyebrow">Seu pedido, do seu jeito</p>
            <h2>{activeCategory === "pipocas" ? "Crie sua combinação." : "Sua vitrine de sabores."}</h2>
            <p>{activeCategory === "pipocas"
              ? "Um tamanho, seus sabores favoritos. Tudo do seu jeito."
              : "Escolha sua fatia favorita. Depois, você pode adicionar outras."}</p>
            {visibleCategories.filter((category) => category.id !== activeCategory).map((category) => (
              <button type="button" className="category-text-link" key={category.id}
                disabled={!categoryIsAvailable(category.id)} onClick={() => selectCategory(category.id)}>
                {category.name}{!categoryIsAvailable(category.id) && " — Esgotado"} <ChevronRight size={15} aria-hidden="true" />
              </button>
            ))}
          </div>

          {((activeCategory === "pipocas" && (!pipocasAvailable || !POPCORN.available))
            || (activeCategory === "fatias" && (!fatiasAvailable || !SLICES.some((slice) => (
              sliceIsVisible(slice.id) && sliceIsAvailable(slice.id) && slice.available && slice.variants[0]?.available
            ))))) && (
            <div className="availability-alert" role="status">
              <strong>Esgotado hoje</strong>
              <span>Esta categoria está temporariamente indisponível.</span>
            </div>
          )}

          {activeCategory === "pipocas" && pipocasVisible ? (
            <div className="builder-card">
              <section className={`step-block step-state-${popcornSizeStepState}`} id="tamanhos" aria-labelledby="step-size" aria-current={popcornSizeStepState === "active" ? "step" : undefined}>
                <nav className="v7-navigation v7-navigation-pipocas" aria-label="Navegação das pipocas">
                  <button type="button" onClick={returnToCategories}><ArrowLeft size={15} aria-hidden="true" /> Categorias</button>
                  <button type="button" onClick={openLimitedCupEdition}>Conhecer Trufadas <ChevronRight size={15} aria-hidden="true" /></button>
                </nav>
                {popcornPromotionActive && pipocasAvailable && POPCORN.variants.some(variant => popcornSizeIsAvailable(variant.id)) && (
                  <StorefrontCampaignEditorial campaign={GOURMET_HOLIDAY_CREATIVE} />
                )}
                <div className="step-heading"><StepMarker number={1} state={popcornSizeStepState} /><div><h3 id="step-size">Escolha o tamanho</h3><p>{popcornPromotionActive ? "Toque no tamanho desejado e depois escolha seus recheios." : "O preço e o limite de sabores mudam conforme o pote."}</p></div></div>
                {!POPCORN.variants.some((variant) => popcornSizeIsVisible(variant.id)) && <p className="selection-helper" role="status">Nenhum tamanho disponível no momento.</p>}
                <RadioGroup className="size-grid" value={popcornVariantId} onValueChange={choosePopcornVariant} aria-label="Tamanho da Pipoca Gourmet">
                  {POPCORN.variants.filter((variant) => popcornSizeIsVisible(variant.id)).map((variant) => {
                    const available = pipocasAvailable && POPCORN.available && variant.available && popcornSizeIsAvailable(variant.id);
                    return (
                      <label className={`size-card ${variant.id === popcornVariantId ? "is-selected" : ""} ${!available ? "is-unavailable" : ""}`} htmlFor={`size-${variant.id}`} key={variant.id}>
                        <RadioGroupItem id={`size-${variant.id}`} value={variant.id} disabled={!available} />
                        <span className="size-copy"><strong>{variant.label}</strong><b>{currency.format(itemUnitPrice(POPCORN, variant, popcornOptionIds, promotionTime))}</b><small>Até {variant.maxOptions} sabores</small></span>
                        {variant.id === popcornVariantId && available && <span className="selected-check" aria-hidden="true"><Check size={14} strokeWidth={3} /></span>}
                        {!available && <span className="unavailable-label">Esgotado hoje</span>}
                      </label>
                    );
                  })}
                </RadioGroup>
                <div className="selection-helper" aria-live="polite">
                  {popcornVariant
                    ? popcornVariantUsable
                      ? `${popcornVariant.label} selecionado. Agora escolha os sabores da sua pipoca.`
                      : "Este tamanho ficou indisponível. Escolha outro para continuar."
                    : selectionMessage || "Nenhum tamanho selecionado. Escolha uma opção para continuar."}
                </div>
              </section>

              <section className={`step-block step-state-${popcornFlavorStepState}`} id="sabores" aria-labelledby="step-flavors" aria-current={popcornFlavorStepState === "active" ? "step" : undefined}>
                <div className="step-heading flavor-heading">
                  <StepMarker number={2} state={popcornFlavorStepState} />
                  <div><h3 id="step-flavors">Escolha os sabores da sua pipoca</h3><p>{popcornVariant ? `Escolha de 1 até ${popcornMaxOptions} sabores. Você decide quantos combinar.` : "Primeiro, escolha o tamanho acima."}</p></div>
                  <div className="gourmet-flavor-progress" role="group" aria-label={popcornVariant ? `${popcornOptionIds.length} de ${popcornMaxOptions} sabores escolhidos` : "Escolha primeiro o tamanho"}>
                    <span className="selection-count" aria-hidden="true">{popcornVariant ? `${popcornOptionIds.length}/${popcornMaxOptions}` : "—"}</span>
                    {popcornMaxOptions > 0 && (
                      <span className="gourmet-flavor-progress-track" aria-hidden="true">
                        {Array.from({ length: popcornMaxOptions }, (_, index) => (
                          <span key={index} className={index < popcornOptionIds.length ? "is-filled" : ""} />
                        ))}
                      </span>
                    )}
                  </div>
                </div>
                {popcornVariantUsable && popcornVariant && (
                  <div className="boutique-flavor-stage">
                    {POPCORN.image && (
                      <span className="boutique-flavor-stage-media" aria-hidden="true">
                        <img src="/images/categoria-pipocas-editorial.webp" onError={(event) => { event.currentTarget.onerror = null; const fallback = POPCORN.cardImage ?? POPCORN.image; if (fallback) event.currentTarget.src = fallback; }} alt="" width="1000" height="750" loading="lazy" decoding="async" />
                      </span>
                    )}
                    <div className="boutique-flavor-stage-content">
                      <span className="boutique-flavor-stage-kicker">Seu pote · {popcornVariant.label}</span>
                      <div className="boutique-price-guide" aria-live="polite" aria-atomic="true">
                        <div className="boutique-price-guide-copy">
                          <span>{popcornOptionIds.length > 0 ? "Preço atual do pote" : "Preço base do pote"}</span>
                          <strong>{currency.format(popcornPrice(popcornVariant.id, popcornOptionIds, promotionTime))}</strong>
                        </div>
                        <p>{popcornPromotionActive
                          ? popcornOptionIds.includes("nutella")
                            ? "Com Nutella, vale o preço normal do pote inteiro, mesmo em combinações."
                            : "Sabores participantes pelo preço-base. Nutella fica no preço normal."
                          : "O preço varia por sabor. Ao combinar, vale o sabor de maior valor."}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flavor-grid">
                  {POPCORN.options.filter((option) => popcornFlavorIsVisible(option.id)).map((option) => {
                    const selected = popcornOptionIds.includes(option.id);
                    const limitDisabled = popcornLimitReached && !selected;
                    const waitingForSize = !popcornVariantUsable;
                    const available = pipocasAvailable && option.available && popcornFlavorIsAvailable(option.id);
                    const disabled = waitingForSize || (!available && !selected) || limitDisabled;
                    const currentPotPrice = popcornVariantUsable && popcornVariant
                      ? popcornPrice(popcornVariant.id, popcornOptionIds, promotionTime) : null;
                    const potPriceWithOption = popcornVariantUsable && popcornVariant
                      ? popcornPrice(popcornVariant.id, selected ? popcornOptionIds : [...popcornOptionIds, option.id], promotionTime)
                      : null;
                    const flavorPotPrice = popcornVariantUsable && popcornVariant
                      ? popcornPrice(popcornVariant.id, [option.id], promotionTime) : null;
                    const priceDifference = currentPotPrice !== null && potPriceWithOption !== null
                      ? Math.max(0, potPriceWithOption - currentPotPrice) : 0;
                    const optionCombination = selected ? popcornOptionIds : [...popcornOptionIds, option.id];
                    const regularSpecialPrice = popcornVariantUsable && popcornVariant && option.pricingGroup && option.pricingGroup > 1
                      ? popcornPrice(popcornVariant.id, optionCombination, POPCORN_PROMOTION.startsAt - 1)
                      : null;
                    const includesNutella = optionCombination.includes("nutella");
                    const savedToday = !includesNutella && regularSpecialPrice !== null && potPriceWithOption !== null
                      ? Math.max(0, regularSpecialPrice - potPriceWithOption)
                      : 0;
                    return (
                      <label className={`flavor-card ${selected ? "is-selected" : ""} ${disabled ? "is-disabled" : ""}`} htmlFor={`flavor-${option.id}`} key={option.id}>
                        <Checkbox id={`flavor-${option.id}`} checked={selected} disabled={disabled} onCheckedChange={() => togglePopcornOption(option)} aria-label={selected ? `Remover sabor ${option.name}` : `Selecionar sabor ${option.name}`} />
                        <span className="boutique-flavor-identity">
                          <span className="flavor-tone" style={{ backgroundColor: option.tone }} aria-hidden="true" />
                          <span className="flavor-copy">
                            <strong>{option.name}</strong>
                            <small>{option.description}</small>
                          </span>
                        </span>
                        <span className="boutique-flavor-value">
                          {potPriceWithOption !== null && (!popcornPromotionActive || available) && (
                            <span className="boutique-flavor-cost">
                              {popcornPromotionActive && !selected && !disabled && regularSpecialPrice !== null && savedToday > 0 && (
                                <del className="gourmet-feriado-regular-price" aria-label="Preço habitual deste pote com o recheio">
                                  {currency.format(regularSpecialPrice)}
                                </del>
                              )}
                              <strong>{currency.format(popcornPromotionActive ? potPriceWithOption : flavorPotPrice ?? potPriceWithOption)}</strong>
                              <small className="sr-only">Preço do pote com este sabor</small>
                              {popcornPromotionActive && option.id === "nutella" && available && (
                                <span className="gourmet-feriado-exception">Preço normal</span>
                              )}
                              {popcornPromotionActive && popcornOptionIds.length === 0 && !selected && !disabled && savedToday > 0 && available && (
                                <span className="gourmet-feriado-saving" aria-label={`Economia de ${currency.format(savedToday)} hoje`}>
                                  Economize {currency.format(savedToday)}
                                </span>
                              )}
                            </span>
                          )}
                          {(!popcornPromotionActive || option.id === "nutella") && !selected && !disabled && potPriceWithOption !== null && (
                            <span
                              className={`boutique-flavor-impact ${priceDifference > 0 ? "has-increase" : "is-same"}`}
                              aria-label={!popcornOptionIds.length
                                ? `Com ${option.name}, o pote fica por ${currency.format(potPriceWithOption)}`
                                : priceDifference > 0
                                  ? `Ao adicionar ${option.name}, o pote passa a custar ${currency.format(potPriceWithOption)}`
                                  : `Ao adicionar ${option.name}, o pote mantém o preço de ${currency.format(potPriceWithOption)}`}
                            >
                              {!popcornOptionIds.length && priceDifference === 0
                                ? "Preço base"
                                : !popcornOptionIds.length
                                  ? `Pote fica por ${currency.format(potPriceWithOption)}`
                                  : priceDifference === 0
                                    ? `Mantém ${currency.format(potPriceWithOption)}`
                                    : `Pote vai para ${currency.format(potPriceWithOption)}`}
                            </span>
                          )}
                          {selected && <span className="boutique-flavor-picked"><Check size={13} strokeWidth={2.8} aria-hidden="true" /> Escolhido</span>}
                          {waitingForSize && available && <span className="boutique-flavor-unavailable">Escolha o tamanho</span>}
                          {!available && <span className="boutique-flavor-unavailable">Esgotado hoje</span>}
                          {limitDisabled && available && <span className="boutique-flavor-unavailable">Limite atingido</span>}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {popcornOptionIds.length > 0 && (
                  <div className="boutique-flavor-summary gourmet-combination-review" role="group" aria-label="Revisar os sabores escolhidos">
                    <div className="gourmet-combination-heading">
                      <div className="gourmet-combination-title-line">
                        <span className="gourmet-combination-emblem" aria-hidden="true"><Check size={15} strokeWidth={2} /></span>
                        <span className="boutique-flavor-summary-title">Sua combinação</span>
                      </div>
                      <p className="gourmet-combination-hint" id="gourmet-combination-instruction">Toque no × para remover um sabor e escolher outro.</p>
                    </div>
                    <div className="boutique-flavor-tags gourmet-removable-tags" aria-describedby="gourmet-combination-instruction">
                      {popcornOptionIds.map(optionId => {
                        const flavor = POPCORN.options.find(option => option.id === optionId);
                        return flavor ? (
                          <button type="button" key={optionId} className="gourmet-removable-tag"
                            onClick={() => togglePopcornOption(flavor)}
                            aria-label={`Remover ${flavor.name} da combinação`}
                            title={`Remover ${flavor.name}`}>
                            <span>{flavor.name}</span>
                            <X size={14} strokeWidth={2} aria-hidden="true" />
                          </button>
                        ) : null;
                      })}
                    </div>
                    {popcornCombinationSavings > 0 && popcornRegularCombinationPrice !== null && (
                      <div className="gourmet-combination-savings" role="status" aria-live="polite" aria-atomic="true">
                        <span>Preço normal do pote <del>{currency.format(popcornRegularCombinationPrice)}</del></span>
                        <strong>Você economiza {currency.format(popcornCombinationSavings)} neste pote</strong>
                      </div>
                    )}
                  </div>
                )}
                {(selectionMessage || !popcornLimitReached) && (
                  <div className={`selection-helper ${selectionMessage ? "has-message" : ""}`} aria-live="polite">
                    {selectionMessage || (!popcornVariant
                      ? "Primeiro escolha o tamanho. Depois, os sabores serão liberados."
                      : popcornOptionIds.length === 0
                        ? "Escolha pelo menos 1 sabor para adicionar ao pedido."
                        : `Você pode escolher mais ${popcornMaxOptions - popcornOptionIds.length} ${popcornMaxOptions - popcornOptionIds.length === 1 ? "sabor" : "sabores"}, se quiser.`)}
                  </div>
                )}
                {popcornReady && popcornOptionIds.length < popcornMaxOptions && (
                  <Button type="button" variant="outline" className="flavor-continue"
                    onClick={() => requestScroll("quantidade-pipocas")}>
                    Continuar com {popcornOptionIds.length} {popcornOptionIds.length === 1 ? "sabor" : "sabores"}
                    <ChevronRight size={16} aria-hidden="true" />
                  </Button>
                )}
              </section>

              <section className={`step-block step-state-${popcornQuantityStepState}`} id="quantidade-pipocas" aria-labelledby="step-quantity" aria-current={popcornQuantityStepState === "active" ? "step" : undefined}>
                <div className="step-heading compact-heading"><StepMarker number={3} state={popcornQuantityStepState} /><div><h3 id="step-quantity">Quantos potes desta combinação?</h3><p>Para outros sabores ou tamanhos, adicione este item e monte o próximo.</p></div></div>
                <div className="quantity-row">
                  <div className="quantity-control" aria-label="Quantidade">
                    <Button type="button" variant="ghost" size="icon" onClick={() => setPopcornQuantity((current) => Math.max(1, current - 1))} disabled={!popcornReady || popcornQuantity === 1} aria-label="Diminuir quantidade"><Minus size={18} /></Button>
                    <strong aria-live="polite">{popcornQuantity}</strong>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setPopcornQuantity((current) => current + 1)} disabled={!popcornReady} aria-label="Aumentar quantidade"><Plus size={18} /></Button>
                  </div>
                  <div className="draft-total"><small>Subtotal</small><strong>{popcornUnitPrice === null ? "Escolha o tamanho" : currency.format(popcornUnitPrice * popcornQuantity)}</strong></div>
                </div>
                <Button type="button" className="primary-cta add-button" onClick={addOrUpdatePopcorn} disabled={!availability.ordersOpen || !popcornReady}>
                  <ShoppingBag size={18} />{editingId
                    ? "Salvar alterações"
                    : !popcornVariant
                      ? "Escolha o tamanho acima"
                      : popcornOptionIds.length === 0
                        ? "Escolha pelo menos 1 sabor"
                        : `Adicionar ${popcornQuantity} ${popcornQuantity === 1 ? "pipoca" : "pipocas"} ao pedido`}
                </Button>
                {editingId && <Button type="button" variant="ghost" className="cancel-edit" onClick={clearDraft}>Cancelar edição</Button>}
              </section>
            </div>
          ) : activeCategory === "fatias" && fatiasVisible ? (
            <div className="builder-card slice-builder">
              <section className={`step-block step-state-${sliceProductStepState}`} id="fatias" aria-labelledby="step-slice" aria-current={sliceProductStepState === "active" ? "step" : undefined}>
                <div className="step-heading"><StepMarker number={1} state={sliceProductStepState} /><div><h3 id="step-slice">Escolha sua fatia</h3><p>{lastSlicesProducts.length > 0 ? "Toque na foto do sabor que deseja provar." : "Selecione um sabor por vez. Depois de adicionar, você poderá escolher outro."}</p></div></div>
                {lastSlicesProducts.length > 0 && <aside className="last-slices-banner" aria-label="Últimas fatias disponíveis hoje">
                  <div className="last-slices-banner-top">
                    <span className="last-slices-eyebrow"><Clock3 size={15} aria-hidden="true" /> ÚLTIMAS FATIAS DE HOJE</span>
                    <span className="last-slices-hours">Até 20h · enquanto houver</span>
                  </div>
                  <strong>Ainda dá tempo de garantir a sua.</strong>
                  <p>{lastSlicesProducts.map((slice) => slice.name).join(" e ")} {lastSlicesProducts.length === 1 ? "está nas últimas unidades" : "estão nas últimas unidades"}. <b>Escolha a fatia na foto abaixo</b> e continue seu pedido.</p>
                </aside>}
                {strawberryPreorder && <aside className="slice-preorder-banner" role="status">
                  <span className="slice-preorder-kicker">Nova produção de hoje · Pré-reserva</span>
                  <strong>Chocolate com Morango: garanta sua fatia para hoje</strong>
                  <p>A Luciane está preparando uma nova fornada, prevista para ficar pronta por volta das <b>{strawberryReadyLabel}</b> de hoje. Reserve sua fatia agora; entrega ou retirada <b>ainda hoje</b>, após confirmação pelo WhatsApp.</p>
                  <small>{strawberryPreorder.remaining > 0 ? "Produção limitada para hoje · R$ 22 por fatia" : "Pré-reservas esgotadas para hoje"}</small>
                </aside>}
                {!SLICES.some((slice) => sliceIsVisible(slice.id)) && <p className="selection-helper" role="status">Nenhuma fatia disponível no momento.</p>}
                <RadioGroup className="slice-grid" value={sliceProductId} onValueChange={(value) => {
                  if (!sliceIsAvailable(value) || !fatiasAvailable) return;
                  setBuilderEngaged(true);
                  setSliceProductId(value);
                  setSliceOptionId("");
                  setSelectionMessage("");
                  requestScroll("calda-fatias");
                }} aria-label="Sabor da fatia artesanal">
                  {SLICES.filter((slice) => sliceIsVisible(slice.id))
                    .sort((first, second) => Number(Boolean(fatiasAvailable && second.available && second.variants[0]?.available && sliceIsAvailable(second.id)))
                      - Number(Boolean(fatiasAvailable && first.available && first.variants[0]?.available && sliceIsAvailable(first.id))))
                    .map((slice) => {
                    const selected = slice.id === sliceProductId;
                    const variant = slice.variants[0];
                    const available = fatiasAvailable && slice.available && variant.available && sliceIsAvailable(slice.id);
                    return (
                      <label className={`slice-card ${selected ? "is-selected" : ""} ${!available ? "is-unavailable" : ""} ${slice.availabilityLabel ? "is-upcoming" : ""} ${lastSlicesIds.has(slice.id) && available ? "is-last-slices" : ""}`} htmlFor={`slice-${slice.id}`} key={slice.id}>
                        <RadioGroupItem id={`slice-${slice.id}`} value={slice.id} disabled={!available} />
                        <span className="slice-media">
                          {slice.image ? <img src={slice.cardImage ?? slice.image} alt={slice.imageAlt} width="640" height="480" loading={lastSlicesIds.has(slice.id) && available ? "eager" : "lazy"} decoding="async" fetchPriority={lastSlicesIds.has(slice.id) && available ? "high" : "low"} sizes="(max-width: 599px) calc(50vw - 27px), (max-width: 899px) calc(50vw - 36px), 240px" /> : <span className="slice-placeholder"><CakeSlice size={30} strokeWidth={1.4} /><small>Foto em breve</small></span>}
                          {lastSlicesIds.has(slice.id) && available && <span className="last-slices-card-tag">Últimas de hoje</span>}
                        </span>
                        <span className="slice-card-copy">
                          <span className="boutique-slice-card-title">
                            <strong>{slice.cardName ?? slice.name}</strong>
                            {selected && available && <span className="boutique-slice-selected-label">Selecionada</span>}
                            {slice.id==="fatia-chocolate-morango" && strawberryPreorder && <span className="slice-preorder-tag">Pré-reserva · {strawberryReadyLabel}</span>}
                          </span>
                          {slice.subtitle && <em>{slice.subtitle}</em>}
                          <span className="boutique-slice-card-footer">
                            <span className="slice-weight">{SLICE_WEIGHT_GRAMS} g por fatia</span>
                            <b>{currency.format(variant.price)}</b>
                          </span>
                        </span>
                        {selected && available && <span className="slice-selected"><Check size={14} strokeWidth={3} /></span>}
                        {!available && <span className={`slice-status ${slice.availabilityLabel ? "is-upcoming" : ""}`}>{slice.availabilityLabel ?? "Esgotado hoje"}</span>}
                      </label>
                    );
                  })}
                </RadioGroup>
                <div className="selection-helper" aria-live="polite">
                  {selectedSlice
                    ? sliceIsAvailable(selectedSlice.id)
                      ? `${productLabel(selectedSlice)} selecionada. Escolha como prefere sua fatia e confira a quantidade.`
                      : "Esta fatia ficou indisponível. Escolha outro sabor para continuar."
                    : selectionMessage || "Nenhuma fatia selecionada. Escolha uma opção para continuar."}
                </div>
              </section>

              {selectedSlice && <section id="calda-fatias" className={`step-block step-state-${sliceSauceStepState}`} aria-labelledby="step-slice-sauce">
                <div className="step-heading compact-heading"><StepMarker number={2} state={sliceSauceStepState} /><div><h3 id="step-slice-sauce">Escolha sua calda</h3><p>Escolha uma opção. Sem custo adicional.</p></div></div>
                <div className="boutique-slice-preview" aria-label="Fatia escolhida">
                  {selectedSlice.image && (
                    <img src={selectedSlice.cardImage ?? selectedSlice.image} alt="" width="72" height="72" loading="lazy" decoding="async" />
                  )}
                  <span className="boutique-slice-preview-info">
                    <small>Sua escolha</small>
                    <strong>{selectedSlice.name}</strong>
                  </span>
                  {selectedSliceVariant && <span className="boutique-slice-preview-price">{currency.format(selectedSliceVariant.price)}</span>}
                </div>
                <RadioGroup className="slice-sauce-choice" value={sliceOptionId} onValueChange={value => {
                  setSliceOptionId(value); setSelectionMessage(""); requestScroll("quantidade-fatias");
                }} aria-labelledby="step-slice-sauce">
                  {sliceSauceOptions(selectedSlice.id).map(option => {
                    const isSelected = sliceOptionId === option.id;
                    return (
                      <label className={`slice-sauce-card ${isSelected ? "is-selected" : ""}`} key={option.id} htmlFor={`slice-${option.id}`}>
                        <RadioGroupItem id={`slice-${option.id}`} value={option.id} />
                        <span className="slice-sauce-copy">
                          <strong>{option.name}</strong>
                        </span>
                        {isSelected && <span className="slice-sauce-check" aria-hidden="true"><Check size={18} strokeWidth={2.6} /></span>}
                      </label>
                    );
                  })}
                </RadioGroup>
                {selectionMessage && <p className="selection-helper" role="status">{selectionMessage}</p>}
              </section>}

              <section className={`step-block step-state-${sliceQuantityStepState}`} id="quantidade-fatias" aria-labelledby="step-slice-quantity" aria-current={sliceQuantityStepState === "active" ? "step" : undefined}>
                <div className="step-heading compact-heading"><StepMarker number={3} state={sliceQuantityStepState} /><div><h3 id="step-slice-quantity">Quantas fatias deste sabor?</h3><p>Para outro sabor, adicione este item e escolha a próxima fatia.</p></div></div>
                <div className="quantity-row">
                  <div className="quantity-control" aria-label="Quantidade">
                    <Button type="button" variant="ghost" size="icon" onClick={() => setSliceQuantity((current) => Math.max(1, current - 1))} disabled={!sliceReady || sliceQuantity === 1} aria-label="Diminuir quantidade"><Minus size={18} /></Button>
                    <strong aria-live="polite">{sliceQuantity}</strong>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setSliceQuantity((current) => {
                      const own=editingId ? cart.find(item=>item.id===editingId)?.quantity ?? 0:0;
                      return selectedSlice?.id==="fatia-chocolate-morango" && strawberryPreorder
                        && current+reservedInCart-own >= strawberryPreorder.remaining ? current : current+1;
                    })} disabled={!sliceReady} aria-label="Aumentar quantidade"><Plus size={18} /></Button>
                  </div>
                  <div className="draft-total"><small>Subtotal</small><strong>{selectedSliceVariant ? currency.format(selectedSliceVariant.price * sliceQuantity) : "Escolha a fatia"}</strong></div>
                </div>
                <Button type="button" className="primary-cta add-button" onClick={addOrUpdateSlice} disabled={!availability.ordersOpen || !sliceReady}>
                  <ShoppingBag size={18} />{editingId
                    ? "Salvar alterações"
                    : !selectedSlice
                      ? "Escolha sua fatia acima"
                      : selectedSlice.id==="fatia-chocolate-morango" && strawberryPreorder
                         ? `Adicionar ${sliceQuantity} ${sliceQuantity === 1 ? "fatia" : "fatias"} para pré-reserva`
                         : `Adicionar ${sliceQuantity} ${sliceQuantity === 1 ? "fatia" : "fatias"} ao pedido`}
                </Button>
                {editingId && <Button type="button" variant="ghost" className="cancel-edit" onClick={clearDraft}>Cancelar edição</Button>}
              </section>
            </div>
          ) : (
            <div className="builder-card menu-empty-state" role="status">
              <strong>Cardápio temporariamente sem itens visíveis.</strong>
              <p>Consulte novamente em alguns instantes.</p>
            </div>
          )}

        </div>
      </section>

      )}

      {STORE_CONFIG.enabledExtras.drinks && (
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
                        ? <img src={drink.cardImage ?? drink.image} alt={drink.imageAlt} width="256" height="256" loading="lazy" decoding="async" fetchPriority="low" sizes="58px" />
                        : <CupSoda size={23} strokeWidth={1.6} />}
                    </span>
                    <div><strong>{drink.name}</strong><small>{variant.label}</small></div>
                    <b>{currency.format(variant.price)}</b>
                    <Button type="button" variant="outline" size="icon" onClick={() => addDrink(drink)} disabled={!availability.ordersOpen || !drink.available || !variant.available} aria-label={`Adicionar ${drink.name} ${variant.label}`}><Plus size={17} /></Button>
                    {(!drink.available || !variant.available) && <span className="drink-status">Indisponível</span>}
                  </article>
                );
              })}
            </div>
            <p className="drink-message" aria-live="polite">{drinkMessage}</p>
          </div>
        </section>
      )}

      {(activeCategory || cart.length > 0) && (
      <section className={`checkout-section ${cart.length === 0 ? "is-empty-cart" : ""}`} id="carrinho">
        <div className="page-shell">
          <header className="boutique-checkout-brief">
            <p className="eyebrow">Finalização do pedido</p>
            <h2>Falta pouco para finalizar.</h2>
            <p>Confira suas escolhas e informe como deseja receber.</p>
          </header>
          {cart.length > 0 && (
            <nav className="boutique-checkout-progress" aria-label="Navegue pelas etapas do pedido">
              <button type="button" className="is-complete" onClick={() => scrollToSection("carrinho")}>
                <span className="boutique-progress-index"><ShoppingBag size={16} aria-hidden="true" /></span>
                <span>Pedido</span>
              </button>
              <button type="button" className={fulfillment && addressReady ? "is-complete" : "is-current"} aria-current={!(fulfillment && addressReady) ? "step" : undefined} onClick={() => scrollToSection("recebimento")}>
                <span className="boutique-progress-index">{fulfillment && addressReady ? <Check size={16} aria-hidden="true" /> : "2"}</span>
                <span>Recebimento</span>
              </button>
              <button type="button" className={paymentReady ? "is-complete" : fulfillment && addressReady ? "is-current" : ""} aria-current={!paymentReady && fulfillment && addressReady ? "step" : undefined} onClick={() => scrollToSection("pagamento")}>
                <span className="boutique-progress-index">{paymentReady ? <Check size={16} aria-hidden="true" /> : "3"}</span>
                <span>Pagamento</span>
              </button>
            </nav>
          )}
        </div>
        <div className="page-shell checkout-grid">
          <div className="checkout-main">
            <section className="order-card" aria-labelledby="cart-title">
              <div className="order-card-heading">
                <div><p className="eyebrow">01 · Suas escolhas</p><h2 id="cart-title">O que vai no pedido</h2></div>
                {cart.length > 0 && <span className="cart-count">{cartItemCount} {cartItemCount === 1 ? "item" : "itens"}</span>}
              </div>
              {cart.length === 0 ? (
                <div className="empty-cart">
                  <ShoppingBag size={26} strokeWidth={1.5} /><strong>Seu pedido está vazio</strong><p>{activeCategory === "pipocas" ? "Escolha uma pipoca para começar." : "Escolha uma fatia para começar."}</p>
                  <Button type="button" variant="outline" onClick={beginBuilding}>Escolher produtos</Button>
                </div>
              ) : (
                <div className="cart-list">
                  {checkoutFeedbackMessage && !isFinalizing && (
                    <div className="checkout-availability-alert" role="alert">
                      <AlertTriangle size={18} aria-hidden="true" />
                      <span>{checkoutFeedbackMessage}</span>
                    </div>
                  )}
                  {cart.map((item) => {
                    const product = PRODUCTS.find((candidate) => candidate.id === item.productId)!;
                    const variant = product.variants.find((candidate) => candidate.id === item.variantId)!;
                    const itemIssue = cartIssues.find((issue) => issue.cartItemId === item.id);
                    const optionNames = item.optionIds.map((id) => product.options.find((option) => option.id === id)?.name).filter(Boolean).join(", ");
                    const unitPrice = itemUnitPrice(product, variant, item.optionIds, promotionTime);
                    return (
                      <article className={`cart-item ${itemIssue ? "is-unavailable" : ""}`} key={item.id}>
                        <div className="cart-item-top">
                          <div className="boutique-cart-product">
                            <span className="boutique-cart-image" data-gourmet={product.id === POPCORN.id || undefined} onContextMenu={(event) => event.preventDefault()}>
                              {product.id === POPCORN.id
                                ? <GourmetCheckoutCrop context="cart" />
                                : product.image
                                  ? <img src={product.cardImage ?? product.image} alt="" draggable={false} width="92" height="92" loading="lazy" decoding="async" />
                                  : <CakeSlice size={24} aria-hidden="true" />}
                            </span>
                            <div className="cart-item-info">
                            <span className="product-category">{product.category}</span>
                            <h3>{productCheckoutLabel(product)}</h3>
                            {product.cardName && product.subtitle && <small className="cart-item-subtitle">{product.subtitle}</small>}
                            <div className="cart-item-specs">
                              <span>{variant.label}</span>
                              {product.kind === "slice" && <span>{SLICE_WEIGHT_GRAMS} g por fatia</span>}
                              {optionNames && product.optionLabel && <span>{product.optionLabel}: {optionNames}</span>}
                              <span>Quantidade: {item.quantity}</span>
                            </div>
                            {itemIssue && (
                              <div className="cart-unavailable-note" role="status">
                                <AlertTriangle size={16} aria-hidden="true" />
                                <span><strong>Item indisponível</strong>{itemIssue.reasons.join(" ")} Edite ou remova para continuar.</span>
                              </div>
                            )}
                            </div>
                          </div>
                          <div className="cart-item-value"><small>Valor</small><strong>{variant.retired ? "Revise o tamanho" : currency.format(unitPrice * item.quantity)}</strong></div>
                        </div>
                        <div className="cart-item-actions">
                          <div className="mini-quantity">
                            <Button type="button" variant="ghost" size="icon" onClick={() => changeCartQuantity(item.id, -1)} disabled={item.quantity === 1} aria-label="Diminuir quantidade deste item"><Minus size={15} /></Button>
                            <span>{item.quantity}</span>
                            <Button type="button" variant="ghost" size="icon" onClick={() => changeCartQuantity(item.id, 1)} disabled={!availability.ordersOpen || Boolean(itemIssue) || item.quantity >= 99} aria-label="Aumentar quantidade deste item"><Plus size={15} /></Button>
                          </div>
                          {product.kind !== "drink" && !isTrufadaOrLegacy(product.id) && <Button type="button" variant="ghost" className="text-action" onClick={() => editItem(item)}><Pencil size={15} /> Editar</Button>}
                          <Button type="button" variant="ghost" className="text-action destructive-action" onClick={() => removeItem(item.id)}><Trash2 size={15} /> Remover</Button>
                        </div>
                      </article>
                    );
                  })}
                  {strawberryPreorder && cart.some(item=>item.productId==="fatia-chocolate-morango") && (
                    <p className="slice-preorder-checkout-note"><strong>Chocolate com Morango reservado para hoje.</strong> Produção prevista para ficar pronta por volta das {strawberryReadyLabel}. Entrega ou retirada ainda hoje, após confirmação da Luciane pelo WhatsApp. Pagamento conforme a opção escolhida.</p>
                  )}
                  <div className="cart-subtotal"><span>Subtotal dos produtos</span><strong>{cartNeedsSizeReview ? "Revise o tamanho" : currency.format(cartSubtotal)}</strong></div>
                  <details className="boutique-cart-details">
                    <summary><span>Informações sobre o pedido</span><ChevronDown size={17} aria-hidden="true" /></summary>
                    <div className="boutique-cart-details-content">
                      {cart.some((item) => item.productId === POPCORN.id) && <p className="cart-save-note">Pipocas calculadas pela tabela atual: tamanho e conjunto mais caro dos sabores escolhidos. Confira os valores antes de enviar.</p>}
                      <p className="cart-save-note"><Check size={14} aria-hidden="true" /> Pedido mantido somente nesta aba. Ao fechá-la, ele é limpo.</p>
                    </div>
                  </details>
                  {!addedNotice && <div className="cart-add-more">
                    <strong>Adicionar mais itens</strong>
                    <div className={`cart-add-options ${STORE_CONFIG.enabledExtras.drinks ? "" : "without-drinks"} ${cupCanBeAddedFromCheckout ? "has-crocantes-option" : ""}`}>
                      {fatiasAvailable && <Button type="button" variant="outline" onClick={() => startAnother("fatias")}><CakeSlice size={16} /> {addMoreButtonLabel("fatias", cart)}</Button>}
                      {pipocasAvailable && <Button type="button" variant="outline" onClick={() => startAnother("pipocas")}><Plus size={16} /> {addMoreButtonLabel("pipocas", cart)}</Button>}
                      {cupCanBeAddedFromCheckout && <Button type="button" variant="outline" className="crocantes-cross-sell" onClick={startAnotherCrocantes}><ShoppingBag size={16} /> {cartContainsCrocantes ? "Adicionar outro pacote" : "Adicionar pacote Trufado"} <ChevronRight size={15} aria-hidden="true" /></Button>}
                      {STORE_CONFIG.enabledExtras.drinks && <Button type="button" variant="outline" onClick={() => scrollToSection("acompanhamentos")}><CupSoda size={16} /> Refrigerante</Button>}
                    </div>
                  </div>}
                </div>
              )}
            </section>

            <section className={`order-card checkout-flow-card step-state-${receivingStepState}`} id="recebimento" aria-labelledby="receiving-title" aria-current={receivingStepState === "active" ? "step" : undefined}>
              {addedNotice && (
                <div className="boutique-added-continuity" aria-label="Produto adicionado ao pedido">
                  <div className="boutique-added-confirmation">
                    <span className="boutique-added-photo" data-gourmet={justAddedProduct?.id === POPCORN.id || undefined} aria-hidden="true" onContextMenu={(event) => event.preventDefault()}>
                      {justAddedProduct?.id === POPCORN.id
                        ? <GourmetCheckoutCrop context="added" />
                        : justAddedProduct?.image
                          ? <img src={justAddedProduct.cardImage ?? justAddedProduct.image} alt="" draggable={false} width="104" height="104" loading="lazy" decoding="async" />
                          : <ShoppingBag size={24} />}
                    </span>
                    <div className="boutique-added-message">
                      <strong role="status"><Check size={16} aria-hidden="true" /> Adicionado ao pedido</strong>
                      <p>{addedNotice.description}</p>
                    </div>
                  </div>
                  {checkoutComplementItems.length > 0 && (
                    <div className="boutique-added-other">
                      <div className="boutique-added-other-intro">
                        <strong>Quer completar seu pedido?</strong>
                        <p>Se preferir, escolha entrega ou retirada logo abaixo.</p>
                      </div>
                      <div className="boutique-complement-grid" role="group" aria-label="Outros produtos disponíveis para adicionar">
                        {checkoutComplementItems.map((id) => {
                          const heading = id === "gourmet" ? addMoreButtonLabel("pipocas", cart)
                            : id === "fatias" ? addMoreButtonLabel("fatias", cart)
                              : id === "trufadas" ? cartContainsCrocantes ? "Outro pacote Trufado" : "Pipocas Trufadas"
                                : "Refrigerante";
                          const detail = id === "gourmet" ? "Montar pote Gourmet"
                            : id === "fatias" ? "Escolher sua fatia"
                              : id === "trufadas" ? "Escolher sabor e tamanho"
                                : "Ver acompanhamentos";
                          const photo = id === "gourmet" ? "/images/categoria-pipocas-editorial-enquadrada-v107.webp"
                            : id === "fatias" ? "/images/categoria-fatias-editorial.webp"
                              : id === "trufadas" ? "/images/pipocas-trufadas-ninho-20261101.webp"
                                : null;
                          return (
                            <button type="button" key={id} className="boutique-complement-choice"
                              onClick={() => {
                                if (id === "gourmet") startAnother("pipocas");
                                else if (id === "fatias") startAnother("fatias");
                                else if (id === "trufadas") startAnotherCrocantes();
                                else scrollToSection("acompanhamentos");
                              }}>
                              <span className="boutique-complement-media" aria-hidden="true" onContextMenu={(event) => event.preventDefault()}>
                                {photo
                                  ? <img src={photo} alt="" draggable={false} width="96" height="96" loading="lazy" decoding="async" />
                                  : <CupSoda size={22} strokeWidth={1.6} />}
                              </span>
                              <span className="boutique-complement-copy">
                                <strong>{heading}</strong>
                                <small>{detail}</small>
                              </span>
                              <ChevronRight size={17} aria-hidden="true" className="boutique-complement-arrow" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="step-heading checkout-step-heading"><StepMarker number={4} state={receivingStepState} /><div><h2 id="receiving-title">Como deseja receber?</h2><p>Escolha a opção mais conveniente.</p></div></div>
              <RadioGroup className="choice-grid" value={fulfillment} onValueChange={chooseFulfillment} aria-label="Forma de recebimento">
                <label className={`choice-card ${fulfillment === "entrega" ? "is-selected" : ""}`} htmlFor="receive-delivery">
                  <RadioGroupItem id="receive-delivery" value="entrega" /><Truck size={21} /><span className="choice-copy"><strong>Entrega</strong><small>A partir de R$8</small></span>
                  {fulfillment === "entrega" && <span className="choice-check" aria-hidden="true"><Check size={13} strokeWidth={3} /></span>}
                </label>
                <label className={`choice-card ${fulfillment === "retirada" ? "is-selected" : ""}`} htmlFor="receive-pickup">
                  <RadioGroupItem id="receive-pickup" value="retirada" /><Store size={21} /><span className="choice-copy"><strong>Retirada</strong><small>Em Paragominas</small></span>
                  {fulfillment === "retirada" && <span className="choice-check" aria-hidden="true"><Check size={13} strokeWidth={3} /></span>}
                </label>
              </RadioGroup>
              {fulfillment === "entrega" && (
                <div className="delivery-fields" id="delivery-fields">
                  <DeliveryLocalityPicker
                    selectedId={deliveryLocalityId}
                    onSelect={(locality) => {
                      setDeliveryLocalityId(locality.id);
                      setDeliveryZoneId(deliveryLocalityCanQuote(locality) ? locality.zoneId! : "");
                      setNeighborhood(locality.label);
                      setCheckoutAvailabilityMessage("");
                    }}
                    onClear={() => {
                      setDeliveryLocalityId("");
                      setDeliveryZoneId("");
                      setNeighborhood("");
                    }}
                  />
                  {selectedDeliveryZone && (
                    <p className="delivery-price-preview" role="status">
                      Taxa para {selectedDeliveryLocality?.label}: <strong>{currency.format(selectedDeliveryZone.price)}</strong>
                    </p>
                  )}
                  {legacyAddressNotice && <p className="field-note" role="status">Seu endereço anterior foi preservado. Confira a rua e informe o número; se não houver, use s/n.</p>}
                  <div className="field-group"><label htmlFor="address">Rua</label><Input id="address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Ex.: Rua das Flores" autoComplete="address-line1" /></div>
                  <div className="field-group"><label htmlFor="address-number">Número</label><Input id="address-number" value={addressNumber} onChange={(event) => { setAddressNumber(event.target.value); setLegacyAddressNotice(false); }} placeholder="Ex.: 123 ou s/n" /></div>
                  <div className="delivery-extras">
                    <div className="delivery-extras-fields">
                      <div className="field-group"><label htmlFor="complement">Complemento (opcional)</label><Input id="complement" value={complement} onChange={(event) => setComplement(event.target.value)} placeholder="Ex.: casa 2, apartamento" autoComplete="address-line2" /></div>
                      <div className="field-group"><label htmlFor="reference">Ponto de referência (opcional)</label><Input id="reference" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Ex.: próximo à praça" /></div>
                    </div>
                  </div>
                  <p className="field-note">{DELIVERY_TIME_ESTIMATE} O prazo começa após a confirmação da loja.</p>
                </div>
              )}
              {fulfillment === "retirada" && <div className="pickup-note"><MapPin size={18} /><span><strong>Retirada disponível em Paragominas.</strong>{checkoutChannel === "whatsapp" ? "O horário e o local serão confirmados no WhatsApp." : "A loja confirmará o horário e o local pelo celular informado."}</span></div>}
            </section>

            {COMMERCE_CONFIG.siteOrderingEnabled && !cartContainsCrocantes && (
              <section className="order-card checkout-channel-card" id="finalizacao" aria-labelledby="channel-title">
                <div className="order-card-heading"><div><p className="eyebrow">Finalização</p><h2 id="channel-title">Como deseja concluir?</h2></div></div>
                <RadioGroup className="choice-grid checkout-channel-options" value={checkoutChannel} onValueChange={chooseCheckoutChannel} aria-label="Canal de finalização">
                  <label className={`choice-card ${checkoutChannel === "site" ? "is-selected" : ""}`} htmlFor="channel-site">
                    <RadioGroupItem id="channel-site" value="site" /><ShoppingBag size={21} /><span className="choice-copy"><strong>Concluir no site</strong><small>Receba o número e acompanhe o pedido</small></span>
                    {checkoutChannel === "site" && <span className="choice-check" aria-hidden="true"><Check size={13} strokeWidth={3} /></span>}
                  </label>
                  <label className={`choice-card ${checkoutChannel === "whatsapp" ? "is-selected" : ""}`} htmlFor="channel-whatsapp">
                    <RadioGroupItem id="channel-whatsapp" value="whatsapp" /><MessageCircle size={21} /><span className="choice-copy"><strong>Finalizar no WhatsApp</strong><small>Continue pelo atendimento da loja</small></span>
                    {checkoutChannel === "whatsapp" && <span className="choice-check" aria-hidden="true"><Check size={13} strokeWidth={3} /></span>}
                  </label>
                </RadioGroup>
              </section>
            )}

            {(
              <section className="order-card customer-card" id="identificacao" aria-labelledby="customer-title">
                <div className="order-card-heading"><div><p className="eyebrow">Identificação</p><h2 id="customer-title">Quem está fazendo o pedido?</h2></div></div>
                <div className="customer-fields">
                  <div className="field-group"><label htmlFor="customer-name"><UserRound size={15} aria-hidden="true" /> Nome do cliente</label><Input required id="customer-name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Seu nome" autoComplete="name" maxLength={100} aria-invalid={Boolean(customerName && !customerNameReady)} /></div>
                  {checkoutChannel === "site" && <div className="field-group"><label htmlFor="customer-phone"><Phone size={15} aria-hidden="true" /> Celular com DDD</label><Input id="customer-phone" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="(91) 99999-9999" inputMode="tel" autoComplete="tel" maxLength={24} aria-invalid={Boolean(customerPhone && !customerPhoneReady)} /></div>}
                  <div className="boutique-notes">
                    <button type="button" className="boutique-notes-toggle" aria-expanded={notesExpanded} aria-controls="order-notes-content" onClick={() => setNotesExpanded((current) => !current)}>
                      <span>{notesExpanded ? "Ocultar observação" : notes.trim() ? "Editar observação" : "Adicionar observação (opcional)"}</span>
                      <ChevronDown size={17} aria-hidden="true" />
                    </button>
                    {!notesExpanded && notes.trim() && <span className="boutique-notes-saved">Observação adicionada ao pedido</span>}
                    <div id="order-notes-content" className="boutique-notes-content" hidden={!notesExpanded}>
                      <div className="field-group"><label htmlFor="order-notes">Observação para o pedido (opcional)</label><textarea id="order-notes" value={notes} onChange={event => setNotes(event.target.value)} maxLength={500} placeholder="Ex.: Entregar na portaria." rows={3} /><small>{notes.length}/500</small></div>
                    </div>
                  </div>
                </div>
                <p className="field-note">Usaremos seus dados somente para processar e acompanhar este pedido.</p>
              </section>
            )}

            <section className={`order-card payment-card step-state-${paymentStepState}`} id="pagamento" aria-labelledby="payment-title">
              <div className="order-card-heading payment-heading"><div><p className="eyebrow">Pagamento</p><h2 id="payment-title">Como prefere pagar?</h2></div></div>
              {checkoutChannel === "site" ? (
                <RadioGroup className="payment-list payment-groups" value={payment} onValueChange={choosePayment} aria-label="Forma de pagamento">
                  <div className="payment-group"><strong>Pagar agora</strong>
                    <label className={`payment-option ${payment === "mercado_pago_pix" ? "is-selected" : ""} ${!COMMERCE_CONFIG.onlinePaymentsEnabled ? "is-disabled" : ""}`} htmlFor="payment-mp-pix">
                      <RadioGroupItem id="payment-mp-pix" value="mercado_pago_pix" disabled={!COMMERCE_CONFIG.onlinePaymentsEnabled} /><QrCode size={19} /><span><strong>Pix online</strong><small>QR Code pelo Mercado Pago</small></span>{payment === "mercado_pago_pix" && <Check size={17} />}
                    </label>
                    <label className={`payment-option ${payment === "mercado_pago_card" ? "is-selected" : ""} ${!COMMERCE_CONFIG.onlinePaymentsEnabled ? "is-disabled" : ""}`} htmlFor="payment-mp-card">
                      <RadioGroupItem id="payment-mp-card" value="mercado_pago_card" disabled={!COMMERCE_CONFIG.onlinePaymentsEnabled} /><CreditCard size={19} /><span><strong>Cartão online</strong><small>Ambiente seguro Mercado Pago</small></span>{payment === "mercado_pago_card" && <Check size={17} />}
                    </label>
                    {!COMMERCE_CONFIG.onlinePaymentsEnabled && <p className="field-note">Pagamento online ainda não habilitado nesta versão.</p>}
                  </div>
                  <div className="payment-group"><strong>Pagar no recebimento</strong>
                    <label className={`payment-option ${payment === "card_on_delivery" ? "is-selected" : ""}`} htmlFor="payment-card-delivery">
                      <RadioGroupItem id="payment-card-delivery" value="card_on_delivery" /><CreditCard size={19} /><span><strong>{fulfillment === "retirada" ? "Cartão na retirada" : "Cartão na entrega"}</strong><small>Pedido entra na cozinha ao confirmar</small></span>{payment === "card_on_delivery" && <Check size={17} />}
                    </label>
                    <label className={`payment-option ${payment === "cash" ? "is-selected" : ""}`} htmlFor="payment-cash">
                      <RadioGroupItem id="payment-cash" value="cash" /><Banknote size={19} /><span><strong>{fulfillment === "retirada" ? "Dinheiro na retirada" : "Dinheiro na entrega"}</strong><small>Informe abaixo se precisar de troco</small></span>{payment === "cash" && <Check size={17} />}
                    </label>
                  </div>
                </RadioGroup>
              ) : (
                <RadioGroup className="payment-list" value={payment} onValueChange={choosePayment} aria-label="Forma de pagamento pelo WhatsApp">
                  {[["pix", "Pix"], ["dinheiro", "Dinheiro"], ["credito", "Cartão de crédito à vista"], ["debito", "Cartão de débito"]].map(([value, label]) => (
                    <label className={`payment-option ${payment === value ? "is-selected" : ""}`} htmlFor={`payment-${value}`} key={value}>
                      <RadioGroupItem id={`payment-${value}`} value={value} />
                      {value === "pix" ? <QrCode size={20} aria-hidden="true" /> : value === "dinheiro" ? <Banknote size={20} aria-hidden="true" /> : <CreditCard size={20} aria-hidden="true" />}
                      <span className="boutique-payment-method"><strong>{label}</strong><small>{
                        value === "pix" ? "Chave enviada no WhatsApp após finalizar"
                          : value === "dinheiro"
                            ? fulfillment === "retirada" ? "Pague em dinheiro na retirada" : fulfillment === "entrega" ? "Pague em dinheiro na entrega" : "Pague em dinheiro na entrega ou retirada"
                            : fulfillment === "retirada" ? "Na maquininha, na retirada" : fulfillment === "entrega" ? "Na maquininha, na entrega" : "Na maquininha, na entrega ou retirada"
                      }</small></span>
                      {payment === value && <Check size={18} aria-hidden="true" />}
                    </label>
                  ))}
                </RadioGroup>
              )}
              {payment === "mercado_pago_pix" && <div className="online-email-field field-group"><label htmlFor="online-email"><Mail size={15} aria-hidden="true" /> E-mail para processar o Pix</label><Input id="online-email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="voce@exemplo.com" inputMode="email" type="email" autoComplete="email" maxLength={254} aria-invalid={Boolean(customerEmail && !customerEmailReady)} /><p className="field-note">O Mercado Pago exige este dado para gerar a cobrança. Não enviaremos marketing.</p></div>}
              {payment === "mercado_pago_card" && COMMERCE_CONFIG.onlinePaymentsEnabled && (
                <MercadoPagoCardForm publicKey={COMMERCE_CONFIG.mercadoPagoPublicKey} amount={orderTotal} disabled={isFinalizing || !customerReady || !addressReady || cartIssues.length > 0} onSubmit={finishOnSite} />
              )}
              {cardMode && <p className="payment-guidance">{RECEIPT_CARD_NOTICE}</p>}
              {payment === "mercado_pago_pix" && <p className="payment-guidance">O QR Code será gerado pelo Mercado Pago. A confirmação do pagamento acontece automaticamente.</p>}
              {(payment === "cartao" || payment === "card_on_delivery") && <p className="payment-guidance">{fulfillment === "retirada" ? "Pague no cartão ao retirar." : fulfillment === "entrega" ? "Pague no cartão no momento da entrega." : "O pagamento será feito no momento da entrega ou retirada."}</p>}
              {isCashPayment && (
                <div className="change-box">
                  <div className="change-question"><span><strong>Precisa de troco?</strong><small>Opcional</small></span><div className="segmented-control">
                    <Button type="button" variant={!needsChange ? "default" : "ghost"} onClick={() => setNeedsChange(false)}>Não</Button>
                    <Button type="button" variant={needsChange ? "default" : "ghost"} onClick={() => setNeedsChange(true)}>Sim</Button>
                  </div></div>
                  {needsChange && <div className="field-group"><label htmlFor="change-for">Troco para</label><Input id="change-for" value={changeFor} onChange={(event) => setChangeFor(event.target.value)} placeholder="Ex.: 50,00" inputMode="decimal" aria-invalid={Boolean(changeError)} aria-describedby="change-help" /><p id="change-help" className={changeError ? "field-error" : "field-note"} aria-live="polite">{cartNeedsSizeReview ? "Corrija o tamanho da pipoca para calcular o troco." : changeError || `Seu troco será ${formatOrderMoney((cashReceivedCents! - Math.round(orderTotal * 100)) / 100)}`}</p></div>}
                  <p className="field-note">{fulfillment === "retirada" ? "Pagamento em dinheiro no momento da retirada." : fulfillment === "entrega" ? "Pagamento em dinheiro no momento da entrega." : "Pagamento em dinheiro na entrega ou retirada."}</p>
                </div>
              )}
            </section>
          </div>

          <aside className="summary-card" aria-labelledby="summary-title">
            <p className="eyebrow">Resumo do pedido</p><h2 id="summary-title">{checkoutReady ? "Pronto para finalizar?" : "Confira seu pedido"}</h2>
            <p className="boutique-summary-lead">{checkoutReady ? "Tudo certo. Confira o total antes de enviar." : "Veja o total e complete as informações pendentes."}</p>
            {cart.length > 0 && checkoutChannel !== "whatsapp" && <p className="order-code">O número do pedido será mostrado após a confirmação.</p>}
            <div className="summary-content">
              {cart.length === 0 ? <p className="summary-empty">Os produtos adicionados aparecerão aqui.</p> : (
                <details className="boutique-order-recap" open={cartIssues.length > 0}>
                  <summary>
                    <span className="boutique-recap-symbol" aria-hidden="true"><ShoppingBag size={17} /></span>
                    <span className="boutique-recap-label"><strong>{cartItemCount} {cartItemCount === 1 ? "item escolhido" : "itens escolhidos"}</strong><small>Toque para conferir ou editar</small></span>
                    <ChevronDown size={18} aria-hidden="true" />
                  </summary>
                  <div className="boutique-recap-items">
                    {cart.map((item, index) => {
                const product = PRODUCTS.find((candidate) => candidate.id === item.productId)!;
                const variant = product.variants.find((candidate) => candidate.id === item.variantId)!;
                const itemIssue = cartIssues.find((issue) => issue.cartItemId === item.id);
                const names = item.optionIds.map((id) => product.options.find((option) => option.id === id)?.name).filter(Boolean).join(", ");
                const lineTotal = itemUnitPrice(product, variant, item.optionIds, promotionTime) * item.quantity;
                return (
                  <div className={`summary-item ${itemIssue ? "is-unavailable" : ""}`} key={item.id}>
                    <div className="summary-item-main">
                      <span className="summary-item-index" aria-hidden="true">{index + 1}</span>
                      <div>
                        <strong>{productCheckoutLabel(product)}</strong>
                        {product.cardName && product.subtitle && <span className="summary-product-subtitle">{product.subtitle}</span>}
                        <span className="summary-variant">{variant.label}</span>
                        {names && product.optionLabel && <p>{product.optionLabel}: {names}</p>}
                        <small>Quantidade: {item.quantity}</small>
                        {itemIssue && <span className="summary-unavailable">Indisponível — revise este item</span>}
                      </div>
                    </div>
                    <div className="summary-item-side">
                      <strong>{variant.retired ? "Revise o tamanho" : currency.format(lineTotal)}</strong>
                      {product.kind !== "drink" && <Button type="button" variant="ghost" size="sm" onClick={() => editItem(item)} aria-label={`Editar item ${index + 1}`}>Editar</Button>}
                    </div>
                  </div>
                );
                    })}
                  </div>
                </details>
              )}
              <div className="summary-row"><span>Produtos</span><strong>{cartNeedsSizeReview ? "Revise o tamanho" : currency.format(cartSubtotal)}</strong></div>
              {fulfillment === "entrega" && selectedDeliveryZone && (
                <div className="summary-row summary-delivery"><span>Taxa de entrega</span><strong>{currency.format(deliveryFee)}</strong></div>
              )}
              {fulfillment === "entrega" && !selectedDeliveryZone && (
                <div className="summary-row summary-delivery-pending" role="status">
                  <span>Taxa de entrega</span><strong>A confirmar</strong>
                </div>
              )}
              {fulfillment === "retirada" && <div className="summary-row"><span>Taxa de entrega</span><strong>Não se aplica</strong></div>}
              {cart.length > 0 && (fulfillment === "retirada" || (fulfillment === "entrega" && selectedDeliveryZone)) && (
                <>{cardMode && <div className="summary-row"><span>Acréscimo do cartão ({(cardQuote.basisPoints / 100).toLocaleString("pt-BR")}%)</span><strong>{currency.format(cardQuote.feeCents / 100)}</strong></div>}
                <div className="summary-row summary-total"><span>Total a pagar</span><strong>{cartNeedsSizeReview ? "Revise o tamanho" : currency.format(orderTotal)}</strong></div></>
              )}
              {fulfillment === "entrega" && !selectedDeliveryZone && cart.length > 0 && (
                <p className="summary-delivery-pending-note" role="note">
                  O total ficará disponível após confirmar a taxa do bairro. Nenhum valor de entrega será cobrado automaticamente.
                </p>
              )}
              {fulfillment === "entrega" && <div className="summary-address"><strong>Endereço de entrega</strong><p>{[address, addressNumber].filter(Boolean).join(", ") || "Informe a rua e o número"}</p>{complement && <p>{complement}</p>}<p>{deliveryNeighborhood || "Informe o bairro"}</p>{reference && <p>Referência: {reference}</p>}</div>}
              {isCashPayment && needsChange && !changeError && !cartNeedsSizeReview && <div className="summary-address boutique-change-summary">
                <strong>Troco</strong>
                <div className="boutique-change-row"><span>Troco para</span><b>{formatOrderMoney(cashReceivedCents! / 100)}</b></div>
                <div className="boutique-change-row"><span>Seu troco</span><b>{formatOrderMoney((cashReceivedCents! - Math.round(orderTotal * 100)) / 100)}</b></div>
              </div>}
              {<div className="summary-address"><strong>Cliente</strong><p>{customerName.trim() || "Informe seu nome"}</p>{checkoutChannel === "site" && <p>{customerPhone.trim() || "Informe seu celular"}</p>}{payment === "mercado_pago_pix" && <p>{customerEmail.trim() || "Informe seu e-mail"}</p>}</div>}
              <button type="button" className="summary-link" onClick={() => enterCheckout("recebimento")}><span><small>Recebimento</small><strong>{fulfillment === "entrega" ? selectedDeliveryZone ? `Entrega — ${selectedDeliveryLocality?.label ?? selectedDeliveryZone.label} · ${currency.format(deliveryFee)}` : "Entrega — escolher local" : fulfillment === "retirada" ? "Retirada em Paragominas" : "Escolher opção"}</strong></span><ChevronRight size={18} /></button>
              <button type="button" className="summary-link" onClick={() => enterCheckout("pagamento")}><span><small>Pagamento</small><strong>{paymentLabel}</strong></span><ChevronRight size={18} /></button>
            </div>
            <div className="boutique-final-action" ref={inlineFinalActionRef}>
              <Button type="button" className="whatsapp-button checkout-primary-button" data-ready={checkoutReady ? "true" : "false"} onClick={handleFinalAction} disabled={isFinalizing || (!availability.ordersOpen && orderContext?.handoff_fingerprint !== checkoutFingerprint)} aria-describedby="checkout-status" data-event={checkoutChannel === "whatsapp" ? "whatsapp_checkout" : "site_checkout"}>{isFinalizing ? <LoaderCircle className="admin-spinner" size={20} /> : !checkoutReady ? <ChevronRight size={20} /> : checkoutChannel === "whatsapp" ? <MessageCircle size={20} /> : payment === "mercado_pago_pix" ? <QrCode size={20} /> : <ShoppingBag size={20} />} {summaryActionLabel}</Button>
            </div>
            {checkoutChannel === "whatsapp" && orderContext?.whatsapp_attempted_at && <div className="whatsapp-return-note" role="status"><strong>Continue no WhatsApp</strong><p>Envie a mensagem por lá para encaminhar o pedido. Seu pedido continua nesta aba para consulta.</p><Button type="button" variant="outline" onClick={clearOrder} disabled={isFinalizing}>Fazer novo pedido</Button></div>}
            {payment === "pix" && <p className="payment-guidance">Depois de finalizar no WhatsApp, faça o Pix com a chave informada na mensagem e envie o comprovante na conversa.</p>}
            <p id="checkout-status" className={checkoutShowsReady ? "ready-status" : "checkout-status"} aria-live="polite">{checkoutShowsReady && <Check size={14} />}{checkoutHint}</p>
          </aside>
        </div>
      </section>

      )}

      <section className="trust-section"><div className="page-shell trust-content"><Crown size={30} strokeWidth={1.4} aria-hidden="true" /><div><p className="eyebrow">Luciane Oliveira Doces</p><h2>Feito em Paragominas com muito recheio e cuidado em cada pedido.</h2></div></div></section>

      <footer><div className="page-shell footer-content"><div><strong>Luciane Oliveira Doces</strong><span>Paragominas–PA</span></div><div className="footer-details"><span className="footer-phone"><MessageCircle size={16} /> (91) 99362-3669</span><span>Entrega a partir de R$8.</span><span>Retirada disponível.</span></div></div></footer>

      {(activeCategory || cart.length > 0) && (!showLimitedCupView || (cupBuilderFlowActive && availability.ordersOpen && Boolean(cupFlavorPreview && cupSizeId) && cupCanOrder)) && !(cupBuilderFlowActive && cupInlineActionVisible) && !(stickyUsesCheckoutAction && inlineFinalActionVisible) && !(builderFlowActive && inlineBuilderActionVisible) && !(builderFlowActive && activeCategory === "pipocas" && gourmetFlavorsInView && !gourmetContinueAvailable) && (
      <div className={`mobile-sticky-bar ${stickyIsCheckoutReady ? "is-ready" : "is-building"} ${stickyIsCheckoutReady && checkoutChannel === "whatsapp" ? "is-whatsapp" : ""} ${cupBuilderFlowActive ? "is-crocantes-step" : ""} ${stickyUsesCheckoutAction ? "is-checkout-flow" : ""} ${builderFlowActive && activeCategory === "pipocas" ? "is-gourmet-step" : ""} ${gourmetContinueAvailable ? "is-gourmet-flavor-continue" : ""}`} data-state={stickyIsCheckoutReady ? "ready" : "building"}>
        <div className="mobile-sticky-price" aria-live="polite" aria-atomic="true">
          {gourmetContinueAvailable ? <><small>Sabores escolhidos</small><strong>{popcornOptionIds.length} de {popcornMaxOptions}</strong></>
            : <><small>{stickyPriceCaption}</small><strong>{stickyPriceLabel}</strong></>}
        </div>
        <Button type="button" onClick={handleStickyAction} disabled={!availability.ordersOpen || isFinalizing || cupAdding || (cupBuilderFlowActive && Boolean(cupFlavorPreview && cupSizeId) && !cupCanOrder) || (builderFlowActive && !categoryIsAvailable(activeCategory))}>
          {gourmetContinueAvailable ? `Continuar com ${popcornOptionIds.length} ${popcornOptionIds.length === 1 ? "sabor" : "sabores"}` : stickyButtonLabel}
          {gourmetContinueAvailable ? <ChevronRight size={17} aria-hidden="true" /> : stickyIsCheckoutReady ? checkoutChannel === "whatsapp" ? <MessageCircle size={17} /> : <ShoppingBag size={17} /> : <ChevronRight size={17} />}
        </Button>
      </div>
      )}
    </main>
  );
}
