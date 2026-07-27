import type { Metadata, Viewport } from "next";
import { Raleway } from "next/font/google";
import "./globals.css";

// Auto-hospedada pelo Next.js (arquivos empacotados no próprio deploy, sem
// requisição em runtime pra fonts.googleapis.com). O @import externo anterior
// deixava qualquer texto nos pesos 500/600 sujeito a ficar invisível
// (FOIT) se a rede da pessoa bloqueasse ou atrasasse o CDN do Google Fonts —
// o padrão batia exatamente com os títulos que sumiam intermitentemente.
const raleway = Raleway({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700"],
  variable: "--tdgflow-font-raleway",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TDG Flow — Assistente de Destinos",
  description: "Travel Designers Group — Assistente de IA para agentes de viagens de luxo",
};

// Sinal explícito de <meta name="color-scheme"> no <head> — mais forte e mais
// reconhecido pelos navegadores do que só a propriedade CSS `color-scheme`
// (que já existia em globals.css e não bastou sozinha). App é 100% claro
// hoje; sem isso alguns navegadores reaplicam modo escuro numa segunda
// passada depois da primeira pintura correta (efeito "pisca e escurece").
export const viewport: Viewport = {
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`h-full ${raleway.variable}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
