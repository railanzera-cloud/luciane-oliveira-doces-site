# Protocolo de integração e release — Luciane Oliveira Doces

**Adotado em 12/11/2026.** Complementa, não substitui, `AGENTS.md` e os cinco documentos permanentes. **Somente comercial**; Luciane Gestão fica fora do escopo.

> Objetivo: toda mudança deve melhorar o produto sem perder decisões aprovadas e sem confundir código testado, backend remoto, arquivo de publicação e produção. O registro estruturado é [ESTADO-DE-RELEASE.json](ESTADO-DE-RELEASE.json), um **snapshot datado**, não telemetria automática.

## 1. Quatro estados distintos e não intercambiáveis

| Estado | Fonte verificável | Critério |
| --- | --- | --- |
| Código de desenvolvimento aprovado em CI | branch + HEAD SHA + GitHub Actions nesse SHA | Testes/compilação; não prova publicação |
| Pacote de publicação | nome, hash SHA-256, número de arquivos, origem compilada e fotos reais aprovadas | O ZIP precisa ser inspecionado e íntegro; artefato BASE não é publicável |
| Backend e disponibilidade produtivos | Supabase comercial, função Edge **ativa**, contratos/preços e flags do banco | Versões e valores lidos no remoto, nunca inferidos do GitHub |
| Frontend publicado | Cloudflare deployment ID, momento, comprovante do ZIP/hash/SHA quando possível, inspeção da página real | Não usar `main`, CI nem criação de ZIP como prova de deploy |

**Até prova de publicação:** `production_code_sha = null`, Cloudflare `verification_state = unknown`. Não escrever “publicado”, “base oficial de produção” ou “corrigido em produção”.

## 2. Linha de desenvolvimento e branches

- **Referência de código validado, não produção:** `refine/cascao-fotografias-v44-20261112` no SHA `8df271026c11100afa726c9e4e276ee94d526f45`, PR #35 e CI 849/849. Este é um checkpoint de **desenvolvimento**, não certificado de preços/Edge.
- **Candidata de integração:** `work/integracao-comercial-controlada-20261112`, criada estritamente do SHA V4.4 acima. Neste primeiro incremento, somente documentos, manifesto, regras e verificações — sem alterações nas páginas, backend ou imagens.
- **`main` permanece intacta** até reconciliação e aprovação de release. Não fazer merge forçado, reset, cherry-pick em massa nem apagar branches; guardar histórico mesmo quando um PR se torna obsoleto.
- Para novas features: iniciar na candidata **somente após** conferir HEAD/ancestry, PRs concorrentes, contratos relevantes e se houve release mais recente. Uma feature por branch curta; PR com escopo, riscos, evidências e rollback; integrar em ordem depois da aprovação.
- Depois de um release validado, atualizar `main` ou branch estável designada como baseline **mediante merge revisado**, compatibilidade com outros projetos e validação do SHA final. Branches históricas permanecem consultáveis e PRs obsoletos são classificados antes de fechar.
- Não manter duas linhas de implementação para a mesma feature indefinidamente. Reconciliar diferenças de arquivos e decisões visuais antes de adotar uma.

### Complementos de reconciliação e operação (12/11/2026)

- [Mapa verificável de branches e PRs concorrentes](RECONCILIACAO-PRs-20261112.md): registra a comparação e o encerramento **sem merge** do PR #34, além das referências de bebidas PRs #23/#24.
- [Plano de corte comercial coordenado V4.4](PLANO-DE-CORTE-V44-20261112.md): checklist antes de qualquer Edge/SQL/Cloudflare, plano de backup, etapas operacionais e rollback. **Preparado, não executado.**
- A leitura pública da URL não fornece ID/SHAs de deployment; se o Cloudflare não estiver conectado, registrar **produção desconhecida** em vez de procurar evidências inválidas no GitHub.

## 3. Reconciliação verificada em 12/11/2026

| Linha | Situação e decisão |
| --- | --- |
| PR #31 → #32 → #33 → #35 | Cadeia de ancestralidade coerente. V4.4 é a referência de código mais recente desta linha, mas **não** referência comprovada de produção. |
| PR #34 | Branch `feat/cascao-novos-sabores-natal22-20261112` **divergida**, partindo do checkout V4.2. Implementa os mesmos novos Cascões/preços em paralelo, mas tem decisões diferentes: nome do terceiro sabor e layout de duas colunas em mobile. Não misturar automaticamente nem decretar superior sem homologação. Diferenças/testes revisados e PR #34 encerrado como substituído em 12/11 **sem merge nem exclusão de branch**. Fotos V4.4 e nome aprovado seguem como referência enquanto não houver nova decisão. |
| PR #23 / #24 | Bebidas e ajustes de complementos anteriores não autorizam reativar refrigerantes. Código e UX podem servir como referência, mas **não** devem ser mesclados sem a nova decisão de produto. |
| PRs #5–#30 | Histórico acumulado por encadeamento; quantidade de PRs abertos **não** equivale a trabalho faltando em produção. Não executar merge/fechamento em lote. Documentar dependências que ainda importam. |
| `main` | Separada do checkpoint recente. Diferença histórica de ~1.235 commits no momento da conferência, que não é medida de falhas nem prova de deploy. |

### Divergência comercial produtiva confirmada

Leitura remota do Supabase comercial `edqiwvccmboyayojvuea` em 12/11/2026: Edge `create-whatsapp-order` **v36** com Natal ainda em 1699/1899 centavos e sem três SKUs novos; `category_cones` e novos SKUs constam **available**. Código V4.4 espera Natal 2200 e Cascões 2000. **Release bloqueado** até sincronização e homologação autorizadas. Não executar SQL/Edge sem janela e plano de rollback; não fingir que itens disponíveis já podem ser cobrados corretamente.

Cloudflare: não há deployment ID/SHA/hash identificado nesta verificação. O site pode estar em versão diferente do HEAD; a URL pública por si não comprova build.

### Atualização operacional após a divergência original (12/11/2026)

O diagnóstico acima sobre a **Edge v36** é um registro histórico do momento inicial. Depois dele, a Edge comercial foi atualizada para **v37 ACTIVE**, com suporte aos três novos Cascões (2000 centavos) e às quatro Fatias de Chocottone (2200 centavos). A diferença remanescente é a nova tabela dos três Cascões antigos: frontend V4.6 = 1800/1800/2000 centavos, Edge v37 = 1400/1400/1600 centavos. **Nenhum pacote V4.6 tem deployment comprovado.**

O PR #37 foi **mergeado no PR #36** em `1b497c73be6ca181511984b489707f4a30b2a0be` (integração controlada, NÃO `main`); o PR #36 contém agora a linha funcional candidata mais completa, com correção dos complementos e o ZIP V4.6 de 117 arquivos preservando fotos aprovadas. O teste de navegação que buscava “Cones Trufados” foi atualizado para “Cascão Trufado” e os workflows do PR #37 concluíram com sucesso. Reavaliar CI no HEAD atual da integração antes de qualquer promoção. **Não usar os SHAs de V4.4 ou V4.6 como prova de publicação.**

A decisão de produto D-C42 aprova futuramente bebidas compactas expansíveis, mas sua implementação ocorre **depois** de reconciliar Cloudflare, Edge, preços e integração. Não restaurar PRs #23/#24 no fechamento da V4.6. O release permanece bloqueado até Cloudflare identificado, rollback preparado, paridade servidor/frontend e homologação real do checkout.

### Estado de preços após Edge v38 e confirmação do Cloudflare Production (12/11/2026)

A atualização acima que ainda descreve a Edge **v37** com 14/14/16 e Cloudflare sem deployment identificado tornou-se **histórica**. Capturas do painel comprovam que `237b204c-d5a5-4d3a-a8e7-7bfc3d699cc0` é o deployment atual de Production e os nomes de seus assets correspondem ao pacote V4.6 de 117 entradas (112 arquivos, três especiais Cloudflare, 109 ativos carregados). A equivalência criptográfica do ZIP enviado não foi comprovada diretamente pela plataforma.

O corte mínimo da Edge foi executado com autorização do proprietário: `create-whatsapp-order` **v38 ACTIVE**, catálogo idêntico ao da branch de integração V4.6. Preços dos Cascões antigos agora Prestígio R$18, Dois Amores R$18, Ferrero Rocher R$20; três novos Cascões R$20, Natal R$22. Seis outros arquivos Edge, `verify_jwt`, estoque e bebidas preservados.

**O fechamento integral do release continua bloqueado somente por evidências de operação real e procedência de ZIP**, não por divergência conhecida de preços/IDs. Categorias Cascão e Natal estão `sold_out` na observação, sem alteração automática; não fazer pedidos reais de teste sem avisar a operação. A revisão da `main` ocorrerá após aceite e verificação das demais regressões. Refrigerantes só na próxima etapa.

## 4. Ritual obrigatório antes de começar um refinamento

1. Ler `AGENTS.md` + cinco documentos, com atenção especial ao checkpoint recente; consultar este protocolo e o JSON de release.
2. Atualizar a visão do GitHub (HEAD, ancestry, PRs concorrentes, CI no SHA relevante). Se a branch candidata não contiver uma mudança aprovada, primeiro reconciliar.
3. Identificar demanda real e sintomas, diferenciação entre erro funcional e oportunidade visual. Considerar clientes do Instagram/Safari e anúncios que caem em diferentes categorias.
4. Registrar brevemente alternativas, consequências e recomendação. Não copiar automaticamente UI antiga: **evoluir coerentemente**, com contraste suficiente entre antes/depois. Referências externas atuais somente quando acrescentarem qualidade.
5. Mapear impactos em catálogo/SKU/preço, disponibilidade/estoque, carrinho, cobrança no servidor, WhatsApp/Tintim, Pix, Meta/CAPI, admin, cozinha/QZ e fotos.
6. Implementar apenas após autorização. Em caso de mudanças colaterais técnicas dentro do escopo, registrar por que eram necessárias.
7. Rodar testes proporcionais ao risco: estáticos, TypeScript/build, regressões específicas, paridade frontend/Edge e, quando visual, WebKit móvel. Verificar no SHA final e esclarecer limites de testes simulados.
8. Para publicação: conferir estado real e **separar explicitamente** código, ZIP, Edge/SQL e Cloudflare. Validar arquivo final com hash, assets aprovados e rotas. Com autorização operacional específica, fazer corte coordenado, testar e registrar rollback; Safari/Instagram físico permanece homologação separada.
9. Atualizar checkpoint e manifesto; registrar decisão durável apenas quando houver uma decisão nova; reportar o que foi feito e o que **não** foi.

### Critérios de melhoria (não são adornos)

- Cliente entende o próximo passo, escolhe sem fricção e mantém controle ao somar itens.
- Preços e itens são corretos no frontend **e** no servidor; produtos ocultos não são compráveis.
- Profundidade, tipografia, imagens e microinterações devem reforçar clareza e confiança, sem aumentar página ou peso sem necessidade.
- Performance/estabilidade/acessibilidade em celular e navegador interno do Instagram.
- Resultados observáveis: dúvidas operacionais, pedidos realmente recebidos no WhatsApp, falhas de abandono, reclamos e velocidade. Clique no WhatsApp não prova envio; registro não prova venda.
- Nenhuma alteração também pode ser uma excelente decisão quando a experiência já é correta.

## 5. Gate operacional e política de evidências

`node scripts/check-commercial-release.mjs --preflight`: verifica a consistência do snapshot, documentos e formato. Serve para CI **sem declarar prontidão de produção**.

`node scripts/check-commercial-release.mjs --release`: **falha fechado** enquanto Cloudflare, preço/Edge, liberação e rollback não forem verificados; não efetua deploy nem ações externas. Mesmo um resultado positivo significa só que as evidências declaradas estão completas; ainda exige revalidação remota e autorização para publicar.

Se os ativos finais existirem apenas em ZIP (como as fotografias dos Cascões), conservar hash, fonte e receita de montagem; PR de código não substitui pacote final.

## 6. Inicialização curta de qualquer nova conversa

> Continue o site **comercial** Luciane Oliveira Doces. Leia `AGENTS.md`, os cinco documentos em `docs/continuidade/`, `PROTOCOLO-DE-INTEGRACAO-E-RELEASE.md` e `ESTADO-DE-RELEASE.json`. Confira a branch de integração candidata, último SHA, PRs concorrentes e se Cloudflare, ZIP, Supabase Edge e disponibilidade estão realmente compatíveis. Analise minha ideia com independência, proponha a melhor solução e implemente apenas após minha autorização. Preserve decisões aprovadas, teste o fluxo comercial e registre novo checkpoint sem presumir deploy.

**A cada novo incremento:** a base candidata pode mudar; não congelar indefinidamente o SHA V4.4. Só promover uma nova referência quando as provas e a reconciliação justificarem.
