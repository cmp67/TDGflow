import type { Metadata, Viewport } from "next";
import { Raleway } from "next/font/google";
import InstallPrompt from "@/components/InstallPrompt";
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
  description: "Travel Designers Group — Recomendações e respostas na hora para agentes de viagens de luxo",
  // PWA (20/08, pedido da Carla: "as pessoas poderem instalar no celular") —
  // manifest.json + ícones em public/icons/. iOS não lê manifest pra
  // "Adicionar à Tela de Início", só os apple-* abaixo — os dois caminhos
  // são necessários, nenhum cobre os dois sistemas sozinho.
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TDG Flow",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

// Sinal explícito de <meta name="color-scheme"> no <head> — mais forte e mais
// reconhecido pelos navegadores do que só a propriedade CSS `color-scheme`
// (que já existia em globals.css e não bastou sozinha). App é 100% claro
// hoje; sem isso alguns navegadores reaplicam modo escuro numa segunda
// passada depois da primeira pintura correta (efeito "pisca e escurece").
export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#1A2B4C",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`h-full ${raleway.variable}`}>
      <body className="min-h-full flex flex-col">
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
