import { describe, expect, it } from 'vitest';
import { needsNormalization, normalizeCards } from '../src/domain/cards';
import { defaultCards } from '../src/domain/defaults';
import type { Card } from '../src/domain/types';

describe('cartões da mesma conta', () => {
  it('os cartões iniciais já estão normalizados', () => {
    expect(needsNormalization(defaultCards())).toBe(false);
    expect(normalizeCards(defaultCards())).toEqual(defaultCards());
  });

  it('dados da primeira versão passam a usar a regra do cartão 1 e perdem o nome', () => {
    const [c1, c2] = defaultCards() as [Card, Card];
    const old: Array<Card & { name: string }> = [
      { ...c2, name: 'Cartão reserva', closingDay: 27, dueDay: 5 },
      { ...c1, name: 'Cartão principal' },
    ];
    expect(needsNormalization(old)).toBe(true);
    const fixed = normalizeCards(old);
    // Mantém a ordem da lista e os dados próprios de cada cartão.
    expect(fixed.map((c) => [c.last4, c.closingDay, c.dueDay])).toEqual([
      ['6222', 24, 2],
      ['6722', 24, 2],
    ]);
    expect(fixed.every((c) => !('name' in c))).toBe(true);
    expect(needsNormalization(fixed)).toBe(false);
  });

  it('cartão sem fechamento passa a seguir o cartão 1', () => {
    const cards = defaultCards().map((c) => (c.id === 'card-2' ? { ...c, closingDay: null } : c));
    expect(normalizeCards(cards).map((c) => c.closingDay)).toEqual([24, 24]);
  });
});
