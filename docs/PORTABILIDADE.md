# Portabilidade — Luciane Oliveira Doces

## Prévia comercial local no Windows

Use o checkout de trabalho selecionado para a tarefa. O script PowerShell usa
o motor Linux do Docker Desktop e uma versão fixa da imagem oficial Playwright
com Node 22. Os módulos npm ficam em volumes separados para cada checkout.
O perfil de prévia usa uma chave fictícia e um servidor local de disponibilidade.

```powershell
.\scripts\ambiente-local.ps1 install
.\scripts\ambiente-local.ps1 test
.\scripts\ambiente-local.ps1 start
```

Abra [http://127.0.0.1:8181/](http://127.0.0.1:8181/). O comando `test`
compila e executa a suíte comercial existente. Após editar o código, faça
`stop`, `build` e `start` para recarregar o Worker, e atualize a página.
Use `stop` para encerrar a prévia.

### QA, capturas e Lighthouse

Execute os comandos de QA após o build, com os mesmos dados simulados e sem
rede externa. Cada execução usa sua própria prévia dentro do contêiner.

| Comando do script | Resultado |
| --- | --- |
| `qa` | Jornadas WebKit existentes de bairros e carrinho, com capturas em `outputs/qa-commerce/` |
| `baseline` | Captura a vitrine e Fatias no Chromium mobile e no WebKit em 320, 375, 390 e 430 px |
| `compare` | Compara o build atual com as capturas de referência e salva imagens obtidas, referência e diferenças em caso de falha |
| `review-before` / `review` | Reproduzem a revisão de Fatias e checkout no build de referência e no candidato, respectivamente. Salvam capturas e o JSON do pedido simulado em `outputs/qa-commerce/incremento-revisao/` |
| `review-performance` | Repete a revisão do primeiro incremento e testa espera, falha e nova tentativa de disponibilidade. Grava resultados separados em `outputs/qa-commerce/incremento-desempenho/regressoes/` |
| `lighthouse` | Gera HTML e JSON com desempenho, acessibilidade, boas práticas e SEO da vitrine e de Fatias em `outputs/qa-commerce/lighthouse/`, sem pontuação mínima |
| `performance-before` / `performance` | Medem a referência e o candidato, com três execuções por URL no Lighthouse e três no perfil limitado do Chromium. As capturas e relatórios ficam em `outputs/qa-commerce/incremento-desempenho/` |
| `distribution-before` / `distribution-after` | Medem o checkpoint e a mudança de código com o mesmo perfil de conexão, em visitas frias e revisitas. A primeira execução compara compressão e cache sobre o mesmo build. |
| `distribution-public` | Mede vitrine e Fatias no domínio oficial. O Chromium só permite recursos públicos do site e consultas de disponibilidade em leitura. |
| `review-distribution` | Reexecuta as 24 verificações Playwright com compressão e cache e grava resultados em `outputs/qa-commerce/distribuicao/regressoes/`. |

Antes de editar, rode `baseline` sobre a referência verificada e registre o
SHA junto das capturas da tarefa. Depois, execute `build` e `compare`. Abra
`outputs/qa-commerce/visual/report/index.html` para revisar as diferenças.
Rode `baseline` novamente só quando decidir adotar o novo visual. Mantenha
o mesmo motor, tamanho, data simulada e perfil de dados nas duas medições.

Para revisar esse incremento, execute `review-before` com o build de referência
e `review` com o candidato. Os dois comandos usam a mesma entrega simulada,
registram o corpo do POST local e omitem os identificadores gerados a cada tentativa.
O relatório em `depois/report/index.html` inclui as verificações adicionais de calda,
títulos e acessibilidade do candidato.

A prévia bloqueia conexões e recursos externos com CSP, intercepta links
externos e responde localmente às consultas de disponibilidade. Pedidos,
pagamentos, autenticação e eventos externos ficam indisponíveis. Os testes
também bloqueiam tráfego externo no navegador e no contêiner. As pontuações
do Lighthouse descrevem o perfil local. Para aceite operacional, a matriz
comercial orienta a homologação no iPhone/Safari, Instagram e cozinha.
Execute o Lighthouse sem build ou outros navegadores de QA em paralelo
quando for comparar números entre alterações.

Para reproduzir o segundo incremento, compile primeiro o checkpoint aprovado
`849eef6` e execute `performance-before` com o roteiro de medição no mesmo
worktree. Em seguida, compile o candidato e execute `performance`.
O perfil limitado usa Chromium em 390 × 844, latência de 150 ms,
1,64 Mbps de download, CPU 4× mais lenta e 950 ms adicionais na consulta de
disponibilidade simulada. A prévia serve os recursos locais sem compressão
HTTP. O Lighthouse e o perfil limitado medem cenários distintos e são
comparados separadamente.

As variantes em `public/images/responsivas/` preservam proporção e enquadramento
dos arquivos aprovados. Foram redimensionadas com Lanczos e codificadas em
WebP com qualidade 87–88. Use outro sufixo de versão ao substituir algum
derivado servido com cache imutável.

Na comparação de distribuição, execute `distribution-before` sobre o build do
checkpoint `0b9537f`, `distribution-public` para a leitura do site oficial e
`distribution-after` sobre o build candidato. O relatório e as amostras ficam em
`outputs/qa-commerce/distribuicao/`. O perfil local simula documentos estáticos,
Brotli ou gzip, revalidação por ETag e cache dos assets versionados. A API simulada
continua respondendo sem cache. DNS, TLS, HTTP/2, rede de borda e serviços externos
dependem do ambiente real. As revisitas mantêm o cache do Chromium.

O comando `distribution-paired` intercala três rodadas no mesmo Chromium.
Ele usa o build da referência compilado em
`outputs/qa-commerce/distribuicao/referencia-0b9537f/dist` e o candidato em `dist`.

## Exportação histórica

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
