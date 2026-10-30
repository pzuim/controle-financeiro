import { useMemo, useState } from 'preact/hooks';
import { sameYm, ymOf } from '../../domain/dates';
import { formatSignedBRL } from '../../domain/format';
import { PIX_LABEL, entriesInMonth, monthSummary } from '../../domain/ledger';
import type { LedgerEntry } from '../../domain/ledger';
import type { Income } from '../../domain/types';
import { ACCOUNT_COLOR2, AccountFace, FabMenu, MonthSelector, Sheet } from '../components';
import { useUI } from '../context';
import { sortedCards } from '../labels';
import { ExpenseRow, IncomeRow } from '../rows';

type Item = { key: string; date: string; created: string } & (
  | { kind: 'income'; income: Income }
  | { kind: 'pix'; entry: LedgerEntry }
);

/** Conta: a renda (entrada) e os Pix / transferências (saída), que não pertencem a nenhum cartão. */
export function AccountSheet() {
  const ui = useUI();
  const cards = sortedCards(ui.data.cards);
  const catById = useMemo(() => new Map(ui.data.categories.map((c) => [c.id, c])), [ui.data.categories]);
  const [month, setMonth] = useState(ymOf(ui.today));

  const s = monthSummary(month, ui.ledger, ui.data);
  const cardsTotal = s.byMethod.filter((m) => m.cardId !== null).reduce((sum, m) => sum + m.totalCents, 0);
  const pixTotal = s.byMethod.find((m) => m.cardId === null)?.totalCents ?? 0;

  const items: Item[] = [
    ...ui.data.incomes
      .filter((i) => sameYm(ymOf(i.date), month))
      .map((i): Item => ({ kind: 'income', key: i.id, date: i.date, created: i.createdAt, income: i })),
    ...entriesInMonth(ui.ledger, month)
      .filter((e) => e.expense.cardId === null)
      .map((e): Item => ({ kind: 'pix', key: e.expense.id, date: e.expense.date, created: e.expense.createdAt, entry: e })),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.created.localeCompare(a.created));

  const fab = (
    <FabMenu
      color={ACCOUNT_COLOR2}
      actions={[
        {
          label: 'Renda',
          sub: 'Entrada na conta, vale para os dois cartões',
          icon: 'income',
          onSelect: () => ui.open({ type: 'income' }),
        },
        {
          label: PIX_LABEL,
          sub: 'Dinheiro que sai da conta',
          icon: 'transfer',
          onSelect: () => ui.open({ type: 'expense', cardId: null }),
        },
      ]}
    />
  );

  return (
    <Sheet title="Conta" onClose={ui.close} variant="page" fab={fab}>
      <div class="card-preview">
        <AccountFace month={month} balanceCents={s.balanceCents} />
      </div>

      <div style={{ marginTop: '16px' }}>
        <MonthSelector month={month} today={ui.today} onChange={setMonth} />
      </div>

      <section class="panel" style={{ marginTop: '12px' }} aria-label="Composição do saldo">
        <ul class="split account-stats">
          <li>
            <span class="grow">Renda</span>
            <span class="num">{formatSignedBRL(s.incomeCents)}</span>
          </li>
          <li>
            <span class="grow">Faturas dos cartões</span>
            <span class="num">{formatSignedBRL(-cardsTotal)}</span>
          </li>
          <li>
            <span class="grow">{PIX_LABEL}</span>
            <span class="num">{formatSignedBRL(-pixTotal)}</span>
          </li>
          <li class="total">
            <span class="grow">Saldo do mês</span>
            <span class="num">{formatSignedBRL(s.balanceCents)}</span>
          </li>
        </ul>
      </section>

      <h2 class="section-title">Entradas e saídas da conta</h2>
      {items.length === 0 ? (
        <div class="empty">Nenhuma renda ou Pix neste mês. Use o botão + para lançar.</div>
      ) : (
        <section class="panel" style={{ paddingTop: '4px', paddingBottom: '4px' }}>
          <ul class="list">
            {items.map((item) => (
              <li key={item.key}>
                {item.kind === 'income' ? (
                  <IncomeRow income={item.income} onOpen={() => ui.open({ type: 'income', incomeId: item.income.id })} />
                ) : (
                  <ExpenseRow
                    expense={item.entry.expense}
                    entry={item.entry}
                    firstEntry={null}
                    amountCents={item.entry.amountCents}
                    cards={cards}
                    catById={catById}
                    compact
                    outflow
                    onOpen={() => ui.open({ type: 'expense', expenseId: item.entry.expense.id })}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </Sheet>
  );
}
