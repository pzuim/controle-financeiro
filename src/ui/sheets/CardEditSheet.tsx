import { useMemo, useState } from 'preact/hooks';
import { currentInvoiceMonth, ruleOf } from '../../domain/billing';
import { invoiceFor } from '../../domain/ledger';
import type { Card } from '../../domain/types';
import { saveCard } from '../../data/store';
import { COLOR_PRESETS } from '../colors';
import { CardFace, Field, Sheet } from '../components';
import { useUI } from '../context';
import { Icon } from '../icons';
import { cardNumberLabel } from '../labels';

/** Final e cores de um cartão. Fechamento e vencimento ficam em RuleSheet (valem para todos). */
export function CardEditSheet({ cardId }: { cardId: string }) {
  const ui = useUI();
  const card = ui.data.cards.find((c) => c.id === cardId);

  const [last4, setLast4] = useState(card?.last4 ?? '');
  const [color, setColor] = useState(card?.color ?? '#3A3D42');
  const [color2, setColor2] = useState(card?.color2 ?? '#16171A');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const previewInvoice = useMemo(() => {
    const rule = card ? ruleOf(card) : null;
    if (!card || !rule) return null;
    const inv = invoiceFor(card, currentInvoiceMonth(rule, ui.today), ui.ledger, ui.today);
    return inv ? { status: inv.status, dueDate: inv.period.dueDate, totalCents: inv.totalCents } : null;
  }, [card, ui.ledger, ui.today]);

  if (!card) {
    return (
      <Sheet title="Cartão" onClose={ui.close}>
        <div class="empty">Cartão não encontrado.</div>
      </Sheet>
    );
  }

  const label = cardNumberLabel(card, ui.data.cards);
  const draft: Card = { ...card, last4: /^\d{4}$/.test(last4) ? last4 : card.last4, color, color2 };

  const onSave = async () => {
    if (!/^\d{4}$/.test(last4)) {
      setError('Informe apenas os 4 últimos dígitos.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await saveCard({ ...card, last4, color, color2 });
      ui.close();
      ui.toast(`${label} atualizado.`);
    } catch (err) {
      console.error(err);
      ui.toast('Não foi possível salvar. Tente de novo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      title={label}
      onClose={ui.close}
      footer={
        <button type="button" class="btn btn-dark btn-block" disabled={saving} onClick={onSave}>
          <Icon name="check" />
          Salvar cartão
        </button>
      }
    >
      <div class="card-preview">
        <CardFace card={draft} numberLabel={label} invoice={previewInvoice} />
      </div>

      <div class="form-card" style={{ marginTop: '16px' }}>
        <Field label="Final do cartão (4 dígitos)" htmlFor="card-last4" hint="Nunca informe o número completo do cartão.">
          <input
            id="card-last4"
            class="input"
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={last4}
            onInput={(e) => setLast4(e.currentTarget.value.replace(/\D/g, '').slice(0, 4))}
          />
          {error && <div class="field-error">{error}</div>}
        </Field>
      </div>

      <div class="form-card">
        <Field label="Cor do cartão">
          <div class="presets">
            {COLOR_PRESETS.map((p) => (
              <button
                type="button"
                class="preset"
                aria-label={p.name}
                aria-pressed={p.color === color && p.color2 === color2}
                style={{ background: `linear-gradient(135deg, ${p.color}, ${p.color2})` }}
                onClick={() => {
                  setColor(p.color);
                  setColor2(p.color2);
                }}
              />
            ))}
          </div>
          <div class="color-inputs">
            <label class="color-input">
              <input type="color" value={color} onInput={(e) => setColor(e.currentTarget.value.toUpperCase())} />
              Cor 1
            </label>
            <label class="color-input">
              <input type="color" value={color2} onInput={(e) => setColor2(e.currentTarget.value.toUpperCase())} />
              Cor 2
            </label>
          </div>
        </Field>
      </div>

      <button type="button" class="row-link" style={{ marginTop: '8px' }} onClick={() => ui.open({ type: 'rule' })}>
        <Icon name="calendar" />
        <span class="grow">
          Fechamento e vencimento
          <span class="method-sub" style={{ display: 'block' }}>
            Valem para os dois cartões
          </span>
        </span>
        <Icon name="chevronRight" size={20} />
      </button>
    </Sheet>
  );
}
