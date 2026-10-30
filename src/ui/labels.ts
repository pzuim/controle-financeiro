import type { InvoiceStatus } from '../domain/billing';
import type { Card, IncomeType } from '../domain/types';

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
