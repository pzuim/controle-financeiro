import { describe, expect, it } from 'vitest';
import {
  closingMonthFor,
  currentInvoiceMonth,
  dueOffset,
  invoiceMonthFor,
  invoicePeriod,
  invoiceStatus,
  ruleOf,
} from '../src/domain/billing';
import type { BillingRule } from '../src/domain/billing';
import { addDays, ymKey } from '../src/domain/dates';

/** Cartão 6722: fecha dia 24, vence dia 2 (regra confirmada). */
const CARD_6722: BillingRule = { closingDay: 24, dueDay: 2 };

const due = (date: string, rule: BillingRule) => ymKey(invoiceMonthFor(date, rule));

describe('regra confirmada do cartão 6722 (fecha 24, vence 2)', () => {
  it('compra até o dia 24 entra na fatura que vence dia 2 do mês seguinte', () => {
    expect(due('2026-11-01', CARD_6722)).toBe('2026-12');
    expect(due('2026-11-10', CARD_6722)).toBe('2026-12');
    expect(due('2026-11-24', CARD_6722)).toBe('2026-12');
  });

  it('compra a partir do dia 25 entra na fatura do mês posterior (exemplo da especificação)', () => {
    // "uma compra feita em 25 de novembro no cartão 6722 deve entrar na fatura com vencimento em 2 de janeiro"
    expect(due('2026-11-25', CARD_6722)).toBe('2027-01');
    expect(invoicePeriod({ year: 2027, month: 1 }, CARD_6722).dueDate).toBe('2027-01-02');
    expect(due('2026-11-30', CARD_6722)).toBe('2027-01');
  });

  it('vira o ano corretamente', () => {
    expect(due('2026-12-24', CARD_6722)).toBe('2027-01');
    expect(due('2026-12-25', CARD_6722)).toBe('2027-02');
    expect(due('2026-12-31', CARD_6722)).toBe('2027-02');
  });

  it('informa o período de compras, o fechamento e o vencimento da fatura', () => {
    expect(invoicePeriod({ year: 2027, month: 1 }, CARD_6722)).toEqual({
      dueMonth: { year: 2027, month: 1 },
      startDate: '2026-11-25',
      closingDate: '2026-12-24',
      dueDate: '2027-01-02',
    });
  });

  it('fevereiro, março e meses de 30 dias seguem a mesma regra', () => {
    expect(due('2027-02-24', CARD_6722)).toBe('2027-03');
    expect(due('2027-02-25', CARD_6722)).toBe('2027-04');
    expect(due('2027-02-28', CARD_6722)).toBe('2027-04');
    expect(invoicePeriod({ year: 2027, month: 4 }, CARD_6722)).toMatchObject({
      startDate: '2027-02-25',
      closingDate: '2027-03-24',
      dueDate: '2027-04-02',
    });
  });
});

describe('regra genérica de fechamento', () => {
  it('fechamento no dia 31 vale como último dia de meses mais curtos', () => {
    const rule: BillingRule = { closingDay: 31, dueDay: 8 };
    expect(ymKey(closingMonthFor('2026-02-28', 31))).toBe('2026-02');
    expect(ymKey(closingMonthFor('2026-03-01', 31))).toBe('2026-03');
    expect(ymKey(closingMonthFor('2026-04-30', 31))).toBe('2026-04');
    expect(due('2026-04-30', rule)).toBe('2026-05');
    expect(invoicePeriod({ year: 2026, month: 3 }, rule)).toMatchObject({
      startDate: '2026-02-01',
      closingDate: '2026-02-28',
      dueDate: '2026-03-08',
    });
  });

  it('trata ano bissexto', () => {
    const rule: BillingRule = { closingDay: 30, dueDay: 7 };
    expect(ymKey(closingMonthFor('2028-02-29', 30))).toBe('2028-02');
    expect(invoicePeriod({ year: 2028, month: 3 }, rule).closingDate).toBe('2028-02-29');
    expect(invoicePeriod({ year: 2027, month: 3 }, rule).closingDate).toBe('2027-02-28');
    // Depois de um fechamento ajustado em fevereiro, o próximo ciclo começa em 1º de março.
    expect(invoicePeriod({ year: 2027, month: 4 }, rule).startDate).toBe('2027-03-01');
  });

  it('vencimento no dia 31 cai no último dia de meses mais curtos', () => {
    const rule: BillingRule = { closingDay: 20, dueDay: 31 };
    expect(invoicePeriod({ year: 2026, month: 2 }, rule).dueDate).toBe('2026-02-28');
    expect(invoicePeriod({ year: 2026, month: 4 }, rule).dueDate).toBe('2026-04-30');
  });

  it('quando o fechamento é antes do vencimento no mesmo mês, a fatura vence naquele mês', () => {
    const rule: BillingRule = { closingDay: 1, dueDay: 5 };
    expect(dueOffset(rule)).toBe(0);
    expect(due('2026-11-01', rule)).toBe('2026-11');
    expect(due('2026-11-02', rule)).toBe('2026-12');
    expect(invoicePeriod({ year: 2026, month: 11 }, rule)).toMatchObject({
      closingDate: '2026-11-01',
      dueDate: '2026-11-05',
    });
  });

  it('fechamento e vencimento no mesmo dia: vence no mês seguinte ao fechamento', () => {
    const rule: BillingRule = { closingDay: 10, dueDay: 10 };
    expect(dueOffset(rule)).toBe(1);
    expect(due('2026-11-10', rule)).toBe('2026-12');
  });

  it('toda data cai dentro do período da fatura atribuída e o vencimento vem depois do fechamento', () => {
    const rules: BillingRule[] = [
      CARD_6722,
      { closingDay: 28, dueDay: 5 },
      { closingDay: 31, dueDay: 10 },
      { closingDay: 25, dueDay: 31 },
      { closingDay: 1, dueDay: 5 },
      { closingDay: 15, dueDay: 15 },
    ];
    for (const rule of rules) {
      let date = '2026-01-01';
      const seen = new Map<string, string>();
      for (let i = 0; i < 365 * 3; i++) {
        const month = invoiceMonthFor(date, rule);
        const period = invoicePeriod(month, rule);
        expect(date >= period.startDate && date <= period.closingDate, `${date} ${JSON.stringify(rule)}`).toBe(true);
        expect(period.dueDate > period.closingDate).toBe(true);
        // Cada fatura (mês de vencimento) corresponde a um único ciclo de compras.
        const key = ymKey(month);
        const previous = seen.get(key);
        if (previous) expect(previous).toBe(period.closingDate);
        seen.set(key, period.closingDate);
        date = addDays(date, 1);
      }
    }
  });
});

describe('situação da fatura', () => {
  const today = '2026-10-30';

  it('identifica a fatura aberta hoje', () => {
    expect(ymKey(currentInvoiceMonth(CARD_6722, today))).toBe('2026-12');
    expect(invoiceStatus(invoicePeriod({ year: 2026, month: 12 }, CARD_6722), today)).toBe('aberta');
  });

  it('fatura que já fechou mas ainda não venceu está fechada', () => {
    expect(invoiceStatus(invoicePeriod({ year: 2026, month: 11 }, CARD_6722), today)).toBe('fechada');
    // No próprio dia do vencimento ela continua fechada.
    expect(invoiceStatus(invoicePeriod({ year: 2026, month: 11 }, CARD_6722), '2026-11-02')).toBe('fechada');
  });

  it('fatura com vencimento passado está encerrada e a seguinte é futura', () => {
    expect(invoiceStatus(invoicePeriod({ year: 2026, month: 10 }, CARD_6722), today)).toBe('encerrada');
    expect(invoiceStatus(invoicePeriod({ year: 2027, month: 1 }, CARD_6722), today)).toBe('futura');
  });

  it('o dia do fechamento ainda pertence à fatura aberta', () => {
    expect(invoiceStatus(invoicePeriod({ year: 2026, month: 12 }, CARD_6722), '2026-11-24')).toBe('aberta');
    expect(invoiceStatus(invoicePeriod({ year: 2026, month: 12 }, CARD_6722), '2026-11-25')).toBe('fechada');
  });
});

describe('ruleOf', () => {
  it('não cria regra para cartão sem fechamento configurado', () => {
    expect(ruleOf({ dueDay: 5, closingDay: null })).toBeNull();
    expect(ruleOf({ dueDay: 5, closingDay: 28 })).toEqual({ dueDay: 5, closingDay: 28 });
  });
});
