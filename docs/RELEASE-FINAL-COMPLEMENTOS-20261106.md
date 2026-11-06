# Release manual Cloudflare — Complementos contextuais + Juparanã

**Data:** 06/11/2026. **Projeto:** Luciane Oliveira Doces (comercial). **Não se aplica ao Luciane Gestão.**

## Fontes exatas

- Branch `work/checkout-complementos-contextuais-premium-20261106`, SHA do código homologado `4e020aff07b659e30fc12f29715d350f7a56f0a9`, [PR #7](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/pull/7).
- GitHub Actions [42284455657](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42284455657) — **SUCCESS 4/4 jobs**. SHA sintético de merge do PR no build `0f272ab6838d587b669269b502af49d49a06255f`.
- 765/765 testes comerciais; 15/15 testes de handlers isolados; 25/25 de localidades; 5/5 de paridade/rollback; WebKit 8/8 cenários de complementos (320, 375, 390, 430 px) mais QA de entrega. WebKit não equivale a Safari físico.
- Artifact conectado original da CI: `CANDIDATO-CLOUDFLARE-CONNECTED-NAO-PUBLICAR` ID `13537680512`. **Usar somente o ZIP INTERNO**, não o ZIP do GitHub Actions que contém o JSON de metadata.
- ZIP interno `luciane-oliveira-doces-cloudflare-pages.zip`: **72 entradas, 4.568.418 bytes, SHA256 `7c3765ab0d1a09d53318ae6ce81f49f43505beedbb1d3ddd92de750605f87d8c`**, integridade verificada; em conversa, distribuído como `luciane-oliveira-doces-FINAL-cloudflare-20261106.zip`.
- Perfil de build `SITE_ORDERING_ENABLED=false`, **checkout pelo WhatsApp**. Não ligar canal Mercado Pago/site nem inventar chave. Exige confirmar que esse é o perfil da loja que será substituída; caso contrário, interromper e reempacotar perfil correspondente.

## Supabase comercial — atualização já executada

- Projeto: `edqiwvccmboyayojvuea`.
- `create-whatsapp-order` **v29 ACTIVE**, verificada por leitura pós-deploy, hash de bundle `0637846283c9d0f103bab4ea9f0b254133692c9ab4fc8c9a468ee597332abbdd`. Todos os seis arquivos instalados são byte a byte iguais às fontes da branch.
- Diferenças aprovadas versus v28: catálogo de Juparanã bairro para 800 centavos, retirada do bairro da lista especial de 1000 centavos, ponte de compatibilidade no **handler WhatsApp** que aceita também a cotação exata histórica de R$ 10 somente no bairro Juparanã, com validação do total e taxa de cartão no servidor. Não aceita valores arbitrários nem altera Juparanã Empresa ou outras zonas.
- `create-order` v14, SQL, preços dos produtos, estoque, CRM, Meta, QZ, Gestão e demais funções **inalterados**.
- **Rollback imutável da v28:** seis arquivos idênticos ao commit `93674bb33e10eaa80e1e0651ba5e12860e503de2`; hash v28 `4280c753e967c42ba07c5ce359afda9a13bba9139f3323edd8c2fdf6b950da94`. Antes de revertê-la, voltar o Cloudflare à versão antiga ou checar compatibilidade; o backend v28 rejeitaria as novas cotações de Juparanã a R$ 8.

## Ação restante do proprietário: Cloudflare Pages

1. No projeto existente **lucianeoliveiradoces**, manter o deployment anterior disponível para rollback; verificar o domínio `lucianeoliveiradoces.pages.dev` e confirmar checkout WhatsApp-only (não substituir um deployment com pagamento direto ativo por um perfil sem esse canal).
2. Fazer **Upload assets / Deploy** do ZIP interno validado da CI. Não criar projeto novo nem publicar o arquivo de artifact externo contendo metadata.
3. Após publicar, abrir o domínio real e testar: três categorias; Gourmet/Trufadas/Fatias e seus estoques reais; confirmação temporária sem botões duplicados; retorno dos atalhos após Entrega/Retirada; navegador Instagram/iPhone; frete Juparanã bairro R$ 8, Juparanã Empresa R$ 10, demais taxas aprovadas; carrinho e fluxo WhatsApp **sem finalizar pedido de teste real nem efetuar pagamento**.
4. Observar eventuais `price_changed`, `invalid_order` ou bugs. Em problema visual, reverter primeiro o deployment Cloudflare; v29 suporta frontend antigo. Se problema comprovado no backend, avaliar rollback v28 usando commit acima **depois** de garantir frontend compatível.
5. Posteriormente, com tráfego de abas antigas encerrado, revisar/remover ponte temporária da cotação histórica de Juparanã. Não ativar `DELIVERY_REQUIRE_LOCALITY_ID` ou `DELIVERY_LEGACY_REVIEW_GUARD` neste release.

**Estado:** backend v29 já publicado; frontend ZIP está tecnicamente validado e **aguarda o upload manual** do proprietário, seguido de homologação real da experiência.
