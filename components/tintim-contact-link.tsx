"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { tintimContactUrl, tintimWhatsAppUrl } from "@/lib/tintim";

type Props = Omit<ComponentProps<"a">, "href"> & { message?: string };

export function TintimContactLink({ message, onClick, ...props }: Props) {
  // Primeiro render igual no servidor e navegador; depois acrescenta a origem disponível.
  const fallback = new URL(tintimWhatsAppUrl(message ?? ""));
  if (message === undefined) fallback.searchParams.delete("text");
  const [href, setHref] = useState(fallback.href);
  useEffect(() => { setHref(tintimContactUrl(message)); }, [message]);

  return <a {...props} href={href} onClick={event => {
    onClick?.(event);
    if (!event.defaultPrevented) {
      // Inclui também cookies criados pelo Tintim depois da montagem do link.
      event.currentTarget.href = tintimContactUrl(message);
    }
  }} />;
}
