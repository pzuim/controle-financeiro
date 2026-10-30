import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import { needsNormalization, normalizeCards } from '../domain/cards';
import { defaultData } from '../domain/defaults';
import type { AppData, Card, Category, Expense, Income, Settings } from '../domain/types';

const DB_NAME = 'controle-financeiro';
const DB_VERSION = 1;

/** Cópia automática dos dados guardada antes de uma importação, para poder desfazer. */
export interface Snapshot {
  savedAt: string;
  data: AppData;
}

interface FinanceDB extends DBSchema {
  cards: { key: string; value: Card };
  categories: { key: string; value: Category };
  expenses: { key: string; value: Expense };
  incomes: { key: string; value: Income };
  meta: { key: string; value: Settings | Snapshot };
}

const SETTINGS_KEY = 'settings';
const SNAPSHOT_KEY = 'preImportSnapshot';
const DATA_STORES = ['cards', 'categories', 'expenses', 'incomes', 'meta'] as const;

let dbPromise: Promise<IDBPDatabase<FinanceDB>> | null = null;

function db(): Promise<IDBPDatabase<FinanceDB>> {
  dbPromise ??= openDB<FinanceDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      database.createObjectStore('cards', { keyPath: 'id' });
      database.createObjectStore('categories', { keyPath: 'id' });
      database.createObjectStore('expenses', { keyPath: 'id' });
      database.createObjectStore('incomes', { keyPath: 'id' });
      database.createObjectStore('meta');
    },
  });
  return dbPromise;
}

/** Carrega todos os dados. Na primeira execução grava os cartões e categorias iniciais. */
export async function loadData(): Promise<AppData> {
  const d = await db();
  const tx = d.transaction(DATA_STORES, 'readwrite');
  const settings = (await tx.objectStore('meta').get(SETTINGS_KEY)) as Settings | undefined;
  if (!settings) {
    const initial = defaultData();
    await Promise.all([
      ...initial.cards.map((c) => tx.objectStore('cards').put(c)),
      ...initial.categories.map((c) => tx.objectStore('categories').put(c)),
      tx.objectStore('meta').put(initial.settings, SETTINGS_KEY),
    ]);
    await tx.done;
    return initial;
  }
  const [storedCards, categories, expenses, incomes] = await Promise.all([
    tx.objectStore('cards').getAll(),
    tx.objectStore('categories').getAll(),
    tx.objectStore('expenses').getAll(),
    tx.objectStore('incomes').getAll(),
  ]);
  // Dados da primeira versão: aplica a regra do cartão 1 a todos e remove campos antigos.
  const cards = normalizeCards(storedCards);
  if (needsNormalization(storedCards)) await Promise.all(cards.map((c) => tx.objectStore('cards').put(c)));
  await tx.done;
  return { cards, categories, expenses, incomes, settings };
}

export async function putCard(card: Card): Promise<void> {
  await (await db()).put('cards', card);
}

/** Grava vários cartões numa única transação (ou todos, ou nenhum). */
export async function putCards(cards: Card[]): Promise<void> {
  const tx = (await db()).transaction('cards', 'readwrite');
  await Promise.all([...cards.map((c) => tx.store.put(c)), tx.done]);
}

export async function putCategory(category: Category): Promise<void> {
  await (await db()).put('categories', category);
}

export async function putExpense(expense: Expense): Promise<void> {
  await (await db()).put('expenses', expense);
}

export async function deleteExpense(id: string): Promise<void> {
  await (await db()).delete('expenses', id);
}

export async function putIncome(income: Income): Promise<void> {
  await (await db()).put('incomes', income);
}

export async function deleteIncome(id: string): Promise<void> {
  await (await db()).delete('incomes', id);
}

export async function putSettings(settings: Settings): Promise<void> {
  await (await db()).put('meta', settings, SETTINGS_KEY);
}

/**
 * Substitui todos os dados de uma só vez (transação única: ou grava tudo, ou nada).
 * Antes, guarda uma cópia dos dados atuais para permitir desfazer.
 */
export async function replaceAllData(next: AppData, current: AppData | null): Promise<void> {
  const d = await db();
  const tx = d.transaction(DATA_STORES, 'readwrite');
  const meta = tx.objectStore('meta');
  const writes: Promise<unknown>[] = [];
  if (current) {
    const snapshot: Snapshot = { savedAt: new Date().toISOString(), data: current };
    writes.push(meta.put(snapshot, SNAPSHOT_KEY));
  }
  await Promise.all([
    tx.objectStore('cards').clear(),
    tx.objectStore('categories').clear(),
    tx.objectStore('expenses').clear(),
    tx.objectStore('incomes').clear(),
  ]);
  writes.push(
    ...next.cards.map((c) => tx.objectStore('cards').put(c)),
    ...next.categories.map((c) => tx.objectStore('categories').put(c)),
    ...next.expenses.map((e) => tx.objectStore('expenses').put(e)),
    ...next.incomes.map((i) => tx.objectStore('incomes').put(i)),
    meta.put(next.settings, SETTINGS_KEY),
  );
  await Promise.all(writes);
  await tx.done;
}

export async function getSnapshot(): Promise<Snapshot | null> {
  const value = await (await db()).get('meta', SNAPSHOT_KEY);
  return value && 'data' in value ? value : null;
}

export async function clearSnapshot(): Promise<void> {
  await (await db()).delete('meta', SNAPSHOT_KEY);
}
