# V4.7.13 — Cascões: Folheado, Bueno e Nutella e nova foto Ferrero

Solicitação do proprietário (14/11/2026): substituir somente o sabor **Dois Amores** na vitrine de Cascões pelo novo **Folheado — Geleia de Morango com Ninho**, R$22. Preservar o SKU histórico de Dois Amores para pedidos antigos, marcando-o retirado no contrato de novas cotações. Não alterar **Casadinho** do Natal.

Renomear o Cascão **Kinder Bueno** existente para **Kinder Bueno e Nutella**, R$22, sem trocar seu ID/item_key e sem alterar o status atual de disponibilidade (na verificação estava sold_out). Ferrero Rocher conserva R$20, SKU e disponibilidade; substituição exclusiva de sua fotografia pela segunda imagem enviada.

Fotos sem geração: originais fornecidos pelo proprietário. WebP com crop centralizado no formato 4:5 (principal 1120×1400, card 600×750, mobile 360×450). Os seis ativos devem ser incluídos manualmente no pacote comercial completo; GitHub referencia imagens não versionadas no repositório, conforme a engenharia anterior.

**GATE:** a Edge create-whatsapp-order v38 ativa ainda tem Kinder R$20 e não aceita novo Folheado. Código preparado nesta branch, migração SQL não executada. Proibido publicar frontend isoladamente. Sequência futura, com autorização separada: Edge compatível, migração remota do SKU começando hidden, ZIP integral compatível, validação checkout/admin/Tintim e só então disponibilidade do Folheado quando houver estoque confirmado. Do not alter Cloudflare, production DB, Meta/CAPI or Tintim now.

Base: PR #51 / e8d1be595d61def50b0dba01647fe9a69f725d96; branch feat/cascao-folheado-bueno-nutella-ferrero-v4713-20261114. Cabe à homologação demonstrar CI comercial da revisão e Safari físico.