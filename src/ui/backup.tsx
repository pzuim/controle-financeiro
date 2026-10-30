import { backupFileName, createBackup, parseBackup } from '../domain/backup';
import { formatTimestamp } from '../domain/format';
import type { AppData } from '../domain/types';
import { importData, updateSettings } from '../data/store';
import { useUI } from './context';
import { plural } from './text';

function describe(data: AppData): string {
  return [
    plural(data.expenses.length, 'despesa', 'despesas'),
    plural(data.incomes.length, 'renda', 'rendas'),
    plural(data.cards.length, 'cartão', 'cartões'),
  ].join(', ');
}

/** Exportação e importação de backup em JSON. */
export function useBackup() {
  const ui = useUI();

  const exportBackup = async () => {
    try {
      const json = JSON.stringify(createBackup(ui.data), null, 2);
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = backupFileName();
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      await updateSettings({ lastExportAt: new Date().toISOString() });
      ui.toast('Backup exportado. Guarde o arquivo em um lugar seguro.');
    } catch (err) {
      console.error(err);
      ui.toast('Não foi possível exportar o backup.');
    }
  };

  const importFile = async (file: File) => {
    const result = parseBackup(await file.text());
    if (!result.ok) {
      await ui.confirm({
        title: 'Não foi possível importar',
        message: <p>{result.error}</p>,
        confirmLabel: 'Entendi',
        alert: true,
      });
      return;
    }
    const incoming = result.backup.data;
    const current = ui.data;
    const hasCurrentEntries = current.expenses.length + current.incomes.length > 0;
    const exportedAt = result.backup.exportedAt ? formatTimestamp(result.backup.exportedAt) : '';
    const ok = await ui.confirm({
      title: 'Substituir os dados deste aparelho?',
      message: (
        <>
          <p>
            <strong>Backup{exportedAt ? ` de ${exportedAt}` : ''}:</strong> {describe(incoming)}.
          </p>
          <p>
            <strong>Neste aparelho agora:</strong> {describe(current)}.
          </p>
          <p>
            Todos os dados atuais serão trocados pelos do backup. Uma cópia dos dados atuais fica guardada e pode ser
            restaurada em Configurações.
          </p>
        </>
      ),
      confirmLabel: 'Substituir dados',
      danger: true,
      requireCheck: hasCurrentEntries ? 'Entendo que os lançamentos atuais serão substituídos.' : undefined,
    });
    if (!ok) return;
    try {
      await importData(incoming);
      ui.toast('Backup importado com sucesso.');
    } catch (err) {
      console.error(err);
      ui.toast('A importação falhou. Seus dados atuais não foram alterados.');
    }
  };

  const pickAndImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file) void importFile(file);
    });
    input.click();
  };

  return { exportBackup, pickAndImport };
}
