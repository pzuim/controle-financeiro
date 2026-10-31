import { useMemo } from 'preact/hooks';
import { currentInvoiceMonth, ruleOf, suggestedPurchaseDate } from '../../domain/billing';
import { addMonths, parseYmKey, sameYm, suggestedDateInMonth, ymKey } from '../../domain/dates';
import { formatBRL, formatDayMonth, formatDayMonthShort, formatMonthYear } from '../../domain/format';
import { PIX_LABEL, invoiceFor } from '../../domain/ledger';
import type { YearMonth } from '../../domain/types';
import { accessibleAccent } from '../colors';
import { CardFace, FabMenu, Sheet } from '../components';
import { useUI } from '../context';
import { Icon } from '../icons';
import { cardNumberLabel, sortedCards } from '../labels';
import { ExpenseRow } from '../rows';

/** Cartão aberto: fatura escolhida, seus lançamentos e o botão + (despesa ou Pix). */
export function CardSheet({ cardId }: { cardId: string }) {
  const ui = useUI();
  const cards = sortedCards(ui.data.cards);
  const card = cards.find((c) => c.id === cardId);
  const catById = useMemo(() => new Map(ui.data.categories.map((c) => [c.id, c])), [ui.data.categories]);

  if (!card) {
    return (
      <Sheet title="Cartão" onClose={ui.close} variant="page">
        <div class="empty">Cartão não encontrado.</div>
      </Sheet>
    );
  }

  const label = cardNumberLabel(card, cards);
  const rule = ruleOf(card);
  const openMonth = rule ? currentInvoiceMonth(rule, ui.today) : null;
  const chosen = ui.invoiceByCard[card.id];
  const month = openMonth ? (chosen ? parseYmKey(chosen) : openMonth) : null;
  const invoice = month ? invoiceFor(card, month, ui.ledger, ui.today) : null;
  // Fatura já fechada e ainda não vencida, quando o usuário está olhando a fatura aberta.
  const closedToPay =
    month && openMonth && sameYm(month, openMonth) ? invoiceFor(card, addMonths(openMonth, -1), ui.ledger, ui.today) : null;
  const entries = invoice
    ? [...invoice.entries].sort(
        (a, b) => b.expense.date.localeCompare(a.expense.date) || b.expense.createdAt.localeCompare(a.expense.createdAt),
      )
    : [];
  const accent = accessibleAccent(card.color2);

  // Compra nova cai na fatura que está na tela. Pix novo: hoje na fatura aberta; em outra fatura, no mês dela.
  const purchaseDate = month && rule ? suggestedPurchaseDate(month, rule, ui.today) : undefined;
  const pixDate = month && openMonth && !sameYm(month, openMonth) ? suggestedDateInMonth(month, ui.today) : undefined;

  const select = (m: YearMonth) => ui.setInvoiceFor(card.id, openMonth && sameYm(m, openMonth) ? null : ymKey(m));

  const fab = (
    <FabMenu
      color={accent}
      actions={[
        {
          label: 'Despesa no cartão',
          sub: `Compra no ${label} · final ${card.last4}`,
          icon: 'card',
          onSelect: () => ui.open({ type: 'expense', cardId: card.id, date: purchaseDate }),
        },
        {
          label: PIX_LABEL,
          sub: 'Dinheiro que sai da conta',
          icon: 'transfer',
          onSelect: () => ui.open({ type: 'expense', cardId: null, date: pixDate }),
        },
      ]}
    />
  );

  return (
    <Sheet title={label} onClose={ui.close} variant="page" fab={fab}>
      <div class="card-preview">
        <CardFace
          card={card}
          numberLabel={label}
          invoice={invoice ? { status: invoice.status, dueDate: invoice.period.dueDate, totalCents: invoice.totalCents } : null}
        />
      </div>

      {invoice && month && openMonth ? (
        <>
          <div class="period-nav">
            <button type="button" class="icon-btn" aria-label="Fatura anterior" onClick={() => select(addMonths(month, -1))}>
              <Icon name="chevronLeft" />
            </button>
            <div class="center">
              <div class="invoice-month">Fatura de {formatMonthYear(month)}</div>
              <div class="eyebrow">
                Compras de {formatDayMonth(invoice.period.startDate)} a {formatDayMonth(invoice.period.closingDate)}
              </div>
            </div>
            <button type="button" class="icon-btn" aria-label="Próxima fatura" onClick={() => select(addMonths(month, 1))}>
              <Icon name="chevronRight" />
            </button>
          </div>
          {!sameYm(month, openMonth) && (
            <div style={{ textAlign: 'center' }}>
              <button type="button" class="link-btn small" onClick={() => select(openMonth)}>
                Voltar para a fatura aberta
              </button>
            </div>
          )}

          {closedToPay && closedToPay.status === 'fechada' && closedToPay.totalCents > 0 && (
            <button type="button" class="hint-row" onClick={() => select(closedToPay.period.dueMonth)}>
              <Icon name="calendar" size={20} />
              <span class="grow">
                Fatura fechada de <strong class="num">{formatBRL(closedToPay.totalCents)}</strong> vence em{' '}
                {formatDayMonthShort(closedToPay.period.dueDate)}
              </span>
              <Icon name="chevronRight" size={18} />
            </button>
          )}

          {entries.length === 0 ? (
            <div class="empty">Nenhum lançamento nesta fatura.</div>
          ) : (
            <section class="panel" style={{ marginTop: '12px', paddingTop: '4px', paddingBottom: '4px' }}>
              <ul class="list">
                {entries.map((e) => (
                  <li key={`${e.expense.id}#${e.installment}`}>
                    <ExpenseRow
                      expense={e.expense}
                      entry={e}
                      firstEntry={null}
                      amountCents={e.amountCents}
                      cards={cards}
                      catById={catById}
                      compact
                      onOpen={() => ui.open({ type: 'expense', expenseId: e.expense.id })}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        <section class="panel" style={{ marginTop: '16px' }}>
          <p>
            <strong>Defina o dia de fechamento</strong> dos cartões para o app calcular as faturas.
          </p>
          <button
            type="button"
            class="btn btn-dark btn-block"
            style={{ marginTop: '14px' }}
            onClick={() => ui.open({ type: 'rule' })}
          >
            Definir fechamento
          </button>
        </section>
      )}
    </Sheet>
  );
}
