"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, MapPin, Search, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { TintimContactLink } from "@/components/tintim-contact-link";
import { deliverySuggestionLayout, filterDeliveryNumberConflicts, filterSecondaryDeliveryPlaces, isSecondaryDeliveryPlaceQuery, queryAfterDeliverySelectionChange } from "@/components/delivery-picker-logic.mjs";
import { DELIVERY_ZONES } from "@/app/catalog";
import { deliveryLocalityById, deliveryLocalityCanQuote, deliveryLocalityTextMatches, searchDeliveryLocalities } from "@/supabase/functions/_shared/delivery-localities.mjs";

type Locality = { id: string; label: string; zoneId: string | null; status: string };
type Props = {
  selectedId: string;
  onSelect: (locality: Locality) => void;
  onClear: () => void;
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function DeliveryLocalityPicker({ selectedId, onSelect, onClear }: Props) {
  const listId = useId();
  const selected = deliveryLocalityById(selectedId);
  const [query, setQuery] = useState(selected?.label ?? "");
  const [expanded, setExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const fieldRef = useRef<HTMLInputElement>(null);
  const previousSelectedIdRef = useRef(selectedId);
  const clearingByTypingRef = useRef(false);
  // Em Safari/iOS tocar uma opção pode tirar o foco antes do click.
  // Preservar a lista até o clique evita que a opção desapareça.
  const pointerInsideOptionsRef = useRef(false);
  const [listPlacement, setListPlacement] = useState<"above" | "below">("below");
  const [listMaxHeight, setListMaxHeight] = useState(320);
  const { results, secondaryPlaceSearch } = useMemo(() => {
    const candidates = searchDeliveryLocalities(query, 20);
    return {
      results: filterDeliveryNumberConflicts(query, filterSecondaryDeliveryPlaces(candidates)).slice(0, 8),
      secondaryPlaceSearch: isSecondaryDeliveryPlaceQuery(query, candidates),
    };
  }, [query]);

  useEffect(() => {
    const nextQuery = queryAfterDeliverySelectionChange({
      previousId: previousSelectedIdRef.current,
      nextId: selectedId,
      nextLabel: selected?.label ?? "",
      clearedByTyping: clearingByTypingRef.current,
    });
    previousSelectedIdRef.current = selectedId;
    clearingByTypingRef.current = false;
    if (nextQuery === null) return; // Ao apagar um bairro escolhido, não apagar a nova busca.
    setQuery(nextQuery);
    setExpanded(false);
    setActiveIndex(0);
  }, [selectedId, selected?.label]);

  useEffect(() => {
    if (!expanded) return;
    const updateLayout = () => {
      const element = fieldRef.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const viewport = window.visualViewport;
      const layout = deliverySuggestionLayout({
        fieldTop: rect.top,
        fieldBottom: rect.bottom,
        viewportTop: viewport?.offsetTop ?? 0,
        viewportHeight: viewport?.height ?? window.innerHeight,
      });
      setListPlacement(layout.placement);
      setListMaxHeight(layout.maxHeight);
    };
    updateLayout();
    window.addEventListener("resize", updateLayout);
    window.addEventListener("scroll", updateLayout, { passive: true });
    window.visualViewport?.addEventListener("resize", updateLayout);
    window.visualViewport?.addEventListener("scroll", updateLayout);
    return () => {
      window.removeEventListener("resize", updateLayout);
      window.removeEventListener("scroll", updateLayout);
      window.visualViewport?.removeEventListener("resize", updateLayout);
      window.visualViewport?.removeEventListener("scroll", updateLayout);
    };
  }, [expanded]);

  const activeResult = results[Math.min(activeIndex, Math.max(0, results.length - 1))];
  const approximateResults = Boolean(query.trim() && results.length &&
    results.every((locality) => !deliveryLocalityTextMatches(query, locality)));
  const contactLocation = (selected?.label ?? query.trim()).slice(0, 100);
  const needsManualQuote = !deliveryLocalityCanQuote(selected)
    && (Boolean(selected) || (!secondaryPlaceSearch && query.trim().length >= 2 && (results.length === 0 || approximateResults)));

  function choose(locality: Locality) {
    pointerInsideOptionsRef.current = false;
    setQuery(locality.label);
    setExpanded(false);
    setActiveIndex(0);
    onSelect(locality);
  }

  return (
    <div className="delivery-locality-picker" onBlur={(event) => {
      if (!pointerInsideOptionsRef.current &&
        !event.currentTarget.contains(event.relatedTarget as Node | null)) setExpanded(false);
    }}>
      <label htmlFor="neighborhood">Bairro ou local de entrega</label>
      <div className="delivery-locality-input">
        <Search size={18} aria-hidden="true" />
        <Input
          ref={fieldRef}
          id="neighborhood"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && activeResult ? `${listId}-${activeResult.id}` : undefined}
          autoComplete="off"
          inputMode="search"
          maxLength={80}
          placeholder="Ex.: Promissão II, Açaizal..."
          value={query}
          onFocus={() => setExpanded(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setExpanded(true);
            setActiveIndex(0);
            if (selectedId) {
              clearingByTypingRef.current = true;
              onClear();
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") { setExpanded(false); return; }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setExpanded(true);
              setActiveIndex((index) => Math.min(index + 1, results.length - 1));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(0, index - 1));
            }
            if (event.key === "Enter" && expanded && activeResult) {
              event.preventDefault();
              choose(activeResult);
            }
          }}
        />
        {deliveryLocalityCanQuote(selected) && <Check className="delivery-locality-ok" size={18} aria-label="Bairro selecionado" />}
      {expanded && (
        <div className="delivery-locality-results" id={listId} role="listbox" aria-label="Sugestões de bairros"
          data-placement={listPlacement} style={{ maxHeight: `${listMaxHeight}px` }}
          onPointerDownCapture={() => { pointerInsideOptionsRef.current = true; }}
          onPointerUp={() => { window.setTimeout(() => { pointerInsideOptionsRef.current = false; }, 250); }}
          onPointerCancel={() => { pointerInsideOptionsRef.current = false; }}>
          {approximateResults && <p className="delivery-locality-approximate" role="status">Sugestões parecidas. Confira o nome antes de escolher.</p>}
          {results.length === 0 ? (
            <p className="delivery-locality-empty" role="status">{secondaryPlaceSearch
              ? "Selecione o bairro onde fica esse condomínio ou residencial. Informe o nome do local no campo Complemento."
              : "Não encontramos esse nome. Confira a grafia ou solicite confirmação com a loja."}</p>
          ) : results.map((locality, index) => {
            const zone = deliveryLocalityCanQuote(locality)
              ? DELIVERY_ZONES.find((candidate) => candidate.id === locality.zoneId)
              : null;
            return (
              <button
                type="button"
                role="option"
                id={`${listId}-${locality.id}`}
                key={locality.id}
                aria-selected={selectedId === locality.id}
                className={`delivery-locality-option ${activeIndex === index ? "is-active" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(locality)}
              >
                <MapPin size={17} aria-hidden="true" />
                <span>{locality.label}</span>
                <small className={zone ? "" : "is-pending"}>{zone ? money.format(zone.price) : "A confirmar"}</small>
              </button>
            );
          })}
        </div>
      )}
      </div>
      {selected && (deliveryLocalityCanQuote(selected) ? (
        <p className="delivery-locality-confirmed" role="status">
          <Check size={15} aria-hidden="true" /> {selected.label} — taxa calculada para o bairro selecionado.
        </p>
      ) : (
        <p className="delivery-locality-warning" role="status">
          <ShieldAlert size={16} aria-hidden="true" /> Essa localidade precisa de confirmação da taxa com a loja antes de registrar o pedido.
        </p>
      ))}
      {!selected && <p className="delivery-locality-help">Digite seu bairro e selecione uma opção da lista para ver a taxa de entrega.</p>}
      {needsManualQuote && (
        <p className="delivery-locality-contact">
          <TintimContactLink message={`Olá! Estou fazendo um pedido no site da Luciane Oliveira Doces e preciso confirmar a taxa de entrega para ${contactLocation || "meu bairro"}.`}>
            Confirmar esse bairro com a loja pelo WhatsApp
          </TintimContactLink>
          <span>Seu carrinho ficará preservado para você continuar.</span>
        </p>
      )}
    </div>
  );
}
