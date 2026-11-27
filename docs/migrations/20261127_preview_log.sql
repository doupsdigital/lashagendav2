-- F12.1 — Registro das prévias criadas (números do admin).
-- As prévias vencidas e não pagas são apagadas todo dia (cron
-- cleanup-previews); sem este registro o admin não teria "prévias por dia".
-- Guarda só o instante (nenhum dado da lead). Idempotente.

CREATE TABLE IF NOT EXISTS public.preview_log (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS preview_log_created_idx ON public.preview_log(created_at DESC);

ALTER TABLE public.preview_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.preview_log FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.preview_log_id_seq FROM anon, authenticated;
