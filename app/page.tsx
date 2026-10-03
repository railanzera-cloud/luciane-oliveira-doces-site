"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CakeSlice,
  Check,
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
  DELIVERY_TIME_ESTIMATE,
  DRINKS,
  POPCORN,
  popcornPrice,
  PRODUCTS,
  SLICES,
  SLICE_WEIGHT_GRAMS,
  SLICE_OPTIONS,
  STORE_CONFIG,
  type CategoryId,
  type Product,
  type ProductOption,
  type Variant,
} from "@/app/catalog";
import {
  CATEGORY_ITEM_KEYS,
  POPCORN_FLAVOR_ITEM_KEYS,
  POPCORN_SIZE_ITEM_KEYS,
  SLICE_ITEM_KEYS,
  isItemAvailable,
  isItemVisible,
  statusFor,
  type AvailabilitySnapshot,
} from "@/app/menu-availability";
import { categoryFromUrl, categoryUrl, publicCategories, resolveMenuCategory } from "@/app/menu-navigation";
import { useMenuAvailability } from "@/hooks/use-menu-availability";
import {
  buildRegisteredOrderMessage, captureOrderAttribution, cleanWhatsAppField, formatOrderMoney, newOrderContext,
  parseCashCents, paymentDescription, restoreOrderContext,
  type CheckoutDetails, type OrderAttribution, type OrderContext,
} from "@/app/order-checkout";
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

type Fulfillment = "entrega" | "retirada" | "";
type WhatsAppPayment = "pix" | "dinheiro" | "cartao" | "credito" | "debito";
type Payment = WhatsAppPayment | SitePaymentMethod | "";
type CheckoutChannel = "site" | "whatsapp";
type MetaEventName = "ViewContent" | "AddToCart" | "InitiateCheckout" | "AddPaymentInfo";
type StepState = "active" | "complete" | "locked";
type AddedNotice = {
  category: CategoryId;
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

function itemUnitPrice(product: Product, variant: Variant, optionIds: string[] = []) {
  // Carrinhos com tamanho retirado ficam sem valor de venda até serem corrigidos.
  if (variant.retired) return 0;
  return product.kind === "popcorn" ? popcornPrice(variant.id, optionIds) : variant.price;
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

    const category = product.kind === "popcorn" ? "pipocas" : product.kind === "slice" ? "fatias" : null;
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

    if (product.kind === "popcorn") {
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

    if (product.kind === "slice") {
      if (item.optionIds.length !== 1 || !SLICE_OPTIONS.some(option => option.id === item.optionIds[0])) reasons.push("Escolha com calda de chocolate ou sem calda editando esta fatia.");
      const sliceKey = SLICE_ITEM_KEYS[product.id];
      if (sliceKey && !isItemAvailable(snapshot, sliceKey)) {
        reasons.push(unavailableReason(snapshot, sliceKey, productLabel(product)));
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
    const optionsAreValid = product.kind === "popcorn"
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

export default function Home() {
  const [requestedCategory, setRequestedCategory] = useState<CategoryId | null>(null);
  const [popcornVariantId, setPopcornVariantId] = useState("");
  const [popcornOptionIds, setPopcornOptionIds] = useState<string[]>([]);
  const [popcornQuantity, setPopcornQuantity] = useState(1);
  const [scrollRequest, setScrollRequest] = useState<{ id: string } | null>(null);
  function requestScroll(id: string) { setScrollRequest({ id }); }
  useEffect(() => {
    if (!scrollRequest) return;
    const frame = window.requestAnimationFrame(() => { scrollToSection(scrollRequest.id); setScrollRequest(null); });
    return () => window.cancelAnimationFrame(frame);
  }, [scrollRequest]);
  const [sliceProductId, setSliceProductId] = useState("");
  const [sliceOptionId, setSliceOptionId] = useState("");
  const [sliceQuantity, setSliceQuantity] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectionMessage, setSelectionMessage] = useState("");
  const [drinkMessage, setDrinkMessage] = useState("");
  const [fulfillment, setFulfillment] = useState<Fulfillment>("");
  const [deliveryZoneId, setDeliveryZoneId] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [address, setAddress] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [legacyAddressNotice, setLegacyAddressNotice] = useState(false);
  const [reference, setReference] = useState("");
  const [payment, setPayment] = useState<Payment>("");
  const [checkoutChannel, setCheckoutChannel] = useState<CheckoutChannel>(COMMERCE_CONFIG.siteOrderingEnabled ? "site" : "whatsapp");
  const [notes, setNotes] = useState("");
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
  const navigationPendingRef = useRef(false);
  const checkoutFingerprintRef = useRef("");
  const unlockTimerRef = useRef<number | undefined>(undefined);
  const { availability, hasResolvedAvailability, refreshAvailability } = useMenuAvailability();
  const visibleCategories = publicCategories(availability);
  const activeCategory = hasResolvedAvailability ? resolveMenuCategory(availability, requestedCategory) : null;
  const checkoutStartedRef = useRef(false);
  const paymentInfoTrackedRef = useRef(false);

  const pipocasVisible = STORE_CONFIG.enabledCategories.pipocas
    && isItemVisible(availability, CATEGORY_ITEM_KEYS.pipocas);
  const fatiasVisible = STORE_CONFIG.enabledCategories.fatias
    && isItemVisible(availability, CATEGORY_ITEM_KEYS.fatias);
  const pipocasAvailable = pipocasVisible
    && isItemAvailable(availability, CATEGORY_ITEM_KEYS.pipocas);
  const fatiasAvailable = fatiasVisible
    && isItemAvailable(availability, CATEGORY_ITEM_KEYS.fatias);

  function categoryIsVisible(category: CategoryId) {
    return category === "pipocas" ? pipocasVisible : fatiasVisible;
  }

  function categoryIsAvailable(category: CategoryId | null) {
    return category === "pipocas" ? pipocasAvailable : category === "fatias" && fatiasAvailable;
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
    try { priorAttribution ??= JSON.parse(window.localStorage.getItem("lod-first-known-attribution") || "null") ?? undefined; } catch { /* Optional attribution history. */ }
    attributionRef.current = captureOrderAttribution(window.location.href, document.cookie, priorAttribution);
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
        if (typeof savedOrder.notes === "string") setNotes(savedOrder.notes.slice(0, 500));
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
      setStorageReady(true);
    }, 0);

    const followHistory = () => setRequestedCategory(categoryFromUrl(window.location.href));
    window.addEventListener("popstate", followHistory);
    return () => {
      window.clearTimeout(restoreTimer);
      window.removeEventListener("popstate", followHistory);
    };
  }, []);

  const popcornVariant = POPCORN.variants.find((variant) => variant.id === popcornVariantId);
  const popcornVariantUsable = Boolean(popcornVariant?.available && pipocasAvailable && popcornSizeIsAvailable(popcornVariant.id));
  const popcornMaxOptions = popcornVariant?.maxOptions ?? 0;
  const popcornLimitReached = Boolean(popcornVariant) && popcornOptionIds.length >= popcornMaxOptions;
  const selectedSlice = SLICES.find((product) => product.id === sliceProductId);
  const selectedSliceVariant = selectedSlice?.variants[0];
  const selectedDeliveryZone = DELIVERY_ZONES.find((zone) => zone.id === deliveryZoneId);
  const deliveryNeighborhood = selectedDeliveryZone?.asksNeighborhood
    ? neighborhood.trim()
    : selectedDeliveryZone?.label ?? "";

  const deliveryZoneError = deliveryZoneMismatchMessage(deliveryZoneId, cleanWhatsAppField(neighborhood))
    .replace("‘Onde será a entrega?’", "‘Selecione seu bairro ou local de entrega’");

  const cartSubtotal = useMemo(
    () => cart.reduce((total, item) => {
      const product = PRODUCTS.find((candidate) => candidate.id === item.productId);
      const variant = product?.variants.find((candidate) => candidate.id === item.variantId);
      return total + (product && variant ? itemUnitPrice(product, variant, item.optionIds) : 0) * item.quantity;
    }, 0),
    [cart],
  );

  const cartNeedsSizeReview = cart.some((item) => PRODUCTS.find((product) => product.id === item.productId)?.variants.find((variant) => variant.id === item.variantId)?.retired);
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);
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
  const sliceReady = Boolean(
    availability.ordersOpen
    && fatiasAvailable
    && selectedSlice?.available
    && selectedSliceVariant?.available
    && selectedSlice
    && sliceIsAvailable(selectedSlice.id)
    && SLICE_OPTIONS.some(option => option.id === sliceOptionId),
  );
  const draftReady = activeCategory === "pipocas" ? popcornReady : activeCategory === "fatias" && sliceReady;
  const popcornUnitPrice = popcornVariant && !popcornVariant.retired ? itemUnitPrice(POPCORN, popcornVariant, popcornOptionIds) : null;
  const draftSubtotal = activeCategory === "pipocas"
    ? popcornUnitPrice === null ? null : popcornUnitPrice * popcornQuantity
    : selectedSliceVariant ? selectedSliceVariant.price * sliceQuantity : null;
  const addressReady = fulfillment !== "entrega"
    || Boolean(selectedDeliveryZone && !deliveryZoneError && cleanWhatsAppField(deliveryNeighborhood) && cleanWhatsAppField(address) && cleanWhatsAppField(addressNumber));
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
  const builderFlowActive = Boolean(activeCategory && (editingId || builderEngaged || draftReady || !cart.length));
  const stickyUsesCheckoutAction = !builderFlowActive;
  const stickyIsCheckoutReady = stickyUsesCheckoutAction && checkoutReady;
  const stickyPriceLabel = cart.length > 0 && !builderFlowActive
    ? cartNeedsSizeReview ? "Revise o tamanho" : currency.format(hasEstimatedTotal ? orderTotal : cartSubtotal)
    : draftSubtotal === null
      ? activeCategory === "pipocas" ? `A partir de ${currency.format(popcornPrice("500ml"))}` : "A partir de R$20"
      : currency.format(draftSubtotal);
  const stickyPriceCaption = cart.length > 0 && !builderFlowActive
    ? hasEstimatedTotal ? "Total" : "Subtotal"
    : activeCategory === "pipocas" ? "Sua pipoca" : "Sua fatia";
  const paymentLabel = checkoutChannel === "site" && isSitePayment(payment)
    ? sitePaymentLabel(payment, fulfillment)
    : paymentDescription(isWhatsAppPayment(payment) ? payment : "", fulfillment).replace(" (1x)", "");
  const finalButtonLabel = isFinalizing
    ? openingWhatsApp ? "Abrindo WhatsApp…" : "Conferindo pedido…"
    : checkoutChannel === "site"
      ? payment === "mercado_pago_pix" ? "Gerar Pix e confirmar pedido"
        : payment === "mercado_pago_card" ? "Preencher e pagar com cartão"
          : "Confirmar pedido"
      : whatsAppRetryAvailable ? "Tentar novamente" : "Finalizar pedido no WhatsApp";
  const stickyButtonLabel = isFinalizing ? finalButtonLabel : !availability.ordersOpen
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
        : `Adicionar ${sliceQuantity} ${sliceQuantity === 1 ? "fatia" : "fatias"}`
      : builderFlowActive
        ? activeCategory === "pipocas"
          ? popcornVariant ? "Escolher meus sabores" : "Escolher tamanho"
          : "Escolher minha fatia"
          : checkoutReady ? finalButtonLabel : "Continuar pedido";

  const checkoutDetails: CheckoutDetails = {
    customer_name: customerName.trim(), notes: notes.trim(),
    items: cart.map((item) => {
      const product = PRODUCTS.find((candidate) => candidate.id === item.productId)!;
      const variant = product.variants.find((candidate) => candidate.id === item.variantId)!;
      return {
        product_id: product.id, variant_id: variant.id, option_ids: [...item.optionIds],
        name: productLabel(product), size: variant.whatsappLabel, kind: product.kind,
        options: item.optionIds.map((id) => product.options.find((option) => option.id === id)?.name).filter((name): name is string => Boolean(name)),
        quantity: item.quantity, unit_price: itemUnitPrice(product, variant, item.optionIds),
      };
    }),
    fulfillment, neighborhood: deliveryNeighborhood, street: address, number: addressNumber,
    complement, reference, payment: isWhatsAppPayment(payment) ? payment : "", needs_change: needsChange, cash_received_cents: cashReceivedCents,
    subtotal: cartSubtotal, delivery_fee: deliveryFee, card_fee: cardQuote.feeCents / 100, card_basis_points: cardQuote.basisPoints, total: orderTotal, currency: "BRL",
  };
  const checkoutFingerprint = JSON.stringify({
    ...checkoutDetails,
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
    version: 2, cart, fulfillment, deliveryZoneId, neighborhood, address, addressNumber, complement,
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
    setRequestedCategory(category);
    setEditingId(null);
    setSelectionMessage("");
    setAddedNotice(null);
    setBuilderEngaged(true);
    window.history.replaceState(window.history.state, "", categoryUrl(window.location.href, category));
    if (shouldScroll) window.setTimeout(() => scrollToSection("configurador"), 30);
  }

  function returnToCategories() {
    clearDraft();
    setAddedNotice(null);
    setRequestedCategory(null);
    window.history.replaceState(window.history.state, "", categoryUrl(window.location.href, null));
    window.setTimeout(() => scrollToSection("inicio"), 30);
  }

  function choosePopcornVariant(nextId: string) {
    if (!categoryIsAvailable("pipocas")) return;
    const nextVariant = POPCORN.variants.find((variant) => variant.id === nextId);
    if (!nextVariant?.available || !popcornSizeIsAvailable(nextId)) return;
    setBuilderEngaged(true);
    setSelectionMessage("");
    setPopcornVariantId(nextId);
    window.setTimeout(() => scrollToSection("sabores"), 30);
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
      window.setTimeout(() => scrollToSection("quantidade-pipocas"), 30);
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
    setNeighborhood("");
    setAddress("");
    setReference("");
    setPayment("");
    setCheckoutChannel(COMMERCE_CONFIG.siteOrderingEnabled ? "site" : "whatsapp");
    setCustomerName("");
    setNotes("");
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
      const unitPrice = itemUnitPrice(product, variant, item.optionIds);
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
    setFulfillment(value as Fulfillment);
    setBuilderEngaged(false);
    requestScroll(nextCheckoutSection(value as Fulfillment));
  }

  function chooseCheckoutChannel(value: string) {
    const next = value === "site" && COMMERCE_CONFIG.siteOrderingEnabled ? "site" : "whatsapp";
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
      scrollToSection("tamanhos");
      return;
    }
    if (!popcornReady) {
      setBuilderEngaged(true);
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
        description: `${popcornQuantity}x Pipoca Gourmet ${popcornVariant.label} · ${flavorNames}`,
      });
    }
    const destination = wasEditing ? "carrinho" : "item-adicionado";
    clearDraft();
    window.setTimeout(() => scrollToSection(destination), 50);
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
        description: `${sliceQuantity}x ${productLabel(selectedSlice)}`,
      });
    }
    const destination = wasEditing ? "carrinho" : nextCheckoutSection();
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
    if (product.kind === "drink" || !isProductEnabled(product)) return;
    const itemCategory = product.kind === "popcorn" ? "pipocas" : "fatias";
    if (!categoryIsAvailable(itemCategory)) {
      setCheckoutAvailabilityMessage(`${product.category} estão indisponíveis. Remova este item ou escolha outra categoria.`);
      scrollToSection("carrinho");
      return;
    }
    window.history.replaceState(window.history.state, "", categoryUrl(window.location.href, itemCategory));
    setEditingId(item.id);
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
    if (delta > 0 && availability.ordersOpen) {
      const item = cart.find((candidate) => candidate.id === id);
      const product = PRODUCTS.find((candidate) => candidate.id === item?.productId);
      const variant = product?.variants.find((candidate) => candidate.id === item?.variantId);
      if (product && variant) {
        trackMetaEvent("AddToCart", metaProductPayload(product, variant, 1, item?.optionIds ?? []));
      }
    }
    setCart((current) => current.map((item) => item.id === id
      ? { ...item, quantity: Math.max(1, item.quantity + delta) }
      : item));
  }


  async function finishOnSite(card?: MercadoPagoCardData) {
    if (finalizationLockRef.current || !COMMERCE_CONFIG.siteOrderingEnabled || !isSitePayment(payment)) return;
    if (!availability.ordersOpen) {
      scrollToSection("inicio");
      return;
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
          ...(fulfillment === "entrega" ? { zone_id: deliveryZoneId, neighborhood: deliveryNeighborhood, street: address, number: addressNumber, complement, reference } : {}) },
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
        whatsappUrl: tintimWhatsAppUrl(buildRegisteredOrderMessage({ ...checkoutDetails, subtotal: Number(result.order.subtotal ?? checkoutDetails.subtotal), delivery_fee: Number(result.order.delivery_fee ?? checkoutDetails.delivery_fee), card_fee: Number(result.order.card_fee ?? 0), card_basis_points: result.order.card_basis_points ?? 0, total: Number(result.order.total) }, result.order.order_number, trackingUrl, PIX_DETAILS), attribution, document.cookie),
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
    if (activeCategory === "pipocas" && categoryIsVisible("pipocas")) addOrUpdatePopcorn();
    else if (activeCategory === "fatias") addOrUpdateSlice();
  }

  function handleStickyAction() {
    if (stickyUsesCheckoutAction) handleFinalAction();
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

  function beginBuilding() {
    setBuilderEngaged(true);
    scrollToSection(activeCategory ? "configurador" : "inicio");
  }

  // A resolved form warning must not override the current ready state.
  const checkoutFeedbackMessage = checkoutFormReady && checkoutAvailabilityMessage === "Complete as informações acima para continuar."
    ? "" : checkoutAvailabilityMessage;
  const checkoutShowsReady = checkoutReady && !isFinalizing && !whatsAppRetryAvailable && !checkoutFeedbackMessage;
  const checkoutHint = (fulfillment === "entrega" && deliveryZoneError) || checkoutFeedbackMessage
    || (!availability.ordersOpen
    ? STORE_CONFIG.closedMessage
    : cartIssues.length > 0
      ? "Um ou mais itens ficaram indisponíveis. Revise o carrinho para continuar."
    : checkoutChannel === "whatsapp" && !checkoutFormReady
      ? "Complete as informações acima para continuar."
    : !cart.length
      ? "Adicione pelo menos um produto ao pedido."
      : !fulfillment
        ? "Escolha entrega ou retirada."
        : fulfillment === "entrega" && !selectedDeliveryZone
          ? "Escolha onde será a entrega."
          : fulfillment === "entrega" && selectedDeliveryZone?.asksNeighborhood && !neighborhood.trim()
            ? "Informe seu bairro."
            : !addressReady
              ? "Preencha os dados da entrega."
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
        <a className="brand-lockup" href="#inicio" aria-label="Voltar ao início">
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
          <div className="entry-heading">
            <p className="eyebrow">Luciane Oliveira Doces</p>
            <h1>{activeCategory === "pipocas" ? "Pipocas Gourmet" : activeCategory === "fatias" ? "Fatias Artesanais" : "Escolha o que deseja pedir"}</h1>
            <p className="entry-copy">{activeCategory === "pipocas"
              ? "Escolha o tamanho e combine seus sabores."
              : activeCategory === "fatias"
                ? "Sabores disponíveis"
                : COMMERCE_CONFIG.siteOrderingEnabled
                  ? "Monte seu pedido e escolha se prefere concluir no site ou pelo WhatsApp."
                  : "Monte seu pedido pelo site e envie pelo WhatsApp."}</p>
            {hasResolvedAvailability && availability.ordersOpen && visibleCategories.length > 0 && (
              <p className="delivery-time-estimate">{DELIVERY_TIME_ESTIMATE} O prazo começa após a confirmação da loja.</p>
            )}
          </div>
          {!hasResolvedAvailability ? (
            <div className="entry-loading" role="status">Carregando cardápio…</div>
          ) : !activeCategory && (
            visibleCategories.length > 0 ? (
              <div className="category-options" aria-label="Escolha uma categoria">
                {visibleCategories.map((category) => {
                  const available = categoryIsAvailable(category.id);
                  const cover = category.id === "pipocas" ? POPCORN : SLICES.find((slice) => sliceIsVisible(slice.id));
                  return (
                    <button type="button" className="category-option" disabled={!available} key={category.id} onClick={() => selectCategory(category.id)} aria-label={`${category.name}${available ? "" : " — Esgotado"}`}>
                      <span className="category-option-media">
                        {cover?.image && <img src={cover.cardImage ?? cover.image} alt="" width="640" height="480" loading="eager" decoding="async" fetchPriority={category.id === "pipocas" ? "high" : "auto"} />}
                      </span>
                      <span className="category-option-copy">
                        <strong>{category.name}</strong>
                        <span>{category.description}</span>
                        {!available && <em>Esgotado</em>}
                      </span>
                      {available && <ChevronRight className="category-option-arrow" size={20} aria-hidden="true" />}
                    </button>
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
          <p className="delivery-note"><Truck size={16} aria-hidden="true" /> Entrega a partir de R$8 ou retirada em Paragominas</p>
        </div>
      </section>

      {activeCategory && (
      <section className="builder-section" id="configurador">
        <div className="page-shell builder-shell">
          <div className="section-intro">
            <p className="eyebrow">Seu pedido, do seu jeito</p>
            <h2>{activeCategory === "pipocas" ? "Monte em poucos passos" : "Escolha sua fatia"}</h2>
            <p>{activeCategory === "pipocas"
              ? "Escolha o tamanho, os sabores da sua pipoca e a quantidade."
              : "Monte uma combinação por vez. Depois, você pode adicionar outra fatia com um sabor diferente."}</p>
            {visibleCategories.length > 1 && (
              <button type="button" className="category-text-link" onClick={returnToCategories}>
                Trocar categoria <ChevronRight size={15} aria-hidden="true" />
              </button>
            )}
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
                <div className="step-heading"><StepMarker number={1} state={popcornSizeStepState} /><div><h3 id="step-size">Escolha o tamanho</h3><p>O preço e o limite de sabores mudam conforme o pote.</p></div></div>
                {!POPCORN.variants.some((variant) => popcornSizeIsVisible(variant.id)) && <p className="selection-helper" role="status">Nenhum tamanho disponível no momento.</p>}
                <RadioGroup className="size-grid" value={popcornVariantId} onValueChange={choosePopcornVariant} aria-label="Tamanho da Pipoca Gourmet">
                  {POPCORN.variants.filter((variant) => popcornSizeIsVisible(variant.id)).map((variant) => {
                    const available = pipocasAvailable && POPCORN.available && variant.available && popcornSizeIsAvailable(variant.id);
                    return (
                      <label className={`size-card ${variant.id === popcornVariantId ? "is-selected" : ""} ${!available ? "is-unavailable" : ""}`} htmlFor={`size-${variant.id}`} key={variant.id}>
                        <RadioGroupItem id={`size-${variant.id}`} value={variant.id} disabled={!available} />
                        <span className="size-copy"><strong>{variant.label}</strong><b>{currency.format(itemUnitPrice(POPCORN, variant, popcornOptionIds))}</b><small>Até {variant.maxOptions} sabores</small></span>
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
                  <div><h3 id="step-flavors">Escolha os sabores da sua pipoca</h3><p>{popcornVariant ? `Combine até ${popcornMaxOptions} sabores neste pote.` : "Primeiro, escolha o tamanho acima."}</p></div>
                  <span className="selection-count" aria-live="polite">{popcornVariant ? `${popcornOptionIds.length}/${popcornMaxOptions}` : "—"}</span>
                </div>
                <div className="flavor-grid">
                  {POPCORN.options.filter((option) => popcornFlavorIsVisible(option.id)).map((option) => {
                    const selected = popcornOptionIds.includes(option.id);
                    const limitDisabled = popcornLimitReached && !selected;
                    const waitingForSize = !popcornVariantUsable;
                    const available = pipocasAvailable && option.available && popcornFlavorIsAvailable(option.id);
                    const disabled = waitingForSize || (!available && !selected) || limitDisabled;
                    return (
                      <label className={`flavor-card ${selected ? "is-selected" : ""} ${disabled ? "is-disabled" : ""}`} htmlFor={`flavor-${option.id}`} key={option.id}>
                        <Checkbox id={`flavor-${option.id}`} checked={selected} disabled={disabled} onCheckedChange={() => togglePopcornOption(option)} aria-label={`Selecionar sabor ${option.name}`} />
                        <span className="flavor-tone" style={{ backgroundColor: option.tone }} aria-hidden="true" />
                        <span className="flavor-copy">
                          <strong>{option.name}</strong>
                          <small>{option.description}</small>
                          {popcornVariantUsable && popcornVariant && <small>{currency.format(popcornPrice(popcornVariant.id, [option.id]))} por pote</small>}
                        </span>
                        {selected && <span className="flavor-selected">Selecionado</span>}
                        {waitingForSize && available && <span className="flavor-status">Escolha o tamanho</span>}
                        {!available && <span className="flavor-status">Esgotado hoje</span>}
                        {limitDisabled && available && <span className="flavor-status">Limite atingido</span>}
                      </label>
                    );
                  })}
                </div>
                <div className={`selection-helper ${selectionMessage ? "has-message" : ""}`} aria-live="polite">
                  {selectionMessage || (!popcornVariant
                    ? "Primeiro escolha o tamanho. Depois, os sabores serão liberados."
                    : popcornOptionIds.length === 0
                      ? "Escolha pelo menos 1 sabor para adicionar ao pedido."
                    : popcornLimitReached
                      ? "Limite preenchido. Desmarque um sabor para trocar."
                      : `Você pode escolher mais ${popcornMaxOptions - popcornOptionIds.length} ${popcornMaxOptions - popcornOptionIds.length === 1 ? "sabor" : "sabores"}, se quiser.`)}
                </div>
                <p className="selection-helper" role="status">
                  Ao combinar sabores, vale o preço do conjunto mais caro escolhido.
                </p>
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
                <div className="step-heading"><StepMarker number={1} state={sliceProductStepState} /><div><h3 id="step-slice">Escolha sua fatia</h3><p>Selecione um sabor por vez. Depois de adicionar, você poderá escolher outro.</p></div></div>
                {!SLICES.some((slice) => sliceIsVisible(slice.id)) && <p className="selection-helper" role="status">Nenhuma fatia disponível no momento.</p>}
                <RadioGroup className="slice-grid" value={sliceProductId} onValueChange={(value) => {
                  if (!sliceIsAvailable(value) || !fatiasAvailable) return;
                  setBuilderEngaged(true);
                  setSliceProductId(value);
                  setSliceOptionId("");
                  setSelectionMessage("");
                  requestScroll("calda-fatias");
                }} aria-label="Sabor da fatia artesanal">
                  {SLICES.filter((slice) => sliceIsVisible(slice.id)).map((slice) => {
                    const selected = slice.id === sliceProductId;
                    const variant = slice.variants[0];
                    const available = fatiasAvailable && slice.available && variant.available && sliceIsAvailable(slice.id);
                    return (
                      <label className={`slice-card ${selected ? "is-selected" : ""} ${!available ? "is-unavailable" : ""} ${slice.availabilityLabel ? "is-upcoming" : ""}`} htmlFor={`slice-${slice.id}`} key={slice.id}>
                        <RadioGroupItem id={`slice-${slice.id}`} value={slice.id} disabled={!available} />
                        <span className="slice-media">
                          {slice.image ? <img src={slice.cardImage ?? slice.image} alt={slice.imageAlt} width="640" height="480" loading="lazy" decoding="async" fetchPriority="low" sizes="(max-width: 599px) calc(50vw - 27px), (max-width: 899px) calc(50vw - 36px), 240px" /> : <span className="slice-placeholder"><CakeSlice size={30} strokeWidth={1.4} /><small>Foto em breve</small></span>}
                        </span>
                        <span className="slice-card-copy">
                          <strong>{slice.name}</strong>
                          {slice.subtitle && <em>{slice.subtitle}</em>}
                          <span className="slice-weight">{SLICE_WEIGHT_GRAMS} g por fatia</span>
                          <b>{currency.format(variant.price)}</b>
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
                <div className="step-heading compact-heading"><StepMarker number={2} state={sliceSauceStepState} /><h3 id="step-slice-sauce">Como prefere sua fatia?</h3></div>
                <RadioGroup className="slice-sauce-choice" value={sliceOptionId} onValueChange={value => {
                  setSliceOptionId(value); setSelectionMessage(""); requestScroll("quantidade-fatias");
                }} aria-labelledby="step-slice-sauce">
                  {SLICE_OPTIONS.map(option => <label className={`slice-sauce-card ${sliceOptionId === option.id ? "is-selected" : ""}`} key={option.id} htmlFor={`slice-${option.id}`}>
                    <RadioGroupItem id={`slice-${option.id}`} value={option.id} />
                    <span>{option.name}</span>
                    {sliceOptionId === option.id && <Check size={18} aria-hidden="true" />}
                  </label>)}
                </RadioGroup>
                {selectionMessage && <p className="selection-helper" role="status">{selectionMessage}</p>}
              </section>}

              <section className={`step-block step-state-${sliceQuantityStepState}`} id="quantidade-fatias" aria-labelledby="step-slice-quantity" aria-current={sliceQuantityStepState === "active" ? "step" : undefined}>
                <div className="step-heading compact-heading"><StepMarker number={3} state={sliceQuantityStepState} /><div><h3 id="step-slice-quantity">Quantas fatias deste sabor?</h3><p>Para outro sabor, adicione este item e escolha a próxima fatia.</p></div></div>
                <div className="quantity-row">
                  <div className="quantity-control" aria-label="Quantidade">
                    <Button type="button" variant="ghost" size="icon" onClick={() => setSliceQuantity((current) => Math.max(1, current - 1))} disabled={!sliceReady || sliceQuantity === 1} aria-label="Diminuir quantidade"><Minus size={18} /></Button>
                    <strong aria-live="polite">{sliceQuantity}</strong>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setSliceQuantity((current) => current + 1)} disabled={!sliceReady} aria-label="Aumentar quantidade"><Plus size={18} /></Button>
                  </div>
                  <div className="draft-total"><small>Subtotal</small><strong>{selectedSliceVariant ? currency.format(selectedSliceVariant.price * sliceQuantity) : "Escolha a fatia"}</strong></div>
                </div>
                <Button type="button" className="primary-cta add-button" onClick={addOrUpdateSlice} disabled={!availability.ordersOpen || !sliceReady}>
                  <ShoppingBag size={18} />{editingId
                    ? "Salvar alterações"
                    : !selectedSlice
                      ? "Escolha sua fatia acima"
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

          {addedNotice && (
            <div className="added-panel" id="item-adicionado" role="status" aria-live="polite">
              <span className="added-panel-icon" aria-hidden="true"><Check size={18} strokeWidth={3} /></span>
              <div className="added-panel-copy">
                <strong>Adicionado ao pedido</strong>
                <p>{addedNotice.description}</p>
              </div>
              <div className="added-panel-actions">
                {categoryIsAvailable(addedNotice.category) && (
                  <Button type="button" variant="outline" onClick={() => startAnother(addedNotice.category)}>
                    <Plus size={16} /> {addedNotice.category === "fatias" ? "Adicionar outra fatia" : "Adicionar outra pipoca"}
                  </Button>
                )}
                <Button type="button" variant="ghost" onClick={() => scrollToSection("carrinho")}>Ver pedido</Button>
              </div>
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
      <section className="checkout-section" id="carrinho">
        <div className="page-shell checkout-grid">
          <div className="checkout-main">
            <section className="order-card" aria-labelledby="cart-title">
              <div className="order-card-heading">
                <div><p className="eyebrow">Carrinho</p><h2 id="cart-title">Seu pedido</h2></div>
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
                    const unitPrice = itemUnitPrice(product, variant, item.optionIds);
                    return (
                      <article className={`cart-item ${itemIssue ? "is-unavailable" : ""}`} key={item.id}>
                        <div className="cart-item-top">
                          <div className="cart-item-info">
                            <span className="product-category">{product.category}</span>
                            <h3>{productLabel(product)}</h3>
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
                          <div className="cart-item-value"><small>Valor</small><strong>{variant.retired ? "Revise o tamanho" : currency.format(unitPrice * item.quantity)}</strong></div>
                        </div>
                        <div className="cart-item-actions">
                          <div className="mini-quantity">
                            <Button type="button" variant="ghost" size="icon" onClick={() => changeCartQuantity(item.id, -1)} disabled={item.quantity === 1} aria-label="Diminuir quantidade deste item"><Minus size={15} /></Button>
                            <span>{item.quantity}</span>
                            <Button type="button" variant="ghost" size="icon" onClick={() => changeCartQuantity(item.id, 1)} disabled={!availability.ordersOpen || Boolean(itemIssue)} aria-label="Aumentar quantidade deste item"><Plus size={15} /></Button>
                          </div>
                          {product.kind !== "drink" && <Button type="button" variant="ghost" className="text-action" onClick={() => editItem(item)}><Pencil size={15} /> Editar</Button>}
                          <Button type="button" variant="ghost" className="text-action destructive-action" onClick={() => removeItem(item.id)}><Trash2 size={15} /> Remover</Button>
                        </div>
                      </article>
                    );
                  })}
                  <div className="cart-subtotal"><span>Subtotal dos produtos</span><strong>{cartNeedsSizeReview ? "Revise o tamanho" : currency.format(cartSubtotal)}</strong></div>
                  {cart.some((item) => item.productId === POPCORN.id) && <p className="cart-save-note">Pipocas calculadas pela tabela atual: tamanho e conjunto mais caro dos sabores escolhidos. Confira os valores antes de enviar.</p>}
                  <p className="cart-save-note"><Check size={14} /> Pedido mantido somente nesta aba. Ao fechá-la, ele é limpo.</p>
                  <div className="cart-add-more">
                    <strong>Adicionar mais itens</strong>
                    <div className={`cart-add-options ${STORE_CONFIG.enabledExtras.drinks ? "" : "without-drinks"}`}>
                      {fatiasAvailable && <Button type="button" variant="outline" onClick={() => startAnother("fatias")}><CakeSlice size={16} /> Outra fatia</Button>}
                      {pipocasAvailable && <Button type="button" variant="outline" onClick={() => startAnother("pipocas")}><Plus size={16} /> Outra pipoca</Button>}
                      {STORE_CONFIG.enabledExtras.drinks && <Button type="button" variant="outline" onClick={() => scrollToSection("acompanhamentos")}><CupSoda size={16} /> Refrigerante</Button>}
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className={`order-card checkout-flow-card step-state-${receivingStepState}`} id="recebimento" aria-labelledby="receiving-title" aria-current={receivingStepState === "active" ? "step" : undefined}>
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
                  <div className="field-group delivery-zone-field">
                    <label id="delivery-zone-label">Selecione seu bairro ou local de entrega</label>
                    <small id="delivery-zone-hint" className="delivery-selection-help">Selecione seu local para calcular a taxa de entrega.</small>
                    <Select value={deliveryZoneId} onValueChange={setDeliveryZoneId}>
                      <SelectTrigger className="delivery-select-trigger" aria-labelledby="delivery-zone-label" aria-describedby="delivery-zone-hint">
                        <SelectValue placeholder="Selecione o local de entrega" />
                      </SelectTrigger>
                      <SelectContent className="delivery-select-content" align="start">
                        <SelectGroup>
                          <SelectLabel>Mais pedidas</SelectLabel>
                          {DELIVERY_ZONES.filter((zone) => zone.group === "mais-pedidas").map((zone) => (
                            <SelectItem key={zone.id} value={zone.id}>{zone.id === "cidade" ? "Outro bairro dentro da cidade" : zone.label} — {currency.format(zone.price)}</SelectItem>
                          ))}
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Outras regiões</SelectLabel>
                          {DELIVERY_ZONES.filter((zone) => zone.group === "outras-regioes").map((zone) => (
                            <SelectItem key={zone.id} value={zone.id}>{zone.id === "cidade" ? "Outro bairro dentro da cidade" : zone.label} — {currency.format(zone.price)}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {selectedDeliveryZone && (
                      <span className="delivery-price-preview">Taxa de entrega: <strong>{currency.format(selectedDeliveryZone.price)}</strong></span>
                    )}
                  </div>
                  {selectedDeliveryZone?.asksNeighborhood && (
                    <div className="field-group">
                      <label htmlFor="neighborhood">Qual é o seu bairro?</label>
                      <Input id="neighborhood" value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} placeholder="Digite seu bairro" autoComplete="address-level3" aria-invalid={Boolean(deliveryZoneError)} aria-describedby={deliveryZoneError ? "delivery-zone-error" : undefined} />
                      {deliveryZoneError && <p id="delivery-zone-error" className="field-error" role="status">{deliveryZoneError}</p>}
                    </div>
                  )}
                  {legacyAddressNotice && <p className="field-note" role="status">Seu endereço anterior foi preservado. Confira a rua e informe o número; se não houver, use s/n.</p>}
                  <div className="field-group"><label htmlFor="address">Rua</label><Input id="address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Ex.: Rua das Flores" autoComplete="address-line1" /></div>
                  <div className="field-group"><label htmlFor="address-number">Número</label><Input id="address-number" value={addressNumber} onChange={(event) => { setAddressNumber(event.target.value); setLegacyAddressNotice(false); }} placeholder="Ex.: 123 ou s/n" /></div>
                  <div className="field-group"><label htmlFor="complement">Complemento (opcional)</label><Input id="complement" value={complement} onChange={(event) => setComplement(event.target.value)} placeholder="Ex.: casa 2, apartamento" autoComplete="address-line2" /></div>
                  <div className="field-group"><label htmlFor="reference">Ponto de referência (opcional)</label><Input id="reference" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Ex.: próximo à praça" /></div>
                  <p className="field-note">A taxa é calculada pelo local escolhido. Confira o endereço e o total antes de enviar.</p>
                  <p className="field-note">{DELIVERY_TIME_ESTIMATE} O prazo começa após a confirmação da loja.</p>
                </div>
              )}
              {fulfillment === "retirada" && <div className="pickup-note"><MapPin size={18} /><span><strong>Retirada disponível em Paragominas.</strong>{checkoutChannel === "whatsapp" ? "O horário e o local serão confirmados no WhatsApp." : "A loja confirmará o horário e o local pelo celular informado."}</span></div>}
            </section>

            {COMMERCE_CONFIG.siteOrderingEnabled && (
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
                  <div className="field-group"><label htmlFor="order-notes">Alguma observação para seu pedido?</label><textarea id="order-notes" value={notes} onChange={event => setNotes(event.target.value)} maxLength={500} placeholder="Ex.: Entregar na portaria." rows={3} /><small>{notes.length}/500 · Opcional</small></div>
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
                      <RadioGroupItem id={`payment-${value}`} value={value} /><span>{label}</span>{payment === value && <Check size={17} />}
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
                  {needsChange && <div className="field-group"><label htmlFor="change-for">Troco para quanto?</label><Input id="change-for" value={changeFor} onChange={(event) => setChangeFor(event.target.value)} placeholder="Ex.: 50,00" inputMode="decimal" aria-invalid={Boolean(changeError)} aria-describedby="change-help" /><p id="change-help" className={changeError ? "field-error" : "field-note"} aria-live="polite">{cartNeedsSizeReview ? "Corrija o tamanho da pipoca para calcular o troco." : changeError || `Troco necessário: ${formatOrderMoney((cashReceivedCents! - Math.round(orderTotal * 100)) / 100)}`}</p></div>}
                  <p className="field-note">{fulfillment === "retirada" ? "Pagamento em dinheiro no momento da retirada." : fulfillment === "entrega" ? "Pagamento em dinheiro no momento da entrega." : "Pagamento em dinheiro na entrega ou retirada."}</p>
                </div>
              )}
            </section>
          </div>

          <aside className="summary-card" aria-labelledby="summary-title">
            <p className="eyebrow">Confira antes de enviar</p><h2 id="summary-title">Resumo do pedido</h2>
            {cart.length > 0 && checkoutChannel !== "whatsapp" && <p className="order-code">O número do pedido será mostrado após a confirmação.</p>}
            <div className="summary-content">
              {cart.length === 0 ? <p className="summary-empty">Os produtos adicionados aparecerão aqui.</p> : cart.map((item, index) => {
                const product = PRODUCTS.find((candidate) => candidate.id === item.productId)!;
                const variant = product.variants.find((candidate) => candidate.id === item.variantId)!;
                const itemIssue = cartIssues.find((issue) => issue.cartItemId === item.id);
                const names = item.optionIds.map((id) => product.options.find((option) => option.id === id)?.name).filter(Boolean).join(", ");
                const lineTotal = itemUnitPrice(product, variant, item.optionIds) * item.quantity;
                return (
                  <div className={`summary-item ${itemIssue ? "is-unavailable" : ""}`} key={item.id}>
                    <div className="summary-item-main">
                      <span className="summary-item-index" aria-hidden="true">{index + 1}</span>
                      <div>
                        <strong>{productLabel(product)}</strong>
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
              <div className="summary-row"><span>Produtos</span><strong>{cartNeedsSizeReview ? "Revise o tamanho" : currency.format(cartSubtotal)}</strong></div>
              {fulfillment === "entrega" && selectedDeliveryZone && (
                <div className="summary-row summary-delivery"><span>Taxa de entrega</span><strong>{currency.format(deliveryFee)}</strong></div>
              )}
              {fulfillment === "retirada" && <div className="summary-row"><span>Taxa de entrega</span><strong>Não se aplica</strong></div>}
              {cart.length > 0 && (fulfillment === "retirada" || (fulfillment === "entrega" && selectedDeliveryZone)) && (
                <>{cardMode && <div className="summary-row"><span>Acréscimo do cartão ({(cardQuote.basisPoints / 100).toLocaleString("pt-BR")}%)</span><strong>{currency.format(cardQuote.feeCents / 100)}</strong></div>}
                <div className="summary-row summary-total"><span>Total a pagar</span><strong>{cartNeedsSizeReview ? "Revise o tamanho" : currency.format(orderTotal)}</strong></div></>
              )}
              {fulfillment === "entrega" && <div className="summary-address"><strong>Endereço de entrega</strong><p>{[address, addressNumber].filter(Boolean).join(", ") || "Informe a rua e o número"}</p>{complement && <p>{complement}</p>}<p>{deliveryNeighborhood || "Informe o bairro"}</p>{reference && <p>Referência: {reference}</p>}</div>}
              {isCashPayment && needsChange && !changeError && !cartNeedsSizeReview && <div className="summary-address"><p>Troco para: {formatOrderMoney(cashReceivedCents! / 100)}</p><p>Troco necessário: {formatOrderMoney((cashReceivedCents! - Math.round(orderTotal * 100)) / 100)}</p></div>}
              {<div className="summary-address"><strong>Cliente</strong><p>{customerName.trim() || "Informe seu nome"}</p>{checkoutChannel === "site" && <p>{customerPhone.trim() || "Informe seu celular"}</p>}{payment === "mercado_pago_pix" && <p>{customerEmail.trim() || "Informe seu e-mail"}</p>}</div>}
              <button type="button" className="summary-link" onClick={() => enterCheckout("recebimento")}><span><small>Recebimento</small><strong>{fulfillment === "entrega" ? selectedDeliveryZone ? `Entrega — ${selectedDeliveryZone.id === "cidade" ? "Outro bairro dentro da cidade" : selectedDeliveryZone.label} · ${currency.format(deliveryFee)}` : "Entrega — escolher local" : fulfillment === "retirada" ? "Retirada em Paragominas" : "Escolher opção"}</strong></span><ChevronRight size={18} /></button>
              <button type="button" className="summary-link" onClick={() => enterCheckout("pagamento")}><span><small>Pagamento</small><strong>{paymentLabel}</strong></span><ChevronRight size={18} /></button>
            </div>
            <Button type="button" className="whatsapp-button checkout-primary-button" onClick={handleFinalAction} disabled={isFinalizing || (!availability.ordersOpen && orderContext?.handoff_fingerprint !== checkoutFingerprint)} aria-describedby="checkout-status" data-event={checkoutChannel === "whatsapp" ? "whatsapp_checkout" : "site_checkout"}>{isFinalizing ? <LoaderCircle className="admin-spinner" size={20} /> : checkoutChannel === "whatsapp" ? <MessageCircle size={20} /> : payment === "mercado_pago_pix" ? <QrCode size={20} /> : <ShoppingBag size={20} />} {finalButtonLabel}</Button>
            {checkoutChannel === "whatsapp" && orderContext?.whatsapp_attempted_at && <div className="whatsapp-return-note" role="status"><strong>Continue no WhatsApp</strong><p>Envie a mensagem por lá para encaminhar o pedido. Seu pedido continua nesta aba para consulta.</p><Button type="button" variant="outline" onClick={clearOrder} disabled={isFinalizing}>Fazer novo pedido</Button></div>}
            {payment === "pix" && <p className="payment-guidance">Depois de finalizar no WhatsApp, faça o Pix com a chave informada na mensagem e envie o comprovante na conversa.</p>}
            <p id="checkout-status" className={checkoutShowsReady ? "ready-status" : "checkout-status"} aria-live="polite">{checkoutShowsReady && <Check size={14} />}{checkoutHint}</p>
          </aside>
        </div>
      </section>

      )}

      <section className="trust-section"><div className="page-shell trust-content"><Crown size={30} strokeWidth={1.4} aria-hidden="true" /><div><p className="eyebrow">Luciane Oliveira Doces</p><h2>Feito em Paragominas com muito recheio e cuidado em cada pedido.</h2></div></div></section>

      <footer><div className="page-shell footer-content"><div><strong>Luciane Oliveira Doces</strong><span>Paragominas–PA</span></div><div className="footer-details"><span className="footer-phone"><MessageCircle size={16} /> (91) 99362-3669</span><span>Entrega a partir de R$8.</span><span>Retirada disponível.</span></div></div></footer>

      {(activeCategory || cart.length > 0) && (
      <div className={`mobile-sticky-bar ${stickyIsCheckoutReady ? "is-ready" : "is-building"}`} data-state={stickyIsCheckoutReady ? "ready" : "building"}>
        <div><small>{stickyPriceCaption}</small><strong>{stickyPriceLabel}</strong></div>
        <Button type="button" onClick={handleStickyAction} disabled={!availability.ordersOpen || isFinalizing || (builderFlowActive && !categoryIsAvailable(activeCategory))}>
          {stickyButtonLabel}
          {stickyIsCheckoutReady ? checkoutChannel === "whatsapp" ? <MessageCircle size={17} /> : <ShoppingBag size={17} /> : <ChevronRight size={17} />}
        </Button>
      </div>
      )}
    </main>
  );
}
