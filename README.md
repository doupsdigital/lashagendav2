# 💗 LashAgenda v2

> App de agendamento e gestão feito **só para lash designers autônomas**: catálogo digital
> bonito (a experiência do StudioMenu), agendamento automático, agenda, clientes e ficha
> técnica — vendido por assinatura via Cakto, sem X1.

**Novo por aqui (pessoa ou IA)? Leia nesta ordem:**

1. [`docs/atual/PLAYBOOK_IA.md`](docs/atual/PLAYBOOK_IA.md) — como trabalhar neste repositório.
2. [`docs/atual/ESTADO_ATUAL.md`](docs/atual/ESTADO_ATUAL.md) — o que o projeto é **hoje** e em que fase está.
3. [`docs/plano/PLANO_LASHAGENDA_V2.md`](docs/plano/PLANO_LASHAGENDA_V2.md) — o plano completo, fase por fase.

## Estrutura (hoje — Fase 0)

```
lashagendav2/
├── docs/
│   ├── atual/            # estado atual + playbook (fonte de verdade do presente)
│   └── plano/            # plano em fases, decisões de produto, backlog futuro
└── legacy/
    └── lashagenda-v1/    # código do LashAgenda v1 (Vite + React) — SÓ referência, não editar
```

O código do app (Next.js) entra na **Fase 1**, a partir de uma cópia do StudioMenu.

## Branches

- `desenv` — onde todo trabalho acontece.
- `main` — produção. Só recebe mudança com autorização explícita da dona do projeto.
