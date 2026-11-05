# Busca de bairros e entrega — implementação candidata (05/11/2026)

**Escopo:** site comercial Luciane Oliveira Doces. **Estado:** código em branch isolada; não publicado; sem migrations, sem Edge deploy e sem alteração de taxas produtivas.

## Decisão e problema

O seletor anterior tinha a opção genérica "Outro bairro dentro da cidade — R$ 8,00" seguida de campo livre. Uma pessoa podia indicar a região especial com grafia diferente, obter R$ 8 e gerar retrabalho de cobrança. A validação prévia cobria principalmente nomes idênticos.

**Fluxo aprovado em conceito pelo proprietário:** escolher Entrega/Retirada → procurar bairro ou localidade → selecionar candidato identificado → ver taxa calculada pela regra da localidade → rua/número/complemento → pedido. Não inventar taxas nem presumir localização GPS.

## Registros e fontes

O arquivo `supabase/functions/_shared/delivery-localities.mjs` contém **114 nomes candidatos**, deduplicados de:
- [Prefeitura — Plano Diretor 2023–2033](https://paragominas.pa.gov.br/plano-diretor-municipal/) (mapa SEPLAN / 20 bairros de referência);
- [cadastro CepRua](https://ceprua.com.br/index.php/pa/paragominas) (55 denominações postais, inclusive subdivisões);
- [Plano municipal / loteamentos](https://camaraparagominas.pa.gov.br/wp-content/uploads/2023/02/PROJETO-DE-LEI-No-030-2023-PLANO-MUNICIPAL-PELA-PRIMEIRA-INFANCIA-ANEXOS.pdf);
- 20 destinos especiais e suas taxas existentes em `commerce-catalog.mjs`.

**Classificação da candidata:** 20 destinos especiais conservam a tarifa legada; 59 associações à tarifa urbana R$ 8 foram propostas com base na regra geral informada pelo proprietário e nas referências urbanas; 35 localidades sem vínculo suficientemente claro permanecem com **"A confirmar"** (nunca R$ 8 por fallback). Essas 59 associações **não são homologação individual da loja**. Confirmar as bordas urbanas, subdivisões, novos loteamentos e grafias antes de ativação comercial. Número de entradas não equivale a número de bairros oficiais.

**Exceções incontornáveis:** Açaizal e Nagibão podem constar como bairros oficiais e, mesmo assim, têm taxas especiais no catálogo comercial. "Jaderlândia"/"Jardelandia"/"Jardim Elândia" não são automaticamente fundidos; a localização real deve ser confirmada. CEP não define tarifa única.

## Código e contrato

- `delivery-localities.mjs`: identidade estável de cada local, aliases, normalização de acentos e algarismos romanos, busca limitada e status sem tarifa;
- `components/delivery-locality-picker.tsx` e `app/delivery-locality.css`: seleção pesquisável no celular; teclado; resultado cotado ou pendente; nenhuma opção genérica de frete digitável;
- `app/page.tsx`: escolha é persistida com `deliveryLocalityId` na sessão; restauração de pedido antigo quando identificável; preço/total e recepção mantidos; payload contém `locality_id` em **ambos** os canais;
- `commerce-catalog.mjs`: servidor recusa localidade inexistente, pendente ou com `zone_id` conflitante, recalcula centavos usando tarifa oficial, normaliza nome e protege variantes especiais no modo legado. `pickup` permanece sem frete;
- `tests/delivery-localities-20261105.test.mjs` e atualização do harness antigo `menu-refinement.test.mjs`: cobertura anti-bypass, fonte da tarifa, regressão de checkout/WhatsApp e estados da interface.

**Compatibilidade e rollout obrigatórios:** Clientes que carregaram o frontend antigo ainda enviam `zone_id` sem `locality_id`. Até o corte, a função mantém esse payload legado e o reforça para nomes especiais conhecidos. O flag `DELIVERY_REQUIRE_LOCALITY_ID=true` está preparado para exigir identificação **em todos os pedidos de entrega** depois que frontend e Edge atuais estiverem coordenados. Antes do flag, uma versão antiga ou payload fabricado ainda pode enviar um bairro desconhecido; **não alegar bloqueio absoluto**. Flag produtivo não alterado.

## Checklist de ativação (não concluído)

1. Validar com a proprietária **59 associações urbanas e 35 nomes pendentes**, além de 20 taxas legadas e aliases. Recusar falso positivo de tarifa.
2. CI completa do SHA do candidato e prova visual em mobile, Safari/Instagram no dispositivo real, fluxo de pedido sintético nos dois canais.
3. Confirmar código Edge instalado e migrações reais, sem sobrescrever versões recentes de catálogo/promos; backend compatível primeiro.
4. Distribuir novo frontend, conferir pedido sintético sem gravar compra financeira real, monitorar falhas e recuperação de rascunhos.
5. Ativar estritamente `DELIVERY_REQUIRE_LOCALITY_ID=true` somente após comprovar que clientes antigos não ficarão com checkout quebrado; estratégia de atualização/rollout e rollback.
6. Publicar Cloudflare e Edge somente com autorização específica para produção.
7. Atualizar referência visual apenas após aprovação expressa (a presente interface é **candidata**, não homologação estética no iPhone).

## Limites

Sem geocodificação verificável, um cliente ainda pode escolher deliberadamente um **bairro diferente de seu endereço físico**. Buscar bairro e conferir identificador torna o erro mais difícil, mas não certifica uma localização declarada. Para áreas de divisa, o canal de confirmação manual permanece necessário. O link ao WhatsApp não comprova mensagem enviada.
