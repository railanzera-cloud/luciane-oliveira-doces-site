import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Luciane Oliveira Doces | Pipocas Gourmet",
  description:
    "Monte sua Pipoca Gourmet, escolha tamanho e sabores e finalize seu pedido pelo WhatsApp em Paragominas.",
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
