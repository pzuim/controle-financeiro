import { useState } from 'preact/hooks';
import { dueOffset, invoiceMonthFor, invoicePeriod } from '../../domain/billing';
import type { BillingRule } from '../../domain/billing';
import { formatDateBR, formatDayMonth } from '../../domain/format';
import { saveAccountRule } from '../../data/store';
import { DaySelect, Field, Notice, Sheet } from '../components';
import { useUI } from '../context';
import { Icon } from '../icons';
import { accountRule } from '../labels';
import { plural } from '../text';

/** Explica a regra em português, no formato da especificação. */
function ruleText(rule: BillingRule): string {
  const sameMonth = dueOffset(rule) === 0;
  const after = rule.closingDay >= 31 ? 'Depois disso' : `A partir do dia ${rule.closingDay + 1}`;
  return (
    `Compras feitas até o dia ${rule.closingDay} entram na fatura que vence no dia ${rule.dueDay} ` +
    `${sameMonth ? 'do mesmo mês' : 'do mês seguinte'}. ${after}, vão para a fatura ` +
    `${sameMonth ? 'do mês seguinte' : 'do mês posterior'}.`
  );
}

/** Fechamento e vencimento da conta: a mesma regra vale para todos os cartões. */
export function RuleSheet() {
  const ui = useUI();
  const current = accountRule(ui.data.cards);
  const [closingDay, setClosingDay] = useState<number | null>(current.closingDay);
  const [dueDay, setDueDay] = useState<number | null>(current.dueDay);
  const [saving, setSaving] = useState(false);

  const rule: BillingRule | null = closingDay !== null && dueDay !== null ? { closingDay, dueDay } : null;
  const changed = closingDay !== current.closingDay || dueDay !== current.dueDay;
  const affected = ui.data.expenses.filter((e) => e.cardId !== null).length;
  const example = rule ? invoicePeriod(invoiceMonthFor(ui.today, rule), rule).dueDate : null;

  const onSave = async () => {
    if (!rule) return;
    setSaving(true);
    try {
      await saveAccountRule(rule.closingDay, rule.dueDay);
      ui.close();
      ui.toast(
        changed && affected > 0
          ? `Regra salva. ${plural(affected, 'lançamento foi reatribuído', 'lançamentos foram reatribuídos')} às faturas.`
          : 'Regra salva.',
      );
    } catch (err) {
      console.error(err);
      ui.toast('Não foi possível salvar. Tente de novo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      title="Fechamento e vencimento"
      onClose={ui.close}
      footer={
        <button type="button" class="btn btn-dark btn-block" disabled={saving || !rule} onClick={onSave}>
          <Icon name="check" />
          Salvar
        </button>
      }
    >
      <Notice>Os dois cartões são da mesma conta: esta regra vale para todos eles.</Notice>

      <div class="form-card" style={{ marginTop: '12px' }}>
        <div class="two-cols">
          <Field label="Fechamento" htmlFor="rule-closing">
            <DaySelect id="rule-closing" value={closingDay} onChange={setClosingDay} />
          </Field>
          <Field label="Vencimento" htmlFor="rule-due">
            <DaySelect id="rule-due" value={dueDay} onChange={setDueDay} />
          </Field>
        </div>
        {rule && (
          <div style={{ marginTop: '14px' }}>
            <Notice>
              {ruleText(rule)}
              {example && (
                <div style={{ marginTop: '6px' }}>
                  Uma compra feita hoje ({formatDayMonth(ui.today)}) entra na fatura com vencimento em{' '}
                  <strong>{formatDateBR(example)}</strong>.
                </div>
              )}
              {(rule.closingDay > 28 || rule.dueDay > 28) && (
                <div style={{ marginTop: '6px' }}>Em meses mais curtos, vale o último dia do mês.</div>
              )}
            </Notice>
          </div>
        )}
        {changed && affected > 0 && (
          <div style={{ marginTop: '14px' }}>
            <Notice tone="warning">
              Ao salvar, {plural(affected, 'lançamento de cartão será reatribuído', 'lançamentos de cartão serão reatribuídos')}{' '}
              às faturas pela nova regra, inclusive os antigos.
            </Notice>
          </div>
        )}
      </div>
    </Sheet>
  );
}
