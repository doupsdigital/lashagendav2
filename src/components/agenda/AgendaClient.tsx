'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus, Lock, ChevronDown } from 'lucide-react';
import type { Step } from 'react-joyride';
import { ProductTour } from '@/components/tour/ProductTour';
import { AppointmentRow } from './AppointmentRow';
import { ManualBookingForm } from './ManualBookingForm';
import { BlockSlotForm } from './BlockSlotForm';
import { BlockDetailSheet, SlotChoiceSheet } from './SlotSheets';
import { DayTimeline } from './DayTimeline';
import { MonthCalendar } from './MonthCalendar';
import { AppointmentDetailSheet, type RescheduleResult } from './AppointmentDetailSheet';
import type { SheetHighlight } from '@/lib/clients/client-sheet-service';
import { ApproveModal } from './ApproveModal';
import { RejectModal } from './RejectModal';
import { SuccessModal, type SuccessModalRow } from './SuccessModal';
import type { AgendaAppointment, ManualBookingService, StudioClientOption } from '@/lib/scheduling/agenda-service';
import type { BusinessHoursConfigRow, ScheduleBlockConfigRow } from '@/lib/scheduling/config-service';
import { buildConfirmMessage, buildRejectMessage, buildRescheduleMessage, cleanCancelReason } from '@/lib/scheduling/appointment-actions';
import { localDateTimeToUTC } from '@/lib/scheduling/availability';
import { manageAppointmentPath } from '@/lib/scheduling/client-appointment';
import { publicCatalogUrl } from '@/lib/public-url';

/** Link do WhatsApp para avisar a cliente (F6.3): a confirmação leva o link
 *  único dela (ver/cancelar); a recusa leva o motivo e o catálogo para ela
 *  escolher outro horário. Só no navegador (usa o host atual). */
function buildWhatsappLink(
  appointment: AgendaAppointment,
  slug: string,
  tipo: 'aprovado' | 'recusado' | 'remarcado',
  motivo?: string,
  /** Remarcar: o novo horário (o agendamento ainda tem o antigo). */
  newStartsAt?: Date
): string {
  const startsAt = newStartsAt || new Date(appointment.starts_at);
  const dateLabel = startsAt.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' });
  const time = startsAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  const input = { clientName: appointment.client_name, dateLabel, time, services: appointment.service_title };
  const manageUrl = `${window.location.origin}${manageAppointmentPath(slug, appointment.manage_token)}`;
  const msg =
    tipo === 'aprovado'
      ? buildConfirmMessage({ ...input, manageUrl })
      : tipo === 'remarcado'
        ? buildRescheduleMessage({ ...input, manageUrl })
        : buildRejectMessage({ ...input, reason: cleanCancelReason(motivo), catalogUrl: publicCatalogUrl(slug, window.location) });
  return `https://wa.me/${appointment.client_whatsapp}?text=${encodeURIComponent(msg)}`;
}

// Tour guiado da Agenda (Fase 20) — só monta quando `AgendaClient` existe,
// que já só acontece com `booking_enabled` true (a página devolve o upsell
// de tela cheia antes disso), então não precisa de gate próprio aqui.
const AGENDA_TOUR_STEPS: Step[] = [
  { target: '[data-tour="agenda-date-nav"]', title: 'Navegue pelos dias', content: 'Vá pro dia anterior/seguinte ou volte pra hoje por aqui.' },
  { target: '[data-tour="agenda-new"]', title: 'Novo agendamento', content: 'Crie um agendamento manual pra uma cliente que te chamou por fora.' },
  { target: '[data-tour="agenda-block"]', title: 'Trancar horário', content: 'Bloqueie um horário ou o dia inteiro (folga, compromisso, etc).' },
  { target: '[data-tour="agenda-view-toggle"]', title: 'Dia ou Mês', content: 'Troque entre a visão de um dia só e a visão do mês inteiro.' },
  { target: '#pendentes', title: 'Aguardando confirmação', content: 'Agendamentos que ainda esperam sua aprovação aparecem aqui.' },
  { target: '[data-tour="agenda-day-grid"]', title: 'Seu dia', content: 'Toque num horário livre pra agendar ou trancar, num trancado pra destrancar, ou num agendamento pra ver os detalhes.' },
];

interface SuccessInfo {
  title: string;
  rows: SuccessModalRow[];
}

function buildSuccessSummary(appointment: AgendaAppointment, title: string): SuccessInfo {
  const dateStr = new Date(appointment.starts_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
  const timeStr = new Date(appointment.starts_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  return {
    title,
    rows: [
      { label: 'Cliente', value: appointment.client_name },
      { label: 'Procedimento(s)', value: appointment.service_title },
      { label: 'Data', value: dateStr },
      { label: 'Horário', value: timeStr },
    ],
  };
}

interface AgendaClientProps {
  slug: string;
  view: 'dia' | 'mes';
  selectedDate: string;
  todayStr: string;
  pendingAppointments: AgendaAppointment[];
  dayAppointments: AgendaAppointment[];
  monthDays: string[];
  monthAppointments: AgendaAppointment[];
  services: ManualBookingService[];
  businessHours: BusinessHoursConfigRow[];
  scheduleBlocks: ScheduleBlockConfigRow[];
  /** Quando false, essa árvore inteira é renderizada só pra aparecer
   *  desfocada/travada atrás do card de assinar (Fase 20) — o tour não deve
   *  rodar nesse estado (não tem nada clicável mesmo, e ninguém deveria ver
   *  um balão apontando pra um card bloqueado embaixo do blur). */
  bookingEnabled: boolean;
  /** Veio do perfil da cliente ("Agendar", F7.5): abre o agendamento
   *  manual com ela já escolhida. */
  prefillClient?: StudioClientOption | null;
  /** Ação rápida do Início (F9.1): já abre o novo agendamento ou o trancar. */
  openForm?: 'novo' | 'trancar';
  /** Resumo da ficha por cliente (F8.4); quem não tem nada fica de fora. */
  sheetHighlights?: Record<string, SheetHighlight>;
}

export const AgendaClient: React.FC<AgendaClientProps> = ({
  slug,
  view,
  selectedDate,
  todayStr,
  pendingAppointments,
  dayAppointments,
  monthDays,
  monthAppointments,
  services,
  businessHours,
  scheduleBlocks,
  bookingEnabled,
  prefillClient = null,
  openForm,
  sheetHighlights = {},
}) => {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(Boolean((prefillClient || openForm === 'novo') && bookingEnabled));
  // Cliente do atalho só vale na primeira abertura; o botão "Novo" abre limpo.
  const [manualClient, setManualClient] = useState<StudioClientOption | null>(prefillClient);
  const [manualPrefillTime, setManualPrefillTime] = useState<string | undefined>(undefined);
  const [showBlockForm, setShowBlockForm] = useState(openForm === 'trancar' && bookingEnabled);
  // Tira o `?abrir=` da URL depois de abrir: sem isso, atualizar a página
  // (ou o router.refresh depois de salvar) reabriria o formulário.
  useEffect(() => {
    if (!openForm) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('abrir');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }, [openForm]);
  // F6.6: trecho livre tocado (agendar ou trancar), trecho a trancar já
  // preenchido e trancado tocado (destrancar).
  const [slotChoice, setSlotChoice] = useState<{ start: string; end: string } | null>(null);
  const [blockPrefill, setBlockPrefill] = useState<{ start: string; end: string } | null>(null);
  const [detailBlock, setDetailBlock] = useState<ScheduleBlockConfigRow | null>(null);
  const [detailAppointment, setDetailAppointment] = useState<AgendaAppointment | null>(null);
  const [approveAppointment, setApproveAppointment] = useState<AgendaAppointment | null>(null);
  const [rejectAppointment, setRejectAppointment] = useState<AgendaAppointment | null>(null);
  // O mesmo modal serve para recusar (aguardando) e cancelar (confirmado, F6.5).
  const [rejectMode, setRejectMode] = useState<'reject' | 'cancel'>('reject');
  const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null);
  // Recolhida por padrão — igual ao layout de referência (só o cabeçalho com
  // a contagem, expande ao tocar) — exceto quando a URL chega com
  // `#pendentes` (link do card "Aguardando confirmação" do Início), mesmo
  // padrão do `#assinatura` da Config.
  const [pendingOpen, setPendingOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);

  useEffect(() => {
    if (window.location.hash === '#pendentes') {
      setPendingOpen(true);
      document.getElementById('pendentes')?.scrollIntoView({ block: 'start' });
    }
  }, []);
  // Formulários abertos a partir da visão mensal não têm uma data óbvia
  // (`selectedDate` ali é só o dia 1 do mês, âncora da grade) — usam hoje
  // como padrão, que ela pode trocar no próprio formulário.
  const formDefaultDate = view === 'mes' ? todayStr : selectedDate;

  const patchStatus = async (
    appointment: AgendaAppointment,
    status: 'confirmed' | 'canceled' | 'completed' | 'no_show',
    extra: { cancel_reason?: string; amount_received?: string } = {}
  ) => {
    const res = await fetch(`/api/professional/appointments/${appointment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...extra }),
    });
    return res.json();
  };

  const handleApproveConfirm = async (sendWhatsApp: boolean) => {
    if (!approveAppointment || busy) return;
    // window.open ANTES de qualquer await — só assim funciona no Safari iOS
    // (mesmo cuidado do LashAgenda).
    if (sendWhatsApp) window.open(buildWhatsappLink(approveAppointment, slug, 'aprovado'), '_blank');

    setBusy(true);
    setActionError(null);
    try {
      const json = await patchStatus(approveAppointment, 'confirmed');
      if (!json.success) {
        setActionError(json.message || 'Não foi possível confirmar o agendamento.');
        setApproveAppointment(null);
        router.refresh();
        return;
      }
      const appt = approveAppointment;
      setApproveAppointment(null);
      setDetailAppointment(null);
      setSuccessInfo(buildSuccessSummary(appt, 'Agendamento Confirmado!'));
      router.refresh();
    } catch {
      setActionError('Falha na conexão.');
    } finally {
      setBusy(false);
    }
  };

  const handleRejectConfirm = async (sendWhatsApp: boolean, motivo: string) => {
    if (!rejectAppointment || busy) return;
    if (sendWhatsApp) window.open(buildWhatsappLink(rejectAppointment, slug, 'recusado', motivo), '_blank');

    setBusy(true);
    setActionError(null);
    try {
      const json = await patchStatus(rejectAppointment, 'canceled', { cancel_reason: motivo });
      if (!json.success) {
        setActionError(json.message || (rejectMode === 'cancel' ? 'Não foi possível cancelar o agendamento.' : 'Não foi possível recusar o agendamento.'));
        setRejectAppointment(null);
        router.refresh();
        return;
      }
      const appt = rejectAppointment;
      setRejectAppointment(null);
      setDetailAppointment(null);
      setSuccessInfo(buildSuccessSummary(appt, rejectMode === 'cancel' ? 'Agendamento Cancelado' : 'Agendamento Recusado'));
      router.refresh();
    } catch {
      setActionError('Falha na conexão.');
    } finally {
      setBusy(false);
    }
  };

  const handleCancelConfirmed = (appointment: AgendaAppointment) => {
    setRejectMode('cancel');
    setRejectAppointment(appointment);
  };

  const handleComplete = async (appointment: AgendaAppointment, amountText: string) => {
    setBusy(true);
    setActionError(null);
    try {
      const json = await patchStatus(appointment, 'completed', { amount_received: amountText });
      if (!json.success) {
        setActionError(json.message || 'Não foi possível concluir o agendamento.');
        return;
      }
      setDetailAppointment(null);
      setSuccessInfo(buildSuccessSummary(appointment, 'Agendamento Concluído!'));
      router.refresh();
    } catch {
      setActionError('Falha na conexão.');
    } finally {
      setBusy(false);
    }
  };

  const handleUndo = async (appointment: AgendaAppointment) => {
    setBusy(true);
    setActionError(null);
    try {
      const json = await patchStatus(appointment, 'confirmed');
      if (!json.success) {
        setActionError(json.message || 'Não foi possível desfazer.');
        return;
      }
      setDetailAppointment(null);
      router.refresh();
    } catch {
      setActionError('Falha na conexão.');
    } finally {
      setBusy(false);
    }
  };

  // Remarcar (F6.5). O WhatsApp abre ANTES do await (Safari iOS), já com o
  // novo horário; o servidor pode ainda pedir confirmação de encaixe.
  const handleReschedule = async (
    appointment: AgendaAppointment,
    date: string,
    time: string,
    options: { allowOutside: boolean; notify: boolean }
  ): Promise<RescheduleResult> => {
    const startsAt = localDateTimeToUTC(date, time);
    const waWindow = options.notify ? window.open(buildWhatsappLink(appointment, slug, 'remarcado', undefined, startsAt), '_blank') : null;
    try {
      const res = await fetch(`/api/professional/appointments/${appointment.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starts_at: startsAt.toISOString(), allow_outside_hours: options.allowOutside }),
      });
      const json = await res.json();
      if (!json.success) {
        // Não remarcou: a conversa aberta com o horário novo não vale.
        waWindow?.close();
        return json.needsConfirmation ? { ok: false, needsConfirm: json.message } : { ok: false, message: json.message };
      }
      setDetailAppointment(null);
      setSuccessInfo({
        title: json.outsideHours ? 'Encaixe remarcado!' : 'Agendamento Remarcado!',
        rows: [
          { label: 'Cliente', value: appointment.client_name },
          { label: 'Procedimento(s)', value: appointment.service_title },
          {
            label: 'Novo dia',
            value: startsAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' }),
          },
          { label: 'Novo horário', value: time },
        ],
      });
      router.refresh();
      return { ok: true };
    } catch {
      waWindow?.close();
      return { ok: false, message: 'Falha na conexão.' };
    }
  };

  const handleNoShow = async (appointment: AgendaAppointment) => {
    setBusy(true);
    setActionError(null);
    try {
      const json = await patchStatus(appointment, 'no_show');
      if (!json.success) {
        setActionError(json.message || 'Não foi possível marcar a falta.');
        return;
      }
      setDetailAppointment(null);
      setSuccessInfo(buildSuccessSummary(appointment, 'Falta registrada'));
      router.refresh();
    } catch {
      setActionError('Falha na conexão.');
    } finally {
      setBusy(false);
    }
  };

  const handleSlotClick = (time: string, endTime: string) => {
    setSlotChoice({ start: time, end: endTime });
  };

  // Trancar a partir de um horário livre: 1h (ou o que sobrar do trecho).
  const lockFromSlot = (start: string, end: string) => {
    const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
    const endMin = Math.min(toMin(start) + 60, toMin(end));
    const endLabel = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
    setSlotChoice(null);
    setShowManualForm(false);
    setBlockPrefill({ start, end: endLabel });
    setShowBlockForm(true);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de ações rápidas — Novo agendamento / Trancar horário /
       *  seletor de visualização (Dia ou Mês, Fase 11 — sem semana, decisão
       *  já tomada antes). */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          data-tour="agenda-new"
          onClick={() => {
            setManualPrefillTime(undefined);
            setManualClient(null);
            setShowManualForm((v) => !v);
            setShowBlockForm(false);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-[15px] font-bold shadow-sm transition-colors"
        >
          <CalendarPlus className="w-4 h-4" /> Novo
        </button>
        <button
          type="button"
          data-tour="agenda-block"
          onClick={() => {
            setBlockPrefill(null);
            setShowBlockForm((v) => !v);
            setShowManualForm(false);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-[15px] font-bold shadow-sm transition-colors"
        >
          <Lock className="w-4 h-4" /> Trancar
        </button>
        <div className="relative flex-1">
          <button
            type="button"
            data-tour="agenda-view-toggle"
            onClick={() => setViewMenuOpen((v) => !v)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-[15px] font-bold shadow-sm transition-colors"
          >
            {view === 'mes' ? 'Mês' : 'Dia'}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${viewMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {viewMenuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setViewMenuOpen(false)} />
              <div className="absolute right-0 mt-1.5 w-32 bg-surface rounded-lg shadow-lg border border-linen overflow-hidden z-30">
                <button
                  type="button"
                  onClick={() => {
                    setViewMenuOpen(false);
                    router.push(`/app/${slug}/agenda`);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-[15px] font-semibold transition-colors ${
                    view === 'dia' ? 'bg-rose-50 text-rose-600' : 'text-ink-soft hover:bg-cream'
                  }`}
                >
                  Dia
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMenuOpen(false);
                    router.push(`/app/${slug}/agenda?view=mes`);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-[15px] font-semibold transition-colors ${
                    view === 'mes' ? 'bg-rose-50 text-rose-600' : 'text-ink-soft hover:bg-cream'
                  }`}
                >
                  Mês
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Diferente do LashAgenda (que esconde o painel inteiro quando zera),
       *  aqui ele fica sempre visível com o contador em 0 — decisão do
       *  usuário, pra não sumir da tela sem explicação (Fase 9). */}
      <div id="pendentes" className="bg-[#FFF8EC] border border-[#F3E6CE] rounded-[14px] overflow-hidden">
        <button
          type="button"
          onClick={() => setPendingOpen((v) => !v)}
          className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left"
        >
          <span className="w-2 h-2 rounded-full bg-[#D79A2B] shrink-0" />
          <span className="flex-1 text-sm text-[#6B5528]">
            {pendingAppointments.length === 0 ? 'Nenhum aguardando confirmação' : `${pendingAppointments.length} aguardando confirmação`}
          </span>
          <span className="text-sm font-semibold text-[#8A6410]">{pendingOpen ? 'Ocultar' : 'Ver'}</span>
        </button>

        {pendingOpen && (
          <div className="border-t border-[#F3E6CE] divide-y divide-linen bg-surface">
            {pendingAppointments.length > 0 ? (
              pendingAppointments.map((a) => (
                <AppointmentRow key={a.id} appointment={a} onApprove={setApproveAppointment}
                  onReject={(appt) => {
                    setRejectMode('reject');
                    setRejectAppointment(appt);
                  }}
                />
              ))
            ) : (
              <p className="px-5 py-4 text-sm text-ink-faint">Nenhum agendamento aguardando confirmação no momento.</p>
            )}
          </div>
        )}
      </div>

      {actionError && <p className="text-sm text-rose-600">{actionError}</p>}

      {showManualForm && (
        <ManualBookingForm
          key={`${manualPrefillTime || 'novo'}-${manualClient?.id || ''}`}
          slug={slug}
          services={services}
          defaultClient={manualClient}
          defaultDate={formDefaultDate}
          defaultTime={manualPrefillTime}
          onClose={() => {
            setShowManualForm(false);
            setManualClient(null);
          }}
          onCreated={(summary) => {
            setShowManualForm(false);
            setManualClient(null);
            setSuccessInfo(summary);
            router.refresh();
          }}
        />
      )}

      {showBlockForm && (
        <BlockSlotForm
          // Remonta quando muda o trecho pré-preenchido (formulário já aberto).
          key={blockPrefill ? `${blockPrefill.start}-${blockPrefill.end}` : 'novo'}
          slug={slug}
          defaultDate={formDefaultDate}
          defaultStartTime={blockPrefill?.start}
          defaultEndTime={blockPrefill?.end}
          onClose={() => setShowBlockForm(false)}
          onCreated={(summary) => {
            setShowBlockForm(false);
            setSuccessInfo(summary);
            router.refresh();
          }}
        />
      )}

      {view === 'mes' ? (
        <MonthCalendar
          monthDateStr={selectedDate}
          days={monthDays}
          todayStr={todayStr}
          appointments={monthAppointments}
          businessHours={businessHours}
          scheduleBlocks={scheduleBlocks}
          onDayClick={(dateStr) => router.push(`/app/${slug}/agenda?date=${dateStr}`)}
        />
      ) : (
        <DayTimeline
          dateStr={selectedDate}
          todayStr={todayStr}
          appointments={dayAppointments}
          businessHours={businessHours}
          scheduleBlocks={scheduleBlocks}
          onSlotClick={handleSlotClick}
          onBlockClick={setDetailBlock}
          onAppointmentClick={setDetailAppointment}
          onApprove={setApproveAppointment}
        />
      )}

      {slotChoice && (
        <SlotChoiceSheet
          start={slotChoice.start}
          end={slotChoice.end}
          onClose={() => setSlotChoice(null)}
          onBook={() => {
            setManualPrefillTime(slotChoice.start);
            setSlotChoice(null);
            setShowBlockForm(false);
            setShowManualForm(true);
          }}
          onLock={() => lockFromSlot(slotChoice.start, slotChoice.end)}
        />
      )}

      {detailBlock && (
        <BlockDetailSheet
          block={detailBlock}
          onClose={() => setDetailBlock(null)}
          onRemoved={() => {
            setDetailBlock(null);
            router.refresh();
          }}
        />
      )}

      {detailAppointment && (
        <AppointmentDetailSheet
          appointment={detailAppointment}
          clientHref={`/app/${slug}/clientes/${detailAppointment.client_id}`}
          sheetHref={`/app/${slug}/clientes/${detailAppointment.client_id}/ficha`}
          sheet={sheetHighlights[detailAppointment.client_id] || null}
          busy={busy}
          onClose={() => setDetailAppointment(null)}
          onApprove={setApproveAppointment}
          onReject={(a) => {
            setRejectMode('reject');
            setRejectAppointment(a);
          }}
          onCancelConfirmed={handleCancelConfirmed}
          onComplete={handleComplete}
          onNoShow={handleNoShow}
          onUndo={handleUndo}
          onReschedule={handleReschedule}
        />
      )}

      {approveAppointment && (
        <ApproveModal
          appointment={approveAppointment}
          busy={busy}
          onClose={() => setApproveAppointment(null)}
          onConfirm={handleApproveConfirm}
        />
      )}

      {rejectAppointment && (
        <RejectModal
          appointment={rejectAppointment}
          mode={rejectMode}
          busy={busy}
          onClose={() => setRejectAppointment(null)}
          onConfirm={handleRejectConfirm}
        />
      )}

      {successInfo && <SuccessModal {...successInfo} onClose={() => setSuccessInfo(null)} />}

      <ProductTour tourId="agenda" slug={slug} steps={AGENDA_TOUR_STEPS} enabled={bookingEnabled} />
    </div>
  );
};
