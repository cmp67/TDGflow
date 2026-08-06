#!/usr/bin/env bash
# Deploy seguro pra produção Vercel.
#
# Por que este script existe (não é boilerplate genérico): em 2026-08,
# dois incidentes reais aconteceram porque o deploy antigo aliasava um
# domínio fixo hardcoded, extraindo a URL do deployment via grep num
# padrão também hardcoded. Quando o grep não achava nada — deploy que
# falhou por erro de rede, OU (o caso mais grave) este script copiado
# pra outro repo sem trocar o nome do projeto — a variável ficava vazia
# e "vercel alias set '' <dominio>" silenciosamente usava o deployment
# mais recente do projeto ERRADO, sequestrando o domínio de outro produto.
#
# Este script corrige os dois problemas na raiz:
#   1. O nome do projeto vem de .vercel/project.json, nunca hardcoded —
#      copiar este arquivo pra outro repo já aponta pro alias certo.
#   2. Se a URL do deployment não for encontrada, ABORTA — nunca roda
#      "vercel alias set" com argumento vazio.
set -euo pipefail

PROJECT=$(node -p "require('./.vercel/project.json').projectName")
ALIAS="${PROJECT}-carla-4643s-projects.vercel.app"
LOGFILE=$(mktemp)

echo "Deploying '$PROJECT' → $ALIAS"

vercel deploy --prod 2>&1 | tee "$LOGFILE"

DEPLOY_URL=$(grep -oE "https://${PROJECT}-[a-zA-Z0-9]+-carla-4643s-projects\.vercel\.app" "$LOGFILE" | head -1)

if [ -z "$DEPLOY_URL" ]; then
  echo ""
  echo "ERRO: não encontrei a URL do deployment no log do 'vercel deploy'." >&2
  echo "Isso normalmente significa que o deploy falhou (ver log acima)." >&2
  echo "Abortando SEM mexer no alias — nunca aliasar com URL vazia." >&2
  exit 1
fi

vercel alias set "$DEPLOY_URL" "$ALIAS"
