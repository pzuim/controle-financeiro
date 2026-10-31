import type { InvoiceStatus } from '../domain/billing';
import { ymKey } from '../domain/dates';
import { formatMonthYear } from '../domain/format';
import type { Card, IncomeType, Period, YearMonth } from '../domain/types';
import type { SummaryScope } from './context';

export const STATUS_LABEL: Record<InvoiceStatus, string> = {
  futura: 'Futura',
  aberta: 'Aberta',
  fechada: 'Fechada',
  encerrada: 'Encerrada',
};

export const INCOME_TYPE_LABEL: Record<IncomeType, string> = {
  salario: 'Salário',
  extra: 'Extra',
  outro: 'Outro',
};

export function sortedCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => a.order - b.order);
}

/** "Cartão 1", "Cartão 2"… pela posição configurada. */
export function cardNumberLabel(card: Card, cards: Card[]): string {
  return `Cartão ${sortedCards(cards).findIndex((c) => c.id === card.id) + 1}`;
}

/** Regra comum aos cartões da conta (a do cartão 1). `closingDay` é `null` se o fechamento não foi definido. */
export function accountRule(cards: Card[]): { closingDay: number | null; dueDay: number } {
  const first = sortedCards(cards)[0];
  return { closingDay: first?.closingDay ?? null, dueDay: first?.dueDay ?? 1 };
}

/** Período mostrado no Resumo e nas Categorias, com os textos e o filtro do histórico correspondentes. */
export interface PeriodView {
  yearly: boolean;
  period: Period;
  /** "2026" ou "outubro de 2026". */
  label: string;
  /** "ano" ou "mês", para frases como "do ano". */
  unit: string;
  /** Filtro de mês do histórico: "AAAA" ou "AAAA-MM". */
  historyKey: string;
}

export function periodView(scope: SummaryScope, month: YearMonth): PeriodView {
  const yearly = scope === 'year';
  return {
    yearly,
    period: yearly ? { year: month.year } : month,
    label: yearly ? String(month.year) : formatMonthYear(month),
    unit: yearly ? 'ano' : 'mês',
    historyKey: yearly ? String(month.year) : ymKey(month),
  };
}
