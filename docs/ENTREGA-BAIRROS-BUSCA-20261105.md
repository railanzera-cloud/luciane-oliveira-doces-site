# Busca de bairros e entrega — implementação candidata (05/11/2026)

**Escopo:** site comercial Luciane Oliveira Doces. **Estado:** código em branch isolada; não publicado; sem migrations, sem Edge deploy e sem alteração de taxas produtivas.

**ATUALIZAÇÃO DA HOMOLOGAÇÃO — 05/11/2026:** o proprietário confirmou 33 localidades adicionais: 28 a R$ 8 e cinco a R$ 10 (Ouro Preto, Juparanã bairro, Aragão, Laércio Cabeline e Sidney Rosa). O catálogo candidato agora possui **58 localidades cotáveis, 56 ainda pendentes e 26 zonas de tarifa**, sem publicação. A classificação 25/89 mencionada abaixo é o **checkpoint anterior** e foi superada por esta atualização. Ver [matriz atual](ENTREGA-HOMOLOGACAO-LOCALIDADES-20261105.md).

## Decisão e problema

O seletor anterior tinha a opção genérica "Outro bairro dentro da cidade — R$ 8,00" seguida de campo livre. Uma pessoa podia indicar a região especial com grafia diferente, obter R$ 8 e gerar retrabalho de cobrança. A validação prévia cobria principalmente nomes idênticos.

**Fluxo aprovado em conceito pelo proprietário:** escolher Entrega/Retirada → procurar bairro ou localidade → selecionar candidato identificado → ver taxa calculada pela regra da localidade → rua/número/complemento → pedido. Não inventar taxas nem presumir localização GPS.

## Registros e fontes

O arquivo `supabase/functions/_shared/delivery-localities.mjs` contém **114 nomes candidatos**, deduplicados de:
- [Prefeitura — Plano Diretor 2023–2033](https://paragominas.pa.gov.br/plano-diretor-municipal/) (mapa SEPLAN / 20 bairros de referência);
- [cadastro CepRua](https://ceprua.com.br/index.php/pa/paragominas) (55 denominações postais, inclusive subdivisões);
- [Plano municipal / loteamentos](https://camaraparagominas.pa.gov.br/wp-content/uploads/2023/02/PROJETO-DE-LEI-No-030-2023-PLANO-MUNICIPAL-PELA-PRIMEIRA-INFANCIA-ANEXOS.pdf);
- 20 destinos especiais e suas taxas existentes em `commerce-catalog.mjs`.

**Classificação e cotação protegida (incremento de 05/11):** 20 destinos especiais mantêm a tarifa já existente no código. Das 59 associações propostas à tarifa urbana R$ 8, **somente cinco exemplos explicitamente citados pelo proprietário** (Promissão I, II, III, Tião Mineiro e Flamboyant/“Florboiante”) estão liberados como exemplos urbanos da operação; **54 associações urbanas candidatas ficam em "A confirmar"** até homologação individual. Outras **35 localidades sem vínculo tarifário** também ficam em "A confirmar". Total: **25 localidades com cotação disponível, 89 pendentes, 114 nomes pesquisáveis**. Não se trata de aprovação geral do mapa nem de garantia geográfica do endereço real. Confirmar bordas urbanas, subdivisões, novos loteamentos e grafias antes de ativação comercial. Número de entradas não equivale a número de bairros oficiais.

**Exceções incontornáveis:** Açaizal e Nagibão podem constar como bairros oficiais e, mesmo assim, têm taxas especiais no catálogo comercial. "Jaderlândia"/"Jardelandia"/"Jardim Elândia" não são automaticamente fundidos; a localização real deve ser confirmada. CEP não define tarifa única.

## Código e contrato

- `delivery-localities.mjs`: identidade estável de cada local, aliases, normalização de acentos e algarismos romanos, busca limitada e estado **cotável ou pendente de homologação**; localidades urbanas candidatas retêm o vínculo para revisão, mas não podem gerar preço nem pedido automático;
- `components/delivery-locality-picker.tsx` e `app/delivery-locality.css`: seleção pesquisável no celular; teclado; resultado cotado ou pendente; nenhuma opção genérica de frete digitável;
- `app/page.tsx`: escolha é persistida com `deliveryLocalityId` na sessão; restauração de pedido antigo quando identificável; preço/total e recepção mantidos; payload contém `locality_id` em **ambos** os canais;
- `commerce-catalog.mjs`: servidor recusa localidade inexistente, pendente ou com `zone_id` conflitante, recalcula centavos usando tarifa oficial, normaliza nome e protege variantes especiais no modo legado. `pickup` permanece sem frete;
- `tests/delivery-localities-20261105.test.mjs` e atualização do harness antigo `menu-refinement.test.mjs`: cobertura anti-bypass, fonte da tarifa, regressão de checkout/WhatsApp e estados da interface.

**Compatibilidade e rollout obrigatórios:** Clientes que carregaram o frontend antigo ainda enviam `zone_id` sem `locality_id`. Até o corte, a função mantém esse payload legado e o reforça para nomes especiais conhecidos. O flag `DELIVERY_REQUIRE_LOCALITY_ID=true` está preparado para exigir identificação **em todos os pedidos de entrega** depois que frontend e Edge atuais estiverem coordenados. Antes do flag, uma versão antiga ou payload fabricado ainda pode enviar um bairro desconhecido; **não alegar bloqueio absoluto**. Flag produtivo não alterado.

## Checklist de ativação (não concluído)

1. Homologar individualmente as **30 associações urbanas candidatas** e **26 localidades ainda sem tarifa definida**; revisar os limites das 33 confirmações recentes e as 20 taxas especiais legadas. Não transferir preços automaticamente para subdivisões próximas.
2. CI completa do SHA do candidato e prova visual em mobile, Safari/Instagram no dispositivo real, fluxo de pedido sintético nos dois canais.
3. Confirmar código Edge instalado e migrações reais, sem sobrescrever versões recentes de catálogo/promos; backend compatível primeiro.
4. Distribuir novo frontend, conferir pedido sintético sem gravar compra financeira real, monitorar falhas e recuperação de rascunhos.
5. Ativar estritamente `DELIVERY_REQUIRE_LOCALITY_ID=true` somente após comprovar que clientes antigos não ficarão com checkout quebrado; estratégia de atualização/rollout e rollback.
6. Publicar Cloudflare e Edge somente com autorização específica para produção.
7. Atualizar referência visual apenas após aprovação expressa (a presente interface é **candidata**, não homologação estética no iPhone).

## Limites

Sem geocodificação verificável, um cliente ainda pode escolher deliberadamente um **bairro diferente de seu endereço físico**. Buscar bairro e conferir identificador torna o erro mais difícil, mas não certifica uma localização declarada. Para áreas de divisa, o canal de confirmação manual permanece necessário. O link ao WhatsApp não comprova mensagem enviada.


## Incremento de busca por grafia aproximada — 05/11/2026

O método `searchDeliveryLocalities` foi refinado para **sugerir** um nome próximo quando não há correspondência direta nem por alias. Exemplos de consulta: `Promisao 2` → `Promissão II`; `Nagibaoo` → `Nagib Demachki (Nagibão)`. Para consultas curtas (menos de cinco caracteres) ou textos longos, não se tenta adivinhar. Busca exata e aliases têm prioridade sobre correção ortográfica.

**Segurança:** a sugestão aproximada não altera `locality_id`, não autoriza tarifa, não faz inferência de endereço físico e não substitui a seleção explícita do cliente. Os **56 nomes ainda sem homologação comercial** continuam não cotáveis no servidor, mesmo quando uma grafia parecida for encontrada. A interface sinaliza “Sugestões parecidas” e oferece contato assistido para quem não reconhece a localidade.

**Interação móvel candidata:** o seletor retém a lista durante o início do toque em uma opção, reduzindo o risco de perder o clique devido ao `blur` do Safari/iOS. É uma mitigação de código, **não** prova de teste físico em Safari, Instagram ou teclado real.

**Evidência de código:** SHA `ff611e15a2ef0dd9acfb22819980c125e41754c4`, [workflow de entrega 42079563944](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42079563944): 12 testes focalizados aprovados, 726 testes comerciais aprovados, build aprovado e nenhum erro novo de TypeScript. Quatro erros de tipos preexistentes fora da entrega continuam documentados.

**Arquivos:** `supabase/functions/_shared/delivery-localities.mjs`, `components/delivery-locality-picker.tsx`, `app/delivery-locality.css` e `tests/delivery-localities-20261105.test.mjs`. Sem alteração de preços, cadastros produtivos ou deploy.

## Atualização comercial confirmada — 05/11/2026

- O proprietário confirmou todos os 33 locais priorizados pelo histórico. **Tarifa R$ 10:** Ouro Preto, Juparanã (bairro), Aragão, Laércio Cabeline e Sidney Rosa. **Tarifa R$ 8:** os demais 28 nomes dessa lista. A zona **Juparanã Empresa** permanece distinta do bairro, ambas a R$ 10.
- A confirmação de Laércio Cabeline não se estende automaticamente a **Laércio Cabeline II**. Jaderlândia, Jardelandia e Jardim Elândia continuam identidades distintas, sem fusão de IDs por grafia.
- `delivery-localities.mjs` atualiza 33 associações e o estado de cotação. `app/catalog.ts` e `commerce-catalog.mjs` adicionam cinco zonas específicas a R$ 10; todas as demais taxas e os pedidos antigos ficam preservados. A auditoria verifica os 26 valores entre cliente e servidor.
- Estado de catálogo: **114 nomes; 58 autorizados; 56 pendentes (30 zonas urbanas candidatas + 26 sem zona)**. São decisões de preço para futuros pedidos; nenhuma taxa em produção foi alterada.
- Os testes incluem os 33 nomes individualmente, rejeitam pedidos alterados para cobrar os cinco especiais como R$ 8 e verificam que locais ainda não validados permanecem bloqueados. A CI tem de ser avaliada no SHA do incremento, e não nos antigos checkpoints.
