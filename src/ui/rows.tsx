import { invoicePeriod, ruleOf } from '../domain/billing';
import { formatBRL, formatDateBR } from '../domain/format';
import { PIX_LABEL } from '../domain/ledger';
import type { LedgerEntry } from '../domain/ledger';
import type { Card, Category, Expense, Income } from '../domain/types';
import { ColorDot } from './components';
import { Icon } from './icons';
import { INCOME_TYPE_LABEL } from './labels';

interface ExpenseRowProps {
  expense: Expense;
  /** Parcela exibida, ou `null` para mostrar a compra inteira. */
  entry: LedgerEntry | null;
  /** 1ª parcela, usada para mostrar a 1ª fatura da compra inteira. */
  firstEntry: LedgerEntry | null;
  amountCents: number;
  cards: Card[];
  catById: Map<string, Category>;
  /** Esconde cartão e fatura quando a lista já é de um cartão ou da conta. */
  compact?: boolean;
  /** Mostra o valor com sinal de saída (lista da conta, que mistura entradas e saídas). */
  outflow?: boolean;
  onOpen(): void;
}

export function ExpenseRow({ expense: e, entry, firstEntry, amountCents, cards, catById, compact, outflow, onOpen }: ExpenseRowProps) {
  const card = cards.find((c) => c.id === e.cardId);
  const rule = card ? ruleOf(card) : null;
  const category = catById.get(e.categoryId);
  const sub = e.subcategoryId ? catById.get(e.subcategoryId) : undefined;
  const shownEntry = entry ?? firstEntry;
  const due = rule && shownEntry ? invoicePeriod(shownEntry.month, rule).dueDate : null;
  const n = e.installments;
  const per = n > 1 ? (entry?.amountCents ?? Math.floor(e.amountCents / n)) : null;
  const showTags = !compact || n > 1 || (card && !rule);

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
        {showTags && (
          <span class="tx-tags">
            {!compact && (
              <span class="tag">
                {card ? <ColorDot color={card.color} color2={card.color2} /> : <Icon name="transfer" size={12} />}
                {card ? card.last4 : PIX_LABEL}
              </span>
            )}
            {n > 1 && <span class="tag installment">{entry ? `${entry.installment}/${n}` : `${n}x`}</span>}
            {card && !rule && <span class="tag pending">Fatura a definir</span>}
            {!compact && due && (
              <span class="tag">
                {entry || n === 1 ? 'Fatura' : '1ª fatura'} {formatDateBR(due)}
              </span>
            )}
          </span>
        )}
      </span>
      <span class="tx-amount">
        {outflow ? `−${formatBRL(amountCents)}` : formatBRL(amountCents)}
        {n > 1 && entry && <small>de {formatBRL(e.amountCents)}</small>}
        {n > 1 && !entry && per !== null && (
          <small>
            {n}x de {formatBRL(per)}
          </small>
        )}
      </span>
    </button>
  );
}

export function IncomeRow({ income, onOpen }: { income: Income; onOpen(): void }) {
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
