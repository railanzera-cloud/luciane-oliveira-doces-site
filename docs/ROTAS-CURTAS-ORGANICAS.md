# Rotas curtas orgânicas — implementação local, sem deploy

## Auditoria anterior à alteração

Em 27/09/2026, branch main, working tree limpo e HEAD/origin/main confirmados em
`c2573e7459f08ea7c9f354a89deecb8dacacce43` (fetch somente leitura).

- Aplicação React/Next via Vinext e Vite. `worker/index.ts` atende o runtime Vinext.
- O caminho existente para Cloudflare Pages é `scripts/package-cloudflare.mjs`:
  importa o build servidor para renderizar HTML e empacota assets estáticos em
  `outputs/cloudflare-pages` e ZIP. O Worker Vinext não era incluído nesse ZIP.
- HTML explícito: home, admin/index.html e pedido/index.html. `404.html` contém a
  home. Não existiam `_redirects`, regra `/* /index.html 200`, `_routes.json` ou
  diretório de Pages Functions no baseline. A presença de 404.html significa
  fallback de página não encontrada, e não rewrite universal com status 200.
- Auditoria do código/empacotamento: não foi consultada nem modificada a
  configuração externa do painel Cloudflare, DNS ou domínio.
- Meta Pixel e Tintim já carregam em `app/layout.tsx`. A atribuição existente em
  `app/order-checkout.ts` preserva todas as chaves e valores repetidos em
  `parameters`. Nenhum desses arquivos ou componentes foi modificado.

## Solução

`cloudflare/short-links.js` é copiado pelo empacotador como `_worker.js` de Pages
Functions em modo avançado. `_routes.json` é gerado com include apenas `/ig`,
`/fb`, `/stories`, `/status`; exclude vazio. Home, assets, admin, pedido e demais
rotas continuam no serviço estático. O Worker também delega caminhos não
reconhecidos a `env.ASSETS.fetch(request)` como defesa adicional.

Não usamos `_redirects`: precisamos de merge condicional por chave, preservando
valores existentes, vazios, repetidos e desconhecidos. O destino parte de
`new URL(request.url)`, altera apenas pathname para `/` e adiciona cada default
somente quando `searchParams.has(key)` é falso. Não há lista de parâmetros
permitidos, alteração de host, manipulação de cookies ou chamada externa.
Resposta 302 com Cache-Control: no-store. As quatro rotas são exatas;
subcaminhos não são capturados. No Pages, executam antes do fallback estático.

| Caminho | Destino padrão no mesmo domínio |
|---|---|
| /ig | /?utm_source=instagram&utm_medium=organic_social&utm_campaign=bio_instagram |
| /fb | /?utm_source=facebook&utm_medium=organic_social&utm_campaign=bio_facebook |
| /stories | /?utm_source=instagram&utm_medium=organic_social&utm_campaign=stories_organico |
| /status | /?utm_source=whatsapp&utm_medium=organic_social&utm_campaign=status_whatsapp |

Domínio de uso após futura publicação autorizada:
`https://lucianeoliveiradoces.pages.dev`. Estas rotas ainda não foram publicadas.
O pacote de teste foi gerado sem variáveis Supabase (modo fallback), portanto
não deve ser tratado como pacote de produção. Nenhuma variável foi alterada.

## Verificações executadas

- `npm test`: build aprovado; 170 testes, 169 aprovados, uma falha existente.
- Baseline isolado c2573e7, mesma instalação travada no lockfile, `npm test`:
  160 testes, 159 aprovados, a mesma falha em `renders the admin route without
  exposing protected controls before auth` (espera texto `Verificando acesso`).
  Não corrigida por estar fora do escopo.
- `node --test tests/short-links.test.mjs`: 10/10 aprovados; quatro defaults,
  precedência, entradas vazias/repetidas, parâmetros desconhecidos, HEAD,
  origem preservada e delegação de rotas alheias.
- `npm run lint`: zero erros; cinco warnings preexistentes de imagens.
- Runtime HTTP local Wrangler Pages, pacote isolado do config Vinext, data de
  compatibilidade local 2026-05-22 suportada pelo binário instalado:
  - /ig, /fb, /stories, /status: todos 302 -> home 200, UTMs corretas, sem loop;
  - /ig?fbclid=TESTE123: fbclid preservado;
  - /stories?utm_content=teste_story&fbclid=TESTE456: ambos preservados;
  - /ig?utm_campaign=campanha_manual&fbclid=TESTE789: campanha_manual preservada;
  - caso adicional: todas as UTMs, tintim_fbid, fbclid, chave desconhecida,
    repetição e caracteres codificados preservados;
  - nove assets JS/CSS do HTML retornaram 200 com tipo não HTML em cada caso;
  - /admin/ e /pedido/ retornaram HTML 200;
  - caminho desconhecido manteve home de fallback com HTTP 404.

As verificações cobrem HTTP, HTML, assets e os testes existentes; não representam
uma nova homologação visual de navegador ou de transações de pagamento.
Scripts externos de Pixel/Tintim não foram executados pelos testes HTTP.

Para repetir o smoke test, após build e empacotamento, copie o conteúdo de
`outputs/cloudflare-pages` para uma pasta temporária fora do projeto (evita o
redirecionamento de config gerado pelo Vinext). Execute o Wrangler instalado:

```sh
wrangler pages dev /caminho/pacote-local --cwd /caminho/pacote-local --compatibility-date 2026-05-22 --ip 127.0.0.1 --port 8791
# Em outro terminal, na raiz do repositório:
node tests/short-links-pages.mjs http://127.0.0.1:8791
```

Nenhum comando acima publica. Um futuro deploy deve usar o pacote Pages com
`_worker.js` e `_routes.json` e um método compatível com Pages Functions; não
publicar somente o HTML ou presumir que o Worker Vinext seja esse pacote.

## Escopo preservado

Sem alterações em checkout, catálogo, layout, carrinho, pedidos, tracking,
Tintim, Meta Pixel/CAPI, Supabase, Mercado Pago, webhooks ou suas credenciais.
Nenhuma simulação, Order, desafio 3DS, push ou deploy faz parte desta entrega.

Referências oficiais consultadas:
- https://developers.cloudflare.com/pages/functions/advanced-mode/
- https://developers.cloudflare.com/pages/functions/routing/
- https://developers.cloudflare.com/pages/configuration/redirects/
- https://developers.cloudflare.com/pages/configuration/serving-pages/
