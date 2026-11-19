-- =========================================================================
-- LASH AGENDA — SCHEMA COMPLETO PARA BANCO NOVO (v1.4 — consolidado)
-- =========================================================================
-- Consolida scripts/schema_definitivo.sql (v1.3) + todas as migrations
-- que ainda não estavam nele:
--   • migration_portal_token.sql           (coluna clientes.portal_token + RPC)
--   • migration_posthog_agendamento_criado.sql
--   • migration_posthog_eventos_adicionais.sql
-- As demais migrations (guest booking, login Google, trial 7 dias, dedup,
-- exige nome no match, índice único WhatsApp, escalonamento de privilégio)
-- já estão incorporadas na versão final de cada função abaixo.
--
-- COMO USAR
--   1. Substitua TODAS as ocorrências de  SEU_PROJECT_REF  pelo ref do seu
--      projeto novo (ex: abcdefghijklmnop — é o subdomínio da URL
--      https://abcdefghijklmnop.supabase.co). Aparece só na seção 8.
--   2. Cole o script inteiro no SQL Editor do Supabase e execute.
--   3. Faça os passos manuais listados no final do arquivo.
--
-- Pode ser executado mais de uma vez sem erro (idempotente).
-- =========================================================================


-- =========================================================================
-- 0. EXTENSÕES
-- =========================================================================
CREATE EXTENSION IF NOT EXISTS pg_net;


-- =========================================================================
-- 1. TABELAS
-- =========================================================================

-- Estabelecimentos (um por profissional — o "tenant" do SaaS)
CREATE TABLE IF NOT EXISTS public.estabelecimentos (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_negocio            TEXT        NOT NULL,
  slug                    TEXT        UNIQUE NOT NULL,
  plano                   TEXT        NOT NULL DEFAULT 'basico'
                          CHECK (plano IN ('basico', 'premium')),
  status_assinatura       TEXT        NOT NULL DEFAULT 'trial'
                          CHECK (status_assinatura IN ('trial', 'ativo', 'cancelado', 'suspenso')),
  billing_customer_id     TEXT,
  billing_subscription_id TEXT,
  trial_ends_at           TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT now()
);

-- Clientes (pertencentes a um estabelecimento)
CREATE TABLE IF NOT EXISTS public.clientes (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID        NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome               TEXT        NOT NULL,
  sobrenome          TEXT,
  email              TEXT,
  whatsapp           TEXT,
  data_nascimento    DATE,
  cpf                TEXT,
  endereco           TEXT,
  observacoes        TEXT,
  alergias           TEXT,
  medicamentos       TEXT,
  doencas_cronicas   TEXT,
  gestante           BOOLEAN     DEFAULT false,
  anamnese_lash      JSONB       DEFAULT '{}'::jsonb,
  -- Token permanente usado para reabrir o app instalado (PWA) direto no
  -- portal da cliente, sem login (rota /portal/:slug/app/:token)
  portal_token       UUID        NOT NULL DEFAULT gen_random_uuid(),
  created_at         TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT clientes_portal_token_key UNIQUE (portal_token)
);

-- Impede duas clientes com o mesmo WhatsApp (só dígitos) no mesmo
-- estabelecimento — protege contra corrida no cadastro por convidada.
CREATE UNIQUE INDEX IF NOT EXISTS clientes_estabelecimento_whatsapp_digits_key
  ON public.clientes (estabelecimento_id, regexp_replace(whatsapp, '[^0-9]', '', 'g'))
  WHERE whatsapp IS NOT NULL;

-- Usuários (profissionais e clientes autenticados)
CREATE TABLE IF NOT EXISTS public.usuarios (
  id                        UUID        PRIMARY KEY,  -- mesmo ID do auth.users
  estabelecimento_id        UUID        NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome                      TEXT        NOT NULL,
  email                     TEXT        UNIQUE NOT NULL,
  avatar_url                TEXT,
  telefone                  TEXT,
  onboarding_paginas_vistas TEXT[]      DEFAULT '{}',
  role                      TEXT        NOT NULL DEFAULT 'cliente'
                            CHECK (role IN ('profissional', 'cliente')),
  cliente_id                UUID        REFERENCES public.clientes(id),
  created_at                TIMESTAMPTZ DEFAULT now()
);

-- Categorias de Serviço (legado — não usado mais no app, mantido por compatibilidade)
CREATE TABLE IF NOT EXISTS public.categorias_servico (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID        NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome               TEXT        NOT NULL,
  descricao          TEXT,
  ordem              INTEGER     DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT now()
);

-- Serviços
CREATE TABLE IF NOT EXISTS public.servicos (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID          NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  categoria_id       UUID          REFERENCES public.categorias_servico(id) ON DELETE SET NULL,
  nome               TEXT          NOT NULL,
  descricao          TEXT,
  duracao_minutos    INTEGER       NOT NULL DEFAULT 60,
  valor              NUMERIC(10,2) NOT NULL DEFAULT 0,
  ativo              BOOLEAN       DEFAULT true,
  imagem_url         TEXT,
  created_at         TIMESTAMPTZ   DEFAULT now()
);

-- Variações de Serviço
CREATE TABLE IF NOT EXISTS public.variacoes_servico (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  servico_id      UUID          NOT NULL REFERENCES public.servicos(id) ON DELETE CASCADE,
  nome            TEXT          NOT NULL,
  duracao_minutos INTEGER,
  valor           NUMERIC(10,2),
  created_at      TIMESTAMPTZ   DEFAULT now()
);

-- Horários de Atendimento
CREATE TABLE IF NOT EXISTS public.horarios_atendimento (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID        NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  dia_semana         INTEGER     NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio        TIME        NOT NULL,
  hora_fim           TIME        NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_dia_semana_estabelecimento UNIQUE (estabelecimento_id, dia_semana)
);

-- Bloqueios de Agenda
CREATE TABLE IF NOT EXISTS public.bloqueios_agenda (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID        NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  data_inicio        DATE        NOT NULL,
  data_fim           DATE        NOT NULL,
  motivo             TEXT,
  dia_inteiro        BOOLEAN     DEFAULT true,
  hora_inicio        TIME,       -- só quando dia_inteiro = false
  hora_fim           TIME,       -- só quando dia_inteiro = false
  created_at         TIMESTAMPTZ DEFAULT now()
);

-- Agendamentos ('falta' = no-show)
CREATE TABLE IF NOT EXISTS public.agendamentos (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID          NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  cliente_id         UUID          NOT NULL REFERENCES public.clientes(id),
  data_hora          TIMESTAMPTZ   NOT NULL,
  duracao_minutos    INTEGER       NOT NULL,
  status             TEXT          NOT NULL DEFAULT 'pendente'
                     CHECK (status IN ('pendente', 'confirmado', 'cancelado', 'concluido', 'falta')),
  origem             TEXT          DEFAULT 'admin' CHECK (origem IN ('admin', 'portal')),
  observacoes        TEXT,
  valor_cobrado      NUMERIC(10,2),
  created_at         TIMESTAMPTZ   DEFAULT now()
);

-- Serviços de cada Agendamento
CREATE TABLE IF NOT EXISTS public.agendamento_servicos (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id UUID          NOT NULL REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  servico_id     UUID          NOT NULL REFERENCES public.servicos(id),
  variacao_id    UUID          REFERENCES public.variacoes_servico(id),
  valor_cobrado  NUMERIC(10,2),
  created_at     TIMESTAMPTZ   DEFAULT now()
);

-- Atendimentos manuais
CREATE TABLE IF NOT EXISTS public.atendimentos (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID          NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  cliente_id         UUID          NOT NULL REFERENCES public.clientes(id),
  servico_id         UUID          NOT NULL REFERENCES public.servicos(id),
  variacao_id        UUID          REFERENCES public.variacoes_servico(id),
  data_atendimento   DATE          NOT NULL,
  valor_cobrado      NUMERIC(10,2) NOT NULL,
  observacoes        TEXT,
  created_at         TIMESTAMPTZ   DEFAULT now()
);

-- Configurações do Negócio
CREATE TABLE IF NOT EXISTS public.configuracao_negocio (
  id                              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id              UUID        NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome_negocio                    TEXT        NOT NULL DEFAULT 'Meu Studio',
  descricao                       TEXT,
  instagram                       TEXT,
  endereco                        TEXT,
  logo_url                        TEXT,
  aprovacao_automatica            BOOLEAN     DEFAULT false,
  antecedencia_cancelamento_horas INTEGER     DEFAULT 24,
  mensagem_pos_agendamento        TEXT        DEFAULT 'Seu agendamento foi recebido! Aguarde a confirmação.',
  paleta_cores                    TEXT        DEFAULT 'pink_classico',
  modo_escuro                     BOOLEAN     DEFAULT false,
  created_at                      TIMESTAMPTZ DEFAULT now()
);

-- Logs de Auditoria
CREATE TABLE IF NOT EXISTS public.logs (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID        NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  usuario_id         UUID        REFERENCES public.usuarios(id) ON DELETE SET NULL,
  acao               TEXT        NOT NULL,
  detalhes           JSONB,
  created_at         TIMESTAMPTZ DEFAULT now()
);

-- Subscriptions de Push Notifications (Web Push)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  estabelecimento_id UUID        NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  endpoint           TEXT        NOT NULL,
  p256dh             TEXT        NOT NULL,
  auth               TEXT        NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, endpoint)
);


-- =========================================================================
-- 2. FUNÇÕES AUXILIARES DE SEGURANÇA (SECURITY DEFINER — evita recursão RLS)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.usuarios WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_auth_user_establishment()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid();
$$;


-- =========================================================================
-- 3. FUNÇÕES RPC (chamadas pelo frontend)
-- =========================================================================

-- Horários já ocupados num dia (portal de agendamento)
CREATE OR REPLACE FUNCTION public.get_slots_ocupados(
  p_estabelecimento_id UUID,
  p_data               DATE
)
RETURNS TABLE (data_hora TIMESTAMPTZ, duracao_minutos INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.data_hora, a.duracao_minutos
  FROM public.agendamentos a
  WHERE a.estabelecimento_id = p_estabelecimento_id
    AND a.data_hora::date = p_data
    AND a.status NOT IN ('cancelado', 'falta');
$$;

GRANT EXECUTE ON FUNCTION public.get_slots_ocupados(UUID, DATE) TO anon, authenticated;

-- Reconecta a cliente ao cadastro existente (match por email, ou WhatsApp +
-- nome completo). Garante que a versão antiga de 3 parâmetros não exista.
DROP FUNCTION IF EXISTS public.get_cliente_id_by_email_or_whatsapp(TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.get_cliente_id_by_email_or_whatsapp(
  p_email              TEXT,
  p_whatsapp_digits    TEXT,
  p_estabelecimento_id UUID,
  p_nome               TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- 1ª tentativa: match por email
  SELECT id INTO v_id
  FROM public.clientes
  WHERE LOWER(email) = LOWER(p_email)
    AND estabelecimento_id = p_estabelecimento_id
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  -- 2ª tentativa: WhatsApp (só dígitos) + nome completo, quando sem email
  SELECT c.id INTO v_id
  FROM public.clientes c
  WHERE REGEXP_REPLACE(c.whatsapp, '[^0-9]', '', 'g') = p_whatsapp_digits
    AND c.estabelecimento_id = p_estabelecimento_id
    AND (c.email IS NULL OR c.email = '')
    AND LOWER(TRIM(CONCAT_WS(' ', c.nome, c.sobrenome))) = LOWER(TRIM(p_nome))
  LIMIT 1;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cliente_id_by_email_or_whatsapp(TEXT, TEXT, UUID, TEXT) TO anon, authenticated;

-- Sincroniza o email da cliente quando o cadastro manual não tinha email
CREATE OR REPLACE FUNCTION public.sync_cliente_email(
  p_cliente_id UUID,
  p_email      TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.clientes
  SET email = p_email
  WHERE id = p_cliente_id
    AND (email IS NULL OR email = '');
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_cliente_email(UUID, TEXT) TO anon, authenticated;

-- Dados públicos da profissional no portal (nome e telefone)
CREATE OR REPLACE FUNCTION public.get_portal_profissional_info(p_estabelecimento_id UUID)
RETURNS TABLE(nome TEXT, telefone TEXT)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nome, telefone
  FROM public.usuarios
  WHERE estabelecimento_id = p_estabelecimento_id
    AND role = 'profissional'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_portal_profissional_info(UUID) TO anon, authenticated;

-- Valida o portal_token e devolve os dados pra reabrir a sessão da cliente
CREATE OR REPLACE FUNCTION public.get_cliente_by_portal_token(
  p_slug  TEXT,
  p_token UUID
)
RETURNS TABLE(cliente_id UUID, nome TEXT, estabelecimento_id UUID)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.nome, c.estabelecimento_id
  FROM public.clientes c
  JOIN public.estabelecimentos e ON e.id = c.estabelecimento_id
  WHERE c.portal_token = p_token
    AND e.slug = p_slug
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_cliente_by_portal_token(TEXT, UUID) TO anon, authenticated;


-- =========================================================================
-- 4. TRIGGER DE ONBOARDING AUTOMÁTICO (AFTER INSERT em auth.users)
-- =========================================================================
-- Profissional: cria estabelecimento (trial 7 dias), usuário, configuração,
-- 2 serviços de exemplo e horários Seg–Sex 09–18.
-- Cliente (inclusive convidada anônima): cria o registro em usuarios
-- vinculado ao cliente já existente.
-- Obs: os serviços de exemplo são criados SEM imagem — as imagens padrão
-- ficavam no storage do projeto antigo. Para voltar a ter imagem, suba os
-- arquivos em servicos-imagens/defaults/ e preencha imagem_url aqui.

CREATE OR REPLACE FUNCTION public.handle_new_user_onboarding()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_est_id   UUID;
  negocio_nome TEXT;
  negocio_slug TEXT;
  user_role    TEXT;
  client_uuid  UUID;
BEGIN
  -- Login com Google não fornece nome_negocio nem slug — usa o nome da conta
  -- Google como nome provisório (renomeável em Configurações).
  negocio_nome := COALESCE(
    new.raw_user_meta_data ->> 'nome_negocio',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    'Meu Estúdio'
  );
  negocio_slug := new.raw_user_meta_data ->> 'slug';
  user_role    := COALESCE(new.raw_user_meta_data ->> 'role', 'profissional');

  IF user_role = 'profissional' THEN

    -- 1. Estabelecimento com trial de 7 dias no plano Agenda (basico)
    INSERT INTO public.estabelecimentos (nome_negocio, slug, plano, status_assinatura, trial_ends_at)
    VALUES (
      negocio_nome,
      COALESCE(negocio_slug, lower(regexp_replace(negocio_nome, '[^a-zA-Z0-9]', '-', 'g'))),
      'basico',
      'trial',
      now() + INTERVAL '7 days'
    )
    RETURNING id INTO new_est_id;

    -- 2. Usuário profissional
    INSERT INTO public.usuarios (id, nome, email, role, estabelecimento_id)
    VALUES (new.id, negocio_nome, new.email, 'profissional', new_est_id);

    -- 3. Configurações padrão
    INSERT INTO public.configuracao_negocio (estabelecimento_id, nome_negocio)
    VALUES (new_est_id, negocio_nome);

    -- 4. 2 serviços de exemplo (categoria_id NULL — categorias não são mais usadas)
    INSERT INTO public.servicos (estabelecimento_id, nome, descricao, duracao_minutos, valor, ativo, imagem_url)
    VALUES
      (new_est_id, 'Fio a Fio Clássico', 'Um fio sintético acoplado a cada cílio natural. Efeito natural e discreto para o dia a dia.', 120, 150.00, true, NULL),
      (new_est_id, 'Volume Russo', 'Fans artesanais de 3 a 6 fios super finos aplicados em cada cílio. Efeito volumoso, denso e marcante.', 150, 200.00, true, NULL);

    -- 5. Horários padrão (Seg–Sex, 09:00–18:00)
    INSERT INTO public.horarios_atendimento (estabelecimento_id, dia_semana, hora_inicio, hora_fim)
    VALUES
      (new_est_id, 1, '09:00', '18:00'),
      (new_est_id, 2, '09:00', '18:00'),
      (new_est_id, 3, '09:00', '18:00'),
      (new_est_id, 4, '09:00', '18:00'),
      (new_est_id, 5, '09:00', '18:00')
    ON CONFLICT (estabelecimento_id, dia_semana) DO NOTHING;

  ELSIF user_role = 'cliente' THEN

    client_uuid := (new.raw_user_meta_data ->> 'cliente_id')::UUID;

    -- Contas anônimas não têm e-mail — gera um e-mail sintético único para
    -- satisfazer UNIQUE NOT NULL em usuarios.email.
    INSERT INTO public.usuarios (id, nome, email, role, cliente_id, estabelecimento_id)
    VALUES (
      new.id,
      new.raw_user_meta_data ->> 'nome',
      COALESCE(new.email, 'guest_' || new.id::text || '@guests.lashagenda.internal'),
      'cliente',
      client_uuid,
      (new.raw_user_meta_data ->> 'estabelecimento_id')::UUID
    );

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_onboarding();


-- =========================================================================
-- 5. TRAVA DE ESCALONAMENTO DE PRIVILÉGIO EM usuarios
-- =========================================================================
-- Impede que uma sessão de cliente (inclusive convidada anônima) troque o
-- próprio role/estabelecimento_id/cliente_id e vire profissional.

CREATE OR REPLACE FUNCTION public.restringir_update_usuario_por_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'cliente' THEN
    IF NEW.role IS DISTINCT FROM OLD.role
    OR NEW.estabelecimento_id IS DISTINCT FROM OLD.estabelecimento_id
    OR NEW.cliente_id IS DISTINCT FROM OLD.cliente_id
    OR NEW.id IS DISTINCT FROM OLD.id
    THEN
      RAISE EXCEPTION 'Não é permitido alterar esses campos por autoatendimento.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restringir_update_usuario ON public.usuarios;
CREATE TRIGGER trg_restringir_update_usuario
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.restringir_update_usuario_por_role();


-- =========================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =========================================================================

ALTER TABLE public.estabelecimentos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_servico   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variacoes_servico    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios_atendimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bloqueios_agenda     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamento_servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atendimentos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracao_negocio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions   ENABLE ROW LEVEL SECURITY;

-- ESTABELECIMENTOS -------------------------------------------------------
DROP POLICY IF EXISTS "estabelecimentos_anon_select" ON public.estabelecimentos;
CREATE POLICY "estabelecimentos_anon_select"
  ON public.estabelecimentos FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "estabelecimentos_profissional" ON public.estabelecimentos;
CREATE POLICY "estabelecimentos_profissional"
  ON public.estabelecimentos FOR ALL TO authenticated
  USING (id = public.get_auth_user_establishment())
  WITH CHECK (id = public.get_auth_user_establishment());

-- USUARIOS ---------------------------------------------------------------
DROP POLICY IF EXISTS "usuarios_select" ON public.usuarios;
CREATE POLICY "usuarios_select"
  ON public.usuarios FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (public.get_auth_user_role() = 'profissional'
        AND estabelecimento_id = public.get_auth_user_establishment())
  );

DROP POLICY IF EXISTS "usuarios_insert" ON public.usuarios;
CREATE POLICY "usuarios_insert"
  ON public.usuarios FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "usuarios_update" ON public.usuarios;
CREATE POLICY "usuarios_update"
  ON public.usuarios FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- CLIENTES ---------------------------------------------------------------
DROP POLICY IF EXISTS "clientes_profissional" ON public.clientes;
CREATE POLICY "clientes_profissional"
  ON public.clientes FOR ALL TO authenticated
  USING (
    estabelecimento_id = public.get_auth_user_establishment()
    AND public.get_auth_user_role() = 'profissional'
  )
  WITH CHECK (
    estabelecimento_id = public.get_auth_user_establishment()
    AND public.get_auth_user_role() = 'profissional'
  );

DROP POLICY IF EXISTS "clientes_self_select" ON public.clientes;
CREATE POLICY "clientes_self_select"
  ON public.clientes FOR SELECT TO authenticated
  USING (
    id = (SELECT cliente_id FROM public.usuarios WHERE id = auth.uid())
    AND public.get_auth_user_role() = 'cliente'
  );

DROP POLICY IF EXISTS "clientes_self_update" ON public.clientes;
CREATE POLICY "clientes_self_update"
  ON public.clientes FOR UPDATE TO authenticated
  USING (
    id = (SELECT cliente_id FROM public.usuarios WHERE id = auth.uid())
    AND public.get_auth_user_role() = 'cliente'
  )
  WITH CHECK (
    id = (SELECT cliente_id FROM public.usuarios WHERE id = auth.uid())
    AND public.get_auth_user_role() = 'cliente'
  );

DROP POLICY IF EXISTS "clientes_anon_insert" ON public.clientes;
CREATE POLICY "clientes_anon_insert"
  ON public.clientes FOR INSERT TO anon
  WITH CHECK (true);

-- CATEGORIAS DE SERVIÇO --------------------------------------------------
DROP POLICY IF EXISTS "categorias_public_select" ON public.categorias_servico;
CREATE POLICY "categorias_public_select"
  ON public.categorias_servico FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "categorias_profissional_write" ON public.categorias_servico;
CREATE POLICY "categorias_profissional_write"
  ON public.categorias_servico FOR ALL TO authenticated
  USING (
    estabelecimento_id = public.get_auth_user_establishment()
    AND public.get_auth_user_role() = 'profissional'
  )
  WITH CHECK (
    estabelecimento_id = public.get_auth_user_establishment()
    AND public.get_auth_user_role() = 'profissional'
  );

-- SERVIÇOS ---------------------------------------------------------------
DROP POLICY IF EXISTS "servicos_public_select" ON public.servicos;
CREATE POLICY "servicos_public_select"
  ON public.servicos FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "servicos_profissional_write" ON public.servicos;
CREATE POLICY "servicos_profissional_write"
  ON public.servicos FOR ALL TO authenticated
  USING (
    estabelecimento_id = public.get_auth_user_establishment()
    AND public.get_auth_user_role() = 'profissional'
  )
  WITH CHECK (
    estabelecimento_id = public.get_auth_user_establishment()
    AND public.get_auth_user_role() = 'profissional'
  );

-- VARIAÇÕES DE SERVIÇO ---------------------------------------------------
DROP POLICY IF EXISTS "variacoes_public_select" ON public.variacoes_servico;
CREATE POLICY "variacoes_public_select"
  ON public.variacoes_servico FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "variacoes_profissional_write" ON public.variacoes_servico;
CREATE POLICY "variacoes_profissional_write"
  ON public.variacoes_servico FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.servicos s
      WHERE s.id = servico_id
        AND s.estabelecimento_id = public.get_auth_user_establishment()
    )
    AND public.get_auth_user_role() = 'profissional'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.servicos s
      WHERE s.id = servico_id
        AND s.estabelecimento_id = public.get_auth_user_establishment()
    )
    AND public.get_auth_user_role() = 'profissional'
  );

-- HORÁRIOS DE ATENDIMENTO ------------------------------------------------
DROP POLICY IF EXISTS "horarios_public_select" ON public.horarios_atendimento;
CREATE POLICY "horarios_public_select"
  ON public.horarios_atendimento FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "horarios_profissional_write" ON public.horarios_atendimento;
CREATE POLICY "horarios_profissional_write"
  ON public.horarios_atendimento FOR ALL TO authenticated
  USING (
    estabelecimento_id = public.get_auth_user_establishment()
    AND public.get_auth_user_role() = 'profissional'
  )
  WITH CHECK (
    estabelecimento_id = public.get_auth_user_establishment()
    AND public.get_auth_user_role() = 'profissional'
  );

-- BLOQUEIOS DE AGENDA ----------------------------------------------------
DROP POLICY IF EXISTS "bloqueios_public_select" ON public.bloqueios_agenda;
CREATE POLICY "bloqueios_public_select"
  ON public.bloqueios_agenda FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "bloqueios_profissional_write" ON public.bloqueios_agenda;
CREATE POLICY "bloqueios_profissional_write"
  ON public.bloqueios_agenda FOR ALL TO authenticated
  USING (
    estabelecimento_id = public.get_auth_user_establishment()
    AND public.get_auth_user_role() = 'profissional'
  )
  WITH CHECK (
    estabelecimento_id = public.get_auth_user_establishment()
    AND public.get_auth_user_role() = 'profissional'
  );

-- CONFIGURAÇÃO DO NEGÓCIO ------------------------------------------------
DROP POLICY IF EXISTS "config_public_select" ON public.configuracao_negocio;
CREATE POLICY "config_public_select"
  ON public.configuracao_negocio FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "config_profissional_write" ON public.configuracao_negocio;
CREATE POLICY "config_profissional_write"
  ON public.configuracao_negocio FOR ALL TO authenticated
  USING (
    estabelecimento_id = public.get_auth_user_establishment()
    AND public.get_auth_user_role() = 'profissional'
  )
  WITH CHECK (
    estabelecimento_id = public.get_auth_user_establishment()
    AND public.get_auth_user_role() = 'profissional'
  );

-- AGENDAMENTOS -----------------------------------------------------------
DROP POLICY IF EXISTS "agendamentos_profissional" ON public.agendamentos;
CREATE POLICY "agendamentos_profissional"
  ON public.agendamentos FOR ALL TO authenticated
  USING (
    estabelecimento_id = public.get_auth_user_establishment()
    AND public.get_auth_user_role() = 'profissional'
  )
  WITH CHECK (
    estabelecimento_id = public.get_auth_user_establishment()
    AND public.get_auth_user_role() = 'profissional'
  );

DROP POLICY IF EXISTS "agendamentos_cliente_select" ON public.agendamentos;
CREATE POLICY "agendamentos_cliente_select"
  ON public.agendamentos FOR SELECT TO authenticated
  USING (
    cliente_id = (SELECT cliente_id FROM public.usuarios WHERE id = auth.uid())
    AND public.get_auth_user_role() = 'cliente'
  );

DROP POLICY IF EXISTS "agendamentos_cliente_insert" ON public.agendamentos;
CREATE POLICY "agendamentos_cliente_insert"
  ON public.agendamentos FOR INSERT TO authenticated
  WITH CHECK (
    cliente_id = (SELECT cliente_id FROM public.usuarios WHERE id = auth.uid())
    AND public.get_auth_user_role() = 'cliente'
  );

DROP POLICY IF EXISTS "agendamentos_cliente_update" ON public.agendamentos;
CREATE POLICY "agendamentos_cliente_update"
  ON public.agendamentos FOR UPDATE TO authenticated
  USING (
    cliente_id = (SELECT cliente_id FROM public.usuarios WHERE id = auth.uid())
    AND public.get_auth_user_role() = 'cliente'
  )
  WITH CHECK (
    cliente_id = (SELECT cliente_id FROM public.usuarios WHERE id = auth.uid())
    AND public.get_auth_user_role() = 'cliente'
  );

-- AGENDAMENTO_SERVICOS ---------------------------------------------------
DROP POLICY IF EXISTS "agendamento_servicos_profissional" ON public.agendamento_servicos;
CREATE POLICY "agendamento_servicos_profissional"
  ON public.agendamento_servicos FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agendamentos a
      WHERE a.id = agendamento_id
        AND a.estabelecimento_id = public.get_auth_user_establishment()
    )
    AND public.get_auth_user_role() = 'profissional'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agendamentos a
      WHERE a.id = agendamento_id
        AND a.estabelecimento_id = public.get_auth_user_establishment()
    )
    AND public.get_auth_user_role() = 'profissional'
  );

DROP POLICY IF EXISTS "agendamento_servicos_cliente" ON public.agendamento_servicos;
CREATE POLICY "agendamento_servicos_cliente"
  ON public.agendamento_servicos FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agendamentos a
      WHERE a.id = agendamento_id
        AND a.cliente_id = (SELECT cliente_id FROM public.usuarios WHERE id = auth.uid())
    )
    AND public.get_auth_user_role() = 'cliente'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agendamentos a
      WHERE a.id = agendamento_id
        AND a.cliente_id = (SELECT cliente_id FROM public.usuarios WHERE id = auth.uid())
    )
    AND public.get_auth_user_role() = 'cliente'
  );

-- ATENDIMENTOS -----------------------------------------------------------
DROP POLICY IF EXISTS "atendimentos_profissional" ON public.atendimentos;
CREATE POLICY "atendimentos_profissional"
  ON public.atendimentos FOR ALL TO authenticated
  USING (
    estabelecimento_id = public.get_auth_user_establishment()
    AND public.get_auth_user_role() = 'profissional'
  )
  WITH CHECK (
    estabelecimento_id = public.get_auth_user_establishment()
    AND public.get_auth_user_role() = 'profissional'
  );

-- LOGS -------------------------------------------------------------------
DROP POLICY IF EXISTS "logs_profissional_select" ON public.logs;
CREATE POLICY "logs_profissional_select"
  ON public.logs FOR SELECT TO authenticated
  USING (
    estabelecimento_id = public.get_auth_user_establishment()
    AND public.get_auth_user_role() = 'profissional'
  );

DROP POLICY IF EXISTS "logs_profissional_insert" ON public.logs;
CREATE POLICY "logs_profissional_insert"
  ON public.logs FOR INSERT TO authenticated
  WITH CHECK (
    usuario_id = auth.uid()
    AND public.get_auth_user_role() = 'profissional'
  );

-- PUSH SUBSCRIPTIONS -----------------------------------------------------
DROP POLICY IF EXISTS "usuario_own_subscriptions" ON public.push_subscriptions;
CREATE POLICY "usuario_own_subscriptions"
  ON public.push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- =========================================================================
-- 7. STORAGE — BUCKETS E POLICIES
-- =========================================================================

-- Avatares de usuários e logos de estúdio
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_public_access" ON storage.objects;
CREATE POLICY "avatars_public_access"
  ON storage.objects FOR ALL TO public
  USING (bucket_id = 'avatars')
  WITH CHECK (bucket_id = 'avatars');

-- Imagens dos serviços
INSERT INTO storage.buckets (id, name, public)
VALUES ('servicos-imagens', 'servicos-imagens', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "servicos_imagens_public_access" ON storage.objects;
CREATE POLICY "servicos_imagens_public_access"
  ON storage.objects FOR ALL TO public
  USING (bucket_id = 'servicos-imagens')
  WITH CHECK (bucket_id = 'servicos-imagens');


-- =========================================================================
-- 8. TRIGGERS HTTP (pg_net) — Web Push e PostHog
-- =========================================================================

-- 8a. Web Push: chama a Edge Function send-push quando a cliente agenda
--     pelo portal. >>> Troque SEU_PROJECT_REF pelo ref do projeto novo. <<<
--     O secret abaixo foi gerado novo — configure o MESMO valor como
--     WEBHOOK_SECRET nos secrets das Edge Functions.
CREATE OR REPLACE FUNCTION public.notify_new_agendamento()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status IN ('pendente', 'confirmado') AND NEW.origem = 'portal' THEN
    PERFORM net.http_post(
      url     := 'https://SEU_PROJECT_REF.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', 'SEU_WEBHOOK_SECRET'
      ),
      body    := jsonb_build_object('record', row_to_json(NEW))
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_agendamento_insert ON public.agendamentos;
CREATE TRIGGER on_agendamento_insert
  AFTER INSERT ON public.agendamentos
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_agendamento();

-- 8b. PostHog: agendamento_criado (distinct_id = estabelecimento_id)
CREATE OR REPLACE FUNCTION public.notify_posthog_agendamento()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://us.i.posthog.com/capture/',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := jsonb_build_object(
      'api_key', 'phc_quN9tH5AsE9pdF9WqMTYa9rxvrytiUC7oFtBsy9YSgX9',
      'event', 'agendamento_criado',
      'distinct_id', NEW.estabelecimento_id::text,
      'properties', jsonb_build_object(
        'origem', NEW.origem,
        'agendamento_id', NEW.id,
        'valor_cobrado', NEW.valor_cobrado
      )
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_agendamento_insert_posthog ON public.agendamentos;
CREATE TRIGGER on_agendamento_insert_posthog
  AFTER INSERT ON public.agendamentos
  FOR EACH ROW EXECUTE FUNCTION public.notify_posthog_agendamento();

-- 8c. PostHog: agendamento_cancelado
CREATE OR REPLACE FUNCTION public.notify_posthog_agendamento_cancelado()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'cancelado' AND OLD.status IS DISTINCT FROM 'cancelado' THEN
    PERFORM net.http_post(
      url     := 'https://us.i.posthog.com/capture/',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body    := jsonb_build_object(
        'api_key', 'phc_quN9tH5AsE9pdF9WqMTYa9rxvrytiUC7oFtBsy9YSgX9',
        'event', 'agendamento_cancelado',
        'distinct_id', NEW.estabelecimento_id::text,
        'properties', jsonb_build_object(
          'agendamento_id', NEW.id,
          'valor_cobrado', NEW.valor_cobrado
        )
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_agendamento_update_posthog_cancelado ON public.agendamentos;
CREATE TRIGGER on_agendamento_update_posthog_cancelado
  AFTER UPDATE ON public.agendamentos
  FOR EACH ROW EXECUTE FUNCTION public.notify_posthog_agendamento_cancelado();

-- 8d. PostHog: assinatura_ativada / plano_upgrade
CREATE OR REPLACE FUNCTION public.notify_posthog_estabelecimento_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status_assinatura = 'ativo' AND OLD.status_assinatura = 'trial' THEN
    PERFORM net.http_post(
      url     := 'https://us.i.posthog.com/capture/',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body    := jsonb_build_object(
        'api_key', 'phc_quN9tH5AsE9pdF9WqMTYa9rxvrytiUC7oFtBsy9YSgX9',
        'event', 'assinatura_ativada',
        'distinct_id', NEW.id::text,
        'properties', jsonb_build_object('plano', NEW.plano)
      )
    );
  END IF;

  IF NEW.plano = 'premium' AND OLD.plano = 'basico' THEN
    PERFORM net.http_post(
      url     := 'https://us.i.posthog.com/capture/',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body    := jsonb_build_object(
        'api_key', 'phc_quN9tH5AsE9pdF9WqMTYa9rxvrytiUC7oFtBsy9YSgX9',
        'event', 'plano_upgrade',
        'distinct_id', NEW.id::text,
        'properties', jsonb_build_object('status_assinatura', NEW.status_assinatura)
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_estabelecimento_update_posthog ON public.estabelecimentos;
CREATE TRIGGER on_estabelecimento_update_posthog
  AFTER UPDATE ON public.estabelecimentos
  FOR EACH ROW EXECUTE FUNCTION public.notify_posthog_estabelecimento_update();


-- =========================================================================
-- FIM DO SCRIPT — PASSOS MANUAIS NO PAINEL DO SUPABASE
-- =========================================================================
--  • Authentication → Sign In / Providers:
--      - Email (com ou sem confirmação, como preferir)
--      - Anonymous Sign-ins: HABILITAR (agendamento como convidada)
--      - Google: habilitar + Client ID/Secret (se usar login com Google)
--  • Authentication → URL Configuration: Site URL e Redirect URLs
--    (ex: http://localhost:5173/** e a URL de produção /**)
--  • Edge Functions (opcional): deploy das functions em supabase/functions
--    e secrets WEBHOOK_SECRET, VAPID_*, ASAAS_*, TELEGRAM_*, SB_SERVICE_ROLE_KEY
--  • Database → Webhooks (opcional, Telegram): INSERT em public.usuarios →
--    Edge Function notify-new-professional
-- =========================================================================
