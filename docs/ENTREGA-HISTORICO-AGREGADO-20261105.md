# Evidências agregadas de frete — pedidos comerciais reais

**ATUALIZAÇÃO 05/11/2026:** os 33 locais priorizados por este relatório foram posteriormente **confirmados pelo proprietário**: **28 com entrega R$ 8** e **cinco com R$ 10** (Ouro Preto, Juparanã bairro, Aragão, Laércio Cabeline, Sidney Rosa). As tabelas abaixo descrevem o **histórico anterior à homologação**, não pendências atuais. A [matriz comercial atual](ENTREGA-HOMOLOGACAO-LOCALIDADES-20261105.md) contém as 58 tarifas cotáveis e 56 localidades ainda sem validação. Não houve reescrita de pedidos ou alteração produtiva.

**Leitura somente de metadados agregados de `public.orders`** · Projeto Supabase comercial `edqiwvccmboyayojvuea` · 05/11/2026.

**Finalidade:** priorizar a homologação dos bairros antes de liberar o checkout novo. Nenhum pedido foi alterado. Não foram consultados nomes de clientes, telefone, rua, número, CPF ou forma de pagamento. Os resultados só revelam nomes de localidades já presentes no catálogo público e contagens agregadas de pedidos por tarifa; denominações não reconhecidas foram omitidas do relatório.

**Recorte:** entregas com `created_at >= 2026-09-01`, `neighborhood` preenchido; grupos de nome, `delivery_zone_id`, `delivery_fee`; até 300 grupos, dos quais a consulta retornou 148. Nesse recorte, 427 pedidos de entrega aparecem nos grupos; 312 correspondem inequivocamente a localidades do nosso catálogo. Este é um retrato histórico, **não comprovante de pagamento nem prova de localização real**.

## 1. Candidatos urbanos com histórico de R$ 8 — 24 localidades

Estas localidades estão entre os **54 candidatos urbanos ainda pendentes no código**. Houve pedidos com `zone_id=cidade` e taxa **R$ 8**; isso ajuda a priorizar a consulta à Luciane, mas **NÃO homologa automaticamente a taxa**. É possível que pedidos antigos contenham endereços incorretos ou taxas digitadas erroneamente.

| ID | Localidade pesquisável | Pedidos historicamente com R$ 8 | Ação sugerida |
|---|---|---:|---|
| `tropical` | Tropical | 22 | Confirmar R$ 8 com a loja |
| `camboata` | Camboatã | 18 | Confirmar R$ 8 com a loja |
| `jardim-atlantico` | Jardim Atlântico | 16 | Confirmar R$ 8 com a loja |
| `cidade-nova` | Cidade Nova | 14 | Confirmar R$ 8 com a loja |
| `juparana` | Juparanã | 12 | Confirmar R$ 8 com a loja |
| `celio-miranda` | Célio Miranda | 11 | Confirmar R$ 8 com a loja |
| `jaderlandia` | Jaderlândia | 11 | Confirmar R$ 8 com a loja |
| `uraim` | Uraim | 10 | Confirmar R$ 8 com a loja |
| `morada-verde` | Morada Verde | 8 | Confirmar R$ 8 com a loja |
| `angelim` | Angelim | 6 | Confirmar R$ 8 com a loja |
| `morada-dos-ventos` | Morada dos Ventos | 6 | Confirmar R$ 8 com a loja |
| `nova-conquista` | Nova Conquista | 6 | Confirmar R$ 8 com a loja |
| `morada-do-sol` | Morada do Sol | 5 | Confirmar R$ 8 com a loja |
| `parica` | Paricá | 5 | Confirmar R$ 8 com a loja |
| `presidente-juscelino` | Presidente Juscelino Kubitschek (JK) | 5 | Confirmar R$ 8 com a loja |
| `promissao` | Promissão | 5 | Confirmar R$ 8 com a loja |
| `jardelandia` | Jardelandia | 4 | Confirmar R$ 8 com a loja |
| `novo-horizonte` | Novo Horizonte | 3 | Confirmar R$ 8 com a loja |
| `camboata-ii` | Camboatã II | 2 | Confirmar R$ 8 com a loja |
| `guanabara` | Guanabara | 1 | Confirmar R$ 8 com a loja |
| `nova-esperanca` | Nova Esperança | 1 | Confirmar R$ 8 com a loja |
| `olga-moreira` | Olga Moreira | 1 | Confirmar R$ 8 com a loja |
| `ouro-preto` | Ouro Preto | 1 | Confirmar R$ 8 com a loja |
| `uraim-i` | Uraim I | 1 | Confirmar R$ 8 com a loja |

## 2. Locais ainda sem classificação mas com histórico R$ 8 — 9

Esses nomes aparecem em pedidos urbanos históricos, mas o cadastro candidato ainda não tem `zoneId` homologado. Não concluir por conta própria que sejam bairros, empresas ou a mesma localidade que outro nome parecido.

| ID | Nome usado no catálogo | Pedidos historicamente com R$ 8 | Ação sugerida |
|---|---|---:|---|
| `aragao` | Aragão | 5 | Conferir identidade e cobertura |
| `jardim-bela-vista` | Jardim Bela Vista | 4 | Conferir identidade e cobertura |
| `laercio-cabeline` | Laércio Cabeline | 4 | Conferir identidade e cobertura |
| `bela-vista` | Bela Vista | 2 | Conferir identidade e cobertura |
| `sidney-rosa` | Sidney Rosa | 2 | Conferir identidade e cobertura |
| `guilherme-gabriel` | Guilherme Gabriel | 1 | Conferir identidade e cobertura |
| `industrial` | Industrial | 1 | Conferir identidade e cobertura |
| `promissao-iv` | Promissão IV | 1 | Conferir identidade e cobertura |
| `setor-industrial` | Setor Industrial | 1 | Conferir identidade e cobertura |

## 3. Divergências observadas — NÃO atribuir intenção ao cliente

- **Açaizal:** 2 registros usando região urbana/R$ 8, enquanto o catálogo atual especifica outra tarifa própria (acaizal). Precisa de revisão operacional; não é prova de fraude.

## 4. Como usar a evidência sem criar nova falha

1. Revisar primeiro os **24 candidatos urbanos frequentes**; o histórico pode economizar tempo da loja, mas **quem decide a tarifa é a Luciane** e sua cobertura de entrega atual.
2. Revisar os **9 nomes sem região definida**, evitando juntar `Jardelandia`, `Jaderlândia` e `Jardim Elândia` sem confirmação.
3. Investigar os casos de divergência nominal/tarifária junto à operação, sem considerar pagamento aprovado ou entrega efetiva a partir de um registro bruto.
4. Quando houver aprovação, atualizar o catálogo, os testes, a [matriz oficial de homologação](ENTREGA-HOMOLOGACAO-LOCALIDADES-20261105.md) e rodar `node scripts/audit-delivery-contract.mjs` novamente.
5. Todas as localidades sem validação permanecem **"A confirmar"** no código; não alterar preços de pedidos antigos nem fazer deploy por causa desta análise.

**Situação de implementação:** este relatório é exclusivamente observacional. Nenhuma taxa foi aprovada, publicada ou modificada no Supabase.
