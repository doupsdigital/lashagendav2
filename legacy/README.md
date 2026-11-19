# legacy/ — só referência, não editar

## `lashagenda-v1/`

Código completo do **LashAgenda v1** (julho/2026): Vite + React 19 + TypeScript + Tailwind,
Supabase com RLS no cliente, Asaas e Edge Functions. Ficava só numa máquina local, sem git.
Foi copiado para cá em 2026-11-19 para servir de **especificação viva** do v2: telas,
regras de negócio, textos, campos da ficha técnica e modelo de dados.

**Excluídos da cópia:** `node_modules/`, `dist/`, `.env` e o HTML avulso
`LashHub Tela Inicial (standalone).html` (1,3 MB, protótipo antigo).

**Segredos removidos:** os segredos de webhook gravados em `scripts/schema_definitivo.sql` e
`scripts/schema_novo_banco.sql` foram trocados por `SEU_WEBHOOK_SECRET`.

### Onde está cada coisa útil para o v2

| Assunto | Arquivo no v1 |
|---|---|
| Schema completo do banco (versão consolidada) | `scripts/schema_novo_banco.sql` |
| Ficha técnica / anamnese (todos os campos e opções) | `src/pages/profissional/FichaAnamneseDetalhe.tsx` + `src/types/index.ts` (`anamnese_lash`) |
| Agenda (dia/semana/mês, concluir com valor, falta, trancar) | `src/pages/profissional/Agendamentos.tsx` |
| Perfil da cliente + histórico + atendimento manual | `src/pages/profissional/PerfilCliente.tsx` |
| Relatórios por período | `src/pages/profissional/Relatorios.tsx` |
| Painel "Meu Estúdio" | `src/pages/profissional/Dashboard.tsx` |
| Agendamento pela cliente (dedupe por WhatsApp, corrida de cadastro) | `src/pages/portal-clientes/PortalAgendar.tsx` |
| Regras de dedupe de cliente (email / WhatsApp + nome) | `scripts/schema_novo_banco.sql`, função `get_cliente_id_by_email_or_whatsapp` |
| Configurações (aprovação automática, antecedência, mensagem) | `src/pages/profissional/Configuracoes.tsx` |
| Manuais (profissional e cliente) | `docs/manual_profissional.md`, `docs/manual_cliente.md` |
| PRD original | `docs/PRD - Lash Agenda.md` |

### Rodar o v1 localmente (se precisar comparar comportamento)

Precisa de um projeto Supabase com `scripts/schema_novo_banco.sql` aplicado e um `.env` com
`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Depois: `npm ci && npm run dev`, dentro desta
pasta. O login anônimo precisa estar ativo no Supabase (agendamento como convidada).
