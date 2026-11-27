import 'server-only';
import { supabaseAdmin } from '../supabase-admin';
import { localDateTimeToUTC } from '../scheduling/availability';
import { monthStartKey, nextMonthStartKey, sumRevenue, type RevenueRow } from './inicio-numbers';

export interface InicioNumbers {
  revenueToday: number;
  revenueMonth: number;
  newClientsMonth: number;
}

const PAGE = 1000;

/** Faturado hoje/no mês (concluídos, inclusive registros do histórico) e
 *  clientes novas cadastradas no mês. `today` = "YYYY-MM-DD" em SP. */
export async function getInicioNumbers(studioId: string, today: string): Promise<InicioNumbers> {
  const from = localDateTimeToUTC(monthStartKey(today), '00:00:00').toISOString();
  const to = localDateTimeToUTC(nextMonthStartKey(today), '00:00:00').toISOString();

  const rows: RevenueRow[] = [];
  for (let page = 0; ; page += 1) {
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select('starts_at, status, amount_received')
      .eq('studio_id', studioId)
      .eq('status', 'completed')
      .gte('starts_at', from)
      .lt('starts_at', to)
      .order('starts_at', { ascending: true })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) {
      console.error('[inicio-service] receita:', error.message);
      break;
    }
    for (const r of data || []) {
      rows.push({
        starts_at: r.starts_at,
        status: r.status,
        amount_received: r.amount_received === null ? null : Number(r.amount_received),
      });
    }
    if (!data || data.length < PAGE) break;
  }

  const { count, error: clientsError } = await supabaseAdmin
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('studio_id', studioId)
    .gte('created_at', from)
    .lt('created_at', to);
  if (clientsError) console.error('[inicio-service] clientes novas:', clientsError.message);

  const revenue = sumRevenue(rows, today);
  return { revenueToday: revenue.today, revenueMonth: revenue.month, newClientsMonth: count ?? 0 };
}
