import { createContext } from 'preact';
import type { ComponentChildren } from 'preact';
import { useContext } from 'preact/hooks';
import type { Ledger } from '../domain/ledger';
import type { AppData, ISODate, YearMonth } from '../domain/types';

export type Tab = 'cards' | 'summary' | 'categories';

export interface HistoryFilter {
  /** "AAAA-MM" ou "all". */
  month?: string;
  /** id do cartão, "pix", "income" ou "all". */
  method?: string;
  categoryId?: string;
}

export type SheetSpec =
  | { type: 'expense'; expenseId?: string; cardId?: string | null }
  | { type: 'income'; incomeId?: string }
  | { type: 'history'; filter?: HistoryFilter }
  | { type: 'settings' }
  | { type: 'card'; cardId: string }
  | { type: 'rule' }
  | { type: 'categories' };

export interface DialogSpec {
  title: string;
  message: ComponentChildren;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  /** Quando informado, exige marcar esta caixa antes de confirmar. */
  requireCheck?: string;
  /** Diálogo só informativo: mostra apenas o botão de confirmar. */
  alert?: boolean;
}

export interface UIContextValue {
  data: AppData;
  ledger: Ledger;
  today: ISODate;
  tab: Tab;
  goTo(tab: Tab): void;
  /** Mês compartilhado pelas telas Resumo e Categorias. */
  month: YearMonth;
  setMonth(month: YearMonth): void;
  selectedCardId: string;
  setSelectedCardId(id: string): void;
  /** Fatura escolhida em cada cartão ("AAAA-MM" do vencimento). Sem valor = fatura aberta. */
  invoiceByCard: Record<string, string>;
  setInvoiceFor(cardId: string, monthKey: string | null): void;
  open(sheet: SheetSpec): void;
  /** Fecha a camada do topo (painel ou diálogo). */
  close(): void;
  confirm(dialog: DialogSpec): Promise<boolean>;
  toast(message: string): void;
}

export const UIContext = createContext<UIContextValue | null>(null);

export function useUI(): UIContextValue {
  const ui = useContext(UIContext);
  if (!ui) throw new Error('useUI fora do UIContext');
  return ui;
}
