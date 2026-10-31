import { currentInvoiceMonth, ruleOf } from '../../domain/billing';
import { ymOf } from '../../domain/dates';
import { PIX_LABEL, invoiceFor, periodSummary } from '../../domain/ledger';
import { AccountFace, CardFace } from '../components';
import { useUI } from '../context';
import { Icon } from '../icons';
import { cardNumberLabel, sortedCards } from '../labels';

/** Tela inicial: cartões empilhados, como numa carteira. Tocar num cartão abre os detalhes. */
export function CardsScreen() {
  const ui = useUI();
  const cards = sortedCards(ui.data.cards);
  const thisMonth = ymOf(ui.today);
  const balance = periodSummary(thisMonth, ui.ledger, ui.data).balanceCents;

  return (
    <div class="screen">
      <header class="screen-header">
        <h1>Cartões</h1>
        <button type="button" class="icon-btn" aria-label="Histórico de lançamentos" onClick={() => ui.open({ type: 'history' })}>
          <Icon name="history" />
        </button>
        <button type="button" class="icon-btn" aria-label="Configurações" onClick={() => ui.open({ type: 'settings' })}>
          <Icon name="settings" />
        </button>
      </header>

      <div class="wallet">
        {cards.map((card) => {
          const label = cardNumberLabel(card, cards);
          const rule = ruleOf(card);
          const inv = rule ? invoiceFor(card, currentInvoiceMonth(rule, ui.today), ui.ledger, ui.today) : null;
          return (
            <button
              type="button"
              key={card.id}
              class="wallet-item"
              aria-label={`Abrir ${label}, final ${card.last4}`}
              onClick={() => ui.open({ type: 'cardView', cardId: card.id })}
            >
              <CardFace
                card={card}
                numberLabel={label}
                invoice={inv ? { status: inv.status, dueDate: inv.period.dueDate, totalCents: inv.totalCents } : null}
              />
            </button>
          );
        })}
        <button
          type="button"
          class="wallet-item"
          aria-label={`Abrir Conta: renda e ${PIX_LABEL}`}
          onClick={() => ui.open({ type: 'account' })}
        >
          <AccountFace month={thisMonth} balanceCents={balance} />
        </button>
      </div>

      <p class="wallet-hint">Toque em um cartão para ver a fatura e lançar despesas. Na Conta ficam a renda e os Pix.</p>
    </div>
  );
}
