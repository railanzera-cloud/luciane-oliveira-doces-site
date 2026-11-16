# Recuperação WhatsApp — núcleo silencioso, incremento 1

Base de código: PR #65, `8bf903388379b9c2783aca2d11bec6bead096ec9`.
Branch: `feat/crm-recovery-shadow-20261115`. Produção não alterada.

## Entrega executável

- `recovery-interest.mjs`: catálogo derivado dos módulos de cotação existentes, incluindo fatias, Cascões, Natal, Gourmet, pacotes P/M/G e bebidas. Mantém IDs, componentes e tamanho; exclui Cascão aposentado. Aliases limitados a SKUs conhecidos. Ambiguidade, múltiplos produtos, alternativas e personalizações não viram SKU confirmado.
- `recovery-meta-observation.mjs`: adapter local para webhook bruto assinado HMAC-SHA256, vinculado à WABA e Phone Number ID esperados. Separa inbound de echo. Texto de cliente é transitório; conteúdo encaminhado/citado e mídia não são classificados. Não conecta, inscreve ou altera o aplicativo Meta.
- `recovery-shadow.mjs`: avalia um episódio normalizado, com histórico e consulta de pedidos explicitamente completos. Deduplica eventos; divergências de um mesmo ID e identidades misturadas bloqueiam. Respostas novas voltam a atendimento pendente. Compra candidata/pedido pendente pedem conciliação; compra paga com identidade comprovada, cancelamento, recusa e opt-out suprimem recuperação.
- `recovery-shadow-replay.mjs`: lê um snapshot JSON por stdin e emite decisão sem telefone, chave da conversa ou texto privado. Sem rede, banco ou envio. Limites de 1 MiB e mil eventos por replay.

Todos os resultados contêm `mode=shadow` e `send_authorized=false`. `shadow_candidate` significa apenas que o snapshot passou nos critérios de observação; nunca é autorização para envio. O núcleo não concede consentimento e não substitui as RPCs de segurança atuais.

## Executar

```bash
node --test tests/crm-recovery-shadow-20261115.test.mjs
node scripts/recovery-shadow-replay.mjs < snapshot-autorizado.json
```

Não versionar snapshots reais, texto de cliente ou segredos. Os testes têm fixtures sintéticas. O replayer não gera arquivo automaticamente.

## Contrato da avaliação

Campos do snapshot:
- `now`: ISO explícito; `follow_up_minutes`: inteiro 15–2880, padrão 45.
- `events`: `id`, `conversation_key`, `direction` (`inbound`/`business_outbound`), `occurred_at`, opcional `received_at`, `time_basis=provider_timestamp`, `verified=true`. A origem confiável deve validar esses campos antes de montar o snapshot. Eles não são declarações aceitas de navegador público.
- `content_origin=customer_text` e `text` somente transitoriamente para identificar intenção. O adapter assinado produz esse formato; o resultado da avaliação não devolve o corpo.
- `orders`: associação ao MESMO episódio em `conversation_key`, `identity_basis=verified` ou `candidate`, `payment_status`, `status`. O montador futuro deve limitar a consulta ao episódio pertinente e validar a identidade; não vincular por nome aproximado.
- `consent_verified`: somente evidência válida verificada na origem; nunca derivado de compra, visita, clique ou interesse.
- `history_complete`/`order_check_complete`: só verdadeiros após completar essas consultas. Ausência de pedidos em um array vazio não comprova ausência de compra.
- `store_open`, `availability`: snapshot atual por chaves de categoria, produto, tamanho e opções do contrato comercial. Disponível não significa quantidade física ou escassez.
- `opt_out`, `recovery_contacted_at`: preferência atual e último acompanhamento conhecido.

Uma consulta possível depois do atendimento aguarda o prazo configurável a partir da resposta da loja. A janela é medida pela última entrada verificada do cliente. Mensagem da loja não estende essa janela. Qualquer horário futuro, base de recebimento ou origem não comprovada impede candidatura silenciosa.

O primeiro motor é deliberadamente determinístico. Mensagens não reconhecidas não precisam virar tarefa humana: ficam não resolvidas para observação. Intervenção da operadora será destinada a exceções relevantes, conforme regra comercial futura. Não há ainda geração de texto nem seleção automática de abordagem genérica.

## Etapas ainda necessárias

1. Comprovar número real, WABA, app e assinatura de entrada/echo; homologar com dois telefones autorizados, preservando App e Tintim.
2. Criar montador servidor de episódios e snapshots de pedidos/permissão/disponibilidade; registrar metadados mínimos de decisão em armazenamento privado. Não expor o núcleo como API que confia em booleans do cliente.
3. Integrar modo sombra ao ingresso validado com autorização de deploy e política de retenção. Conservar o fluxo atual; não alterar hints legados em produção neste incremento.
4. Avaliar exemplos reais autorizados e medir falsos positivos/negativos, sem envios. Definir conciliação exata por código do pedido e identidade comprovada.
5. Somente depois preparar worker transacional/outbox com rechecagem imediata, parada global e tratamento de resultado de envio incerto. Ativação e mensagens reais exigem aprovação específica.

## Conferência Meta que depende do proprietário

Abrir WhatsApp Manager, selecionar o número comercial e conferir:
1. Número exibido, nome da conta, WABA ID, Phone Number ID e avisos de restrição/verificação.
2. No aplicativo Meta associado: App ID, modo do aplicativo e configuração do webhook WhatsApp. Mostrar URL do callback e quais campos estão inscritos, principalmente `messages` e `smb_message_echoes`.
3. No WhatsApp Business do aparelho principal: Configurações → Conta → Plataforma empresarial (nome pode variar), mostrar a conexão existente com o fornecedor. Não desconectar, migrar ou refazer onboarding.

Enviar capturas sem token, App Secret ou código de verificação. A conferência é de leitura. Se algum menu não aparecer, enviar a tela atual; não alterar permissões por tentativa. A verificação autenticada `is_on_biz_app`/`platform_type` e dos apps inscritos será feita pelo canal autorizado disponível, sem segredos no chat.

## Preservação e validação

Sem mudança em webhooks ativos, frontend/admin, SQL, pedidos, pagamentos, estoque, fotografias, atribuição, impressão ou Supabase Gestão. Não existe migration ou Edge deploy neste incremento. Sem ZIP de site.

Cobertura: categorias completas da fonte atual, homônimos, variantes e Gourmet com cotação real, ambiguidades, resposta posterior, duplicação/conflito, horário, permissão, categoria esgotada/desconhecida, pedido candidato/pago/cancelado, HMAC e filtros de identidade, replayer sem conteúdo privado. Workflow isolado sem instalação ou segredos. Fixtures não equivalem à homologação da conta real.

## Resultado local deste incremento

36/36 testes direcionados passaram (20 cenários novos e 16 verificações adjacentes). A avaliação de webhook assinado + echo até candidato silencioso usa somente dados sintéticos. Sem build de frontend, pois nenhum consumidor ativo foi modificado; sem CI remoto ou PR novo, pois o envio da branch não foi autorizado pela revisão automática. Branch e commits permanecem locais.

Limites da primeira versão: não interpreta áudio/imagem e não funde automaticamente tamanho/sabor distribuídos em mensagens diferentes; casos parciais continuam bloqueados para observação. O adapter não carrega histórico e não consulta pedidos; esses dados devem ser montados por um componente servidor confiável na próxima etapa. O texto existe transitoriamente em memória, sem persistência neste incremento.
