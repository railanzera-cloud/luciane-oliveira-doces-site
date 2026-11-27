---
name: qa-commerce
description: Valide alterações comerciais do site Luciane Oliveira Doces com a suíte existente, prévia simulada, WebKit, Chromium mobile, comparação visual e Lighthouse informativo.
---

# QA comercial

Selecione cenários pela [matriz de impacto](../../../docs/continuidade/MATRIZ-DE-IMPACTO-COMERCIAL.md). Execute a [rotina local](../../../docs/PORTABILIDADE.md) no checkout de desenvolvimento e preserve a evidência do primeiro teste que demonstrar a regressão.

Capture a referência antes de editar. Compare no mesmo perfil de dados e dispositivo. Revise o diff junto dos testes funcionais quando uma diferença de pixels for intencional. Registre métricas Lighthouse ao comparar mudanças de carregamento ou acessibilidade.

No relato, informe SHA, engines, tamanhos, cenário e caminho das capturas. Use a matriz para decidir quais resultados dependem de homologação física ou operacional.
