import { useMemo, useState } from 'preact/hooks';
import { invoicePeriod, ruleOf } from '../../domain/billing';
import { parseYmKey, sameYm, ymKey, ymOf } from '../../domain/dates';
import { capitalize, formatBRL, formatDateBR, formatMonthYear } from '../../domain/format';
import { PIX_KEY, PIX_LABEL } from '../../domain/ledger';
import type { LedgerEntry } from '../../domain/ledger';
import type { Card, Category, Expense, Income, ISODate } from '../../domain/types';
import { ColorDot, Sheet } from '../components';
import type { HistoryFilter } from '../context';
import { useUI } from '../context';
import { Icon } from '../icons';
import { INCOME_TYPE_LABEL, sortedCards } from '../labels';
import { normalize, plural } from '../text';

type Item =
  | {
      kind: 'expense';
      key: string;
      expense: Expense;
      /** Parcela exibida (no filtro por mês) ou `null` para a compra inteira. */
      entry: LedgerEntry | null;
      firstEntry: LedgerEntry | null;
      amountCents: number;
      date: ISODate;
    }
  | { kind: 'income'; key: string; income: Income; amountCents: number; date: ISODate };

const PAGE = 120;

export function HistorySheet({ filter }: { filter?: HistoryFilter | undefined }) {
  const ui = useUI();
  const cards = sortedCards(ui.data.cards);
  const categories = ui.data.categories;
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const [query, setQuery] = useState('');
  const [month, setMonth] = useState(filter?.month ?? ymKey(ui.month));
  const [method, setMethod] = useState(filter?.method ?? 'all');
  const [categoryId, setCategoryId] = useState(filter?.categoryId ?? 'all');
  const [limit, setLimit] = useState(PAGE);

  const firstEntryOf = useMemo(() => {
    const map = new Map<string, LedgerEntry>();
    for (const e of ui.ledger.entries) if (e.installment === 1) map.set(e.expense.id, e);
    return map;
  }, [ui.ledger]);

  const monthOptions = useMemo(() => {
    const keys = new Set<string>([ymKey(ui.month), ymKey(ymOf(ui.today)), month === 'all' ? ymKey(ui.month) : month]);
    for (const e of ui.ledger.entries) keys.add(ymKey(e.month));
    for (const e of ui.ledger.pending) keys.add(ymKey(ymOf(e.date)));
    for (const i of ui.data.incomes) keys.add(ymKey(ymOf(i.date)));
    return [...keys].sort().reverse();
  }, [ui.ledger, ui.data.incomes]);

  const items = useMemo((): Item[] => {
    const list: Item[] = [];
    const wantsExpenses = method !== 'income';
    const wantsIncomes = (method === 'all' || method === 'income') && categoryId === 'all';
    const ym = month === 'all' ? null : parseYmKey(month);

    if (wantsExpenses) {
      if (ym) {
        for (const entry of ui.ledger.entries) {
          if (!sameYm(entry.month, ym)) continue;
          list.push({
            kind: 'expense',
            key: `${entry.expense.id}#${entry.installment}`,
            expense: entry.expense,
            entry,
            firstEntry: firstEntryOf.get(entry.expense.id) ?? null,
            amountCents: entry.amountCents,
            date: entry.expense.date,
          });
        }
        for (const e of ui.ledger.pending) {
          if (sameYm(ymOf(e.date), ym)) {
            list.push({ kind: 'expense', key: e.id, expense: e, entry: null, firstEntry: null, amountCents: e.amountCents, date: e.date });
          }
        }
      } else {
        for (const e of ui.data.expenses) {
          list.push({
            kind: 'expense',
            key: e.id,
            expense: e,
            entry: null,
            firstEntry: firstEntryOf.get(e.id) ?? null,
            amountCents: e.amountCents,
            date: e.date,
          });
        }
      }
    }
    if (wantsIncomes) {
      for (const i of ui.data.incomes) {
        if (ym && !sameYm(ymOf(i.date), ym)) continue;
        list.push({ kind: 'income', key: i.id, income: i, amountCents: i.amountCents, date: i.date });
      }
    }

    const q = normalize(query);
    return list
      .filter((item) => {
        if (item.kind === 'expense') {
          const e = item.expense;
          if (method !== 'all' && method !== (e.cardId ?? PIX_KEY)) return false;
          if (categoryId !== 'all' && e.categoryId !== categoryId) return false;
          if (!q) return true;
          const card = cards.find((c) => c.id === e.cardId);
          const haystack = [
            e.description,
            catById.get(e.categoryId)?.name ?? '',
            e.subcategoryId ? (catById.get(e.subcategoryId)?.name ?? '') : '',
            card ? card.last4 : PIX_LABEL,
            formatBRL(item.amountCents),
            formatBRL(e.amountCents),
          ].join(' ');
          return normalize(haystack).includes(q);
        }
        if (!q) return true;
        const i = item.income;
        return normalize(`${i.description} renda ${i.type ? INCOME_TYPE_LABEL[i.type] : ''} ${formatBRL(i.amountCents)}`).includes(q);
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.key.localeCompare(a.key));
  }, [ui.ledger, ui.data, month, method, categoryId, query]);

  const expenseTotal = items.reduce((s, i) => s + (i.kind === 'expense' ? i.amountCents : 0), 0);
  const incomeTotal = items.reduce((s, i) => s + (i.kind === 'income' ? i.amountCents : 0), 0);

  return (
    <Sheet title="Histórico" onClose={ui.close}>
      <div class="search">
        <Icon name="search" size={20} />
        <input
          class="input"
          type="search"
          placeholder="Buscar por descrição, categoria ou valor"
          aria-label="Buscar lançamentos"
          value={query}
          onInput={(e) => {
            setQuery(e.currentTarget.value);
            setLimit(PAGE);
          }}
        />
      </div>
      <div class="filters">
        <select class="input full" aria-label="Mês" value={month} onChange={(e) => setMonth(e.currentTarget.value)}>
          <option value="all">Todos os meses</option>
          {monthOptions.map((k) => (
            <option value={k}>{capitalize(formatMonthYear(parseYmKey(k)))}</option>
          ))}
        </select>
        <select class="input" aria-label="Cartão" value={method} onChange={(e) => setMethod(e.currentTarget.value)}>
          <option value="all">Todos</option>
          {cards.map((c) => (
            <option value={c.id}>Cartão {c.last4}</option>
          ))}
          <option value={PIX_KEY}>{PIX_LABEL}</option>
          <option value="income">Rendas</option>
        </select>
        <select class="input" aria-label="Categoria" value={categoryId} onChange={(e) => setCategoryId(e.currentTarget.value)}>
          <option value="all">Categorias</option>
          {categories
            .filter((c) => c.parentId === null)
            .sort((a, b) => a.order - b.order)
            .map((c) => (
              <option value={c.id}>{c.name}</option>
            ))}
        </select>
      </div>

      <p class="result-summary">
        {plural(items.length, 'lançamento', 'lançamentos')}
        {expenseTotal > 0 && <> · Despesas <strong class="num">{formatBRL(expenseTotal)}</strong></>}
        {incomeTotal > 0 && <> · Rendas <strong class="num">{formatBRL(incomeTotal)}</strong></>}
        {month !== 'all' && (
          <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '2px' }}>
            Cartões pelo mês de vencimento da fatura; Pix / débito e rendas pela data.
          </span>
        )}
      </p>

      {items.length === 0 ? (
        <div class="empty panel">
          <Icon name="search" size={32} />
          Nenhum lançamento encontrado.
        </div>
      ) : (
        <section class="panel" style={{ paddingTop: '4px', paddingBottom: '4px' }}>
          <ul class="list">
            {items.slice(0, limit).map((item) => (
              <li key={item.key}>
                {item.kind === 'expense' ? (
                  <ExpenseRow item={item} cards={cards} catById={catById} onOpen={() => ui.open({ type: 'expense', expenseId: item.expense.id })} />
                ) : (
                  <IncomeRow income={item.income} onOpen={() => ui.open({ type: 'income', incomeId: item.income.id })} />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {items.length > limit && (
        <button type="button" class="btn btn-secondary btn-block" style={{ marginTop: '12px' }} onClick={() => setLimit(limit + PAGE)}>
          Mostrar mais
        </button>
      )}
    </Sheet>
  );
}

interface ExpenseRowProps {
  item: Extract<Item, { kind: 'expense' }>;
  cards: Card[];
  catById: Map<string, Category>;
  onOpen(): void;
}

function ExpenseRow({ item, cards, catById, onOpen }: ExpenseRowProps) {
  const e = item.expense;
  const card = cards.find((c) => c.id === e.cardId);
  const rule = card ? ruleOf(card) : null;
  const category = catById.get(e.categoryId);
  const sub = e.subcategoryId ? catById.get(e.subcategoryId) : undefined;
  const shownEntry = item.entry ?? item.firstEntry;
  const due = rule && shownEntry ? invoicePeriod(shownEntry.month, rule).dueDate : null;
  const n = e.installments;
  const per = n > 1 ? (item.entry?.amountCents ?? Math.floor(e.amountCents / n)) : null;

  return (
    <button type="button" class="tx" onClick={onOpen}>
      <span class="cat-icon">
        <Icon name={category?.icon ?? 'tag'} size={20} />
      </span>
      <span class="tx-main">
        <span class="tx-title" style={{ display: 'block' }}>
          {e.description}
        </span>
        <span class="tx-sub" style={{ display: 'block' }}>
          {category?.name ?? 'Sem categoria'}
          {sub ? ` · ${sub.name}` : ''} · {card ? 'Compra' : 'Pago'} em {formatDateBR(e.date)}
        </span>
        <span class="tx-tags">
          <span class="tag">
            {card ? <ColorDot color={card.color} color2={card.color2} /> : <Icon name="wallet" size={12} />}
            {card ? card.last4 : PIX_LABEL}
          </span>
          {n > 1 && <span class="tag installment">{item.entry ? `${item.entry.installment}/${n}` : `${n}x`}</span>}
          {card && !rule && <span class="tag pending">Fatura a definir</span>}
          {due && <span class="tag">{item.entry || n === 1 ? 'Fatura' : '1ª fatura'} {formatDateBR(due)}</span>}
        </span>
      </span>
      <span class="tx-amount">
        {formatBRL(item.amountCents)}
        {n > 1 && item.entry && <small>de {formatBRL(e.amountCents)}</small>}
        {n > 1 && !item.entry && per !== null && <small>{n}x de {formatBRL(per)}</small>}
      </span>
    </button>
  );
}

function IncomeRow({ income, onOpen }: { income: Income; onOpen(): void }) {
  return (
    <button type="button" class="tx" onClick={onOpen}>
      <span class="cat-icon" style={{ background: 'var(--positive-bg)', color: 'var(--positive)' }}>
        <Icon name="income" size={20} />
      </span>
      <span class="tx-main">
        <span class="tx-title" style={{ display: 'block' }}>
          {income.description}
        </span>
        <span class="tx-sub" style={{ display: 'block' }}>
          Renda{income.type ? ` · ${INCOME_TYPE_LABEL[income.type]}` : ''} · Recebida em {formatDateBR(income.date)}
        </span>
      </span>
      <span class="tx-amount income">+{formatBRL(income.amountCents)}</span>
    </button>
  );
}
