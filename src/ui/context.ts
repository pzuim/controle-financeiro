import { createContext } from 'preact';
import type { ComponentChildren } from 'preact';
import { useContext } from 'preact/hooks';
import type { Ledger } from '../domain/ledger';
import type { AppData, ISODate, YearMonth } from '../domain/types';

export type Tab = 'cards' | 'summary' | 'categories';

/** Resumo e Categorias mostram o ano inteiro (padrão) ou um mês. */
export type SummaryScope = 'year' | 'month';

export interface HistoryFilter {
  /** "AAAA-MM" (mês), "AAAA" (ano inteiro) ou "all". */
  month?: string;
  /** id do cartão, "pix", "income" ou "all". */
  method?: string;
  categoryId?: string;
}

export type SheetSpec =
  /** `date`: data sugerida para um lançamento novo (padrão: hoje). */
  | { type: 'expense'; expenseId?: string; cardId?: string | null; date?: ISODate }
  | { type: 'income'; incomeId?: string; date?: ISODate }
  | { type: 'history'; filter?: HistoryFilter }
  | { type: 'settings' }
  | { type: 'cardView'; cardId: string }
  | { type: 'account' }
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
  /** Mês compartilhado pelas telas Resumo e Categorias; no modo ano, vale o `year`. */
  month: YearMonth;
  setMonth(month: YearMonth): void;
  scope: SummaryScope;
  setScope(scope: SummaryScope): void;
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
