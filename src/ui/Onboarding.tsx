import { useState } from 'preact/hooks';
import { updateSettings } from '../data/store';
import { useBackup } from './backup';
import { cardGradient } from './colors';
import { Notice } from './components';
import { useUI } from './context';
import { Icon } from './icons';
import { accountRule, cardNumberLabel, sortedCards } from './labels';

/** Primeira abertura: apresenta os cartões e a regra de fatura e oferece importar um backup. */
export function Onboarding() {
  const ui = useUI();
  const { pickAndImport } = useBackup();
  const cards = sortedCards(ui.data.cards);
  const rule = accountRule(cards);
  const [saving, setSaving] = useState(false);

  const start = async () => {
    setSaving(true);
    try {
      await updateSettings({ onboardingDone: true });
      void navigator.storage?.persist?.();
    } catch (err) {
      console.error(err);
      ui.toast('Não foi possível salvar. Tente de novo.');
      setSaving(false);
    }
  };

  return (
    <main class="onboarding">
      <img class="logo" src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" width={64} height={64} />
      <h1>Seu controle financeiro</h1>
      <p class="lead">Registre despesas e rendas em poucos toques e veja, mês a mês, onde o dinheiro está indo.</p>

      <h2 class="section-title">Seus cartões</h2>
      <section class="panel" style={{ paddingTop: '4px', paddingBottom: '4px' }}>
        <ul class="list">
          {cards.map((card) => (
            <li key={card.id}>
              <div class="settings-card-row" style={{ minHeight: '64px' }}>
                <span class="mini-card" style={{ background: cardGradient(card.color, card.color2) }} aria-hidden="true" />
                <span class="grow">
                  <span class="title">
                    {cardNumberLabel(card, cards)} · final {card.last4}
                  </span>
                </span>
              </div>
            </li>
          ))}
        </ul>
        {rule.closingDay !== null && (
          <p class="field-hint" style={{ margin: '0 0 12px' }}>
            Os dois cartões são da mesma conta: fecham no dia {rule.closingDay} e vencem no dia {rule.dueDay}.
          </p>
        )}
      </section>

      <div style={{ marginTop: '12px' }}>
        <Notice>
          Seus dados ficam apenas neste aparelho. Exporte um backup de vez em quando em Configurações. Finais, cores,
          fechamento e vencimento podem ser alterados lá a qualquer momento.
        </Notice>
      </div>

      <div class="bottom">
        <button type="button" class="btn btn-dark btn-block" disabled={saving} onClick={start}>
          Começar
          <Icon name="chevronRight" size={20} />
        </button>
        <button type="button" class="btn btn-block" style={{ marginTop: '8px', background: 'transparent' }} onClick={pickAndImport}>
          <Icon name="upload" size={20} />
          Trocou de aparelho? Importar backup
        </button>
      </div>
    </main>
  );
}
