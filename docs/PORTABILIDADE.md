# Portabilidade — Luciane Oliveira Doces

Exportação preparada em 26/09/2026 a partir de
`15fc182e10b67d23d00984c51c812987ad8b963a`, com 50 commits anteriores,
sem alteração de lógica, banco, pagamentos ou serviços publicados.
Destino solicitado: https://github.com/railanzera-cloud/luciane-oliveira-doces-site.git,
branch `main`. O destino foi consultado e estava vazio antes da exportação.
Este documento não comprova push: conferir o SHA da branch remota após o envio.

## Conteúdo preservado

- Frontend em `app/`, `components/`, `hooks/`, `lib/` e `public/`.
- Backend em `supabase/functions/`, incluindo código compartilhado.
- Migrations, rollbacks, seed e configurações existentes do Supabase.
- Scripts, testes, ferramentas de homologação, documentação e evidências.
- `package.json`, `package-lock.json`, configurações Vite/Vinext, TypeScript,
  estilos, Worker e integração de build existentes.
- Histórico Git completo da branch `main`; não houve squash ou reescrita.

## Instalação e build em outra máquina

O ambiente suportado pelos scripts existentes é Linux (ou WSL), Node.js
>=22.13.0, npm, Bash, `flock`, `curl` e GNU `timeout`.

1. Clone o repositório e entre na pasta.
2. Use `.env.example` como inventário de nomes, sem preenchê-lo no Git.
   Crie `.env.local` ignorado com somente as variáveis públicas de frontend:
   `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SITE_ORDERING_ENABLED` e
   `MP_PUBLIC_KEY_TEST`. Não habilite pedidos para clientes durante esta exportação.
3. Execute `npm run install:ci` para instalar as versões do lockfile.
4. Execute `npm run build` para compilar ou `npm run dev` para desenvolvimento.

Nenhuma instalação, build, migration ou publicação é necessária apenas para
clonar ou enviar o histórico Git. Esta exportação não reexecuta homologações.
O build depende dos pacotes externos definidos no lockfile. A função de webhook
também mantém seu import Deno `npm:mercadopago@3.6.1` existente.

## Configuração externa ao Git

- **Supabase:** projeto, banco com dados reais, usuários/sessões Auth, permissões,
  configuração Auth/URLs, Realtime, deployments e secrets são estado externo.
  Os arquivos SQL preservam o que já estava versionado, mas não são um dump
  completo do banco ou garantia de capturar configurações feitas pelo painel.
  Um ambiente novo precisa desse provisionamento separado; não reaplicar SQL
  no projeto atual como parte desta exportação.
- **Secrets de backend:** configurar somente no ambiente das Functions.
  `SUPABASE_SECRET_KEYS` e `SUPABASE_PUBLISHABLE_KEYS` são lidos como JSON com
  chave `default`; `SUPABASE_SERVICE_ROLE_KEY` é o fallback legado existente.
  `SUPABASE_URL` também é usado no backend. Manter a lista de origens restrita
  e a lista de administradores autorizados fora de valores públicos de build.
- **Mercado Pago:** aplicação, credenciais, chave de assinatura, URL/eventos do
  webhook, usuários de teste e histórico de Orders pertencem ao serviço.
  Não foram exportados secrets nem modificadas essas configurações.
- **Meta/Tintim:** contas, Pixel, credenciais e configuração externa de eventos
  permanecem nos serviços. Purchase/CAPI ainda depende de homologação.
- **Hospedagem/Cloudflare:** conta, DNS, domínio, permissões e configuração de
  deploy não são transferidos por Git. Cloudflare continua sem publicação.
  A configuração de build versionada foi preservada integralmente.
- **QZ:** somente código/configuração de exemplo existente foi preservado;
  certificados privados, instalação local e configuração de impressoras não
  fazem parte desta exportação e permanecem fora da fase atual.

## Exclusões deliberadas

Não incluir `.env.local`, secrets/credenciais, `node_modules/`, `dist/`,
`.sites-runtime/`, `.wrangler/`, `outputs/`, caches ou `tsconfig.tsbuildinfo`.
São valores locais ou saídas regeneráveis ignoradas pelo Git. Nenhum arquivo
versionado de código-fonte foi removido. Não há exportação de dados de clientes,
pedidos, usuários Auth, logs ou storage remoto nesta operação.

O diagnóstico de SignatureMismatch continua no estado do checkpoint anterior:
instrumentação com expiração encerrada, sem nova captura ou correção nesta
exportação. Portabilidade do código não significa liberação para produção.
