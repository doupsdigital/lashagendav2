-- ==========================================================================
-- LASHAGENDA v2 — SCHEMA DO BANCO (Supabase / Postgres)
-- ==========================================================================
-- Fonte da verdade do modelo de dados (plano, seção 3.4; escrito na F2.1).
-- Rodar inteiro no SQL Editor de um projeto Supabase VAZIO (dev ou prod).
-- Mudanças depois do primeiro uso em produção vão em docs/migrations/.
--
-- Postura de segurança (igual ao StudioMenu, mais rígida que o v1):
--   * O navegador NUNCA fala direto com tabela. Toda leitura/escrita passa
--     pelas rotas de servidor do Next.js com a service_role (supabaseAdmin),
--     que ignora RLS.
--   * RLS ligado em TODAS as tabelas e nenhuma policy → anon/authenticated
--     não conseguem nada, mesmo com a chave pública. Além disso, REVOKE
--     explícito dos privilégios que o Supabase concede por padrão.
--   * Fotos: bucket público só para LEITURA por URL; upload só pelo servidor.
--
-- Convenções: nomes em inglês (reaproveitar o código do StudioMenu), dinheiro
-- em NUMERIC(10,2) (NULL = "sob consulta"), horários em TIMESTAMPTZ (UTC no
-- banco; o app converte para America/Sao_Paulo), `position` para ordenação.
-- ==========================================================================

-- No Supabase as extensões ficam no schema `extensions` (que já está no
-- search_path); pgcrypto já vem instalada.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;   -- gen_random_bytes (tokens)
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions; -- trava de choque de horário

-- --------------------------------------------------------------------------
-- 0. Função utilitária: mantém `updated_at` em dia
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- --------------------------------------------------------------------------
-- 1. STUDIOS — o "tenant": uma profissional = um estúdio
--    (substitui `orders` do StudioMenu e `estabelecimentos` + `configuracao_negocio` do v1)
-- --------------------------------------------------------------------------
CREATE TABLE public.studios (
    id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Identidade / link público (<slug>.lashagenda.com)
    slug                       TEXT NOT NULL UNIQUE
                               CHECK (slug ~ '^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$'),
    owner_name                 TEXT NOT NULL,          -- nome da profissional ("Fernanda")
    studio_name                TEXT,                   -- nome do negócio, se diferente
    studio_label               TEXT,                   -- texto pequeno da capa (padrão "STUDIO")
    hero_phrase                TEXT,                   -- frase da capa
    bio                        TEXT,
    whatsapp                   TEXT,                   -- como ela digitou; o app normaliza
    instagram                  TEXT,
    address                    TEXT,
    maps_url                   TEXT,

    -- Visual do catálogo (mesmo formato do StudioMenu — importação futura)
    avatar_url                 TEXT,
    cover_media_url            TEXT,
    instructions_bg_url        TEXT,
    final_screen_bg_url        TEXT,
    cta_bg_url                 TEXT,
    layout_model               TEXT NOT NULL DEFAULT 'mosaico'
                               CHECK (layout_model IN ('mosaico', 'classico')),
    theme_variant              TEXT NOT NULL DEFAULT 'rose'
                               CHECK (theme_variant IN ('rose', 'luxury')),
    categories                 TEXT[] NOT NULL DEFAULT '{}',   -- ordem das categorias
    instructions_items         JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{id,title,description}]

    -- Regras de agendamento
    booking_mode               TEXT NOT NULL DEFAULT 'approval'
                               CHECK (booking_mode IN ('auto', 'approval')),
    whatsapp_button_enabled    BOOLEAN NOT NULL DEFAULT true,
    agenda_paused              BOOLEAN NOT NULL DEFAULT false,
    cancellation_notice_hours  INTEGER NOT NULL DEFAULT 24
                               CHECK (cancellation_notice_hours BETWEEN 0 AND 720),
    min_notice_minutes         INTEGER NOT NULL DEFAULT 120
                               CHECK (min_notice_minutes BETWEEN 0 AND 10080),
    booking_window_days        INTEGER NOT NULL DEFAULT 60
                               CHECK (booking_window_days BETWEEN 1 AND 365),
    post_booking_message       TEXT,

    -- Cobrança (Cakto)
    plan_status                TEXT NOT NULL DEFAULT 'preview'
                               CHECK (plan_status IN ('preview', 'active', 'suspended', 'canceled')),
    cakto_plan                 TEXT CHECK (cakto_plan IS NULL OR cakto_plan IN ('mensal', 'anual')),
    cakto_order_id             TEXT,
    cakto_subscription_ref     TEXT,
    paid_until                 TIMESTAMPTZ,
    manual_plan                BOOLEAN NOT NULL DEFAULT false, -- liberado à mão pelo admin
    billing_email              TEXT,                   -- e-mail da compra (envio do acesso)
    preview_code               TEXT,
    preview_expires_at         TIMESTAMPTZ,
    acquisition_source         TEXT,

    -- Acesso da profissional
    edit_token                 TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'), -- link mágico
    auth_user_id               UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    app_short_code             TEXT UNIQUE,            -- /a/<código>
    disabled                   BOOLEAN NOT NULL DEFAULT false, -- desligado pelo admin
    onboarding_steps           JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX studios_preview_code_key ON public.studios(preview_code) WHERE preview_code IS NOT NULL;
CREATE INDEX studios_cakto_subscription_ref_idx ON public.studios(cakto_subscription_ref) WHERE cakto_subscription_ref IS NOT NULL;
CREATE INDEX studios_cakto_order_id_idx ON public.studios(cakto_order_id) WHERE cakto_order_id IS NOT NULL;
CREATE TRIGGER studios_updated_at BEFORE UPDATE ON public.studios
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------
-- 2. SERVICES — serviços do catálogo (todos agendáveis: duração obrigatória)
-- --------------------------------------------------------------------------
CREATE TABLE public.services (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id         UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    position          INTEGER NOT NULL DEFAULT 0,
    title             TEXT NOT NULL,
    description       TEXT,
    category          TEXT,
    price             NUMERIC(10,2) CHECK (price IS NULL OR price >= 0), -- NULL = "sob consulta"
    price_from        BOOLEAN NOT NULL DEFAULT false,  -- mostra "a partir de"
    duration_minutes  INTEGER NOT NULL CHECK (duration_minutes BETWEEN 5 AND 720),
    image_url         TEXT,
    extra_photos      JSONB NOT NULL DEFAULT '[]'::jsonb, -- até 2 URLs extras
    badge             TEXT,
    is_highlight      BOOLEAN NOT NULL DEFAULT false,
    specs             JSONB NOT NULL DEFAULT '[]'::jsonb, -- [[rótulo, valor], ...]
    bookable          BOOLEAN NOT NULL DEFAULT true,   -- false = só aparece no catálogo
    active            BOOLEAN NOT NULL DEFAULT true    -- false = escondido de tudo
);
CREATE INDEX services_studio_position_idx ON public.services(studio_id, position);
CREATE TRIGGER services_updated_at BEFORE UPDATE ON public.services
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------
-- 3. SERVICE_VARIATIONS — ex.: "Manutenção" → Fio a fio / Volume russo
-- --------------------------------------------------------------------------
CREATE TABLE public.service_variations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id        UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    position          INTEGER NOT NULL DEFAULT 0,
    name              TEXT NOT NULL,
    duration_minutes  INTEGER NOT NULL CHECK (duration_minutes BETWEEN 5 AND 720),
    price             NUMERIC(10,2) CHECK (price IS NULL OR price >= 0) -- NULL = "sob consulta"
);
CREATE INDEX service_variations_service_idx ON public.service_variations(service_id, position);

-- --------------------------------------------------------------------------
-- 4. CLIENTS — clientes do estúdio (sem conta; identidade = WhatsApp)
-- --------------------------------------------------------------------------
CREATE TABLE public.clients (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id         UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    name              TEXT NOT NULL,
    whatsapp          TEXT,
    -- Só dígitos, calculado pelo banco. O app grava o WhatsApp já normalizado
    -- (DDD + número, sem +55) para o mesmo número sempre dar o mesmo valor.
    whatsapp_digits   TEXT GENERATED ALWAYS AS (regexp_replace(coalesce(whatsapp, ''), '[^0-9]', '', 'g')) STORED,
    email             TEXT,
    birth_date        DATE,
    notes             TEXT,
    source            TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('booking', 'manual'))
);
-- Dedupe: uma cliente por WhatsApp em cada estúdio (trava também a corrida de
-- dois agendamentos simultâneos criando a mesma cliente — o app trata o 23505).
CREATE UNIQUE INDEX clients_studio_whatsapp_key ON public.clients(studio_id, whatsapp_digits)
    WHERE whatsapp_digits <> '';
CREATE INDEX clients_studio_name_idx ON public.clients(studio_id, lower(name));
CREATE TRIGGER clients_updated_at BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------
-- 5. CLIENT_RECORDS — ficha da cliente (1:1). Dado pessoal SENSÍVEL (LGPD):
--    só lido/gravado pelo servidor, só para a dona do estúdio.
-- --------------------------------------------------------------------------
CREATE TABLE public.client_records (
    client_id         UUID PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    technical         JSONB NOT NULL DEFAULT '{}'::jsonb, -- ficha técnica (campos definidos na F8)
    health            JSONB NOT NULL DEFAULT '{}'::jsonb, -- saúde e cuidados (campos definidos na F8)
    consent_at        TIMESTAMPTZ                          -- quando a cliente consentiu
);
CREATE TRIGGER client_records_updated_at BEFORE UPDATE ON public.client_records
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------
-- 6. APPOINTMENTS — agendamentos E atendimentos registrados à mão
--    origin: catalog (cliente agendou) · professional (ela marcou na agenda)
--            · record (atendimento passado lançado no histórico, sem horário)
-- --------------------------------------------------------------------------
CREATE TABLE public.appointments (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id         UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    -- RESTRICT: não dá para apagar uma cliente que tem histórico sem decidir
    -- antes o que fazer com ele (regra definida na F7).
    client_id         UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- `ends_at` é calculado pela aplicação (starts_at + soma das durações):
    -- timestamptz + interval não é IMMUTABLE e não pode entrar na trava abaixo.
    starts_at         TIMESTAMPTZ NOT NULL,
    ends_at           TIMESTAMPTZ NOT NULL,
    status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'confirmed', 'canceled', 'completed', 'no_show')),
    origin            TEXT NOT NULL DEFAULT 'catalog'
                      CHECK (origin IN ('catalog', 'professional', 'record')),
    total_price       NUMERIC(10,2) CHECK (total_price IS NULL OR total_price >= 0), -- soma dos itens
    amount_received   NUMERIC(10,2) CHECK (amount_received IS NULL OR amount_received >= 0),
    client_notes      TEXT,            -- o que a cliente escreveu ao agendar
    notes             TEXT,            -- anotação da profissional
    manage_token      TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'), -- link único da cliente
    canceled_at       TIMESTAMPTZ,
    canceled_by       TEXT CHECK (canceled_by IS NULL OR canceled_by IN ('client', 'professional')),
    cancel_reason     TEXT,
    CHECK (ends_at > starts_at),
    -- Trava de banco contra choque de horário: dois agendamentos ativos do
    -- mesmo estúdio não podem se sobrepor. Cancelados liberam o horário;
    -- registros de histórico (`record`) não ocupam agenda.
    CONSTRAINT appointments_no_overlap EXCLUDE USING gist (
        studio_id WITH =,
        tstzrange(starts_at, ends_at) WITH &&
    ) WHERE (status <> 'canceled' AND origin <> 'record')
);
CREATE INDEX appointments_studio_starts_idx ON public.appointments(studio_id, starts_at);
CREATE INDEX appointments_client_starts_idx ON public.appointments(client_id, starts_at DESC);
CREATE INDEX appointments_pending_idx ON public.appointments(studio_id, starts_at) WHERE status = 'pending';
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------
-- 7. APPOINTMENT_ITEMS — serviços de cada agendamento, com cópia do
--    nome/duração/preço do momento (editar/apagar o serviço depois não
--    altera o histórico)
-- --------------------------------------------------------------------------
CREATE TABLE public.appointment_items (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id    UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    position          INTEGER NOT NULL DEFAULT 0,
    service_id        UUID REFERENCES public.services(id) ON DELETE SET NULL,
    variation_id      UUID REFERENCES public.service_variations(id) ON DELETE SET NULL,
    title             TEXT NOT NULL,   -- "Manutenção — Volume russo"
    duration_minutes  INTEGER NOT NULL CHECK (duration_minutes BETWEEN 5 AND 720),
    price             NUMERIC(10,2) CHECK (price IS NULL OR price >= 0)
);
CREATE INDEX appointment_items_appointment_idx ON public.appointment_items(appointment_id, position);
CREATE INDEX appointment_items_service_idx ON public.appointment_items(service_id);

-- --------------------------------------------------------------------------
-- 8. BUSINESS_HOURS — grade semanal, VÁRIAS faixas por dia (pausa de almoço)
--    weekday: 0 = domingo … 6 = sábado
-- --------------------------------------------------------------------------
CREATE TABLE public.business_hours (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id         UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    weekday           SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    start_time        TIME NOT NULL,
    end_time          TIME NOT NULL,
    CHECK (end_time > start_time),
    -- Faixas do mesmo dia não podem se sobrepor (date + time = timestamp,
    -- imutável, então dá para usar na trava).
    CONSTRAINT business_hours_no_overlap EXCLUDE USING gist (
        studio_id WITH =,
        weekday WITH =,
        tsrange(DATE '2000-01-01' + start_time, DATE '2000-01-01' + end_time) WITH &&
    )
);
CREATE INDEX business_hours_studio_idx ON public.business_hours(studio_id, weekday, start_time);

-- --------------------------------------------------------------------------
-- 9. SCHEDULE_BLOCKS — folgas, férias, bloqueios parciais, "trancar horário"
-- --------------------------------------------------------------------------
CREATE TABLE public.schedule_blocks (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id         UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    start_date        DATE NOT NULL,
    end_date          DATE NOT NULL,
    all_day           BOOLEAN NOT NULL DEFAULT true,
    start_time        TIME,            -- só quando all_day = false
    end_time          TIME,
    reason            TEXT,
    CHECK (end_date >= start_date),
    CHECK (all_day OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time))
);
CREATE INDEX schedule_blocks_studio_idx ON public.schedule_blocks(studio_id, start_date, end_date);

-- --------------------------------------------------------------------------
-- 10. PUSH_SUBSCRIPTIONS — um registro por aparelho/navegador inscrito
-- --------------------------------------------------------------------------
CREATE TABLE public.push_subscriptions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id         UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    endpoint          TEXT NOT NULL,
    p256dh            TEXT NOT NULL,
    auth              TEXT NOT NULL,
    UNIQUE (studio_id, endpoint)
);

-- --------------------------------------------------------------------------
-- 11. CAKTO_EVENTS — log de todo webhook recebido (a Cakto não reenvia)
-- --------------------------------------------------------------------------
CREATE TABLE public.cakto_events (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    received_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    event             TEXT,
    cakto_order_id    TEXT,
    dedupe_key        TEXT,
    slug              TEXT,
    result            TEXT NOT NULL CHECK (result IN ('processed', 'ignored', 'rejected', 'error')),
    message           TEXT,
    payload           JSONB
);
CREATE INDEX cakto_events_dedupe_idx ON public.cakto_events(dedupe_key);
CREATE INDEX cakto_events_received_idx ON public.cakto_events(received_at DESC);

-- --------------------------------------------------------------------------
-- 12. RATE_LIMITS — limite de tentativas (prévia, agendamento, login do admin)
-- --------------------------------------------------------------------------
CREATE TABLE public.rate_limits (
    key               TEXT PRIMARY KEY,
    count             INTEGER NOT NULL DEFAULT 1,
    window_start      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key TEXT, p_max_hits INT, p_window_seconds INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INT;
BEGIN
    INSERT INTO public.rate_limits (key, count, window_start)
    VALUES (p_key, 1, now())
    ON CONFLICT (key) DO UPDATE SET
        count = CASE
            WHEN public.rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
                THEN 1
            ELSE public.rate_limits.count + 1
        END,
        window_start = CASE
            WHEN public.rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
                THEN now()
            ELSE public.rate_limits.window_start
        END
    RETURNING count INTO v_count;

    RETURN v_count <= p_max_hits;
END;
$$;

-- --------------------------------------------------------------------------
-- 12b. PREVIEW_LOG — instante de cada prévia criada (números do admin, F12.1)
--      As prévias vencidas são apagadas todo dia; este registro fica. Sem
--      dado da lead. Migração: docs/migrations/20261127_preview_log.sql
-- --------------------------------------------------------------------------
CREATE TABLE public.preview_log (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX preview_log_created_idx ON public.preview_log(created_at DESC);

-- --------------------------------------------------------------------------
-- 13. SEGURANÇA — RLS ligado sem policies + REVOKE de anon/authenticated
-- --------------------------------------------------------------------------
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'studios', 'services', 'service_variations', 'clients', 'client_records',
        'appointments', 'appointment_items', 'business_hours', 'schedule_blocks',
        'push_subscriptions', 'cakto_events', 'rate_limits', 'preview_log'
    ] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    END LOOP;
END;
$$;

-- Funções: só o servidor (service_role) pode chamar. Sem isso, o
-- check_rate_limit (SECURITY DEFINER) ficaria exposto via /rest/v1/rpc.
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INT) TO service_role;

-- --------------------------------------------------------------------------
-- 14. STORAGE — fotos do catálogo
--     Bucket público: as imagens abrem pela URL pública (/object/public/...),
--     que não depende de policy. Nenhuma policy em storage.objects → ninguém
--     lista, envia ou apaga arquivos pela API pública; upload só pelo servidor
--     (src/app/api/catalog/upload, que já valida tipo e tamanho).
-- --------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'catalog-assets', 'catalog-assets', true,
    8388608, -- 8 MB, mesmo limite da rota de upload
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
