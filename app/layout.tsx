import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Luciane Oliveira Doces | Pipocas e Fatias Artesanais",
  description:
    "Escolha Pipocas Gourmet, Fatias Artesanais e refrigerantes e finalize seu pedido pelo WhatsApp em Paragominas.",
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
            __html: `(function(window, document, script) {
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
