# Reversão — referências oficiais de pedido

Backup anterior ao corte em sombra do candidato b2f2f2caeae519eeb9cd320aa04551ec881cc813.

Reversão primária: CRM_RECOVERY_ORDER_REFERENCES_ENABLED=false. Preservar os dados privados, RLS e expurgo da nova tabela. Não restaurar a função antiga de expurgo enquanto existirem referências; isso abandonaria a retenção. Os bundles anteriores estão completos e preservam autenticação. Nenhum envio comercial foi autorizado.
