import type { ComponentChildren } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { invoiceMonthFor, invoicePeriod, ruleOf } from '../../domain/billing';
import { addDays, addMonths, isValidISODate, ymOf } from '../../domain/dates';
import { formatBRL, formatDateBR, formatDayMonthShort, formatMonthYear } from '../../domain/format';
import { MAX_INSTALLMENTS, splitInstallments } from '../../domain/installments';
import { PIX_LABEL } from '../../domain/ledger';
import type { Expense } from '../../domain/types';
import { newId, removeExpense, saveExpense } from '../../data/store';
import { ColorDot, Field, MoneyInput, Notice, Segmented, Sheet } from '../components';
import { useUI } from '../context';
import { Icon } from '../icons';
import { sortedCards } from '../labels';
import { normalize, recentDistinct } from '../text';

interface Props {
  expenseId?: string | undefined;
  cardId?: string | null | undefined;
}

const PIX = '__pix__';

export function ExpenseSheet({ expenseId, cardId: initialCardId }: Props) {
  const ui = useUI();
  const cards = sortedCards(ui.data.cards);
  const existing = expenseId ? ui.data.expenses.find((e) => e.id === expenseId) : undefined;

  const [amount, setAmount] = useState<number | null>(existing?.amountCents ?? null);
  const [description, setDescription] = useState(existing?.description ?? '');
  const [date, setDate] = useState(existing?.date ?? ui.today);
  const [method, setMethod] = useState<string>(
    existing ? (existing.cardId ?? PIX) : initialCardId === null ? PIX : (initialCardId ?? cards[0]?.id ?? PIX),
  );
  const [categoryId, setCategoryId] = useState<string | null>(existing?.categoryId ?? null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(existing?.subcategoryId ?? null);
  const [parcelado, setParcelado] = useState((existing?.installments ?? 1) > 1);
  const [count, setCount] = useState(Math.max(2, existing?.installments ?? 2));
  const [categoryTouched, setCategoryTouched] = useState(Boolean(existing));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const cardId = method === PIX ? null : method;
  const card = cards.find((c) => c.id === cardId);
  const rule = card ? ruleOf(card) : null;
  const installments = cardId !== null && parcelado ? count : 1;

  const categories = ui.data.categories;
  const mainCategories = categories
    .filter((c) => c.parentId === null && (!c.hidden || c.id === categoryId))
    .sort((a, b) => a.order - b.order);
  const subcategories = categories
    .filter((c) => c.parentId === categoryId && categoryId !== null && (!c.hidden || c.id === subcategoryId))
    .sort((a, b) => a.order - b.order);

  const recent = useMemo(() => recentDistinct(ui.data.expenses, 12), [ui.data.expenses]);
  const query = normalize(description);
  const suggestions = recent
    .filter((e) => normalize(e.description) !== query && (query === '' || normalize(e.description).includes(query)))
    .slice(0, 6);

  const applyCategoryFrom = (text: string) => {
    if (categoryTouched) return;
    const match = recent.find((e) => normalize(e.description) === normalize(text));
    if (match && categories.some((c) => c.id === match.categoryId)) {
      setCategoryId(match.categoryId);
      setSubcategoryId(match.subcategoryId);
    }
  };

  const split = amount && amount >= installments ? splitInstallments(amount, installments) : null;

  // Prévia de onde a compra vai entrar.
  let preview: ComponentChildren = null;
  let firstDue: string | null = null;
  if (isValidISODate(date)) {
    if (cardId === null) {
      preview = (
        <>
          Conta no resumo de <strong>{formatMonthYear(ymOf(date))}</strong>
        </>
      );
    } else if (rule) {
      const first = invoiceMonthFor(date, rule);
      firstDue = invoicePeriod(first, rule).dueDate;
      preview =
        installments === 1 ? (
          <>
            Entra na fatura com vencimento em <strong>{formatDateBR(firstDue)}</strong>
          </>
        ) : (
          <>
            1ª parcela na fatura de <strong>{formatDateBR(firstDue)}</strong> · última em{' '}
            <strong>{formatDateBR(invoicePeriod(addMonths(first, installments - 1), rule).dueDate)}</strong>
          </>
        );
    } else {
      preview = 'A fatura será definida quando o fechamento do cartão for informado';
    }
  }

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!amount) e['amount'] = 'Informe o valor da compra.';
    else if (amount < installments) e['amount'] = 'Valor pequeno demais para esse número de parcelas.';
    if (!description.trim()) e['description'] = 'Informe uma descrição curta.';
    if (!isValidISODate(date)) e['date'] = 'Informe uma data válida.';
    if (!categoryId) e['category'] = 'Escolha uma categoria.';
    return e;
  };

  const onSave = async () => {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0 || !amount || !categoryId) return;

    if (existing && (existing.installments > 1 || installments > 1)) {
      const n = Math.max(existing.installments, installments);
      const ok = await ui.confirm({
        title: 'Alterar compra parcelada?',
        message: (
          <>
            <p>
              “{existing.description}” {existing.installments > 1 ? `está parcelada em ${existing.installments}x` : 'será parcelada'}.
              A alteração vale para a compra original e para <strong>todas as parcelas vinculadas</strong>, inclusive
              as que estão em faturas futuras.
            </p>
            {existing.installments !== installments && (
              <p>
                Parcelamento: {existing.installments}x → {installments}x.
              </p>
            )}
            <p>As {n > 1 ? 'parcelas' : 'faturas'} serão recalculadas a partir da data da compra.</p>
          </>
        ),
        confirmLabel: 'Salvar alterações',
      });
      if (!ok) return;
    }

    const now = new Date().toISOString();
    const expense: Expense = {
      id: existing?.id ?? newId(),
      description: description.trim(),
      amountCents: amount,
      date,
      cardId,
      categoryId,
      subcategoryId: subcategoryId && categories.some((c) => c.id === subcategoryId && c.parentId === categoryId) ? subcategoryId : null,
      installments,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    setSaving(true);
    try {
      await saveExpense(expense);
      ui.close();
      if (existing) ui.toast('Alterações salvas.');
      else if (cardId === null) ui.toast(`${PIX_LABEL} registrado em ${formatMonthYear(ymOf(date))}.`);
      else if (!firstDue) ui.toast('Compra salva. A fatura será definida quando você informar o fechamento do cartão.');
      else if (installments === 1) ui.toast(`Compra adicionada à fatura com vencimento em ${formatDayMonthShort(firstDue)}.`);
      else ui.toast(`Compra em ${installments}x adicionada. 1ª parcela na fatura com vencimento em ${formatDayMonthShort(firstDue)}.`);
    } catch (err) {
      console.error(err);
      ui.toast('Não foi possível salvar. Tente de novo.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!existing) return;
    const n = existing.installments;
    const ok = await ui.confirm({
      title: n > 1 ? 'Excluir compra parcelada?' : 'Excluir lançamento?',
      message:
        n > 1 ? (
          <p>
            “{existing.description}” foi parcelada em {n}x. <strong>Todas as {n} parcelas vinculadas</strong> (1/{n} a{' '}
            {n}/{n}) serão removidas das faturas, inclusive as futuras. Esta ação não pode ser desfeita.
          </p>
        ) : (
          <p>
            “{existing.description}” ({formatBRL(existing.amountCents)}) será excluído. Esta ação não pode ser desfeita.
          </p>
        ),
      confirmLabel: 'Excluir',
      danger: true,
    });
    if (!ok) return;
    try {
      await removeExpense(existing.id);
      ui.close();
      ui.toast('Lançamento excluído.');
    } catch (err) {
      console.error(err);
      ui.toast('Não foi possível excluir. Tente de novo.');
    }
  };

  if (expenseId && !existing) {
    return (
      <Sheet title="Lançamento" onClose={ui.close}>
        <div class="empty">Este lançamento não existe mais.</div>
      </Sheet>
    );
  }

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <Sheet
      title={cardId === null ? (existing ? `Editar ${PIX_LABEL}` : PIX_LABEL) : existing ? 'Editar despesa' : 'Lançar despesa'}
      onClose={ui.close}
      footer={
        <>
          {preview && <div class="preview">{preview}</div>}
          {hasErrors && (
            <div class="field-error" style={{ textAlign: 'center', marginBottom: '8px' }} role="alert">
              Confira os campos destacados.
            </div>
          )}
          <button type="button" class="btn btn-dark btn-block" disabled={saving} onClick={onSave}>
            <Icon name="check" />
            {existing ? 'Salvar alterações' : 'Salvar despesa'}
          </button>
        </>
      }
    >
      <div class="form-card">
        <Field label={cardId === null ? 'Valor que sai da conta' : 'Valor total da compra'} htmlFor="exp-amount">
          <MoneyInput id="exp-amount" cents={amount} onChange={setAmount} autoFocus={!existing} large />
          {errors['amount'] && <div class="field-error">{errors['amount']}</div>}
        </Field>

        <Field label="Descrição" htmlFor="exp-desc">
          <input
            id="exp-desc"
            class="input"
            type="text"
            maxLength={60}
            autoComplete="off"
            enterKeyHint="done"
            placeholder="Ex.: Mercado, Uber, Aula de tênis"
            value={description}
            onInput={(e) => setDescription(e.currentTarget.value)}
            onBlur={(e) => applyCategoryFrom(e.currentTarget.value)}
          />
          {errors['description'] && <div class="field-error">{errors['description']}</div>}
          {suggestions.length > 0 && (
            <div class="chips scroll" style={{ marginTop: '10px' }} aria-label="Descrições recentes">
              {suggestions.map((s) => (
                <button
                  type="button"
                  class="chip small"
                  onClick={() => {
                    setDescription(s.description);
                    applyCategoryFrom(s.description);
                  }}
                >
                  {s.description}
                </button>
              ))}
            </div>
          )}
        </Field>
      </div>

      <div class="form-card">
        <Field label="Categoria">
          <div class="chips" role="group" aria-label="Categoria">
            {mainCategories.map((c) => (
              <button
                type="button"
                class="chip"
                aria-pressed={c.id === categoryId}
                onClick={() => {
                  setCategoryTouched(true);
                  if (c.id !== categoryId) setSubcategoryId(null);
                  setCategoryId(c.id);
                }}
              >
                <Icon name={c.icon} size={18} />
                {c.name}
              </button>
            ))}
          </div>
          {errors['category'] && <div class="field-error">{errors['category']}</div>}
        </Field>
        {subcategories.length > 0 && (
          <Field label="Subcategoria (opcional)">
            <div class="chips" role="group" aria-label="Subcategoria">
              {subcategories.map((c) => (
                <button
                  type="button"
                  class="chip small"
                  aria-pressed={c.id === subcategoryId}
                  onClick={() => setSubcategoryId(c.id === subcategoryId ? null : c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </Field>
        )}
      </div>

      <div class="form-card">
        <Field label="Pagamento">
          <Segmented
            label="Cartão ou Pix / débito"
            value={method}
            onChange={setMethod}
            options={[
              ...cards.map((c) => ({
                value: c.id,
                label: (
                  <>
                    <ColorDot color={c.color} color2={c.color2} />
                    {c.last4}
                  </>
                ),
              })),
              { value: PIX, label: PIX_LABEL },
            ]}
          />
        </Field>

        {card && !rule && (
          <div style={{ marginTop: '14px' }}>
            <Notice tone="warning">
              Os cartões ainda não têm dia de fechamento. Você pode salvar a compra e definir o dia depois em
              Configurações → Fatura.
            </Notice>
          </div>
        )}

        {cardId !== null && (
          <Field label="Forma de pagamento no cartão">
            <Segmented
              label="À vista ou parcelado"
              value={parcelado ? 'parcelado' : 'avista'}
              onChange={(v) => setParcelado(v === 'parcelado')}
              options={[
                { value: 'avista', label: 'À vista' },
                { value: 'parcelado', label: 'Parcelado' },
              ]}
            />
          </Field>
        )}

        {cardId !== null && parcelado && (
          <Field label="Número de parcelas">
            <div class="stepper">
              <button
                type="button"
                class="icon-btn"
                aria-label="Menos parcelas"
                disabled={count <= 2}
                onClick={() => setCount(Math.max(2, count - 1))}
              >
                <Icon name="minus" />
              </button>
              <span class="stepper-value" aria-live="polite">
                {count}x
              </span>
              <button
                type="button"
                class="icon-btn"
                aria-label="Mais parcelas"
                disabled={count >= MAX_INSTALLMENTS}
                onClick={() => setCount(Math.min(MAX_INSTALLMENTS, count + 1))}
              >
                <Icon name="plus" />
              </button>
            </div>
            <div class="chips" style={{ marginTop: '10px' }}>
              {[2, 3, 4, 5, 6, 10, 12].map((n) => (
                <button type="button" class="chip small" aria-pressed={n === count} onClick={() => setCount(n)}>
                  {n}x
                </button>
              ))}
            </div>
            {split && (
              <div class="installment-info">
                <strong class="num">
                  {count}x de {formatBRL(split[0]!)}
                </strong>
                {split[split.length - 1] !== split[0] && (
                  <span class="muted"> (última de {formatBRL(split[split.length - 1]!)})</span>
                )}
              </div>
            )}
          </Field>
        )}
      </div>

      <div class="form-card">
        <Field label={cardId === null ? 'Data' : 'Data da compra'} htmlFor="exp-date">
          <div class="chips" style={{ marginBottom: '10px' }}>
            <button type="button" class="chip small" aria-pressed={date === ui.today} onClick={() => setDate(ui.today)}>
              Hoje
            </button>
            <button
              type="button"
              class="chip small"
              aria-pressed={date === addDays(ui.today, -1)}
              onClick={() => setDate(addDays(ui.today, -1))}
            >
              Ontem
            </button>
          </div>
          <input
            id="exp-date"
            class="input"
            type="date"
            value={date}
            onInput={(e) => setDate(e.currentTarget.value)}
            onChange={(e) => setDate(e.currentTarget.value)}
          />
          {errors['date'] && <div class="field-error">{errors['date']}</div>}
        </Field>
      </div>

      {existing && (
        <button type="button" class="btn btn-ghost-danger btn-block" style={{ marginTop: '12px' }} onClick={onDelete}>
          <Icon name="trash" size={20} />
          Excluir lançamento
        </button>
      )}
    </Sheet>
  );
}
