# Plano de corte comercial coordenado — V4.4 e próximos incrementos

**Preparado em 12/11/2026; NÃO EXECUTADO.**

> **ATUALIZAÇÃO OPERACIONAL — V4.6 (12/11/2026):** este documento foi escrito na fase de diagnóstico da V4.4 e contém **v36/1699/1899 como histórico**, não instrução para restaurar esse estado. A Edge atual está **v37 ACTIVE** e reconhece novos Cascões R$20 e Natal R$22; permanece com preços antigos R$14/R$14/R$16 dos três Cascões legados. O pacote de publicação candidato agora é **V4.6**, 117 arquivos, frontend com R$18/R$18/R$20. **Não publicá-lo sozinho.** O ID de implantação Cloudflare e o ZIP efetivamente ativo são desconhecidos. Preservar rollback da Edge v37, não apenas da v36; conferir catálogo comercial atual antes de qualquer deploy. CI no HEAD PR #37 precisa estar verde (teste de navegação atualizado para “Cascão Trufado”). A ativação comercial e a publicação exigem coordenação específica com o responsável e teste de pedido real/WhatsApp, inclusive Safari/Instagram. Enquanto isso, o plano permanece **NÃO EXECUTADO**.
 Destinado à loja Luciane Oliveira Doces (Supabase `edqiwvccmboyayojvuea`, Cloudflare Pages `lucianeoliveiradoces.pages.dev`). Documento operacional, não autorização para publicar, mudar disponibilidade ou criar pedido de teste. Não se aplica à Luciane Gestão.

## Por que há bloqueio

| Camada | Situação observada | Risco |
| --- | --- | --- |
| GitHub | V4.4 código aprovado no SHA `8df271026c11100afa726c9e4e276ee94d526f45` | Código pode não estar publicado. |
| Pacote | V4.4 ZIP de 117 arquivos, hash `475c8854d8279e372cffec7d61a9a48b72f1ef7f1d76a35ebb4965f55381dd1f` | Fotos aprovadas existem no ZIP, não nos blobs GitHub. |
| Cloudflare | Deployment ID, commit e hash publicado **desconhecidos** | Sem como afirmar qual frontend o cliente acessa. |
| Supabase Edge | `create-whatsapp-order` v36, Natal 1699/1899, sem 3 novos Cascões | V4.4 espera Natal 2200 e novos Cascões a 2000; rejeição/recotação divergente pode prejudicar vendas. |
| Supabase DB | Categoria Cascão, categoria Natal e novos SKUs Cascão disponíveis | Clientes podem selecionar produtos incompatíveis com Edge ativa, dependendo do frontend publicado. |

## Fase A — preparação, sem interromper as vendas

1. Obter **deployment de produção Cloudflare atual** (ID, data, origem: ZIP), recuperar ZIP se possível, conferir conteúdo/HTML/assets e preservar backup para reversão. Se não for possível comprovar SHAs, declarar explicitamente "desconhecido"; não inventar equivalência com V4.4.
2. Salvar/validar snapshot completo de **Edge ativa v36** e da configuração necessária (secrets, permissões, JWT, funções auxiliares), sem expor credenciais. Guardar artefato autorizado de rollback.
3. Registrar disponibilidade, `orders_open` e preços/bairros vigentes com leituras sem escrita. Confirmar se há pedidos em andamento, Pix pendente, carrinhos antigos (não presumir sessões vazias).
4. Validar que a Edge candidata da branch de código comercial preserve a implementação atual **incluindo drinks preexistentes e contratos antigos**, mudando somente os três SKUs Cascão e os preços de Natal. Não restaurar bebidas na vitrine.
5. Conferir hash e integridade do **ZIP V4.4 completo**, não do ZIP BASE gerado pela CI. Confirmar 11 fotografias novas e 17 anteriores preservadas; `index.html`, `admin/index.html`, `pedido/index.html`, worker, rotas e ausência de segredos.
6. Especificar testes controlados para cada preço/sabor em três meios de pagamento, recebimento WhatsApp real e status. **Não gerar pedidos em produção sem combinar com a proprietária**, pois pedidos podem ser impressos.

## Fase B — janela de corte, requer nova autorização operacional específica

A sequência exata deve ser adaptada ao deployment real, aos pedidos abertos e às regras de disponibilidade. Não alterar dados sem plano de reversão confirmado.

1. Combinar um período curto de baixa demanda com Luciane e registrar responsáveis. Evitar ativar os preços novos enquanto ainda houver checkout antigo visível.
2. Proteger venda das categorias afetadas: **avaliar a ocultação temporária de `category_cones` e `category_natal`**; validar que o backend revalida essas categorias, e preservar pedidos de outras categorias se possível. Não fechar a loja inteira automaticamente.
3. Aplicar apenas migrações ainda necessárias, com verificação de existência/idempotência e comparação dos SKUs; **não executar em duplicidade** migrações alternativas PR #33/#34. Evitar alterar estoque ou flags de produtos sem instrução.
4. Implantar Edge compatível (a partir do código aprovado e comparado com v36), confirmar a versão implantada, caber os SKUs esperados, 2200 centavos para as quatro Fatias de Chocottone e 2000 para os Cascões novos. Sem mudar pagamento online/mercado pago, QZ e outros contratos.
5. Publicar manualmente o ZIP V4.4 correspondente, capturar deployment ID, data, hash do arquivo enviado e URL exata. Se a plataforma não expuser o SHA, registrar a correspondência pelo arquivo/asset e relatório de publicação, sem declarar prova mais forte do que a obtida.
6. Inspecionar site na versão liberada e fazer teste controlado ponta a ponta com ciência da proprietária: item Cascão, Natal, carrinho misto, entrega e retirada, total cotado e mensagem WhatsApp **enviada** (não apenas aberta), registro e comanda de cozinha. Conferir se atendimento/estoque receberam a comunicação.
7. Reabrir categorias e disponibilidades aprovadas, conforme estoque físico real. Registrar hora, responsáveis, preços e verificação. Confirmar um pedido real supervisionado antes de escalar campanhas.

## Fase C — rollback e verificação posterior

- Se a Edge rejeitar SKUs ou ocorrer `price_changed` inesperado: **interromper/restringir a categoria afetada**; não deixar frontend cobrando valor diferente do servidor.
- Voltar para pacote Cloudflare anterior **em conjunto** com Edge/catálogo correspondente. Não restaurar apenas o frontend se preços já mudaram. Respeitar pedidos aceitos e dados históricos; não apagar registros.
- Se necessário, manter categorias afetadas indisponíveis durante a recuperação, preservando operação dos produtos seguros.
- Reabrir somente após testar cotação, disponibilidade e WhatsApp.
- Atualizar `ESTADO-DE-RELEASE.json` com provas exatas: deployment ID, hash, SHA, Edge, testes reais, data, resultado e riscos remanescentes. Se não verificado, deixar `unknown` e `blocked`.

## Checklist de evidências para concluir um release

- [ ] ID do deployment público e instante de publicação verificados
- [ ] ZIP publicado identificado; SHA-256 reproduzível e fotos aprovadas
- [ ] Branch/commit de código vinculados à compilação do ZIP
- [ ] Edge ativa aceita os três novos Cascões e mantém todas as demais regras
- [ ] Natal cotado em R$ 22,00 por fatia no navegador e servidor
- [ ] Cascões novos cotados em R$ 20,00 no navegador e servidor
- [ ] Disponibilidade e taxas preservadas, sem ativação não autorizada
- [ ] Pedidos controlados sem erro de checkout/preço, WhatsApp de fato enviado, operação confirmou recebimento
- [ ] Safari físico e navegador interno Instagram validados
- [ ] Plano de rollback e backup testados
- [ ] Snapshot e checkpoint final atualizados e autorização operacional registrada

**Proibido:** alegar que esse checklist está cumprido por existirem testes automatizados, abrir o WhatsApp ou simplesmente ver uma fotografia na vitrine.

## Próxima feature: refrigerantes

Planejar em nova branch desde a referência reconciliada, discutindo a exposição contextual curta, prioridade dos outros doces, quantidade simples, disponibilidade por SKU, backend cotador, checkout, QZ, CRM e impacto sobre rolagem. PRs #23/#24 são referências, **não** autorização para restaurar componente antigo. A implantação deve seguir este mesmo gate de release.
