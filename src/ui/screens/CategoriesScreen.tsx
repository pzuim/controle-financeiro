import { ymKey } from '../../domain/dates';
import { formatBRL, formatMonthYear } from '../../domain/format';
import { categoryBreakdown, PIX_KEY, PIX_LABEL } from '../../domain/ledger';
import type { CategoryTotal } from '../../domain/ledger';
import { ColorDot, MonthSelector } from '../components';
import { useUI } from '../context';
import { Icon } from '../icons';
import { cardNumberLabel, sortedCards } from '../labels';

const compact = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

/** Rótulo curto do eixo: "R$ 0", "R$ 500", "R$ 1,5 mil". */
function axisLabel(cents: number): string {
  const reais = cents / 100;
  return reais >= 1000 ? `R$ ${compact.format(reais / 1000)} mil` : `R$ ${compact.format(reais)}`;
}

/** Escala com 3 ou 4 marcas "redondas" (1, 2, 2,5 ou 5 × potência de 10). */
function niceTicks(maxCents: number): number[] {
  const rough = maxCents / 100 / 3;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = ([1, 2, 2.5, 5, 10].map((m) => m * pow).find((c) => c >= rough) ?? 10 * pow) * 100;
  const top = Math.ceil(maxCents / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => Math.round(i * step));
}

function percent(part: number, total: number): string {
  if (total === 0) return '0%';
  const p = (part / total) * 100;
  return p > 0 && p < 1 ? '<1%' : `${Math.round(p)}%`;
}

export function CategoriesScreen() {
  const ui = useUI();
  const cards = sortedCards(ui.data.cards);
  const rows = categoryBreakdown(ui.month, ui.ledger, ui.data.categories);
  const total = rows.reduce((s, r) => s + r.totalCents, 0);
  const max = Math.max(0, ...rows.map((r) => r.totalCents));
  const ticks = max > 0 ? niceTicks(max) : [];
  const scaleMax = ticks[ticks.length - 1] ?? 1;
  const withSpending = rows.filter((r) => r.totalCents > 0);
  const withoutSpending = rows.filter((r) => r.totalCents === 0);

  const scrollToDetail = (row: CategoryTotal) =>
    document.getElementById(`cat-${row.category.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div class="screen">
      <header class="screen-header">
        <h1>Categorias</h1>
      </header>

      <MonthSelector month={ui.month} today={ui.today} onChange={ui.setMonth} />

      <section class="panel" style={{ marginTop: '12px' }} aria-label={`Gastos por categoria em ${formatMonthYear(ui.month)}`}>
        <div class="chart-total">
          <span class="muted">Total gasto no mês</span>
          <strong class="num">{formatBRL(total)}</strong>
        </div>

        {max === 0 ? (
          <div class="empty">
            <Icon name="bars" size={32} />
            Nenhum gasto em {formatMonthYear(ui.month)}.
          </div>
        ) : (
          <div class="bar-chart">
            {rows.map((row) => (
              <button
                type="button"
                class={row.totalCents === 0 ? 'bar-row zero' : 'bar-row'}
                disabled={row.totalCents === 0}
                aria-label={`${row.category.name}: ${formatBRL(row.totalCents)}, ${percent(row.totalCents, total)} do mês`}
                onClick={() => scrollToDetail(row)}
              >
                <span class="bar-head">
                  <span class="bar-label">{row.category.name}</span>
                  <span class="bar-value">{formatBRL(row.totalCents)}</span>
                </span>
                <span class="bar-track">
                  {row.totalCents > 0 && (
                    <span class="bar" style={{ width: `${Math.max(1, (row.totalCents / scaleMax) * 100)}%` }} />
                  )}
                </span>
              </button>
            ))}
            <div class="bar-axis" aria-hidden="true">
              {ticks.map((t) => (
                <span style={{ left: `${(t / scaleMax) * 100}%` }}>{axisLabel(t)}</span>
              ))}
            </div>
          </div>
        )}
      </section>

      {withSpending.length > 0 && <h2 class="section-title">Detalhamento por cartão</h2>}

      {withSpending.map((row) => (
        <section class="panel cat-detail" id={`cat-${row.category.id}`} key={row.category.id}>
          <button
            type="button"
            class="row-link"
            style={{ padding: 0, minHeight: '44px' }}
            onClick={() =>
              ui.open({ type: 'history', filter: { month: ymKey(ui.month), categoryId: row.category.id } })
            }
          >
            <span class="cat-icon">
              <Icon name={row.category.icon} size={20} />
            </span>
            <span class="grow">
              <span class="cat-detail-name" style={{ display: 'block' }}>
                {row.category.name}
              </span>
              <span class="method-sub">{percent(row.totalCents, total)} do mês</span>
            </span>
            <span class="cat-detail-total num">{formatBRL(row.totalCents)}</span>
            <Icon name="chevronRight" size={18} />
          </button>
          <ul class="split">
            {cards.map((card) => (
              <li key={card.id}>
                <ColorDot color={card.color} color2={card.color2} />
                <span class="grow">
                  {cardNumberLabel(card, cards)} · final {card.last4}
                </span>
                <span class="num">{formatBRL(row.byMethod[card.id] ?? 0)}</span>
              </li>
            ))}
            {(row.byMethod[PIX_KEY] ?? 0) > 0 && (
              <li>
                <span class="pix-dot">
                  <Icon name="wallet" size={11} />
                </span>
                <span class="grow">{PIX_LABEL}</span>
                <span class="num">{formatBRL(row.byMethod[PIX_KEY] ?? 0)}</span>
              </li>
            )}
          </ul>
          {row.subcategories.length > 0 && (
            <ul class="split subsplit">
              {row.subcategories.map((sub) => (
                <li key={sub.category?.id ?? 'none'}>
                  <span class="grow">{sub.category?.name ?? 'Sem subcategoria'}</span>
                  <span class="num">{formatBRL(sub.totalCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {withSpending.length > 0 && withoutSpending.length > 0 && (
        <p class="empty-note" style={{ marginTop: '12px' }}>
          Sem gastos no mês: {withoutSpending.map((r) => r.category.name).join(', ')}.
        </p>
      )}
    </div>
  );
}
