import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useId, useRef, useState } from 'preact/hooks';
import type { InvoiceStatus } from '../domain/billing';
import { addMonths, sameYm, ymOf } from '../domain/dates';
import { capitalize, formatBRL, formatDayMonthShort, formatSignedBRL, monthName } from '../domain/format';
import type { Card, ISODate, YearMonth } from '../domain/types';
import { cardGradient, cardTextColor } from './colors';
import type { DialogSpec, SummaryScope } from './context';
import { Icon } from './icons';
import type { IconName } from './icons';
import { STATUS_LABEL } from './labels';

/* ---------- Painel secundário (abre de baixo para cima) ---------- */

interface SheetProps {
  title: string;
  onClose(): void;
  children: ComponentChildren;
  footer?: ComponentChildren;
  /** "page": tela cheia com seta de voltar (cartão aberto); padrão: painel que sobe. */
  variant?: 'sheet' | 'page';
  /** Botão flutuante, posicionado sobre o conteúdo. */
  fab?: ComponentChildren;
}

export function Sheet({ title, onClose, children, footer, variant = 'sheet', fab }: SheetProps) {
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();
  useEffect(() => {
    // Leva o foco para o painel (leitores de tela), a menos que um campo já tenha recebido foco.
    if (ref.current && !ref.current.contains(document.activeElement)) ref.current.focus();
  }, []);
  const page = variant === 'page';
  return (
    <div class="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <section
        class={page ? 'sheet page' : 'sheet'}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={ref}
      >
        <header class="sheet-header">
          {page && (
            <button type="button" class="icon-btn" aria-label="Voltar" onClick={onClose}>
              <Icon name="chevronLeft" />
            </button>
          )}
          <h2 id={titleId}>{title}</h2>
          {!page && (
            <button type="button" class="icon-btn" aria-label="Fechar" onClick={onClose}>
              <Icon name="close" />
            </button>
          )}
        </header>
        <div class="sheet-body">{children}</div>
        {footer && <footer class="sheet-footer">{footer}</footer>}
        {fab}
      </section>
    </div>
  );
}

/* ---------- Botão + com menu de opções ---------- */

export interface FabAction {
  label: string;
  sub: string;
  icon: IconName;
  onSelect(): void;
}

export function FabMenu({ actions, color }: { actions: FabAction[]; color: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && <div class="fab-backdrop" onClick={() => setOpen(false)} />}
      <div class="fab-wrap">
        {open && (
          <div class="fab-actions" role="menu">
            {actions.map((a) => (
              <button
                type="button"
                role="menuitem"
                class="fab-action"
                onClick={() => {
                  setOpen(false);
                  a.onSelect();
                }}
              >
                <span class="fab-action-icon">
                  <Icon name={a.icon} size={20} />
                </span>
                <span>
                  <strong>{a.label}</strong>
                  <small>{a.sub}</small>
                </span>
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          class={open ? 'fab open' : 'fab'}
          style={{ background: color }}
          aria-label={open ? 'Fechar opções' : 'Adicionar lançamento'}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <Icon name="plus" size={28} strokeWidth={2.2} />
        </button>
      </div>
    </>
  );
}

/* ---------- Diálogo de confirmação ---------- */

interface DialogProps {
  spec: DialogSpec;
  onConfirm(): void;
  onCancel(): void;
}

export function Dialog({ spec, onConfirm, onCancel }: DialogProps) {
  const [checked, setChecked] = useState(false);
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // Em ações destrutivas o foco começa em "Cancelar".
    (spec.danger || spec.requireCheck ? cancelRef.current : confirmRef.current)?.focus();
  }, []);
  return (
    <div class="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId}>{spec.title}</h2>
        <div class="dialog-message">{spec.message}</div>
        {spec.requireCheck && (
          <label class="check-row">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.currentTarget.checked)} />
            <span>{spec.requireCheck}</span>
          </label>
        )}
        <div class="dialog-actions">
          {!spec.alert && (
            <button type="button" class="btn btn-secondary" ref={cancelRef} onClick={onCancel}>
              {spec.cancelLabel ?? 'Cancelar'}
            </button>
          )}
          <button
            type="button"
            ref={confirmRef}
            class={`btn ${spec.danger ? 'btn-danger' : 'btn-dark'}`}
            disabled={Boolean(spec.requireCheck) && !checked}
            onClick={onConfirm}
          >
            {spec.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Seletor de mês ---------- */

interface MonthSelectorProps {
  month: YearMonth;
  today: ISODate;
  onChange(month: YearMonth): void;
}

export function MonthSelector({ month, today, onChange }: MonthSelectorProps) {
  const current = ymOf(today);
  return (
    <div class="month-selector">
      <button type="button" class="icon-btn" aria-label="Mês anterior" onClick={() => onChange(addMonths(month, -1))}>
        <Icon name="chevronLeft" />
      </button>
      <div class="month-label" aria-live="polite">
        <span class="month-name">
          {capitalize(monthName(month.month))} <span class="muted">{month.year}</span>
        </span>
        {!sameYm(month, current) && (
          <button type="button" class="link-btn small" onClick={() => onChange(current)}>
            Ir para o mês atual
          </button>
        )}
      </div>
      <button type="button" class="icon-btn" aria-label="Próximo mês" onClick={() => onChange(addMonths(month, 1))}>
        <Icon name="chevronRight" />
      </button>
    </div>
  );
}

/* ---------- Seletor de ano ---------- */

interface YearSelectorProps {
  year: number;
  today: ISODate;
  onChange(year: number): void;
}

export function YearSelector({ year, today, onChange }: YearSelectorProps) {
  const current = ymOf(today).year;
  return (
    <div class="month-selector">
      <button type="button" class="icon-btn" aria-label="Ano anterior" onClick={() => onChange(year - 1)}>
        <Icon name="chevronLeft" />
      </button>
      <div class="month-label" aria-live="polite">
        <span class="month-name">{year}</span>
        {year !== current && (
          <button type="button" class="link-btn small" onClick={() => onChange(current)}>
            Ir para o ano atual
          </button>
        )}
      </div>
      <button type="button" class="icon-btn" aria-label="Próximo ano" onClick={() => onChange(year + 1)}>
        <Icon name="chevronRight" />
      </button>
    </div>
  );
}

/* ---------- Período do Resumo e das Categorias: ano ou mês ---------- */

interface PeriodControlsProps {
  scope: SummaryScope;
  /** Mês escolhido; no modo ano, vale só o `year`. */
  month: YearMonth;
  today: ISODate;
  onScope(scope: SummaryScope): void;
  onMonth(month: YearMonth): void;
}

export function PeriodControls({ scope, month, today, onScope, onMonth }: PeriodControlsProps) {
  return (
    <div class="period-controls">
      <Segmented
        label="Período"
        value={scope}
        options={[
          { value: 'year', label: 'Ano' },
          { value: 'month', label: 'Mês' },
        ]}
        onChange={onScope}
      />
      {scope === 'year' ? (
        <YearSelector year={month.year} today={today} onChange={(year) => onMonth({ year, month: month.month })} />
      ) : (
        <MonthSelector month={month} today={today} onChange={onMonth} />
      )}
    </div>
  );
}

/* ---------- Controle segmentado ---------- */

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: ComponentChildren }>;
  onChange(value: T): void;
}

export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div class="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          type="button"
          role="radio"
          aria-checked={o.value === value}
          class={o.value === value ? 'selected' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Campo de valor em reais (digitação estilo app de banco) ---------- */

interface MoneyInputProps {
  id: string;
  cents: number | null;
  onChange(cents: number | null): void;
  autoFocus?: boolean;
  large?: boolean;
}

const MAX_MONEY_DIGITS = 10; // até R$ 99.999.999,99

function moneyText(cents: number | null): string {
  return cents ? formatBRL(cents).replace(/^R\$\s*/, '') : '';
}

export function MoneyInput({ id, cents, onChange, autoFocus, large }: MoneyInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, []);
  const onInput = (e: JSX.TargetedEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const digits = input.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_MONEY_DIGITS);
    const value = digits ? Number(digits) : null;
    input.value = moneyText(value);
    input.setSelectionRange(input.value.length, input.value.length);
    onChange(value);
  };
  return (
    <div class={large ? 'money-input large' : 'money-input'}>
      <span class="money-prefix" aria-hidden="true">
        R$
      </span>
      <input
        id={id}
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="0,00"
        value={moneyText(cents)}
        onInput={onInput}
      />
    </div>
  );
}

/* ---------- Seletor de dia do mês ---------- */

interface DaySelectProps {
  id: string;
  value: number | null;
  onChange(day: number | null): void;
  allowEmpty?: string;
}

export function DaySelect({ id, value, onChange, allowEmpty }: DaySelectProps) {
  return (
    <select
      id={id}
      class="input"
      value={value === null ? '' : String(value)}
      onChange={(e) => onChange(e.currentTarget.value ? Number(e.currentTarget.value) : null)}
    >
      {(allowEmpty !== undefined || value === null) && <option value="">{allowEmpty ?? 'Selecione'}</option>}
      {Array.from({ length: 31 }, (_, i) => (
        <option value={String(i + 1)}>Dia {i + 1}</option>
      ))}
    </select>
  );
}

/* ---------- Situação da fatura ---------- */

export function StatusPill({ status, onCard }: { status: InvoiceStatus; onCard?: boolean }) {
  return (
    <span class={`status-pill status-${status}${onCard ? ' on-card' : ''}`}>
      <span class="status-dot" aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}

/* ---------- Cartão com aparência física ---------- */

interface CardFaceProps {
  card: Card;
  numberLabel: string;
  invoice: { status: InvoiceStatus; dueDate: ISODate; totalCents: number } | null;
}

export function CardFace({ card, numberLabel, invoice }: CardFaceProps) {
  const style = { background: cardGradient(card.color, card.color2), color: cardTextColor(card.color, card.color2) };
  return (
    <div class="card-face" style={style}>
      <div class="card-face-top">
        <span class="card-number">{numberLabel}</span>
        <span class="card-last4" aria-label={`final ${card.last4}`}>
          •••• {card.last4}
        </span>
      </div>
      <div class="card-face-bottom">
        {invoice ? (
          <>
            <div class="card-meta">
              <StatusPill status={invoice.status} onCard />
              <span>vence {formatDayMonthShort(invoice.dueDate)}</span>
            </div>
            <div class="card-total">{formatBRL(invoice.totalCents)}</div>
          </>
        ) : (
          <div class="card-meta">
            <span class="status-pill on-card">
              <Icon name="alert" size={14} /> Fechamento não definido
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Cartão da conta (renda e Pix / transferência) ---------- */

export const ACCOUNT_COLOR = '#3A3D42';
export const ACCOUNT_COLOR2 = '#16171A';

export function AccountFace({ month, balanceCents }: { month: YearMonth; balanceCents: number }) {
  return (
    <div class="card-face" style={{ background: cardGradient(ACCOUNT_COLOR, ACCOUNT_COLOR2), color: '#fff' }}>
      <div class="card-face-top">
        <span class="card-number">Conta</span>
        <Icon name="wallet" size={22} />
      </div>
      <div class="card-face-bottom">
        <div class="card-meta">
          <span>Saldo de {monthName(month.month)}</span>
          {balanceCents !== 0 && (
            <span class="status-pill on-card">
              <Icon name={balanceCents > 0 ? 'check' : 'alert'} size={13} strokeWidth={2.4} />
              {balanceCents > 0 ? 'Positivo' : 'Déficit'}
            </span>
          )}
        </div>
        <div class="card-total">{formatSignedBRL(balanceCents)}</div>
      </div>
    </div>
  );
}

/* ---------- Diversos ---------- */

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: ComponentChildren; children: ComponentChildren }) {
  return (
    <div class="field">
      <label class="field-label" for={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <div class="field-hint">{hint}</div>}
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warning'; children: ComponentChildren }) {
  return (
    <div class={`notice notice-${tone}`} role={tone === 'warning' ? 'status' : undefined}>
      <Icon name={tone === 'warning' ? 'alert' : 'info'} size={20} />
      <div>{children}</div>
    </div>
  );
}

export function ColorDot({ color, color2 }: { color: string; color2?: string }) {
  return <span class="color-dot" style={{ background: cardGradient(color, color2 ?? color) }} aria-hidden="true" />;
}
