# Gate de ativação — Entregas e localidades
**Revisão:** 05/11/2026 · `America/Belem` · **somente diagnóstico e plano; nenhum deploy nesta etapa.**

**Origem:** branch `work/entrega-busca-bairros-segura-20261105`, [PR #6 (draft)](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/pull/6), base `docs/continuidade-comercial-20261105`. Escopo EXCLUSIVO do comércio Luciane Oliveira Doces, Supabase `edqiwvccmboyayojvuea`; nunca tocar `cztafxixnfpliaygniuj` (Luciane Gestão).

## 1. Evidência consultada diretamente no Supabase comercial

Leitura somente dos metadados e arquivos de Edge Functions, **sem alterar produção**:

| Função ativa | Versão observada | Contrato de localidade no conteúdo publicado? | Diferença importante |
|---|---:|---|---|
| `create-order` | **14** | **Não** (`locality_id` ausente) | Publicada com `commerce-catalog.mjs` anterior, 10.153 caracteres; código atual no GitHub usa `applyPopcornPromotionToQuote`, ausente no entrypoint publicado |
| `create-whatsapp-order` | **26** | **Não** (`locality_id` ausente) | Catálogo compartilhado publicado tem 12.763 caracteres; o candidato GitHub tem aproximadamente 14.711, com regra do bairro e anti-bypass |

- **Banco:** projeto `ACTIVE_HEALTHY` na verificação. Histórico de migrações expôs **49 migrações**, última `20261101165247_trufadas_pmg_nove_skus_20261101`. Não foi executado SQL. O contrato de localidade compartilha o mesmo retorno monetário/endereçamento, sem nova tabela requerida pelo código candidato; a compatibilidade com RPCs reais continua sujeita à homologação.
- Não é seguro supor que os dois entrypoints publicados possuem a mesma versão de catálogo ou que substituir ambos pela branch é um patch exclusivamente de frete.
- O Supabase considera um deploy de Edge Function uma **substituição imediata da versão atendendo no endpoint**. Conferir a documentação atual antes do corte: https://supabase.com/docs/guides/functions/deploy.

## 2. Estado da implementação candidata

- 114 nomes pesquisáveis com aliases, busca aproximada sem cotação implícita, seleção explícita e aviso de tarifa pendente.
- **58 localidades cotáveis:** 20 destinos especiais históricos, 5 exemplos urbanos já registrados e **33 novas confirmações do proprietário em 05/11/2026** (28 a R$ 8 e 5 a R$ 10). **56 localidades continuam pendentes** (30 candidatos urbanos e 26 sem vínculo tarifário). Nenhuma pendente recebe frete automático.
- O servidor rejeita zonas fora do catálogo (inclusive nomes herdados do protótipo JavaScript), locais pendentes, IDs e tarifas contraditórios. Ambos os handlers de pedidos usam `quoteFulfillment` compartilhada.
- Resumo do carrinho para destino pendente mostra **"Taxa de entrega: A confirmar"**, não total imaginário.
- `scripts/audit-delivery-contract.mjs` faz preflight **sem acessar produção nem gravar dados**. Rodar `node scripts/audit-delivery-contract.mjs` e `node --test tests/delivery-localities-20261105.test.mjs` antes de qualquer publicação.
- Resultado de build/CI deve sempre estar associado ao SHA exato, não atribuído a uma documentação mais nova sem novo teste.

**Tarifas agora aprovadas no candidato (não publicadas):** Ouro Preto, Juparanã (bairro), Aragão, Laércio Cabeline e Sidney Rosa custam R$ 10. Os outros 28 destinos do grupo de 33 foram confirmados a R$ 8. Juparanã Empresa conserva sua zona diferente, também R$ 10. A validação automática confere **26 zonas tarifárias** entre navegador e servidor. Os demais 56 nomes não podem ser liberados por suposição.

## 3. Critérios GO / NO-GO

**NO-GO para publicar nesta fotografia:** não houve teste de uso no Safari/iPhone real; o backend comercial publicado NÃO entende `locality_id`; e as duas Edge Functions podem ter diferenças relevantes de negócio/versões próprias. Os 56 nomes não homologados **não podem receber cotação automática**.

**Possibilidade de lançamento parcial controlado:** concluir os 56 nomes **não é pré-requisito absoluto** para liberar os **58 destinos com tarifa validada**, desde que a loja aceite explicitamente que os outros 56 continuarão em **A confirmar**, que a ajuda no WhatsApp e a recuperação do carrinho tenham sido testadas, e que o frontend/backend/rollback passem nos gates desta página. Isso NÃO aprova cobertura nem tarifa de qualquer destino pendente.

Para obter **GO**:
1. **Luciane e responsável pelas entregas** validam, na [matriz de 114 localidades](ENTREGA-HOMOLOGACAO-LOCALIDADES-20261105.md): quais bairros são atendidos, tarifa efetiva, sinônimos, limites de divisa e data. Não inferir R$ 8 por ser bairro oficialmente urbano. Atualizar IDs/estado conforme validação e rodar a auditoria novamente.
2. **Homologar o frontend com teclado aberto** em Safari real e navegador embutido do Instagram, nas larguras 320/375/390/430 px e desktop; validar tecla Enter, escolha por toque, alteração/restauração de bairro e ajuda ao cliente. Não confundir testes unitários de `visualViewport` com teste visual realizado.
3. **Comparar e preservar as duas funções atualmente publicadas**, seus bundles/imports, chamadas de pagamento, promoções, estoque, idempotência, normalização e estado de pedidos. O candidato `create-order` usa `applyPopcornPromotionToQuote` mas a versão 14 publicada não; isso exige avaliação comercial de impacto antes de substituir.
4. Confirmar capacidade de rollback: arquivos originais, versões e procedimento para voltar; conferir parâmetros de ambiente sem exibir segredos, URLs/origens autorizadas, dependências `_shared` e versões reais instaladas. Preparar teste em ambiente isolado com produtos, cartões e Pix **sem enviar pedidos ou transações de clientes de produção**.
5. Depois de autorização específica: deploy **backend compatível primeiro**, com `DELIVERY_LEGACY_REVIEW_GUARD` e `DELIVERY_REQUIRE_LOCALITY_ID` **desativadas ou ausentes**. Confirmar cotação e ausência de regressões nos dois canais antes de publicar o frontend. Deploy de função ativa passa a servir imediatamente.
6. Publicar frontend validado no Cloudflare **somente após** as duas funções reconhecerem `locality_id` e terem os contratos corretos. Testar sessão antiga recuperada, preço em centavos, resumo, pedido completo, Pix, cartão e WhatsApp sem atribuir status pago/enviado a cliques.
7. Em uma janela posterior, com autorização operacional, pode-se ativar `DELIVERY_LEGACY_REVIEW_GUARD=true`: **apenas abas antigas** sem ID que digitarem uma localidade **conhecida e pendente/ambígua** recebem instrução para atualizar a página/confirmar a tarifa. Abas antigas com locais reconhecidos e aprovados continuam funcionando. **Nomes desconhecidos ainda são permitidos na compatibilidade legada**; não afirmar proteção total.
8. Só após checar sessões antigas, estratégia de recuperação e estabilidade do corte, avaliar ativar `DELIVERY_REQUIRE_LOCALITY_ID=true`, mediante autorização. **Esse flag é estrito:** bloqueia todos os pedidos antigos de entrega sem ID, mesmo de bairros aprovados. Retirada permanece independente.

## 4. Rollback seguro

Se o frontend apresentar problemas: **não apagar pedidos reais nem reverter automaticamente o banco**. Se algum dos flags de rollout `DELIVERY_LEGACY_REVIEW_GUARD` ou `DELIVERY_REQUIRE_LOCALITY_ID` foi ativado, desativá-lo primeiro; retornar o Cloudflare ao pacote anterior conhecido e validado; manter backend compatível enquanto existirem abas antigas; investigar os registros operacionais e só então avaliar revertê-lo separadamente. Ao falhar uma função, preservar original e confirmar rollback **sem substituir a função errada**.

## 5. Definição de pronto

**Pronto tecnicamente** = código e CI aprovados, auditoria completa de catálogo, comportamentos críticos testados, diferença entre funções publicadas analisada.

**Pronto para liberar** = critérios comerciais e UX homologados, backend deployado com autorização, frontend publicado com autorização e evidência de pedidos isolados e monitoramento sem regressões.

**Hoje a segunda condição NÃO está preenchida.** O término da programação não autoriza declarar que o site já opera com a nova entrega.


## 6. Fontes de restauração guardadas no GitHub

As duas Edge instaladas foram lidas em modo read-only e arquivadas com hashes em `docs/edge-release/rollback/20261105/`. O teste `tests/delivery-edge-rollback-20261105.test.mjs` verifica os sete arquivos, a integridade dos imports, as 21 tarifas legadas e a cotação comercial do WhatsApp v26 em matriz sintética. Consultar [`docs/EDGE-ROLLBACK-BUNDLE-20261105.md`](EDGE-ROLLBACK-BUNDLE-20261105.md) para sequência do corte e rollback sem destruir dados. Reconfirmar hashes live imediatamente antes de qualquer deploy; backups de código não preservam configurações secretas nem comprovam release. Permanece NO-GO.


## 7. QA móvel automatizado WebKit: etapa técnica concluída, Safari real pendente

Na branch `work/entrega-busca-bairros-segura-20261105`, o código SHA `1a6a12877e9b214e57b24f0462849537f6f5220a` passou em [GitHub Actions 42105774369](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42105774369), inclusive no job WebKit em 320, 375, 390 e 430 px. O script `scripts/qa-delivery-webkit.mjs` testa seleção por toque/teclado, 8/10 reais da tabela candidata, pendência sem cotação, assistência e overflow; captura em [artefato de screenshots QA](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42105774369/artifacts/13451467528). Ambiente sem chaves produtivas e bloqueio da rede externa. Essa é prova de **WebKit automatizado**, não aprovação de teclado físico iPhone ou webview do Instagram. Manter ambos no gate manual e não antecipar a publicação/flag estrita.


## 8. Preparação da entrega manual: canal WhatsApp-only (05/11/2026)

- O proprietário concedeu autorização para concluir o pacote e subir pessoalmente o ZIP no Cloudflare. `create-whatsapp-order` **v27 ACTIVE** (hash `3a9f2b6d683e6f675bbbd81dc1bf38edaf7cce94229a4de2a9b35b3b5469c3e3`) foi implantada; `create-order` v14 ficou intocada, sem migrações, sem flags e sem merge.
- Build conectado de commit `7b3b7d2621b159c14b4b055d6e18e41ead8b8532`, [CI 42107709877](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42107709877), gerou ZIP SHA256 `c634e77541de945602f1451469772ea21db3751f17e642b64a4c3fd2a58b3669`, 72 entradas e 4.567.418 bytes. Chave pública Supabase atual coincide com fluxo anterior. Perfil `SITE_ORDERING_ENABLED=false` replica o ZIP de 03/11 encontrado na biblioteca, **não** prova configuração do deployment atual Cloudflare.
- O gate GO vale somente para **upload controlado no perfil WhatsApp-only correspondente**. Se o site ativo tiver Concluir no site/Pix online habilitados, NÃO subir o ZIP pois isso desativaria esse canal: voltar ao empacotamento com configuração correspondente. Registrar ID/deployment de rollback Cloudflare antes do upload, testar 58 localidades cotáveis, 56 pendentes, WhatsApp sem envio duplo e funcionamento de CRM/cozinha na operação. Safari físico/Instagram seguem como homologação a fazer.


## 9. Gate WhatsApp v28 para bairros agrupados

O backend WhatsApp v28 (hash `4280c753e967c42ba07c5ce359afda9a13bba9139f3323edd8c2fdf6b950da94`) está ativo e conferido byte a byte com commit `93674bb33e10eaa80e1e0651ba5e12860e503de2`. Código CI [42119880626](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42119880626) aprovado (24 testes de entrega, 755 regressões, 12 handlers isolados, WebKit 4 viewports). Arquivo Cloudflare manual `luciane-oliveira-doces-bairros-agrupados-20261105-cloudflare.zip`, SHA256 `fa0f28fd8c28eecded874edbcf6c7d333ca47d0658d235824d1dbdc87ee6990d` (72 arquivos), está pronto para upload **pelo proprietário**, não foi publicado pelo agente. O backend v27 foi arquivado para rollback. Apenas localhost/CI testou UI; Safari físico/Instagram continuam pendentes. Não mexer em pagamentos online, Cloudflare diretamente, flags, SQL, estoque ou pedidos. Ver `docs/ENTREGA-MANUAL-BAIRROS-AGRUPADOS-20261105.md`.


## 10. Gate coordenado Juparanã bairro R$ 8 — 06/11/2026

- Code SHA `64701d7d5cb38c49b17247f72e02029352785f53`, GitHub Actions [42271894266](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42271894266) SUCCESS; novo ZIP Cloudflare 72 entradas, SHA256 `1a648860af2ac29c0e0910aa82e7de1192359e981341f7e5f48317f6e676dfd8`.
- **STATUS: HOLD** até combinar publicação. A função live WhatsApp permanece **v28 com Juparanã bairro R$ 10**, embora o ZIP novo use R$ 8. Publicação isolada do ZIP ou deploy antecipado da função podem recusar pedidos por total divergente.
- O dono do site faz upload do Cloudflare manualmente, após combinar o instante do corte. Antes: snapshot exato v28, checar hash da função e compatibilidade de seis arquivos, publicar a versão backend compatível e orientar upload do ZIP. Após: simular Juparanã bairro R$ 8, Empresa R$ 10, conferir checkout e pedidos reais sem pagamento automático. Não ativar flags estritas; nada de SQL, estoque, Gestao ou `create-order` v14.
