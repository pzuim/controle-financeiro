import type { Card } from './types';

/**
 * Os cartões são da mesma conta e sempre fecham e vencem nas datas do cartão 1
 * (o primeiro pela ordem). Também descarta campos que deixaram de existir,
 * como o "name" da primeira versão. Usado ao abrir o app e ao importar backup.
 */
export function normalizeCards(cards: Card[]): Card[] {
  const first = [...cards].sort((a, b) => a.order - b.order)[0];
  if (!first) return [];
  return cards.map((c) => ({
    id: c.id,
    last4: c.last4,
    color: c.color,
    color2: c.color2,
    dueDay: first.dueDay,
    closingDay: first.closingDay,
    order: c.order,
  }));
}

/** Verdadeiro se `normalizeCards` mudaria algo (regra diferente ou campo antigo). */
export function needsNormalization(cards: Card[]): boolean {
  const normalized = normalizeCards(cards);
  return cards.some(
    (c, i) =>
      Object.keys(c).length !== Object.keys(normalized[i]!).length ||
      c.closingDay !== normalized[i]!.closingDay ||
      c.dueDay !== normalized[i]!.dueDay,
  );
}
