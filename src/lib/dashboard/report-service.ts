import 'server-only';
import { supabaseAdmin } from '../supabase-admin';
import { localDateTimeToUTC } from '../scheduling/availability';
import { addDays, summarizeReport, type ReportPeriod, type ReportRow, type ReportSummary } from './report';

const PAGE = 1000;
const spDay = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

export interface StudioReport extends ReportSummary {
  newClients: number;
}

/** Relatório do período (F9.2): todos os agendamentos com data no período
 *  (inclusive cancelados e os registrados à mão no histórico) + clientes
 *  novas cadastradas nele. */
export async function getStudioReport(studioId: string, period: Pick<ReportPeriod, 'from' | 'to'>): Promise<StudioReport> {
  const from = localDateTimeToUTC(period.from, '00:00:00').toISOString();
  const to = localDateTimeToUTC(addDays(period.to, 1), '00:00:00').toISOString();

  const rows: ReportRow[] = [];
  for (let page = 0; ; page += 1) {
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select('id, starts_at, status, amount_received, appointment_items(title, position)')
      .eq('studio_id', studioId)
      .gte('starts_at', from)
      .lt('starts_at', to)
      .order('starts_at', { ascending: true })
      .order('id', { ascending: true })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) {
      console.error('[report-service] agendamentos:', error.message);
      break;
    }
    const list = (data || []) as unknown as {
      starts_at: string;
      status: string;
      amount_received: number | string | null;
      appointment_items: { title: string; position: number }[] | null;
    }[];
    for (const r of list) {
      rows.push({
        day: spDay(r.starts_at),
        status: r.status,
        amount_received: r.amount_received === null ? null : Number(r.amount_received),
        services: [...(r.appointment_items || [])].sort((a, b) => a.position - b.position).map((i) => i.title),
      });
    }
    if (list.length < PAGE) break;
  }

  const { count, error: clientsError } = await supabaseAdmin
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('studio_id', studioId)
    .gte('created_at', from)
    .lt('created_at', to);
  if (clientsError) console.error('[report-service] clientes novas:', clientsError.message);

  return { ...summarizeReport(rows, period), newClients: count ?? 0 };
}
