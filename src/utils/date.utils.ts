import {
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  subDays,
  subWeeks,
  getISOWeek,
  getYear,
  parseISO,
  format,
} from 'date-fns';

export function getWeekBounds(date: Date): { start: Date; end: Date } {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }), // Monday
    end: endOfWeek(date, { weekStartsOn: 1 }),
  };
}

export function getCurrentWeekBounds() {
  return getWeekBounds(new Date());
}

export function getYesterdayBounds(): { start: Date; end: Date } {
  const yesterday = subDays(new Date(), 1);
  return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
}

export function getPreviousWeeksBounds(count: number): Array<{ start: Date; end: Date }> {
  return Array.from({ length: count }, (_, i) => getWeekBounds(subWeeks(new Date(), i + 1)));
}

export function isoWeekKey(date: Date): string {
  return `${getYear(date)}-W${String(getISOWeek(date)).padStart(2, '0')}`;
}

export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatDateTime(date: Date): string {
  return format(date, 'yyyy-MM-dd HH:mm');
}

export function parseStravaDate(dateStr: string): Date {
  return parseISO(dateStr);
}

export function toUnixTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export { subDays, subWeeks, startOfDay, endOfDay, startOfWeek, endOfWeek };
