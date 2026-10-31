import { invoicePeriod, ruleOf } from '../../domain/billing';
import { capitalize, formatBRL, formatDayMonth, formatSignedBRL, monthName } from '../../domain/format';
import { periodSummary, PIX_LABEL } from '../../domain/ledger';
import { ColorDot, Notice, PeriodControls } from '../components';
import { useUI } from '../context';
import { Icon } from '../icons';
import { cardNumberLabel, periodView, sortedCards } from '../labels';

export function SummaryScreen() {
  const ui = useUI();
  const cards = sortedCards(ui.data.cards);
  const view = periodView(ui.scope, ui.month);
  const year = ui.month.year;
  const s = periodSummary(view.period, ui.ledger, ui.data);
  const tone = s.balanceCents > 0 ? 'positive' : s.balanceCents < 0 ? 'negative' : 'zero';
  const pendingCards = cards.filter((c) => ui.ledger.pending.some((e) => e.cardId === c.id));
  const months = view.yearly
    ? Array.from({ length: 12 }, (_, i) => ({ month: i + 1, s: periodSummary({ year, month: i + 1 }, ui.ledger, ui.data) }))
    : [];

  const openMonth = (month: number) => {
    ui.setMonth({ year, month });
    ui.setScope('month');
    window.scrollTo(0, 0);
  };

  return (
    <div class="screen">
      <header class="screen-header">
        <h1>Resumo</h1>
        <button
          type="button"
          class="icon-btn"
          aria-label={`Lançamentos do ${view.unit}`}
          onClick={() => ui.open({ type: 'history', filter: { month: view.historyKey } })}
        >
          <Icon name="history" />
        </button>
      </header>

      <PeriodControls scope={ui.scope} month={ui.month} today={ui.today} onScope={ui.setScope} onMonth={ui.setMonth} />

      <section class={`balance ${tone}`} aria-label={`Saldo do ${view.unit}`}>
        <div class="balance-head">
          <span class="balance-label">Saldo do {view.unit}</span>
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
        <div class="balance-caption">
          Renda menos despesas de {view.yearly ? `janeiro a dezembro de ${year}` : view.label}
        </div>
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

      {view.yearly && (
        <>
          <h2 class="section-title">Mês a mês</h2>
          <section class="panel" style={{ paddingTop: '6px', paddingBottom: '6px' }}>
            <ul class="list">
              {months.map(({ month, s: m }) => {
                const empty = m.incomeCents === 0 && m.expenseCents === 0;
                const mTone = m.balanceCents > 0 ? 'positive' : m.balanceCents < 0 ? 'negative' : '';
                return (
                  <li key={month}>
                    <button
                      type="button"
                      class={empty ? 'method-row empty-month' : 'method-row'}
                      onClick={() => openMonth(month)}
                    >
                      <span class="grow">
                        <span class="method-name">{capitalize(monthName(month))}</span>
                        {empty ? (
                          <span class="method-sub" style={{ display: 'block' }}>
                            Sem lançamentos
                          </span>
                        ) : (
                          <>
                            <span class="method-sub" style={{ display: 'block' }}>
                              Renda {formatBRL(m.incomeCents)}
                            </span>
                            <span class="method-sub" style={{ display: 'block' }}>
                              Despesas {formatBRL(m.expenseCents)}
                            </span>
                          </>
                        )}
                      </span>
                      <span class={`method-value num month-row-value ${mTone}`}>
                        {empty ? '—' : formatSignedBRL(m.balanceCents)}
                      </span>
                      <Icon name="chevronRight" size={18} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      <h2 class="section-title">Gastos por cartão</h2>
      <section class="panel" style={{ paddingTop: '6px', paddingBottom: '6px' }}>
        <ul class="list">
          {s.byMethod.map((m) => {
            const card = cards.find((c) => c.id === m.cardId);
            const rule = card ? ruleOf(card) : null;
            const sub = card
              ? rule
                ? view.yearly
                  ? `Faturas que vencem em ${year}`
                  : `Fatura que vence em ${formatDayMonth(invoicePeriod(ui.month, rule).dueDate)}`
                : 'Fechamento não definido'
              : 'Pela data do pagamento';
            return (
              <li key={m.key}>
                <button
                  type="button"
                  class="method-row"
                  onClick={() => ui.open({ type: 'history', filter: { month: view.historyKey, method: m.key } })}
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
        rendas contam no mês da data.{view.yearly && ' O ano soma os doze meses com as mesmas regras.'}
      </p>
    </div>
  );
}
