import { parseISODate } from './dates';
import type { ISODate, YearMonth } from './types';

const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const;

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** 123456 → "R$ 1.234,56" (com espaço não separável após o símbolo). */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

/** Igual a `formatBRL`, mas com sinal explícito: "+R$ 10,00" ou "−R$ 10,00". */
export function formatSignedBRL(cents: number): string {
  if (cents === 0) return formatBRL(0);
  return `${cents > 0 ? '+' : '−'}${formatBRL(Math.abs(cents))}`;
}

/**
 * Converte o texto de um campo de valor em centavos. Aceita "1.234,56", "1234,5",
 * "R$ 12", "12.5" (ponto como decimal quando há 1–2 dígitos depois). Retorna
 * `null` se não houver um valor válido.
 */
export function parseBRL(input: string): number | null {
  const cleaned = input.replace(/[R$\s ]/g, '');
  if (!cleaned) return null;
  let normalized: string;
  if (cleaned.includes(',')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (/^\d+\.\d{1,2}$/.test(cleaned)) {
    normalized = cleaned;
  } else {
    normalized = cleaned.replace(/\./g, '');
  }
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [int = '0', frac = ''] = normalized.split('.');
  return Number(int) * 100 + Number(frac.padEnd(2, '0'));
}

export function monthName(month: number): string {
  return MONTHS[month - 1] ?? '';
}

export function monthShort(month: number): string {
  return MONTHS_SHORT[month - 1] ?? '';
}

/** "2026-01-02" → "02/01/2026" */
export function formatDateBR(iso: ISODate): string {
  const { year, month, day } = parseISODate(iso);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

/** "2026-01-02" → "02/01" */
export function formatDayMonth(iso: ISODate): string {
  const { month, day } = parseISODate(iso);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
}

/** "2026-01-02" → "02 jan" */
export function formatDayMonthShort(iso: ISODate): string {
  const { month, day } = parseISODate(iso);
  return `${String(day).padStart(2, '0')} ${monthShort(month)}`;
}

/** { 2026, 12 } → "dezembro de 2026" */
export function formatMonthYear(ym: YearMonth): string {
  return `${monthName(ym.month)} de ${ym.year}`;
}

/** { 2026, 12 } → "dez/2026" */
export function formatMonthYearShort(ym: YearMonth): string {
  return `${monthShort(ym.month)}/${ym.year}`;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Data e hora local de um timestamp ISO: "30/10/2026 às 14:05". */
export function formatTimestamp(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
