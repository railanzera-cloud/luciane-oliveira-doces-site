# Preparação de rollback de Edge Functions — 05/11/2026

**Somente documentação de código candidato. Nenhum deploy, SQL ou flags produtivos.**

O Supabase comercial edqiwvccmboyayojvuea foi lido sem alteração. Fonte preservada em docs/edge-release/rollback/20261105/, com manifest.json registrando hashes Git por arquivo e SHA-256 de bundle informado pelo Supabase.

## Fontes e diferenças relevantes

- create-order v14: 2 arquivos originais. O entrypoint importa um catálogo local (./commerce-catalog.mjs), antigo, e não contém applyPopcornPromotionToQuote. O candidato usa catálogo compartilhado e lógica Gourmet adicional; seu deploy não é um patch exclusivamente de frete.
- create-whatsapp-order v26: 5 arquivos originais com árvore relativa de imports preservada. O entrypoint publicado é idêntico ao candidato, mas o catálogo ainda não entende locality_id.
- As duas versões publicadas não conhecem o novo contrato locality_id. Há 21 zonas de entrega antigas e cinco novas aprovadas no candidato (R$ 10).
- Os arquivos são uma cópia de código retornado pela API, não são cópia do ambiente/secrets, do banco de pedidos nem do deployment Cloudflare.

## Verificação sem produção

1. Executar node --test tests/delivery-edge-rollback-20261105.test.mjs para validar hashes, imports, preservação das 21 tarifas anteriores, as cinco novas zonas e paridade de 40 cotações sintéticas do WhatsApp com a v26 publicada, além de 30 cotações de SKUs que já existiam no checkout site/MP v14 (incluindo adaptador da promoção).
2. Executar node scripts/audit-delivery-contract.mjs e node --test tests/delivery-localities-20261105.test.mjs para conferir as 114 localidades, 58 cotáveis e 56 pendentes.
3. Executar deno check nas duas Edge Functions candidatas, compilar site e rodar regressões comerciais pela CI do SHA.
4. Reconsultar versions/hashes produtivos antes da janela de deploy. Se mudarem, suspender e recapturar; CI local não consulta Supabase automaticamente.

## Integração futura e recuperação

1. Antes de um GO: obter aceite operacional do atendimento manual das 56 pendências; testar Safari físico/iPhone e Instagram; validar em ambiente isolado RPCs, reservas, pagamentos Pix/cartão, promoções, retorno e checkout legado. Conferir segredos e origens permitidas SEM revelar valores. Registrar ID do deployment Cloudflare anterior.
2. Apenas com autorização de produção: implantar primeiro as duas Edge candidatas com DELIVERY_LEGACY_REVIEW_GUARD e DELIVERY_REQUIRE_LOCALITY_ID desativadas/ausentes. Verificar ambos os métodos de pedido, sem usar pedidos reais como testes não autorizados.
3. Só depois publicar o frontend novo com autorização própria; observar compatibilidade das abas antigas. Flags posteriores exigem decisão e autorização separadas.
4. Se o frontend falhar, desativar primeiro flags, reverter Cloudflare ao último deployment comprovadamente funcional e manter o backend compatível com abas antigas.
5. Se a função apresentar regressão própria, NÃO restaurar v14/v26 enquanto o frontend novo depender de locality_id. Primeiro devolver frontend anterior; então, sob nova autorização, reconstruir em workspace temporário a função correspondente à árvore arquivada (v14 usa index.ts e commerce-catalog.mjs irmãos; v26 usa functions/create-whatsapp-order e functions/_shared). Confirmar a integridade do snapshot, imports, configuração verify_jwt=false e env preservado; testar antes de reimplantar a função exata, sem tocar na outra função.
6. Após qualquer restauração, reconsultar versão/hash real, acompanhar pagamento, estoque, idempotência, cozinha e pedidos sem mudar dados históricos. Backups de código não substituem backup de banco.

**NO-GO atual:** nenhuma homologação real de Safari/Instagram, nem prova de ambiente isolado para Mercado Pago e RPCs, nem identificação de deployment Cloudflare anterior. Nenhuma publicação autorizada.


## 5. Exercício HTTP completo sem produção (CI comprovada)

`node --test tests/delivery-edge-isolated-flow-20261105.test.mjs` executa os handlers **reais** `create-order` e `create-whatsapp-order` transpilados de TypeScript em uma VM Node; `fetch` é substituído por fixtures locais que permitem apenas o domínio reservado `mock-supabase.invalid`, um stub para a URL do Mercado Pago e o stub de efeitos — nunca é feito acesso a esses endereços de verdade. O teste utiliza chaves fictícias e responde com objetos sintéticos. Destinos não reconhecidos são considerados violação; não há credenciais produtivas nem qualquer escrita no Supabase comercial.

A suíte percorre **12 cenários**: pedido manual em bairro aprovado a R$ 8, exceção a R$ 10, adulteração de tarifa, local pendente, preço divergente, recuperação sem segunda criação, bloqueio estrito de abas antigas e preservação da retirada, loja fechada, dinheiro sem gateway, Pix com resposta pendente, tentativa idempotente e resposta adulterada do gateway, local inventado e origem não autorizada. Cenários agrupados são contabilizados como testes individuais pela ferramenta.

Resultado do commit `45099c9b1821359f6b29741dcef4d0c16f129f5b`: [CI 42102419185](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42102419185) **SUCCESS**, 12/12 cenários isolados, 19/19 de entregas e **750/750 regressões comerciais** no job principal, com build e ZIP de inspeção no job dependente. A suíte valida comportamento do código atual, não a instalação em produção nem integração de gateway/SQL real. Os testes antigos de tarifas/rollback continuam ativos.
