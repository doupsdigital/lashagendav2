# 📚 Documentação — LashAgenda v2

**Chat ou agente novo: leia primeiro [`atual/PLAYBOOK_IA.md`](atual/PLAYBOOK_IA.md) e
[`atual/ESTADO_ATUAL.md`](atual/ESTADO_ATUAL.md).**

## Estrutura

- **[`atual/`](atual/)** — o presente: estado do projeto e regras de trabalho. Curado e sempre
  conferido contra o código.
- **[`plano/`](plano/)** — para onde vamos:
  - [`PLANO_LASHAGENDA_V2.md`](plano/PLANO_LASHAGENDA_V2.md) — plano mestre em 16 fases;
  - [`DECISOES_DE_PRODUTO.md`](plano/DECISOES_DE_PRODUTO.md) — o que foi decidido e por quê
    (inclui a lista das funcionalidades do v1, item a item);
  - [`BACKLOG_FUTURO.md`](plano/BACKLOG_FUTURO.md) — ideias para depois do lançamento.
- **[`testes/`](testes/)** — roteiros de teste da dona:
  - [`ROTEIRO_TESTES_F14.md`](testes/ROTEIRO_TESTES_F14.md) — testes finais em produção (M4).
- **`schema.sql`** (a partir da F2) — schema atual do banco.
- **`migrations/`** (a partir da F2) — migrações individuais, uma por mudança de banco.

## Fora de `docs/`

- **`legacy/`** — código do LashAgenda v1, só referência (ver [`../legacy/README.md`](../legacy/README.md)).
