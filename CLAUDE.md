@AGENTS.md

# Leitura obrigatória antes de qualquer tarefa

1. **`docs/atual/PLAYBOOK_IA.md`** — regras de comportamento (Git, escopo, verificação,
   comunicação). Valem para qualquer IA/agente, em qualquer ferramenta e estação.
2. **`docs/atual/ESTADO_ATUAL.md`** — único documento com garantia de refletir o projeto hoje
   (fase atual, stack, estrutura, pendências).
3. **`docs/plano/PLANO_LASHAGENDA_V2.md`** — o plano em fases. Trabalhe sempre na fase/etapa
   marcada como atual em `ESTADO_ATUAL.md`, uma etapa por vez.

Estação nova ou chat novo: leia antes **`docs/atual/CONTINUAR_EM_OUTRA_ESTACAO.md`** (chaves que
não vão pelo Git, como a dona trabalha, fase de testes, aprendizados de produção).

# Regras críticas (resumo — detalhes no playbook)

- Trabalho sempre na branch **`desenv`**. **Nunca** dar push/merge na `main` sem autorização
  explícita da usuária para aquela mudança específica.
- **`legacy/` é só leitura.** O LashAgenda v1 serve de referência de funcionalidade, telas e
  regras — nunca edite, nunca importe código de lá direto no app.
- **Nada de saúde fora do app.** Anúncio, landing page, página com pixel da Meta, URL com
  pixel e evento de pixel **nunca** mencionam anamnese, saúde, alergia, gestante, medicamento
  ou doença. O pixel do LashAgenda v1 foi restrito pela Meta por isso. Ver
  `docs/plano/DECISOES_DE_PRODUTO.md`, seção "Regra de saúde e pixel".
- Segredos (tokens, chaves) só em `.env*` locais ou nas variáveis da Vercel — nunca em
  arquivo versionado, nunca embutidos na URL do remote do git.
