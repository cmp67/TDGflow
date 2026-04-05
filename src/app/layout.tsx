import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TDG Flow — Assistente de Destinos",
  description: "Travel Designers Group — Assistente de IA para agentes de viagens de luxo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
