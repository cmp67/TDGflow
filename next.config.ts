import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Molde do Max (agentes/tdg-flow/max/prompt.md) é lido em runtime pela rota
  // do webhook — precisa viajar no bundle da função na Vercel.
  outputFileTracingIncludes: {
    '/api/whatsapp/uazapi': ['./agentes/tdg-flow/max/**'],
  },
};

export default nextConfig;
