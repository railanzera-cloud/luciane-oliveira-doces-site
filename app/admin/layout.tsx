import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pedidos e cardápio | Luciane Oliveira Doces",
  description: "Área restrita para pedidos da cozinha e disponibilidade do cardápio.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
