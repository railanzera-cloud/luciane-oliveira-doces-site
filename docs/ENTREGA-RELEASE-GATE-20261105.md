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
- 20 localidades com tarifas especiais históricas do código + 5 exemplos urbanos informados pelo proprietário; **89 localidades pendentes não recebem preço automático** (54 candidatos urbanos e 35 com região incerta).
- O servidor rejeita zonas fora do catálogo (inclusive nomes herdados do protótipo JavaScript), locais pendentes, IDs e tarifas contraditórios. Ambos os handlers de pedidos usam `quoteFulfillment` compartilhada.
- Resumo do carrinho para destino pendente mostra **"Taxa de entrega: A confirmar"**, não total imaginário.
- `scripts/audit-delivery-contract.mjs` faz preflight **sem acessar produção nem gravar dados**. Rodar `node scripts/audit-delivery-contract.mjs` e `node --test tests/delivery-localities-20261105.test.mjs` antes de qualquer publicação.
- Resultado de build/CI deve sempre estar associado ao SHA exato, não atribuído a uma documentação mais nova sem novo teste.

## 3. Critérios GO / NO-GO

**NO-GO para publicar nesta fotografia**: as 89 localidades ainda exigem conferência comercial; não houve teste de uso no Safari/iPhone real; o backend comercial publicado NÃO entende `locality_id`; as duas Edge Functions podem ter diferenças de negócio/versões próprias.

Para obter **GO**:
1. **Luciane e responsável pelas entregas** validam, na [matriz de 114 localidades](../ENTREGA-HOMOLOGACAO-LOCALIDADES-20261105.md): quais bairros são atendidos, tarifa efetiva, sinônimos, limites de divisa e data. Não inferir R$ 8 por ser bairro oficialmente urbano. Atualizar IDs/estado conforme validação e rodar a auditoria novamente.
2. **Homologar o frontend com teclado aberto** em Safari real e navegador embutido do Instagram, nas larguras 320/375/390/430 px e desktop; validar tecla Enter, escolha por toque, alteração/restauração de bairro e ajuda ao cliente. Não confundir testes unitários de `visualViewport` com teste visual realizado.
3. **Comparar e preservar as duas funções atualmente publicadas**, seus bundles/imports, chamadas de pagamento, promoções, estoque, idempotência, normalização e estado de pedidos. O candidato `create-order` usa `applyPopcornPromotionToQuote` mas a versão 14 publicada não; isso exige avaliação comercial de impacto antes de substituir.
4. Confirmar capacidade de rollback: arquivos originais, versões e procedimento para voltar; conferir parâmetros de ambiente sem exibir segredos, URLs/origens autorizadas, dependências `_shared` e versões reais instaladas. Preparar teste em ambiente isolado com produtos, cartões e Pix **sem enviar pedidos ou transações de clientes de produção**.
5. Depois de autorização específica: deploy **backend compatível primeiro**, com `DELIVERY_REQUIRE_LOCALITY_ID` ainda desativado (ou ausente); confirmar cotação e ausência de regressões nos dois canais antes de publicar o frontend. Deploy de função ativa passa a servir imediatamente.
6. Publicar frontend validado no Cloudflare **somente após** as duas funções reconhecerem `locality_id` e terem os contratos corretos. Testar sessão antiga recuperada, preço em centavos, resumo, pedido completo, Pix, cartão e WhatsApp sem atribuir status pago/enviado a cliques.
7. Monitorar pedidos antigos e novos; só quando o corte estiver estável considerar ativar `DELIVERY_REQUIRE_LOCALITY_ID=true`, mediante autorização, sabendo que abas antigas sem o ID receberão instrução para atualizar a página. Disponibilizar recuperação e suporte nesses casos.

## 4. Rollback seguro

Se o frontend apresentar problemas: **não apagar pedidos reais nem reverter automaticamente o banco**. Se o flag de obrigatoriedade foi ativado, desativá-lo primeiro; retornar o Cloudflare ao pacote anterior conhecido e validado; manter backend compatível enquanto existirem abas antigas; investigar os registros operacionais e só então avaliar revertê-lo separadamente. Ao falhar uma função, preservar original e confirmar rollback **sem substituir a função errada**.

## 5. Definição de pronto

**Pronto tecnicamente** = código e CI aprovados, auditoria completa de catálogo, comportamentos críticos testados, diferença entre funções publicadas analisada.

**Pronto para liberar** = critérios comerciais e UX homologados, backend deployado com autorização, frontend publicado com autorização e evidência de pedidos isolados e monitoramento sem regressões.

**Hoje a segunda condição NÃO está preenchida.** O término da programação não autoriza declarar que o site já opera com a nova entrega.
