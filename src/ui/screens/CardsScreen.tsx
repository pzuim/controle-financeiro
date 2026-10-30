import { useEffect, useRef } from 'preact/hooks';
import { currentInvoiceMonth, ruleOf } from '../../domain/billing';
import { addMonths, parseYmKey, sameYm, ymKey } from '../../domain/dates';
import { capitalize, formatBRL, formatDateBR, formatDayMonth, formatDayMonthShort, formatMonthYear } from '../../domain/format';
import { invoiceFor } from '../../domain/ledger';
import type { Card, YearMonth } from '../../domain/types';
import { accessibleAccent } from '../colors';
import { CardFace, StatusPill } from '../components';
import { useUI } from '../context';
import { Icon } from '../icons';
import { cardNumberLabel, sortedCards } from '../labels';

export function CardsScreen() {
  const ui = useUI();
  const cards = sortedCards(ui.data.cards);
  const selectedIndex = Math.max(
    0,
    cards.findIndex((c) => c.id === ui.selectedCardId),
  );
  const selected = cards[selectedIndex];

  /** Fatura escolhida para o cartão; por padrão, a fatura aberta hoje. */
  const invoiceMonthOf = (card: Card): YearMonth | null => {
    const rule = ruleOf(card);
    if (!rule) return null;
    const chosen = ui.invoiceByCard[card.id];
    return chosen ? parseYmKey(chosen) : currentInvoiceMonth(rule, ui.today);
  };

  const scroller = useRef<HTMLDivElement>(null);
  const settling = useRef<number | undefined>(undefined);

  // Posiciona o carrossel no cartão selecionado ao abrir a tela.
  useEffect(() => {
    const el = scroller.current;
    const slide = el?.children[selectedIndex] as HTMLElement | undefined;
    if (el && slide) el.scrollLeft = slide.offsetLeft - (el.clientWidth - slide.clientWidth) / 2;
  }, []);

  const onScroll = () => {
    window.clearTimeout(settling.current);
    settling.current = window.setTimeout(() => {
      const el = scroller.current;
      if (!el) return;
      const center = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      let bestDistance = Infinity;
      Array.from(el.children).forEach((child, i) => {
        const c = child as HTMLElement;
        const distance = Math.abs(c.offsetLeft + c.clientWidth / 2 - center);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      });
      const card = cards[best];
      if (card && card.id !== ui.selectedCardId) ui.setSelectedCardId(card.id);
    }, 60);
  };

  const scrollToIndex = (index: number) => {
    const el = scroller.current;
    const slide = el?.children[index] as HTMLElement | undefined;
    if (!el || !slide) return;
    el.scrollTo({ left: slide.offsetLeft - (el.clientWidth - slide.clientWidth) / 2, behavior: 'smooth' });
    const card = cards[index];
    if (card) ui.setSelectedCardId(card.id);
  };

  if (!selected) return null;

  const accent = accessibleAccent(selected.color2);
  const month = invoiceMonthOf(selected);
  const invoice = month ? invoiceFor(selected, month, ui.ledger, ui.today) : null;
  const rule = ruleOf(selected);
  const openMonth = rule ? currentInvoiceMonth(rule, ui.today) : null;
  const pendingCount = ui.ledger.pending.filter((e) => e.cardId === selected.id).length;

  // Fatura já fechada e ainda não vencida, quando o usuário está olhando a fatura aberta.
  const closedToPay =
    invoice && openMonth && sameYm(invoice.period.dueMonth, openMonth)
      ? invoiceFor(selected, addMonths(openMonth, -1), ui.ledger, ui.today)
      : null;

  const selectInvoice = (m: YearMonth) =>
    ui.setInvoiceFor(selected.id, openMonth && sameYm(m, openMonth) ? null : ymKey(m));

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

      <div class="carousel" ref={scroller} onScroll={onScroll} aria-label="Seus cartões">
        {cards.map((card, i) => {
          const m = invoiceMonthOf(card);
          const inv = m ? invoiceFor(card, m, ui.ledger, ui.today) : null;
          return (
            <button
              type="button"
              class={`carousel-slide${i === selectedIndex ? ' active' : ''}`}
              aria-label={`${cardNumberLabel(card, cards)}, final ${card.last4}`}
              aria-current={i === selectedIndex ? 'true' : undefined}
              onClick={() => (i === selectedIndex ? undefined : scrollToIndex(i))}
            >
              <CardFace
                card={card}
                numberLabel={cardNumberLabel(card, cards)}
                invoice={inv ? { status: inv.status, dueDate: inv.period.dueDate, totalCents: inv.totalCents } : null}
              />
            </button>
          );
        })}
      </div>

      {cards.length > 1 && (
        <div class="pager">
          <button
            type="button"
            class="icon-btn"
            aria-label="Cartão anterior"
            disabled={selectedIndex === 0}
            onClick={() => scrollToIndex(selectedIndex - 1)}
          >
            <Icon name="chevronLeft" size={20} />
          </button>
          <div class="dots" aria-hidden="true">
            {cards.map((c, i) => (
              <span key={c.id} class={i === selectedIndex ? 'dot active' : 'dot'} />
            ))}
          </div>
          <button
            type="button"
            class="icon-btn"
            aria-label="Próximo cartão"
            disabled={selectedIndex === cards.length - 1}
            onClick={() => scrollToIndex(selectedIndex + 1)}
          >
            <Icon name="chevronRight" size={20} />
          </button>
        </div>
      )}

      {invoice && month && openMonth ? (
        <section class="panel invoice-panel" aria-label="Fatura selecionada" style={{ marginTop: '12px' }}>
          <div class="invoice-nav">
            <button type="button" class="icon-btn" aria-label="Fatura anterior" onClick={() => selectInvoice(addMonths(month, -1))}>
              <Icon name="chevronLeft" />
            </button>
            <div class="center">
              <div class="eyebrow">Fatura com vencimento em</div>
              <div class="invoice-month">{capitalize(formatMonthYear(month))}</div>
            </div>
            <button type="button" class="icon-btn" aria-label="Próxima fatura" onClick={() => selectInvoice(addMonths(month, 1))}>
              <Icon name="chevronRight" />
            </button>
          </div>

          <div class="invoice-total num" aria-label={`Total da fatura: ${formatBRL(invoice.totalCents)}`}>
            {formatBRL(invoice.totalCents)}
          </div>
          <div class="invoice-status">
            <StatusPill status={invoice.status} />
            <span>
              Vence em <strong>{formatDateBR(invoice.period.dueDate)}</strong>
            </span>
          </div>

          <dl class="facts">
            <div>
              <dt>Fechamento</dt>
              <dd>{formatDateBR(invoice.period.closingDate)}</dd>
            </div>
            <div>
              <dt>Compras de</dt>
              <dd>
                {formatDayMonth(invoice.period.startDate)} a {formatDayMonth(invoice.period.closingDate)}
              </dd>
            </div>
          </dl>

          <button
            type="button"
            class="row-link"
            onClick={() => ui.open({ type: 'history', filter: { month: ymKey(month), method: selected.id } })}
          >
            <Icon name="history" />
            <span class="grow">
              {invoice.entries.length === 0
                ? 'Nenhum lançamento nesta fatura'
                : `${invoice.entries.length} ${invoice.entries.length === 1 ? 'lançamento' : 'lançamentos'} nesta fatura`}
            </span>
            <Icon name="chevronRight" size={20} />
          </button>

          {!sameYm(month, openMonth) && (
            <button type="button" class="link-btn small" onClick={() => selectInvoice(openMonth)}>
              Voltar para a fatura aberta
            </button>
          )}
        </section>
      ) : (
        <section class="panel" style={{ marginTop: '12px' }}>
          <p>
            <strong>Defina o dia de fechamento</strong> dos cartões para o app calcular as faturas.
          </p>
          {pendingCount > 0 && (
            <p class="muted" style={{ marginTop: '6px' }}>
              {pendingCount} {pendingCount === 1 ? 'lançamento aguarda' : 'lançamentos aguardam'} essa informação.
            </p>
          )}
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

      {closedToPay && closedToPay.status === 'fechada' && closedToPay.totalCents > 0 && (
        <button type="button" class="hint-row" onClick={() => selectInvoice(closedToPay.period.dueMonth)}>
          <Icon name="calendar" size={20} />
          <span class="grow">
            Fatura fechada de <strong class="num">{formatBRL(closedToPay.totalCents)}</strong> vence em{' '}
            {formatDayMonthShort(closedToPay.period.dueDate)}
          </span>
          <Icon name="chevronRight" size={18} />
        </button>
      )}

      <div class="actions main-actions">
        <button
          type="button"
          class="btn btn-primary"
          style={{ background: accent }}
          aria-label={`Lançar despesa no cartão final ${selected.last4}`}
          onClick={() => ui.open({ type: 'expense', cardId: selected.id })}
        >
          <Icon name="plus" />
          Despesa
        </button>
        <button
          type="button"
          class="btn btn-primary btn-income"
          aria-label="Lançar renda da conta"
          onClick={() => ui.open({ type: 'income' })}
        >
          <Icon name="plus" />
          Renda
        </button>
      </div>
      <p class="actions-hint">
        A despesa vai para o cartão selecionado. A renda vale para a conta, os dois cartões juntos.
      </p>
    </div>
  );
}
