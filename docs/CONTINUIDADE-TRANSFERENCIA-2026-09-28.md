# Transferência — Luciane Oliveira Doces — 28/09/2026

## Prioridade e restrições

Transferência integral para outra conta do ChatGPT. Não iniciar novas implementações,
não fazer deploy e não alterar pagamentos, secrets ou webhook nesta etapa.
Repositório: https://github.com/railanzera-cloud/luciane-oliveira-doces-site
Branch: main. HEAD anterior a este documento: eb7a6164ec70a0ac7dfa02cff0ab19b08efdf3e8.
O SHA final e a situação remota estão no arquivo ESTADO-GIT.txt do pacote portátil.

## Última publicação preparada

Foi gerado luciane-oliveira-doces-cloudflare-pages.zip, conectado ao Supabase,
com finalização comercial pelo WhatsApp e SITE_ORDERING_ENABLED=false no build.
Não houve alteração de código para esse build: somente .env.local ignorado e
saídas geradas. Nenhum deploy Cloudflare foi executado pelo assistente. O upload
manual pelo usuário não foi confirmado nesta conversa.

SHA256 do ZIP comercial:
7a414f0f5ba44d6b06c1716d57739b3821fef7ee046d282163a40111da3a1a04

O ZIP comercial original está incluído em publicacao/ no pacote portátil.
Sua raiz contém index.html, admin/index.html, pedido/index.html, 404.html,
_worker.js, _routes.json, _headers, assets e imagens. Não publicar este ZIP portátil
inteiro no Cloudflare: usar somente o ZIP dentro de publicacao/.

## Configuração pública do último build

Os valores abaixo são públicos, autorizados pelo usuário, e já integram o frontend.
Não são Access Token, service_role nem assinatura secreta.

```dotenv
SUPABASE_URL=https://edqiwvccmboyayojvuea.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_69flK5d9m8Oe3HHVnmKWdA_omNIuIcl
SITE_ORDERING_ENABLED=false
```

Para reproduzir, criar .env.local ignorado com esses valores. MP_PUBLIC_KEY_TEST
não é necessária para o fluxo WhatsApp desativando checkout online; não foi
fornecida nesta etapa. O .env.example mantém apenas nomes, sem valores secretos.
Nunca copiar secrets do backend para frontend, Git ou esta documentação.

Build: npm run package:cloudflare:production após instalação das dependências.
Scripts de instalação/build requerem Linux/WSL, Bash, GNU timeout e Node >=22.13.0.
O restore Git pode ser feito no PowerShell; para build no Windows, usar WSL.

## Funcionalidades reais preservadas

Home e identidade visual; pipocas e fatias, preços, sabores, adicionais existentes;
carrinho e restauração de sessão; entrega/retirada; resumo e finalização pelo
WhatsApp via Tintim; Pix manual com comprovante, cartão no recebimento e dinheiro.
Refrigerantes permanecem desativados pela configuração comercial preexistente.
Disponibilidade e abertura da loja vêm do Supabase. O WhatsApp independe da
função create-order e do bloqueio checkout_disabled, mas exige consulta válida
de disponibilidade antes da navegação. O cliente precisa enviar a mensagem.

/admin preserva login, disponibilidade e operação de pedidos registrados no
backend. /pedido preserva acompanhamento por token dos pedidos criados pelo site.
Pedidos enviados pelo WhatsApp NÃO são automaticamente registrados no backend,
nem recebem acompanhamento online. Confirmação comercial/financeira é manual.

Tracking existente, Meta Pixel, Tintim e infraestrutura CAPI preservados.
Rotas /ig, /fb, /stories e /status preservam parâmetros e redirecionam com UTMs.
CRM e follow-ups NÃO foram implementados, confirmado pelo usuário; fora da entrega.
Nenhum desses módulos foi removido. QZ permanece no código, sem homologação nova.

## Pagamentos e webhook — retomar separadamente

Consulta anterior confirmou create-order público: HTTP 503 checkout_disabled.
GET mercadopago-webhook confirmou environment=test e presença das configurações
privadas, sem revelar seus valores. Código atual de criação e webhook rejeita
ambiente de produção. Pix integrado anteriormente testado não está homologado
para uso real; cartão segue com homologação pendente. Não habilitar teste para clientes.
A confirmação Pix assíncrona depende do webhook que apresentou SignatureMismatch.
O acompanhamento consulta o banco, sem reconciliação direta com Mercado Pago.
Aprovação de teste pode aparecer como pagamento aprovado na interface: manter
checkout online desativado até adequação e homologação de produção autorizadas.
Purchase/CAPI e fluxo financeiro integrado ainda exigem homologação.

Observador temporário: commit eb7a6164ec70a0ac7dfa02cff0ab19b08efdf3e8.
O usuário confirmou DEPLOY MANUAL bem-sucedido no painel Supabase em 28/09/2026;
o backup anterior foi salvo por ele. Não repetir deploy por ausência de resposta
em conversa anterior travada. Deploy remoto e histórico Git são estados distintos:
ter um commit no GitHub NÃO confirma a versão publicada na função.

Escopo: pedido #1003, teste; marcador lod_mp_signature_1003_v1;
expiração 29/09/2026 às 12h BRT (15h UTC). Código do observador preservado.
Notificação order.canceled, estado canceled/expired, aplicação 3953937740476211,
recurso ORDTST01M3FP3FQBJZWNBNX3YWPZHKJ8, envio registrado
26/09/2026 21:27:29 UTC, HTTP 401. Usuário não localizou logs/invocations após o
deploy nem botão de reenvio/próxima tentativa na interface. Isso não prova ausência
de tentativas futuras. Não houve reenvio, simulação ou novo pagamento nesta etapa.
Alternativa discutida: consultar suporte Mercado Pago sobre reentrega real;
nenhum chamado foi aberto pelo assistente, nem reentrega autorizada/executada.
Não reconstruir diagnóstico nem recriar patch sem necessidade.

## Validação do ZIP comercial já realizada

Build completo; 29 testes direcionados passaram (renderização, rotas curtas,
mensagens/tracking e jornada de montagem). Home, /admin e /pedido renderizaram
HTTP 200 sem erro de configuração. Recursos referenciados presentes; ZIP íntegro,
48 arquivos, 2.487.379 bytes; nenhuma credencial privada identificada na inspeção.
Consultas públicas Supabase retornaram HTTP 200: loja aberta e 20 registros de
disponibilidade. Estado da loja é mutável e deve ser lido novamente quando necessário.
Prévia Wrangler não iniciou por erro local uv_interface_addresses; não confundir
com defeito de deploy. Navegação completa publicada, login real e envio real de
mensagem não foram testados nesta etapa. Não repetir toda a auditoria financeira.

## Pendências prioritárias

1. Restaurar o projeto na conta própria e conferir SHA antes de modificar.
2. Confirmar se o usuário publicou o ZIP comercial; se não, upload manual no
   projeto Cloudflare Pages de upload direto lucianeoliveiradoces.pages.dev.
3. Revisar a mensagem pronta do WhatsApp, especialmente o texto final e os
   caracteres invisíveis no resumo. PENDÊNCIA registrada, sem correção executada.
4. Conferir navegação publicada, abertura de mensagem, disponibilidade e login.
5. Retomar separadamente SignatureMismatch e homologação online, com autorização.

## Limites da transferência

O pacote contém código e histórico, não transfere propriedade/acesso às contas
GitHub, Cloudflare, Supabase, Mercado Pago, Meta ou Tintim. Banco, dados de clientes,
sessões, storage remoto e secrets continuam nos serviços e não são exportados.
Não reaplicar migrations no banco existente apenas para restaurar o projeto.
A nova conta do ChatGPT precisará de acesso próprio aos serviços quando necessário.
