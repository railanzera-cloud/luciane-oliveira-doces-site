# Mensuração: vínculo de pedido do site ao contato Tintim — fase 4

Status em 12/10/2026:
- Branch: `feature/tintim-tracking-bridge-20261012` (sem merge na main).
- Supabase comercial: `edqiwvccmboyayojvuea`.
- Edge Function `tintim-webhook` v3 **publicada** (não depende de Cloudflare).
- Migração `tintim_order_reference_candidate_20261012` aplicada.
- Evento `message_create` **ainda não ativado no Tintim**: integração aguarda homologação com uma mensagem real.
- Testes sintéticos de banco: vínculo candidato por referência exata, deduplicação, conflito de contato; transação revertida. Nenhum pedido real marcado/vinculado.
- Tests/build da branch no GitHub Actions aprovados.

## Por que foi feito

A maioria dos pedidos do site não tem telefone persistido; comparar telefone do Tintim com o pedido é insuficiente. A mensagem oficial do handoff já contém um número exclusivo: `*PEDIDO #1047*`. O recebimento de mensagem pode permitir o cruzamento, preservando a origem documentada na conversa, **sem confundir associação com compra paga ou atribuição incremental**.

## Comportamento v3

1. Mantém o tratamento existente de `lead_create`, `lead_update` e `lead_source_update`.
2. Se habilitado, recebe `message_create`, mas aceita apenas mensagens `from_me=false` com prefixo exato da confirmação do pedido do site e telefone válido.
3. Extrai somente número do pedido, telefone e um ID de conversa **quando existe**; **não grava corpo de mensagem, mídia, endereço nem dados do cartão**.
4. Verifica pedido já existente e proximidade temporal (até 30 dias após a criação, com tolerância de 5 min por diferença de relógio).
5. Cria apenas `tintim_order_links.status=candidate` e `match_basis=order_reference`, protegendo contra mesmo pedido em conversas diferentes.
6. Nenhuma modificação de preço, estoque, status de pagamento, checkout, Pixel, CAPI, Purchase ou gatilhos do Tintim.

## Para testar (AÇÃO EXTERNA PENDENTE)

1. Em Tintim > Informações do cliente > Endereços de webhook, editar a configuração existente.
2. Colar **a mesma URL privada** dos outros três eventos no campo `Nova mensagem na conversa`. Nunca publicar o token em prints, chats públicos ou repositório.
3. Manter as demais três URLs inalteradas.
4. Em ambiente controlado, montar um pedido real de teste no site publicado, gerar um novo número e **enviar a mensagem pré-preenchida ao WhatsApp**. Não efetuar pagamento nem disparar `Purchase`.
5. No Supabase, observar somente recibo de `message_order_reference` e vínculo `candidate`. Se não houver, avaliar logs HTTP e resposta `ignored`; não presumir o formato do payload.
6. Após homologar, avaliar apresentação segura do vínculo no painel do site; nunca mostrar a mensagem privada ao admin por esse mecanismo.

## Segurança

- O webhook de nova mensagem envia para o Supabase o conteúdo de todas as mensagens do evento, incluindo as da atendente; a Function descarta rapidamente eventos que não batem com a assinatura de pedido, sem persistir o texto.
- Manter política de privacidade, base legal, minimização e retenção alinhadas à operação.
- URL privada já esteve visível em screenshot anterior: planejar rotação coordenada do token, sem interromper eventos atualmente ativos.
- Não ativar follow-up automático ou disparos de mensagem nesta fase.

## Ainda pendente

- Teste com payload real de `message_create`; normalizador pode precisar de ajuste de schema.
- Publicação em Cloudflare Preview do histórico de campanhas que está na branch (versão comercial preservada).
- Construir no painel do pedido a apresentação dos vínculos homologados (RLS/service-role, sem expor contatos).
- Distinguir conversão rastreada, influência histórica e origem no Instagram; não afirmar causalidade automática.
