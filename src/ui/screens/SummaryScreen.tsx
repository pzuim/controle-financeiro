import { invoicePeriod, ruleOf } from '../../domain/billing';
import { ymKey } from '../../domain/dates';
import { formatBRL, formatDayMonth, formatMonthYear, formatSignedBRL } from '../../domain/format';
import { monthSummary, PIX_LABEL } from '../../domain/ledger';
import { ColorDot, MonthSelector, Notice } from '../components';
import { useUI } from '../context';
import { Icon } from '../icons';
import { cardNumberLabel, sortedCards } from '../labels';

export function SummaryScreen() {
  const ui = useUI();
  const cards = sortedCards(ui.data.cards);
  const s = monthSummary(ui.month, ui.ledger, ui.data);
  const tone = s.balanceCents > 0 ? 'positive' : s.balanceCents < 0 ? 'negative' : 'zero';
  const pendingCards = cards.filter((c) => ui.ledger.pending.some((e) => e.cardId === c.id));

  return (
    <div class="screen">
      <header class="screen-header">
        <h1>Resumo mensal</h1>
        <button
          type="button"
          class="icon-btn"
          aria-label="Lançamentos do mês"
          onClick={() => ui.open({ type: 'history', filter: { month: ymKey(ui.month) } })}
        >
          <Icon name="history" />
        </button>
      </header>

      <MonthSelector month={ui.month} today={ui.today} onChange={ui.setMonth} />

      <section class={`balance ${tone}`} aria-label="Saldo do mês">
        <div class="balance-head">
          <span class="balance-label">Saldo do mês</span>
          {tone === 'positive' && (
            <span class="balance-tag">
              <Icon name="check" size={14} strokeWidth={2.4} /> Positivo
            </span>
          )}
          {tone === 'negative' && (
            <span class="balance-tag">
              <Icon name="alert" size={14} strokeWidth={2.2} /> Déficit
            </span>
          )}
        </div>
        <div class="balance-value num">{formatSignedBRL(s.balanceCents)}</div>
        <div class="balance-caption">Renda menos despesas de {formatMonthYear(ui.month)}</div>
      </section>

      <div class="stat-grid">
        <div class="stat">
          <div class="stat-label">
            <Icon name="income" size={18} /> Renda
          </div>
          <div class="stat-value num">{formatBRL(s.incomeCents)}</div>
        </div>
        <div class="stat">
          <div class="stat-label">
            <Icon name="wallet" size={18} /> Despesas
          </div>
          <div class="stat-value num">{formatBRL(s.expenseCents)}</div>
        </div>
      </div>

      <h2 class="section-title">Gastos por cartão</h2>
      <section class="panel" style={{ paddingTop: '6px', paddingBottom: '6px' }}>
        <ul class="list">
          {s.byMethod.map((m) => {
            const card = cards.find((c) => c.id === m.cardId);
            const rule = card ? ruleOf(card) : null;
            const sub = card
              ? rule
                ? `Fatura que vence em ${formatDayMonth(invoicePeriod(ui.month, rule).dueDate)}`
                : 'Fechamento não definido'
              : 'Pela data do pagamento';
            return (
              <li key={m.key}>
                <button
                  type="button"
                  class="method-row"
                  onClick={() => ui.open({ type: 'history', filter: { month: ymKey(ui.month), method: m.key } })}
                >
                  {card ? (
                    <ColorDot color={card.color} color2={card.color2} />
                  ) : (
                    <span class="pix-dot">
                      <Icon name="wallet" size={14} />
                    </span>
                  )}
                  <span class="grow">
                    <span class="method-name">
                      {card ? `${cardNumberLabel(card, cards)} · final ${card.last4}` : PIX_LABEL}
                    </span>
                    <span class="method-sub" style={{ display: 'block' }}>
                      {sub}
                    </span>
                  </span>
                  <span class="method-value num">{formatBRL(m.totalCents)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {pendingCards.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <Notice tone="warning">
            Há lançamentos sem fatura definida no cartão{' '}
            {pendingCards.map((c) => `final ${c.last4}`).join(' e ')}. Eles entram no resumo quando você informar o
            dia de fechamento em Configurações.
          </Notice>
        </div>
      )}

      <p class="empty-note" style={{ marginTop: '14px' }}>
        Compras no cartão contam no mês de vencimento da fatura; parcelas, no mês de cada fatura. {PIX_LABEL} e
        rendas contam no mês da data.
      </p>
    </div>
  );
}
