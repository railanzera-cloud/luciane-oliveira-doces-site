import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Controle do cardápio | Luciane Oliveira Doces",
  description: "Área restrita para controle de disponibilidade do cardápio.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
