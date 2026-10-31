import type { ISODate, Period, YearMonth } from './types';

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface DateParts {
  year: number;
  month: number;
  day: number;
}

export function daysInMonth(year: number, month: number): number {
  // Dia 0 do mês seguinte = último dia do mês pedido (trata fevereiro e anos bissextos).
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Ajusta um dia configurado (ex.: 31) ao último dia existente no mês (ex.: 30 ou 28). */
export function clampDay(ym: YearMonth, day: number): number {
  return Math.min(day, daysInMonth(ym.year, ym.month));
}

export function isValidISODate(value: unknown): value is ISODate {
  if (typeof value !== 'string') return false;
  const m = ISO_DATE_RE.exec(value);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

export function parseISODate(iso: ISODate): DateParts {
  const m = ISO_DATE_RE.exec(iso);
  if (!m || !isValidISODate(iso)) throw new Error(`Data inválida: ${iso}`);
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

export function toISODate(year: number, month: number, day: number): ISODate {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function ymOf(iso: ISODate): YearMonth {
  const { year, month } = parseISODate(iso);
  return { year, month };
}

export function addMonths(ym: YearMonth, n: number): YearMonth {
  const index = ym.year * 12 + (ym.month - 1) + n;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function compareYm(a: YearMonth, b: YearMonth): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

export function sameYm(a: YearMonth, b: YearMonth): boolean {
  return a.year === b.year && a.month === b.month;
}

/** Chave estável "AAAA-MM", usada em filtros e mapas. */
export function ymKey(ym: YearMonth): string {
  return `${String(ym.year).padStart(4, '0')}-${String(ym.month).padStart(2, '0')}`;
}

export function parseYmKey(key: string): YearMonth {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) throw new Error(`Mês inválido: ${key}`);
  return { year: Number(m[1]), month: Number(m[2]) };
}

export function addDays(iso: ISODate, n: number): ISODate {
  const { year, month, day } = parseISODate(iso);
  const d = new Date(Date.UTC(year, month - 1, day + n));
  return toISODate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Data de hoje no fuso do aparelho. */
export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function dateInYm(ym: YearMonth, day: number): ISODate {
  return toISODate(ym.year, ym.month, clampDay(ym, day));
}

/**
 * Data sugerida para um lançamento feito olhando um mês: hoje, se for o mês de hoje;
 * senão, o mesmo dia de hoje dentro do mês escolhido (ou o último dia, se o mês for mais curto).
 */
export function suggestedDateInMonth(ym: YearMonth, today: ISODate): ISODate {
  return dateInYm(ym, parseISODate(today).day);
}

export function inPeriod(ym: YearMonth, period: Period): boolean {
  return ym.year === period.year && (period.month === undefined || ym.month === period.month);
}
