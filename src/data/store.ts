import { useEffect, useState } from 'preact/hooks';
import { normalizeCards } from '../domain/cards';
import type { AppData, Card, Category, Expense, Income, Settings } from '../domain/types';
import * as db from './db';

export type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: AppData };

let state: LoadState = { status: 'loading' };
const listeners = new Set<(s: LoadState) => void>();

function setState(next: LoadState): void {
  state = next;
  for (const listener of listeners) listener(state);
}

export function useAppState(): LoadState {
  const [current, setCurrent] = useState(state);
  useEffect(() => {
    listeners.add(setCurrent);
    setCurrent(state);
    return () => {
      listeners.delete(setCurrent);
    };
  }, []);
  return current;
}

function currentData(): AppData {
  if (state.status !== 'ready') throw new Error('Os dados ainda não foram carregados.');
  return state.data;
}

function update(change: (data: AppData) => AppData): void {
  setState({ status: 'ready', data: change(currentData()) });
}

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const index = list.findIndex((x) => x.id === item.id);
  if (index === -1) return [...list, item];
  const copy = [...list];
  copy[index] = item;
  return copy;
}

export function newId(): string {
  // randomUUID só existe em contexto seguro (HTTPS/localhost); fora dele usamos bytes aleatórios.
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function initStore(): Promise<void> {
  try {
    setState({ status: 'ready', data: await db.loadData() });
  } catch (err) {
    console.error(err);
    setState({
      status: 'error',
      message:
        'Não foi possível abrir o armazenamento do aparelho. Verifique se o navegador não está em modo anônimo e se há espaço disponível.',
    });
  }
}

// Todas as ações gravam primeiro no IndexedDB e só depois atualizam a tela:
// se a gravação falhar, nada muda e o erro chega a quem chamou.

export async function saveExpense(expense: Expense): Promise<void> {
  await db.putExpense(expense);
  update((d) => ({ ...d, expenses: upsert(d.expenses, expense) }));
}

export async function removeExpense(id: string): Promise<void> {
  await db.deleteExpense(id);
  update((d) => ({ ...d, expenses: d.expenses.filter((e) => e.id !== id) }));
}

export async function saveIncome(income: Income): Promise<void> {
  await db.putIncome(income);
  update((d) => ({ ...d, incomes: upsert(d.incomes, income) }));
}

export async function removeIncome(id: string): Promise<void> {
  await db.deleteIncome(id);
  update((d) => ({ ...d, incomes: d.incomes.filter((i) => i.id !== id) }));
}

export async function saveCard(card: Card): Promise<void> {
  await db.putCard(card);
  update((d) => ({ ...d, cards: upsert(d.cards, card) }));
}

/** Aplica o mesmo fechamento e vencimento a todos os cartões da conta. */
export async function saveAccountRule(closingDay: number, dueDay: number): Promise<void> {
  const cards = currentData().cards.map((c) => ({ ...c, closingDay, dueDay }));
  await db.putCards(cards);
  update((d) => ({ ...d, cards }));
}

export async function saveCategory(category: Category): Promise<void> {
  await db.putCategory(category);
  update((d) => ({ ...d, categories: upsert(d.categories, category) }));
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const settings = { ...currentData().settings, ...patch };
  await db.putSettings(settings);
  update((d) => ({ ...d, settings }));
}

/** Substitui todos os dados pelos do backup, guardando antes uma cópia dos dados atuais. */
export async function importData(next: AppData): Promise<void> {
  const data: AppData = {
    ...next,
    cards: normalizeCards(next.cards),
    settings: { ...next.settings, onboardingDone: true },
  };
  await db.replaceAllData(data, currentData());
  setState({ status: 'ready', data });
}

export const getSnapshot = db.getSnapshot;

/** Volta aos dados guardados automaticamente antes da última importação. */
export async function restoreSnapshot(): Promise<boolean> {
  const snapshot = await db.getSnapshot();
  if (!snapshot) return false;
  const data: AppData = { ...snapshot.data, cards: normalizeCards(snapshot.data.cards) };
  await db.replaceAllData(data, null);
  await db.clearSnapshot();
  setState({ status: 'ready', data });
  return true;
}
