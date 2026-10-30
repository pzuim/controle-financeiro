import { useMemo, useState } from 'preact/hooks';
import { addDays, isValidISODate, ymOf } from '../../domain/dates';
import { formatBRL, formatMonthYear } from '../../domain/format';
import type { Income, IncomeType } from '../../domain/types';
import { newId, removeIncome, saveIncome } from '../../data/store';
import { Field, MoneyInput, Sheet } from '../components';
import { useUI } from '../context';
import { Icon } from '../icons';
import { INCOME_TYPE_LABEL } from '../labels';
import { normalize, recentDistinct } from '../text';

const TYPES: IncomeType[] = ['salario', 'extra', 'outro'];

export function IncomeSheet({ incomeId }: { incomeId?: string | undefined }) {
  const ui = useUI();
  const existing = incomeId ? ui.data.incomes.find((i) => i.id === incomeId) : undefined;

  const [amount, setAmount] = useState<number | null>(existing?.amountCents ?? null);
  const [description, setDescription] = useState(existing?.description ?? '');
  const [date, setDate] = useState(existing?.date ?? ui.today);
  const [type, setType] = useState<IncomeType | null>(existing?.type ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const recent = useMemo(() => recentDistinct(ui.data.incomes, 8), [ui.data.incomes]);
  const suggestions = [
    ...recent.map((i) => ({ description: i.description, type: i.type })),
    { description: 'Salário', type: 'salario' as const },
    { description: 'Extra', type: 'extra' as const },
  ]
    .filter((s, i, all) => all.findIndex((o) => normalize(o.description) === normalize(s.description)) === i)
    .filter((s) => normalize(s.description) !== normalize(description))
    .slice(0, 6);

  const onSave = async () => {
    const e: Record<string, string> = {};
    if (!amount) e['amount'] = 'Informe o valor recebido.';
    if (!description.trim()) e['description'] = 'Informe uma descrição.';
    if (!isValidISODate(date)) e['date'] = 'Informe uma data válida.';
    setErrors(e);
    if (Object.keys(e).length > 0 || !amount) return;

    const now = new Date().toISOString();
    const income: Income = {
      id: existing?.id ?? newId(),
      description: description.trim(),
      amountCents: amount,
      date,
      type,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    setSaving(true);
    try {
      await saveIncome(income);
      ui.close();
      ui.toast(existing ? 'Alterações salvas.' : `Renda registrada em ${formatMonthYear(ymOf(date))}.`);
    } catch (err) {
      console.error(err);
      ui.toast('Não foi possível salvar. Tente de novo.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!existing) return;
    const ok = await ui.confirm({
      title: 'Excluir renda?',
      message: (
        <p>
          “{existing.description}” ({formatBRL(existing.amountCents)}) será excluída. Esta ação não pode ser desfeita.
        </p>
      ),
      confirmLabel: 'Excluir',
      danger: true,
    });
    if (!ok) return;
    try {
      await removeIncome(existing.id);
      ui.close();
      ui.toast('Renda excluída.');
    } catch (err) {
      console.error(err);
      ui.toast('Não foi possível excluir. Tente de novo.');
    }
  };

  if (incomeId && !existing) {
    return (
      <Sheet title="Renda" onClose={ui.close}>
        <div class="empty">Este lançamento não existe mais.</div>
      </Sheet>
    );
  }

  return (
    <Sheet
      title={existing ? 'Editar renda' : 'Lançar renda'}
      onClose={ui.close}
      footer={
        <>
          {isValidISODate(date) && (
            <div class="preview">
              Vale para a conta (os dois cartões) e entra no resumo de{' '}
              <strong>{formatMonthYear(ymOf(date))}</strong>
            </div>
          )}
          <button type="button" class="btn btn-dark btn-block" disabled={saving} onClick={onSave}>
            <Icon name="check" />
            {existing ? 'Salvar alterações' : 'Salvar renda'}
          </button>
        </>
      }
    >
      <div class="form-card">
        <Field label="Valor recebido" htmlFor="inc-amount">
          <MoneyInput id="inc-amount" cents={amount} onChange={setAmount} autoFocus={!existing} large />
          {errors['amount'] && <div class="field-error">{errors['amount']}</div>}
        </Field>
        <Field label="Descrição" htmlFor="inc-desc">
          <input
            id="inc-desc"
            class="input"
            type="text"
            maxLength={60}
            autoComplete="off"
            enterKeyHint="done"
            placeholder="Ex.: Salário"
            value={description}
            onInput={(e) => setDescription(e.currentTarget.value)}
          />
          {errors['description'] && <div class="field-error">{errors['description']}</div>}
          {suggestions.length > 0 && (
            <div class="chips scroll" style={{ marginTop: '10px' }} aria-label="Sugestões">
              {suggestions.map((s) => (
                <button
                  type="button"
                  class="chip small"
                  onClick={() => {
                    setDescription(s.description);
                    if (s.type && type === null) setType(s.type);
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
        <Field label="Tipo (opcional)">
          <div class="chips" role="group" aria-label="Tipo de renda">
            {TYPES.map((t) => (
              <button type="button" class="chip" aria-pressed={type === t} onClick={() => setType(type === t ? null : t)}>
                {INCOME_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Data de recebimento" htmlFor="inc-date">
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
          <input id="inc-date" class="input" type="date" value={date}
            onInput={(e) => setDate(e.currentTarget.value)}
            onChange={(e) => setDate(e.currentTarget.value)}
          />
          {errors['date'] && <div class="field-error">{errors['date']}</div>}
        </Field>
      </div>

      {existing && (
        <button type="button" class="btn btn-ghost-danger btn-block" style={{ marginTop: '12px' }} onClick={onDelete}>
          <Icon name="trash" size={20} />
          Excluir renda
        </button>
      )}
    </Sheet>
  );
}
