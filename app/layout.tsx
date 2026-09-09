import type { Metadata, Viewport } from "next";
import { STORE_CONFIG } from "@/app/catalog";
import "./globals.css";

export const metadata: Metadata = {
  title: STORE_CONFIG.enabledCategories.pipocas
    ? "Luciane Oliveira Doces | Pipocas e Fatias Artesanais"
    : "Luciane Oliveira Doces | Fatias Artesanais",
  description: STORE_CONFIG.enabledCategories.pipocas
    ? STORE_CONFIG.enabledExtras.drinks
      ? "Escolha Pipocas Gourmet, Fatias Artesanais e refrigerantes e finalize seu pedido pelo WhatsApp em Paragominas."
      : "Escolha Pipocas Gourmet e Fatias Artesanais e finalize seu pedido pelo WhatsApp em Paragominas."
    : `Escolha Fatias Artesanais, calda inclusa${STORE_CONFIG.enabledExtras.drinks ? " e refrigerantes" : ""} e finalize seu pedido pelo WhatsApp em Paragominas.`,
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
