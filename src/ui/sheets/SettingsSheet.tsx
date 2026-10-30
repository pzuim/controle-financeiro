import { useEffect, useState } from 'preact/hooks';
import { formatTimestamp } from '../../domain/format';
import { getSnapshot, restoreSnapshot } from '../../data/store';
import type { Snapshot } from '../../data/db';
import { useBackup } from '../backup';
import { cardGradient } from '../colors';
import { Notice, Sheet } from '../components';
import { useUI } from '../context';
import { Icon } from '../icons';
import { accountRule, cardNumberLabel, sortedCards } from '../labels';
import { plural } from '../text';

export function SettingsSheet() {
  const ui = useUI();
  const { exportBackup, pickAndImport } = useBackup();
  const cards = sortedCards(ui.data.cards);
  const rule = accountRule(cards);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    void getSnapshot().then(setSnapshot);
  }, [ui.data]);

  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted);
  }, []);

  const onRestore = async () => {
    if (!snapshot) return;
    const ok = await ui.confirm({
      title: 'Restaurar dados anteriores?',
      message: (
        <p>
          Os dados de antes da última importação ({formatTimestamp(snapshot.savedAt)}:{' '}
          {plural(snapshot.data.expenses.length, 'despesa', 'despesas')} e{' '}
          {plural(snapshot.data.incomes.length, 'renda', 'rendas')}) vão substituir os dados atuais.
        </p>
      ),
      confirmLabel: 'Restaurar',
      danger: true,
    });
    if (!ok) return;
    try {
      await restoreSnapshot();
      ui.toast('Dados anteriores restaurados.');
    } catch (err) {
      console.error(err);
      ui.toast('Não foi possível restaurar.');
    }
  };

  const lastExport = ui.data.settings.lastExportAt;

  return (
    <Sheet title="Configurações" onClose={ui.close}>
      <Notice>
        <strong>Seus dados ficam apenas neste aparelho.</strong> Nada é enviado para a internet. Se você limpar os
        dados do navegador, desinstalar o app ou trocar de celular, só conseguirá recuperar os lançamentos com um
        backup exportado.
        <div style={{ marginTop: '6px' }}>
          Último backup: <strong>{lastExport ? formatTimestamp(lastExport) : 'nunca'}</strong>
        </div>
      </Notice>

      <h3 class="section-title">Fatura</h3>
      <section class="panel" style={{ paddingTop: '4px', paddingBottom: '4px' }}>
        <button type="button" class="row-link" onClick={() => ui.open({ type: 'rule' })}>
          <Icon name="calendar" />
          <span class="grow">
            {rule.closingDay === null
              ? `Vence dia ${rule.dueDay} · fechamento não definido`
              : `Fecha dia ${rule.closingDay} · vence dia ${rule.dueDay}`}
            <span class="method-sub" style={{ display: 'block' }}>
              Vale para os dois cartões
            </span>
          </span>
          <Icon name="chevronRight" size={20} />
        </button>
      </section>

      <h3 class="section-title">Cartões</h3>
      <section class="panel" style={{ paddingTop: '4px', paddingBottom: '4px' }}>
        <ul class="list">
          {cards.map((card) => (
            <li key={card.id}>
              <button type="button" class="settings-card-row" onClick={() => ui.open({ type: 'card', cardId: card.id })}>
                <span class="mini-card" style={{ background: cardGradient(card.color, card.color2) }} aria-hidden="true" />
                <span class="grow">
                  <span class="title" style={{ display: 'block' }}>
                    {cardNumberLabel(card, cards)} · final {card.last4}
                  </span>
                  <span class="sub" style={{ display: 'block' }}>
                    Final e cor
                  </span>
                </span>
                <Icon name="chevronRight" size={20} />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <h3 class="section-title">Categorias</h3>
      <section class="panel" style={{ paddingTop: '4px', paddingBottom: '4px' }}>
        <button type="button" class="row-link" onClick={() => ui.open({ type: 'categories' })}>
          <Icon name="tag" />
          <span class="grow">Adicionar, renomear e ocultar categorias</span>
          <Icon name="chevronRight" size={20} />
        </button>
      </section>

      <h3 class="section-title">Backup</h3>
      <section class="panel" style={{ paddingTop: '4px', paddingBottom: '4px' }}>
        <ul class="list">
          <li>
            <button type="button" class="row-link" onClick={exportBackup}>
              <Icon name="download" />
              <span class="grow">
                Exportar backup
                <span class="method-sub" style={{ display: 'block' }}>
                  Salva um arquivo .json com todos os lançamentos
                </span>
              </span>
            </button>
          </li>
          <li>
            <button type="button" class="row-link" onClick={pickAndImport}>
              <Icon name="upload" />
              <span class="grow">
                Importar backup
                <span class="method-sub" style={{ display: 'block' }}>
                  Pede confirmação antes de substituir os dados atuais
                </span>
              </span>
            </button>
          </li>
          {snapshot && (
            <li>
              <button type="button" class="row-link" onClick={onRestore}>
                <Icon name="restore" />
                <span class="grow">
                  Desfazer última importação
                  <span class="method-sub" style={{ display: 'block' }}>
                    Volta aos dados de {formatTimestamp(snapshot.savedAt)}
                  </span>
                </span>
              </button>
            </li>
          )}
        </ul>
      </section>

      <h3 class="section-title">Lançamentos</h3>
      <section class="panel" style={{ paddingTop: '4px', paddingBottom: '4px' }}>
        <button type="button" class="row-link" onClick={() => ui.open({ type: 'history', filter: { month: 'all' } })}>
          <Icon name="history" />
          <span class="grow">Histórico completo</span>
          <Icon name="chevronRight" size={20} />
        </button>
      </section>

      <p class="app-footer">
        Controle Financeiro · versão {__APP_VERSION__}
        {persisted !== null && (
          <>
            <br />
            {persisted
              ? 'Armazenamento protegido contra limpeza automática do navegador.'
              : 'Instale o app na tela inicial para proteger melhor o armazenamento.'}
          </>
        )}
      </p>
    </Sheet>
  );
}
