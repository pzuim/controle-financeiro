import { invoiceMonthFor, invoicePeriod, invoiceStatus, ruleOf } from './billing';
import type { InvoicePeriod, InvoiceStatus } from './billing';
import { addMonths, sameYm, ymOf } from './dates';
import { splitInstallments } from './installments';
import type { AppData, Card, Category, Expense, ISODate, YearMonth } from './types';

/** Chave usada para agrupar despesas pagas fora do cartão. */
export const PIX_KEY = 'pix';
export const PIX_LABEL = 'Pix / débito';

export function methodKey(cardId: string | null): string {
  return cardId ?? PIX_KEY;
}

/**
 * Parte de uma despesa atribuída a um mês. Uma compra à vista gera uma única
 * entrada; uma compra parcelada gera uma entrada por parcela, mas continua
 * sendo uma única despesa original (`expense`).
 */
export interface LedgerEntry {
  expense: Expense;
  /** Número da parcela, começando em 1. */
  installment: number;
  installments: number;
  amountCents: number;
  /** Mês de referência: vencimento da fatura (cartão) ou mês da data (Pix / débito). */
  month: YearMonth;
}

export interface Ledger {
  entries: LedgerEntry[];
  /** Despesas de cartões sem dia de fechamento configurado: ainda sem fatura. */
  pending: Expense[];
}

/**
 * Expande uma despesa nas suas parcelas e meses de referência.
 * Retorna `null` quando o cartão ainda não tem regra de fechamento.
 * A atribuição é sempre recalculada a partir da regra atual do cartão,
 * então alterar o fechamento reatribui automaticamente os lançamentos passados.
 */
export function expandExpense(expense: Expense, cardsById: ReadonlyMap<string, Card>): LedgerEntry[] | null {
  let firstMonth: YearMonth;
  if (expense.cardId === null) {
    firstMonth = ymOf(expense.date);
  } else {
    const card = cardsById.get(expense.cardId);
    const rule = card ? ruleOf(card) : null;
    if (!rule) return null;
    firstMonth = invoiceMonthFor(expense.date, rule);
  }
  const parts = splitInstallments(expense.amountCents, expense.installments);
  return parts.map((amountCents, i) => ({
    expense,
    installment: i + 1,
    installments: parts.length,
    amountCents,
    month: addMonths(firstMonth, i),
  }));
}

export function buildLedger(data: Pick<AppData, 'cards' | 'expenses'>): Ledger {
  const cardsById = new Map(data.cards.map((c) => [c.id, c]));
  const entries: LedgerEntry[] = [];
  const pending: Expense[] = [];
  for (const expense of data.expenses) {
    const expanded = expandExpense(expense, cardsById);
    if (expanded) entries.push(...expanded);
    else pending.push(expense);
  }
  return { entries, pending };
}

export function entriesInMonth(ledger: Ledger, month: YearMonth): LedgerEntry[] {
  return ledger.entries.filter((e) => sameYm(e.month, month));
}

function sum(values: Iterable<number>): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

export interface MethodTotal {
  key: string;
  cardId: string | null;
  totalCents: number;
}

export interface MonthSummary {
  month: YearMonth;
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  /** Um item por cartão (na ordem configurada) e um para Pix / débito. */
  byMethod: MethodTotal[];
}

export function monthSummary(
  month: YearMonth,
  ledger: Ledger,
  data: Pick<AppData, 'cards' | 'incomes'>,
): MonthSummary {
  const entries = entriesInMonth(ledger, month);
  const totals = new Map<string, number>();
  for (const e of entries) {
    const key = methodKey(e.expense.cardId);
    totals.set(key, (totals.get(key) ?? 0) + e.amountCents);
  }
  const cards = [...data.cards].sort((a, b) => a.order - b.order);
  const byMethod: MethodTotal[] = [
    ...cards.map((c) => ({ key: c.id, cardId: c.id, totalCents: totals.get(c.id) ?? 0 })),
    { key: PIX_KEY, cardId: null, totalCents: totals.get(PIX_KEY) ?? 0 },
  ];
  const incomeCents = sum(data.incomes.filter((i) => sameYm(ymOf(i.date), month)).map((i) => i.amountCents));
  const expenseCents = sum(entries.map((e) => e.amountCents));
  return { month, incomeCents, expenseCents, balanceCents: incomeCents - expenseCents, byMethod };
}

export interface SubcategoryTotal {
  /** `null` agrupa os lançamentos da categoria sem subcategoria. */
  category: Category | null;
  totalCents: number;
}

export interface CategoryTotal {
  category: Category;
  totalCents: number;
  /** Total por cartão (id) e por Pix / débito (`PIX_KEY`). */
  byMethod: Record<string, number>;
  subcategories: SubcategoryTotal[];
}

/**
 * Gastos do mês por categoria principal, do maior para o menor.
 * Categorias ocultas só aparecem se tiverem gastos no mês.
 */
export function categoryBreakdown(month: YearMonth, ledger: Ledger, categories: Category[]): CategoryTotal[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const rows = new Map<string, CategoryTotal>();
  const subTotals = new Map<string, Map<string, number>>();

  for (const c of categories) {
    if (c.parentId === null) {
      rows.set(c.id, { category: c, totalCents: 0, byMethod: {}, subcategories: [] });
      subTotals.set(c.id, new Map());
    }
  }

  for (const e of entriesInMonth(ledger, month)) {
    const row = rows.get(e.expense.categoryId);
    if (!row) continue;
    row.totalCents += e.amountCents;
    const key = methodKey(e.expense.cardId);
    row.byMethod[key] = (row.byMethod[key] ?? 0) + e.amountCents;
    const subKey = e.expense.subcategoryId ?? '';
    const subs = subTotals.get(row.category.id)!;
    subs.set(subKey, (subs.get(subKey) ?? 0) + e.amountCents);
  }

  for (const row of rows.values()) {
    const subs = subTotals.get(row.category.id)!;
    const hasNamedSub = [...subs.keys()].some((k) => k !== '');
    if (!hasNamedSub) continue;
    row.subcategories = [...subs.entries()]
      .map(([id, totalCents]) => ({ category: id ? (byId.get(id) ?? null) : null, totalCents }))
      .sort((a, b) => b.totalCents - a.totalCents);
  }

  return [...rows.values()]
    .filter((r) => !r.category.hidden || r.totalCents > 0)
    .sort((a, b) => b.totalCents - a.totalCents || a.category.order - b.category.order);
}

export interface InvoiceSummary {
  card: Card;
  period: InvoicePeriod;
  status: InvoiceStatus;
  totalCents: number;
  entries: LedgerEntry[];
}

/** Fatura de um cartão com vencimento no mês informado, ou `null` se o cartão não tem fechamento configurado. */
export function invoiceFor(card: Card, dueMonth: YearMonth, ledger: Ledger, today: ISODate): InvoiceSummary | null {
  const rule = ruleOf(card);
  if (!rule) return null;
  const period = invoicePeriod(dueMonth, rule);
  const entries = ledger.entries.filter((e) => e.expense.cardId === card.id && sameYm(e.month, dueMonth));
  return {
    card,
    period,
    status: invoiceStatus(period, today),
    totalCents: sum(entries.map((e) => e.amountCents)),
    entries,
  };
}
