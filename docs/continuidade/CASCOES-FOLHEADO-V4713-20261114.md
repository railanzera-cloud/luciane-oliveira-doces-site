# V4.7.13 — Cascões: Folheado, Bueno e Nutella e nova foto Ferrero

Solicitação do proprietário (14/11/2026): substituir somente o sabor **Dois Amores** na vitrine de Cascões pelo novo **Folheado — Geleia de Morango com Ninho**, R$22. Preservar o SKU histórico de Dois Amores para pedidos antigos, marcando-o retirado no contrato de novas cotações. Não alterar **Casadinho** do Natal.

Renomear o Cascão **Kinder Bueno** existente para **Kinder Bueno e Nutella**, R$22, sem trocar seu ID/item_key e sem alterar o status atual de disponibilidade (na verificação estava sold_out). Ferrero Rocher conserva R$20, SKU e disponibilidade; substituição exclusiva de sua fotografia pela segunda imagem enviada.

Fotos sem geração: originais fornecidos pelo proprietário. WebP com crop centralizado no formato 4:5 (principal 1120×1400, card 600×750, mobile 360×450). Os seis ativos devem ser incluídos manualmente no pacote comercial completo; GitHub referencia imagens não versionadas no repositório, conforme a engenharia anterior.

**GATE:** a Edge create-whatsapp-order v38 ativa ainda tem Kinder R$20 e não aceita novo Folheado. Código preparado nesta branch, migração SQL não executada. Proibido publicar frontend isoladamente. Sequência futura, com autorização separada: Edge compatível, migração remota do SKU começando hidden, ZIP integral compatível, validação checkout/admin/Tintim e só então disponibilidade do Folheado quando houver estoque confirmado. Do not alter Cloudflare, production DB, Meta/CAPI or Tintim now.

Base: PR #51 / e8d1be595d61def50b0dba01647fe9a69f725d96; branch feat/cascao-folheado-bueno-nutella-ferrero-v4713-20261114. Cabe à homologação demonstrar CI comercial da revisão e Safari físico.

## Fechamento do preparo técnico — 14/11/2026

A situação acima de bloqueio do backend era a situação **anterior** ao corte. Depois da autorização do proprietário, as atualizações de backend/banco foram efetivamente executadas, com loja fechada.

- Fonte compilada do ZIP: commit `46bfeeab8e6fa331acaa755bed864cb11a273f12`, GitHub Actions `43587784933` (build e **896/896 testes comerciais** aprovados). QA da página jurídica aprovado (`43587784925`); renderização do HTML `/informacoes-da-empresa/index.html` incluída.
- Edge comercial `create-whatsapp-order` **v39 ACTIVE** (anterior v38), SHA de implantação `9bac8a98ec443fc6a01843482f1641b325d4d44c8cf07d8a7d6fab04792f4685`; todos os arquivos de suporte preservados; catálogo fonte idêntico ao deste incremento. `verify_jwt=false` mantido, sem alteração de autenticação.
- Migração de dados executada com verificação de loja fechada e disponibilidade anterior: Folheado cadastrado, depois liberado como `available`; Kinder Bueno e Nutella com nome ajustado mas `sold_out` preservado; Dois Amores `hidden`; Ferrero `available`. Nenhum pedido real, estoque, pagamento ou venda histórica alterado. `orders_open=false` na última verificação.
- **ZIP apto ao upload manual**, sem deploy Cloudflare realizado: `LUCIANE_OLIVEIRA_DOCES_V4_7_13_PUBLICACAO_MANUAL.zip`, SHA-256 `4aeb32b711c9208396e40683fc74d2ca5a950e4a49daa5b99616a295038f0b15`, 173 entradas, 6 novas imagens WebP 4:5, 112 imagens antigas preservadas byte a byte. Rotas /, /admin, /pedido e /informacoes-da-empresa geradas. Integridade CRC e sintaxe dos 15 módulos JS aprovadas.
- **Não afirmar publicação**: deployment Cloudflare novo ainda não identificado, Safari/Instagram físico e jornada operacional real pendentes. Não reabrir pedidos antes de publicar o ZIP, verificar catálogo, checkout/WhatsApp, e conferir valores. O PR #52 segue draft, sem merge na main.
- **Rollback coordenado**: se o frontend falhar, usar deployment anterior no Cloudflare, manter loja fechada, não habilitar Kinder via admin, e avaliar reimplantação da Edge v38 (hash anterior `9ed726b0f3ce3185456287dc37f9e6329cf3d26dc151d51d1676dc5d2233a706`) junto de estado de catálogo compatível. Não dar rollback isolado da Edge enquanto o site novo estiver atendendo pedidos.
