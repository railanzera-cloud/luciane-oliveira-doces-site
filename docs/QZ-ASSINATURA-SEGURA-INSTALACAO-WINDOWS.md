> **Seleção de impressora — 15/10/2026:** se houver várias térmicas, o novo
> frontend permite escolher **POS-58(copy of 1)** e clicar em
> **Conectar impressora selecionada**. Essa atualização requer o novo ZIP.
> A assinatura permanece na qz-sign v7; chamadas do notebook retornaram HTTP 200.
> A fila continua desligada e o teste físico local permanece obrigatório.

> **Correção em 15/10/2026: `qz-sign` v7 ACTIVE.** O HTTP 503 vinha de
> `X509Certificate.toString()` indisponível no Deno 2.1.4. O PEM validado agora
> é devolvido diretamente. Assinatura real validada no autoteste do Supabase.
> Não reinstalar QZ/driver, não trocar segredos, não republicar frontend.
> Atualizar o painel no notebook e repetir apenas conexão + teste local.
> Automação continua desligada; confirmação física pendente.

> **Atualização 15/10/2026:** os dois segredos QZ já foram configurados no Supabase,
> e a lista administrativa existente foi preservada. Não repetir essa configuração.
> A validação positiva remota e a impressão física seguem pendentes; fila desligada.
> Consulte o estado vigente em `COZINHA-IMPRESSAO-CONTINUIDADE.md`.

# Finalização local QZ Tray — Luciane Oliveira Doces

**Uso:** somente pessoa autorizada com acesso ao Supabase comercial e ao notebook Windows da Luciane.  
**Banco:** `edqiwvccmboyayojvuea`.  
**Impressora:** Goldensky SMX-JP58H, reconhecida como `POS-58(copy of 1)` no Windows.  
**QZ:** 2.3.0 aberto na bandeja; Demo Cert na aba Allowed do Site Manager.

## Estado que deve ser preservado

- O controle `public.kitchen_print_control.enabled` deve permanecer **false** até o teste físico e comercial.
- Uma comanda antiga já está `pending`; ela não deve ser liberada.
- O QZ Tray recebeu certificado de demonstração local: ele é válido **somente nesse notebook**, não em outros computadores, conforme https://qz.io/docs/signing.
- O backend `qz-sign` valida um JWT da conta administrativa; a chave privada **nunca** deve integrar bundle do Cloudflare, arquivos do GitHub nem mensagens do WhatsApp.

## Tarefa presencial/remota supervisionada — configurar os segredos

**Não enviar prints do conteúdo dos arquivos, senhas, códigos, chaves privadas ou tokens ao ChatGPT.**

1. No notebook da Luciane, iniciar sessão **com a conta de proprietário/administrador autorizada** do Supabase e abrir:
   `https://supabase.com/dashboard/project/edqiwvccmboyayojvuea/functions/secrets`.
   É preciso Owner/Administrator para salvar segredos (https://supabase.com/docs/guides/functions/secrets).
2. No Explorador de Arquivos do Windows, localizar a pasta `Área de Trabalho\QZ Tray`, mostrada nas fotos. Nela existem `digital-certificate` (pode aparecer sem extensão) e `private-key.pem`. **São um par; não gerar outro sem necessidade.**
3. Adicionar o segredo **`QZ_CERTIFICATE`**: abrir o arquivo `digital-certificate` no Bloco de Notas, copiar o conteúdo inteiro, incluindo as linhas de BEGIN/END CERTIFICATE, colar diretamente no campo de valor do Supabase e salvar.
4. Adicionar o segredo **`QZ_PRIVATE_KEY_PEM`**: abrir `private-key.pem` no Bloco de Notas, copiar todo o conteúdo, incluindo BEGIN/END PRIVATE KEY, **colar diretamente no campo secreto do Supabase**, salvar. Não enviar por WhatsApp/e-mail/chat e não compartilhar o arquivo.
5. Adicionar **`LOD_ADMIN_USER_IDS`**: no próprio Dashboard > Authentication > Users, identificar o usuário da conta que entra no painel de pedidos e copiar seu UUID. Colar o UUID como valor; para dois administradores expressamente autorizados, separar os IDs por vírgula. Não escolher um usuário desconhecido.
6. Não adicionar `SUPABASE_PUBLISHABLE_KEYS` manualmente: Supabase já fornece essa variável ao runtime. Não sobrescrever `CHECKOUT_ALLOWED_ORIGINS` nem nenhum segredo usado pelo checkout.
7. Fechar o Bloco de Notas sem salvar alterações. O conteúdo da chave privada não deve ficar no clipboard mais do que o necessário; ao concluir, limpar a área de transferência do Windows se viável.
8. Uma vez salvos, **informar apenas “os três nomes foram salvos”**; não compartilhar os valores ou fotos revelando-os.

**Importante:** o QZ Tray não é um serviço de nuvem. O notebook deve permanecer ligado, com o QZ Tray aberto, impressora conectada e painel administrativo carregado/visível para a entrega automática via navegador. Windows em suspensão e aba descarregada impedem operação confiável.

## Homologação — ainda sem impressão automática

Após salvar os segredos e validar o endpoint de assinatura:

1. Publicar **manualmente** o ZIP validado da branch `work/cozinha-integracao-segura-20261015` no Cloudflare Pages — somente após revisar a versão final do pacote, preservando a loja.
2. No **mesmo notebook**, abrir `https://lucianeoliveiradoces.pages.dev/admin` e entrar na conta autorizada.
3. Com QZ Tray aberto, clicar **Conectar impressão 58 mm**. Deve reconhecer **POS-58(copy of 1)**, não a Epson nem PDF.
4. Conferir que o painel indica fila protegida **desativada**. Clicar **Imprimir teste local**; o papel impresso deve mencionar **TESTE LOCAL**, sem número de pedido real.
5. Verificar largura (58 mm), caracteres, avanço do papel, legibilidade e corte manual se aplicável. QZ `qz.print` resolvido significa aceitação da tarefa pelo serviço, não prova absoluta de impressão física.
6. **Não** clicar em **Ativar impressão automática** antes de homologar o processo de pedido real, falha de rede, pagamento pendente, cancelamento, reimpressão e controle de duplicidade.
7. Revalidar fila no Supabase, condições de segurança e o estado `enabled=false` antes da ativação. Habilitar somente se a Luciane autorizar esse teste operacional.

## Caso haja um erro

- `403 admin_required`: UUID do usuário do painel ausente ou errado em `LOD_ADMIN_USER_IDS`.
- `503 qz_not_configured`: falta certificado ou chave privada no Supabase.
- `503 qz_pair_mismatch`: certificado e chave não correspondem; **não** gerar novas chaves às cegas.
- `401 authentication_required`: sessão do painel expirada; entrar novamente.
- `403 origin_not_allowed`: origem do site não aceita; inspecionar antes de alterar domínios ou outras integrações.
- Impressora não encontrada: verificar POS-58 e USB em Impressoras e scanners.
- Um popup de confiança do QZ ainda aparece: parar e conferir a correspondência do certificado e a assinatura, sem criar exceções amplas.
- Fila antiga continua no banco de propósito; não excluir nem marcar como impressa arbitrariamente.

Documentação oficial:
- QZ: https://qz.io/docs/signing
- Supabase: https://supabase.com/docs/guides/functions/secrets
