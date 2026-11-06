# Upload manual ao Cloudflare — bairros agrupados — 05/11/2026

## Artefato exato
- ZIP: \`luciane-oliveira-doces-bairros-agrupados-20261105-cloudflare.zip\`
- SHA256: \`fa0f28fd8c28eecded874edbcf6c7d333ca47d0658d235824d1dbdc87ee6990d\`
- Tamanho: **4.567.672 bytes**; **72 arquivos** dentro da raiz
- Origem: commit de código \`93674bb33e10eaa80e1e0651ba5e12860e503de2\`, CI \`42119880626\` (quatro jobs SUCCESS)
- Perfil: Supabase comercial \`edqiwvccmboyayojvuea\`; **WhatsApp-only**; sem pagamento online.
- Edge \`create-whatsapp-order\` v28 já está ACTIVE, hash \`4280c753e967c42ba07c5ce359afda9a13bba9139f3323edd8c2fdf6b950da94\`. \`create-order\` Mercado Pago v14 preservada.

## Como publicar
1. Cloudflare Dashboard → **Workers & Pages** → \`lucianeoliveiradoces\` → **Deployments**. Antes do upload, anotar o ID do deployment funcional atual para reversão.
2. Escolher **Upload assets** / **Create deployment** (opção de upload conforme o painel), selecionando o **ZIP acima**, não o ZIP externo do artefato GitHub e não um ZIP anterior.
3. Conferir a prévia do deployment; depois confirmar publicação manual. **Não** ativar pagamentos online, flags de entrega estritas, SQL ou troca de domínio.
4. No iPhone, testar as sugestões e valores: \`Promissão III\` R$8, \`Camboatã III\` R$8, \`Uraim III\` R$8, \`Sidilândia II\` R$10, \`Laércio Cabeline II\` R$10, \`Açaizal\` R$10 e \`Ouro Preto\` R$10. Buscar \`Alto do Lago\`: deve explicar que a pessoa deve selecionar o bairro e informar o condomínio no Complemento. Verificar retirada e fluxo WhatsApp sem duplicar pedidos.
5. Monitorar os primeiros pedidos reais no admin/cozinha, sem presumir pagamento só por pedido registrado.

## Em caso de problema
- **Interface/checkout:** restaurar o deployment anterior do Cloudflare primeiro. WhatsApp v28 aceita clientes antigos e novos, sem flags estritas.
- **Edge comprovadamente com erro:** após restaurar o frontend antigo, o bundle v27 está arquivado exatamente em \`docs/edge-release/rollback/20261105/create-whatsapp-order-v27\` (commit \`6012df8f...\`). A reversão da Edge exige atualização coordenada e testes; não restaurar v27 com o frontend novo ainda ativo.
- **Limite de homologação:** testes de WebKit automatizado aprovados; Safari físico e navegador interno Instagram ainda não são prova automática de sucesso.
