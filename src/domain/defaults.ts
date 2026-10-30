import type { AppData, Card, Category, CategoryIcon } from './types';

/** Os dois cartões são da mesma conta e seguem a regra do cartão 1: fecham dia 24 e vencem dia 2. */
export const DEFAULT_CLOSING_DAY = 24;
export const DEFAULT_DUE_DAY = 2;

export function defaultCards(): Card[] {
  return [
    {
      id: 'card-1',
      last4: '6722',
      color: '#FF7A00',
      color2: '#F2520A',
      dueDay: DEFAULT_DUE_DAY,
      closingDay: DEFAULT_CLOSING_DAY,
      order: 1,
    },
    {
      id: 'card-2',
      last4: '6222',
      color: '#FF3D81',
      color2: '#FF6A3D',
      dueDay: DEFAULT_DUE_DAY,
      closingDay: DEFAULT_CLOSING_DAY,
      order: 2,
    },
  ];
}

const MAIN_CATEGORIES: ReadonlyArray<[id: string, name: string, icon: CategoryIcon]> = [
  ['cat-alimentacao', 'Alimentação', 'food'],
  ['cat-transporte', 'Transporte', 'transport'],
  ['cat-lazer', 'Lazer', 'leisure'],
  ['cat-esporte', 'Esporte / Tênis', 'sport'],
  ['cat-saude', 'Saúde', 'health'],
  ['cat-moradia', 'Moradia', 'home'],
  ['cat-assinaturas', 'Assinaturas', 'subscription'],
  ['cat-compras', 'Compras', 'shopping'],
  ['cat-educacao', 'Educação', 'education'],
  ['cat-outros', 'Outros', 'other'],
];

const SUBSCRIPTIONS = ['Netflix', 'Amazon Prime', 'Disney+', 'HBO Max', 'Crunchyroll'];

export function defaultCategories(): Category[] {
  const main: Category[] = MAIN_CATEGORIES.map(([id, name, icon], i) => ({
    id,
    name,
    icon,
    parentId: null,
    hidden: false,
    order: i + 1,
  }));
  const subs: Category[] = SUBSCRIPTIONS.map((name, i) => ({
    id: `cat-assinaturas-${i + 1}`,
    name,
    icon: 'subscription',
    parentId: 'cat-assinaturas',
    hidden: false,
    order: i + 1,
  }));
  return [...main, ...subs];
}

export function defaultData(): AppData {
  return {
    cards: defaultCards(),
    categories: defaultCategories(),
    expenses: [],
    incomes: [],
    settings: { onboardingDone: false, lastExportAt: null },
  };
}
