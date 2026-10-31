/** Data no formato ISO de calendário, sem horário: "AAAA-MM-DD". */
export type ISODate = string;

/** Mês de calendário; `month` vai de 1 (janeiro) a 12 (dezembro). */
export interface YearMonth {
  year: number;
  month: number;
}

/** Período dos resumos: um mês específico ou, sem `month`, o ano inteiro. */
export interface Period {
  year: number;
  month?: number | undefined;
}

/**
 * Cartão de crédito da conta. O app o identifica como "Cartão 1", "Cartão 2"…
 * pela ordem. Os cartões da conta usam a mesma regra de fechamento e
 * vencimento (a interface grava a mesma regra em todos), mas o cálculo
 * continua sendo feito por cartão.
 */
export interface Card {
  id: string;
  /** Apenas os 4 últimos dígitos. Nunca guardar o número completo. */
  last4: string;
  /** Cores do degradê do cartão (hex #RRGGBB). */
  color: string;
  color2: string;
  /** Dia do mês (1–31) em que a fatura vence. */
  dueDay: number;
  /** Dia do mês (1–31) em que a fatura fecha. `null` enquanto o usuário não configurar. */
  closingDay: number | null;
  order: number;
}

export type CategoryIcon =
  | 'food'
  | 'transport'
  | 'leisure'
  | 'sport'
  | 'health'
  | 'home'
  | 'subscription'
  | 'shopping'
  | 'education'
  | 'other'
  | 'tag';

export interface Category {
  id: string;
  name: string;
  icon: CategoryIcon;
  /** `null` para categorias principais; id da categoria-mãe para subcategorias. */
  parentId: string | null;
  hidden: boolean;
  order: number;
}

export interface Expense {
  id: string;
  description: string;
  /** Valor total da compra, em centavos. */
  amountCents: number;
  /** Data da compra. */
  date: ISODate;
  /** Cartão usado. `null` significa Pix / débito (sem fatura). */
  cardId: string | null;
  categoryId: string;
  subcategoryId: string | null;
  /** 1 = à vista. Maior que 1 = parcelado no cartão. */
  installments: number;
  createdAt: string;
  updatedAt: string;
}

export type IncomeType = 'salario' | 'extra' | 'outro';

/** Renda da conta: não pertence a nenhum cartão e entra no resumo do mês em que foi recebida. */
export interface Income {
  id: string;
  description: string;
  amountCents: number;
  /** Data de recebimento. */
  date: ISODate;
  type: IncomeType | null;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  onboardingDone: boolean;
  lastExportAt: string | null;
}

export interface AppData {
  cards: Card[];
  categories: Category[];
  expenses: Expense[];
  incomes: Income[];
  settings: Settings;
}
