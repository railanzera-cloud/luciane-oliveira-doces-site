import type { Metadata, Viewport } from "next";
import { STORE_CONFIG } from "@/app/catalog";
import "./globals.css";
import "./storefront-boutique.css";
import "./storefront-boutique-v3.css";
import "./storefront-vitrine-editorial-experiment.css";
import "./storefront-checkout-premium.css";
import "./delivery-locality.css";
import "./storefront-collection.css";
import "./storefront-collection-premium.css";
import "./gourmet-feriado-20261102.css";
import "./gourmet-steps.css";
import "./cones-trufados-20261108.css";
import "./mobile-refinamentos-funil-20261108.css";
import "./refinamento-cones-visual-20261108.css";
import "./category-navigation-refinement-20261108.css";
import "./category-navigation-packaged-20261108.css";
import "./colecao-natal-2026.css";

export const metadata: Metadata = {
  title: "Luciane Oliveira Doces | Fatias de Chocottone, Cones, Pipocas e Doces",
  description: "Conheça as Fatias de Chocottone recheadas da Edição de Natal, além de Cones Trufados, Pipocas e Fatias Artesanais da Luciane Oliveira Doces em Paragominas. Monte seu pedido e finalize pelo WhatsApp.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0705",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(window, document) {
  if (window.location.pathname === '/admin' || window.location.pathname.indexOf('/admin/') === 0) return;
  if (window.__lucianeMetaPixelInitialized) return;
  window.__lucianeMetaPixelInitialized = true;

  !function(f,b,e,v,n,t,s) {
    if (f.fbq) return;
    n = f.fbq = function() {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = true;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  window.fbq('init', '1491655855979140');
  window.fbq('track', 'PageView');
})(window, document);`,
          }}
        />
        <noscript>
          <img
            alt=""
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1491655855979140&ev=PageView&noscript=1"
          />
        </noscript>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(window, document, script) {
  if (window.location.pathname === '/admin' || window.location.pathname.indexOf('/admin/') === 0) return;
  if (!window.tt) {
    window.tt = window.tt || {};

    var head = document.getElementsByTagName('head')[0];
    var tracker = document.createElement('script');
    tracker.async = true;
    tracker.src = script;
    head.appendChild(tracker);
  }

  window.tt.accountCode = '2c956a42-229f-4d21-ade6-4442f8c048ed';
})(window, document, 'https://s.tintim.app/static/core/tintim-1.0.js');`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
