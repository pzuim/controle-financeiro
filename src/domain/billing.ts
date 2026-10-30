import { addDays, addMonths, clampDay, dateInYm, parseISODate } from './dates';
import type { ISODate, YearMonth } from './types';

/**
 * Regra de faturamento de um cartão.
 *
 * Uma fatura é identificada pelo mês do seu vencimento. Regra geral:
 * - a compra feita até o dia do fechamento (inclusive) entra no ciclo que fecha
 *   naquele mês; feita depois do fechamento, entra no ciclo que fecha no mês seguinte;
 * - a fatura vence no primeiro dia de vencimento após o fechamento do ciclo.
 *
 * Quando o vencimento é anterior ao fechamento no calendário (caso normal, ex.:
 * fecha dia 24 e vence dia 2), a fatura vence no mês seguinte ao fechamento.
 * Exemplo do cartão 6722: compra em 24/11 → vence 02/12; compra em 25/11 → vence 02/01.
 *
 * Dias inexistentes no mês (ex.: dia 31 em abril, 29–31 em fevereiro) são
 * tratados como o último dia daquele mês.
 */
export interface BillingRule {
  dueDay: number;
  closingDay: number;
}

export type InvoiceStatus = 'futura' | 'aberta' | 'fechada' | 'encerrada';

export interface InvoicePeriod {
  /** Mês de vencimento: identifica a fatura. */
  dueMonth: YearMonth;
  /** Primeiro dia de compras que entram nesta fatura. */
  startDate: ISODate;
  /** Último dia de compras que entram nesta fatura (dia do fechamento). */
  closingDate: ISODate;
  dueDate: ISODate;
}

export function isValidDay(day: unknown): day is number {
  return typeof day === 'number' && Number.isInteger(day) && day >= 1 && day <= 31;
}

/** Meses entre o fechamento e o vencimento: 0 se vence no mesmo mês em que fecha, 1 se no mês seguinte. */
export function dueOffset(rule: BillingRule): 0 | 1 {
  return rule.dueDay > rule.closingDay ? 0 : 1;
}

/** Mês em que fecha o ciclo que recebe uma compra feita na data informada. */
export function closingMonthFor(date: ISODate, closingDay: number): YearMonth {
  const { year, month, day } = parseISODate(date);
  const ym = { year, month };
  return day <= clampDay(ym, closingDay) ? ym : addMonths(ym, 1);
}

/** Fatura (mês de vencimento) que recebe uma compra feita na data informada. */
export function invoiceMonthFor(date: ISODate, rule: BillingRule): YearMonth {
  return addMonths(closingMonthFor(date, rule.closingDay), dueOffset(rule));
}

/** Datas da fatura que vence no mês informado. */
export function invoicePeriod(dueMonth: YearMonth, rule: BillingRule): InvoicePeriod {
  const closingMonth = addMonths(dueMonth, -dueOffset(rule));
  const previousClosing = dateInYm(addMonths(closingMonth, -1), rule.closingDay);
  return {
    dueMonth,
    startDate: addDays(previousClosing, 1),
    closingDate: dateInYm(closingMonth, rule.closingDay),
    dueDate: dateInYm(dueMonth, rule.dueDay),
  };
}

/**
 * Situação da fatura em relação a hoje. Como o app não controla pagamentos,
 * uma fatura com vencimento já passado é apenas "encerrada".
 */
export function invoiceStatus(period: InvoicePeriod, today: ISODate): InvoiceStatus {
  if (today < period.startDate) return 'futura';
  if (today <= period.closingDate) return 'aberta';
  if (today <= period.dueDate) return 'fechada';
  return 'encerrada';
}

/** Fatura aberta hoje, isto é, a que recebe uma compra feita hoje. */
export function currentInvoiceMonth(rule: BillingRule, today: ISODate): YearMonth {
  return invoiceMonthFor(today, rule);
}

/** Converte um cartão em regra de faturamento, ou `null` se o fechamento ainda não foi configurado. */
export function ruleOf(card: { dueDay: number; closingDay: number | null }): BillingRule | null {
  if (!isValidDay(card.dueDay) || !isValidDay(card.closingDay)) return null;
  return { dueDay: card.dueDay, closingDay: card.closingDay };
}
