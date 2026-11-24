import { supabaseAdmin } from '../supabase-admin';

export interface BusinessHoursConfigRow {
  weekday: number;
  start_time: string;
  end_time: string;
}

export interface ScheduleBlockConfigRow {
  id: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}

export async function getBusinessHours(studioId: string): Promise<BusinessHoursConfigRow[]> {
  const { data } = await supabaseAdmin
    .from('business_hours')
    .select('weekday, start_time, end_time')
    .eq('studio_id', studioId)
    .order('weekday', { ascending: true })
    .order('start_time', { ascending: true });

  return (data as BusinessHoursConfigRow[]) || [];
}

export async function getScheduleBlocks(studioId: string): Promise<ScheduleBlockConfigRow[]> {
  const { data } = await supabaseAdmin
    .from('schedule_blocks')
    .select('id, start_date, end_date, all_day, start_time, end_time, reason')
    .eq('studio_id', studioId)
    .order('start_date', { ascending: true });

  return (data as ScheduleBlockConfigRow[]) || [];
}
