"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Check, MapPin, Search, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DELIVERY_ZONES } from "@/app/catalog";
import { deliveryLocalityById, searchDeliveryLocalities } from "@/supabase/functions/_shared/delivery-localities.mjs";

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
  const results = useMemo(() => searchDeliveryLocalities(query), [query]);

  useEffect(() => {
    if (selected) setQuery(selected.label);
  }, [selectedId, selected?.label]);

  const activeResult = results[Math.min(activeIndex, Math.max(0, results.length - 1))];

  function choose(locality: Locality) {
    setQuery(locality.label);
    setExpanded(false);
    setActiveIndex(0);
    onSelect(locality);
  }

  return (
    <div className="delivery-locality-picker" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setExpanded(false);
    }}>
      <label htmlFor="neighborhood">Seu bairro ou local de entrega</label>
      <div className="delivery-locality-input">
        <Search size={18} aria-hidden="true" />
        <Input
          id="neighborhood"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && activeResult ? `${listId}-${activeResult.id}` : undefined}
          autoComplete="off"
          inputMode="search"
          placeholder="Busque seu bairro. Ex.: Promissão II"
          value={query}
          onFocus={() => setExpanded(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setExpanded(true);
            setActiveIndex(0);
            if (selectedId) onClear();
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
        {selected?.zoneId && <Check className="delivery-locality-ok" size={18} aria-label="Bairro selecionado" />}
      {expanded && (
        <div className="delivery-locality-results" id={listId} role="listbox" aria-label="Sugestões de bairros">
          {results.length === 0 ? (
            <p className="delivery-locality-empty">Não encontramos esse nome. Confira a grafia ou solicite confirmação com a loja.</p>
          ) : results.map((locality, index) => {
            const zone = DELIVERY_ZONES.find((candidate) => candidate.id === locality.zoneId);
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
      {selected && (selected.zoneId ? (
        <p className="delivery-locality-confirmed" role="status">
          <Check size={15} aria-hidden="true" /> {selected.label} — taxa calculada para o bairro selecionado.
        </p>
      ) : (
        <p className="delivery-locality-warning" role="status">
          <ShieldAlert size={16} aria-hidden="true" /> Essa localidade precisa de confirmação da taxa com a loja antes de registrar o pedido.
        </p>
      ))}
      {!selected && <p className="delivery-locality-help">Escolha uma sugestão para calcular o frete. Digitar sem selecionar não confirma o bairro.</p>}
    </div>
  );
}
