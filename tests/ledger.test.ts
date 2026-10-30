import { describe, expect, it } from 'vitest';
import { ymKey } from '../src/domain/dates';
import { defaultCards, defaultCategories } from '../src/domain/defaults';
import { buildLedger, categoryBreakdown, invoiceFor, monthSummary, PIX_KEY } from '../src/domain/ledger';
import type { Card, Expense, Income } from '../src/domain/types';

let seq = 0;
function expense(partial: Partial<Expense> & Pick<Expense, 'amountCents' | 'date'>): Expense {
  seq += 1;
  return {
    id: `e${seq}`,
    description: `Despesa ${seq}`,
    cardId: 'card-1',
    categoryId: 'cat-outros',
    subcategoryId: null,
    installments: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

function income(amountCents: number, date: string): Income {
  seq += 1;
  return {
    id: `i${seq}`,
    description: 'Salário',
    amountCents,
    date,
    type: 'salario',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

const JAN_2027 = { year: 2027, month: 1 };

describe('compras parceladas', () => {
  const cards = defaultCards();
  const purchase = expense({ amountCents: 10000, date: '2026-11-25', installments: 3 });
  const ledger = buildLedger({ cards, expenses: [purchase] });

  it('a primeira parcela segue a regra de fechamento e as demais vão para as faturas seguintes', () => {
    expect(ledger.entries.map((e) => [ymKey(e.month), `${e.installment}/${e.installments}`, e.amountCents])).toEqual([
      ['2027-01', '1/3', 3333],
      ['2027-02', '2/3', 3333],
      ['2027-03', '3/3', 3334],
    ]);
  });

  it('continua sendo uma única compra original', () => {
    expect(new Set(ledger.entries.map((e) => e.expense.id))).toEqual(new Set([purchase.id]));
    const total = ledger.entries.reduce((s, e) => s + e.amountCents, 0);
    expect(total).toBe(purchase.amountCents);
  });

  it('cada fatura recebe apenas a sua parcela, sem duplicar o gasto', () => {
    const card = cards[0]!;
    expect(invoiceFor(card, JAN_2027, ledger, '2026-11-30')?.totalCents).toBe(3333);
    expect(invoiceFor(card, { year: 2027, month: 3 }, ledger, '2026-11-30')?.totalCents).toBe(3334);
    expect(invoiceFor(card, { year: 2026, month: 12 }, ledger, '2026-11-30')?.totalCents).toBe(0);
  });

  it('parcelas atravessam a virada de ano', () => {
    const p = expense({ amountCents: 120000, date: '2026-10-10', installments: 6 });
    const months = buildLedger({ cards, expenses: [p] }).entries.map((e) => ymKey(e.month));
    expect(months).toEqual(['2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04']);
  });
});

describe('os dois cartões da conta', () => {
  it('começam com a regra do cartão 1: fecham dia 24 e vencem dia 2', () => {
    expect(defaultCards().map((c) => [c.last4, c.closingDay, c.dueDay])).toEqual([
      ['6722', 24, 2],
      ['6222', 24, 2],
    ]);
  });

  it('compras no cartão 2 seguem a mesma regra do cartão 1', () => {
    const cards = defaultCards();
    const e1 = expense({ cardId: 'card-1', amountCents: 1000, date: '2026-11-25' });
    const e2 = expense({ cardId: 'card-2', amountCents: 1000, date: '2026-11-25' });
    const e3 = expense({ cardId: 'card-2', amountCents: 1000, date: '2026-11-24' });
    const months = buildLedger({ cards, expenses: [e1, e2, e3] }).entries.map((e) => ymKey(e.month));
    expect(months).toEqual(['2027-01', '2027-01', '2026-12']);
  });
});

describe('cartão sem fechamento configurado', () => {
  const withoutClosing = (): Card[] =>
    defaultCards().map((c) => (c.id === 'card-2' ? { ...c, closingDay: null } : c));

  it('deixa os lançamentos pendentes até o fechamento ser informado', () => {
    const cards = withoutClosing();
    const e = expense({ cardId: 'card-2', amountCents: 5000, date: '2026-11-26' });
    const ledger = buildLedger({ cards, expenses: [e] });
    expect(ledger.entries).toHaveLength(0);
    expect(ledger.pending).toEqual([e]);
    expect(invoiceFor(cards[1]!, JAN_2027, ledger, '2026-11-30')).toBeNull();
  });

  it('ao alterar o fechamento, recalcula a fatura dos lançamentos passados', () => {
    const e = expense({ cardId: 'card-2', amountCents: 5000, date: '2026-11-26' });
    const withClosing = (closingDay: number): Card[] =>
      defaultCards().map((c) => (c.id === 'card-2' ? { ...c, closingDay } : c));

    // Fecha dia 28, vence dia 2: compra de 26/11 vence em 02/12.
    expect(ymKey(buildLedger({ cards: withClosing(28), expenses: [e] }).entries[0]!.month)).toBe('2026-12');
    // Fecha dia 25: a mesma compra passa para a fatura de 02/01.
    expect(ymKey(buildLedger({ cards: withClosing(25), expenses: [e] }).entries[0]!.month)).toBe('2027-01');
  });
});

describe('resumo mensal', () => {
  const cards = defaultCards();
  const expenses = [
    // 6722: vence 02/01/2027
    expense({ amountCents: 20000, date: '2026-11-25', categoryId: 'cat-alimentacao' }),
    // 6722 parcelado: 1/2 em jan/2027, 2/2 em fev/2027
    expense({ amountCents: 30001, date: '2026-12-01', installments: 2, categoryId: 'cat-compras' }),
    // 6222 (mesma regra, fecha 24, vence 2): compra de 15/12 vence em 02/01/2027
    expense({ cardId: 'card-2', amountCents: 4590, date: '2026-12-15', categoryId: 'cat-alimentacao' }),
    // Pix / débito conta no mês da data
    expense({ cardId: null, amountCents: 150000, date: '2027-01-10', categoryId: 'cat-moradia' }),
    // Fora do mês: Pix em dezembro
    expense({ cardId: null, amountCents: 999, date: '2026-12-31', categoryId: 'cat-moradia' }),
  ];
  const incomes = [income(800000, '2027-01-05'), income(50000, '2027-01-20'), income(700000, '2026-12-05')];
  const ledger = buildLedger({ cards, expenses });

  it('soma renda, despesas por fatura e calcula o saldo', () => {
    const s = monthSummary(JAN_2027, ledger, { cards, incomes });
    expect(s.incomeCents).toBe(850000);
    expect(s.expenseCents).toBe(20000 + 15000 + 4590 + 150000);
    expect(s.balanceCents).toBe(850000 - 189590);
    expect(s.byMethod).toEqual([
      { key: 'card-1', cardId: 'card-1', totalCents: 35000 },
      { key: 'card-2', cardId: 'card-2', totalCents: 4590 },
      { key: PIX_KEY, cardId: null, totalCents: 150000 },
    ]);
  });

  it('a parcela com o centavo de ajuste aparece no mês da última fatura', () => {
    const s = monthSummary({ year: 2027, month: 2 }, ledger, { cards, incomes });
    expect(s.expenseCents).toBe(15001);
    expect(s.incomeCents).toBe(0);
    expect(s.balanceCents).toBe(-15001);
  });

  it('agrupa por categoria, do maior para o menor, com total por cartão', () => {
    const rows = categoryBreakdown(JAN_2027, ledger, defaultCategories());
    expect(rows.slice(0, 3).map((r) => [r.category.name, r.totalCents])).toEqual([
      ['Moradia', 150000],
      ['Alimentação', 24590],
      ['Compras', 15000],
    ]);
    const food = rows.find((r) => r.category.id === 'cat-alimentacao')!;
    expect(food.byMethod).toEqual({ 'card-1': 20000, 'card-2': 4590 });
    // Todas as categorias visíveis aparecem, mesmo sem gastos.
    expect(rows).toHaveLength(10);
    const total = rows.reduce((s, r) => s + r.totalCents, 0);
    expect(total).toBe(monthSummary(JAN_2027, ledger, { cards, incomes }).expenseCents);
  });

  it('categoria oculta só aparece se tiver gasto no mês', () => {
    const categories = defaultCategories().map((c) =>
      c.id === 'cat-educacao' || c.id === 'cat-moradia' ? { ...c, hidden: true } : c,
    );
    const ids = categoryBreakdown(JAN_2027, ledger, categories).map((r) => r.category.id);
    expect(ids).not.toContain('cat-educacao');
    expect(ids).toContain('cat-moradia');
  });

  it('detalha subcategorias quando existirem', () => {
    const subExpenses = [
      expense({ cardId: null, amountCents: 5590, date: '2027-01-03', categoryId: 'cat-assinaturas', subcategoryId: 'cat-assinaturas-1' }),
      expense({ cardId: null, amountCents: 1990, date: '2027-01-04', categoryId: 'cat-assinaturas' }),
    ];
    const rows = categoryBreakdown(JAN_2027, buildLedger({ cards, expenses: subExpenses }), defaultCategories());
    const subs = rows.find((r) => r.category.id === 'cat-assinaturas')!.subcategories;
    expect(subs.map((s) => [s.category?.name ?? null, s.totalCents])).toEqual([
      ['Netflix', 5590],
      [null, 1990],
    ]);
  });
});
