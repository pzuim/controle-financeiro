import { describe, expect, it } from 'vitest';
import { BACKUP_VERSION, createBackup, parseBackup } from '../src/domain/backup';
import { defaultData } from '../src/domain/defaults';
import type { AppData } from '../src/domain/types';

function sampleData(): AppData {
  const data = defaultData();
  data.settings.onboardingDone = true;
  data.expenses.push({
    id: 'e1',
    description: 'Mercado',
    amountCents: 25990,
    date: '2026-11-25',
    cardId: 'card-1',
    categoryId: 'cat-alimentacao',
    subcategoryId: null,
    installments: 3,
    createdAt: '2026-11-25T10:00:00.000Z',
    updatedAt: '2026-11-25T10:00:00.000Z',
  });
  data.incomes.push({
    id: 'i1',
    description: 'Salário',
    amountCents: 800000,
    date: '2026-11-05',
    type: 'salario',
    createdAt: '2026-11-05T10:00:00.000Z',
    updatedAt: '2026-11-05T10:00:00.000Z',
  });
  return data;
}

function tamper(mutate: (raw: any) => void): string {
  const raw = JSON.parse(JSON.stringify(createBackup(sampleData())));
  mutate(raw);
  return JSON.stringify(raw);
}

describe('backup', () => {
  it('exporta e importa sem perder dados', () => {
    const data = sampleData();
    const result = parseBackup(JSON.stringify(createBackup(data)));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backup.data).toEqual(data);
  });

  it('aceita backups da primeira versão (cartões com nome e sem fechamento)', () => {
    const result = parseBackup(
      tamper((r) => {
        r.data.cards[0].name = 'Cartão antigo';
        r.data.cards[1].closingDay = null;
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.backup.data.cards[0]).not.toHaveProperty('name');
      expect(result.backup.data.cards[1]!.closingDay).toBeNull();
    }
  });

  it('recusa arquivos que não são backup do app', () => {
    expect(parseBackup('não é json')).toMatchObject({ ok: false });
    expect(parseBackup('{"app":"outro"}')).toMatchObject({ ok: false });
    expect(parseBackup(tamper((r) => (r.version = BACKUP_VERSION + 1)))).toMatchObject({ ok: false });
  });

  it('recusa lançamentos inconsistentes', () => {
    expect(parseBackup(tamper((r) => (r.data.expenses[0].categoryId = 'nao-existe')))).toMatchObject({ ok: false });
    expect(parseBackup(tamper((r) => (r.data.expenses[0].cardId = 'card-9')))).toMatchObject({ ok: false });
    expect(parseBackup(tamper((r) => (r.data.expenses[0].amountCents = 10.5)))).toMatchObject({ ok: false });
    expect(parseBackup(tamper((r) => (r.data.expenses[0].date = '2026-02-30')))).toMatchObject({ ok: false });
    expect(parseBackup(tamper((r) => (r.data.expenses[0].cardId = null)))).toMatchObject({ ok: false });
    expect(parseBackup(tamper((r) => r.data.incomes.push(r.data.incomes[0])))).toMatchObject({ ok: false });
    expect(parseBackup(tamper((r) => (r.data.cards[0].last4 = '1234567812345678')))).toMatchObject({ ok: false });
  });
});
