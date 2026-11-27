# Instruções para agentes

Leia `CLAUDE.md` (vale para qualquer agente, não só Claude) e siga a ordem de leitura de lá:
`docs/atual/PLAYBOOK_IA.md` → `docs/atual/ESTADO_ATUAL.md` → `docs/plano/PLANO_LASHAGENDA_V2.md`.

Sempre em português. Uma etapa do plano por vez. A usuária testa antes de qualquer commit.

<!-- A partir da Fase 1, o `next dev` pode acrescentar aqui um bloco automático
     "nextjs-agent-rules" (o StudioMenu tem). Pode deixar: ele avisa que esta versão do
     Next.js tem mudanças e manda ler a documentação em node_modules/next/dist/docs/. -->

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
