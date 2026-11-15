# CRM comercial — reconciliação e candidato verificável (15/11/2026)

**Status:** código-fonte integrado e CI aprovadas; ZIP de homologação preparado offline, **NÃO PUBLICAR AINDA**. Nenhum deploy Cloudflare ou envio WhatsApp foi executado.

## Fonte GitHub e regressões
- PR #63 (draft), branch `integrate/crm-v47143-legal-comercial-20261115` sobre PR #62 (CRM), que descende do PR #61 (páginas legais), sobre base comercial V4.7.14.1.
- Integração seletiva PR #59 (Kinder Bueno/Nutella foto real) e PR #60 (seis cards de Cascões completos). `app/catalog.ts` e `app/page.tsx` foram igualados à última linha V4.7.14.3, preservando código CRM/legal.
- Incorporados os 13 testes alterados pelo PR #60, mais testes atualizados para o CRM.
- `crmCatalogAvailability`: alias comercial Folheado → SKU `cascao_folheado_geleia_morango_ninho`; seleção explícita de categorias para produtos homônimos como Prestígio; desconhecidos não liberam contato.
- `components/admin-crm-panel.tsx`: seletor de produto exato, bloqueio de produto esgotado/oculto/desconhecido, nova consulta de `menu_availability` antes de abrir o WhatsApp; paginada em grupos de 15 cards. Mantidas validações de consentimento, compra, janela, revisão assistida e registro manual.
- CI no SHA `2e08778e6175951f00130c0ad0f3e5efee3f53a2`: suíte comercial 914/914, CRM 7/7, build e TypeScript CRM — [run 43717494213](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/43717494213). Suítes comerciais adicionais e legal também SUCCESS.
- Build Core sem binários [run 43717485928](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/43717485928), SHA `2e08778e`.

## Arquivos originais recuperados (Library)
- `LUCIANE_V47143_PUBLICAR.zip`: SHA256 `1610656ab98dc81d0a9b685c234730b3e3f0ef2e9e1cbeacc707c1b032500592`; 184 arquivos; íntegro.
- `LUCIANE_DOCES_V4_7_14_1_PAGINAS_LEGAIS_META.zip`: SHA256 `12b83ea3e82b776fb7283b26b1a1a5014cd1e79a43939c93e590618d83c39d40`; 178 arquivos; íntegro.
- 145 mídias estáticas em comum **bit a bit idênticas**; pacote V4.7.14.3 acrescenta nove mídias aprovadas. Não criar imagens substitutas.

## ZIP candidato integrado (construído no ambiente de homologação)
- Nome: `LUCIANE_CRM_V47143_INTEGRADO_CANDIDATO_NAO_PUBLICAR_20261115.zip`
- SHA256: `3410673c7982e29d34f6dc5edb12bfc74e0d6ebf13a7e3a92be61f1978df74c3`
- Tamanho: 16.072.355 bytes; 187 arquivos, incluindo 157 recursos de mídia e sete rotas HTML.
- Fonte: core GitHub CI `crm-commercial-core-NOT-PUBLISH.zip` SHA256 `49d1072b42418dd5dcb2c126dd7dd5533f3b30531967530569b9a15484c3131c`; 88 arquivos de código/estáticos, complementado com 99 recursos históricos ausentes do build GitHub, copiados byte a byte de V4.7.14.3.
- Provas: CRC ZIP íntegro, as 14 referências HTML/CSS verificadas e 36 URLs de imagens detectadas em JS disponíveis, 15 módulos JS de app, três páginas LGPD, e mesmas URL Supabase/chave pública da V4.7.14.3. Não encontrado `service_role` no bundle JS.
- Essa composição preserva os recursos aprovados mas **não comprova paridade com o deployment Cloudflare efetivo**, pois não foi possível consultar ID/hash do deploy remoto. NÃO é autorização para upload.

## Backend comercial
- Supabase `edqiwvccmboyayojvuea` isolado de Luciane Gestão.
- RPC paginada staff-only previamente aplicada no projeto comercial, testada com 659 conversas distintas. `crm-whatsapp-webhook` v8 e `tintim-webhook` v18 ativos; checkout Edge v46 (versão distinta de checkpoints antigos).
- Automação de mensagens permanece DESLIGADA. 0 tentativas de envio, 0 consentimentos `granted` no CRM na última auditoria; não promover `unknown` a opt-in em massa.
- Sem alteração de pagamentos, pedidos, CAPI/Meta, estoque, Edge, QZ, configurações WABA, Supabase Gestão.

## Gates ainda abertos
1. Confirmar Cloudflare Production deployment ID e fonte ZIP real; publicação manual anterior não pode ser presumida.
2. Validar em Safari iPhone/navegador interno Instagram a home, categorias, checkout, páginas legais e CRM sob login de equipe. Chromium neste ambiente bloqueia navegadores no localhost e em origem sintética com `ERR_BLOCKED_BY_ADMINISTRATOR`; **não alegar QA visual realizado**.
3. Homologar em atendimento autorizado o fluxo de produto confirmado → lembrete 45 minutos → preflight → abrir WhatsApp → envio real manual → registro → resposta/compra/supressão. Não usar cliente real sem sua autorização operacional.
4. Verificar estoque físico e opt-in documentado. Não usar escassez sem quantidade confiável.
5. Depois de todos os gates, promover o candidato a pacote de produção e validar o deploy. Work/Cloud Browser pode ajudar na confirmação visual/Cloudflare.

**Atenção:** CI verde, arquivo ZIP íntegro e a disponibilidade do Supabase são provas diferentes de pedido entregue, mensagem enviada, pagamento e uso real no Safari.
