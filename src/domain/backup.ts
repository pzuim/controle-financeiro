import { isValidDay } from './billing';
import { isValidISODate, todayISO } from './dates';
import { MAX_INSTALLMENTS } from './installments';
import type { AppData, Card, Category, CategoryIcon, Expense, Income, IncomeType, Settings } from './types';

export const BACKUP_APP = 'controle-financeiro';
export const BACKUP_VERSION = 1;

export interface BackupFile {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  data: AppData;
}

export function createBackup(data: AppData, now: Date = new Date()): BackupFile {
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), data };
}

export function backupFileName(now: Date = new Date()): string {
  return `controle-financeiro-backup-${todayISO(now)}.json`;
}

export type BackupParseResult = { ok: true; backup: BackupFile } | { ok: false; error: string };

class InvalidBackup extends Error {}

function fail(message: string): never {
  throw new InvalidBackup(message);
}

type Obj = Record<string, unknown>;

function asObject(value: unknown, where: string): Obj {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(`${where} não é um objeto válido.`);
  return value as Obj;
}

function asArray(value: unknown, where: string): unknown[] {
  if (!Array.isArray(value)) fail(`${where} não é uma lista válida.`);
  return value;
}

function text(o: Obj, key: string, where: string, allowEmpty = false): string {
  const v = o[key];
  if (typeof v !== 'string' || (!allowEmpty && v.trim() === '')) fail(`${where}: campo "${key}" inválido.`);
  return v;
}

function integer(o: Obj, key: string, where: string, min: number, max: number): number {
  const v = o[key];
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) fail(`${where}: campo "${key}" inválido.`);
  return v;
}

function bool(o: Obj, key: string, where: string): boolean {
  const v = o[key];
  if (typeof v !== 'boolean') fail(`${where}: campo "${key}" inválido.`);
  return v;
}

function nullableText(o: Obj, key: string, where: string): string | null {
  return o[key] === null || o[key] === undefined ? null : text(o, key, where);
}

function date(o: Obj, key: string, where: string): string {
  const v = o[key];
  if (!isValidISODate(v)) fail(`${where}: data "${key}" inválida.`);
  return v;
}

function uniqueIds(items: { id: string }[], where: string): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) fail(`${where}: identificador repetido (${item.id}).`);
    seen.add(item.id);
  }
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const ICONS: ReadonlySet<CategoryIcon> = new Set([
  'food',
  'transport',
  'leisure',
  'sport',
  'health',
  'home',
  'subscription',
  'shopping',
  'education',
  'other',
  'tag',
]);
const INCOME_TYPES: ReadonlySet<IncomeType> = new Set(['salario', 'extra', 'outro']);
const MAX_CENTS = 100_000_000_00; // R$ 100 milhões: protege contra valores absurdos.

function parseCard(value: unknown, i: number): Card {
  const where = `Cartão ${i + 1}`;
  const o = asObject(value, where);
  const last4 = text(o, 'last4', where);
  if (!/^\d{4}$/.test(last4)) fail(`${where}: o final deve ter 4 dígitos.`);
  const color = text(o, 'color', where);
  const color2 = text(o, 'color2', where);
  if (!HEX_COLOR.test(color) || !HEX_COLOR.test(color2)) fail(`${where}: cor inválida.`);
  const closingDay = o['closingDay'] === null ? null : integer(o, 'closingDay', where, 1, 31);
  // Backups antigos também traziam "name"; o campo deixou de existir e é ignorado.
  return {
    id: text(o, 'id', where),
    last4,
    color,
    color2,
    dueDay: integer(o, 'dueDay', where, 1, 31),
    closingDay,
    order: integer(o, 'order', where, -1_000_000, 1_000_000),
  };
}

function parseCategory(value: unknown, i: number): Category {
  const where = `Categoria ${i + 1}`;
  const o = asObject(value, where);
  const icon = text(o, 'icon', where) as CategoryIcon;
  return {
    id: text(o, 'id', where),
    name: text(o, 'name', where),
    icon: ICONS.has(icon) ? icon : 'tag',
    parentId: nullableText(o, 'parentId', where),
    hidden: bool(o, 'hidden', where),
    order: integer(o, 'order', where, -1_000_000, 1_000_000),
  };
}

function parseExpense(value: unknown, i: number): Expense {
  const where = `Despesa ${i + 1}`;
  const o = asObject(value, where);
  return {
    id: text(o, 'id', where),
    description: text(o, 'description', where),
    amountCents: integer(o, 'amountCents', where, 1, MAX_CENTS),
    date: date(o, 'date', where),
    cardId: nullableText(o, 'cardId', where),
    categoryId: text(o, 'categoryId', where),
    subcategoryId: nullableText(o, 'subcategoryId', where),
    installments: integer(o, 'installments', where, 1, MAX_INSTALLMENTS),
    createdAt: text(o, 'createdAt', where),
    updatedAt: text(o, 'updatedAt', where),
  };
}

function parseIncome(value: unknown, i: number): Income {
  const where = `Renda ${i + 1}`;
  const o = asObject(value, where);
  const type = nullableText(o, 'type', where);
  if (type !== null && !INCOME_TYPES.has(type as IncomeType)) fail(`${where}: tipo inválido.`);
  return {
    id: text(o, 'id', where),
    description: text(o, 'description', where),
    amountCents: integer(o, 'amountCents', where, 1, MAX_CENTS),
    date: date(o, 'date', where),
    type: type as IncomeType | null,
    createdAt: text(o, 'createdAt', where),
    updatedAt: text(o, 'updatedAt', where),
  };
}

function parseSettings(value: unknown): Settings {
  const o = asObject(value ?? {}, 'Configurações');
  return {
    onboardingDone: o['onboardingDone'] === undefined ? true : bool(o, 'onboardingDone', 'Configurações'),
    lastExportAt: nullableText(o, 'lastExportAt', 'Configurações'),
  };
}

/** Confere se as referências entre registros são coerentes (cartões, categorias e subcategorias existentes). */
function checkIntegrity(data: AppData): void {
  if (data.cards.length === 0) fail('O backup não tem nenhum cartão.');
  if (!data.categories.some((c) => c.parentId === null)) fail('O backup não tem nenhuma categoria.');
  uniqueIds(data.cards, 'Cartões');
  uniqueIds(data.categories, 'Categorias');
  uniqueIds(data.expenses, 'Despesas');
  uniqueIds(data.incomes, 'Rendas');

  const cardIds = new Set(data.cards.map((c) => c.id));
  const categories = new Map(data.categories.map((c) => [c.id, c]));
  for (const c of data.categories) {
    if (c.parentId === null) continue;
    const parent = categories.get(c.parentId);
    if (!parent || parent.parentId !== null) fail(`A subcategoria "${c.name}" aponta para uma categoria inexistente.`);
  }
  for (const e of data.expenses) {
    const where = `Despesa "${e.description}"`;
    if (e.cardId !== null && !cardIds.has(e.cardId)) fail(`${where}: cartão inexistente.`);
    if (e.cardId === null && e.installments !== 1) fail(`${where}: Pix / débito não pode ser parcelado.`);
    if (e.amountCents < e.installments) fail(`${where}: valor menor que o número de parcelas.`);
    const category = categories.get(e.categoryId);
    if (!category || category.parentId !== null) fail(`${where}: categoria inexistente.`);
    if (e.subcategoryId !== null) {
      const sub = categories.get(e.subcategoryId);
      if (!sub || sub.parentId !== e.categoryId) fail(`${where}: subcategoria inexistente.`);
    }
  }
  for (const card of data.cards) {
    if (!isValidDay(card.dueDay)) fail(`Cartão final ${card.last4}: vencimento inválido.`);
  }
}

/** Lê e valida um arquivo de backup. Nada é gravado aqui. */
export function parseBackup(raw: string): BackupParseResult {
  try {
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      fail('O arquivo não é um JSON válido.');
    }
    const root = asObject(json, 'Arquivo');
    if (root['app'] !== BACKUP_APP) fail('Este arquivo não é um backup do Controle Financeiro.');
    const version = root['version'];
    if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) fail('Versão do backup inválida.');
    if (version > BACKUP_VERSION) fail('Este backup foi criado por uma versão mais nova do aplicativo. Atualize o app e tente de novo.');
    const exportedAt = typeof root['exportedAt'] === 'string' ? root['exportedAt'] : '';
    const d = asObject(root['data'], 'Dados');
    const data: AppData = {
      cards: asArray(d['cards'], 'Cartões').map(parseCard),
      categories: asArray(d['categories'], 'Categorias').map(parseCategory),
      expenses: asArray(d['expenses'], 'Despesas').map(parseExpense),
      incomes: asArray(d['incomes'], 'Rendas').map(parseIncome),
      settings: parseSettings(d['settings']),
    };
    checkIntegrity(data);
    return { ok: true, backup: { app: BACKUP_APP, version, exportedAt, data } };
  } catch (err) {
    if (err instanceof InvalidBackup) return { ok: false, error: err.message };
    throw err;
  }
}
